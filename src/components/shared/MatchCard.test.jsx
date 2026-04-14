import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MatchCard from './MatchCard';

const completedMatch = {
  player1: '0x1111111111111111111111111111111111111111',
  player2: '0x2222222222222222222222222222222222222222',
  winner: '0x1111111111111111111111111111111111111111',
  matchStatus: 2,
  completionReason: 0,
};

describe('MatchCard', () => {
  it('shows View Match for completed tournaments even when the connected wallet is not in the match', () => {
    const onEnterMatch = vi.fn();

    render(
      <MatchCard
        match={completedMatch}
        matchIdx={1}
        roundIdx={2}
        tierId={0}
        instanceId={0}
        account="0x3333333333333333333333333333333333333333"
        loading={false}
        onEnterMatch={onEnterMatch}
        showEscalation={false}
        isTournamentCompleted
        gameName="tictactoe"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /view match/i }));

    expect(onEnterMatch).toHaveBeenCalledWith(0, 0, 2, 1);
  });

  it('does not show View Match for completed tournaments when no wallet is connected', () => {
    render(
      <MatchCard
        match={completedMatch}
        matchIdx={1}
        roundIdx={2}
        tierId={0}
        instanceId={0}
        account={null}
        loading={false}
        onEnterMatch={vi.fn()}
        showEscalation={false}
        isTournamentCompleted
        gameName="tictactoe"
      />
    );

    expect(screen.queryByRole('button', { name: /view match/i })).not.toBeInTheDocument();
  });

  it('shows WINS text for the winner on completed match cards', () => {
    render(
      <MatchCard
        match={completedMatch}
        matchIdx={1}
        roundIdx={2}
        tierId={0}
        instanceId={0}
        account="0x3333333333333333333333333333333333333333"
        loading={false}
        onEnterMatch={vi.fn()}
        showEscalation={false}
        isTournamentCompleted
        gameName="tictactoe"
      />
    );

    expect(screen.getByText('WINS')).toBeInTheDocument();
  });

  it('shows the R2 uncontested finalist state without a TBD opponent row', () => {
    render(
      <MatchCard
        match={{
          player1: '0x1111111111111111111111111111111111111111',
          player2: '0x0000000000000000000000000000000000000000',
          winner: '0x1111111111111111111111111111111111111111',
          matchStatus: 0,
        }}
        matchIdx={0}
        roundIdx={1}
        tierId={0}
        instanceId={0}
        account="0x3333333333333333333333333333333333333333"
        loading={false}
        onEnterMatch={vi.fn()}
        showEscalation={false}
        isTournamentCompleted
        gameName="tictactoe"
        reasonLabelMode="v2"
        tournamentCompletionReason={7}
        totalMatchesInRound={1}
      />
    );

    const r2Link = screen.getByRole('link', { name: 'R2 Uncontested Finalist' });
    expect(r2Link).toHaveAttribute('href', '#43-r2---uncontested-finalist');
    expect(screen.getByText('0x1111...1111')).toBeInTheDocument();
    expect(screen.queryByText('TBD')).not.toBeInTheDocument();
    expect(screen.queryByText('VS')).not.toBeInTheDocument();
    expect(screen.queryByText('Match 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Not Started')).not.toBeInTheDocument();
  });
});
