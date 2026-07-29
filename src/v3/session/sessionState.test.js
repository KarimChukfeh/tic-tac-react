import { describe, expect, it } from 'vitest';
import {
  canSubmitSessionMove,
  initialV3SessionState,
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
});
