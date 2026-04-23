import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TraditionalTournamentBracket from './TraditionalTournamentBracket';

describe('TraditionalTournamentBracket', () => {
  it('renders round labels and match content', () => {
    const rounds = [
      {
        roundIndex: 0,
        label: 'Quarter Finals',
        matches: [{ matchNumber: 0 }, { matchNumber: 1 }, { matchNumber: 2 }, { matchNumber: 3 }],
      },
      {
        roundIndex: 1,
        label: 'Semi Finals',
        matches: [{ matchNumber: 0 }, { matchNumber: 1 }],
      },
      {
        roundIndex: 2,
        label: 'Finals',
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
    expect(screen.getAllByText('Quarter Finals').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Semi Finals').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Finals').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Round 1 Match 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Round 1 Match 4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Round 2 Match 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Round 2 Match 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Round 3 Match 1').length).toBeGreaterThan(0);
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
