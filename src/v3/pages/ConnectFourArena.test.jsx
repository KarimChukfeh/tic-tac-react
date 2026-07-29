import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConnectFourArena from './ConnectFourArena';

vi.mock('./ConnectFourPage', () => ({
  default: () => <div>Connect Four arena engine</div>,
}));

describe('ConnectFourArena', () => {
  it('keeps arena navigation inside the v3 connect4 route', () => {
    render(<ConnectFourArena />);

    expect(screen.getByText('Connect Four arena engine')).toBeInTheDocument();
  });
});
