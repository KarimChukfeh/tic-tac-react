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
 * @param {string} [props.gameName] - Game name ('tictactoe', 'chess', 'connect4')
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
  gameName,
  isTournamentCompleted = false,
}) => {
  // Handle both matchStatus and status field names (V1 vs V2)
  const matchStatus = match.matchStatus ?? match.status;

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
  const player1TimeRemaining = matchStatus === 1 ? times.player1.remaining : null;
  const player2TimeRemaining = matchStatus === 1 ? times.player2.remaining : null;

  // Client-side countdown ticking for smoother UI - separate for each player
  const [tickingPlayer1Time, setTickingPlayer1Time] = useState(player1TimeRemaining);
  const [tickingPlayer2Time, setTickingPlayer2Time] = useState(player2TimeRemaining);
  const lastServerPlayer1TimeRef = useRef(player1TimeRemaining);
  const lastServerPlayer2TimeRef = useRef(player2TimeRemaining);
  const lastUpdateRef = useRef(Date.now());

  // Update ticking time when server data changes (on poll)
  useEffect(() => {
    if (player1TimeRemaining !== lastServerPlayer1TimeRef.current) {
      setTickingPlayer1Time(player1TimeRemaining);
      lastServerPlayer1TimeRef.current = player1TimeRemaining;
      lastUpdateRef.current = Date.now();
    }
  }, [player1TimeRemaining]);

  useEffect(() => {
    if (player2TimeRemaining !== lastServerPlayer2TimeRef.current) {
      setTickingPlayer2Time(player2TimeRemaining);
      lastServerPlayer2TimeRef.current = player2TimeRemaining;
      lastUpdateRef.current = Date.now();
    }
  }, [player2TimeRemaining]);

  // Tick down the countdown every second for the active player
  useEffect(() => {
    if (matchStatus !== 1 || !showEscalation) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastUpdateRef.current) / 1000);

      if (isPlayer1Turn && lastServerPlayer1TimeRef.current !== null) {
        const newTime = Math.max(0, lastServerPlayer1TimeRef.current - elapsedSeconds);
        setTickingPlayer1Time(newTime);
      } else if (!isPlayer1Turn && lastServerPlayer2TimeRef.current !== null) {
        const newTime = Math.max(0, lastServerPlayer2TimeRef.current - elapsedSeconds);
        setTickingPlayer2Time(newTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [matchStatus, showEscalation, isPlayer1Turn]);

  const displayPlayer1Time = tickingPlayer1Time !== null ? tickingPlayer1Time : player1TimeRemaining;
  const displayPlayer2Time = tickingPlayer2Time !== null ? tickingPlayer2Time : player2TimeRemaining;

  // Determine player symbols based on game type and firstPlayer
  let player1Symbol = '';
  let player2Symbol = '';

  if (gameName && match.firstPlayer) {
    const isPlayer1First = match.firstPlayer?.toLowerCase() === match.player1?.toLowerCase();

    if (gameName === 'tictactoe') {
      player1Symbol = isPlayer1First ? 'X' : 'O';
      player2Symbol = isPlayer1First ? 'O' : 'X';
    } else if (gameName === 'connect4') {
      player1Symbol = isPlayer1First ? 'Red' : 'Blue';
      player2Symbol = isPlayer1First ? 'Blue' : 'Red';
    } else if (gameName === 'chess') {
      player1Symbol = isPlayer1First ? 'White' : 'Black';
      player2Symbol = isPlayer1First ? 'Black' : 'White';
    }
  }

  // Debug logging for escalation issues - always log for active matches we're not in
  if (showEscalation && matchStatus === 1 && !isUserMatch) {
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

  // Get border class — when tournament is completed, all user matches show purple (not green)
  const borderClass = isTournamentCompleted
    ? (isUserMatch ? 'border-purple-400/70 bg-purple-900/20' : colors.defaultBorder || 'border-purple-400/30 hover:border-purple-400/50')
    : showEscalation
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
    <div
      id={`r${roundIdx}m${matchIdx}`}
      className={`bg-black/30 rounded-xl p-4 border-2 transition-all ${borderClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={colors.matchLabel || "text-purple-300 text-sm font-semibold"}>
          Match {matchIdx + 1}
        </span>
        {/* Status */}
        {(() => {
          // For completed matches, show Victory/Defeat for user matches, nothing for others
          if (matchStatus === 2) {
            if (isUserMatch) {
              const userWon = match.winner?.toLowerCase() === account?.toLowerCase();
              if (userWon) {
                return <span className="text-xs font-bold text-green-400">Victory</span>;
              } else {
                return <span className="text-xs font-bold text-red-400">Defeat</span>;
              }
            }
            // For non-user matches, show nothing
            return null;
          }
          // For non-completed matches, show standard status
          return (
            <span className={`text-xs font-bold ${getMatchStatusColor(matchStatus, match.winner, match.completionReason, matchStatusOptions)}`}>
              {getMatchStatusText(matchStatus, match.winner, match.completionReason, matchStatusOptions)}
            </span>
          );
        })()}
      </div>

      {/* Escalation countdown timers - show only the next pending timer */}
      {showEscalation && matchStatus === 1 && isStalled && !isUserMatch && (
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
            <div className="flex items-center gap-1.5">
              {playerIcons?.player1 && <span className="text-lg">{playerIcons.player1}</span>}
              <span className="text-white font-mono text-sm">
                {shortenAddress(match.player1)}
              </span>
              {player1Symbol && (
                <>
                  <span className="text-gray-400 text-xs">as</span>
                  {gameName === 'chess' ? (
                    <img
                      src={player1Symbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                      alt={player1Symbol}
                      className="w-3.5 h-3.5"
                      draggable="false"
                    />
                  ) : gameName === 'tictactoe' ? (
                    player1Symbol === 'X' ? (
                      <span className="w-3 h-3 inline-block relative">
                        <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                        <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                      </span>
                    ) : (
                      <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                    )
                  ) : gameName === 'connect4' ? (
                    <span className={`w-3 h-3 rounded-full inline-block ${player1Symbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                  ) : (
                    <span className="text-gray-300 text-xs">({player1Symbol})</span>
                  )}
                </>
              )}
            </div>
            {showThisIsYou && isPlayer1 && (
              <span className="text-yellow-300 text-xs font-bold mt-0.5">THIS IS YOU</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Player 1 timer - always visible when match is active */}
            {showEscalation && displayPlayer1Time !== null && matchStatus === 1 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                isPlayer1Turn ? (
                  displayPlayer1Time === 0 ? 'bg-red-500/30 text-red-300 animate-pulse' :
                  displayPlayer1Time <= 10 ? 'bg-red-500/20 text-red-300' :
                  displayPlayer1Time <= 30 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-blue-500/20 text-blue-300'
                ) : 'bg-gray-500/20 text-gray-400'
              }`}>
                {Math.floor(displayPlayer1Time / 60)}:{(displayPlayer1Time % 60).toString().padStart(2, '0')}
              </span>
            )}
            {match.winner?.toLowerCase() === match.player1?.toLowerCase() && (
              <Award className="text-green-400" size={16} />
            )}
          </div>
        </div>

        <div className={colors.vsText || "text-center text-purple-400 font-bold"}>VS</div>

        {/* Player 2 */}
        <div className={`flex items-center justify-between p-2 rounded ${getPlayer2BgClass()}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {playerIcons?.player2 && <span className="text-lg">{playerIcons.player2}</span>}
              <span className="text-white font-mono text-sm">
                {shortenAddress(match.player2)}
              </span>
              {player2Symbol && (
                <>
                  <span className="text-gray-400 text-xs">as</span>
                  {gameName === 'chess' ? (
                    <img
                      src={player2Symbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                      alt={player2Symbol}
                      className="w-3.5 h-3.5"
                      draggable="false"
                    />
                  ) : gameName === 'tictactoe' ? (
                    player2Symbol === 'X' ? (
                      <span className="w-3 h-3 inline-block relative">
                        <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                        <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                      </span>
                    ) : (
                      <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                    )
                  ) : gameName === 'connect4' ? (
                    <span className={`w-3 h-3 rounded-full inline-block ${player2Symbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                  ) : (
                    <span className="text-gray-300 text-xs">({player2Symbol})</span>
                  )}
                </>
              )}
            </div>
            {showThisIsYou && isPlayer2 && (
              <span className="text-yellow-300 text-xs font-bold mt-0.5">THIS IS YOU</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Player 2 timer - always visible when match is active */}
            {showEscalation && displayPlayer2Time !== null && matchStatus === 1 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                !isPlayer1Turn ? (
                  displayPlayer2Time === 0 ? 'bg-red-500/30 text-red-300 animate-pulse' :
                  displayPlayer2Time <= 10 ? 'bg-red-500/20 text-red-300' :
                  displayPlayer2Time <= 30 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-blue-500/20 text-blue-300'
                ) : 'bg-gray-500/20 text-gray-400'
              }`}>
                {Math.floor(displayPlayer2Time / 60)}:{(displayPlayer2Time % 60).toString().padStart(2, '0')}
              </span>
            )}
            {match.winner?.toLowerCase() === match.player2?.toLowerCase() && (
              <Award className="text-green-400" size={16} />
            )}
          </div>
        </div>

        {/* Match CTA for user's matches */}
        {isUserMatch && (isTournamentCompleted || matchStatus !== 2) && (
          <button
            onClick={() => onEnterMatch(tierId, instanceId, roundIdx, matchIdx)}
            disabled={loading || (!isTournamentCompleted && matchStatus === 0)}
            className={`w-full mt-2 bg-gradient-to-r ${isTournamentCompleted ? 'from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600' : 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'} disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
          >
            {isTournamentCompleted ? (
              <>
                <Eye size={16} />
                View Match
              </>
            ) : (
              <>
                <Play size={16} />
                {matchStatus === 0 ? 'Waiting to Start' : 'Enter Match'}
              </>
            )}
          </button>
        )}

        {/* COMMENTED OUT: Spectate Button disabled for now */}
        {/* {!isUserMatch && match.matchStatus === 1 && onSpectateMatch && (
          <button
            onClick={() => onSpectateMatch(tierId, instanceId, roundIdx, matchIdx)}
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-600/90 hover:to-purple-600/90 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            Spectate Match
          </button>
        )} */}

        {/* Escalation CTAs for outsiders */}
        {showEscalation && !isUserMatch && matchStatus === 1 && (
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
