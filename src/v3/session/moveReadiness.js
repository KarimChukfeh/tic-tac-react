import { canSubmitSessionMove } from './sessionState';

const RECOVERABLE_SESSION_STATUSES = new Set([
  'missing',
  'missing-local',
  'expired',
  'rotated',
  'revoked',
  'inactive',
]);

export const V3_SESSION_RECOVERY_PROMPT = [
  'This browser cannot use the tournament’s current prompt-free key.',
  'Authorize a replacement key now?',
  'This requires one small transaction from your primary wallet. Your tournament and funds are unchanged, and this move has not been submitted yet.',
].join(' ');

export const V3_DIRECT_MOVE_PROMPT = [
  'The prompt-free session could not be restored right now.',
  'Submit this move with your primary wallet instead?',
  'This confirms only this move; it does not replace or regenerate the prompt-free key.',
].join(' ');

export function isUsableMoveInspection(inspection) {
  return inspection?.status === 'active' && inspection?.localAvailable === true;
}

export async function resolveV3MoveReadiness({
  state,
  identity,
  restoreForMove,
  refreshSession,
  confirm = globalThis.confirm,
}) {
  if (state?.directPrimaryMode) return { mode: 'primary', identity };
  if (canSubmitSessionMove(state)) return { mode: 'session', identity };

  const restored = await restoreForMove();
  if (restored?.ready) {
    return { mode: 'session', identity: restored.identity || identity };
  }

  const status = restored?.inspection?.status || state?.status;
  if (RECOVERABLE_SESSION_STATUSES.has(status) && (restored?.identity || identity)) {
    if (confirm?.(V3_SESSION_RECOVERY_PROMPT) === false) {
      return { mode: 'cancelled', reason: 'recovery-declined' };
    }
    const refreshed = await refreshSession();
    if (isUsableMoveInspection(refreshed?.inspection)) {
      return {
        mode: 'session',
        identity: restored?.identity || identity,
        recovered: true,
      };
    }
    return { mode: 'cancelled', reason: 'recovery-failed' };
  }

  if (confirm?.(V3_DIRECT_MOVE_PROMPT) === false) {
    return { mode: 'cancelled', reason: 'direct-declined' };
  }
  return { mode: 'primary', identity };
}
