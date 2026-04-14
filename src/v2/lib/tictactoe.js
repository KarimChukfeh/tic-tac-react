import { ethers } from 'ethers';
import TicTacToeFactoryABIData from '../ABIs/TicTacToeFactory-ABI.json';
import LocalhostFactoryData from '../ABIs/localhost-tictac-factory.json';
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

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const PLAYER_PROFILE_ABI = getPlayerProfileAbi(TicTacToeFactoryABIData, PlayerProfileABIData);
export const PLAYER_REGISTRY_ABI = getPlayerRegistryAbi(TicTacToeFactoryABIData, PlayerRegistryABIData);
export const PLAYER_REGISTRY_ADDRESS = getPlayerRegistryAddress(TicTacToeFactoryABIData, PlayerRegistryABIData, 'TicTacToeFactory');

export const TICTACTOE_V2_FACTORY_ADDRESS = getFactoryAddress(TicTacToeFactoryABIData);
export const TICTACTOE_V2_FACTORY_ABI = getFactoryAbi(TicTacToeFactoryABIData);
export const TICTACTOE_V2_INSTANCE_ABI = getInstanceAbi(TicTacToeFactoryABIData);
export const TICTACTOE_V2_IMPLEMENTATION_ADDRESS = getImplementationAddress(TicTacToeFactoryABIData);
export const TICTACTOE_V2_FACTORY_ADDRESS_CANDIDATES = getFactoryAddressCandidates({
  gameAbiData: TicTacToeFactoryABIData,
  localhostFactoryData: LocalhostFactoryData,
  hardhatFactoryData: HardhatFactoryData,
  etourFactoryAbis: ETourFactoryABIs,
  factoryName: 'TicTacToeFactory',
});

export const PLAYER_COUNT_OPTIONS = [2, 4, 8, 16, 32];

// Time options in seconds for the UI
export const TIME_PER_PLAYER_OPTIONS = [120, 300, 600, 900]; // 2min, 5min, 10min, 15min
export const TIME_INCREMENT_OPTIONS = [15, 30]; // 15s, 30s
export const ENROLLMENT_WINDOW_OPTIONS = [120, 300, 600, 1800]; // 2min, 5min, 10min, 30min

// Escalation delays are now hardcoded in the contract:
// MATCH_LEVEL_2_DELAY = 2 minutes
// MATCH_LEVEL_3_DELAY = 3 minutes
// ENROLLMENT_LEVEL_2_DELAY = 2 minutes
export const DEFAULT_TIMEOUTS_BY_PLAYER_COUNT = {
  2: {
    matchTimePerPlayer: 120,      // 2 minutes
    timeIncrementPerMove: 15,     // 15 seconds
    enrollmentWindow: 120,        // 2 minutes
  },
  4: {
    matchTimePerPlayer: 120,      // 2 minutes
    timeIncrementPerMove: 15,     // 15 seconds
    enrollmentWindow: 300,        // 5 minutes
  },
  8: {
    matchTimePerPlayer: 120,      // 2 minutes
    timeIncrementPerMove: 15,     // 15 seconds
    enrollmentWindow: 600,        // 10 minutes
  },
  16: {
    matchTimePerPlayer: 120,      // 2 minutes
    timeIncrementPerMove: 30,     // 30 seconds
    enrollmentWindow: 600,        // 10 minutes
  },
  32: {
    matchTimePerPlayer: 120,      // 2 minutes
    timeIncrementPerMove: 30,     // 30 seconds
    enrollmentWindow: 1800,       // 30 minutes
  },
};

const contractCodeAvailabilityCache = new WeakMap();
const resolvedPlayerProfileAddressCache = new WeakMap();
const inFlightPlayerProfileAddressCache = new WeakMap();

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

const TICTACTOE_ASCII_MOVES_PATTERN = /^\s*[0-8](?:\s*,\s*[0-8])*\s*$/;

export function getFactoryContract(runner, address = TICTACTOE_V2_FACTORY_ADDRESS) {
  return new ethers.Contract(
    address,
    TICTACTOE_V2_FACTORY_ABI,
    runner
  );
}

export function getInstanceContract(address, runner) {
  return new ethers.Contract(address, TICTACTOE_V2_INSTANCE_ABI, runner);
}

export function getPlayerProfileContract(address, runner) {
  return new ethers.Contract(address, PLAYER_PROFILE_ABI, runner);
}

export function getPlayerRegistryContract(runner, address = PLAYER_REGISTRY_ADDRESS) {
  return new ethers.Contract(address, PLAYER_REGISTRY_ABI, runner);
}

