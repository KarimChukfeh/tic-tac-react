import { ethers } from 'ethers';
import ChessFactoryABIData from '../ABIs/ChessOnChainFactory-ABI.json';
import LocalhostFactoryData from '../ABIs/localhost-chess-factory.json';
import HardhatFactoryData from '../ABIs/hardhat-factory.json';
import ETourFactoryABIs from '../ABIs/ETour-Factory-ABIs.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

export const CHESS_V2_FACTORY_ADDRESS = ChessFactoryABIData.factory.address;
export const CHESS_V2_FACTORY_ABI = ChessFactoryABIData.factory.abi;
export const CHESS_V2_INSTANCE_ABI = ChessFactoryABIData.instance.instanceAbi;
export const CHESS_V2_IMPLEMENTATION_ADDRESS = ChessFactoryABIData.instance.address;
export const CHESS_V2_FACTORY_ADDRESS_CANDIDATES = [
  ChessFactoryABIData.factory.address,
  LocalhostFactoryData.factory?.ChessOnChainFactory,
  HardhatFactoryData.factories?.ChessOnChainFactory,
  ETourFactoryABIs.factories?.ChessOnChainFactory?.address,
].filter((value, index, array) => value && array.indexOf(value) === index);

export const PLAYER_COUNT_OPTIONS = [2, 4, 8, 16, 32];
export const TIME_PER_PLAYER_OPTIONS = [300, 600, 900, 1200];
export const TIME_INCREMENT_OPTIONS = [15, 30];
export const ENROLLMENT_WINDOW_OPTIONS = [300, 600, 1800];

export const DEFAULT_TIMEOUTS_BY_PLAYER_COUNT = {
  2: {
    matchTimePerPlayer: 600,
    timeIncrementPerMove: 15,
    enrollmentWindow: 600,
  },
  4: {
    matchTimePerPlayer: 600,
    timeIncrementPerMove: 15,
    enrollmentWindow: 1800,
  },
  8: {
    matchTimePerPlayer: 600,
    timeIncrementPerMove: 15,
    enrollmentWindow: 1800,
  },
  16: {
    matchTimePerPlayer: 900,
    timeIncrementPerMove: 30,
    enrollmentWindow: 1800,
  },
  32: {
    matchTimePerPlayer: 1200,
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

export function getFactoryContract(runner, address = CHESS_V2_FACTORY_ADDRESS) {
  return new ethers.Contract(address, CHESS_V2_FACTORY_ABI, runner);
}

export function getInstanceContract(address, runner) {
  return new ethers.Contract(address, CHESS_V2_INSTANCE_ABI, runner);
}

export function getPlayerProfileContract(address, runner) {
  return new ethers.Contract(address, PLAYER_PROFILE_ABI, runner);
}

export function getDefaultTimeouts(playerCount) {
  return {
    ...(DEFAULT_TIMEOUTS_BY_PLAYER_COUNT[playerCount] || DEFAULT_TIMEOUTS_BY_PLAYER_COUNT[4]),
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

export function unpackBoard(packedBoard) {
  const board = [];
  let packed = BigInt(packedBoard || 0);
  for (let i = 0; i < 64; i++) {
    const value = Number(packed & 0xFn);
    let pieceType = 0;
    let color = 0;
    if (value >= 1 && value <= 6) {
      pieceType = value;
      color = 1;
    } else if (value >= 7 && value <= 12) {
      pieceType = value - 6;
      color = 2;
    }
    board.push({ pieceType, color });
    packed >>= 4n;
  }
  return board;
}

export function normalizeInstanceSnapshot(address, info, tournament, players, isEnrolled = false) {
  const tournamentResolutionReason = Number(info.completionReason ?? tournament.completionReason ?? 0);
  const tournamentResolutionCategory = Number(info.completionCategory ?? tournament.completionCategory ?? 0);
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
    prizePoolWei: tournament.prizePool,
    prizePoolEth: formatEth(tournament.prizePool),
    winner: info.winner,
    completionReason: tournamentResolutionReason,
    completionCategory: tournamentResolutionCategory,
    tournamentResolutionReason,
    tournamentResolutionCategory,
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

export function normalizeMatch(roundNumber, matchNumber, matchData, packedBoard, packedState) {
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
    moveCount: Math.floor((matchData.moves || '').length / 2),
    packedBoard: BigInt(packedBoard || 0),
    packedState: BigInt(packedState || 0),
    board: unpackBoard(packedBoard),
  };
}

export function isZeroAddress(value) {
  return !value || value === ZERO_ADDRESS;
}

export function extractInstanceAddressFromReceipt(receipt) {
  const iface = new ethers.Interface(CHESS_V2_FACTORY_ABI);
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
  return CUSTOM_ERROR_SELECTORS[selector] || null;
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
  if (nestedMessage) return nestedMessage;
  return error?.shortMessage || error?.message || fallback;
}
