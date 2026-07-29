import { getAddress, isAddress, keccak256 } from 'ethers';
import HardhatFactoryData from '../ABIs/hardhat-factory.json';
import ETourFactoryABIs from '../ABIs/ETour-Factory-ABIs.json';
import PlayerProfileABIData from '../ABIs/PlayerProfile-ABI.json';
import PlayerRegistryABIData from '../ABIs/PlayerRegistry-ABI.json';
import TicTacToeFactoryABIData from '../ABIs/TicTacToeFactory-ABI.json';
import ConnectFourFactoryABIData from '../ABIs/ConnectFourFactory-ABI.json';
import ChessFactoryABIData from '../ABIs/ChessFactory-ABI.json';
import LocalhostTicTacToeFactoryData from '../ABIs/localhost-tictac-factory.json';
import LocalhostConnectFourFactoryData from '../ABIs/localhost-connectfour-factory.json';
import LocalhostChessFactoryData from '../ABIs/localhost-chess-factory.json';
import {
  V3_GENERATION,
  V3DeploymentValidationError,
  validateV3GameDeployment,
} from './deploymentGuard';

export const V3_DEPLOYMENT_SCHEMA_VERSION = 3;
export const V3_DEPLOYMENT_MANIFEST_KIND = 'complete-v3-deployment';

export const V3_GAME_DEFINITIONS = Object.freeze({
  tictactoe: Object.freeze({
    id: 'tictactoe',
    factoryName: 'TicTacToeFactory',
    implementationName: 'TicTacToe',
    manifestFactoryContract: 'TicTacChainFactory',
    manifestInstanceContract: 'TicTacInstance',
    canonicalInstanceName: 'TicTacToeInstance',
    moveInputTypes: ['uint8', 'uint8', 'uint8'],
  }),
  connect4: Object.freeze({
    id: 'connect4',
    factoryName: 'ConnectFourFactory',
    implementationName: 'ConnectFour',
    manifestFactoryContract: 'ConnectFourFactory',
    manifestInstanceContract: 'ConnectFourInstance',
    canonicalInstanceName: 'ConnectFourInstance',
    moveInputTypes: ['uint8', 'uint8', 'uint8'],
  }),
  chess: Object.freeze({
    id: 'chess',
    factoryName: 'ChessFactory',
    implementationName: 'Chess',
    manifestFactoryContract: 'ChessOnChainFactory',
    manifestInstanceContract: 'ChessInstance',
    canonicalInstanceName: 'ChessInstance',
    moveInputTypes: ['uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
  }),
});

const DEFAULT_GAME_ARTIFACTS = Object.freeze({
  tictactoe: Object.freeze({
    gamePayload: TicTacToeFactoryABIData,
    localPayload: LocalhostTicTacToeFactoryData,
  }),
  connect4: Object.freeze({
    gamePayload: ConnectFourFactoryABIData,
    localPayload: LocalhostConnectFourFactoryData,
  }),
  chess: Object.freeze({
    gamePayload: ChessFactoryABIData,
    localPayload: LocalhostChessFactoryData,
  }),
});

function fail(message) {
  throw new V3DeploymentValidationError(message);
}

function normalizePositiveInteger(value, label) {
  if (!/^\d+$/u.test(String(value ?? ''))) {
    fail(`${label} must be a positive integer`);
  }
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    fail(`${label} must be a positive integer`);
  }
  return normalized;
}

function normalizeAddress(value, label) {
  if (!isAddress(value || '')) {
    fail(`${label} must be a valid address`);
  }
  const address = getAddress(value);
  if (address === getAddress('0x0000000000000000000000000000000000000000')) {
    fail(`${label} must be a non-zero address`);
  }
  return address;
}

function assertAddress(actual, expected, label) {
  if (normalizeAddress(actual, label) !== expected) {
    fail(`${label} does not match the V3 manifest`);
  }
}

