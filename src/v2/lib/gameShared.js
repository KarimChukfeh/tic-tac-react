import { ethers } from 'ethers';
import HardhatFactoryData from '../ABIs/hardhat-factory.json';
import ETourFactoryABIs from '../ABIs/ETour-Factory-ABIs.json';
import PlayerProfileABIData from '../ABIs/PlayerProfile-ABI.json';
import PlayerRegistryABIData from '../ABIs/PlayerRegistry-ABI.json';
import {
  getFactoryAbi,
  getFactoryAddress,
  getFactoryAddressCandidates,
  getImplementationAddress,
  getInstanceAbi,
  getPlayerProfileAbi,
  getPlayerRegistryAbi,
  getPlayerRegistryAddress,
} from './abiContracts';
import { collectErrorDetails, pickBestErrorMessage } from './errorDetails';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const contractCodeAvailabilityCache = new WeakMap();
const resolvedPlayerProfileAddressCache = new WeakMap();
const inFlightPlayerProfileAddressCache = new WeakMap();

const TOURNAMENT_STATUS_LABELS = {
  0: 'Enrolling',
  1: 'In Progress',
  2: 'Completed',
  3: 'Cancelled',
  4: 'EL1',
  5: 'EL2',
};

const MATCH_STATUS_LABELS = {
  0: 'Pending',
  1: 'Active',
  2: 'Complete',
  3: 'Escalated',
};

function getRunnerScopedCache(cacheStore, runner) {
  let cache = cacheStore.get(runner);
  if (!cache) {
    cache = new Map();
    cacheStore.set(runner, cache);
  }
  return cache;
}

function buildPlayerProfileCacheKey(factoryContract, account, registryAddress) {
  const factoryAddress = (factoryContract.target || factoryContract.address || '').toLowerCase();
  const normalizedAccount = String(account || '').toLowerCase();
  const normalizedRegistry = String(registryAddress || '').toLowerCase();
  return `${factoryAddress}:${normalizedRegistry}:${normalizedAccount}`;
}

async function hasContractCode(runner, address) {
  if (!runner || typeof runner !== 'object' || !address) return false;

  let addressCache = contractCodeAvailabilityCache.get(runner);
  if (!addressCache) {
    addressCache = new Map();
    contractCodeAvailabilityCache.set(runner, addressCache);
  }

  if (!addressCache.has(address)) {
    addressCache.set(address, runner.getCode(address)
      .then((code) => code && code !== '0x' && code !== '0x0')
      .catch(() => false));
  }

  return await addressCache.get(address);
}

function getInstanceAddressFromEventArgs(args) {
  return args?.instance ?? args?.tournamentInstance ?? args?.[0] ?? null;
}

export function buildV2MatchKey(roundNumber, matchNumber) {
  return ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);
}

export function getDefaultTimeouts(defaultTimeoutsByPlayerCount, fallbackPlayerCount, playerCount) {
  return {
    ...(defaultTimeoutsByPlayerCount[playerCount] || defaultTimeoutsByPlayerCount[fallbackPlayerCount]),
  };
}

export function formatEth(value, decimals = 4) {
  if (value === undefined || value === null) return '0';
  const formatted = ethers.formatEther(value);
  const number = Number.parseFloat(formatted);
  if (!Number.isFinite(number)) return formatted;
  if (number === 0) return '0';
  return number.toFixed(decimals).replace(/\.?0+$/, '');
}

export function tournamentStatusLabel(status) {
  return TOURNAMENT_STATUS_LABELS[Number(status)] || `Status ${Number(status)}`;
}

export function matchStatusLabel(status) {
  return MATCH_STATUS_LABELS[Number(status)] || `Status ${Number(status)}`;
}

export function getTournamentTypeLabel(playerCount) {
  return Number(playerCount) === 2 ? 'Duel' : 'Tournament';
}

export function getRoundLabel(roundIndex, totalRounds) {
  if (totalRounds <= 1) return 'Finals';
  if (roundIndex === totalRounds - 1) return 'Finals';
  if (roundIndex === totalRounds - 2) return 'Semi Finals';
  return `Round ${roundIndex + 1}`;
}

