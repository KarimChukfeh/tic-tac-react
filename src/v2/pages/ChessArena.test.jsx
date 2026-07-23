import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChessArena from './ChessArena';

vi.mock('./ChessV2', () => ({
  default: ({ experience, routeBase }) => (
    <div data-experience={experience} data-route-base={routeBase}>
      Chess arena engine
    </div>
  ),
}));

describe('ChessArena', () => {
  it('keeps arena navigation on the chess2 route', () => {
    render(<ChessArena />);

    const engine = screen.getByText('Chess arena engine');
    expect(engine).toHaveAttribute('data-experience', 'arena');
    expect(engine).toHaveAttribute('data-route-base', '/chess2');
  });
});
