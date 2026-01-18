/**
 * PlayerActivity Component
 *
 * Collapsible component showing player's active involvement in the current game
 * - Active matches (your turn)
 * - In-progress tournaments (waiting for other rounds)
 * - Unfilled tournaments (enrollment phase)
 */

import { useState, useRef, useEffect } from 'react';
import { Users, X, Zap, Trophy, Clock, Play, Eye, RefreshCw, ChevronDown, ChevronUp, TrendingUp, AlertCircle, ExternalLink, History } from 'lucide-react';
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
  isElite = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandedPanelRef = useRef(null);
  // Track completed matches that should remain visible until user dismisses them
  const [completedMatches, setCompletedMatches] = useState(new Map());
  // Transaction history state
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Recent matches state
  const [showRecentMatches, setShowRecentMatches] = useState(false);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingRecentMatches, setLoadingRecentMatches] = useState(false);
  const [expandedRecentMatches, setExpandedRecentMatches] = useState(new Set());

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

  // Fetch Transfer events for transaction history
  const fetchTransactionHistory = async () => {
    if (!contract || !account) return;

    setLoadingHistory(true);
    try {
      // Query Transfer events where `to` is the player's address
      const filter = contract.filters.Transfer(null, account);
      const events = await contract.queryFilter(filter);

      // Process events with transaction details
      const historyWithTxHash = await Promise.all(
        events.map(async (event) => {
          try {
            return {
              from: event.args.from,
              to: event.args.to,
              value: event.args.value,
              gameName: event.args.gameName,
              txHash: event.transactionHash,
              blockNumber: event.blockNumber,
            };
          } catch (err) {
            console.error('Error processing Transfer event:', err);
            return null;
          }
        })
      );

      // Filter out any failed event processing and sort by block number (most recent first)
      const validHistory = historyWithTxHash
        .filter(item => item !== null)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setTransactionHistory(validHistory);
    } catch (err) {
      console.error('Error fetching transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Toggle transaction history and fetch if needed
  const toggleTransactionHistory = () => {
    const willShow = !showTransactionHistory;
    setShowTransactionHistory(willShow);

    // Fetch transaction history when opening for the first time
    if (willShow && transactionHistory.length === 0) {
      fetchTransactionHistory();
    }
  };

  // Fetch MatchCompleted events for recent matches
  const fetchRecentMatches = async () => {
    if (!contract || !account) return;

    setLoadingRecentMatches(true);
    try {
      console.log('[RecentMatches] Fetching MatchCompleted events for player:', account);

      // Query MatchCompleted events where player is either player1 or player2
      // Since player1 and player2 are now indexed, we can filter on them
      const filterAsPlayer1 = contract.filters.MatchCompleted(null, account, null);
      const filterAsPlayer2 = contract.filters.MatchCompleted(null, null, account);

      // Query both filters
      const [eventsAsPlayer1, eventsAsPlayer2] = await Promise.all([
        contract.queryFilter(filterAsPlayer1),
        contract.queryFilter(filterAsPlayer2)
      ]);

      // Combine and deduplicate events
      const allEvents = [...eventsAsPlayer1, ...eventsAsPlayer2];
      const uniqueEvents = Array.from(
        new Map(allEvents.map(event => [event.transactionHash + event.logIndex, event])).values()
      );

      // Sort by block number (most recent first)
      const sortedEvents = uniqueEvents.sort((a, b) => b.blockNumber - a.blockNumber);

      // Process events to extract match data
      const matchesWithDetails = await Promise.all(
        sortedEvents.slice(0, 20).map(async (event) => {
          try {
            const { matchId, player1, player2, winner, isDraw, reason, board } = event.args;
            const block = await event.getBlock();

            // Decode matchId to get match coordinates (tierId, instanceId, roundNumber, matchNumber)
            // Note: matchId is keccak256(tierId, instanceId, roundNumber, matchNumber)
            // We can't directly decode it, but we can display the matchId

            return {
              matchId,
              player1,
              player2,
              winner,
              isDraw,
              reason: Number(reason),
              board,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
              timestamp: block.timestamp,
            };
          } catch (err) {
            console.error('[RecentMatches] Error processing event:', err);
            return null;
          }
        })
      );

      // Filter out any failed event processing
      const validMatches = matchesWithDetails.filter(match => match !== null);

      console.log('[RecentMatches] Found', validMatches.length, 'recent matches');
      console.log('[RecentMatches] Match data:', validMatches.map((match, idx) => ({
        index: idx,
        matchId: match.matchId,
        player1: match.player1,
        player2: match.player2,
        winner: match.winner,
        isDraw: match.isDraw,
        reason: match.reason,
        board: match.board.toString(),
        blockNumber: match.blockNumber,
        txHash: match.txHash,
        timestamp: match.timestamp,
        timestampFormatted: new Date(match.timestamp * 1000).toLocaleString()
      })));
      setRecentMatches(validMatches);
    } catch (err) {
      console.error('[RecentMatches] Error fetching recent matches:', err);
    } finally {
      setLoadingRecentMatches(false);
    }
  };

  // Toggle recent matches and fetch if needed
  const toggleRecentMatches = () => {
    const willShow = !showRecentMatches;
    setShowRecentMatches(willShow);

    // Fetch recent matches when opening for the first time
    if (willShow && recentMatches.length === 0) {
      fetchRecentMatches();
    }
  };

  // Helper to get completion reason text
  const getCompletionReasonText = (reason) => {
    const reasons = {
      0: 'Normal Win',
      1: 'Timeout Win (ML1)',
      2: 'Draw',
      3: 'Force Elimination (ML2)',
      4: 'Abandoned Match Replacement (ML3)',
      5: 'All Draw Scenario'
    };
    return reasons[reason] || `Unknown (${reason})`;
  };

  // Helper to format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Toggle recent match card expansion
  const toggleRecentMatchExpand = (matchKey) => {
    setExpandedRecentMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchKey)) {
        next.delete(matchKey);
      } else {
        next.add(matchKey);
      }
      return next;
    });
  };

  // Unpack board data based on game type
  const unpackBoard = (packedBoard, gameType) => {
    if (gameType === 'tictactoe') {
      // TicTacToe: 9 cells, 2 bits per cell
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 9; i++) {
        board.push(Number(p & 3n));
        p = p >> 2n;
      }
      return board;
    } else if (gameType === 'chess') {
      // Chess: 64 cells, 8 bits per cell
      const board = [];
      let p = BigInt(packedBoard);
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const pieceData = Number(p & 0xFFn);
          const pieceType = pieceData & 0x0F;
          const color = (pieceData >> 4) & 0x01;
          board.push({ pieceType, color });
          p = p >> 8n;
        }
      }
      return board;
    } else if (gameType === 'connect4') {
      // Connect4: 42 cells (6x7), 2 bits per cell
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 42; i++) {
        board.push(Number(p & 3n));
        p = p >> 2n;
      }
      return board;
    }
    return [];
  };

  // Handler when a match completes - add it to completed matches to keep it visible
  const handleMatchCompleted = (match) => {
    const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;
    setCompletedMatches(prev => {
      const next = new Map(prev);
      next.set(matchKey, match);
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
    setCompletedMatches(prev => {
      const next = new Map(prev);
      next.delete(matchKey);
      return next;
    });
    // Also call parent's dismiss handler if provided
    onDismissMatch?.(tierId, instanceId, roundIdx, matchIdx);
  };

  // Merge active matches from polling with completed matches we're keeping visible
  const getDisplayMatches = () => {
    const activeMatches = activity?.activeMatches || [];
    const matchMap = new Map();

    // First, add all completed matches (these take priority to show final state)
    completedMatches.forEach((match, key) => {
      matchMap.set(key, match);
    });

    // Then add active matches (won't override completed ones)
    activeMatches.forEach(match => {
      const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;
      if (!matchMap.has(matchKey)) {
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
    activity.inProgressTournaments.length > 0 ||
    activity.unfilledTournaments.length > 0
  );

  return (
    <div className="fixed top-4 left-4 md:top-20 md:left-16 z-50">
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`bg-gradient-to-br backdrop-blur-lg rounded-full p-2 md:p-4 border-2 transition-all hover:scale-110 shadow-xl relative group ${
            isElite
              ? 'from-[#fbbf24]/90 to-[#f59e0b]/90 border-[#d4a012]/40 hover:border-[#d4a012]/70'
              : 'from-purple-600/90 to-blue-600/90 border-purple-400/40 hover:border-purple-400/70'
          }`}
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
                <span className={isElite ? 'text-[#fbbf24]' : 'text-blue-400'}>You are: </span>
                <span className={`font-mono font-bold ${isElite ? 'text-[#fbbf24]' : 'text-blue-400'}`}>{shortenAddress(account)}</span>
              </div>
              {!loading && activity?.totalEarnings !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-green-400">You earned:</span>
                    <TrendingUp className={`${activity.totalEarnings >= 0n ? 'text-green-400' : 'text-red-400'}`} size={14} />
                    <span className={`font-semibold font-mono ${activity.totalEarnings >= 0n ? 'text-green-400' : 'text-red-400'}`}>
                      {activity.totalEarnings >= 0n ? '+' : ''}{ethers.formatEther(activity.totalEarnings)} ETH
                    </span>
                    <button
                      onClick={toggleTransactionHistory}
                      className="ml-1 text-slate-400 hover:text-white transition-colors p-0.5"
                      title={showTransactionHistory ? "Hide transaction history" : "Show transaction history"}
                    >
                      {showTransactionHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Transaction History */}
                  {showTransactionHistory && (
                    <div className="bg-black/30 border border-green-400/20 rounded-lg p-3 mt-2">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-yellow-300/80 text-[10px]">
                          Recent prize awards (events expire after ~50,000 blocks on Arbitrum)
                        </p>
                      </div>

                      {loadingHistory ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400 mx-auto"></div>
                          <p className="text-slate-400 mt-1 text-[10px]">Loading history...</p>
                        </div>
                      ) : transactionHistory.length === 0 ? (
                        <p className="text-slate-400 text-[10px] text-center py-2">No prize awards found</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-green-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                          {transactionHistory.map((tx, index) => (
                            <div
                              key={`${tx.txHash}-${index}`}
                              className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-400/20 rounded p-2 hover:border-green-400/40 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <TrendingUp className="text-green-400 flex-shrink-0" size={12} />
                                    <span className="text-green-400 font-mono font-semibold text-xs">
                                      +{ethers.formatEther(tx.value)} ETH
                                    </span>
                                  </div>
                                  <p className="text-slate-300 text-[10px] truncate">
                                    {tx.gameName}
                                  </p>
                                </div>
                                <a
                                  href={`https://arbiscan.io/tx/${tx.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                                  title="View on Arbiscan"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                          )}
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
                                Tier {match.tierId + 1} Instance {match.instanceId + 1}
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
                            Tier {tournament.tierId + 1} Instance {tournament.instanceId + 1}
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

            {/* Recent Matches Section - Always visible */}
            <div className={hasActivity ? "mt-6 pt-6 border-t border-slate-700/50" : "mt-0"}>
                <button
                  onClick={toggleRecentMatches}
                  className="w-full flex items-center justify-between text-slate-300 hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <History size={16} className={isElite ? 'text-[#fbbf24]' : 'text-purple-400'} />
                    <span className="font-semibold text-sm uppercase">Recent Matches</span>
                  </div>
                  {showRecentMatches ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* Recent Matches Content */}
                {showRecentMatches && (
                  <div className="mt-3">
                    {loadingRecentMatches ? (
                      <div className="text-center py-8">
                        <div className={`animate-spin rounded-full h-6 w-6 border-b-2 mx-auto ${isElite ? 'border-[#fbbf24]' : 'border-purple-400'}`}></div>
                        <p className="text-slate-400 mt-2 text-xs">Loading recent matches...</p>
                      </div>
                    ) : recentMatches.length === 0 ? (
                      <div className="text-center py-6">
                        <History className="text-slate-500 mx-auto mb-2" size={32} />
                        <p className="text-slate-400 text-xs">No recent matches found</p>
                        <p className="text-slate-500 text-xs mt-1">Events expire after ~50,000 blocks</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-blue-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {recentMatches.map((match, index) => {
                          const isWinner = !match.isDraw && match.winner.toLowerCase() === account.toLowerCase();
                          const opponent = match.player1.toLowerCase() === account.toLowerCase() ? match.player2 : match.player1;
                          const matchKey = `recent-${match.matchId}-${index}`;
                          const isExpanded = expandedRecentMatches.has(matchKey);

                          return (
                            <div
                              key={matchKey}
                              className={`border-2 rounded-lg p-3 transition-all ${
                                match.isDraw
                                  ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-400/30'
                                  : isWinner
                                  ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-400/30'
                                  : 'bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-400/30'
                              }`}
                            >
                              {/* Match Result Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {match.isDraw ? (
                                    <span className="bg-yellow-500/60 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                      Draw
                                    </span>
                                  ) : isWinner ? (
                                    <span className="bg-green-500/60 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                      Won
                                    </span>
                                  ) : (
                                    <span className="bg-red-500/60 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                      Lost
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                                    match.reason === 0
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'bg-orange-500/20 text-orange-300'
                                  }`}>
                                    {getCompletionReasonText(match.reason)}
                                  </span>
                                </div>
                              </div>

                              {/* Opponent Info */}
                              <div className="text-slate-300 text-xs mb-2">
                                <span className="text-slate-400">vs </span>
                                <span className="font-mono">{shortenAddress(opponent)}</span>
                              </div>

                              {/* Match Details */}
                              <div className="space-y-1 text-[10px] text-slate-400 mb-2">
                                <div className="flex items-center justify-between">
                                  <span>Match ID:</span>
                                  <span className="font-mono text-slate-300">{match.matchId.slice(0, 10)}...</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Time:</span>
                                  <span className="text-slate-300">{formatTimestamp(match.timestamp)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <a
                                    href={`https://arbiscan.io/tx/${match.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                                  >
                                    <span>View on Arbiscan</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              </div>

                              {/* View Board Button */}
                              <button
                                onClick={() => toggleRecentMatchExpand(matchKey)}
                                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all text-xs font-semibold ${
                                  match.isDraw
                                    ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-400/30'
                                    : isWinner
                                    ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30'
                                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/30'
                                }`}
                              >
                                <Eye size={14} />
                                {isExpanded ? 'Hide Board' : 'View Match-End Board'}
                              </button>

                              {/* Board Display */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-slate-600/30">
                                  {gameName === 'tictactoe' && (() => {
                                    const board = unpackBoard(match.board, 'tictactoe');
                                    return (
                                      <div className="flex justify-center">
                                        <div className="grid grid-cols-3 gap-1 w-32 h-32">
                                          {board.map((cell, idx) => (
                                            <div
                                              key={idx}
                                              className="bg-slate-800/50 border border-slate-600/50 rounded flex items-center justify-center text-xl font-bold"
                                            >
                                              {cell === 1 ? (
                                                <span className="text-blue-400">X</span>
                                              ) : cell === 2 ? (
                                                <span className="text-red-400">O</span>
                                              ) : null}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {gameName === 'chess' && (() => {
                                    const board = unpackBoard(match.board, 'chess');
                                    const pieceSymbols = {
                                      0: '',  // Empty
                                      1: '♙', 2: '♘', 3: '♗', 4: '♖', 5: '♕', 6: '♔', // White pieces
                                      11: '♟', 12: '♞', 13: '♝', 14: '♜', 15: '♛', 16: '♚' // Black pieces
                                    };
                                    return (
                                      <div className="flex justify-center">
                                        <div className="grid grid-cols-8 gap-0 w-64 h-64 border border-slate-600">
                                          {board.map((cell, idx) => {
                                            const row = Math.floor(idx / 8);
                                            const col = idx % 8;
                                            const isLight = (row + col) % 2 === 0;
                                            const piece = cell.color === 0 ? cell.pieceType : cell.pieceType + 10;
                                            return (
                                              <div
                                                key={idx}
                                                className={`flex items-center justify-center text-2xl ${
                                                  isLight ? 'bg-amber-200/20' : 'bg-amber-900/20'
                                                }`}
                                              >
                                                {pieceSymbols[piece] || ''}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {gameName === 'connect4' && (() => {
                                    const board = unpackBoard(match.board, 'connect4');
                                    // Convert flat array to 6x7 grid
                                    const grid = [];
                                    for (let row = 0; row < 6; row++) {
                                      grid.push(board.slice(row * 7, (row + 1) * 7));
                                    }
                                    return (
                                      <div className="flex justify-center">
                                        <div className="bg-blue-900/30 p-2 rounded-lg border border-blue-500/30">
                                          <div className="grid grid-rows-6 gap-1">
                                            {grid.map((row, rowIdx) => (
                                              <div key={rowIdx} className="grid grid-cols-7 gap-1">
                                                {row.map((cell, colIdx) => (
                                                  <div
                                                    key={colIdx}
                                                    className="w-6 h-6 rounded-full border-2 border-slate-600/50 flex items-center justify-center"
                                                  >
                                                    {cell === 1 ? (
                                                      <div className="w-5 h-5 rounded-full bg-red-500"></div>
                                                    ) : cell === 2 ? (
                                                      <div className="w-5 h-5 rounded-full bg-yellow-400"></div>
                                                    ) : (
                                                      <div className="w-5 h-5 rounded-full bg-slate-800/50"></div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerActivity;
