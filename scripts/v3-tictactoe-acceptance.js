#!/usr/bin/env node

import {
  Contract,
  HDNodeWallet,
  JsonRpcProvider,
  ZeroAddress,
  parseEther,
  solidityPackedKeccak256,
} from 'ethers';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, '..');
const backendSdk = path.resolve(frontendRoot, '..', 'e-tour', 'v3', 'sdk', 'dist', 'index.js');
const deployment = JSON.parse(readFileSync(
  path.join(frontendRoot, 'src', 'v3', 'ABIs', 'hardhat-factory.json'),
  'utf8',
));
const RPC_URL = process.env.V3_RPC_URL || 'http://127.0.0.1:8545';
const BUNDLER_PRIMARY_URL = (
  process.env.V3_BUNDLER_PRIMARY_URL || 'http://127.0.0.1:4337'
);
const BUNDLER_FAILOVER_URL = (
  process.env.V3_BUNDLER_FAILOVER_URL || 'http://127.0.0.1:4338'
);
const sdk = await import(pathToFileURL(backendSdk).href);
const provider = new JsonRpcProvider(RPC_URL, 412346, {
  staticNetwork: true,
});
const mnemonic = 'test test test test test test test test test test test junk';
const wallet = (index) => HDNodeWallet.fromPhrase(
  mnemonic,
  undefined,
  `m/44'/60'/0'/0/${index}`,
).connect(provider);
// Keep the commonly imported local demo wallets (accounts 0–9) free of
// acceptance-test tournaments and match alerts.
const creator = wallet(20);
const joiner = wallet(21);
const factoryRecord = deployment.contracts.TicTacChainFactory;
const instanceRecord = deployment.contracts.TicTacInstance;
const accountFactoryRecord = deployment.contracts.ETourSessionAccountFactory;
const entryPointRecord = deployment.contracts.EntryPoint;
const registryRecord = deployment.contracts.SessionKeyRegistry;
const paymasterAddress = deployment.contracts.ETourSessionPaymaster.address;
const factory = new Contract(factoryRecord.address, factoryRecord.abi, creator);
const accountFactory = new Contract(
  accountFactoryRecord.address,
  accountFactoryRecord.abi,
  provider,
);
const entryPoint = new Contract(entryPointRecord.address, entryPointRecord.abi, provider);
const registry = new Contract(registryRecord.address, registryRecord.abi, provider);
const bundler = new sdk.FailoverBundler({
  providers: [
    new sdk.JsonRpcBundler({ name: 'primary', url: BUNDLER_PRIMARY_URL }),
    new sdk.JsonRpcBundler({ name: 'failover', url: BUNDLER_FAILOVER_URL }),
  ],
  entryPoint: entryPointRecord.address,
  receiptPollMs: 100,
});
const keys = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function descriptor(primary) {
  const key = sdk.generateBrowserSessionKey();
  keys.push(key);
  const salt = sdk.generateSessionSalt();
  const account = await accountFactory['getAddress(address,uint256)'](
    key.address,
    salt,
  );
  return { primary, key, salt, account };
}

async function submitMove(instance, selected, move) {
  const code = await provider.getCode(selected.account);
  const initCode = code === '0x'
    ? sdk.buildInitCode(accountFactoryRecord.address, selected.key.address, selected.salt)
    : '0x';
  const gameCall = instance.interface.encodeFunctionData('makeMove', move);
  const nonce = await sdk.getUserOperationNonce(entryPoint, selected.account);
  const unsigned = sdk.buildPackedUserOperation({
    sender: selected.account,
    nonce,
    initCode,
    callData: sdk.encodeAccountExecute(await instance.getAddress(), gameCall),
    verificationGasLimit: 2_000_000n,
    callGasLimit: 4_000_000n,
    preVerificationGas: 100_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    maxFeePerGas: 1_000_000_000n,
    paymasterAndData: sdk.buildPaymasterAndData(paymasterAddress),
  });
  const signed = await sdk.signUserOperation(
    unsigned,
    selected.key,
    entryPointRecord.address,
    412346,
  );
  const rpcOperation = sdk.toRpcUserOperation(signed);
  await sdk.estimateUserOperationGas(bundler, rpcOperation, entryPointRecord.address);
  const hash = await sdk.submitUserOperation(
    bundler,
    rpcOperation,
    entryPointRecord.address,
  );
  const receipt = await bundler.waitForReceipt(hash, { timeoutMs: 15_000 });
  assert(receipt.success, `UserOperation reverted: ${receipt.revertReason || 'unknown'}`);
  return receipt;
}

try {
  const network = await provider.getNetwork();
  assert(Number(network.chainId) === 412346, 'V3 local chain is unavailable');
  const health = await bundler.healthCheck();
  assert(health.every((item) => item.healthy), 'Both local bundlers must be healthy');

  const creatorSession = await descriptor(creator);
  const joinerSession = await descriptor(joiner);
  const entryFee = parseEther('0.0001');
  const create = await factory.createInstance(
    2,
    entryFee,
    120,
    1200,
    15,
    creatorSession.account,
    { value: entryFee },
  );
  const createReceipt = await create.wait();
  const deployed = createReceipt.logs
    .map((log) => {
      try { return factory.interface.parseLog(log); } catch { return null; }
    })
    .find((event) => event?.name === 'InstanceDeployed');
  assert(deployed, 'InstanceDeployed event missing');
  const instance = new Contract(deployed.args.instance, instanceRecord.abi, provider);
  await (
    await instance.connect(joiner).enrollInTournament(
      joinerSession.account,
      { value: entryFee },
    )
  ).wait();

  assert(
    await registry.isSessionActive(
      await instance.getAddress(),
      creator.address,
      creatorSession.account,
    ),
    'Creator session is not active',
  );
  assert(
    await registry.isSessionActive(
      await instance.getAddress(),
      joiner.address,
      joinerSession.account,
    ),
    'Joiner session is not active',
  );

  const descriptors = new Map([
    [creator.address.toLowerCase(), creatorSession],
    [joiner.address.toLowerCase(), joinerSession],
  ]);
  const matchId = solidityPackedKeccak256(['uint8', 'uint8'], [0, 0]);
  for (const cellIndex of [0, 3, 1, 4, 2]) {
    const match = await instance.matches(matchId);
    const selected = descriptors.get(match.currentTurn.toLowerCase());
    assert(selected, `No session descriptor for current player ${match.currentTurn}`);
    const receipt = await submitMove(instance, selected, [0, 0, cellIndex]);
    const moveEvent = receipt.receipt.logs
      .map((log) => {
        try { return instance.interface.parseLog(log); } catch { return null; }
      })
      .find((event) => event?.name === 'MoveMade');
    assert(moveEvent, 'MoveMade event missing');
    assert(
      moveEvent.args.player.toLowerCase() === selected.primary.address.toLowerCase(),
      'Move lost primary-player attribution',
    );
    assert(
      moveEvent.args.executor.toLowerCase() === selected.account.toLowerCase(),
      'Move lost executor attribution',
    );
  }

  const tournament = await instance.tournament();
  assert(tournament.winner !== ZeroAddress, 'Tournament did not settle');
  assert(await instance.playerPrizes(tournament.winner) > 0n, 'Winner prize was not credited');
  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    route: '/v3/tictactoe',
    instance: await instance.getAddress(),
    winner: tournament.winner,
    sponsoredMoves: 5,
    bundlers: health.map((item) => item.name),
  }, null, 2)}\n`);
} finally {
  for (const key of keys) key.destroy();
}
