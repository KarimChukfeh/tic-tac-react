import { describe, expect, it } from 'vitest';
import { resolveChessBoardState, resolveFlatBoard } from './matchBoardState';

describe('matchBoardState', () => {
  it('keeps the previous flat board when the latest board fetch fails', () => {
    expect(resolveFlatBoard(null, [1, 2, 0, 0], 4)).toEqual([1, 2, 0, 0]);
  });

  it('fills missing flat board cells from the previous board', () => {
    expect(resolveFlatBoard([1, null, 2], [0, 2, 0, 1], 4)).toEqual([1, 2, 2, 1]);
  });

  it('keeps the previous chess packed board and state when the latest fetch fails', () => {
    const result = resolveChessBoardState(null, {
      packedBoard: 123n,
      packedState: 456n,
    });

    expect(result).toEqual({
      packedBoard: 123n,
      packedState: 456n,
    });
  });

  it('uses fresh chess packed values when they are available', () => {
    const result = resolveChessBoardState([789n, 321n], {
      packedBoard: 123n,
      packedState: 456n,
    });

    expect(result).toEqual({
      packedBoard: 789n,
      packedState: 321n,
    });
  });
});