export function normalizeInstanceSnapshot(address, info, tournament, players, isEnrolled = false) {
  const tournamentResolutionReason = Number(info.completionReason ?? tournament.completionReason ?? 0);
  const tournamentResolutionCategory = Number(info.completionCategory ?? tournament.completionCategory ?? 0);
  const fullPrizePool = tournament.prizePool ?? info.prizePool ?? 0n;
  const totalEntryFeesAccrued = tournament.totalEntryFeesAccrued ?? info.totalEntryFeesAccrued ?? 0n;

  return {
    address,
    tierKey: info.tierKey,
    playerCount: Number(info.playerCount),
    entryFeeWei: info.entryFee,
    entryFeeEth: formatEth(info.entryFee),
    creator: info.instanceCreator,
    createdAt: Number(info.createdAt),
    startedAt: Number(info.startTime),
    status: Number(info.status),
    statusLabel: tournamentStatusLabel(info.status),
    enrolledCount: Number(info.enrolledCount),
    prizePoolWei: fullPrizePool,
    prizePoolEth: formatEth(fullPrizePool),
    fullPrizePool,
    fullPrizePoolEth: formatEth(fullPrizePool),
    totalEntryFeesAccrued,
    totalEntryFeesAccruedEth: formatEth(totalEntryFeesAccrued),
    winner: info.winner,
    completionReason: tournamentResolutionReason,
    completionCategory: tournamentResolutionCategory,
    tournamentResolutionReason,
    tournamentResolutionCategory,
    prizeAwarded: info.prizeAwarded ?? tournament.prizeAwarded ?? 0n,
    prizeRecipient: info.prizeRecipient ?? tournament.prizeRecipient ?? ZERO_ADDRESS,
    players,
    isEnrolled,
    currentRound: Number(tournament.currentRound),
    actualTotalRounds: Number(tournament.actualTotalRounds),
    enrollmentTimeout: {
      escalation1Start: Number(tournament.enrollmentTimeout.escalation1Start),
      escalation2Start: Number(tournament.enrollmentTimeout.escalation2Start),
      activeEscalation: Number(tournament.enrollmentTimeout.activeEscalation),
      forfeitPool: tournament.enrollmentTimeout.forfeitPool,
    },
  };
}

export function packNumericBoard(board, mask = 3) {
  let packedBoard = 0n;
  for (let index = 0; index < board.length; index++) {
    packedBoard |= BigInt(Number(board[index]) & mask) << BigInt(index * 2);
  }
  return packedBoard;
}

export function createReadableErrorGetter(customErrorSelectors = {}) {
  const selectors = {
    '0x6fe6a4c9': 'InvalidEntryFee',
    '0x3282799a': 'InvalidPlayerCount',
    '0x53771434': 'InvalidTimeoutConfig',
    '0x82b42900': 'Unauthorized',
    '0x90b8ec18': 'TransferFailed',
    '0x3ee5aeb5': 'ReentrancyGuardReentrantCall',
    ...customErrorSelectors,
  };

  function decodeRevertData(data) {
    if (typeof data !== 'string' || data.length < 10) return null;

    if (data.startsWith('0x08c379a0')) {
      try {
        const [reason] = ethers.AbiCoder.defaultAbiCoder().decode(['string'], `0x${data.slice(10)}`);
        return reason;
      } catch {
        return null;
      }
    }

    if (data.startsWith('0x4e487b71')) {
      try {
        const [code] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], `0x${data.slice(10)}`);
        return `Panic: ${code}`;
      } catch {
        return null;
      }
    }

    return selectors[data.slice(0, 10).toLowerCase()] || null;
  }

  return function getReadableError(error, fallback = 'Transaction failed.') {
    const { dataCandidates, messageCandidates } = collectErrorDetails(error);
    for (const candidate of dataCandidates) {
      const decoded = decodeRevertData(candidate);
      if (decoded) return decoded;
    }
    return pickBestErrorMessage(messageCandidates, fallback);
  };
}

