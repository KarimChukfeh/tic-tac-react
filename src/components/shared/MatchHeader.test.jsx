import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MatchHeader from './MatchHeader';

const baseProps = {
  gameType: 'tictactoe',
  title: 'Tournament Match',
  icon: null,
  account: '0x1111111111111111111111111111111111111111',
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
    player1Icon: 'X',
    player2Icon: 'O',
    player1Symbol: 'X',
    player2Symbol: 'O',
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
    expect(screen.getByRole('heading', { name: 'Semi Finals Match' })).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getAllByText('0x1111...1111').length).toBeGreaterThan(0);
    expect(screen.getByText('YOU')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getAllByText('0x2222...2222').length).toBeGreaterThan(0);
    expect(screen.queryByText('Tournament Match')).not.toBeInTheDocument();
  });

  it('renders round-specific V2 tournament titles for larger brackets', () => {
    const scenarios = [
      { playerCount: 4, roundNumber: 0, expected: 'Semi Finals Match' },
      { playerCount: 4, roundNumber: 1, expected: 'Finals Match' },
      { playerCount: 8, roundNumber: 0, expected: 'Quarter Finals Match' },
      { playerCount: 8, roundNumber: 1, expected: 'Semi Finals Match' },
      { playerCount: 8, roundNumber: 2, expected: 'Finals Match' },
      { playerCount: 16, roundNumber: 0, expected: 'Round of 16 Match' },
      { playerCount: 16, roundNumber: 1, expected: 'Quarter Finals Match' },
      { playerCount: 16, roundNumber: 2, expected: 'Semi Finals Match' },
      { playerCount: 16, roundNumber: 3, expected: 'Finals Match' },
      { playerCount: 32, roundNumber: 0, expected: 'Round of 32 Match' },
      { playerCount: 32, roundNumber: 1, expected: 'Round of 16 Match' },
      { playerCount: 32, roundNumber: 2, expected: 'Quarter Finals Match' },
      { playerCount: 32, roundNumber: 3, expected: 'Semi Finals Match' },
      { playerCount: 32, roundNumber: 4, expected: 'Finals Match' },
    ];

    const { rerender } = render(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
      />
    );

    scenarios.forEach(({ playerCount, roundNumber, expected }) => {
      rerender(
        <MatchHeader
          {...baseProps}
          reasonLabelMode="v2"
          tournamentInfo={{
            ...baseProps.tournamentInfo,
            playerCount,
            roundNumber,
          }}
        />
      );

      expect(screen.getByRole('heading', { name: expected })).toBeInTheDocument();
      expect(screen.queryByText('Match 1 • Round 1')).not.toBeInTheDocument();
    });
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
    expect(screen.getAllByText('0x1111...1111').length).toBeGreaterThan(0);
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getAllByText('0x2222...2222').length).toBeGreaterThan(0);
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

    expect(screen.queryByRole('link', { name: 'Resolved Normally' })).not.toBeInTheDocument();
    expect(screen.getByText('Resolution')).toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved via ML1 Timeout Victory')).not.toBeInTheDocument();
    expect(screen.getByText('wins')).toBeInTheDocument();
    expect(screen.getAllByText('0x1111...1111').length).toBeGreaterThan(1);
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

    const ml1TimeoutLink = screen.getByRole('link', { name: 'by timeout (ML1)' });
    expect(ml1TimeoutLink).toBeInTheDocument();
    expect(ml1TimeoutLink).toHaveAttribute('href', '#46-ml1---match-timeout');
    expect(screen.queryByText('Resolved Normally')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved via ML1 Timeout Victory')).not.toBeInTheDocument();
    expect(screen.getByText('wins')).toBeInTheDocument();
    expect(screen.getAllByText('0x1111...1111').length).toBeGreaterThan(1);
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

    const r1Link = screen.getByRole('link', { name: 'Draw Resolution (R1)' });
    expect(r1Link).toBeInTheDocument();
    expect(r1Link).toHaveAttribute('href', '#42-r1---draw-resolution');
    expect(screen.queryByText('Resolved via R1 Draw Resolution')).not.toBeInTheDocument();
    expect(screen.getByText('No Winner.')).toBeInTheDocument();
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

    const ml2Link = screen.getByRole('link', { name: 'Anti-Stall (ML2)' });
    expect(ml2Link).toBeInTheDocument();
    expect(ml2Link).toHaveAttribute('href', '#47-ml2---advanced-player-wins-via-stalled-semifinal');
    expect(screen.queryByText('Resolved via ML2 Advanced Player Elimination')).not.toBeInTheDocument();
    expect(screen.getByText('No Winner. Players Eliminated via')).toBeInTheDocument();
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

    const ml3Link = screen.getByRole('link', { name: 'Anti-Stall (ML3)' });
    expect(ml3Link).toBeInTheDocument();
    expect(ml3Link).toHaveAttribute('href', '#48-ml3---outsider-replaces-both-players');
    expect(screen.queryByText('Resolved via ML3 Outsider Replacement')).not.toBeInTheDocument();
    expect(screen.getByText('No Winner. Players Replaced by')).toBeInTheDocument();
    expect(screen.getAllByText('0x3333...3333').length).toBeGreaterThan(1);
    expect(screen.getByText('Both players')).toBeInTheDocument();
    expect(screen.getByText('stalled and were replaced by')).toBeInTheDocument();
    expect(screen.getAllByText('0x3333...3333').length).toBeGreaterThan(0);
  });

  it('opens player stats callbacks for non-connected addresses in completed v2 matches', () => {
    const onPlayerAddressClick = vi.fn();

    render(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={1}
        onPlayerAddressClick={onPlayerAddressClick}
        tournamentInfo={{
          ...baseProps.tournamentInfo,
          winner: baseProps.tournamentInfo.player1,
        }}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Open stats for 0x2222...2222' })[0]);

    expect(screen.queryByRole('button', { name: 'Open stats for 0x1111...1111' })).not.toBeInTheDocument();
    expect(onPlayerAddressClick).toHaveBeenCalledWith('0x2222222222222222222222222222222222222222');
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
