import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ActiveMatchAlertModal from './ActiveMatchAlertModal';

const match = {
  tierId: 0,
  instanceId: '0x1234567890abcdef1234567890abcdef12345678',
  roundIdx: 0,
  matchIdx: 1,
  opponent: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  isMyTurn: true,
};

describe('ActiveMatchAlertModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dismisses via onDismiss when Later is clicked', () => {
    const onDismiss = vi.fn();

    render(
      <ActiveMatchAlertModal
        match={match}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Later' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('enters the match and then dismisses', () => {
    const onEnterMatch = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ActiveMatchAlertModal
        match={match}
        onEnterMatch={onEnterMatch}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to Match' }));

    expect(onEnterMatch).toHaveBeenCalledWith(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
