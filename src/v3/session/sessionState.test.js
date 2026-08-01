import { describe, expect, it } from 'vitest';
import {
  canSubmitSessionMove,
  initialV3SessionState,
  isSessionNearExpiry,
  v3SessionReducer,
} from './sessionState';

describe('V3 session lifecycle reducer', () => {
  it('restores an identity and only enables session moves after active inspection', () => {
    const identity = { chainId: 412346n, instance: 'instance', primary: 'primary' };
    const restoring = v3SessionReducer(initialV3SessionState, {
      type: 'IDENTITY_CHANGED',
      identity,
    });
    expect(restoring.status).toBe('restoring');
    expect(canSubmitSessionMove(restoring)).toBe(false);

    const active = v3SessionReducer(restoring, {
      type: 'INSPECTION_RECEIVED',
      inspection: { status: 'active', executor: 'executor' },
    });
    expect(active.status).toBe('active');
    expect(active.executor).toBe('executor');
    expect(canSubmitSessionMove(active)).toBe(true);
  });

  it('requires explicit direct-primary selection and can switch back', () => {
    const active = {
      ...initialV3SessionState,
      identity: {},
      status: 'active',
    };
    const direct = v3SessionReducer(active, { type: 'DIRECT_PRIMARY_SELECTED' });
    expect(direct.directPrimaryMode).toBe(true);
    expect(canSubmitSessionMove(direct)).toBe(false);
    expect(v3SessionReducer(direct, { type: 'SESSION_SELECTED' }).directPrimaryMode).toBe(false);
  });

  it('keeps unavailable storage distinct from missing on-chain authorization', () => {
    const unavailable = v3SessionReducer(initialV3SessionState, {
      type: 'SESSION_UNAVAILABLE',
      error: { code: 'INDEXED_DB_DENIED', message: 'denied' },
    });
    expect(unavailable).toMatchObject({
      status: 'unavailable',
      error: { code: 'INDEXED_DB_DENIED' },
    });
  });

  it('counts down active sessions and expires them without enabling a stale key', () => {
    const active = v3SessionReducer({
      ...initialV3SessionState,
      identity: {},
    }, {
      type: 'INSPECTION_RECEIVED',
      inspection: {
        status: 'active',
        executor: 'executor',
        validUntil: 1_600n,
        secondsRemaining: 600n,
      },
    });

    expect(isSessionNearExpiry(active)).toBe(true);
    expect(canSubmitSessionMove(active)).toBe(true);

    const expired = v3SessionReducer(active, {
      type: 'CLOCK_TICK',
      now: 1_600n,
    });
    expect(expired.status).toBe('expired');
    expect(expired.secondsRemaining).toBe(0n);
    expect(canSubmitSessionMove(expired)).toBe(false);
  });

  it('tracks refresh/revoke progress without losing explicit wallet mode', () => {
    const direct = {
      ...initialV3SessionState,
      identity: {},
      status: 'active',
      directPrimaryMode: true,
    };
    const refreshing = v3SessionReducer(direct, { type: 'REFRESH_STARTED' });
    expect(refreshing.pendingAction).toBe('refresh');

    const refreshed = v3SessionReducer(refreshing, {
      type: 'INSPECTION_RECEIVED',
      inspection: { status: 'active', secondsRemaining: 3_600n },
      completeAction: true,
    });
    expect(refreshed.pendingAction).toBeNull();
    expect(refreshed.directPrimaryMode).toBe(true);

    const revoking = v3SessionReducer(refreshed, { type: 'REVOKE_STARTED' });
    expect(revoking.pendingAction).toBe('revoke');
    expect(v3SessionReducer(revoking, {
      type: 'ACTION_FAILURE',
      error: { message: 'rejected' },
    })).toMatchObject({
      status: 'active',
      pendingAction: null,
      error: { message: 'rejected' },
    });
  });
});