export async function resolvePlayerProfileAddress(factoryContract, runner, account, registryAddress = PLAYER_REGISTRY_ADDRESS) {
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

export function getDefaultTimeouts(playerCount) {
  return {
    ...(DEFAULT_TIMEOUTS_BY_PLAYER_COUNT[playerCount] || DEFAULT_TIMEOUTS_BY_PLAYER_COUNT[8]),
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

export function formatTimestamp(unixSeconds) {
  const value = Number(unixSeconds || 0);
  if (!value) return 'Not started';
  return new Date(value * 1000).toLocaleString();
}

export function formatRelativeTime(unixSeconds) {
  const value = Number(unixSeconds || 0);
  if (!value) return 'just now';

  const delta = Math.max(0, Math.floor(Date.now() / 1000) - value);
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
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
  if (totalRounds <= 1) return 'Final';
  if (roundIndex === totalRounds - 1) return 'Final';
  if (roundIndex === totalRounds - 2) return 'Semi Final';
  return `Round ${roundIndex + 1}`;
}

export function decodeTicTacToeMoves(movesString) {
  if (!movesString) return [];

  if (TICTACTOE_ASCII_MOVES_PATTERN.test(movesString)) {
    return movesString
      .split(',')
      .map(value => Number.parseInt(value.trim(), 10))
      .filter(value => Number.isInteger(value) && value >= 0 && value <= 8);
  }

  const moves = [];
  for (let i = 0; i < movesString.length; i++) {
    const cellIndex = movesString.charCodeAt(i);
    if (cellIndex >= 0 && cellIndex <= 8) moves.push(cellIndex);
  }
  return moves;
}

export function unpackBoard(board) {
  if (Array.isArray(board)) {
    return board.map(cell => Number(cell));
  }
  return Array(9).fill(0);
}

export function normalizeTierConfig(config) {
  return {
    playerCount: Number(config.playerCount),
    entryFeeWei: config.entryFee,
    entryFeeEth: formatEth(config.entryFee),
    totalRounds: Number(config.totalRounds),
    tierKey: config.tierKey,
    timeouts: {
      matchTimePerPlayer: Number(config.timeouts.matchTimePerPlayer),
      timeIncrementPerMove: Number(config.timeouts.timeIncrementPerMove),
      matchLevel2Delay: Number(config.timeouts.matchLevel2Delay),
      matchLevel3Delay: Number(config.timeouts.matchLevel3Delay),
      enrollmentWindow: Number(config.timeouts.enrollmentWindow),
      enrollmentLevel2Delay: Number(config.timeouts.enrollmentLevel2Delay),
    },
  };
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

export function normalizeMatch(roundNumber, matchNumber, matchData, board) {
  const matchCompletionReason = Number(matchData.completionReason ?? 0);
  const matchCompletionCategory = Number(matchData.completionCategory ?? 0);
  const decodedMoves = decodeTicTacToeMoves(matchData.moves || '');
  return {
    roundNumber,
    matchNumber,
    player1: matchData.player1,
    player2: matchData.player2,
    winner: matchData.matchWinner,
    completionReason: matchCompletionReason,
    completionCategory: matchCompletionCategory,
    matchCompletionReason,
    matchCompletionCategory,
    isDraw: Boolean(matchData.isDraw),
    status: Number(matchData.status),
    statusLabel: matchStatusLabel(matchData.status),
    startTime: Number(matchData.startTime),
    lastMoveTime: Number(matchData.lastMoveTime),
    moves: matchData.moves || '',
    moveCount: decodedMoves.length,
    board: unpackBoard(board),
  };
}

export function isZeroAddress(value) {
  return !value || value === ZERO_ADDRESS;
}

function getInstanceAddressFromEventArgs(args) {
  return args?.instance ?? args?.tournamentInstance ?? args?.[0] ?? null;
}

export function extractInstanceAddressFromReceipt(receipt) {
  const iface = new ethers.Interface(TICTACTOE_V2_FACTORY_ABI);

  for (const log of receipt?.logs || []) {
    const directName = log?.fragment?.name ?? log?.eventName ?? log?.name;
    if (directName === 'InstanceDeployed') {
      const directAddress = getInstanceAddressFromEventArgs(log?.args);
      if (directAddress && !isZeroAddress(directAddress)) {
        return directAddress;
      }
    }

    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'InstanceDeployed') {
        const parsedAddress = getInstanceAddressFromEventArgs(parsed.args);
        if (parsedAddress && !isZeroAddress(parsedAddress)) {
          return parsedAddress;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function resolveCreatedInstanceAddress({
  factory,
  provider,
  creator,
  playerCount,
  entryFeeWei,
  countBefore = null,
  receipt = null,
}) {
  const emittedAddress = receipt ? extractInstanceAddressFromReceipt(receipt) : null;
  if (emittedAddress) {
    return emittedAddress;
  }

  const afterCountRaw = await factory.getInstanceCount();
  const afterCount = Number(afterCountRaw);
  if (afterCount === 0) {
    return null;
  }

  const creatorLower = creator.toLowerCase();
  const expectedFee = BigInt(entryFeeWei);
  const block = receipt?.blockNumber ? await provider.getBlock(receipt.blockNumber) : null;
  const txTimestamp = block?.timestamp ? Number(block.timestamp) : 0;

  const candidateAddresses = [];

  if (countBefore !== null && afterCount > countBefore) {
    const newAddresses = await factory.getInstances(countBefore, afterCount - countBefore);
    const nonZeroNewAddresses = newAddresses.filter((address) => !isZeroAddress(address));
    if (nonZeroNewAddresses.length === 1) {
      return nonZeroNewAddresses[0];
    }
    candidateAddresses.push(...newAddresses);
  }

  const recentWindow = Math.min(afterCount, 10);
  const recentOffset = Math.max(0, afterCount - recentWindow);
  const recentAddresses = await factory.getInstances(recentOffset, recentWindow);

  for (const address of recentAddresses) {
    if (!candidateAddresses.includes(address)) {
      candidateAddresses.push(address);
    }
  }

  for (const address of [...candidateAddresses].reverse()) {
    try {
      const instance = getInstanceContract(address, provider);
      const info = await instance.getInstanceInfo();
      const infoCreator = info.instanceCreator.toLowerCase();
      const infoPlayerCount = Number(info.playerCount);
      const infoEntryFee = BigInt(info.entryFee);
      const createdAt = Number(info.createdAt || 0);

      const creatorMatches = infoCreator === creatorLower;
      const playerCountMatches = infoPlayerCount === Number(playerCount);
      const entryFeeMatches = infoEntryFee === expectedFee;
      const timestampMatches = !txTimestamp || Math.abs(createdAt - txTimestamp) <= 120;

      if (creatorMatches && playerCountMatches && entryFeeMatches && timestampMatches) {
        return address;
      }
    } catch {
      continue;
    }
  }

  return null;
}

// Selectors for factory + instance custom errors (keccak256 of "ErrorName()")
const CUSTOM_ERROR_SELECTORS = {
  // Factory errors
  '0x6fe6a4c9': 'InvalidEntryFee',
  '0x3282799a': 'InvalidPlayerCount',
  '0x53771434': 'InvalidTimeoutConfig',
  '0x82b42900': 'Unauthorized',
  '0x90b8ec18': 'TransferFailed',
  '0x3ee5aeb5': 'ReentrancyGuardReentrantCall',
};

function decodeRevertData(data) {
  if (typeof data !== 'string' || data.length < 10) return null;

  // Standard Error(string) — 0x08c379a0
  if (data.startsWith('0x08c379a0')) {
    try {
      const [reason] = ethers.AbiCoder.defaultAbiCoder().decode(['string'], `0x${data.slice(10)}`);
      return reason;
    } catch { /* fall through */ }
  }

  // Panic(uint256) — 0x4e487b71
  if (data.startsWith('0x4e487b71')) {
    try {
      const [code] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], `0x${data.slice(10)}`);
      return `Panic: ${code}`;
    } catch { /* fall through */ }
  }

  // Custom errors — match by 4-byte selector
  const selector = data.slice(0, 10).toLowerCase();
  if (CUSTOM_ERROR_SELECTORS[selector]) {
    return CUSTOM_ERROR_SELECTORS[selector];
  }

  return null;
}

export function getReadableError(error, fallback = 'Transaction failed.') {
  // Walk all known paths where revert data can live
  const candidates = [
    error?.data?.data,
    error?.info?.error?.data,
    error?.error?.data?.data,
    error?.error?.data,
    error?.data,
  ];

  for (const candidate of candidates) {
    const decoded = decodeRevertData(candidate);
    if (decoded) return decoded;
  }

  const nestedMessage = error?.data?.message
    || error?.info?.error?.message
    || error?.error?.data?.message
    || error?.error?.message;

  if (nestedMessage) {
    return nestedMessage;
  }

  return error?.shortMessage || error?.message || fallback;
}
