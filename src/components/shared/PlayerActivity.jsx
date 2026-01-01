/**
 * PlayerActivity Component
 *
 * Collapsible component showing player's active involvement in the current game
 * - Active matches (your turn)
 * - In-progress tournaments (waiting for other rounds)
 * - Unfilled tournaments (enrollment phase)
 */

import { useState, useRef, useEffect } from 'react';
import { Users, X, Zap, Trophy, Clock, Play, Eye, RefreshCw, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { formatTimeRemaining } from '../../utils/activityHelpers';
import MiniTicTacToeBoard from './MiniTicTacToeBoard';
import MiniChessBoard from './MiniChessBoard';
import MiniConnect4Board from './MiniConnect4Board';
import { ethers } from 'ethers';

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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandedPanelRef = useRef(null);

  // Expose collapse function via callback
  useEffect(() => {
    if (onCollapse) {
      onCollapse(() => setIsExpanded(false));
    }
  }, [onCollapse]);

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
    onRefresh();
    // Trigger mini board refresh by changing the value
    setRefreshTrigger(prev => prev + 1);
  };

  // Count all active matches (regardless of turn)
  const activeMatchCount = activity?.activeMatches?.length || 0;
  // Count all enrolled tournaments (in progress + waiting for players)
  const enrolledTournamentCount = (activity?.inProgressTournaments?.length || 0) + (activity?.unfilledTournaments?.length || 0);
  const hasActivity = activity && (
    activity.activeMatches.length > 0 ||
    activity.inProgressTournaments.length > 0 ||
    activity.unfilledTournaments.length > 0
  );

  return (
    <div className="fixed top-4 left-4 md:top-20 md:left-16 z-50">
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-lg rounded-full p-2 md:p-4 border-2 border-purple-400/40 hover:border-purple-400/70 transition-all hover:scale-110 shadow-xl relative group"
          aria-label="Open player activity"
        >
          <Users size={16} className="text-white md:w-6 md:h-6" />

          {/* Sync Circle Animation */}
          {syncing && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
          )}

          {/* Activity Badges */}
          {enrolledTournamentCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center animate-pulse">
              <span className="text-white text-[11px] md:text-xs font-bold">{enrolledTournamentCount}</span>
            </div>
          )}
          {activeMatchCount > 0 && (
            <div className="absolute -top-1 -left-1 bg-red-500 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center animate-pulse">
              <span className="text-white text-[11px] md:text-xs font-bold">{activeMatchCount}</span>
            </div>
          )}

          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Your Activity
          </div>
        </button>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div ref={expandedPanelRef} className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded-2xl p-4 md:p-6 border-2 border-purple-400/40 shadow-2xl w-[calc(100vw-2rem)] md:w-[464px] max-h-[80vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-blue-500/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-purple-400/30 hover:[&::-webkit-scrollbar-thumb]:from-purple-500/80 hover:[&::-webkit-scrollbar-thumb]:to-blue-500/80">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{gameEmoji}</span>
                <h3 className="text-white font-bold text-lg">{getGameTitle(gameName)}</h3>
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
                  onClick={() => setIsExpanded(false)}
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
                <span className="text-blue-400">You are: </span>
                <span className="text-blue-400 font-mono font-bold">{shortenAddress(account)}</span>
              </div>
              {!loading && activity?.totalEarnings !== undefined && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-green-400">You earned:</span>
                  <TrendingUp className={`${activity.totalEarnings >= 0n ? 'text-green-400' : 'text-red-400'}`} size={14} />
                  <span className={`font-semibold font-mono ${activity.totalEarnings >= 0n ? 'text-green-400' : 'text-red-400'}`}>
                    {activity.totalEarnings >= 0n ? '+' : ''}{ethers.formatEther(activity.totalEarnings)} ETH
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="text-slate-400 mt-2 text-sm">Loading activity...</p>
            </div>
          ) : !hasActivity ? (
            <div className="text-center py-8">
              <Users className="text-slate-500 mx-auto mb-3" size={48} />
              <p className="text-slate-400 text-sm mb-1">No Active Games</p>
              <p className="text-slate-500 text-xs">Join a tournament to get started!</p>
            </div>
          ) : (
            <>
              {/* Priority 1: Active Matches */}
              {activity.activeMatches && activity.activeMatches.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-purple-300 font-semibold text-sm mb-3 flex items-center gap-2 uppercase">
                    <Zap size={16} className="text-yellow-400" />
                    Active Matches ({activity.activeMatches.length})
                  </h4>
                  <div className="space-y-2">
                    {activity.activeMatches.map((match) => {
                      const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;
                      const isMatchExpanded = expandedMatches.has(matchKey);

                      return (
                        <div
                          key={matchKey}
                          className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/50 hover:border-yellow-400/80 rounded-lg p-3 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">
                                Tier {match.tierId + 1} Instance {match.instanceId + 1}
                              </span>
                              {match.isMyTurn && (
                                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase animate-pulse">
                                  Your Turn!
                                </span>
                              )}
                            </div>
                            <span className="text-yellow-300 bg-yellow-900/30 font-mono text-xs font-bold px-2 py-1 rounded">
                              {formatTimeRemaining(match.timeRemaining)}
                            </span>
                          </div>
                          <div className="text-slate-300 text-xs mb-3">
                            vs {shortenAddress(match.opponent)}
                          </div>

                          {/* Buttons */}
                          <div className="flex gap-2">
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

                            {/* Expand button - show for all games */}
                            <button
                              onClick={() => toggleMatchExpand(matchKey)}
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                              title={isMatchExpanded ? "Hide board" : "Show board"}
                            >
                              {isMatchExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>

                          {/* Mini Board - support all three games */}
                          {isMatchExpanded && (
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
                                  onMatchDismissed={() => {
                                    // Dismiss this match from the activity panel
                                    onDismissMatch?.(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
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
                                  onMatchDismissed={() => {
                                    // Dismiss this match from the activity panel
                                    onDismissMatch?.(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
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
                                  onMatchDismissed={() => {
                                    // Dismiss this match from the activity panel
                                    onDismissMatch?.(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
                                  }}
                                  onError={(err) => {
                                    console.error('Mini board error:', err);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Priority 2: In-Progress Tournaments (Waiting) */}
              {activity.inProgressTournaments && activity.inProgressTournaments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-purple-300 font-semibold text-sm mb-3 flex items-center gap-2 uppercase">
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
                            Tier {tournament.tierId + 1} Instance {tournament.instanceId + 1}
                          </span>
                        </div>
                        <div className="text-slate-400 text-xs mb-3">
                          Round {tournament.currentRound + 1} in progress
                        </div>
                        <button
                          onClick={() => onEnterTournament(tournament.tierId, tournament.instanceId)}
                          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
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
                  <h4 className="text-purple-300 font-semibold text-sm mb-3 flex items-center gap-2 uppercase">
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
                            Tier {tournament.tierId + 1} Instance {tournament.instanceId + 1}
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
        </div>
      )}
    </div>
  );
};

export default PlayerActivity;
