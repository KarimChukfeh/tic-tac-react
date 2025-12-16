/**
 * MatchTimeoutEscalation - Shared component for in-match timeout escalation UI
 *
 * Displays timeout status and escalation buttons for stalled matches:
 * - Escalation 1: Opponent claims timeout win
 * - Escalation 2: Higher-ranked player force eliminates both
 * - Escalation 3: Anyone can replace both players and advance
 */

import { Clock } from 'lucide-react';

const formatEscalationTime = (secs) => {
  const mins = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${mins}:${seconds.toString().padStart(2, '0')}`;
};

const MatchTimeoutEscalation = ({
  timeoutState,
  matchStatus,
  isYourTurn,
  onClaimTimeoutWin,
  onForceEliminate,
  onClaimReplacement,
  loading
}) => {
  // Only render when timeout is active and match is in progress
  if (!timeoutState || !timeoutState.timeoutActive || matchStatus !== 1) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const { escalation1Start, escalation2Start, escalation3Start, activeEscalation } = timeoutState;

  const timeToEsc1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
  const timeToEsc2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;
  const timeToEsc3 = escalation3Start > 0 ? Math.max(0, escalation3Start - now) : 0;

  const canClaimTimeout = activeEscalation >= 1 && !isYourTurn;
  const canForceEliminate = activeEscalation >= 2;
  const canReplace = activeEscalation >= 3;

  return (
    <div className="bg-orange-500/20 border border-orange-400 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="text-orange-400" size={20} />
        <span className="text-orange-300 font-bold text-sm">Match Timeout Active</span>
      </div>

      {/* Escalation 1 */}
      {activeEscalation >= 1 && canClaimTimeout && (
        <button
          onClick={onClaimTimeoutWin}
          disabled={loading}
          className="w-full mb-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
        >
          Claim Timeout Victory
        </button>
      )}

      {/* Countdown timers */}
      <div className="space-y-1 text-xs">
        {timeToEsc1 > 0 && activeEscalation < 1 && (
          <div className="text-orange-300">Esc 1 in: {formatEscalationTime(timeToEsc1)}</div>
        )}
        {timeToEsc2 > 0 && activeEscalation < 2 && (
          <div className="text-orange-300">Esc 2 in: {formatEscalationTime(timeToEsc2)}</div>
        )}
        {timeToEsc3 > 0 && activeEscalation < 3 && (
          <div className="text-orange-300">Esc 3 in: {formatEscalationTime(timeToEsc3)}</div>
        )}
        {activeEscalation >= 1 && <div className="text-green-400 font-bold">Escalation 1 Active</div>}
        {activeEscalation >= 2 && <div className="text-yellow-400 font-bold">Escalation 2 Active</div>}
        {activeEscalation >= 3 && <div className="text-red-400 font-bold">Escalation 3 Active</div>}
      </div>

      {/* Escalation 2 */}
      {canForceEliminate && (
        <button
          onClick={onForceEliminate}
          disabled={loading}
          className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
        >
          Force Eliminate Both (Higher Rank)
        </button>
      )}

      {/* Escalation 3 */}
      {canReplace && (
        <button
          onClick={onClaimReplacement}
          disabled={loading}
          className="w-full mt-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
        >
          Replace Both Players & Advance
        </button>
      )}
    </div>
  );
};

export default MatchTimeoutEscalation;
