import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChessBoard } from './ChessPage';
import { ConnectFourBoard } from './ConnectFourPage';

const PLAYER_ONE = '0x1111111111111111111111111111111111111111';
const PLAYER_TWO = '0x2222222222222222222222222222222222222222';

describe('arena board interaction layers', () => {
  it('keeps Chess square selection on native buttons', () => {
    const board = Array.from({ length: 64 }, () => ({ pieceType: 0, color: 0 }));
    board[0] = { pieceType: 4, color: 1 };

    render(
      <ChessBoard
        board={board}
        onMove={vi.fn()}
        currentTurn={PLAYER_ONE}
        account={PLAYER_ONE}
        player1={PLAYER_ONE}
        player2={PLAYER_TWO}
        firstPlayer={PLAYER_ONE}
        matchStatus={1}
        loading={false}
        whiteInCheck={false}
        blackInCheck={false}
        arenaStyle
      />,
    );

    const square = screen.getByRole('button', { name: 'a1, White rook' });
    expect(square).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(square);
    expect(square).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the latest move deeply and the previous move with faded styling', () => {
    const board = Array.from({ length: 64 }, () => ({ pieceType: 0, color: 0 }));
    board[0] = { pieceType: 4, color: 2 };
    board[1] = { pieceType: 2, color: 1 };

    const { container, rerender } = render(
      <ChessBoard
        board={board}
        onMove={vi.fn()}
        currentTurn={PLAYER_ONE}
        account={PLAYER_ONE}
        player1={PLAYER_ONE}
        player2={PLAYER_TWO}
        firstPlayer={PLAYER_ONE}
        matchStatus={1}
        loading={false}
        whiteInCheck={false}
        blackInCheck={false}
        lastMove={{ from: 8, to: 0, isMyMove: false }}
        secondLastMove={{ from: 9, to: 1, isMyMove: true }}
        arenaStyle
        effectsEnabled
      />,
    );

    const fromCell = container.querySelector('[data-last-from="true"]');
    const toCell = container.querySelector('[data-last-to="true"]');
    const previousFromCell = container.querySelector('[data-previous-from="true"]');
    const previousToCell = container.querySelector('[data-previous-to="true"]');

    expect(fromCell).toHaveAttribute('data-last-owner', 'opponent');
    expect(fromCell).toHaveAttribute('data-move-depth', 'latest');
    expect(toCell).toHaveAttribute('data-last-owner', 'opponent');
    expect(toCell).toHaveAttribute('data-piece', 'black-rook');
    expect(toCell.style.background).toContain('0.72');
    expect(previousFromCell).toHaveAttribute('data-previous-owner', 'player');
    expect(previousFromCell).toHaveAttribute('data-move-depth', 'previous');
    expect(previousFromCell.style.background).toContain('0.09');
    expect(previousToCell).toHaveAttribute('data-previous-owner', 'player');
    expect(previousToCell).toHaveAttribute('data-piece', 'white-knight');
    expect(previousToCell.style.background).toContain('0.15');

    rerender(
      <ChessBoard
        board={board}
        onMove={vi.fn()}
        currentTurn={PLAYER_ONE}
        account={PLAYER_ONE}
        player1={PLAYER_ONE}
        player2={PLAYER_TWO}
        firstPlayer={PLAYER_ONE}
        matchStatus={1}
        loading={false}
        whiteInCheck={false}
        blackInCheck={false}
        lastMove={{ from: 8, to: 0, isMyMove: false }}
        secondLastMove={{ from: 9, to: 1, isMyMove: true }}
        arenaStyle
        effectsEnabled={false}
      />,
    );

    expect(container.querySelectorAll('[data-move-depth="latest"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-move-depth="previous"]')).toHaveLength(2);
  });

  it('animates the moved Chess piece only while effects are enabled', () => {
    const board = Array.from({ length: 64 }, () => ({ pieceType: 0, color: 0 }));
    board[0] = { pieceType: 4, color: 2 };
    const props = {
      board,
      onMove: vi.fn(),
      currentTurn: PLAYER_ONE,
      account: PLAYER_ONE,
      player1: PLAYER_ONE,
      player2: PLAYER_TWO,
      firstPlayer: PLAYER_ONE,
      matchStatus: 1,
      loading: false,
      whiteInCheck: false,
      blackInCheck: false,
      lastMove: { from: 8, to: 0, isMyMove: false },
      arenaStyle: true,
    };

    const { container, rerender } = render(<ChessBoard {...props} effectsEnabled />);
    const movedPiece = container.querySelector('[data-last-to="true"] > img:not(.absolute)');

    expect(movedPiece).toHaveClass('arena-chess-piece-move-in');
    expect(movedPiece.style.getPropertyValue('--arena-move-y')).not.toBe('');

    rerender(<ChessBoard {...props} effectsEnabled={false} />);
    expect(container.querySelector('[data-last-to="true"] > img:not(.absolute)')).not.toHaveClass('arena-chess-piece-move-in');
  });

  it('keeps Connect Four moves on native column buttons', () => {
    const onColumnClick = vi.fn();

    render(
      <ConnectFourBoard
        board={Array(42).fill(0)}
        onColumnClick={onColumnClick}
        currentTurn={PLAYER_ONE}
        account={PLAYER_ONE}
        player1={PLAYER_ONE}
        player2={PLAYER_TWO}
        firstPlayer={PLAYER_ONE}
        matchStatus={1}
        loading={false}
        arenaStyle
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Drop disc in column 4' }));
    expect(onColumnClick).toHaveBeenCalledWith(3);
  });

  it('drops the latest Connect Four disc only while effects are enabled', () => {
    const board = Array(42).fill(0);
    board[38] = 1;
    const props = {
      board,
      onColumnClick: vi.fn(),
      currentTurn: PLAYER_TWO,
      account: PLAYER_ONE,
      player1: PLAYER_ONE,
      player2: PLAYER_TWO,
      firstPlayer: PLAYER_ONE,
      matchStatus: 1,
      loading: false,
      lastColumn: 3,
      arenaStyle: true,
    };

    const { container, rerender } = render(
      <ConnectFourBoard {...props} effectsEnabled />,
    );
    const droppedDisc = container.querySelector('[data-column="3"][data-filled="true"] .arena-connect-board__disc');

    expect(droppedDisc).toHaveClass('arena-connect-board__disc--drop');
    expect(droppedDisc.style.getPropertyValue('--arena-connect-drop-y')).not.toBe('');

    rerender(<ConnectFourBoard {...props} effectsEnabled={false} />);
    expect(container.querySelector('[data-column="3"][data-filled="true"] .arena-connect-board__disc')).not.toHaveClass('arena-connect-board__disc--drop');
  });
});
