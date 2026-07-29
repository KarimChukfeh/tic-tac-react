import { ethers } from 'ethers';
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
  gameKey: 'chess',
});

export const PLAYER_PROFILE_ABI = sharedContracts.PLAYER_PROFILE_ABI;
export const PLAYER_REGISTRY_ABI = sharedContracts.PLAYER_REGISTRY_ABI;
export const PLAYER_REGISTRY_ADDRESS = sharedContracts.PLAYER_REGISTRY_ADDRESS;
export const CHESS_DEPLOYMENT = sharedContracts.deployment;
export const CHESS_FACTORY_ADDRESS = sharedContracts.FACTORY_ADDRESS;
export const CHESS_FACTORY_ABI = sharedContracts.FACTORY_ABI;
export const CHESS_INSTANCE_ABI = sharedContracts.INSTANCE_ABI;
export const CHESS_IMPLEMENTATION_ADDRESS = sharedContracts.IMPLEMENTATION_ADDRESS;
export const CHESS_FACTORY_ADDRESS_CANDIDATES = sharedContracts.FACTORY_ADDRESS_CANDIDATES;

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
    matchTimePerPlayer: 600,
    timeIncrementPerMove: 30,
    enrollmentWindow: 1800,
  },
  32: {
    matchTimePerPlayer: 600,
    timeIncrementPerMove: 30,
    enrollmentWindow: 1800,
  },
};

export function getFactoryContract(runner, address = CHESS_FACTORY_ADDRESS) {
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
  return getSharedDefaultTimeouts(DEFAULT_TIMEOUTS_BY_PLAYER_COUNT, 4, playerCount);
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
