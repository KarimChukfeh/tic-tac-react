import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TraditionalTournamentBracket from './TraditionalTournamentBracket';

describe('TraditionalTournamentBracket', () => {
  it('renders round labels and match content', () => {
    const rounds = [
      {
        roundIndex: 0,
        label: 'Semi Final',
        matches: [{ matchNumber: 0 }, { matchNumber: 1 }],
      },
      {
        roundIndex: 1,
        label: 'Final',
        matches: [{ matchNumber: 0 }],
      },
    ];

    render(
      <TraditionalTournamentBracket
        title="Tournament Bracket"
        rounds={rounds}
        hasValidRounds={true}
        renderMatch={({ roundIdx, matchIdx }) => (
          <div>{`Round ${roundIdx + 1} Match ${matchIdx + 1}`}</div>
        )}
      />
    );

    expect(screen.getByText('Tournament Bracket')).toBeInTheDocument();
    expect(screen.getByText('Semi Final')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText('Round 1 Match 1')).toBeInTheDocument();
    expect(screen.getByText('Round 1 Match 2')).toBeInTheDocument();
    expect(screen.getByText('Round 2 Match 1')).toBeInTheDocument();
  });

  it('renders the empty state when rounds are unavailable', () => {
    render(
      <TraditionalTournamentBracket
        title="Tournament Bracket"
        rounds={[]}
        hasValidRounds={false}
        emptyMessage="Brackets will be generated once the instance starts."
        renderMatch={() => null}
        renderEmpty={() => <div>Recent instance</div>}
      />
    );

    expect(screen.getByText('Brackets will be generated once the instance starts.')).toBeInTheDocument();
    expect(screen.getByText('Recent instance')).toBeInTheDocument();
  });
});
