import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import V3ActionAnnouncer from './V3ActionAnnouncer';

describe('V3ActionAnnouncer', () => {
  it('announces pending and success feedback politely', () => {
    const { rerender } = render(
      <V3ActionAnnouncer state={{ type: 'info', message: 'Waiting for confirmation.' }} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for confirmation.');

    rerender(<V3ActionAnnouncer state={{ type: 'success', message: 'Confirmed on-chain.' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Confirmed on-chain.');
  });

  it('announces errors assertively', () => {
    render(<V3ActionAnnouncer state={{ type: 'error', message: 'Transaction rejected.' }} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});
