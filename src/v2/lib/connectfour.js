import { ethers } from 'ethers';
import ConnectFourFactoryABIData from '../ABIs/ConnectFourFactory-ABI.json';
import LocalhostFactoryData from '../ABIs/localhost-connectfour-factory.json';
import HardhatFactoryData from '../ABIs/hardhat-factory.json';
import ETourFactoryABIs from '../ABIs/ETour-Factory-ABIs.json';
import PlayerProfileABIData from '../ABIs/PlayerProfile-ABI.json';
import PlayerRegistryABIData from '../ABIs/PlayerRegistry-ABI.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const PLAYER_PROFILE_ABI = PlayerProfileABIData.contract.abi;
export const PLAYER_REGISTRY_ABI = PlayerRegistryABIData.contract.abi;
export const PLAYER_REGISTRY_ADDRESS = PlayerRegistryABIData.addressesByGame?.ConnectFourFactory || null;

export const CONNECTFOUR_V2_FACTORY_ADDRESS = ConnectFourFactoryABIData.factory.address;
export const CONNECTFOUR_V2_FACTORY_ABI = ConnectFourFactoryABIData.factory.abi;
export const CONNECTFOUR_V2_INSTANCE_ABI = ConnectFourFactoryABIData.instance.abi;
export const CONNECTFOUR_V2_IMPLEMENTATION_ADDRESS = ConnectFourFactoryABIData.instance.address;
export const CONNECTFOUR_V2_FACTORY_ADDRESS_CANDIDATES = [
  ConnectFourFactoryABIData.factory.address,
  LocalhostFactoryData.factory?.ConnectFourFactory,
  HardhatFactoryData.factories?.ConnectFourFactory,
  ETourFactoryABIs.factories?.ConnectFourFactory?.address,
].filter((value, index, array) => value && array.indexOf(value) === index);

export const PLAYER_COUNT_OPTIONS = [2, 4, 8, 16, 32];
export const TIME_PER_PLAYER_OPTIONS = [120, 300, 600, 900];
export const TIME_INCREMENT_OPTIONS = [15, 30];
export const ENROLLMENT_WINDOW_OPTIONS = [120, 300, 600, 1800];

export const DEFAULT_TIMEOUTS_BY_PLAYER_COUNT = {
  2: {
    matchTimePerPlayer: 300,
    timeIncrementPerMove: 15,
    enrollmentWindow: 300,
  },
  4: {
    matchTimePerPlayer: 300,
    timeIncrementPerMove: 15,
    enrollmentWindow: 300,
  },
  8: {
    matchTimePerPlayer: 300,
    timeIncrementPerMove: 15,
    enrollmentWindow: 600,
  },
  16: {
    matchTimePerPlayer: 600,
    timeIncrementPerMove: 30,
    enrollmentWindow: 600,
  },
  32: {
    matchTimePerPlayer: 600,
    timeIncrementPerMove: 30,
    enrollmentWindow: 1800,
  },
};

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

const CONNECTFOUR_ASCII_MOVES_PATTERN = /^\s*[0-6](?:\s*,\s*[0-6])*\s*$/;

export function getFactoryContract(runner, address = CONNECTFOUR_V2_FACTORY_ADDRESS) {
  return new ethers.Contract(address, CONNECTFOUR_V2_FACTORY_ABI, runner);
}

export function getInstanceContract(address, runner) {
  return new ethers.Contract(address, CONNECTFOUR_V2_INSTANCE_ABI, runner);
}

export function getPlayerProfileContract(address, runner) {
  return new ethers.Contract(address, PLAYER_PROFILE_ABI, runner);
}

export function getPlayerRegistryContract(runner, address = PLAYER_REGISTRY_ADDRESS) {
  return new ethers.Contract(address, PLAYER_REGISTRY_ABI, runner);
}

export async function resolvePlayerProfileAddress(factoryContract, runner, account, registryAddress = PLAYER_REGISTRY_ADDRESS) {
  if (!factoryContract || !runner || !account) return null;

  if (registryAddress) {
    try {
      const code = await runner.getCode(registryAddress);
      if (code && code !== '0x') {
        const registry = getPlayerRegistryContract(runner, registryAddress);
        const gameType = Number(await factoryContract.gameType().catch(() => NaN));
        if (Number.isFinite(gameType)) {
          const profileAddr = await registry.getProfile(account, gameType).catch(() => ZERO_ADDRESS);
          if (profileAddr && profileAddr !== ZERO_ADDRESS) return profileAddr;
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

  return profileAddr && profileAddr !== ZERO_ADDRESS ? profileAddr : null;
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

export function decodeConnectFourMoves(movesString) {
  if (!movesString) return [];

  if (CONNECTFOUR_ASCII_MOVES_PATTERN.test(movesString)) {
    return movesString
      .split(',')
      .map(value => Number.parseInt(value.trim(), 10))
      .filter(value => Number.isInteger(value) && value >= 0 && value <= 6);
  }

  const columns = [];
  for (let i = 0; i < movesString.length; i++) {
    const value = movesString.charCodeAt(i);
    if (value >= 0 && value <= 6) columns.push(value);
  }
  return columns;
}

export function unpackBoard(board) {
  if (Array.isArray(board)) {
    return board.map(cell => Number(cell));
  }
  return Array(42).fill(0);
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
  const decodedMoves = decodeConnectFourMoves(matchData.moves || '');
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
  const iface = new ethers.Interface(CONNECTFOUR_V2_FACTORY_ABI);

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

const CUSTOM_ERROR_SELECTORS = {
  '0x6fe6a4c9': 'InvalidEntryFee',
  '0x3282799a': 'InvalidPlayerCount',
  '0x53771434': 'InvalidTimeoutConfig',
  '0x82b42900': 'Unauthorized',
  '0x90b8ec18': 'TransferFailed',
  '0x3ee5aeb5': 'ReentrancyGuardReentrantCall',
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

  const selector = data.slice(0, 10).toLowerCase();
  if (CUSTOM_ERROR_SELECTORS[selector]) {
    return CUSTOM_ERROR_SELECTORS[selector];
  }

  return null;
}

export function getReadableError(error, fallback = 'Transaction failed.') {
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
