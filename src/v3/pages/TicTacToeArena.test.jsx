import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TicTacToeArena from './TicTacToeArena';

vi.mock('./TicTacToeV2', () => ({
  default: ({ routeBase }) => (
    <div data-route-base={routeBase}>
      Tic Tac Toe arena engine
    </div>
  ),
}));

describe('TicTacToeArena', () => {
  it('keeps arena navigation on the canonical tictactoe route', () => {
    render(<TicTacToeArena />);

    const engine = screen.getByText('Tic Tac Toe arena engine');
    expect(engine).toHaveAttribute('data-route-base', '/tictactoe');
  });
});
