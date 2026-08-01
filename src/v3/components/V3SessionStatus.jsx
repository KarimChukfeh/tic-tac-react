import { canSubmitSessionMove, isSessionNearExpiry } from '../session/sessionState';

function formatRemaining(seconds) {
  const remaining = Number(seconds || 0n);
  if (remaining <= 0) return '';
  if (remaining < 60) return `${remaining}s left`;
  const minutes = Math.floor(remaining / 60);
  if (minutes < 60) return `${minutes}m ${remaining % 60}s left`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
}

export function getV3MoveCostView({
  state,
  hasActiveMatch,
  isPlayerTurn,
  runtimeReady = true,
  estimatedGasCost = '0 ETH',
  estimatedGasCostUsd = null,
}) {
  const promptFreeReady = runtimeReady && canSubmitSessionMove(state);

  if (!hasActiveMatch) {
    return {
      tone: 'idle',
      eyebrow: 'NEXT MOVE',
      title: 'Waiting for an active match',
      value: '—',
      detail: 'Your gas estimate will appear here when a match is ready.',
    };
  }

  if (!isPlayerTurn) {
    return {
      tone: 'waiting',
      eyebrow: 'MATCH STATUS',
      title: 'Waiting for your opponent',
      value: 'Their turn',
      detail: '',
    };
  }

  if (promptFreeReady) {
    return {
      tone: 'ready',
      eyebrow: 'ESTIMATED GAS COST',
      title: estimatedGasCostUsd || '',
      value: estimatedGasCost || 'Calculating…',
      detail: '',
    };
  }

  if (['restoring', 'preparing', 'awaiting-wallet', 'confirming'].includes(state?.status)) {
    return {
      tone: 'checking',
      eyebrow: 'NEXT MOVE',
      title: 'Checking prompt-free moves',
      value: 'Checking…',
      detail: 'No action is needed while this check finishes.',
    };
  }

  return {
    tone: 'attention',
    eyebrow: 'NEXT MOVE GAS',
    title: 'Wallet confirmation required',
    value: 'Cannot estimate',
    detail: '',
  };
}

function sessionNotice(state, nearExpiry) {
  if (state.pendingAction === 'refresh') {
    return 'Confirm in your wallet to restore prompt-free moves.';
  }
  if (state.pendingAction === 'revoke') {
    return 'Confirm in your wallet to turn off prompt-free moves.';
  }
  if (state.directPrimaryMode) {
    return 'Your next move will open your wallet for confirmation.';
  }
  if (state.status === 'active' && nearExpiry) {
    return `Prompt-free moves expire soon${state.secondsRemaining ? ` · ${formatRemaining(state.secondsRemaining)}` : ''}.`;
  }
  if (state.status === 'missing-local') {
    return '';
  }
  if (state.status === 'expired') {
    return 'Prompt-free moves expired. Make your move to restore them with one wallet confirmation.';
  }
  if (state.status === 'rotated') {
    return 'Prompt-free moves were replaced in another browser. Make your move to restore them here.';
  }
  if (state.status === 'revoked') {
    return 'Prompt-free moves were turned off. Make your move to restore them with one wallet confirmation.';
  }
  if (state.status === 'missing' || state.status === 'inactive') {
    return 'Prompt-free moves are not ready for this match. Make your move to set them up with one wallet confirmation.';
  }
  if (state.status === 'unavailable' || state.status === 'error') {
    return 'Prompt-free moves cannot connect right now. Make your move and your wallet will guide the one-time confirmation.';
  }
  return '';
}

export default function V3SessionStatus({
  state,
  hasActiveMatch = false,
  isPlayerTurn = false,
  runtimeReady = true,
  estimatedGasCost = '0 ETH',
  estimatedGasCostUsd = null,
}) {
  if (hasActiveMatch && !isPlayerTurn) return null;

  const nearExpiry = isSessionNearExpiry(state);
  const pending = Boolean(state.pendingAction);
  const moveCost = getV3MoveCostView({
    state,
    hasActiveMatch,
    isPlayerTurn,
    runtimeReady,
    estimatedGasCost,
    estimatedGasCostUsd,
  });
  const notice = sessionNotice(state, nearExpiry);

  return (
    <aside
      className="rounded-2xl border border-cyan-300/25 bg-slate-950/95 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.55)] backdrop-blur"
      data-v3-session-status={state.status}
      data-v3-move-cost-tone={moveCost.tone}
      aria-busy={pending ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/60">
            {moveCost.eyebrow}
          </p>
          {moveCost.title && (
            <p className="mt-1 text-xs text-white/55" role="status" aria-live="polite">
              {moveCost.title}
            </p>
          )}
        </div>
        <p className={`shrink-0 text-right font-bold ${moveCost.tone === 'attention' ? 'text-amber-200' : moveCost.tone === 'ready' ? 'text-emerald-300' : 'text-cyan-100'}`}>
          {moveCost.value}
        </p>
      </div>

      {moveCost.detail && (
        <p className="mt-2 text-xs leading-5 text-white/60">{moveCost.detail}</p>
      )}

      {notice && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/70">
          {notice}
        </p>
      )}

    </aside>
  );
}
