import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PlayerActivity from './PlayerActivity';

const baseProps = {
  activity: {
    activeMatches: [],
    inProgressTournaments: [],
    unfilledTournaments: [],
    terminatedMatches: [],
    totalEarnings: 0n,
  },
  loading: false,
  syncing: false,
  contract: null,
  account: '0x1111111111111111111111111111111111111111',
  onEnterMatch: vi.fn(),
  onEnterTournament: vi.fn(),
  onRefresh: vi.fn(),
  onDismissMatch: vi.fn(),
  gameName: 'tictactoe',
  gameEmoji: '✖️',
};

describe('PlayerActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  it('routes Check Status with the v2 tournament address and renders an address-backed label', () => {
    const onEnterTournament = vi.fn();
    const instanceAddress = '0x1234567890abcdef1234567890abcdef12345678';

    render(
      <PlayerActivity
        {...baseProps}
        onEnterTournament={onEnterTournament}
        activity={{
          ...baseProps.activity,
          unfilledTournaments: [
            { tierId: 0, instanceId: instanceAddress, enrolledCount: 1, playerCount: 4 },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open player activity' }));

    expect(screen.getByText(/Tournament 0x1234\.\.\.5678/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Check Status/i }));

    expect(onEnterTournament).toHaveBeenCalledWith(0, instanceAddress);
  });
});
