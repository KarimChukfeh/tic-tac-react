import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TicTacToeArena from './TicTacToeArena';

vi.mock('./TicTacToeV2', () => ({
  default: ({ experience, routeBase }) => (
    <div data-experience={experience} data-route-base={routeBase}>
      Tic Tac Toe arena engine
    </div>
  ),
}));

describe('TicTacToeArena', () => {
  it('uses the arena experience without leaking navigation to the classic route', () => {
    render(<TicTacToeArena />);

    const engine = screen.getByText('Tic Tac Toe arena engine');
    expect(engine).toHaveAttribute('data-experience', 'arena');
    expect(engine).toHaveAttribute('data-route-base', '/tictactoe2');
  });
});
