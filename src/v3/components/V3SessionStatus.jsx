import { shortenAddress } from '../../utils/formatters';

const LABELS = {
  disconnected: 'Connect wallet for session moves',
  restoring: 'Checking prompt-free session…',
  missing: 'Prompt-free session not enabled',
  preparing: 'Creating encrypted session…',
  'awaiting-wallet': 'Session ready for wallet confirmation',
  confirming: 'Confirming session on-chain…',
  active: 'Prompt-free moves enabled',
  expired: 'Prompt-free session expired',
  rotated: 'Session was replaced on another device',
  revoked: 'Prompt-free session revoked',
  inactive: 'Session is not active',
  unavailable: 'Session service unavailable',
  error: 'Session setup needs attention',
};

export default function V3SessionStatus({
  state,
  onUsePrimary,
  onUseSession,
  compact = false,
}) {
  const label = state.directPrimaryMode
    ? 'Wallet confirmation mode'
    : (LABELS[state.status] || 'Session status unavailable');
  return (
    <div
      className={`rounded-xl border border-cyan-400/20 bg-slate-950/65 ${compact ? 'px-3 py-2' : 'p-4'}`}
      data-v3-session-status={state.status}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-cyan-100">{label}</p>
          {state.executor && (
            <p className="text-xs text-white/45">Executor {shortenAddress(state.executor)}</p>
          )}
          {state.error?.message && (
            <p className="mt-1 text-xs text-amber-200">{state.error.message}</p>
          )}
        </div>
        {state.status === 'active' && (
          state.directPrimaryMode ? (
            <button type="button" onClick={onUseSession} className="rounded-lg bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100">
              Use prompt-free moves
            </button>
          ) : (
            <button type="button" onClick={onUsePrimary} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/75">
              Use wallet for moves
            </button>
          )
        )}
        {state.status !== 'active' && state.identity && !state.directPrimaryMode && (
          <button type="button" onClick={onUsePrimary} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/75">
            Use wallet for moves
          </button>
        )}
      </div>
    </div>
  );
}
