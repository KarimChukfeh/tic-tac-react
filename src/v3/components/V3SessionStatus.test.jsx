import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import V3SessionStatus from './V3SessionStatus';

describe('V3SessionStatus', () => {
  it('shows active executor state and makes wallet fallback explicit', () => {
    const onUsePrimary = vi.fn();
    render(
      <V3SessionStatus
        state={{
          status: 'active',
          executor: '0x1111111111111111111111111111111111111111',
          directPrimaryMode: false,
        }}
        onUsePrimary={onUsePrimary}
      />,
    );
    expect(screen.getByText('Prompt-free moves enabled')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use wallet for moves' }));
    expect(onUsePrimary).toHaveBeenCalledOnce();
  });

  it('does not imply automatic fallback for a failed session', () => {
    render(
      <V3SessionStatus
        state={{
          status: 'unavailable',
          identity: {},
          error: { message: 'Both bundlers are unavailable.' },
          directPrimaryMode: false,
        }}
        onUsePrimary={() => {}}
      />,
    );
    expect(screen.getByText('Session service unavailable')).toBeInTheDocument();
    expect(screen.getByText('Both bundlers are unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use wallet for moves' })).toBeInTheDocument();
  });
});
