import { describe, expect, it, vi } from 'vitest';
import {
  createChessMove,
  createConnectFourMove,
  createTicTacToeMove,
  DuplicateMoveIntentError,
  formatSessionMoveFailure,
  V3MoveController,
} from './moveController';

describe('V3 move controller', () => {
  it('submits a Tic-Tac-Toe session move and reconciles after inclusion', async () => {
    const observer = vi.fn();
    const controller = new V3MoveController({ observer });
    const states = [];
    const sessionService = {
      submitMove: vi.fn().mockResolvedValue({ userOperationHash: '0xabc' }),
    };
    const reconcile = vi.fn().mockResolvedValue({ board: [1, 0, 0] });
    const move = createTicTacToeMove({ roundNumber: 1, matchNumber: 2, cellIndex: 0 });
    const result = await controller.submitSession({
      sessionService,
      identity: {},
      move,
      reconcile,
      onState: (state) => states.push(state.status),
    });

    expect(sessionService.submitMove).toHaveBeenCalledWith({}, move);
    expect(states).toEqual(['submitting', 'included', 'success']);
    expect(result.reconciled.board[0]).toBe(1);
    expect(observer).toHaveBeenLastCalledWith(expect.objectContaining({
      event: 'move_included',
      mode: 'session',
    }));
  });

  it('prevents duplicate intents while a nonce is pending', async () => {
    const controller = new V3MoveController();
    let release;
    const first = controller.submitDirect({
      submit: () => new Promise((resolve) => { release = resolve; }),
      reconcile: vi.fn(),
    });
    await expect(controller.submitDirect({
      submit: vi.fn(),
      reconcile: vi.fn(),
    })).rejects.toBeInstanceOf(DuplicateMoveIntentError);
    release({});
    await first;
  });

  it('never switches to direct primary automatically after session failure', async () => {
    const observer = vi.fn();
    const controller = new V3MoveController({ observer });
    const direct = vi.fn();
    await expect(controller.submitSession({
      sessionService: { submitMove: vi.fn().mockRejectedValue(new Error('bundlers down')) },
      identity: {},
      move: {},
      reconcile: vi.fn(),
    })).rejects.toThrow('bundlers down');
    expect(direct).not.toHaveBeenCalled();
    expect(observer).toHaveBeenLastCalledWith(expect.objectContaining({
      event: 'move_failed',
      fallback: 'explicit-only',
    }));
  });

  it('uses one explicit no-resubmission error across games', () => {
    expect(formatSessionMoveFailure({ message: 'Bundlers unavailable.' })).toBe(
      'Bundlers unavailable. Your move was not resubmitted. Select “Use wallet for moves” to retry explicitly.',
    );
  });

  it('normalizes Connect Four columns for the shared session client', () => {
    expect(createConnectFourMove({
      roundNumber: '3',
      matchNumber: 4,
      column: 6,
    })).toEqual({
      game: 'connectfour',
      roundNumber: 3,
      matchNumber: 4,
      column: 6,
    });

    expect(() => createConnectFourMove({
      roundNumber: 0,
      matchNumber: 0,
      column: 7,
    })).toThrow('column must be an integer between 0 and 6');
  });

  it('normalizes Chess squares and promotion pieces', () => {
    expect(createChessMove({
      roundNumber: 5,
      matchNumber: 6,
      fromSquare: 12,
      toSquare: 28,
      promotionPiece: 5,
    })).toEqual({
      game: 'chess',
      roundNumber: 5,
      matchNumber: 6,
      fromSquare: 12,
      toSquare: 28,
      promotionPiece: 5,
    });

    expect(() => createChessMove({
      roundNumber: 0,
      matchNumber: 0,
      fromSquare: 64,
      toSquare: 0,
    })).toThrow('fromSquare must be an integer between 0 and 63');
    expect(() => createChessMove({
      roundNumber: 0,
      matchNumber: 0,
      fromSquare: 8,
      toSquare: 0,
      promotionPiece: 1,
    })).toThrow('promotionPiece must be 0 or a piece between 2 and 5');
  });
});
