import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import V2GameLobbyIntro from './V2GameLobbyIntro';

describe('V2GameLobbyIntro', () => {
  it('renders the arena Arbitrum helper as a full-width action below both primary CTAs', () => {
    render(
      <V2GameLobbyIntro
        onConnectWallet={vi.fn()}
        wideArbitrumCta
        unauthenticatedActions={<button type="button">Play Demo</button>}
      />,
    );

    const primaryActions = screen.getByRole('button', { name: 'Play Demo' }).closest('.v2-lobby-primary-actions');
    const connectWallet = screen.getByRole('button', { name: 'Connect Wallet' });
    const whyArbitrum = screen.getByRole('button', { name: 'Why Arbitrum?' });

    expect(primaryActions).toContainElement(connectWallet);
    expect(primaryActions).not.toContainElement(whyArbitrum);
    expect(whyArbitrum).toHaveClass('v2-why-arbitrum');

    fireEvent.click(whyArbitrum);
    expect(screen.getByRole('link', { name: 'Arbitrum One' })).toHaveAttribute('href', 'https://arbitrum.io');
  });
});
