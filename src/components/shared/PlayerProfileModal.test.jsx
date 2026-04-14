import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerProfileModal from './PlayerProfileModal';

vi.mock('../../v2/hooks/usePlayerProfile', () => ({
  usePlayerProfile: () => ({
    profileAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    stats: { totalPlayed: 4, totalWins: 3, totalLosses: 1, totalNetEarnings: 0n },
    enrollments: [
      {
        instance: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        playerCount: 4,
        entryFee: 10000000000000000n,
        enrolledAt: 1710000000,
        concluded: true,
        won: true,
        payout: 20000000000000000n,
        payoutReason: 0,
        tournamentResolutionReason: 0,
        instanceStatus: 2,
      },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../v2/hooks/useConnectFourPlayerProfile', () => ({
  useConnectFourPlayerProfile: () => ({
    profileAddress: null,
    stats: null,
    enrollments: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../v2/hooks/useChessPlayerProfile', () => ({
  useChessPlayerProfile: () => ({
    profileAddress: null,
    stats: null,
    enrollments: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../v2/hooks/useV2MatchHistory', () => ({
  useV2MatchHistory: () => ({
    matches: [
      {
        matchId: '0-0xcccccccccccccccccccccccccccccccccccccccc-0-0',
        instanceAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
        roundNumber: 0,
        playerCount: 4,
        player1: '0x1111111111111111111111111111111111111111',
        player2: '0x2222222222222222222222222222222222222222',
        winner: '0x1111111111111111111111111111111111111111',
        reason: 0,
        completionReason: 0,
        matchCompletionReason: 0,
        startTime: 1710000000,
        endTime: 1710000600,
      },
    ],
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../v2/hooks/useConnectFourV2MatchHistory', () => ({
  useConnectFourV2MatchHistory: () => ({
    matches: [],
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../v2/hooks/useChessV2MatchHistory', () => ({
  useChessV2MatchHistory: () => ({
    matches: [],
    loading: false,
    refetch: vi.fn(),
  }),
}));

describe('PlayerProfileModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders only the tournaments tab when parent rerenders with a new onClose callback', () => {
    const baseProps = {
      isOpen: true,
      gameType: 'tictactoe',
      targetAddress: '0x1111111111111111111111111111111111111111',
      factoryContract: {},
      runner: {},
      onViewTournament: vi.fn(),
      reasonLabelMode: 'v2',
    };

    const { rerender } = render(
      <PlayerProfileModal
        {...baseProps}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Enrollments')).toBeInTheDocument();
    expect(screen.queryByText('Matches')).not.toBeInTheDocument();
    expect(screen.getByText('4 Players')).toBeInTheDocument();

    rerender(
      <PlayerProfileModal
        {...baseProps}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Enrollments')).toBeInTheDocument();
    expect(screen.queryByText('Matches')).not.toBeInTheDocument();
    expect(screen.getByText('4 Players')).toBeInTheDocument();
  });

  it('renders the wallet pill as the explorer link and shows total payouts inline in the header', () => {
    render(
      <PlayerProfileModal
        isOpen
        onClose={vi.fn()}
        gameType="tictactoe"
        targetAddress="0x1111111111111111111111111111111111111111"
        factoryContract={{}}
        runner={{}}
        onViewTournament={vi.fn()}
        reasonLabelMode="v2"
      />
    );

    const walletLink = screen.getByRole('link', { name: /0x1111\.\.\.1111/i });
    expect(walletLink).toHaveAttribute('href', 'https://arbiscan.io/address/0x1111111111111111111111111111111111111111');
    expect(screen.queryByRole('link', { name: 'Wallet' })).not.toBeInTheDocument();
    expect(screen.getByText('Player:')).toBeInTheDocument();
    expect(screen.getByText('Wins:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Payouts:')).toBeInTheDocument();
    expect(screen.queryByText(/Profile Contract/i)).not.toBeInTheDocument();
    expect(screen.getByText('0.0200 ETH')).toBeInTheDocument();
    expect(screen.queryByText('Total Payouts')).not.toBeInTheDocument();
  });
});
