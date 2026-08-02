#!/usr/bin/env node

import {
  Contract,
  HDNodeWallet,
  JsonRpcProvider,
  NonceManager,
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
  path.join(frontendRoot, 'src', 'v3', 'ABIs', 'localhost-hardhat-factory.json'),
  'utf8',
));
const RPC_URL = process.env.V3_RPC_URL || 'http://127.0.0.1:8545';
const BUNDLER_PRIMARY_URL = (
  process.env.V3_BUNDLER_PRIMARY_URL || 'http://127.0.0.1:4337'
);
const BUNDLER_FAILOVER_URL = (
  process.env.V3_BUNDLER_FAILOVER_URL || 'http://127.0.0.1:4338'
);
const REQUIRE_BOTH_BUNDLERS = process.env.V3_ACCEPTANCE_REQUIRE_BOTH_BUNDLERS !== 'false';
const DIRECT_MOVE_INDEX = process.env.V3_ACCEPTANCE_DIRECT_MOVE_INDEX === undefined
  ? -1
  : Number(process.env.V3_ACCEPTANCE_DIRECT_MOVE_INDEX);
const VERIFY_PAYMASTER_REFUSAL = process.env.V3_ACCEPTANCE_PAYMASTER_REFUSAL === 'true';
const sdk = await import(pathToFileURL(backendSdk).href);
const provider = new JsonRpcProvider(RPC_URL, 412346, {
  staticNetwork: true,
});
const mnemonic = 'test test test test test test test test test test test junk';
const game = process.argv[2] || 'tictactoe';
const gameConfig = {
  tictactoe: {
    route: '/v3/tictactoe',
    factory: 'TicTacChainFactory',
    instance: 'TicTacInstance',
    moves: [[0, 0, 0], [0, 0, 3], [0, 0, 1], [0, 0, 4], [0, 0, 2]],
  },
  connectfour: {
    route: '/v3/connect4',
    factory: 'ConnectFourFactory',
    instance: 'ConnectFourInstance',
    moves: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 0],
    ],
  },
  chess: {
    route: '/v3/chess',
    factory: 'ChessOnChainFactory',
    instance: 'ChessInstance',
    moves: [
      [0, 0, 13, 21, 0],
      [0, 0, 52, 36, 0],
      [0, 0, 14, 30, 0],
      [0, 0, 59, 31, 0],
    ],
  },
}[game];
if (!gameConfig) {
  throw new Error(`Unsupported V3 acceptance game: ${game}`);
}
const wallet = (index) => HDNodeWallet.fromPhrase(
  mnemonic,
  undefined,
  `m/44'/60'/0'/0/${index}`,
).connect(provider);
// Keep the commonly imported local demo wallets (accounts 0–9) free of
// acceptance-test tournaments and match alerts.
const creator = wallet(20);
const joiner = wallet(21);
const factoryRecord = deployment.contracts[gameConfig.factory];
const instanceRecord = deployment.contracts[gameConfig.instance];
const accountFactoryRecord = deployment.contracts.ETourSessionAccountFactory;
const entryPointRecord = deployment.contracts.EntryPoint;
const registryRecord = deployment.contracts.SessionKeyRegistry;
const paymasterAddress = deployment.contracts.ETourSessionPaymaster.address;
const paymasterRecord = deployment.contracts.ETourSessionPaymaster;
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
let paymasterPaused = false;
const paymasterAdmin = new NonceManager(wallet(0));
const paymaster = new Contract(
  paymasterRecord.address,
  paymasterRecord.abi,
  paymasterAdmin,
);

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
  return { receipt, counterfactualDeployment: code === '0x' };
}

try {
  const network = await provider.getNetwork();
  assert(Number(network.chainId) === 412346, 'V3 local chain is unavailable');
  const health = await bundler.healthCheck();
  assert(
    REQUIRE_BOTH_BUNDLERS
      ? health.every((item) => item.healthy)
      : health.some((item) => item.healthy),
    REQUIRE_BOTH_BUNDLERS
      ? 'Both local bundlers must be healthy'
      : 'At least one local bundler must be healthy',
  );

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
  if (VERIFY_PAYMASTER_REFUSAL) {
    await (await paymaster.setPaused(true)).wait();
    paymasterPaused = true;
    const initialMatch = await instance.matches(
      solidityPackedKeccak256(['uint8', 'uint8'], [0, 0]),
    );
    const initialSession = descriptors.get(initialMatch.currentTurn.toLowerCase());
    let refused = false;
    try {
      await submitMove(instance, initialSession, gameConfig.moves[0]);
    } catch {
      refused = true;
    }
    assert(refused, 'Paused paymaster accepted a sponsored move');
    await (await paymaster.setPaused(false)).wait();
    paymasterPaused = false;
  }

  const matchId = solidityPackedKeccak256(['uint8', 'uint8'], [0, 0]);
  let directMoves = 0;
  let counterfactualDeployments = 0;
  for (const [moveIndex, move] of gameConfig.moves.entries()) {
    const match = await instance.matches(matchId);
    const selected = descriptors.get(match.currentTurn.toLowerCase());
    assert(selected, `No session descriptor for current player ${match.currentTurn}`);
    let receipt;
    let expectedExecutor;
    if (moveIndex === DIRECT_MOVE_INDEX) {
      const transaction = await instance.connect(selected.primary).makeMove(...move);
      receipt = await transaction.wait();
      expectedExecutor = selected.primary.address;
      directMoves += 1;
    } else {
      const sponsored = await submitMove(instance, selected, move);
      receipt = sponsored.receipt.receipt;
      expectedExecutor = selected.account;
      if (sponsored.counterfactualDeployment) counterfactualDeployments += 1;
    }
    const moveEvent = receipt.logs
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
      moveEvent.args.executor.toLowerCase() === expectedExecutor.toLowerCase(),
      'Move lost executor attribution',
    );
  }

  const tournament = await instance.tournament();
  assert(tournament.winner !== ZeroAddress, 'Tournament did not settle');
  assert(await instance.playerPrizes(tournament.winner) > 0n, 'Winner prize was not credited');
  const winnerProfileAddress = await factory.getPlayerProfile(tournament.winner);
  assert(winnerProfileAddress !== ZeroAddress, 'Winner profile was not created');
  const winnerProfile = new Contract(
    winnerProfileAddress,
    deployment.contracts.PlayerProfile.abi,
    provider,
  );
  assert(await winnerProfile.getEnrollmentCount() > 0n, 'Profile enrollment history is empty');
  assert(await winnerProfile.getMatchRecordCount() > 0n, 'Profile match history is empty');
  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    game,
    route: gameConfig.route,
    instance: await instance.getAddress(),
    winner: tournament.winner,
    sponsoredMoves: gameConfig.moves.length - directMoves,
    directMoves,
    counterfactualDeployments,
    paymasterRefusalVerified: VERIFY_PAYMASTER_REFUSAL,
    profileHistoryVerified: true,
    bundlers: health.map((item) => ({ name: item.name, healthy: item.healthy })),
  }, null, 2)}\n`);
} finally {
  if (paymasterPaused) {
    await (await paymaster.setPaused(false)).wait();
  }
  for (const key of keys) key.destroy();
}
