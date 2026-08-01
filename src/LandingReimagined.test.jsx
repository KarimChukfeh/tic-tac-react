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
    expect(screen.getByRole('link', { name: 'Play Tic Tac Toe' })).toHaveAttribute('href', '/v3/tictactoe');
    expect(screen.getByRole('link', { name: 'Play Connect Four' })).toHaveAttribute('href', '/v3/connect4');
    expect(screen.getByRole('link', { name: 'Play Chess' })).toHaveAttribute('href', '/v3/chess');
    expect(screen.getByRole('link', { name: 'Full manual' })).toHaveAttribute('href', '/manual');
    expect(screen.getByRole('heading', { name: 'Fully On-Chain' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anti-Stall Protection' })).toBeInTheDocument();
    expect(screen.getByText(/Powered by/)).toHaveTextContent('Powered by ETour Protocol');
    expect(screen.getByText('No company needed. No trust required. No servers to shutdown.')).toBeInTheDocument();
    expect(screen.queryByText('ETOUR / ON-CHAIN SINCE BLOCK ONE')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RW3 Manifesto' })).toHaveAttribute('href', 'https://reclaimweb3.com');
    expect(screen.queryByRole('link', { name: 'ETour home' })).not.toBeInTheDocument();
    expect(screen.queryByText('Open-source perpetual tournament infrastructure on Arbitrum')).not.toBeInTheDocument();
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
