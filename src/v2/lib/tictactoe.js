import { ethers } from 'ethers';
import TicTacChainFactoryABIData from '../ABIs/TicTacChainFactory-ABI.json';
import LocalhostFactoryData from '../ABIs/localhost-tictac-factory.json';
import HardhatFactoryData from '../ABIs/hardhat-factory.json';
import ETourFactoryABIs from '../ABIs/ETour-Factory-ABIs.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Minimal ABI for the PlayerProfile clone contract
export const PLAYER_PROFILE_ABI = [
  {
    "inputs": [],
    "name": "getEnrollmentCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "offset", "type": "uint256" },
      { "internalType": "uint256", "name": "limit", "type": "uint256" }
    ],
    "name": "getEnrollments",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "instance", "type": "address" },
          { "internalType": "uint8", "name": "gameType", "type": "uint8" },
          { "internalType": "uint256", "name": "enrolledAt", "type": "uint256" },
          { "internalType": "uint256", "name": "entryFee", "type": "uint256" },
          { "internalType": "bool", "name": "concluded", "type": "bool" },
          { "internalType": "bool", "name": "won", "type": "bool" },
          { "internalType": "uint256", "name": "prize", "type": "uint256" }
        ],
        "internalType": "struct PlayerProfile.EnrollmentRecord[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "instanceAddress", "type": "address" }
    ],
    "name": "getEnrollmentByInstance",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "instance", "type": "address" },
          { "internalType": "uint8", "name": "gameType", "type": "uint8" },
          { "internalType": "uint256", "name": "enrolledAt", "type": "uint256" },
          { "internalType": "uint256", "name": "entryFee", "type": "uint256" },
          { "internalType": "bool", "name": "concluded", "type": "bool" },
          { "internalType": "bool", "name": "won", "type": "bool" },
          { "internalType": "uint256", "name": "prize", "type": "uint256" }
        ],
        "internalType": "struct PlayerProfile.EnrollmentRecord",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStats",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalPlayed", "type": "uint256" },
          { "internalType": "uint256", "name": "totalWins", "type": "uint256" },
          { "internalType": "uint256", "name": "totalLosses", "type": "uint256" },
          { "internalType": "int256", "name": "totalNetEarnings", "type": "int256" }
        ],
        "internalType": "struct PlayerProfile.Stats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const TICTACTOE_V2_FACTORY_ADDRESS = TicTacChainFactoryABIData.factory.address;
export const TICTACTOE_V2_FACTORY_ABI = TicTacChainFactoryABIData.factory.abi;
export const TICTACTOE_V2_INSTANCE_ABI = TicTacChainFactoryABIData.instance.abi;
export const TICTACTOE_V2_IMPLEMENTATION_ADDRESS = TicTacChainFactoryABIData.instance.address;
export const TICTACTOE_V2_FACTORY_ADDRESS_CANDIDATES = [
  TicTacChainFactoryABIData.factory.address,
  LocalhostFactoryData.factory?.TicTacChainFactory,
  HardhatFactoryData.factories?.TicTacChainFactory,
  ETourFactoryABIs.factories?.TicTacChainFactory?.address,
].filter((value, index, array) => value && array.indexOf(value) === index);

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
    matchTimePerPlayer: 300,      // 5 minutes
    timeIncrementPerMove: 15,     // 15 seconds
    enrollmentWindow: 300,        // 5 minutes
  },
  8: {
    matchTimePerPlayer: 300,      // 5 minutes
    timeIncrementPerMove: 15,     // 15 seconds
    enrollmentWindow: 600,        // 10 minutes
  },
  16: {
    matchTimePerPlayer: 600,      // 10 minutes
    timeIncrementPerMove: 30,     // 30 seconds
    enrollmentWindow: 600,        // 10 minutes
  },
  32: {
    matchTimePerPlayer: 600,      // 10 minutes
    timeIncrementPerMove: 30,     // 30 seconds
    enrollmentWindow: 1800,       // 30 minutes
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
    winner: info.winner,
    completionReason: tournamentResolutionReason,
    completionCategory: tournamentResolutionCategory,
    tournamentResolutionReason,
    tournamentResolutionCategory,
    prizeAwarded: info.prizeAwarded ?? tournament.prizeAwarded ?? 0n,
    prizeRecipient: info.prizeRecipient ?? tournament.prizeRecipient ?? ZERO_ADDRESS,
    raffleAwarded: info.raffleAwarded ?? tournament.raffleAwarded ?? 0n,
    raffleRecipient: info.raffleRecipient ?? tournament.raffleRecipient ?? ZERO_ADDRESS,
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
    moveCount: matchData.moves ? matchData.moves.split(',').filter(Boolean).length : 0,
    board: unpackBoard(board),
  };
}

export function isZeroAddress(value) {
  return !value || value === ZERO_ADDRESS;
}

export function extractInstanceAddressFromReceipt(receipt) {
  const iface = new ethers.Interface(TICTACTOE_V2_FACTORY_ABI);

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'InstanceDeployed') {
        return parsed.args.instance;
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
