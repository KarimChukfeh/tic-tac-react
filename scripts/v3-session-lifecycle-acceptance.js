#!/usr/bin/env node

import {
  Contract,
  HDNodeWallet,
  JsonRpcProvider,
  NonceManager,
  parseEther,
  solidityPackedKeccak256,
} from 'ethers';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const deployment = JSON.parse(readFileSync(
  path.join(root, 'src/v3/ABIs/localhost-hardhat-factory.json'),
  'utf8',
));
const sdk = await import(pathToFileURL(
  path.resolve(root, '../e-tour/v3/sdk/dist/index.js'),
).href);
const provider = new JsonRpcProvider('http://127.0.0.1:8545', 412346, {
  staticNetwork: true,
});
const phrase = 'test test test test test test test test test test test junk';
const wallet = (index) => HDNodeWallet.fromPhrase(
  phrase,
  undefined,
  `m/44'/60'/0'/0/${index}`,
).connect(provider);
const creatorWallet = wallet(22);
const joinerWallet = wallet(23);
const creator = new NonceManager(creatorWallet);
const joiner = new NonceManager(joinerWallet);
const factoryRecord = deployment.contracts.TicTacChainFactory;
const instanceRecord = deployment.contracts.TicTacInstance;
const registryRecord = deployment.contracts.SessionKeyRegistry;
const accountFactoryRecord = deployment.contracts.ETourSessionAccountFactory;
const factory = new Contract(factoryRecord.address, factoryRecord.abi, creator);
const registry = new Contract(registryRecord.address, registryRecord.abi, provider);
const accountFactory = new Contract(
  accountFactoryRecord.address,
  accountFactoryRecord.abi,
  provider,
);
const keys = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function executor() {
  const key = sdk.generateBrowserSessionKey();
  keys.push(key);
  const salt = sdk.generateSessionSalt();
  return accountFactory['getAddress(address,uint256)'](key.address, salt);
}

try {
  const firstExecutor = await executor();
  const joinerExecutor = await executor();
  const fee = parseEther('0.0001');
  const creation = await factory.createInstance(
    2, fee, 120, 1200, 15, firstExecutor, { value: fee },
  );
  const creationReceipt = await creation.wait();
  const deployed = creationReceipt.logs
    .map((log) => {
      try { return factory.interface.parseLog(log); } catch { return null; }
    })
    .find((event) => event?.name === 'InstanceDeployed');
  assert(deployed, 'InstanceDeployed event missing');
  const instanceAddress = deployed.args.instance;
  const instance = new Contract(instanceAddress, instanceRecord.abi, provider);
  await (
    await instance.connect(joiner).enrollInTournament(joinerExecutor, { value: fee })
  ).wait();

  const secondExecutor = await executor();
  await (
    await registry.connect(creator).refreshSession(instanceAddress, secondExecutor)
  ).wait();
  assert(
    !await registry.isSessionActive(instanceAddress, creatorWallet.address, firstExecutor),
    'Rotated executor remained active',
  );
  assert(
    await registry.isSessionActive(instanceAddress, creatorWallet.address, secondExecutor),
    'Replacement executor did not activate',
  );

  await (await registry.connect(creator).revokeSession(instanceAddress)).wait();
  assert(
    !await registry.isSessionActive(instanceAddress, creatorWallet.address, secondExecutor),
    'Revoked executor remained active',
  );

  const newDeviceExecutor = await executor();
  await (
    await registry.connect(creator).refreshSession(instanceAddress, newDeviceExecutor)
  ).wait();
  assert(
    await registry.isSessionActive(instanceAddress, creatorWallet.address, newDeviceExecutor),
    'New-device executor did not activate',
  );

  const creatorSession = await registry.getSession(instanceAddress, creatorWallet.address);
  const joinerSession = await registry.getSession(instanceAddress, joinerWallet.address);
  const expiry = creatorSession.validUntil > joinerSession.validUntil
    ? creatorSession.validUntil
    : joinerSession.validUntil;
  await provider.send('evm_setNextBlockTimestamp', [Number(expiry)]);
  await provider.send('evm_mine', []);
  assert(
    !await registry.isSessionActive(instanceAddress, creatorWallet.address, newDeviceExecutor),
    'Executor remained active at the exclusive TTL boundary',
  );
  assert(
    !await registry.isSessionActive(instanceAddress, joinerWallet.address, joinerExecutor),
    'Joiner executor remained active at the exclusive TTL boundary',
  );

  const matchId = solidityPackedKeccak256(['uint8', 'uint8'], [0, 0]);
  const match = await instance.matches(matchId);
  const directPlayer = match.currentTurn.toLowerCase() === creatorWallet.address.toLowerCase()
    ? creator
    : joiner;
  const directAddress = await directPlayer.getAddress();
  const directReceipt = await (
    await instance.connect(directPlayer).makeMove(0, 0, 0)
  ).wait();
  const move = directReceipt.logs
    .map((log) => {
      try { return instance.interface.parseLog(log); } catch { return null; }
    })
    .find((event) => event?.name === 'MoveMade');
  assert(move, 'Direct-primary MoveMade event missing after expiry');
  assert(move.args.player.toLowerCase() === directAddress.toLowerCase(), 'Direct player changed');
  assert(move.args.executor.toLowerCase() === directAddress.toLowerCase(), 'Direct executor changed');

  const refreshedAfterExpiry = await executor();
  await (
    await registry.connect(creator).refreshSession(instanceAddress, refreshedAfterExpiry)
  ).wait();
  assert(
    await registry.isSessionActive(
      instanceAddress,
      creatorWallet.address,
      refreshedAfterExpiry,
    ),
    'Session did not refresh after expiry',
  );
  await (await registry.connect(creator).revokeSession(instanceAddress)).wait();

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    instance: instanceAddress,
    rotationInvalidatedOldExecutor: true,
    revocationConfirmed: true,
    newDeviceReplacement: true,
    exclusiveTtlBoundary: true,
    directPrimaryAfterExpiry: true,
    refreshAfterExpiry: true,
  }, null, 2)}\n`);
} finally {
  for (const key of keys) key.destroy();
}
