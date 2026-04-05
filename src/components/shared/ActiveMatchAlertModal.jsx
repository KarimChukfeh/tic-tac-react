import React, { useCallback, useEffect, useRef, useState } from 'react';

// Tier configuration to determine tournament type
const TIER_CONFIG = {
  0: { playerCount: 2 },
  1: { playerCount: 4 },
  2: { playerCount: 8 }
};

const DEFAULT_AUTO_DISMISS_POLL_MS = 1000;
const DEFAULT_FADE_DURATION_MS = 300;

const ActiveMatchAlertModal = ({
  match,
  onClose,
  onDismiss,
  onEnterMatch,
  autoDismiss = false,
  autoDismissPollMs = DEFAULT_AUTO_DISMISS_POLL_MS,
  fadeDurationMs = DEFAULT_FADE_DURATION_MS,
}) => {
  const [isAutoDismissing, setIsAutoDismissing] = useState(false);
  const autoDismissStartedRef = useRef(false);
  const autoDismissRef = useRef(autoDismiss);
  const dismissTimerRef = useRef(null);
  const handleDismiss = onClose || onDismiss;

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const startAutoDismiss = useCallback(() => {
    if (autoDismissStartedRef.current) return;

    autoDismissStartedRef.current = true;
    setIsAutoDismissing(true);
    clearDismissTimer();

    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      handleDismiss?.();
    }, fadeDurationMs);
  }, [clearDismissTimer, fadeDurationMs, handleDismiss]);

  useEffect(() => {
    autoDismissRef.current = autoDismiss;
  }, [autoDismiss]);

  useEffect(() => {
    autoDismissStartedRef.current = false;
    setIsAutoDismissing(false);
    clearDismissTimer();

    return () => {
      clearDismissTimer();
    };
  }, [match, clearDismissTimer]);

  useEffect(() => {
    if (!match) return undefined;

    const intervalId = setInterval(() => {
      if (autoDismissRef.current) {
        startAutoDismiss();
      }
    }, autoDismissPollMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [match, autoDismissPollMs, startAutoDismiss]);

  if (!match) return null;

  const handleGoToMatch = () => {
    clearDismissTimer();
    // Call the parent's onEnterMatch handler (handlePlayMatch from the game component)
    if (onEnterMatch) {
      onEnterMatch(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
    }
    handleDismiss?.();
  };

  const tierNames = {
    0: 'Tic-Tac-Toe',
    1: 'Chess',
    2: 'Connect Four'
  };

  // Determine if it's a duel or tournament
  const playerCount = TIER_CONFIG[match.tierId]?.playerCount || 2;
  const tournamentType = playerCount === 2 ? 'Duel' : 'Tournament';

  return (
    <div className="fixed bottom-20 left-0 right-0 z-[70] p-4">
      <div
        className={`max-w-3xl mx-auto bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-xl shadow-2xl border-2 border-amber-600/50 [animation:glow-pulse-amber_2s_ease-in-out_infinite] ${
          isAutoDismissing ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
        style={{ transition: `opacity ${fadeDurationMs}ms ease, transform ${fadeDurationMs}ms ease` }}
      >
        <div className="flex flex-col gap-4 p-4 md:p-6">
          {/* Text */}
          <div className="text-white">
            <h3 className="font-bold text-2xl md:text-3xl">
              Time to Play!
            </h3>
            <p className="text-base md:text-lg text-amber-100 mt-1">
              You're in an active match vs{' '}
              <span className="font-mono font-semibold text-amber-200">
                {match.opponent?.slice(0, 6)}...{match.opponent?.slice(-4)}
              </span>
              {match.isMyTurn && (
                <span className="ml-2 font-semibold text-yellow-300">— It's your turn!</span>
              )}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleGoToMatch}
              className="w-3/4 bg-white hover:bg-yellow-50 text-amber-900 font-semibold text-lg md:text-xl py-2.5 px-4 rounded-lg shadow-lg hover:scale-105 transition-all duration-200"
            >
              Go to Match
            </button>
            <button
              onClick={handleDismiss}
              className="w-1/4 text-white/80 hover:text-white font-medium py-1.5 px-4 transition-all duration-200"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveMatchAlertModal;
