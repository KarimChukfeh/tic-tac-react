import { ethers } from 'ethers';
import ConnectFourFactoryABIData from '../ABIs/ConnectFourFactory-ABI.json';
import LocalhostFactoryData from '../ABIs/localhost-connectfour-factory.json';
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
  gameAbiData: ConnectFourFactoryABIData,
  localhostFactoryData: LocalhostFactoryData,
  factoryName: 'ConnectFourFactory',
});

export const PLAYER_PROFILE_ABI = sharedContracts.PLAYER_PROFILE_ABI;
export const PLAYER_REGISTRY_ABI = sharedContracts.PLAYER_REGISTRY_ABI;
export const PLAYER_REGISTRY_ADDRESS = sharedContracts.PLAYER_REGISTRY_ADDRESS;
export const CONNECTFOUR_DEPLOYMENT = sharedContracts.deployment;
export const CONNECTFOUR_FACTORY_ADDRESS = sharedContracts.FACTORY_ADDRESS;
export const CONNECTFOUR_FACTORY_ABI = sharedContracts.FACTORY_ABI;
export const CONNECTFOUR_INSTANCE_ABI = sharedContracts.INSTANCE_ABI;
export const CONNECTFOUR_IMPLEMENTATION_ADDRESS = sharedContracts.IMPLEMENTATION_ADDRESS;
export const CONNECTFOUR_FACTORY_ADDRESS_CANDIDATES = sharedContracts.FACTORY_ADDRESS_CANDIDATES;

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
    matchTimePerPlayer: 300,
    timeIncrementPerMove: 30,
    enrollmentWindow: 600,
  },
  32: {
    matchTimePerPlayer: 300,
    timeIncrementPerMove: 30,
    enrollmentWindow: 1800,
  },
};

const CONNECTFOUR_ASCII_MOVES_PATTERN = /^\s*[0-6](?:\s*,\s*[0-6])*\s*$/;

export function getFactoryContract(runner, address = CONNECTFOUR_FACTORY_ADDRESS) {
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
