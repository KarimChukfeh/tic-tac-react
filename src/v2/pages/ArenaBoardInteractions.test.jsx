import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChessBoard } from './ChessV2';
import { ConnectFourBoard } from './ConnectFourV2';

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

  it('marks player and opponent move cells for high-contrast 3D styling', () => {
    const board = Array.from({ length: 64 }, () => ({ pieceType: 0, color: 0 }));
    board[0] = { pieceType: 4, color: 2 };

    const { container } = render(
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
        arenaStyle
      />,
    );

    const fromCell = container.querySelector('[data-last-from="true"]');
    const toCell = container.querySelector('[data-last-to="true"]');

    expect(fromCell).toHaveAttribute('data-last-owner', 'opponent');
    expect(toCell).toHaveAttribute('data-last-owner', 'opponent');
    expect(toCell).toHaveAttribute('data-piece', 'black-rook');
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
});
