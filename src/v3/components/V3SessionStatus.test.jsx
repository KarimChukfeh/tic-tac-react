import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import V3SessionStatus, { buildV3SessionDiagnostics } from './V3SessionStatus';

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
    expect(screen.getByText('Prompt-free transport is unavailable')).toBeInTheDocument();
    expect(screen.getByText('Both bundlers are unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use wallet for moves' })).toBeInTheDocument();
  });

  it('shows near-expiry time and explicit refresh/revoke actions', () => {
    const onRefresh = vi.fn();
    const onRevoke = vi.fn();
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    render(
      <V3SessionStatus
        state={{
          status: 'active',
          identity: {},
          executor: '0x1111111111111111111111111111111111111111',
          secondsRemaining: 305n,
          directPrimaryMode: false,
          pendingAction: null,
        }}
        onUsePrimary={() => {}}
        onRefresh={onRefresh}
        onRevoke={onRevoke}
      />,
    );

    expect(screen.getByText('Prompt-free session expires soon')).toBeInTheDocument();
    expect(screen.getByText('5m 5s remaining')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke session' }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onRevoke).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });

  it('offers wallet recovery when the local key is missing', () => {
    render(
      <V3SessionStatus
        state={{
          status: 'missing-local',
          identity: {},
          executor: '0x1111111111111111111111111111111111111111',
          secondsRemaining: 0n,
          directPrimaryMode: false,
          pendingAction: null,
        }}
        onUsePrimary={() => {}}
        onRefresh={() => {}}
        onRevoke={() => {}}
      />,
    );

    expect(screen.getByText('This browser no longer has the prompt-free key')).toBeInTheDocument();
    expect(screen.getByText(/authorize a replacement key for this browser/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh session' })).toBeInTheDocument();
  });

  it('keeps routine compact status quiet until controls are requested', () => {
    render(
      <V3SessionStatus
        compact
        state={{
          status: 'active',
          identity: {},
          executor: '0x1111111111111111111111111111111111111111',
          secondsRemaining: 3600n,
          directPrimaryMode: false,
          pendingAction: null,
        }}
        onUsePrimary={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Use wallet for moves' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show session controls' }));
    expect(screen.getByRole('button', { name: 'Use wallet for moves' })).toBeInTheDocument();
  });

  it('builds diagnostics from a public allowlist', () => {
    const diagnostics = buildV3SessionDiagnostics({
      status: 'active',
      identity: { chainId: 412346n, instance: '0xinstance', primary: '0xprimary' },
      executor: '0xexecutor',
      secondsRemaining: 30n,
      inspection: {
        status: 'active',
        validUntil: 999n,
        localAvailable: true,
        privateKey: 'must-not-leak',
        signature: 'must-not-leak',
      },
      error: { code: 'SAFE_CODE', message: 'arbitrary internal detail' },
    });
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics.chainId).toBe('412346');
    expect(serialized).not.toContain('must-not-leak');
    expect(serialized).not.toContain('arbitrary internal detail');
    expect(serialized).not.toContain('privateKey');
    expect(serialized).not.toContain('signature');
  });
});
