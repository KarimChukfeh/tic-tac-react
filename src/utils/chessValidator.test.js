import { describe, expect, it } from 'vitest';
import { boardArrayToPackedBoard, getLegalMovesForSquare, validateMoveWithReason } from './chessValidator';

function createEmptyBoard() {
  return Array.from({ length: 64 }, () => ({ pieceType: 0, color: 0 }));
}

describe('chessValidator legal move generation', () => {
  it('returns only the legal knight moves for the selected square', () => {
    const board = createEmptyBoard();
    board[1] = { pieceType: 2, color: 1 }; // white knight on b1
    board[16] = { pieceType: 1, color: 1 }; // own pawn on a3 blocks that target
    board[18] = { pieceType: 1, color: 2 }; // enemy pawn on c3 is capturable

    const packedBoard = boardArrayToPackedBoard(board);
    const legalMoves = getLegalMovesForSquare(packedBoard, 63n, 1, true);

    expect(legalMoves).toEqual([11, 18]);
    expect(validateMoveWithReason(packedBoard, 63n, 1, 16, true, 0)).toBe('Cannot capture your own piece');
  });

  it('includes promotion squares when a pawn can advance to the back rank', () => {
    const board = createEmptyBoard();
    board[4] = { pieceType: 6, color: 1 }; // white king
    board[60] = { pieceType: 6, color: 2 }; // black king
    board[54] = { pieceType: 1, color: 1 }; // white pawn on g7

    const packedBoard = boardArrayToPackedBoard(board);
    const legalMoves = getLegalMovesForSquare(packedBoard, 63n, 54, true);

    expect(legalMoves).toContain(62);
    expect(validateMoveWithReason(packedBoard, 63n, 54, 62, true, 0)).toBe('Invalid promotion piece');
    expect(validateMoveWithReason(packedBoard, 63n, 54, 62, true, 5)).toBeNull();
  });
});