function normalizeAbi(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must contain a non-empty ABI`);
  }
  return value;
}

function findFunction(abi, name) {
  return abi.find((entry) => entry?.type === 'function' && entry.name === name);
}

function assertFunction(abi, name, inputTypes, label) {
  const entry = findFunction(abi, name);
  const actualTypes = entry?.inputs?.map((input) => input.type);
  if (!entry || actualTypes?.join(',') !== inputTypes.join(',')) {
    fail(`${label} is missing ${name}(${inputTypes.join(',')})`);
  }
}

function normalizeBytecodeHash(value, label) {
  if (!/^0x[0-9a-fA-F]{64}$/u.test(value || '')) {
    fail(`${label} must be a bytes32 bytecode hash`);
  }
  return value.toLowerCase();
}

function assertCanonicalSharedAbi(payload, canonicalAbi, network, label) {
  if (payload?.network !== network) {
    fail(`${label} network does not match the V3 manifest`);
  }
  const abi = normalizeAbi(payload?.contract?.abi, label);
  if (JSON.stringify(abi) !== JSON.stringify(normalizeAbi(canonicalAbi, `Canonical ${label}`))) {
    fail(`${label} does not match the canonical V3 ABI bundle`);
  }
}

function manifestContract(manifest, contractName) {
  const contract = manifest?.contracts?.[contractName];
  if (!contract || typeof contract !== 'object') {
    fail(`Manifest contract ${contractName} is required`);
  }
  return {
    address: normalizeAddress(contract.address, `Manifest ${contractName} address`),
    abi: normalizeAbi(contract.abi, `Manifest ${contractName}`),
    bytecodeHash: normalizeBytecodeHash(
      contract.runtimeBytecodeHash,
      `Manifest ${contractName}`,
    ),
  };
}

function normalizeSharedContract({
  manifest,
  contractName,
  manifestAddress,
  label,
}) {
  const contract = manifestContract(manifest, contractName);
  assertAddress(manifestAddress, contract.address, label);
  return Object.freeze({
    key: contractName,
    address: contract.address,
    abi: contract.abi,
    bytecodeHash: contract.bytecodeHash,
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeSharedDeployment(manifest) {
  const entryPoint = normalizeSharedContract({
    manifest,
    contractName: 'EntryPoint',
    manifestAddress: manifest.accountAbstraction?.entryPoint,
    label: 'EntryPoint address',
  });
  assertAddress(manifest.entryPoint?.address, entryPoint.address, 'Canonical EntryPoint address');

  const simpleAccountImplementation = normalizeSharedContract({
    manifest,
    contractName: 'SimpleAccountImplementation',
    manifestAddress: manifest.accountAbstraction?.simpleAccountImplementation,
    label: 'SimpleAccount implementation address',
  });
  const simpleAccountFactory = normalizeSharedContract({
    manifest,
    contractName: 'SimpleAccountFactory',
    manifestAddress: manifest.accountAbstraction?.officialSimpleAccountFactory,
    label: 'SimpleAccount factory address',
  });
  const sessionAccountFactory = normalizeSharedContract({
    manifest,
    contractName: 'ETourSessionAccountFactory',
    manifestAddress: manifest.accountAbstraction?.sessionAccountFactory,
    label: 'Session account factory address',
  });
  const sessionPaymaster = normalizeSharedContract({
    manifest,
    contractName: 'ETourSessionPaymaster',
    manifestAddress: manifest.accountAbstraction?.sessionPaymaster,
    label: 'Session paymaster address',
  });
  const playerProfile = normalizeSharedContract({
    manifest,
    contractName: 'PlayerProfile',
    manifestAddress: manifest.playerProfile?.PlayerProfileImpl,
    label: 'PlayerProfile address',
  });
  const profileRegistry = normalizeSharedContract({
    manifest,
    contractName: 'PlayerRegistry',
    manifestAddress: manifest.playerProfile?.PlayerRegistry,
    label: 'PlayerRegistry address',
  });
  const sessionRegistry = normalizeSharedContract({
    manifest,
    contractName: 'SessionKeyRegistry',
    manifestAddress: manifest.sessionAuthorization?.SessionKeyRegistry,
    label: 'SessionKeyRegistry address',
  });
  const sessionAccountAbi = normalizeAbi(
    manifest.contracts?.ETourSessionAccount?.abi,
    'Manifest ETourSessionAccount',
  );

  assertFunction(entryPoint.abi, 'getNonce', ['address', 'uint192'], 'EntryPoint ABI');
  assertFunction(entryPoint.abi, 'handleOps', ['tuple[]', 'address'], 'EntryPoint ABI');
  assertFunction(
    sessionAccountFactory.abi,
    'getAddress',
    ['address', 'uint256'],
    'Session account factory ABI',
  );
  assertFunction(
    sessionAccountFactory.abi,
    'createAccount',
    ['address', 'uint256'],
    'Session account factory ABI',
  );
  assertFunction(
    sessionRegistry.abi,
    'isSessionActive',
    ['address', 'address', 'address'],
    'Session registry ABI',
  );
  assertFunction(
    sessionRegistry.abi,
    'registerSession',
    ['address', 'address'],
    'Session registry ABI',
  );
  assertFunction(
    sessionRegistry.abi,
    'refreshSession',
    ['address', 'address'],
    'Session registry ABI',
  );
  assertFunction(
    sessionRegistry.abi,
    'revokeSession',
    ['address'],
    'Session registry ABI',
  );
  assertFunction(
    sessionPaymaster.abi,
    'validatePaymasterUserOp',
    ['tuple', 'bytes32', 'uint256'],
    'Session paymaster ABI',
  );

  return {
    entryPoint,
    simpleAccountImplementation,
    simpleAccountFactory,
    sessionAccountFactory,
    sessionAccountAbi,
    sessionPaymaster,
    playerProfile,
    profileRegistry,
    sessionRegistry,
    sessionTtlSeconds: normalizePositiveInteger(
      manifest.sessionAuthorization?.ttlSeconds,
      'Session TTL',
    ),
  };
}

function normalizeGameDeployment({
  manifest,
  canonicalBundle,
  shared,
  definition,
  artifacts,
  chainId,
}) {
  const { gamePayload, localPayload } = artifacts || {};
  const guarded = validateV3GameDeployment({
    manifest,
    gamePayload,
    localPayload,
    factoryName: definition.factoryName,
  });
  const manifestImplementation = normalizeAddress(
    manifest.implementations?.[definition.implementationName],
    `Manifest ${definition.implementationName} implementation`,
  );
  if (guarded.implementation !== manifestImplementation) {
    fail(`${definition.factoryName} implementation does not match the V3 manifest`);
  }
  assertAddress(
    localPayload?.implementation?.[definition.implementationName],
    manifestImplementation,
    `${definition.factoryName} local implementation`,
  );

  if (
    canonicalBundle?.network !== manifest.network
    || normalizePositiveInteger(canonicalBundle?.chainId, 'Canonical ABI chainId') !== chainId
  ) {
    fail(`${definition.factoryName} canonical ABI bundle network does not match the manifest`);
  }

  const canonicalFactory = canonicalBundle?.factories?.[definition.factoryName];
  const canonicalInstance = canonicalBundle?.instances?.[definition.canonicalInstanceName];
  assertAddress(
    canonicalFactory?.address,
    guarded.factory,
    `${definition.factoryName} canonical factory`,
  );
  assertAddress(
    canonicalInstance?.address,
    manifestImplementation,
    `${definition.factoryName} canonical implementation`,
  );
  assertAddress(
    canonicalFactory?.playerRegistry,
    shared.profileRegistry.address,
    `${definition.factoryName} canonical PlayerRegistry`,
  );
  assertAddress(
    canonicalFactory?.sessionRegistry,
    shared.sessionRegistry.address,
    `${definition.factoryName} canonical SessionKeyRegistry`,
  );

  const factoryAbi = normalizeAbi(gamePayload?.factory?.abi, `${definition.factoryName} factory`);
  const instanceAbi = normalizeAbi(
    gamePayload?.instance?.abi ?? gamePayload?.instance?.instanceAbi,
    `${definition.factoryName} instance`,
  );
  const playerProfileAbi = normalizeAbi(
    gamePayload?.playerProfile?.PlayerProfileImpl?.abi,
    `${definition.factoryName} PlayerProfile`,
  );
  const playerRegistryAbi = normalizeAbi(
    gamePayload?.playerProfile?.PlayerRegistry?.abi,
    `${definition.factoryName} PlayerRegistry`,
  );
  const sessionRegistryAbi = normalizeAbi(
    gamePayload?.sessionAuthorization?.SessionKeyRegistry?.abi,
    `${definition.factoryName} SessionKeyRegistry`,
  );

  assertFunction(factoryAbi, 'createInstance', [
    'uint8',
    'uint256',
    'uint256',
    'uint256',
    'uint256',
    'address',
  ], `${definition.factoryName} ABI`);
  assertFunction(factoryAbi, 'isInstance', ['address'], `${definition.factoryName} ABI`);
  assertFunction(factoryAbi, 'getInstanceCount', [], `${definition.factoryName} ABI`);
  assertFunction(factoryAbi, 'getInstances', ['uint256', 'uint256'], `${definition.factoryName} ABI`);
  assertFunction(instanceAbi, 'enrollInTournament', ['address'], `${definition.factoryName} instance ABI`);
  assertFunction(instanceAbi, 'getMatch', ['uint8', 'uint8'], `${definition.factoryName} instance ABI`);
  assertFunction(instanceAbi, 'getBoard', ['uint8', 'uint8'], `${definition.factoryName} instance ABI`);
  assertFunction(instanceAbi, 'makeMove', definition.moveInputTypes, `${definition.factoryName} instance ABI`);

  const factoryContract = manifestContract(manifest, definition.manifestFactoryContract);
  const implementationContract = manifestContract(manifest, definition.manifestInstanceContract);
  if (factoryContract.address !== guarded.factory) {
    fail(`${definition.factoryName} contract metadata address does not match the manifest`);
  }
  if (implementationContract.address !== manifestImplementation) {
    fail(`${definition.factoryName} implementation metadata address does not match the manifest`);
  }

  return {
    id: definition.id,
    generation: V3_GENERATION,
    network: manifest.network,
    chainId,
    factory: guarded.factory,
    implementation: manifestImplementation,
    profileRegistry: shared.profileRegistry.address,
    sessionRegistry: shared.sessionRegistry.address,
    entryPoint: shared.entryPoint.address,
    sessionAccountFactory: shared.sessionAccountFactory.address,
    sessionPaymaster: shared.sessionPaymaster.address,
    context: {
      generation: V3_GENERATION,
      chainId,
      factory: guarded.factory,
      instance: null,
      profileRegistry: shared.profileRegistry.address,
      sessionRegistry: shared.sessionRegistry.address,
    },
    contracts: {
      factory: {
        key: definition.manifestFactoryContract,
        address: guarded.factory,
        abi: factoryAbi,
        bytecodeHash: factoryContract.bytecodeHash,
      },
      implementation: {
        key: definition.manifestInstanceContract,
        address: manifestImplementation,
        abi: instanceAbi,
        bytecodeHash: implementationContract.bytecodeHash,
      },
      playerProfile: {
        ...shared.playerProfile,
        abi: playerProfileAbi,
      },
      profileRegistry: {
        ...shared.profileRegistry,
        abi: playerRegistryAbi,
      },
      sessionRegistry: {
        ...shared.sessionRegistry,
        abi: sessionRegistryAbi,
      },
      entryPoint: shared.entryPoint,
      simpleAccountImplementation: shared.simpleAccountImplementation,
      simpleAccountFactory: shared.simpleAccountFactory,
      sessionAccountFactory: shared.sessionAccountFactory,
      sessionPaymaster: shared.sessionPaymaster,
    },
  };
}

export function normalizeV3DeploymentArtifacts({
  manifest = HardhatFactoryData,
  canonicalBundle = ETourFactoryABIs,
  gameArtifacts = DEFAULT_GAME_ARTIFACTS,
} = {}) {
  if (manifest?.schemaVersion !== V3_DEPLOYMENT_SCHEMA_VERSION) {
    fail(`Expected V3 deployment schema ${V3_DEPLOYMENT_SCHEMA_VERSION}`);
  }
  if (manifest?.generation !== V3_GENERATION) {
    fail(`Expected generation "${V3_GENERATION}"`);
  }
  if (manifest?.manifestKind !== V3_DEPLOYMENT_MANIFEST_KIND) {
    fail(`Expected manifest kind "${V3_DEPLOYMENT_MANIFEST_KIND}"`);
  }
  if (!manifest.network || typeof manifest.network !== 'string') {
    fail('Manifest network is required');
  }

  const chainId = normalizePositiveInteger(manifest.chainId, 'Manifest chainId');
  assertCanonicalSharedAbi(
    PlayerProfileABIData,
    canonicalBundle?.playerProfile?.PlayerProfileImpl?.abi,
    manifest.network,
    'PlayerProfile ABI',
  );
  assertCanonicalSharedAbi(
    PlayerRegistryABIData,
    canonicalBundle?.playerProfile?.PlayerRegistry?.abi,
    manifest.network,
    'PlayerRegistry ABI',
  );
  const shared = normalizeSharedDeployment(manifest);
  const games = Object.fromEntries(
    Object.entries(V3_GAME_DEFINITIONS).map(([gameId, definition]) => [
      gameId,
      normalizeGameDeployment({
        manifest,
        canonicalBundle,
        shared,
        definition,
        artifacts: gameArtifacts[gameId],
        chainId,
      }),
    ]),
  );

  return deepFreeze({
    schemaVersion: V3_DEPLOYMENT_SCHEMA_VERSION,
    manifestKind: V3_DEPLOYMENT_MANIFEST_KIND,
    generation: V3_GENERATION,
    network: manifest.network,
    chainId,
    source: {
      commit: manifest.source?.commit ?? null,
      dirty: Boolean(manifest.source?.dirty),
      blockNumber: Number(manifest.blockNumber ?? 0),
      timestamp: manifest.timestamp ?? null,
    },
    shared,
    games,
  });
}

export const V3_DEPLOYMENTS = normalizeV3DeploymentArtifacts();

export function getV3GameDeployment(gameId) {
  const deployment = V3_DEPLOYMENTS.games[gameId];
  if (!deployment) {
    throw new V3DeploymentValidationError(`Unknown V3 game deployment "${gameId}"`);
  }
  return deployment;
}

function uniqueRuntimeContracts(deployment) {
  const contracts = [
    deployment.contracts.factory,
    deployment.contracts.implementation,
    deployment.contracts.playerProfile,
    deployment.contracts.profileRegistry,
    deployment.contracts.sessionRegistry,
    deployment.contracts.entryPoint,
    deployment.contracts.simpleAccountImplementation,
    deployment.contracts.simpleAccountFactory,
    deployment.contracts.sessionAccountFactory,
    deployment.contracts.sessionPaymaster,
  ];
  return contracts.filter((contract, index) => (
    contracts.findIndex((candidate) => candidate.address === contract.address) === index
  ));
}

export async function verifyV3DeploymentRuntime(deployment, provider) {
  if (deployment?.generation !== V3_GENERATION) {
    fail('Runtime verification requires a normalized V3 deployment');
  }
  if (!provider || typeof provider.getNetwork !== 'function' || typeof provider.getCode !== 'function') {
    fail('Runtime verification requires an ethers-compatible provider');
  }

  const network = await provider.getNetwork();
  if (BigInt(network.chainId) !== BigInt(deployment.chainId)) {
    fail(`Runtime provider chain does not match V3 chain ${deployment.chainId}`);
  }

  const contracts = [];
  for (const contract of uniqueRuntimeContracts(deployment)) {
    const code = await provider.getCode(contract.address);
    if (!code || code === '0x' || code === '0x0') {
      fail(`${contract.key} has no deployed bytecode at ${contract.address}`);
    }
    const bytecodeHash = keccak256(code).toLowerCase();
    if (bytecodeHash !== contract.bytecodeHash) {
      fail(`${contract.key} bytecode does not match the V3 deployment manifest`);
    }
    contracts.push(Object.freeze({
      key: contract.key,
      address: contract.address,
      bytecodeHash,
    }));
  }

  return deepFreeze({
    generation: V3_GENERATION,
    chainId: deployment.chainId,
    game: deployment.id,
    contracts,
  });
}
