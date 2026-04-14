import { describe, expect, it } from 'vitest';
import { getDefaultTimeouts as getTicTacToeDefaultTimeouts, PLAYER_COUNT_OPTIONS as ticTacToePlayerCounts } from './tictactoe';
import { getDefaultTimeouts as getConnectFourDefaultTimeouts, PLAYER_COUNT_OPTIONS as connectFourPlayerCounts } from './connectfour';
import { getDefaultTimeouts as getChessDefaultTimeouts, PLAYER_COUNT_OPTIONS as chessPlayerCounts } from './chess';

describe('v2 create-form default match times', () => {
  it('keeps TicTacToe at 2 minutes per player for every supported lobby size', () => {
    for (const playerCount of ticTacToePlayerCounts) {
      expect(getTicTacToeDefaultTimeouts(playerCount).matchTimePerPlayer).toBe(120);
    }
  });

  it('keeps Connect Four at 5 minutes per player for every supported lobby size', () => {
    for (const playerCount of connectFourPlayerCounts) {
      expect(getConnectFourDefaultTimeouts(playerCount).matchTimePerPlayer).toBe(300);
    }
  });

  it('keeps Chess at 10 minutes per player for every supported lobby size', () => {
    for (const playerCount of chessPlayerCounts) {
      expect(getChessDefaultTimeouts(playerCount).matchTimePerPlayer).toBe(600);
    }
  });
});
