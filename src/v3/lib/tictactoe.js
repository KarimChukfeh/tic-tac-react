import { ethers } from 'ethers';
import TicTacToeFactoryABIData from '../ABIs/TicTacToeFactory-ABI.json';
import LocalhostFactoryData from '../ABIs/localhost-tictac-factory.json';
import {
  ZERO_ADDRESS,
  createReadableErrorGetter,
  createSharedGameContracts,
  formatEth,
  getDefaultTimeouts as getSharedDefaultTimeouts,
  getRoundLabel as getSharedRoundLabel,
  getTournamentTypeLabel as getSharedTournamentTypeLabel,
  matchStatusLabel as getSharedMatchStatusLabel,
  normalizeInstanceSnapshot,
  tournamentStatusLabel as getSharedTournamentStatusLabel,
} from './gameShared';

export { ZERO_ADDRESS, formatEth, normalizeInstanceSnapshot };

const sharedContracts = createSharedGameContracts({
  gameAbiData: TicTacToeFactoryABIData,
  localhostFactoryData: LocalhostFactoryData,
  factoryName: 'TicTacToeFactory',
});

export const PLAYER_PROFILE_ABI = sharedContracts.PLAYER_PROFILE_ABI;
export const PLAYER_REGISTRY_ABI = sharedContracts.PLAYER_REGISTRY_ABI;
export const PLAYER_REGISTRY_ADDRESS = sharedContracts.PLAYER_REGISTRY_ADDRESS;
export const TICTACTOE_DEPLOYMENT = sharedContracts.deployment;
export const TICTACTOE_FACTORY_ADDRESS = sharedContracts.FACTORY_ADDRESS;
export const TICTACTOE_FACTORY_ABI = sharedContracts.FACTORY_ABI;
export const TICTACTOE_INSTANCE_ABI = sharedContracts.INSTANCE_ABI;
export const TICTACTOE_IMPLEMENTATION_ADDRESS = sharedContracts.IMPLEMENTATION_ADDRESS;
export const TICTACTOE_FACTORY_ADDRESS_CANDIDATES = sharedContracts.FACTORY_ADDRESS_CANDIDATES;

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

const TICTACTOE_ASCII_MOVES_PATTERN = /^\s*[0-8](?:\s*,\s*[0-8])*\s*$/;

export function getFactoryContract(runner, address = TICTACTOE_FACTORY_ADDRESS) {
  return sharedContracts.getFactoryContract(runner, address);
}

export function getInstanceContract(address, runner) {
  return sharedContracts.getInstanceContract(address, runner);
}

export function getPlayerProfileContract(address, runner) {
  return sharedContracts.getPlayerProfileContract(address, runner);
}

export function getPlayerRegistryContract(runner, address = PLAYER_REGISTRY_ADDRESS) {
  return sharedContracts.getPlayerRegistryContract(runner, address);
}

export async function getWritableFactoryContract(browserProvider, readFactory, signer) {
  return await sharedContracts.getWritableFactoryContract(browserProvider, readFactory, signer);
}

export async function getWritableInstanceContract(browserProvider, readFactory, instanceContract) {
  return await sharedContracts.getWritableInstanceContract(browserProvider, readFactory, instanceContract);
}

export async function resolvePlayerProfileAddress(factoryContract, runner, account, registryAddress = PLAYER_REGISTRY_ADDRESS) {
  return sharedContracts.resolvePlayerProfileAddress(factoryContract, runner, account, registryAddress);
}

export function getDefaultTimeouts(playerCount) {
  return getSharedDefaultTimeouts(DEFAULT_TIMEOUTS_BY_PLAYER_COUNT, 8, playerCount);
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
  return getSharedTournamentStatusLabel(status);
}

export function matchStatusLabel(status) {
  return getSharedMatchStatusLabel(status);
}

export function getTournamentTypeLabel(playerCount) {
  return getSharedTournamentTypeLabel(playerCount);
}

export function getRoundLabel(roundIndex, totalRounds) {
  return getSharedRoundLabel(roundIndex, totalRounds);
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
  return sharedContracts.extractInstanceAddressFromReceipt(receipt);
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
  return sharedContracts.resolveCreatedInstanceAddress({
    factory,
    provider,
    creator,
    playerCount,
    entryFeeWei,
    countBefore,
    receipt,
  });
}

export const getReadableError = createReadableErrorGetter();
