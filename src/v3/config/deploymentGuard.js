import { getAddress, isAddress } from 'ethers';

export const V3_GENERATION = 'v3';

export class V3DeploymentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'V3DeploymentValidationError';
  }
}

function fail(message) {
  throw new V3DeploymentValidationError(message);
}

function normalizeChainId(value, label) {
  if (
    (typeof value !== 'string' && typeof value !== 'number')
    || String(value).trim() === ''
    || !/^\d+$/u.test(String(value))
  ) {
    fail(`${label} must be a positive integer chain ID`);
  }

  const chainId = Number(value);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    fail(`${label} must be a positive integer chain ID`);
  }
  return chainId;
}

function normalizeAddress(value, label) {
  if (!isAddress(value || '') || getAddress(value) === getAddress('0x0000000000000000000000000000000000000000')) {
    fail(`${label} must be a non-zero address`);
  }
  return getAddress(value);
}

function assertSameAddress(actual, expected, label) {
  if (normalizeAddress(actual, label) !== expected) {
    fail(`${label} does not match the V3 deployment manifest`);
  }
}

function findFunction(abi, name) {
  return Array.isArray(abi)
    ? abi.find((entry) => entry?.type === 'function' && entry.name === name)
    : null;
}

function assertInputTypes(abi, name, expectedTypes, label) {
  const entry = findFunction(abi, name);
  const inputTypes = entry?.inputs?.map((input) => input.type);
  if (!entry || inputTypes?.join(',') !== expectedTypes.join(',')) {
    fail(`${label} is missing the required ${name}(${expectedTypes.join(',')}) function`);
  }
}

export function validateV3GameDeployment({
  manifest,
  gamePayload,
  localPayload,
  factoryName,
}) {
  if (manifest?.generation !== V3_GENERATION) {
    fail(`Expected generation "${V3_GENERATION}", received "${manifest?.generation ?? 'missing'}"`);
  }
  if (!factoryName || typeof factoryName !== 'string') {
    fail('factoryName is required');
  }

  const chainId = normalizeChainId(manifest.chainId, 'Manifest chainId');
  if (normalizeChainId(gamePayload?.chainId, `${factoryName} payload chainId`) !== chainId) {
    fail(`${factoryName} payload chainId does not match the V3 deployment manifest`);
  }
  if (normalizeChainId(localPayload?.chainId, `${factoryName} local chainId`) !== chainId) {
    fail(`${factoryName} local chainId does not match the V3 deployment manifest`);
  }
  if (gamePayload?.network !== manifest.network || localPayload?.network !== manifest.network) {
    fail(`${factoryName} network does not match the V3 deployment manifest`);
  }

  const factory = normalizeAddress(manifest.factories?.[factoryName], `Manifest ${factoryName}`);
  assertSameAddress(gamePayload?.factory?.address, factory, `${factoryName} ABI address`);
  assertSameAddress(localPayload?.factory?.[factoryName], factory, `${factoryName} local address`);

  const profileRegistry = normalizeAddress(
    manifest.playerProfile?.PlayerRegistry,
    'Manifest PlayerRegistry',
  );
  assertSameAddress(
    gamePayload?.playerProfile?.PlayerRegistry?.address,
    profileRegistry,
    `${factoryName} PlayerRegistry`,
  );
  assertSameAddress(
    localPayload?.playerProfile?.PlayerRegistry,
    profileRegistry,
    `${factoryName} local PlayerRegistry`,
  );

  const sessionRegistry = normalizeAddress(
    manifest.sessionAuthorization?.SessionKeyRegistry,
    'Manifest SessionKeyRegistry',
  );
  assertSameAddress(
    gamePayload?.sessionAuthorization?.SessionKeyRegistry?.address,
    sessionRegistry,
    `${factoryName} SessionKeyRegistry`,
  );
  assertSameAddress(
    localPayload?.sessionAuthorization?.SessionKeyRegistry,
    sessionRegistry,
    `${factoryName} local SessionKeyRegistry`,
  );

  const factoryAbi = gamePayload?.factory?.abi;
  const instanceAbi = gamePayload?.instance?.abi ?? gamePayload?.instance?.instanceAbi;
  assertInputTypes(
    factoryAbi,
    'createInstance',
    ['uint8', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
    `${factoryName} ABI`,
  );
  assertInputTypes(
    instanceAbi,
    'enrollInTournament',
    ['address'],
    `${factoryName} instance ABI`,
  );

  return Object.freeze({
    generation: V3_GENERATION,
    network: manifest.network,
    chainId,
    factory,
    implementation: normalizeAddress(
      gamePayload?.instance?.address,
      `${factoryName} implementation`,
    ),
    profileRegistry,
    sessionRegistry,
  });
}

