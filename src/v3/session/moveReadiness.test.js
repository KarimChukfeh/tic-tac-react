import { describe, expect, it, vi } from 'vitest';
import {
  resolveV3MoveReadiness,
  V3_DIRECT_MOVE_PROMPT,
  V3_SESSION_RECOVERY_PROMPT,
} from './moveReadiness';

const identity = { chainId: 412346n, instance: 'instance', primary: 'primary' };

describe('V3 move readiness', () => {
  it('waits for reload restoration instead of prompting for a wallet move', async () => {
    const confirm = vi.fn();
    const result = await resolveV3MoveReadiness({
      state: { status: 'restoring', identity, directPrimaryMode: false },
      identity,
      restoreForMove: vi.fn().mockResolvedValue({
        ready: true,
        identity,
        inspection: { status: 'active', localAvailable: true },
      }),
      refreshSession: vi.fn(),
      confirm,
    });

    expect(result).toEqual({ mode: 'session', identity });
    expect(confirm).not.toHaveBeenCalled();
  });

  it('explains and refreshes a genuinely missing local key once', async () => {
    const confirm = vi.fn().mockReturnValue(true);
    const refreshSession = vi.fn().mockResolvedValue({
      inspection: { status: 'active', localAvailable: true },
    });
    const result = await resolveV3MoveReadiness({
      state: { status: 'missing-local', identity, directPrimaryMode: false },
      identity,
      restoreForMove: vi.fn().mockResolvedValue({
        ready: false,
        identity,
        inspection: { status: 'missing-local', localAvailable: false },
      }),
      refreshSession,
      confirm,
    });

    expect(confirm).toHaveBeenCalledWith(V3_SESSION_RECOVERY_PROMPT);
    expect(refreshSession).toHaveBeenCalledOnce();
    expect(result).toEqual({ mode: 'session', identity, recovered: true });
  });

  it('does not submit or refresh when session recovery is declined', async () => {
    const refreshSession = vi.fn();
    const result = await resolveV3MoveReadiness({
      state: { status: 'expired', identity, directPrimaryMode: false },
      identity,
      restoreForMove: vi.fn().mockResolvedValue({
        ready: false,
        identity,
        inspection: { status: 'expired', localAvailable: true },
      }),
      refreshSession,
      confirm: vi.fn().mockReturnValue(false),
    });

    expect(refreshSession).not.toHaveBeenCalled();
    expect(result).toEqual({ mode: 'cancelled', reason: 'recovery-declined' });
  });

  it('labels direct-wallet fallback as a one-move fallback, not key recovery', async () => {
    const confirm = vi.fn().mockReturnValue(true);
    const result = await resolveV3MoveReadiness({
      state: { status: 'unavailable', identity, directPrimaryMode: false },
      identity,
      restoreForMove: vi.fn().mockResolvedValue({ ready: false, identity, inspection: null }),
      refreshSession: vi.fn(),
      confirm,
    });

    expect(confirm).toHaveBeenCalledWith(V3_DIRECT_MOVE_PROMPT);
    expect(result).toEqual({ mode: 'primary', identity });
  });
});
