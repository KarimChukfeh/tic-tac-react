export const V3_SESSION_STATUS = Object.freeze({
  DISCONNECTED: 'disconnected',
  RESTORING: 'restoring',
  MISSING: 'missing',
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

export const initialV3SessionState = Object.freeze({
  status: V3_SESSION_STATUS.DISCONNECTED,
  identity: null,
  executor: null,
  inspection: null,
  error: null,
  directPrimaryMode: false,
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
    case 'INSPECTION_RECEIVED':
      return {
        ...state,
        status: inspectionStatus(action.inspection),
        executor: action.inspection?.executor || state.executor,
        inspection: action.inspection,
        error: null,
        directPrimaryMode: action.inspection?.status === 'active'
          ? false
          : state.directPrimaryMode,
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
    && Boolean(state.identity);
}
