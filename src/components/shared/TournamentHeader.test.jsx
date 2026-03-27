import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TournamentHeader from './TournamentHeader';

const baseProps = {
  gameType: 'tictactoe',
  tierId: 0,
  instanceId: 0,
  status: 0,
  currentRound: 0,
  playerCount: 4,
  enrolledCount: 4,
  prizePool: 1000000000000000000n,
  enrolledPlayers: [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
  ],
  syncDots: 1,
  account: '0x1111111111111111111111111111111111111111',
  onBack: vi.fn(),
};

describe('TournamentHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  it('hides the share section while a tournament is in progress', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={1}
      />
    );

    expect(screen.queryByText('Invite a Friend')).not.toBeInTheDocument();
    expect(screen.queryByText('Share results')).not.toBeInTheDocument();
  });

  it('keeps the invite section for enrolling tournaments', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={0}
      />
    );

    expect(screen.getByText('Invite a Friend')).toBeInTheDocument();
  });

  it('shows completed resolution text and relabels sharing for finished tournaments', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={2}
        winner="0x1234567890abcdef1234567890abcdef12345678"
        completionReason={1}
      />
    );

    expect(screen.getByText('Share results')).toBeInTheDocument();
    expect(screen.getByText('Resolution')).toBeInTheDocument();
    expect(screen.getByText(/0x1234\.\.\.5678/)).toBeInTheDocument();
    expect(screen.getByText(/wins by timeout \(ML1\)/i)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Winner awarded 1.00000 ETH')).toBeInTheDocument();
  });

  it('shows detailed prize and raffle resolution values when provided', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={2}
        winner="0x1234567890abcdef1234567890abcdef12345678"
        completionReason={1}
        prizeAwarded={800000000000000000n}
        prizeRecipient="0x1234567890abcdef1234567890abcdef12345678"
        raffleAwarded={200000000000000000n}
        raffleRecipient="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
      />
    );

    expect(screen.getByText('Payouts')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent?.trim() === 'Prize')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent?.trim() === 'Raffle')).toBeInTheDocument();
    expect(screen.getByText('0.80000 ETH')).toBeInTheDocument();
    expect(screen.getByText('0.20000 ETH')).toBeInTheDocument();
    expect(screen.getByText(/0x1234\.\.\.5678/)).toBeInTheDocument();
    expect(screen.getByText(/0xabcd\.\.\.abcd/i)).toBeInTheDocument();
    expect(screen.queryByText('Resolution')).not.toBeInTheDocument();
    expect(screen.queryByText(/wins by timeout \(ML1\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText((_, element) => element?.textContent === 'Winner awarded 1.00000 ETH')).not.toBeInTheDocument();
  });
});
