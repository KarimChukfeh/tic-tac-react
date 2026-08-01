import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CenteredErrorFlash from './CenteredErrorFlash';

describe('CenteredErrorFlash', () => {
  it('uses alert-dialog semantics, traps focus, and restores focus on dismissal', async () => {
    const onDismiss = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    const { rerender } = render(
      <CenteredErrorFlash message="The move could not be submitted." onDismiss={onDismiss} />,
    );

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription('The move could not be submitted.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledOnce();

    rerender(<CenteredErrorFlash message="" onDismiss={onDismiss} />);
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
