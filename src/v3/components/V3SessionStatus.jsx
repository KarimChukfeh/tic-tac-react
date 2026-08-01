import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { isSessionNearExpiry } from '../session/sessionState';

const LABELS = {
  disconnected: 'Connect wallet for prompt-free moves',
  restoring: 'Checking prompt-free session…',
  missing: 'Prompt-free moves are not enabled',
  'missing-local': 'This browser no longer has the prompt-free key',
  preparing: 'Creating an encrypted session key…',
  'awaiting-wallet': 'Session ready for wallet confirmation',
  confirming: 'Confirming the session on-chain…',
  active: 'Prompt-free moves enabled',
  expired: 'Prompt-free session expired',
  rotated: 'Session was replaced on another device',
  revoked: 'Prompt-free session revoked',
  inactive: 'Prompt-free session is not active',
  unavailable: 'Prompt-free transport is unavailable',
  error: 'Prompt-free setup needs attention',
};

const REFRESHABLE_STATUSES = new Set([
  'active',
  'missing',
  'expired',
  'rotated',
  'revoked',
  'inactive',
  'missing-local',
]);

function diagnosticValue(value) {
  return value == null ? null : String(value);
}

export function buildV3SessionDiagnostics(state) {
  return Object.freeze({
    generation: 'v3',
    status: diagnosticValue(state.status),
    mode: state.directPrimaryMode ? 'primary-wallet' : 'session-executor',
    chainId: diagnosticValue(state.identity?.chainId),
    instance: diagnosticValue(state.identity?.instance),
    primary: diagnosticValue(state.identity?.primary),
    executor: diagnosticValue(state.executor),
    onChainStatus: diagnosticValue(state.inspection?.onChainStatus || state.inspection?.status),
    validUntil: diagnosticValue(state.inspection?.validUntil),
    secondsRemaining: diagnosticValue(state.secondsRemaining ?? 0),
    localKeyAvailable: Boolean(state.inspection?.localAvailable),
    pendingAction: diagnosticValue(state.pendingAction),
    errorCode: diagnosticValue(state.error?.code),
  });
}

