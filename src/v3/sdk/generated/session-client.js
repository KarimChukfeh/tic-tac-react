import { Contract, getAddress, } from "ethers";
import { buildInitCode, buildPackedUserOperation, buildPaymasterAndData, encodeAccountExecute, estimateUserOperationGas, getUserOperationNonce, signUserOperation, submitUserOperation, toRpcUserOperation, } from "./user-operation.js";
import { generateBrowserSessionKey, } from "../../vendor/sdk/dist/session-crypto.js";
import { deriveSessionExecutor, encodeGameMove, enrollmentArguments, generateSessionSalt, } from "../../vendor/sdk/dist/games.js";
import { SessionKeyVault, } from "../../vendor/sdk/dist/session-storage.js";
import { SessionCoordinator, } from "../../vendor/sdk/dist/session-coordinator.js";
import { inspectSessionOnChain, prepareRefreshSession, prepareRevokeSession, } from "../../vendor/sdk/dist/session-lifecycle.js";
import { SessionUnavailableError, UserOperationExecutionError, mapV3Error, } from "../../vendor/sdk/dist/errors.js";
const ENTRY_POINT_ABI = [
    "function getNonce(address sender,uint192 key) view returns (uint256)",
];
export class V3SessionClient {
    provider;
    bundler;
    addresses;
    vault;
    coordinator;
    crypto;
    constructor({ provider, bundler, addresses, vault = new SessionKeyVault(), coordinator = new SessionCoordinator(), crypto = globalThis.crypto, }) {
        this.provider = provider;
        this.bundler = bundler;
        this.addresses = {
            entryPoint: getAddress(addresses.entryPoint),
            sessionRegistry: getAddress(addresses.sessionRegistry),
            sessionAccountFactory: getAddress(addresses.sessionAccountFactory),
            paymaster: addresses.paymaster
                ? getAddress(addresses.paymaster)
                : undefined,
        };
        this.vault = vault;
        this.coordinator = coordinator;
        this.crypto = crypto;
    }
    async createSession(identity, { replace = false } = {}) {
        const current = await this.vault.load(identity);
        if (current) {
            current.key.destroy();
            if (!replace) {
                throw new Error("a fresh session already exists for this tournament");
            }
        }
        const key = generateBrowserSessionKey(this.crypto);
        const salt = generateSessionSalt(this.crypto);
        try {
            const account = await deriveSessionExecutor({
                provider: this.provider,
                factory: this.addresses.sessionAccountFactory,
                owner: key.address,
                salt,
            });
            const metadata = await this.vault.save(identity, key, { account, salt, replace });
            this.coordinator.publish({
                type: "session-saved",
                sessionId: this.#sessionId(identity),
                account,
            });
            return metadata;
        }
        finally {
            key.destroy();
        }
    }
    async loadSession(identity) {
        return this.vault.load(identity);
    }
    enrollmentArguments(metadata) {
        return enrollmentArguments(metadata?.account);
    }
    async inspect(identity) {
        const stored = await this.vault.load(identity);
        try {
            return inspectSessionOnChain({
                runner: this.provider,
                registryAddress: this.addresses.sessionRegistry,
                instance: identity.instance,
                primary: identity.primary,
                requestedExecutor: stored?.metadata.account,
            });
        }
        finally {
            stored?.key.destroy();
        }
    }
    async buildMove(identity, move, gas = {}) {
        const stored = await this.vault.load(identity);
        if (!stored)
            throw new SessionUnavailableError("missing");
        try {
            const inspection = await inspectSessionOnChain({
                runner: this.provider,
                registryAddress: this.addresses.sessionRegistry,
                instance: identity.instance,
                primary: identity.primary,
                requestedExecutor: stored.metadata.account,
            });
            if (inspection.status !== "active") {
                throw new SessionUnavailableError(inspection.status);
            }
            const code = await this.provider.getCode(stored.metadata.account);
            const initCode = code === "0x"
                ? buildInitCode(this.addresses.sessionAccountFactory, stored.metadata.owner, stored.metadata.salt)
                : "0x";
            const gameCall = encodeGameMove(move);
            const callData = encodeAccountExecute(identity.instance, gameCall);
            const entryPoint = new Contract(this.addresses.entryPoint, ENTRY_POINT_ABI, this.provider);
            const nonce = await getUserOperationNonce(entryPoint, stored.metadata.account);
            const unsigned = buildPackedUserOperation({
                sender: stored.metadata.account,
                nonce,
                initCode,
                callData,
                ...gas,
                paymasterAndData: this.addresses.paymaster
                    ? buildPaymasterAndData(this.addresses.paymaster)
                    : "0x",
            });
            const signed = await signUserOperation(unsigned, stored.key, this.addresses.entryPoint, identity.chainId);
            return {
                metadata: stored.metadata,
                packed: signed,
                rpc: toRpcUserOperation(signed),
            };
        }
        finally {
            stored.key.destroy();
        }
    }
    async submitMove(identity, move, { gas, receiptTimeoutMs = 60_000, } = {}) {
        const publicRecord = (await this.vault.list()).find((record) => this.#sessionId(record) ===
            this.#sessionId(identity));
        if (!publicRecord) {
            throw new SessionUnavailableError("missing");
        }
        return this.coordinator.withNonceLock(publicRecord.account, async () => {
            const built = await this.buildMove(identity, move, gas);
            const estimate = await estimateUserOperationGas(this.bundler, built.rpc, this.addresses.entryPoint);
            const userOperationHash = await submitUserOperation(this.bundler, built.rpc, this.addresses.entryPoint);
            const receipt = await this.#waitForReceipt(userOperationHash, receiptTimeoutMs);
            if (!receipt.success) {
                throw new UserOperationExecutionError(receipt);
            }
            this.coordinator.publish({
                type: "nonce-updated",
                account: built.metadata.account,
                nonce: String(built.packed.nonce + 1n),
            });
            return {
                ...built,
                estimate,
                userOperationHash,
                receipt,
            };
        });
    }
    async submitMoveWithFallback(identity, move, directPrimaryMove) {
        try {
            return {
                mode: "session",
                result: await this.submitMove(identity, move),
            };
        }
        catch (error) {
            const descriptor = mapV3Error(error);
            if (!descriptor.directFallbackRecommended)
                throw error;
            return {
                mode: "primary",
                result: await directPrimaryMove(),
                sessionError: descriptor,
            };
        }
    }
    async refreshSession(identity, primarySigner) {
        const candidate = generateBrowserSessionKey(this.crypto);
        const salt = generateSessionSalt(this.crypto);
        try {
            const account = await deriveSessionExecutor({
                provider: this.provider,
                factory: this.addresses.sessionAccountFactory,
                owner: candidate.address,
                salt,
            });
            await this.vault.stageRefresh(identity, candidate, { account, salt, replace: true });
            const transaction = prepareRefreshSession(this.addresses.sessionRegistry, identity.instance, account);
            try {
                const response = await primarySigner.sendTransaction(transaction);
                await response.wait();
            }
            catch (error) {
                await this.vault.discardStagedRefresh(identity);
                throw error;
            }
            const metadata = await this.vault.commitStagedRefresh(identity);
            this.coordinator.publish({
                type: "session-rotated",
                sessionId: this.#sessionId(identity),
                account,
            });
            return metadata;
        }
        finally {
            candidate.destroy();
        }
    }
    async recoverPendingRefresh(identity) {
        const staged = await this.vault.loadStagedRefresh(identity);
        if (!staged)
            return null;
        try {
            const inspection = await inspectSessionOnChain({
                runner: this.provider,
                registryAddress: this.addresses.sessionRegistry,
                instance: identity.instance,
                primary: identity.primary,
                requestedExecutor: staged.metadata.account,
            });
            if (inspection.executor !==
                staged.metadata.account) {
                await this.vault.discardStagedRefresh(identity);
                return null;
            }
            const metadata = await this.vault.commitStagedRefresh(identity);
            this.coordinator.publish({
                type: "session-rotated",
                sessionId: this.#sessionId(identity),
                account: metadata.account,
            });
            return metadata;
        }
        finally {
            staged.key.destroy();
        }
    }
    async revokeSession(identity, primarySigner) {
        const response = await primarySigner.sendTransaction(prepareRevokeSession(this.addresses.sessionRegistry, identity.instance));
        await response.wait();
        await this.vault.remove(identity);
        this.coordinator.publish({
            type: "session-removed",
            sessionId: this.#sessionId(identity),
        });
    }
    close() {
        this.coordinator.close();
    }
    async #waitForReceipt(hash, timeoutMs) {
        if (this.bundler.waitForReceipt) {
            return (await this.bundler.waitForReceipt(hash, {
                timeoutMs,
            }));
        }
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const receipt = await this.bundler.request({
                method: "eth_getUserOperationReceipt",
                params: [hash],
            });
            if (receipt) {
                return receipt;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        throw new Error("UserOperation receipt timed out without nonce reuse");
    }
    #sessionId(identity) {
        return [
            BigInt(identity.chainId).toString(),
            getAddress(identity.instance).toLowerCase(),
            getAddress(identity.primary).toLowerCase(),
        ].join(":");
    }
}
