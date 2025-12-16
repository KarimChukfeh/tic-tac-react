/**
 * Shared MatchCard Component
 *
 * Displays an individual match within a tournament bracket.
 * Supports escalation display, player icons, and various color themes.
 */

import { Play, Award } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { getMatchStatusText, getMatchStatusColor } from '../../utils/matchStatus';

// Constants
const MOVE_TIMEOUT = 60; // 60 seconds

/**
 * Calculate escalation state for a match
 */
const calculateEscalationState = (match) => {
  const now = Math.floor(Date.now() / 1000);
  const timeReference = match.lastMoveTime > 0 ? match.lastMoveTime : match.startTime;
  const timeSinceLastMove = timeReference > 0 ? now - timeReference : 0;
  const timeRemaining = timeReference > 0 ? Math.max(0, MOVE_TIMEOUT - timeSinceLastMove) : null;
  const isTimeout = timeRemaining !== null && timeRemaining === 0;

  // Check escalation status from contract
  const hasEscalation = match.timeoutState && match.timeoutState.timeoutActive;
  const activeEscalation = match.timeoutState?.activeEscalation || 0;

  // Calculate client-side escalation based on time
  let clientEscalation = 0;
  if (!hasEscalation && isTimeout && match.matchStatus === 1) {
    const timeoutDuration = timeSinceLastMove - MOVE_TIMEOUT;
    if (timeoutDuration >= 180) clientEscalation = 3;
    else if (timeoutDuration >= 120) clientEscalation = 2;
    else if (timeoutDuration >= 60) clientEscalation = 1;
  }

  const effectiveEscalation = hasEscalation ? activeEscalation : clientEscalation;

  return {
    timeRemaining,
    isTimeout,
    hasEscalation,
    effectiveEscalation,
    canForceEliminate: effectiveEscalation >= 2,
    canReplace: effectiveEscalation >= 3,
  };
};

/**
 * Get border class based on match state
 */
const getBorderClass = (isUserMatch, escalation, defaultBorder = 'border-purple-400/30 hover:border-purple-400/50') => {
  if (isUserMatch) {
    return 'border-green-400/70 bg-green-900/20';
  }
  if (escalation.canReplace) {
    return 'border-red-400 bg-red-900/20 animate-pulse';
  }
  if (escalation.canForceEliminate) {
    return 'border-yellow-400 bg-yellow-900/20';
  }
  if (escalation.hasEscalation) {
    return 'border-orange-400 bg-orange-900/20';
  }
  if (escalation.isTimeout) {
    return 'border-orange-400/60 bg-orange-900/10';
  }
  return defaultBorder;
};

/**
 * @param {Object} props
 * @param {Object} props.match - Match data object
 * @param {number} props.matchIdx - Match index in the round
 * @param {number} props.roundIdx - Round index
 * @param {number} props.tierId - Tournament tier ID
 * @param {number} props.instanceId - Tournament instance ID
 * @param {string|null} props.account - Current user's address
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onEnterMatch - Handler for entering a match
 * @param {Function} [props.onForceEliminate] - Handler for force elimination (escalation 2)
 * @param {Function} [props.onClaimReplacement] - Handler for claiming replacement (escalation 3)
 * @param {Object} [props.playerIcons] - Custom player icons { player1: string, player2: string }
 * @param {Object} [props.matchStatusOptions] - Options for match status display
 * @param {boolean} [props.showEscalation=true] - Whether to show escalation features
 * @param {boolean} [props.showThisIsYou=false] - Whether to show "THIS IS YOU" label
 * @param {Object} [props.colors] - Color theme overrides
 */
