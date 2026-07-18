import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingReimagined from './LandingReimagined';

vi.mock('./components/shared/V2ContractsTable', () => ({
  default: () => <div>Verified contract deployments</div>,
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingReimagined />
    </MemoryRouter>,
  );
}

describe('LandingReimagined', () => {
  it('keeps the protocol content and all three game destinations', () => {
    renderLanding();

    expect(screen.getByRole('heading', { name: 'Bring your game. Leave with the pot.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play Tic Tac Toe' })).toHaveAttribute('href', '/tictactoe');
    expect(screen.getByRole('link', { name: 'Play Connect Four' })).toHaveAttribute('href', '/connect4');
    expect(screen.getByRole('link', { name: 'Play Chess' })).toHaveAttribute('href', '/chess');
    expect(screen.getByRole('heading', { name: 'Fully On-Chain' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anti-Stall Protection' })).toBeInTheDocument();
  });

  it('reveals verified contract deployments from the footer', async () => {
    const user = userEvent.setup();
    renderLanding();

    const contractsButton = screen.getByRole('button', { name: 'Contracts' });
    expect(contractsButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(contractsButton);

    expect(contractsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Verified contract deployments')).toBeInTheDocument();
  });
});
