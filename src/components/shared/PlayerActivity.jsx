/**
 * PlayerActivity Component
 *
 * Collapsible component showing player's active involvement in the current game
 * - Active matches (your turn)
 * - In-progress tournaments (waiting for other rounds)
 * - Unfilled tournaments (enrollment phase)
 */

import { useState, useRef, useEffect } from 'react';
import { Users, X, Zap, Trophy, Clock, Play, Eye, RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { formatTimeRemaining } from '../../utils/activityHelpers';
import { getCompletionReasonText, isDraw as isDrawReason } from '../../utils/completionReasons';
import { getV2CompletionReasonText } from '../../v2/lib/reasonLabels';
import { linkifyReasonText } from './UserManualAnchorLink';

const PlayerActivity = ({
  activity,
  loading,
  syncing,
  contract,
  account,
  onEnterMatch,
  onEnterTournament,
  onRefresh,
  onDismissMatch,
  gameName,
  gameEmoji,
  onHeightChange,
  onCollapse,
  isElite = false,
  isExpanded: externalIsExpanded, // External control for mobile single-panel coordination
  onToggleExpand, // External toggle handler
  hideOnMobile = false, // Hide this panel on mobile when another panel is expanded
  gamesCardHeight = 0, // Height of the GamesCard above this component
  tierConfig = null, // Tier configuration for match labeling
  disabled = false, // Disable interaction when wallet not connected
  showTooltip = false, // External control for tooltip visibility
  onShowTooltip, // Callback to show this component's tooltip
  onHideTooltip, // Callback to hide this component's tooltip
  connectCtaClassName = 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-2xl border-2 border-purple-400/60 hover:scale-105',
  reasonLabelMode = 'default',
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const expandedPanelRef = useRef(null);
  const prevExpandedRef = useRef(false);

  // Helper functions for match labels
  const getTierLabel = (tierId) => {
    if (!tierConfig || !tierConfig[tierId]) return null;
    const playerCount = tierConfig[tierId].playerCount;
    if (playerCount === 2) return 'Duel';
    if (playerCount === 4) return '4-Players';
    if (playerCount === 8) return '8-Players';
    return `${playerCount}-Players`;
  };

  const getInstanceLabel = (instanceId) => {
    return `Instance ${instanceId + 1}`;
  };

  const isAddressBackedInstance = (instanceId) => (
    typeof instanceId === 'string' && instanceId.startsWith('0x')
  );

  const getTournamentLabel = (tierId, instanceId) => {
    if (isAddressBackedInstance(instanceId)) {
      return `Tournament ${shortenAddress(instanceId)}`;
    }
    return `Tier ${tierId + 1} Instance ${Number(instanceId) + 1}`;
  };

  const getRoundLabel = (tierId, roundNumber) => {
    if (!tierConfig || !tierConfig[tierId]) return `Round ${roundNumber + 1}`;
    const playerCount = tierConfig[tierId].playerCount;
    const totalRounds = Math.ceil(Math.log2(playerCount));

    if (playerCount === 2) return 'Finals'; // Duels are always finals
    if (roundNumber === totalRounds - 1) return 'Finals';
    if (roundNumber === totalRounds - 2) return 'Semi-Finals';
    if (roundNumber === totalRounds - 3) return 'Quarter-Finals';
    return `Round ${roundNumber + 1}`;
  };

  const getCompletedMatchOutcome = (match, account) => {
    const reason = match.completionReason ?? 0;
    const matchIsDraw = match.isDraw || isDrawReason(reason);
    const getReasonText = reasonLabelMode === 'v2' ? getV2CompletionReasonText : getCompletionReasonText;

    if (matchIsDraw) return { label: getReasonText(reason, false, gameName), color: 'text-yellow-300 bg-yellow-900/30' };
    if (!match.winner) return null;

    const isWinner = match.winner.toLowerCase() === account?.toLowerCase();
    const label = getReasonText(reason, isWinner, gameName);

    return isWinner
      ? { label, color: 'text-green-300 bg-green-900/30' }
      : { label, color: 'text-red-300 bg-red-900/30' };
  };

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  // Helper to handle expansion changes
  const handleSetExpanded = (value) => {
    if (onToggleExpand) {
      // External control: only toggle if needed
      if (value && !externalIsExpanded) {
        onToggleExpand();
      } else if (!value && externalIsExpanded) {
        onToggleExpand();
      }
    } else {
      // Internal control
      setInternalIsExpanded(value);
    }
  };
  // Track completed matches that should remain visible until user dismisses them
  const [completedMatches, setCompletedMatches] = useState(new Map());
  // Track dismissed matches locally for immediate filtering (before refetch completes)
  const [localDismissedMatches, setLocalDismissedMatches] = useState(new Set());

  // Expose collapse function via callback
  useEffect(() => {
    if (onCollapse) {
      // If using external state, collapse via onToggleExpand, otherwise use internal setter
      const collapseFn = onToggleExpand
        ? () => { if (externalIsExpanded) onToggleExpand(); }
        : () => setInternalIsExpanded(false);
      onCollapse(collapseFn);
    }
  }, [onCollapse, onToggleExpand, externalIsExpanded]);

  // Track screen size for responsive positioning
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch fresh data when panel transitions from collapsed to expanded
  useEffect(() => {
    // Only trigger refresh when expanding (false → true transition)
    if (isExpanded && !prevExpandedRef.current && onRefresh) {
      onRefresh();
    }
    // Update previous state
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, onRefresh]);

  // Measure and report height whenever content changes
  useEffect(() => {
    if (isExpanded && expandedPanelRef.current && onHeightChange) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.target.offsetHeight;
          onHeightChange(height);
        }
      });

      observer.observe(expandedPanelRef.current);

      // Report initial height immediately
      onHeightChange(expandedPanelRef.current.offsetHeight);

      return () => observer.disconnect();
    } else if (!isExpanded && onHeightChange) {
      // When collapsed, report collapsed button height
      onHeightChange(0);
    }
  }, [isExpanded, activity, onHeightChange]);
  const [expandedMatches, setExpandedMatches] = useState(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Convert gameName to display title
  const getGameTitle = (name) => {
    const titles = {
      'tictactoe': 'TicTacToe',
      'chess': 'Chess',
      'connect4': 'Connect Four'
    };
    return titles[name] || name;
  };

  const toggleMatchExpand = (matchKey) => {
    setExpandedMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchKey)) {
        next.delete(matchKey);
      } else {
        next.add(matchKey);
      }
      return next;
    });
  };

  const handleRefresh = () => {
    // Refresh activity data from hook
    onRefresh();

    // Trigger mini board refresh by changing the value
    setRefreshTrigger(prev => prev + 1);

    // Clear and refetch transaction history if visible
    // Clear local completed matches state to get fresh data
    setCompletedMatches(new Map());

    // Clear local dismissed matches to get fresh state
    setLocalDismissedMatches(new Set());
  };

  // Handler when a match completes - add it to completed matches to keep it visible
  const handleMatchCompleted = (match) => {
    const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;

    // Ensure match has matchStatus set to 2 (completed)
    const completedMatch = {
      ...match,
      matchStatus: 2
    };

    setCompletedMatches(prev => {
      const next = new Map(prev);
      next.set(matchKey, completedMatch);
      return next;
    });
    // Keep it expanded so user sees the result
    setExpandedMatches(prev => {
      const next = new Set(prev);
      next.add(matchKey);
      return next;
    });
  };

  // Handler when user dismisses a completed match
  const handleDismissMatch = (tierId, instanceId, roundIdx, matchIdx) => {
    const matchKey = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;

    // Remove from local completedMatches
    setCompletedMatches(prev => {
      const next = new Map(prev);
      next.delete(matchKey);
      return next;
    });

    // Add to local dismissed set for immediate filtering
    setLocalDismissedMatches(prev => {
      const next = new Set([...prev, matchKey]);
      return next;
    });

    // Also call parent's dismiss handler if provided (adds to dismissedMatches in hook)
    onDismissMatch?.(tierId, instanceId, roundIdx, matchIdx);

    // Trigger immediate refetch to remove from activity.activeMatches
    onRefresh?.();
  };

  // Merge active matches from polling with completed matches we're keeping visible
  const getDisplayMatches = () => {
    const activeMatches = activity?.activeMatches || [];
    const matchMap = new Map();

    // First, add all completed matches (these take priority to show final state)
    // Skip matches that have been locally dismissed
    completedMatches.forEach((match, key) => {
      if (!localDismissedMatches.has(key)) {
        matchMap.set(key, match);
      }
    });

    // Then add active matches (won't override completed ones)
    // Skip matches that have been locally dismissed
    activeMatches.forEach(match => {
      const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;
      if (!matchMap.has(matchKey) && !localDismissedMatches.has(matchKey)) {
        matchMap.set(matchKey, match);
      }
    });

    return Array.from(matchMap.values());
  };

  // Get merged display matches (active + completed)
  const displayMatches = getDisplayMatches();

  // Count all active matches (regardless of turn)
  const activeMatchCount = displayMatches.length;
  // Count all enrolled tournaments (in progress + waiting for players)
  const enrolledTournamentCount = (activity?.inProgressTournaments?.length || 0) + (activity?.unfilledTournaments?.length || 0);
  const hasActivity = activity && (
    displayMatches.length > 0 ||
    (activity.terminatedMatches && activity.terminatedMatches.length > 0) ||
    (activity.inProgressTournaments?.length > 0) ||
    (activity.unfilledTournaments?.length > 0)
  );

  // Desktop positioning (vertical stack below GamesCard)
  const BASE_TOP_DESKTOP = 80; // md:top-20 in pixels
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64; // collapsed button height on desktop
  const SPACING_DESKTOP = 16; // gap between collapsed circles
  const EXPANDED_BOTTOM_MARGIN = 88; // margin below expanded cards

  // Calculate desktop top position based on GamesCard height
  const topPositionDesktop = gamesCardHeight > 0
    ? BASE_TOP_DESKTOP + gamesCardHeight + EXPANDED_BOTTOM_MARGIN
    : BASE_TOP_DESKTOP + COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;

  return (
    <div
      className={`max-md:relative md:fixed max-md:flex-1 max-md:flex max-md:justify-center md:bottom-auto md:left-16 z-50 transition-all duration-300`}
      style={{
        // On desktop: use top positioning
        top: isDesktop ? `${topPositionDesktop}px` : undefined
      }}
    >
      {/* Toggle Button */}
      <div className="max-md:flex max-md:flex-col max-md:items-center max-md:gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent click from bubbling to document
            if (disabled) {
              if (onShowTooltip) onShowTooltip();
            } else {
              handleSetExpanded(!isExpanded);
            }
          }}
          disabled={false}
          className={`max-md:mx-auto bg-gradient-to-br backdrop-blur-lg rounded-full p-2 md:p-4 transition-all md:shadow-xl relative group ${
            disabled
              ? 'opacity-100 cursor-not-allowed from-gray-600/90 to-gray-700/90 border-2 border-gray-500/40'
              : isElite
              ? isExpanded
                ? 'from-[#fbbf24]/90 to-[#f59e0b]/90 border-2 border-[#fbbf24] md:shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105'
                : 'from-[#fbbf24]/90 to-[#f59e0b]/90 md:border-2 md:border-[#d4a012]/40 md:hover:border-[#d4a012]/70 hover:scale-110'
              : isExpanded
              ? 'from-purple-600/90 to-blue-600/90 border-2 border-purple-300 md:shadow-[0_0_20px_rgba(192,132,252,0.6)] scale-105'
              : 'from-purple-600/90 to-blue-600/90 md:border-2 md:border-purple-400/40 md:hover:border-purple-400/70 hover:scale-110'
          }`}
          aria-label={disabled ? "Connect wallet to access player activity" : isExpanded ? "Close player activity" : "Open player activity"}
          title={disabled ? "Connect Wallet to View Your Activity" : ""}
        >
          <Users size={16} className="text-white md:w-6 md:h-6" />

          {/* Sync Circle Animation */}
          {syncing && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
          )}

          {/* Activity Badges */}
          {enrolledTournamentCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center animate-pulse">
              <span className="text-white text-[10px] md:text-xs font-bold">{enrolledTournamentCount}</span>
            </div>
          )}
          {activeMatchCount > 0 && (
            <div className="absolute -top-1 -left-1 bg-red-500 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center animate-pulse">
              <span className="text-white text-[10px] md:text-xs font-bold">{activeMatchCount}</span>
            </div>
          )}

        {/* Tooltip - Desktop only */}
          {disabled ? (
            <a
              href="#connect-wallet-cta"
              className={`max-md:hidden absolute left-full ml-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center whitespace-nowrap px-5 py-2.5 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all ${connectCtaClassName}`}
            >
              Connect Wallet to View Your Activity
            </a>
        ) : (
          <div className="max-md:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Your Activity
          </div>
        )}

      </button>

      {/* Label - Mobile only */}
      <span className="md:hidden text-[10px] text-white/80 font-medium">Activity</span>

      {/* Tooltip - Mobile only */}
      {showTooltip && disabled && (
        <a
          href="#connect-wallet-cta"
          onClick={(e) => {
            e.stopPropagation(); // Allow navigation but prevent document click
            if (onHideTooltip) onHideTooltip();
          }}
          className={`md:hidden fixed bottom-20 left-4 right-4 flex items-center justify-center px-6 py-3 text-sm font-semibold z-[100] animate-fade-in transition-transform text-center ${connectCtaClassName}`}
        >
          Connect Wallet to View Your Activity
        </a>
      )}
    </div>

      {/* Expanded State */}
      {isExpanded && (
        <div
          ref={expandedPanelRef}
          className="max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:mt-3 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded-2xl p-4 md:p-6 pb-8 border-2 border-purple-400/40 shadow-2xl md:w-[464px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-purple-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/70 [&::-webkit-scrollbar-thumb]:to-blue-500/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-purple-400/30 hover:[&::-webkit-scrollbar-thumb]:from-purple-400 hover:[&::-webkit-scrollbar-thumb]:to-blue-400 [scrollbar-width:thin] [scrollbar-color:rgb(168_85_247_/_0.7)_rgb(24_24_27_/_0.4)]"
          style={{
            maxHeight: isDesktop ? `calc(100vh - ${topPositionDesktop}px - 6rem)` : 'calc(100vh - 7rem)'
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {/* Game Symbol */}
                <div className="flex items-center gap-1.5">
                  {gameName === 'tictactoe' ? (
                    <span className="w-5 h-5 inline-block relative">
                      <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '3px', height: '100%', left: '50%', marginLeft: '-1.5px'}}></span>
                      <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '3px', height: '100%', left: '50%', marginLeft: '-1.5px'}}></span>
                    </span>
                  ) : gameName === 'connect4' ? (
                    <span className="w-5 h-5 rounded-full inline-block bg-red-500"></span>
                  ) : (
                    <span className="text-2xl">♔</span>
                  )}
                </div>
                <h3 className="text-white font-bold text-lg">Activity</h3>
              </div>
              <div className="flex items-center gap-1">
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={syncing}
                  className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh"
                  title="Refresh activity"
                >
                  <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                </button>
                {/* Close Button */}
                <button
                  onClick={() => handleSetExpanded(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Wallet Address & Earnings */}
            <div className="space-y-1">
              <div className="text-xs">
                <span className={isElite ? 'text-[#fbbf24]' : 'text-blue-400'}>You are: </span>
                <span className={`font-mono font-bold ${isElite ? 'text-[#fbbf24]' : 'text-blue-400'}`}>{shortenAddress(account)}</span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${isElite ? 'border-[#fbbf24]' : 'border-purple-400'}`}></div>
              <p className="text-slate-400 mt-2 text-sm">Loading activity...</p>
            </div>
          ) : (
            <>
              {/* Active Activity Section */}
              {!hasActivity ? (
                <div className="text-center py-8">
                  <Users className="text-slate-500 mx-auto mb-3" size={48} />
                  <p className="text-slate-400 text-sm mb-1">No Active Games</p>
                  <p className="text-slate-500 text-xs">Join a tournament to get started!</p>
                </div>
              ) : (
                <>
              {/* Priority 1: Active Matches */}
              {displayMatches && displayMatches.length > 0 && (
                <div className="mb-6">
                  <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 uppercase ${isElite ? 'text-[#fff8e7]' : 'text-purple-300'}`}>
                    <Zap size={16} className="text-yellow-400" />
                    Active Matches ({displayMatches.length})
                  </h4>
                  <div className="space-y-2">
                    {displayMatches.map((match) => {
                      const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;
                      const isMatchExpanded = expandedMatches.has(matchKey);
                      const isCompleted = match.matchStatus === 2;

                      return (
                        <div
                          key={matchKey}
                          className={`bg-gradient-to-br ${isCompleted ? 'from-slate-500/20 to-slate-600/20 border-slate-400/50' : 'from-yellow-500/20 to-orange-500/20 border-yellow-400/50 hover:border-yellow-400/80'} border-2 rounded-lg p-3 transition-all`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">
                                {getTournamentLabel(match.tierId, match.instanceId)}
                              </span>
                              {isCompleted ? (
                                <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                  <CheckCircle2 size={10} />
                                  Complete
                                </span>
                              ) : match.isMyTurn ? (
                                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase animate-pulse">
                                  Your Turn!
                                </span>
                              ) : null}
                            </div>
                            {isCompleted ? (() => {
                              const outcome = getCompletedMatchOutcome(match, account);
                              return outcome ? (
                                <span className={`${outcome.color} font-mono text-xs font-bold px-2 py-1 rounded`}>
                                  {linkifyReasonText(outcome.label, { keyPrefix: `player-activity-${matchKey}`, linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white' })}
                                </span>
                              ) : null;
                            })() : (
                              <span className="text-yellow-300 bg-yellow-900/30 font-mono text-xs font-bold px-2 py-1 rounded">
                                {formatTimeRemaining(match.timeRemaining)}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-300 text-xs mb-3">
                            vs {shortenAddress(match.opponent)}
                          </div>

                          {/* Buttons */}
                          <div className="flex gap-2">
                            {!isCompleted ? (
                              <>
                                <button
                                  onClick={() =>
                                    onEnterMatch(
                                      match.tierId,
                                      match.instanceId,
                                      match.roundIdx,
                                      match.matchIdx
                                    )
                                  }
                                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
                                >
                                  {match.isMyTurn ? (
                                    <>
                                      <Play size={16} />
                                      Make Move
                                    </>
                                  ) : (
                                    <>
                                      <Eye size={16} />
                                      View Match
                                    </>
                                  )}
                                </button>

                                {/* COMMENTED OUT: Mini board expand button */}
                                {/* <button
                                  onClick={() => toggleMatchExpand(matchKey)}
                                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                                  title={isMatchExpanded ? "Hide board" : "Show board"}
                                >
                                  {isMatchExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button> */}
                              </>
                            ) : (
                              /* Dismiss button for completed matches */
                              <button
                                onClick={() => handleDismissMatch(match.tierId, match.instanceId, match.roundIdx, match.matchIdx)}
                                className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg transition-all flex items-center justify-center gap-2 py-2 px-4 font-semibold text-sm"
                                title="Remove this match from the list"
                              >
                                <X size={16} />
                                Dismiss
                              </button>
                            )}
                          </div>

                          {/* COMMENTED OUT: Mini Board - support all three games */}
                          {/* {isMatchExpanded && (
                            <div className="mt-3 pt-3 border-t border-yellow-400/20">
                              {gameName === 'tictactoe' && (
                                <MiniTicTacToeBoard
                                  contract={contract}
                                  account={account}
                                  match={match}
                                  refreshTrigger={refreshTrigger}
                                  onMoveComplete={() => {
                                    // Refresh activity data to update time/turn status
                                    handleRefresh();
                                    // Board stays open so user can see result
                                  }}
                                  onMatchCompleted={() => {
                                    // Match completed - add to completed matches to keep visible
                                    handleMatchCompleted(match);
                                  }}
                                  onMatchDismissed={() => {
                                    // Dismiss this match from the activity panel
                                    handleDismissMatch(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
                                  }}
                                  onError={(err) => {
                                    console.error('Mini board error:', err);
                                    // Error shown inline within MiniTicTacToeBoard
                                  }}
                                />
                              )}
                              {gameName === 'chess' && (
                                <MiniChessBoard
                                  contract={contract}
                                  account={account}
                                  match={match}
                                  refreshTrigger={refreshTrigger}
                                  onMoveComplete={() => {
                                    handleRefresh();
                                  }}
                                  onMatchCompleted={() => {
                                    handleMatchCompleted(match);
                                  }}
                                  onMatchDismissed={() => {
                                    handleDismissMatch(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
                                  }}
                                  onError={(err) => {
                                    console.error('Mini board error:', err);
                                  }}
                                />
                              )}
                              {gameName === 'connect4' && (
                                <MiniConnect4Board
                                  contract={contract}
                                  account={account}
                                  match={match}
                                  refreshTrigger={refreshTrigger}
                                  onMoveComplete={() => {
                                    handleRefresh();
                                  }}
                                  onMatchCompleted={() => {
                                    handleMatchCompleted(match);
                                  }}
                                  onMatchDismissed={() => {
                                    handleDismissMatch(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
                                  }}
                                  onError={(err) => {
                                    console.error('Mini board error:', err);
                                  }}
                                />
                              )}
                            </div>
                          )} */}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terminated Matches (Tournament Completed) */}
              {activity.terminatedMatches && activity.terminatedMatches.length > 0 && (
                <div className="mb-6">
                  <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 uppercase ${isElite ? 'text-[#fff8e7]' : 'text-purple-300'}`}>
                    <AlertCircle size={16} className="text-orange-400" />
                    Terminated Matches ({activity.terminatedMatches.length})
                  </h4>
                  <div className="space-y-2">
                    {activity.terminatedMatches.map((match) => {
                      const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;

                      return (
                        <div
                          key={matchKey}
                          className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-400/50 rounded-lg p-3"
                        >
                          {/* Tournament Completion Notice */}
                          <div className="bg-orange-500/20 border border-orange-400/40 rounded-lg p-2 mb-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-orange-300 text-xs font-semibold">
                                  Tournament Ended
                                </p>
                                <p className="text-orange-200/80 text-xs mt-0.5">
                                  This match was terminated because the tournament completed.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Match Info */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">
                                {getTournamentLabel(match.tierId, match.instanceId)}
                              </span>
                              <span className="bg-orange-500/60 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                Terminated
                              </span>
                            </div>
                          </div>
                          <div className="text-slate-300 text-xs mb-3">
                            vs {shortenAddress(match.opponent)}
                          </div>

                          {/* Dismiss Button */}
                          <button
                            onClick={() => handleDismissMatch(match.tierId, match.instanceId, match.roundIdx, match.matchIdx)}
                            className="w-full bg-orange-600/40 hover:bg-orange-600/60 text-orange-200 font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm border border-orange-400/30"
                          >
                            <X size={16} />
                            Dismiss
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Priority 2: In-Progress Tournaments (Waiting) */}
              {activity.inProgressTournaments && activity.inProgressTournaments.length > 0 && (
                <div className="mb-6">
                  <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 uppercase ${isElite ? 'text-[#fff8e7]' : 'text-purple-300'}`}>
                    <Trophy size={16} className="text-cyan-400" />
                    Tournaments In Progress ({activity.inProgressTournaments.length})
                  </h4>
                  <div className="space-y-2">
                    {activity.inProgressTournaments.map((tournament) => (
                      <div
                        key={`${tournament.tierId}-${tournament.instanceId}`}
                        className="bg-black/30 border border-cyan-400/30 rounded-lg p-3 hover:border-cyan-400/60 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold text-sm">
                            {getTournamentLabel(tournament.tierId, tournament.instanceId)}
                          </span>
                        </div>
                        <div className={`text-slate-400 text-xs ${tournament.playerRound !== null ? 'mb-1' : 'mb-3'}`}>
                          Round {tournament.currentRound + 1} in progress
                        </div>
                        {tournament.playerRound !== null && (
                          <div className="text-cyan-400 text-xs mb-3 font-semibold">
                            You are in Round {tournament.playerRound + 1}
                          </div>
                        )}
                        <button
                          onClick={() => onEnterTournament(tournament.tierId, tournament.instanceId)}
                          className={`w-full bg-gradient-to-r text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm ${
                            isElite
                              ? 'from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a012]'
                              : 'from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
                          }`}
                        >
                          <Eye size={16} />
                          View Bracket
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority 3: Unfilled Tournaments (Enrollment) */}
              {activity.unfilledTournaments && activity.unfilledTournaments.length > 0 && (
                <div>
                  <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 uppercase ${isElite ? 'text-[#fff8e7]' : 'text-purple-300'}`}>
                    <Clock size={16} className="text-orange-400" />
                    Waiting for Players ({activity.unfilledTournaments.length})
                  </h4>
                  <div className="space-y-2">
                    {activity.unfilledTournaments.map((tournament) => (
                      <div
                        key={`${tournament.tierId}-${tournament.instanceId}`}
                        className="bg-black/30 border border-orange-400/30 rounded-lg p-3 hover:border-orange-400/60 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold text-sm">
                            {getTournamentLabel(tournament.tierId, tournament.instanceId)}
                          </span>
                        </div>
                        <div className="text-slate-400 text-xs mb-3">
                          {tournament.enrolledCount} / {tournament.playerCount} players enrolled
                        </div>
                        <button
                          onClick={() => onEnterTournament(tournament.tierId, tournament.instanceId)}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Eye size={16} />
                          Check Status
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerActivity;