function formatRemaining(seconds) {
  const remaining = Number(seconds || 0n);
  if (remaining <= 0) return 'Expired';
  if (remaining < 60) return `${remaining}s remaining`;
  const minutes = Math.floor(remaining / 60);
  if (minutes < 60) return `${minutes}m ${remaining % 60}s remaining`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m remaining`;
}

export default function V3SessionStatus({
  state,
  onUsePrimary,
  onUseSession,
  onRefresh,
  onRevoke,
  compact = false,
}) {
  const nearExpiry = isSessionNearExpiry(state);
  const pending = Boolean(state.pendingAction);
  const secondsRemaining = BigInt(state.secondsRemaining ?? 0);
  const routine = state.status === 'active' && !nearExpiry && !pending && !state.error;
  const [expanded, setExpanded] = useState(!compact || !routine);
  const controlsId = useId();
  const liveId = useId();
  const label = state.pendingAction === 'refresh'
    ? 'Confirm the session refresh in your wallet…'
    : state.pendingAction === 'revoke'
      ? 'Confirm session revocation in your wallet…'
      : state.directPrimaryMode
        ? 'Wallet confirmation mode'
        : nearExpiry
          ? 'Prompt-free session expires soon'
          : (LABELS[state.status] || 'Session status unavailable');
  const canRefresh = Boolean(
    state.identity
    && onRefresh
    && REFRESHABLE_STATUSES.has(state.status),
  );
  const canRevoke = Boolean(
    state.identity
    && onRevoke
    && state.executor
    && !['missing', 'revoked', 'disconnected', 'restoring'].includes(state.status),
  );
  const showDetails = !compact || expanded;

  useEffect(() => {
    if (!compact) {
      setExpanded(true);
      return;
    }
    setExpanded(!routine);
  }, [
    compact,
    routine,
    state.directPrimaryMode,
    state.executor,
    state.identity?.instance,
  ]);

  const handleRevoke = () => {
    const approved = globalThis.confirm?.(
      'Revoke prompt-free moves for this tournament? Your tournament and funds are unchanged, and wallet-confirmed moves remain available.',
    );
    if (approved === false) return;
    void onRevoke();
  };

  const diagnostics = buildV3SessionDiagnostics(state);
  const statusCopy = state.directPrimaryMode
    ? 'Each move requires approval from your connected primary wallet.'
    : state.status === 'active'
      ? 'Moves use this browser’s encrypted executor key and sponsored submission when available. Your primary wallet remains in control.'
      : 'Wallet-confirmed moves remain available; fallback only occurs when you select it.';

  return (
    <aside
      className={`rounded-xl border border-cyan-400/20 bg-slate-950/85 shadow-lg shadow-slate-950/20 backdrop-blur ${compact ? 'px-3 py-2' : 'p-4'}`}
      data-v3-session-status={state.status}
      data-v3-session-expanded={showDetails ? 'true' : 'false'}
      aria-labelledby={liveId}
      aria-busy={pending ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p id={liveId} className="text-sm font-semibold text-cyan-100" role="status" aria-live="polite" aria-atomic="true">
            {label}
          </p>
          {state.executor && (
            <p className="truncate text-xs text-white/45">Executor {shortenAddress(state.executor)}</p>
          )}
          {secondsRemaining > 0n && (showDetails || nearExpiry) && (
            <p className={`text-xs ${nearExpiry ? 'text-amber-200' : 'text-white/45'}`}>
              {formatRemaining(secondsRemaining)}
            </p>
          )}
        </div>
        {compact && (
          <button
            type="button"
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-white/65 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            aria-label={expanded ? 'Hide session controls' : 'Show session controls'}
            aria-expanded={expanded}
            aria-controls={controlsId}
            onClick={() => setExpanded(value => !value)}
          >
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {showDetails && (
        <div id={controlsId} className="mt-3 border-t border-white/10 pt-3">
          <p className="text-xs leading-5 text-white/55">{statusCopy}</p>
          {state.status === 'missing-local' && (
            <p className="mt-2 text-xs leading-5 text-amber-100/80">
              Connect the enrolled primary wallet to authorize a replacement key for this browser.
            </p>
          )}
          {state.error?.message && (
            <p className="mt-2 text-xs leading-5 text-amber-200" role="alert">{state.error.message}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {state.status === 'active' && (
              state.directPrimaryMode ? (
                <button type="button" disabled={pending} onClick={onUseSession} className="rounded-lg bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50">
                  Use prompt-free moves
                </button>
              ) : (
                <button type="button" disabled={pending} onClick={onUsePrimary} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/75 disabled:opacity-50">
                  Use wallet for moves
                </button>
              )
            )}
            {state.status !== 'active' && state.identity && !state.directPrimaryMode && (
              <button type="button" disabled={pending} onClick={onUsePrimary} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/75 disabled:opacity-50">
                Use wallet for moves
              </button>
            )}
            {canRefresh && (
              <button type="button" disabled={pending} onClick={() => void onRefresh()} className="rounded-lg bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50">
                {state.pendingAction === 'refresh' ? 'Refreshing…' : 'Refresh session'}
              </button>
            )}
            {canRevoke && (
              <button type="button" disabled={pending} onClick={handleRevoke} className="rounded-lg bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100 disabled:opacity-50">
                {state.pendingAction === 'revoke' ? 'Revoking…' : 'Revoke session'}
              </button>
            )}
          </div>

          <details className="mt-3 border-t border-white/10 pt-3 text-xs text-white/55">
            <summary className="cursor-pointer rounded text-white/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
              Advanced diagnostics
            </summary>
            <p className="mt-2 leading-5">
              Safe to share. This view contains public addresses and lifecycle state only—never the session key, signatures, or transaction payloads.
            </p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/25 p-2 font-mono text-[10px] leading-4 text-cyan-100/70">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </aside>
  );
}
