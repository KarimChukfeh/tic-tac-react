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
  resolvedPage: 0,
  resolvedTotalCount: 0,
  resolvedPageSize: 10,
  gamesCardHeight: 0,
  playerActivityHeight: 0,
  recentMatchesCardHeight: 0,
  onHeightChange: vi.fn(),
  onRefresh: vi.fn(),
  onRefreshResolved: vi.fn(),
  onResolvedPageChange: vi.fn(),
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

  it('renders the Resolved filter without a count and paginates older results', () => {
    const onResolvedPageChange = vi.fn();

    render(
      <ActiveLobbiesCard
        {...baseProps}
        resolvedLoaded
        resolvedLobbies={[
          {
            address: '0x1234567890123456789012345678901234567890',
            status: 2,
            statusLabel: 'Completed',
            playerCount: 4,
            entryFeeEth: '0.1',
            enrolledCount: 4,
            prizePoolEth: '0.4',
            completionReason: 0,
            winner: '0x9999999999999999999999999999999999999999',
            isUserEnrolled: false,
          },
        ]}
        resolvedTotalCount={25}
        onResolvedPageChange={onResolvedPageChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /open discover lobbies/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Resolved' }));

    expect(screen.getByRole('button', { name: 'Resolved' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Older' }));

    expect(onResolvedPageChange).toHaveBeenCalledWith(1);
  });
});
