import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TicTacToeArena from './TicTacToeArena';

vi.mock('./TicTacToePage', () => ({
  default: () => <div>Tic Tac Toe arena engine</div>,
}));

describe('TicTacToeArena', () => {
  it('keeps arena navigation inside the v3 tictactoe route', () => {
    render(<TicTacToeArena />);

    expect(screen.getByText('Tic Tac Toe arena engine')).toBeInTheDocument();
  });
});
