export const V3_SESSION_STATUS = Object.freeze({
  DISCONNECTED: 'disconnected',
  RESTORING: 'restoring',
  MISSING: 'missing',
  MISSING_LOCAL: 'missing-local',
  PREPARING: 'preparing',
  AWAITING_WALLET: 'awaiting-wallet',
  CONFIRMING: 'confirming',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  ROTATED: 'rotated',
  REVOKED: 'revoked',
  INACTIVE: 'inactive',
  UNAVAILABLE: 'unavailable',
  ERROR: 'error',
});

export const V3_SESSION_NEAR_EXPIRY_SECONDS = 600n;

export const initialV3SessionState = Object.freeze({
  status: V3_SESSION_STATUS.DISCONNECTED,
  identity: null,
  executor: null,
  inspection: null,
  error: null,
  directPrimaryMode: false,
  pendingAction: null,
  secondsRemaining: 0n,
});

function inspectionStatus(inspection) {
  return Object.values(V3_SESSION_STATUS).includes(inspection?.status)
    ? inspection.status
    : V3_SESSION_STATUS.INACTIVE;
}

export function v3SessionReducer(state, action) {
  switch (action.type) {
    case 'IDENTITY_CHANGED':
      return {
        ...initialV3SessionState,
        identity: action.identity || null,
        status: action.identity
          ? V3_SESSION_STATUS.RESTORING
          : V3_SESSION_STATUS.DISCONNECTED,
      };
    case 'RESTORE_STARTED':
      return {
        ...state,
        status: V3_SESSION_STATUS.RESTORING,
        error: null,
      };
    case 'PREPARE_STARTED':
      return {
        ...state,
        status: V3_SESSION_STATUS.PREPARING,
        error: null,
        directPrimaryMode: false,
      };
    case 'SESSION_PREPARED':
      return {
        ...state,
        status: V3_SESSION_STATUS.AWAITING_WALLET,
        executor: action.executor,
        error: null,
      };
    case 'TRANSACTION_SUBMITTED':
      return {
        ...state,
        status: V3_SESSION_STATUS.CONFIRMING,
        error: null,
      };
    case 'INSPECTION_RECEIVED': {
      const status = inspectionStatus(action.inspection);
      return {
        ...state,
        status,
        executor: [V3_SESSION_STATUS.MISSING, V3_SESSION_STATUS.REVOKED].includes(status)
          ? null
          : (action.inspection?.executor || state.executor),
        inspection: action.inspection,
        error: null,
        directPrimaryMode: state.directPrimaryMode,
        pendingAction: action.completeAction ? null : state.pendingAction,
        secondsRemaining: BigInt(action.inspection?.secondsRemaining ?? 0),
      };
    }
    case 'CLOCK_TICK': {
      if (!state.inspection?.validUntil) return state;
      const remaining = BigInt(state.inspection.validUntil) > BigInt(action.now)
        ? BigInt(state.inspection.validUntil) - BigInt(action.now)
        : 0n;
      return {
        ...state,
        status: state.status === V3_SESSION_STATUS.ACTIVE && remaining === 0n
          ? V3_SESSION_STATUS.EXPIRED
          : state.status,
        secondsRemaining: remaining,
      };
    }
    case 'REFRESH_STARTED':
      return {
        ...state,
        pendingAction: 'refresh',
        error: null,
      };
    case 'REVOKE_STARTED':
      return {
        ...state,
        pendingAction: 'revoke',
        error: null,
      };
    case 'ACTION_FAILURE':
      return {
        ...state,
        pendingAction: null,
        error: action.error || new Error('Session action failed'),
      };
    case 'DIRECT_PRIMARY_SELECTED':
      return {
        ...state,
        directPrimaryMode: true,
        error: null,
      };
    case 'SESSION_SELECTED':
      return {
        ...state,
        directPrimaryMode: false,
        error: null,
      };
    case 'SESSION_UNAVAILABLE':
      return {
        ...state,
        status: V3_SESSION_STATUS.UNAVAILABLE,
        error: action.error || null,
      };
    case 'FAILURE':
      return {
        ...state,
        status: V3_SESSION_STATUS.ERROR,
        error: action.error || new Error('Session action failed'),
      };
    default:
      return state;
  }
}

export function canSubmitSessionMove(state) {
  return state.status === V3_SESSION_STATUS.ACTIVE
    && !state.directPrimaryMode
    && state.inspection?.localAvailable !== false
    && Boolean(state.identity);
}

export function isSessionNearExpiry(
  state,
  threshold = V3_SESSION_NEAR_EXPIRY_SECONDS,
) {
  return state.status === V3_SESSION_STATUS.ACTIVE
    && BigInt(state.secondsRemaining ?? 0) > 0n
    && BigInt(state.secondsRemaining ?? 0) <= BigInt(threshold);
}
