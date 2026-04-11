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
      />
    );

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.queryByText('Complete via ML1')).not.toBeInTheDocument();

    rerender(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={1}
      />
    );

    expect(screen.getByText('Complete via ML1')).toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();

    rerender(
      <MatchHeader
        {...baseProps}
        reasonLabelMode="v2"
        matchStatus={2}
        completionReason={2}
      />
    );

    expect(screen.getByText('Completed via R1 Draw Resolution')).toBeInTheDocument();
    expect(screen.queryByText('Complete via ML1')).not.toBeInTheDocument();
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
