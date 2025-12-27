/**
 * MatchTimeoutEscalation - Shared component for in-match timeout escalation UI
 *
 * Displays timeout status and escalation buttons for stalled matches:
 * - Escalation 1: Opponent claims timeout win
 * - Escalation 2: Higher-ranked player force eliminates both
 * - Escalation 3: Anyone can replace both players and advance
 */

import { Clock } from 'lucide-react';
import { isAdvancedPlayer } from '../../utils/tournamentHelpers';

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
  loading,
  tournamentRounds = null,
  currentAccount = null,
  currentRoundNumber = 0,
}) => {
  // Only render when timeout is active and match is in progress
  if (!timeoutState || !timeoutState.timeoutActive || matchStatus !== 1) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const { escalation1Start, escalation2Start } = timeoutState;

  const timeToEsc1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
  const timeToEsc2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;

  // Check escalation availability based on time windows (not history)
  // IMPORTANT: Contract naming is offset by one!
  //   escalation1Start = when Level 2 becomes available
  //   escalation2Start = when Level 3 becomes available

  // Level 1 (Claim Timeout Victory): Available immediately when timeout occurs (before escalation1Start)
  const canClaimTimeout = !isYourTurn;

  // Level 2 (Force Eliminate): Active from escalation1Start to escalation2Start (then expires)
  const canForceEliminate = escalation1Start > 0 && now >= escalation1Start &&
                            escalation2Start > 0 && now < escalation2Start;

  // Level 3 (Replace Players): Active from escalation2Start onwards (never expires)
  const canReplace = escalation2Start > 0 && now >= escalation2Start;

  // Check if current user is an advanced player (for Level 2 escalation)
  const isUserAdvancedPlayer = tournamentRounds && currentAccount
    ? isAdvancedPlayer(tournamentRounds, currentAccount, currentRoundNumber)
    : false;

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
        {timeToEsc1 > 0 && now < escalation1Start && (
          <div className="text-orange-300">Level 2 in: {formatEscalationTime(timeToEsc1)}</div>
        )}
        {timeToEsc2 > 0 && now < escalation2Start && (
          <div className="text-orange-300">Level 3 in: {formatEscalationTime(timeToEsc2)}</div>
        )}
        {canClaimTimeout && <div className="text-green-400 font-bold">Level 1 Active - Opponent Can Claim</div>}
        {canForceEliminate && <div className="text-yellow-400 font-bold">Level 2 Active - Advanced Players Can Eliminate</div>}
        {canReplace && <div className="text-red-400 font-bold">Level 3 Active - Anyone Can Replace</div>}
      </div>

      {/* Escalation 2: Advanced Players Only */}
      {canForceEliminate && isUserAdvancedPlayer && (
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
