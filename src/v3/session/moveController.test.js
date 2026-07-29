import { describe, expect, it, vi } from 'vitest';
import {
  createTicTacToeMove,
  DuplicateMoveIntentError,
  V3MoveController,
} from './moveController';

describe('V3 move controller', () => {
  it('submits a Tic-Tac-Toe session move and reconciles after inclusion', async () => {
    const controller = new V3MoveController();
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
    const controller = new V3MoveController();
    const direct = vi.fn();
    await expect(controller.submitSession({
      sessionService: { submitMove: vi.fn().mockRejectedValue(new Error('bundlers down')) },
      identity: {},
      move: {},
      reconcile: vi.fn(),
    })).rejects.toThrow('bundlers down');
    expect(direct).not.toHaveBeenCalled();
  });
});
