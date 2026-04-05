/**
 * MatchTimeoutEscalation - Shared component for in-match timeout escalation UI
 *
 * Displays timeout status and escalation buttons for stalled matches:
 * - Level 1: Opponent claims timeout win
 * - Level 2: Advanced player force eliminates both (ML2)
 * - Level 3: Non-advanced player replaces both and advances (ML3)
 *
 * ESCALATION LOGIC (uses contract data directly):
 * - Participant in stalled match: ML1 only
 * - ML2 CTA: escL2Available && isUserAdvanced
 * - ML3 CTA: escL3Available && !isUserAdvanced
 */

import { Clock } from 'lucide-react';
import UserManualAnchorLink, { linkifyReasonText } from './UserManualAnchorLink';
import { getUserManualHrefForReasonCode } from '../../utils/userManualLinks';

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
  // Contract-provided escalation availability
  escL2Available = false,
  escL3Available = false,
  isUserAdvancedForRound = false,
  isUserMatch = false,
  // Hide ML1 button on mobile (it's shown in the timer row instead)
  hideML1OnMobile = false,
}) => {
  // Only render when timeout is active and match is in progress
  if (!timeoutState || !timeoutState.timeoutActive || matchStatus !== 1) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const { escalation1Start, escalation2Start } = timeoutState;

  const timeToEsc1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
  const timeToEsc2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;

  // Level 1 (Claim Timeout Victory): Available immediately when timeout occurs
  const canClaimTimeout = !isYourTurn;

  // Participants in the stalled match should only ever see ML1.
  const canShowOutsideEscalations = !isUserMatch;

  // Level 2 (Force Eliminate): Use contract flag, only for advanced players
  const canForceEliminate = canShowOutsideEscalations && escL2Available && isUserAdvancedForRound;

  // Level 3 (Replace Players): Use contract flag, only for non-advanced players
  const canReplace = canShowOutsideEscalations && escL3Available && !isUserAdvancedForRound;

  // Debug logging for escalation timing
  console.log('MatchTimeoutEscalation:', {
    escL2Available,
    escL3Available,
    isUserAdvancedForRound,
    isUserMatch,
    canClaimTimeout,
    canForceEliminate,
    canReplace,
    timeToEsc1,
    timeToEsc2,
  });

  return (
    <div className="bg-orange-500/20 border border-orange-400 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="text-orange-400" size={20} />
        <span className="text-orange-300 font-bold text-sm">Match Timeout Active</span>
      </div>

      {/* Escalation 1: Claim Timeout Victory */}
      {canClaimTimeout && (
        <button
          onClick={onClaimTimeoutWin}
          disabled={loading}
          className={`w-full mb-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50 ${hideML1OnMobile ? 'hidden lg:block' : ''}`}
        >
          Claim Timeout Victory
        </button>
      )}

      {/* Countdown timers */}
      <div className="space-y-1 text-xs">
        {canShowOutsideEscalations && timeToEsc1 > 0 && !escL2Available && (
          <div className="text-orange-300">
            {linkifyReasonText(`ML2 in: ${formatEscalationTime(timeToEsc1)}`, {
              keyPrefix: 'match-timeout-ml2-in',
              linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white',
            })}
          </div>
        )}
        {canShowOutsideEscalations && timeToEsc2 > 0 && !escL3Available && (
          <div className="text-orange-300">
            {linkifyReasonText(`ML3 in: ${formatEscalationTime(timeToEsc2)}`, {
              keyPrefix: 'match-timeout-ml3-in',
              linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white',
            })}
          </div>
        )}
        {canClaimTimeout && <div className="text-green-400 font-bold">Level 1 Active - Opponent Can Claim</div>}
        {canShowOutsideEscalations && escL2Available && isUserAdvancedForRound && (
          <div className="text-yellow-400 font-bold">
            {linkifyReasonText('ML2 Active - You Can Force Eliminate', {
              keyPrefix: 'match-timeout-ml2-active-you',
              linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white',
            })}
          </div>
        )}
        {canShowOutsideEscalations && escL2Available && !isUserAdvancedForRound && (
          <div className="text-yellow-400">
            {linkifyReasonText('ML2 Active (Advanced Players Only)', {
              keyPrefix: 'match-timeout-ml2-active-advanced',
              linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white',
            })}
          </div>
        )}
        {canShowOutsideEscalations && escL3Available && !isUserAdvancedForRound && (
          <div className="text-red-400 font-bold">
            {linkifyReasonText('ML3 Active - You Can Replace & Claim', {
              keyPrefix: 'match-timeout-ml3-active-you',
              linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white',
            })}
          </div>
        )}
        {canShowOutsideEscalations && escL3Available && isUserAdvancedForRound && (
          <div className="text-red-400">
            {linkifyReasonText('ML3 Active (Not Available to Advanced Players)', {
              keyPrefix: 'match-timeout-ml3-active-not-advanced',
              linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white',
            })}
          </div>
        )}
      </div>

      {/* ML2: Force Eliminate (Advanced Players Only) */}
      {canForceEliminate && (
        <>
          <button
            onClick={onForceEliminate}
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
          >
            Force Eliminate Both
          </button>
          <UserManualAnchorLink
            href={getUserManualHrefForReasonCode('ML2')}
            className="mt-2 block text-center text-xs text-yellow-200 hover:text-yellow-100 underline decoration-dotted underline-offset-2"
          >
            {linkifyReasonText('Learn more about ML2 (Force Eliminate)', {
              keyPrefix: 'match-timeout-ml2-learn',
            })}
          </UserManualAnchorLink>
        </>
      )}

      {/* ML3: Replace Both Players (Non-Advanced Players Only) */}
      {canReplace && (
        <>
          <button
            onClick={onClaimReplacement}
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
          >
            Replace Both & Advance
          </button>
          <UserManualAnchorLink
            href={getUserManualHrefForReasonCode('ML3')}
            className="mt-2 block text-center text-xs text-red-200 hover:text-red-100 underline decoration-dotted underline-offset-2"
          >
            {linkifyReasonText('Learn more about ML3 (Replace Players)', {
              keyPrefix: 'match-timeout-ml3-learn',
            })}
          </UserManualAnchorLink>
        </>
      )}
    </div>
  );
};

export default MatchTimeoutEscalation;