const MatchCard = ({
  match,
  matchIdx,
  roundIdx,
  tierId,
  instanceId,
  account,
  loading,
  onEnterMatch,
  onForceEliminate,
  onClaimReplacement,
  playerIcons,
  matchStatusOptions = {},
  showEscalation = true,
  showThisIsYou = false,
  colors = {},
}) => {
  const isUserMatch =
    match.player1?.toLowerCase() === account?.toLowerCase() ||
    match.player2?.toLowerCase() === account?.toLowerCase();

  const isPlayer1 = match.player1?.toLowerCase() === account?.toLowerCase();
  const isPlayer2 = match.player2?.toLowerCase() === account?.toLowerCase();

  // Calculate escalation state
  const escalation = showEscalation ? calculateEscalationState(match) : {
    timeRemaining: null,
    isTimeout: false,
    hasEscalation: false,
    effectiveEscalation: 0,
    canForceEliminate: false,
    canReplace: false,
  };

  // Get border class
  const borderClass = showEscalation
    ? getBorderClass(isUserMatch, escalation, colors.defaultBorder)
    : isUserMatch
    ? 'border-green-400/70 bg-green-900/20'
    : colors.defaultBorder || 'border-purple-400/30 hover:border-purple-400/50';

  // Player 1 background class
  const getPlayer1BgClass = () => {
    if (match.winner?.toLowerCase() === match.player1?.toLowerCase()) {
      return 'bg-green-500/20 border border-green-400/50';
    }
    if (isPlayer1) {
      return colors.player1CurrentUser || 'bg-yellow-500/20 border border-yellow-400/50';
    }
    return colors.player1Default || 'bg-purple-500/10';
  };

  // Player 2 background class
  const getPlayer2BgClass = () => {
    if (match.winner?.toLowerCase() === match.player2?.toLowerCase()) {
      return 'bg-green-500/20 border border-green-400/50';
    }
    if (isPlayer2) {
      return colors.player2CurrentUser || 'bg-yellow-500/20 border border-yellow-400/50';
    }
    return colors.player2Default || 'bg-purple-500/10';
  };

  return (
    <div className={`bg-black/30 rounded-xl p-4 border-2 transition-all ${borderClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={colors.matchLabel || "text-purple-300 text-sm font-semibold"}>
          Match {matchIdx + 1}
        </span>
        <div className="flex items-center gap-2">
          {/* Escalation badge in header */}
          {showEscalation && escalation.effectiveEscalation > 0 && (
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              escalation.canReplace ? 'bg-red-500/30 text-red-300' :
              escalation.canForceEliminate ? 'bg-yellow-500/30 text-yellow-300' :
              'bg-orange-500/30 text-orange-300'
            }`}>
              ESC {escalation.effectiveEscalation}
            </span>
          )}
          {/* Move timer */}
          {showEscalation && escalation.effectiveEscalation === 0 && escalation.timeRemaining !== null && match.matchStatus === 1 && (
            <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
              escalation.timeRemaining === 0 ? 'bg-red-500/30 text-red-300 animate-pulse' :
              escalation.timeRemaining <= 10 ? 'bg-red-500/20 text-red-300' :
              escalation.timeRemaining <= 30 ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-blue-500/20 text-blue-300'
            }`}>
              {Math.floor(escalation.timeRemaining / 60)}:{(escalation.timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          )}
          {/* Status */}
          <span className={`text-xs font-bold ${getMatchStatusColor(match.matchStatus, match.winner, match.isDraw, matchStatusOptions)}`}>
            {getMatchStatusText(match.matchStatus, match.winner, match.isDraw, matchStatusOptions)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Player 1 */}
        <div className={`flex items-center justify-between p-2 rounded ${getPlayer1BgClass()}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {playerIcons?.player1 && <span className="text-lg">{playerIcons.player1}</span>}
              <span className="text-white font-mono text-sm">
                {shortenAddress(match.player1)}
              </span>
            </div>
            {showThisIsYou && isPlayer1 && (
              <span className="text-yellow-300 text-xs font-bold mt-0.5">THIS IS YOU</span>
            )}
          </div>
          {match.winner?.toLowerCase() === match.player1?.toLowerCase() && (
            <Award className="text-green-400" size={16} />
          )}
        </div>

        <div className={colors.vsText || "text-center text-purple-400 font-bold"}>VS</div>

        {/* Player 2 */}
        <div className={`flex items-center justify-between p-2 rounded ${getPlayer2BgClass()}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {playerIcons?.player2 && <span className="text-lg">{playerIcons.player2}</span>}
              <span className="text-white font-mono text-sm">
                {shortenAddress(match.player2)}
              </span>
            </div>
            {showThisIsYou && isPlayer2 && (
              <span className="text-yellow-300 text-xs font-bold mt-0.5">THIS IS YOU</span>
            )}
          </div>
          {match.winner?.toLowerCase() === match.player2?.toLowerCase() && (
            <Award className="text-green-400" size={16} />
          )}
        </div>

        {/* Enter Match Button for user's matches */}
        {isUserMatch && match.matchStatus !== 2 && (
          <button
            onClick={() => onEnterMatch(tierId, instanceId, roundIdx, matchIdx)}
            disabled={loading || match.matchStatus === 0}
            className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <Play size={16} />
            {match.matchStatus === 0 ? 'Waiting to Start' : 'Enter Match'}
          </button>
        )}

        {/* Escalation CTAs for outsiders */}
        {showEscalation && !isUserMatch && match.matchStatus !== 2 && (
          <>
            {/* Escalation 2: Force Eliminate */}
            {escalation.canForceEliminate && onForceEliminate && (
              <div className="mt-2">
                <button
                  onClick={() => onForceEliminate({
                    tierId,
                    instanceId,
                    roundNumber: roundIdx,
                    matchNumber: matchIdx
                  })}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Force Eliminate (Higher Rank)
                </button>
                <p className="text-xs text-yellow-300 mt-1 text-center">
                  Escalation 2: Eliminate both stalled players
                </p>
              </div>
            )}

            {/* Escalation 3: Replace Both Players */}
            {escalation.canReplace && onClaimReplacement && (
              <div className="mt-2">
                <button
                  onClick={() => onClaimReplacement({
                    tierId,
                    instanceId,
                    roundNumber: roundIdx,
                    matchNumber: matchIdx
                  })}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 animate-pulse flex items-center justify-center gap-2"
                >
                  Claim Match & Replace Both
                </button>
                <p className="text-xs text-red-300 mt-1 text-center">
                  Escalation 3: Take this match slot and advance!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MatchCard;
