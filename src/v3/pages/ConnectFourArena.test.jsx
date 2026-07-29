import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConnectFourArena from './ConnectFourArena';

vi.mock('./ConnectFourV2', () => ({
  default: ({ routeBase }) => (
    <div data-route-base={routeBase}>
      Connect Four arena engine
    </div>
  ),
}));

describe('ConnectFourArena', () => {
  it('keeps arena navigation on the canonical connect4 route', () => {
    render(<ConnectFourArena />);

    const engine = screen.getByText('Connect Four arena engine');
    expect(engine).toHaveAttribute('data-route-base', '/connect4');
  });
});
