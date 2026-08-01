import { useEffect, useId, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

export default function CenteredErrorFlash({ message, onDismiss, durationMs = 0 }) {
  const dialogRef = useRef(null);
  const dismissRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useAccessibleDialog({
    isOpen: Boolean(message),
    dialogRef,
    initialFocusRef: dismissRef,
    onClose: onDismiss,
  });

  useEffect(() => {
    if (!message || !durationMs || durationMs <= 0) return undefined;
    const timeoutId = window.setTimeout(() => {
      onDismiss?.();
    }, durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.12),transparent_58%)]" />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-rose-400/50 bg-gradient-to-br from-slate-950/95 via-rose-950/90 to-slate-950/95 shadow-[0_0_40px_rgba(244,63,94,0.18)]"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-500 via-red-300 to-rose-500" />
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss error message"
        >
          <X size={16} />
        </button>
        <div className="flex flex-col items-center gap-4 px-6 py-6 text-center sm:px-8 sm:py-7">
          <div className="rounded-full border border-rose-300/25 bg-rose-500/15 p-3 text-rose-200 shadow-[0_0_20px_rgba(251,113,133,0.18)]">
            <AlertCircle size={26} />
          </div>
          <div className="space-y-3">
            <div id={titleId} className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-200/90 sm:text-xs">
              Action Needs Attention
            </div>
            <p id={messageId} className="text-lg font-semibold leading-relaxed text-white sm:text-xl">
              {message}
            </p>
          </div>
          <button
            ref={dismissRef}
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-400"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
