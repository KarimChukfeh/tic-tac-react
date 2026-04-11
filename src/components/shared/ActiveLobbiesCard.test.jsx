import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ActiveLobbiesCard from './ActiveLobbiesCard';

const baseProps = {
  lobbies: [],
  resolvedLobbies: [],
  loading: false,
  resolvedLoading: false,
  syncing: false,
  resolvedSyncing: false,
  error: null,
  resolvedError: null,
  resolvedLoaded: false,
  gamesCardHeight: 0,
  playerActivityHeight: 0,
  recentMatchesCardHeight: 0,
  onHeightChange: vi.fn(),
  onRefresh: vi.fn(),
  onRefreshResolved: vi.fn(),
  onLoadResolved: vi.fn(),
  onViewTournament: vi.fn(),
  getTournamentTypeLabel: vi.fn(() => 'Tournament'),
  disabled: false,
};

describe('ActiveLobbiesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  it('keeps the Resolved filter available when there are no active lobbies', () => {
    const onLoadResolved = vi.fn();

    render(
      <ActiveLobbiesCard
        {...baseProps}
        onLoadResolved={onLoadResolved}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /open discover lobbies/i }));

    const resolvedFilter = screen.getByRole('button', { name: /resolved/i });
    expect(resolvedFilter).toBeInTheDocument();
    expect(screen.getByText('Hide mine')).toBeInTheDocument();

    fireEvent.click(resolvedFilter);

    expect(onLoadResolved).toHaveBeenCalledTimes(1);
  });
});
