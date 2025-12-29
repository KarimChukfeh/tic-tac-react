/**
 * PlayerActivity Component
 *
 * Collapsible component showing player's active involvement in the current game
 * - Active matches (your turn)
 * - In-progress tournaments (waiting for other rounds)
 * - Unfilled tournaments (enrollment phase)
 */

import { useState } from 'react';
import { Users, X, Zap, Trophy, Clock, Play, Eye, RefreshCw } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { formatTimeRemaining } from '../../utils/activityHelpers';

const PlayerActivity = ({
  activity,
  loading,
  syncing,
  onEnterMatch,
  onEnterTournament,
  onRefresh,
  gameName,
  gameEmoji,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only count matches where it's your turn for the badge
  const activeMatchCount = activity?.activeMatches?.filter(m => m.isMyTurn).length || 0;
  const hasActivity = activity && (
    activity.activeMatches.length > 0 ||
    activity.inProgressTournaments.length > 0 ||
    activity.unfilledTournaments.length > 0
  );

  return (
    <div className="fixed top-20 left-16 z-50">
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-lg rounded-full p-4 border-2 border-purple-400/40 hover:border-purple-400/70 transition-all hover:scale-110 shadow-xl relative group"
          aria-label="Open player activity"
        >
          <Users size={24} className="text-white" />

          {/* Sync Circle Animation */}
          {syncing && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
          )}

          {/* Activity Badge */}
          {activeMatchCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">{activeMatchCount}</span>
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
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded-2xl p-6 border-2 border-purple-400/40 shadow-2xl w-96 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{gameEmoji}</span>
              <div>
                <h3 className="text-white font-bold text-lg">{gameName}</h3>
                <p className="text-slate-400 text-xs">Your Activity</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Refresh Button */}
              <button
                onClick={onRefresh}
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
                    {activity.activeMatches.map((match, idx) => (
                      <div
                        key={`${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`}
                        className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/50 hover:border-yellow-400/80 rounded-lg p-3 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">
                              Tier {match.tierId} Instance {match.instanceId}
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
                        <button
                          onClick={() =>
                            onEnterMatch(
                              match.tierId,
                              match.instanceId,
                              match.roundIdx,
                              match.matchIdx
                            )
                          }
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
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
                      </div>
                    ))}
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
                    {activity.inProgressTournaments.map((tournament, idx) => (
                      <div
                        key={`${tournament.tierId}-${tournament.instanceId}`}
                        className="bg-black/30 border border-cyan-400/30 rounded-lg p-3 hover:border-cyan-400/60 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold text-sm">
                            Tier {tournament.tierId} Instance {tournament.instanceId}
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
                    {activity.unfilledTournaments.map((tournament, idx) => (
                      <div
                        key={`${tournament.tierId}-${tournament.instanceId}`}
                        className="bg-black/30 border border-orange-400/30 rounded-lg p-3 hover:border-orange-400/60 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold text-sm">
                            Tier {tournament.tierId} Instance {tournament.instanceId}
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
