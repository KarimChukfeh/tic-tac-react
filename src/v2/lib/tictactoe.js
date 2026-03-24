import { ethers } from 'ethers';
import TicTacToeV2Bundle from '../../TicTacToe-v2-ABI.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const TICTACTOE_V2_FACTORY_ADDRESS = TicTacToeV2Bundle.factory.address;
export const TICTACTOE_V2_FACTORY_ABI = TicTacToeV2Bundle.factory.abi;
export const TICTACTOE_V2_INSTANCE_ABI = TicTacToeV2Bundle.instance.abi;
export const TICTACTOE_V2_IMPLEMENTATION_ADDRESS = TicTacToeV2Bundle.instance.address;

export const PLAYER_COUNT_OPTIONS = [2, 4, 8, 16, 32, 64];

export const DEFAULT_TIMEOUTS_BY_PLAYER_COUNT = {
  2: {
    matchTimePerPlayer: 120,
    timeIncrementPerMove: 15,
    matchLevel2Delay: 120,
    matchLevel3Delay: 240,
    enrollmentWindow: 300,
    enrollmentLevel2Delay: 300,
  },
  4: {
    matchTimePerPlayer: 90,
    timeIncrementPerMove: 15,
    matchLevel2Delay: 120,
    matchLevel3Delay: 240,
    enrollmentWindow: 600,
    enrollmentLevel2Delay: 300,
  },
  8: {
    matchTimePerPlayer: 90,
    timeIncrementPerMove: 15,
    matchLevel2Delay: 120,
    matchLevel3Delay: 240,
    enrollmentWindow: 900,
    enrollmentLevel2Delay: 300,
  },
  16: {
    matchTimePerPlayer: 90,
    timeIncrementPerMove: 15,
    matchLevel2Delay: 120,
    matchLevel3Delay: 240,
    enrollmentWindow: 1200,
    enrollmentLevel2Delay: 300,
  },
  32: {
    matchTimePerPlayer: 90,
    timeIncrementPerMove: 15,
    matchLevel2Delay: 120,
    matchLevel3Delay: 240,
    enrollmentWindow: 1800,
    enrollmentLevel2Delay: 300,
  },
  64: {
    matchTimePerPlayer: 90,
    timeIncrementPerMove: 15,
    matchLevel2Delay: 120,
    matchLevel3Delay: 240,
    enrollmentWindow: 2400,
    enrollmentLevel2Delay: 300,
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

export function getFactoryContract(runner) {
  return new ethers.Contract(
    TICTACTOE_V2_FACTORY_ADDRESS,
    TICTACTOE_V2_FACTORY_ABI,
    runner
  );
}

export function getInstanceContract(address, runner) {
  return new ethers.Contract(address, TICTACTOE_V2_INSTANCE_ABI, runner);
}

export function getDefaultTimeouts(playerCount) {
  return {
    ...(DEFAULT_TIMEOUTS_BY_PLAYER_COUNT[playerCount] || DEFAULT_TIMEOUTS_BY_PLAYER_COUNT[8]),
  };
}

export function buildTimeoutConfig(values) {
  return {
    matchTimePerPlayer: BigInt(values.matchTimePerPlayer),
    timeIncrementPerMove: BigInt(values.timeIncrementPerMove),
    matchLevel2Delay: BigInt(values.matchLevel2Delay),
    matchLevel3Delay: BigInt(values.matchLevel3Delay),
    enrollmentWindow: BigInt(values.enrollmentWindow),
    enrollmentLevel2Delay: BigInt(values.enrollmentLevel2Delay),
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
    completionReason: Number(info.completionReason),
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
  return {
    roundNumber,
    matchNumber,
    player1: matchData.player1,
    player2: matchData.player2,
    winner: matchData.matchWinner,
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
