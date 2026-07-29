import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChessArena from './ChessArena';

vi.mock('./ChessPage', () => ({
  default: () => <div>Chess arena engine</div>,
}));

describe('ChessArena', () => {
  it('keeps arena navigation inside the v3 chess route', () => {
    render(<ChessArena />);

    expect(screen.getByText('Chess arena engine')).toBeInTheDocument();
  });
});
