import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WalletBrowserPrompt from './WalletBrowserPrompt';

describe('V3 WalletBrowserPrompt', () => {
  it('has modal semantics, focuses the first choice, and closes on Escape', async () => {
    const onContinueChoice = vi.fn();
    render(
      <WalletBrowserPrompt
        onWalletChoice={() => {}}
        onContinueChoice={onContinueChoice}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open with MetaMask' })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onContinueChoice).toHaveBeenCalledOnce();
  });
});
