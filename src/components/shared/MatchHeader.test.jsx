import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MatchHeader from './MatchHeader';

const baseProps = {
  gameType: 'tictactoe',
  title: 'Tournament Match',
  icon: null,
  matchStatus: 1,
  completionReason: 0,
  onClose: vi.fn(),
  theme: {
    headerBg: 'from-purple-600/30 to-blue-600/30',
    headerBorder: 'border-purple-400/30',
    textMuted: 'text-purple-300',
  },
  tournamentInfo: {
    tierId: 0,
    instanceId: 0,
    roundNumber: 0,
    matchNumber: 0,
    playerCount: 4,
    player1: '0x1111111111111111111111111111111111111111',
    player2: '0x2222222222222222222222222222222222222222',
  },
};

describe('MatchHeader', () => {
  it('renders the V2 tournament match header copy', () => {
    render(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
      />
    );

    expect(screen.getByRole('button', { name: /back/i })).toHaveTextContent('Back');
    expect(screen.getByRole('heading', { name: 'Match 1 • Round 1' })).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('0x1111...1111')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument();
    expect(screen.queryByText('Tournament Match')).not.toBeInTheDocument();
  });

  it('renders the V2 duel header copy for 2-player tournaments', () => {
    render(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        tournamentInfo={{
          ...baseProps.tournamentInfo,
          playerCount: 2,
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Duel' })).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('0x1111...1111')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument();
    expect(screen.queryByText('Match 1 • Round 1')).not.toBeInTheDocument();
  });

  it('shows completion reason codes in the V2 completed badge when the reason is not R0', () => {
    const { rerender } = render(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={0}
        tournamentInfo={{
          ...baseProps.tournamentInfo,
          winner: baseProps.tournamentInfo.player1,
        }}
      />
    );

    const resolvedNormally = screen.getByRole('link', { name: 'Resolved Normally' });
    expect(resolvedNormally).toBeInTheDocument();
    expect(resolvedNormally).toHaveAttribute('href', '#41-r0---normal-resolution');
    expect(screen.queryByText('Resolved via ML1 Timeout Victory')).not.toBeInTheDocument();
    expect(screen.getAllByText('0x1111...1111').length).toBeGreaterThan(0);
    expect(screen.getByText('wins because they connected 3 in a row before')).toBeInTheDocument();
    expect(screen.getAllByText('0x2222...2222').length).toBeGreaterThan(0);

    rerender(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={1}
        tournamentInfo={{
          ...baseProps.tournamentInfo,
          winner: baseProps.tournamentInfo.player1,
        }}
      />
    );

    const resolvedMl1 = screen.getByRole('link', { name: 'Resolved via ML1 Timeout Victory' });
    expect(resolvedMl1).toBeInTheDocument();
    expect(resolvedMl1).toHaveAttribute('href', '#46-ml1---match-timeout');
    expect(screen.queryByText('Resolved Normally')).not.toBeInTheDocument();
    expect(screen.getAllByText('0x1111...1111').length).toBeGreaterThan(0);
    expect(screen.getByText('wins because they claimed victory by timeout after')).toBeInTheDocument();
    expect(screen.getAllByText('0x2222...2222').length).toBeGreaterThan(0);
    expect(screen.getByText("'s clock has run out")).toBeInTheDocument();

    rerender(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={2}
        tournamentInfo={{
          ...baseProps.tournamentInfo,
          winner: '0x0000000000000000000000000000000000000000',
        }}
      />
    );

    const resolvedR1 = screen.getByRole('link', { name: 'Resolved via R1 Draw Resolution' });
    expect(resolvedR1).toBeInTheDocument();
    expect(resolvedR1).toHaveAttribute('href', '#42-r1---draw-resolution');
    expect(screen.getByText('Both players')).toBeInTheDocument();
    expect(screen.getByText('and')).toBeInTheDocument();
    expect(screen.getByText('played until a draw')).toBeInTheDocument();
    expect(screen.queryByText('Resolved via ML1 Timeout Victory')).not.toBeInTheDocument();
  });

  it('renders ML2 and ML3 completed explanations in the V2 header', () => {
    const externalWinner = '0x3333333333333333333333333333333333333333';
    const { rerender } = render(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={3}
        tournamentInfo={{
          ...baseProps.tournamentInfo,
          winner: externalWinner,
        }}
      />
    );

    const resolvedMl2 = screen.getByRole('link', { name: 'Resolved via ML2 Advanced Player Elimination' });
    expect(resolvedMl2).toBeInTheDocument();
    expect(resolvedMl2).toHaveAttribute('href', '#47-ml2---advanced-player-wins-via-stalled-semifinal');
    expect(screen.getByText('Both players')).toBeInTheDocument();
    expect(screen.getByText('stalled and were eliminated by')).toBeInTheDocument();
    expect(screen.getByText('0x3333...3333')).toBeInTheDocument();

    rerender(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={4}
        tournamentInfo={{
          ...baseProps.tournamentInfo,
          winner: externalWinner,
        }}
      />
    );

    const resolvedMl3 = screen.getByRole('link', { name: 'Resolved via ML3 Outsider Replacement' });
    expect(resolvedMl3).toBeInTheDocument();
    expect(resolvedMl3).toHaveAttribute('href', '#48-ml3---outsider-replaces-both-players');
    expect(screen.getByText('Both players')).toBeInTheDocument();
    expect(screen.getByText('stalled and were replaced by')).toBeInTheDocument();
    expect(screen.getByText('0x3333...3333')).toBeInTheDocument();
  });

  it('keeps the legacy back label outside V2 mode', () => {
    render(<MatchHeader {...baseProps} />);

    const backButton = screen.getByRole('button', { name: /back to tournament/i });
    fireEvent.click(backButton);

    expect(backButton).toHaveTextContent('Back to Tournament');
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Tournament Match' })).toBeInTheDocument();
  });
});
