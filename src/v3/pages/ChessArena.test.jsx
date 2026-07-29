import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChessArena from './ChessArena';

vi.mock('./ChessV2', () => ({
  default: ({ routeBase }) => (
    <div data-route-base={routeBase}>
      Chess arena engine
    </div>
  ),
}));

describe('ChessArena', () => {
  it('keeps arena navigation on the canonical chess route', () => {
    render(<ChessArena />);

    const engine = screen.getByText('Chess arena engine');
    expect(engine).toHaveAttribute('data-route-base', '/chess');
  });
});
