/**
 * Shared MatchCard Component
 *
 * Displays an individual match within a tournament bracket.
 * Supports escalation display, player icons, and various color themes.
 *
 * ESCALATION LOGIC (simplified - uses contract data directly):
 * - ML2 Timer: isStalled && !escL2Available && isUserAdvanced
 * - ML2 CTA: escL2Available && isUserAdvanced
 * - ML3 Timer: escL2Available && !escL3Available && !isUserAdvanced
 * - ML3 CTA: escL3Available && !isUserAdvanced
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Award, Clock, HelpCircle, Zap, Users, Eye } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { getMatchStatusText, getMatchStatusColor } from '../../utils/matchStatus';
import { calculatePlayerTimes } from '../../utils/timeCalculations';

/**
 * Format seconds into MM:SS display
 */
const formatEscalationTime = (seconds) => {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get border class based on match state
 */
const getBorderClass = (isUserMatch, isStalled, escL2Available, escL3Available, isUserAdvanced, defaultBorder = 'border-purple-400/30 hover:border-purple-400/50') => {
  if (isUserMatch) {
    return 'border-green-400/70 bg-green-900/20';
  }
  // ML3 available for non-advanced players
  if (escL3Available && !isUserAdvanced) {
    return 'border-red-400 bg-red-900/20 animate-pulse';
  }
  // ML2 available for advanced players
  if (escL2Available && isUserAdvanced) {
    return 'border-yellow-400 bg-yellow-900/20';
  }
  // Match is stalled but escalation not yet available
  if (isStalled) {
    return 'border-orange-400 bg-orange-900/20';
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
 * @param {Function} [props.onSpectateMatch] - Handler for spectating a match
 * @param {Function} [props.onForceEliminate] - Handler for force elimination (ML2)
 * @param {Function} [props.onClaimReplacement] - Handler for claiming replacement (ML3)
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
  onSpectateMatch,
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

  // ===== ESCALATION DATA =====
  const isStalled = match.timeoutState?.timeoutActive || false;
  const isUserAdvanced = match.isUserAdvancedForRound || false;

  // Calculate time-based escalation availability
  const now = Math.floor(Date.now() / 1000);
  const esc1Start = match.timeoutState?.escalation1Start || 0;
  const esc2Start = match.timeoutState?.escalation2Start || 0;

  // Time-based availability (contract functions may not work until explicitly triggered)
  // ML2 available when: stalled AND now >= esc1Start
  const escL2Available = isStalled && esc1Start > 0 && now >= esc1Start;
  // ML3 available when: stalled AND now >= esc2Start
  const escL3Available = isStalled && esc2Start > 0 && now >= esc2Start;

  // ML2 countdown (time until escL2 becomes available)
  const timeToML2 = (isStalled && esc1Start > 0 && now < esc1Start) ? esc1Start - now : null;
  // ML3 countdown (time until escL3 becomes available)
  const timeToML3 = (isStalled && esc2Start > 0 && now < esc2Start) ? esc2Start - now : null;

  // Derived display conditions
  // ML2 Timer: Stalled, ML2 not yet available, user is advanced
  const showML2Timer = isStalled && !escL2Available && isUserAdvanced && timeToML2 !== null && timeToML2 > 0;
  // ML2 CTA: ML2 available, user is advanced
  const showML2CTA = escL2Available && isUserAdvanced;
  // ML3 Timer: ML2 available, ML3 not yet available, user is NOT advanced
  const showML3Timer = escL2Available && !escL3Available && !isUserAdvanced && timeToML3 !== null && timeToML3 > 0;
  // ML3 CTA: ML3 available, user is NOT advanced
  const showML3CTA = escL3Available && !isUserAdvanced;

  // Player time display
  const times = calculatePlayerTimes(match, account, match.matchTimePerPlayer);
  const isPlayer1Turn = match.currentTurn?.toLowerCase() === match.player1?.toLowerCase();
  const activePlayerTime = isPlayer1Turn ? times.player1.remaining : times.player2.remaining;
  const timeRemaining = match.matchStatus === 1 ? activePlayerTime : null;

  // Client-side countdown ticking for smoother UI
  const [tickingTimeRemaining, setTickingTimeRemaining] = useState(timeRemaining);
  const lastServerTimeRef = useRef(timeRemaining);
  const lastUpdateRef = useRef(Date.now());

  // Update ticking time when server data changes (on poll)
  useEffect(() => {
    if (timeRemaining !== lastServerTimeRef.current) {
      setTickingTimeRemaining(timeRemaining);
      lastServerTimeRef.current = timeRemaining;
      lastUpdateRef.current = Date.now();
    }
  }, [timeRemaining]);

  // Tick down the countdown every second
  useEffect(() => {
    if (match.matchStatus !== 1 || !showEscalation || timeRemaining === null) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastUpdateRef.current) / 1000);
      const newTime = Math.max(0, lastServerTimeRef.current - elapsedSeconds);
      setTickingTimeRemaining(newTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [match.matchStatus, showEscalation, timeRemaining]);

  const displayTimeRemaining = tickingTimeRemaining !== null ? tickingTimeRemaining : timeRemaining;

  // Debug logging for escalation issues - always log for active matches we're not in
  if (showEscalation && match.matchStatus === 1 && !isUserMatch) {
    console.log(`[MatchCard R${roundIdx}M${matchIdx}] Escalation Debug:`, {
      // Raw contract data
      'match.timeoutState': match.timeoutState,
      'match.escL2Available': match.escL2Available,
      'match.escL3Available': match.escL3Available,
      'match.isUserAdvancedForRound': match.isUserAdvancedForRound,
      // Derived state
      isStalled,
      escL2Available,
      escL3Available,
      isUserAdvanced,
      // Timestamps
      esc1Start,
      esc2Start,
      now,
      timeToML2,
      timeToML3,
      // Display conditions
      showML2Timer,
      showML2CTA,
      showML3Timer,
      showML3CTA,
    });
  }

  // Get border class
  const borderClass = showEscalation
    ? getBorderClass(isUserMatch, isStalled, escL2Available, escL3Available, isUserAdvanced, colors.defaultBorder)
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
          {/* Move timer */}
          {showEscalation && displayTimeRemaining !== null && match.matchStatus === 1 && (
            <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
              displayTimeRemaining === 0 ? 'bg-red-500/30 text-red-300 animate-pulse' :
              displayTimeRemaining <= 10 ? 'bg-red-500/20 text-red-300' :
              displayTimeRemaining <= 30 ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-blue-500/20 text-blue-300'
            }`}>
              {Math.floor(displayTimeRemaining / 60)}:{(displayTimeRemaining % 60).toString().padStart(2, '0')}
            </span>
          )}
          {/* Status */}
          <span className={`text-xs font-bold ${getMatchStatusColor(match.matchStatus, match.winner, match.isDraw, matchStatusOptions)}`}>
            {getMatchStatusText(match.matchStatus, match.winner, match.isDraw, matchStatusOptions)}
          </span>
        </div>
      </div>

      {/* Escalation countdown timers - show only the next pending timer */}
      {showEscalation && match.matchStatus === 1 && isStalled && !isUserMatch && (
        <div className="mb-3">
          {/* ML2 Timer: Stalled but ML2 not yet available - Advanced Players Only */}
          {showML2Timer && (
            <div className="relative bg-gradient-to-r from-yellow-500/20 to-orange-600/20 border border-yellow-400/50 rounded-lg p-3">
              <div className="flex items-center justify-between pr-6">
                <div className="flex items-center gap-2">
                  <Clock className="text-yellow-400" size={16} />
                  <span className="text-yellow-300 text-xs font-semibold">
                    ML2: Force Eliminate in {formatEscalationTime(timeToML2)}
                  </span>
                </div>
              </div>
              <a
                href="#ml2"
                className="absolute top-3 right-3 text-yellow-400 hover:text-yellow-300 transition-colors"
                title="Learn more about force elimination"
              >
                <HelpCircle size={16} />
              </a>
            </div>
          )}
          {/* ML3 Timer: ML2 available but ML3 not yet - Non-Advanced Players Only */}
          {showML3Timer && (
            <div className="relative bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/50 rounded-lg p-3">
              <div className="flex items-center justify-between pr-6">
                <div className="flex items-center gap-2">
                  <Clock className="text-red-400" size={16} />
                  <span className="text-red-300 text-xs font-semibold">
                    ML3: Replace Players in {formatEscalationTime(timeToML3)}
                  </span>
                </div>
              </div>
              <a
                href="#ml3"
                className="absolute top-3 right-3 text-red-400 hover:text-red-300 transition-colors"
                title="Learn more about replacing players"
              >
                <HelpCircle size={16} />
              </a>
            </div>
          )}
        </div>
      )}

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

        {/* Spectate Button for non-participants (active matches only) */}
        {!isUserMatch && match.matchStatus === 1 && onSpectateMatch && (
          <button
            onClick={() => onSpectateMatch(tierId, instanceId, roundIdx, matchIdx)}
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-600/90 hover:to-purple-600/90 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            Spectate Match
          </button>
        )}

        {/* Escalation CTAs for outsiders */}
        {showEscalation && !isUserMatch && match.matchStatus !== 2 && (
          <>
            {/* ML2: Force Eliminate (Advanced Players Only) */}
            {showML2CTA && onForceEliminate && (
              <div className="mt-2">
                <button
                  onClick={() => onForceEliminate({
                    tierId,
                    instanceId,
                    roundNumber: roundIdx,
                    matchNumber: matchIdx
                  })}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                >
                  <Zap size={14} />
                  {loading ? 'Eliminating...' : 'ML2: Force Eliminate Both'}
                </button>
                <a
                  href="#ml2"
                  className="block w-full text-center text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 text-xs mt-2 py-2 px-4 rounded-lg border border-yellow-400/30 hover:border-yellow-400/50 transition-all"
                >
                  Learn more about ML2 (Force Eliminate)
                </a>
              </div>
            )}

            {/* ML3: Replace Both Players (Non-Advanced Players Only) */}
            {showML3CTA && onClaimReplacement && (
              <div className="mt-2">
                <button
                  onClick={() => onClaimReplacement({
                    tierId,
                    instanceId,
                    roundNumber: roundIdx,
                    matchNumber: matchIdx
                  })}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                >
                  <Users size={14} />
                  {loading ? 'Claiming...' : 'ML3: Replace & Claim Match'}
                </button>
                <a
                  href="#ml3"
                  className="block w-full text-center text-red-300 hover:text-red-200 hover:bg-red-500/10 text-xs mt-2 py-2 px-4 rounded-lg border border-red-400/30 hover:border-red-400/50 transition-all"
                >
                  Learn more about ML3 (Replace Players)
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MatchCard;
