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
});
