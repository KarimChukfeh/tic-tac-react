function getFactoryEntryAddress(source, factoryName) {
  return source?.factory?.[factoryName] ?? source?.factories?.[factoryName] ?? null;
}

function getFactoryMapEntry(source, factoryName) {
  return source?.factories?.[factoryName] ?? source?.factory?.[factoryName] ?? null;
}

function getFirstContractLikeEntry(source) {
  if (!source || typeof source !== 'object') return null;

  if (source.address || source.abi) {
    return source;
  }

  return Object.values(source).find((value) => (
    value &&
    typeof value === 'object' &&
    (value.address || value.abi)
  )) ?? null;
}

function getNamedContractEntry(source, contractName) {
  const directEntry = source?.[contractName];
  if (directEntry && typeof directEntry === 'object') return directEntry;
  return getFirstContractLikeEntry(source);
}

export function uniqueNonEmpty(values) {
  return values.filter((value, index, array) => value && array.indexOf(value) === index);
}

export function getFactoryAddress(abiData) {
  return abiData?.factory?.address ?? getFirstContractLikeEntry(abiData?.factory)?.address ?? null;
}

export function getFactoryAbi(abiData) {
  return abiData?.factory?.abi ?? getFirstContractLikeEntry(abiData?.factory)?.abi ?? [];
}

export function getInstanceAbi(abiData) {
  return abiData?.instance?.abi
    ?? abiData?.instance?.instanceAbi
    ?? getFirstContractLikeEntry(abiData?.instance)?.abi
    ?? getFirstContractLikeEntry(abiData?.instance?.instanceAbi)?.abi
    ?? [];
}

export function getImplementationAddress(abiData) {
  return abiData?.instance?.address
    ?? getFirstContractLikeEntry(abiData?.instance)?.address
    ?? abiData?.implementation?.address
    ?? getFirstContractLikeEntry(abiData?.implementation)?.address
    ?? null;
}

export function getPlayerProfileAbi(gameAbiData, fallbackAbiData) {
  return gameAbiData?.playerProfile?.PlayerProfileImpl?.abi
    ?? getNamedContractEntry(gameAbiData?.playerProfile, 'PlayerProfileImpl')?.abi
    ?? fallbackAbiData?.contract?.abi
    ?? [];
}

export function getPlayerRegistryAbi(gameAbiData, fallbackAbiData) {
  return gameAbiData?.playerProfile?.PlayerRegistry?.abi
    ?? getNamedContractEntry(gameAbiData?.playerProfile, 'PlayerRegistry')?.abi
    ?? fallbackAbiData?.contract?.abi
    ?? [];
}

export function getPlayerRegistryAddress(gameAbiData, fallbackAbiData, factoryName) {
  return gameAbiData?.playerProfile?.PlayerRegistry?.address
    ?? getNamedContractEntry(gameAbiData?.playerProfile, 'PlayerRegistry')?.address
    ?? fallbackAbiData?.addressesByGame?.[factoryName]
    ?? null;
}

export function getFactoryAddressCandidates({
  gameAbiData,
  localhostFactoryData,
  hardhatFactoryData,
  etourFactoryAbis,
  factoryName,
}) {
  const etourFactoryEntry = getFactoryMapEntry(etourFactoryAbis, factoryName);
  return uniqueNonEmpty([
    getFactoryAddress(gameAbiData),
    getFactoryEntryAddress(localhostFactoryData, factoryName),
    getFactoryEntryAddress(hardhatFactoryData, factoryName),
    etourFactoryEntry?.address ?? etourFactoryEntry,
  ]);
}