export function createSharedGameContracts({ gameAbiData, localhostFactoryData, factoryName }) {
  const PLAYER_PROFILE_ABI = getPlayerProfileAbi(gameAbiData, PlayerProfileABIData);
  const PLAYER_REGISTRY_ABI = getPlayerRegistryAbi(gameAbiData, PlayerRegistryABIData);
  const PLAYER_REGISTRY_ADDRESS = getPlayerRegistryAddress(gameAbiData, PlayerRegistryABIData, factoryName);
  const FACTORY_ADDRESS = getFactoryAddress(gameAbiData);
  const FACTORY_ABI = getFactoryAbi(gameAbiData);
  const INSTANCE_ABI = getInstanceAbi(gameAbiData);
  const IMPLEMENTATION_ADDRESS = getImplementationAddress(gameAbiData);
  const FACTORY_ADDRESS_CANDIDATES = getFactoryAddressCandidates({
    gameAbiData,
    localhostFactoryData,
    hardhatFactoryData: HardhatFactoryData,
    etourFactoryAbis: ETourFactoryABIs,
    factoryName,
  });

  function getFactoryContract(runner, address = FACTORY_ADDRESS) {
    return new ethers.Contract(address, FACTORY_ABI, runner);
  }

  function getInstanceContract(address, runner) {
    return new ethers.Contract(address, INSTANCE_ABI, runner);
  }

  function getPlayerProfileContract(address, runner) {
    return new ethers.Contract(address, PLAYER_PROFILE_ABI, runner);
  }

  function getPlayerRegistryContract(runner, address = PLAYER_REGISTRY_ADDRESS) {
    return new ethers.Contract(address, PLAYER_REGISTRY_ABI, runner);
  }

  async function resolvePlayerProfileAddress(factoryContract, runner, account, registryAddress = PLAYER_REGISTRY_ADDRESS) {
    if (!factoryContract || !runner || !account) return null;

    const resolvedCache = getRunnerScopedCache(resolvedPlayerProfileAddressCache, runner);
    const inFlightCache = getRunnerScopedCache(inFlightPlayerProfileAddressCache, runner);
    const cacheKey = buildPlayerProfileCacheKey(factoryContract, account, registryAddress);

    if (resolvedCache.has(cacheKey)) {
      return resolvedCache.get(cacheKey);
    }

    if (inFlightCache.has(cacheKey)) {
      return await inFlightCache.get(cacheKey);
    }

    const resolvePromise = (async () => {
      if (registryAddress) {
        try {
          if (await hasContractCode(runner, registryAddress)) {
            const registry = getPlayerRegistryContract(runner, registryAddress);
            const gameType = Number(await factoryContract.gameType().catch(() => NaN));
            if (Number.isFinite(gameType)) {
              const profileAddr = await registry.getProfile(account, gameType).catch(() => ZERO_ADDRESS);
              if (profileAddr && profileAddr !== ZERO_ADDRESS) {
                resolvedCache.set(cacheKey, profileAddr);
                return profileAddr;
              }
            }
          }
        } catch {
          // Fall through to factory-based lookup when the registry is unavailable.
        }
      }

      let profileAddr = null;
      try {
        profileAddr = await factoryContract.players(account);
      } catch {
        profileAddr = null;
      }

      if (!profileAddr || profileAddr === ZERO_ADDRESS) {
        try {
          profileAddr = await factoryContract.getPlayerProfile(account);
        } catch {
          profileAddr = null;
        }
      }

      const normalized = profileAddr && profileAddr !== ZERO_ADDRESS ? profileAddr : null;
      if (normalized) {
        resolvedCache.set(cacheKey, normalized);
      }
      return normalized;
    })();

    inFlightCache.set(cacheKey, resolvePromise);
    try {
      return await resolvePromise;
    } finally {
      inFlightCache.delete(cacheKey);
    }
  }

  function extractInstanceAddressFromReceipt(receipt) {
    const iface = new ethers.Interface(FACTORY_ABI);

    for (const log of receipt?.logs || []) {
      const directName = log?.fragment?.name ?? log?.eventName ?? log?.name;
      if (directName === 'InstanceDeployed') {
        const directAddress = getInstanceAddressFromEventArgs(log?.args);
        if (directAddress && directAddress !== ZERO_ADDRESS) {
          return directAddress;
        }
      }

      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'InstanceDeployed') {
          const parsedAddress = getInstanceAddressFromEventArgs(parsed.args);
          if (parsedAddress && parsedAddress !== ZERO_ADDRESS) {
            return parsedAddress;
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  async function resolveCreatedInstanceAddress({
    factory,
    provider,
    creator,
    playerCount,
    entryFeeWei,
    countBefore = null,
    receipt = null,
  }) {
    const emittedAddress = receipt ? extractInstanceAddressFromReceipt(receipt) : null;
    if (emittedAddress) return emittedAddress;

    const afterCount = Number(await factory.getInstanceCount());
    if (afterCount === 0) return null;

    const creatorLower = creator.toLowerCase();
    const expectedFee = BigInt(entryFeeWei);
    const block = receipt?.blockNumber ? await provider.getBlock(receipt.blockNumber) : null;
    const txTimestamp = block?.timestamp ? Number(block.timestamp) : 0;
    const candidateAddresses = [];

    if (countBefore !== null && afterCount > countBefore) {
      const newAddresses = await factory.getInstances(countBefore, afterCount - countBefore);
      const nonZeroNewAddresses = newAddresses.filter((address) => address && address !== ZERO_ADDRESS);
      if (nonZeroNewAddresses.length === 1) {
        return nonZeroNewAddresses[0];
      }
      candidateAddresses.push(...newAddresses);
    }

    const recentWindow = Math.min(afterCount, 10);
    const recentOffset = Math.max(0, afterCount - recentWindow);
    const recentAddresses = await factory.getInstances(recentOffset, recentWindow);
    for (const address of recentAddresses) {
      if (!candidateAddresses.includes(address)) candidateAddresses.push(address);
    }

    for (const address of [...candidateAddresses].reverse()) {
      try {
        const instance = getInstanceContract(address, provider);
        const info = await instance.getInstanceInfo();
        const creatorMatches = info.instanceCreator.toLowerCase() === creatorLower;
        const playerCountMatches = Number(info.playerCount) === Number(playerCount);
        const feeMatches = BigInt(info.entryFee) === expectedFee;
        const createdAt = Number(info.createdAt || 0);
        const timestampMatches = !txTimestamp || Math.abs(createdAt - txTimestamp) <= 120;

        if (creatorMatches && playerCountMatches && feeMatches && timestampMatches) {
          return address;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  return {
    PLAYER_PROFILE_ABI,
    PLAYER_REGISTRY_ABI,
    PLAYER_REGISTRY_ADDRESS,
    FACTORY_ADDRESS,
    FACTORY_ABI,
    INSTANCE_ABI,
    IMPLEMENTATION_ADDRESS,
    FACTORY_ADDRESS_CANDIDATES,
    getFactoryContract,
    getInstanceContract,
    getPlayerProfileContract,
    getPlayerRegistryContract,
    resolvePlayerProfileAddress,
    extractInstanceAddressFromReceipt,
    resolveCreatedInstanceAddress,
  };
}
