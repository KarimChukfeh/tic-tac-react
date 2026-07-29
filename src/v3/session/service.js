import { getAddress } from 'ethers';
import { createV3SdkServices } from '../sdk/adapter';
import { V3_RUNTIME_CONFIG } from '../config/runtimeConfig';

function identity({ chainId, instance, primary }) {
  return Object.freeze({
    chainId: BigInt(chainId),
    instance: getAddress(instance),
    primary: getAddress(primary),
  });
}

export function createV3SessionIdentity(instance, primary, chainId = V3_RUNTIME_CONFIG.chainId) {
  return identity({ chainId, instance, primary });
}

export class V3BrowserSessionService {
  constructor(services) {
    this.services = services;
    this.client = services.sessionClient;
    this.vault = services.vault;
    this.coordinator = services.coordinator;
  }

  static async create(options) {
    return new V3BrowserSessionService(await createV3SdkServices(options));
  }

  async prepareCreation({ factory, primary, chainId = V3_RUNTIME_CONFIG.chainId }) {
    const stagingIdentity = identity({ chainId, instance: factory, primary });
    const metadata = await this.client.createSession(stagingIdentity, { replace: true });
    return Object.freeze({
      identity: stagingIdentity,
      executor: metadata.account,
      metadata,
    });
  }

  async finalizeCreation(stage, instanceAddress) {
    const stored = await this.vault.load(stage.identity);
    if (!stored) throw new Error('The encrypted creation session is no longer available');
    const finalIdentity = identity({
      chainId: stage.identity.chainId,
      instance: instanceAddress,
      primary: stage.identity.primary,
    });
    try {
      await this.vault.save(finalIdentity, stored.key, {
        account: stored.metadata.account,
        salt: stored.metadata.salt,
        replace: true,
      });
      await this.vault.remove(stage.identity);
    } finally {
      stored.key.destroy();
    }
    return {
      identity: finalIdentity,
      inspection: await this.client.inspect(finalIdentity),
    };
  }

  async discardCreation(stage) {
    if (stage?.identity) await this.vault.remove(stage.identity);
  }

  async prepareEnrollment({ instance, primary, chainId = V3_RUNTIME_CONFIG.chainId }) {
    const sessionIdentity = identity({ chainId, instance, primary });
    const metadata = await this.client.createSession(sessionIdentity, { replace: true });
    return Object.freeze({
      identity: sessionIdentity,
      executor: metadata.account,
      metadata,
    });
  }

  async discardEnrollment(prepared) {
    if (prepared?.identity) await this.vault.remove(prepared.identity);
  }

  async restore(sessionIdentity, { factory } = {}) {
    await this.client.recoverPendingRefresh(sessionIdentity);
    let inspection = await this.client.inspect(sessionIdentity);
    if (!factory) return inspection;

    const existing = await this.vault.load(sessionIdentity);
    if (existing) {
      existing.key.destroy();
      return inspection;
    }

    const stagingIdentity = identity({
      chainId: sessionIdentity.chainId,
      instance: factory,
      primary: sessionIdentity.primary,
    });
    const staged = await this.vault.load(stagingIdentity);
    if (!staged) return inspection;
    try {
      if (
        inspection.status === 'active'
        && inspection.executor === staged.metadata.account
      ) {
        await this.vault.save(sessionIdentity, staged.key, {
          account: staged.metadata.account,
          salt: staged.metadata.salt,
          replace: true,
        });
        await this.vault.remove(stagingIdentity);
        inspection = await this.client.inspect(sessionIdentity);
      }
    } finally {
      staged.key.destroy();
    }
    return inspection;
  }

  inspect(sessionIdentity) {
    return this.client.inspect(sessionIdentity);
  }

  submitMove(sessionIdentity, move, options) {
    return this.client.submitMove(sessionIdentity, move, options);
  }

  subscribe(listener) {
    return this.coordinator.subscribe(listener);
  }

  close() {
    this.client.close();
  }
}
