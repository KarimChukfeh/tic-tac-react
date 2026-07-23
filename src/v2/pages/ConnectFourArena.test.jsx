import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConnectFourArena from './ConnectFourArena';

vi.mock('./ConnectFourV2', () => ({
  default: ({ experience, routeBase }) => (
    <div data-experience={experience} data-route-base={routeBase}>
      Connect Four arena engine
    </div>
  ),
}));

describe('ConnectFourArena', () => {
  it('keeps arena navigation on the connect42 route', () => {
    render(<ConnectFourArena />);

    const engine = screen.getByText('Connect Four arena engine');
    expect(engine).toHaveAttribute('data-experience', 'arena');
    expect(engine).toHaveAttribute('data-route-base', '/connect42');
  });
});
