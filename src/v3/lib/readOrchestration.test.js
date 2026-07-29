import { describe, expect, it, vi } from 'vitest';
import {
  buildV3MatchKey,
  readV3ActiveMatchState,
  readV3FactoryDashboard,
  readV3TournamentState,
} from './readOrchestration';

function result(value) {
  return { success: true, result: value };
}

describe('V3 read orchestration', () => {
  it('loads factory dashboard values through one shared reader', async () => {
    const factory = {
      MIN_ENTRY_FEE: vi.fn().mockResolvedValue(1n),
      FEE_INCREMENT: vi.fn().mockResolvedValue(2n),
      implementation: vi.fn().mockResolvedValue('0ximplementation'),
    };

    await expect(readV3FactoryDashboard(async () => factory)).resolves.toEqual({
      factory,
      minEntryFee: 1n,
      feeIncrement: 2n,
      implementation: '0ximplementation',
    });
  });

  it('maps tournament and bracket state without exposing game-specific decoding', async () => {
    const instance = {};
    const bracket = {
      totalRounds: 1n,
      matchCounts: [1n],
      completedCounts: [0n],
    };
    const multicall = vi.fn()
      .mockResolvedValueOnce([
        result({ playerCount: 2n }),
        result({ prizePool: 10n }),
        result(['0xplayer']),
        result([10n]),
        result(bracket),
        result({ matchTimePerPlayer: 120n }),
        result(true),
      ])
      .mockResolvedValueOnce([
        result(true),
        result({ player1: '0xplayer' }),
        result({ currentTurn: '0xplayer' }),
        result([0n]),
        result(null),
        result(false),
        result(false),
      ]);
    const mapBracketMatch = vi.fn(({ roundNumber, matchNumber, boardResult }) => ({
      roundNumber,
      matchNumber,
      board: boardResult,
    }));

    const state = await readV3TournamentState({
      address: '0xinstance',
      instance,
      runner: {},
      account: '0xplayer',
      multicall,
      mapTournamentSnapshot: ({ address, enrolled }) => ({ address, enrolled }),
      mapPrizeDistribution: (value) => value,
      mapBracketMatch,
      getRoundLabel: () => 'Finals',
    });

    expect(state).toMatchObject({
      address: '0xinstance',
      enrolled: true,
      payoutEntries: [10n],
      tierId: 0,
      instanceId: 0,
      rounds: [{
        label: 'Finals',
        matches: [{ roundNumber: 0, matchNumber: 0, board: [0n], tierId: 0, instanceId: 0 }],
      }],
    });
    expect(mapBracketMatch).toHaveBeenCalledWith(expect.objectContaining({
      isUserAdvancedForRound: true,
      account: '0xplayer',
    }));
  });

  it('falls back to direct active-match reads when multicall entries fail', async () => {
    const matchInfo = { roundNumber: 1, matchNumber: 2 };
    const matchKey = buildV3MatchKey(1, 2);
    const instance = {
      getMatch: vi.fn().mockResolvedValue({ status: 1n }),
      matches: vi.fn().mockResolvedValue({ currentTurn: '0xplayer' }),
      getBoard: vi.fn().mockRejectedValue(new Error('optional board failure')),
      tierConfig: vi.fn().mockResolvedValue({ matchTimePerPlayer: 120n }),
      getInstanceInfo: vi.fn().mockResolvedValue({ playerCount: 2n }),
      matchTimeouts: vi.fn().mockRejectedValue(new Error('optional timeout failure')),
      isMatchEscL2Available: vi.fn().mockResolvedValue(true),
      isMatchEscL3Available: vi.fn().mockResolvedValue(false),
      isPlayerInAdvancedRound: vi.fn().mockResolvedValue(true),
    };
    const multicall = vi.fn().mockResolvedValue(Array(9).fill({ success: false }));

    const state = await readV3ActiveMatchState({
      instance,
      runner: {},
      account: '0xplayer',
      matchInfo,
      multicall,
    });

    expect(state).toMatchObject({
      matchKey,
      matchData: { status: 1n },
      fullMatch: { currentTurn: '0xplayer' },
      boardResult: null,
      timeoutData: null,
      escL2Available: true,
      escL3Available: false,
      isUserAdvancedForRound: true,
    });
  });

  it('omits account-scoped reads for spectators', async () => {
    const instance = {};
    const multicall = vi.fn().mockResolvedValue([
      result({ status: 2n }),
      result({}),
      result([]),
      result({}),
      result({ playerCount: 2n }),
      result(null),
      result(false),
      result(false),
    ]);

    const state = await readV3ActiveMatchState({
      instance,
      runner: {},
      account: null,
      matchInfo: { roundNumber: 0, matchNumber: 0 },
      multicall,
    });

    expect(multicall.mock.calls[0][0]).toHaveLength(8);
    expect(state.isUserAdvancedForRound).toBe(false);
  });
});
