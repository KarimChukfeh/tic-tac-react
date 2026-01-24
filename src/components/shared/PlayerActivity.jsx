/**
 * PlayerActivity Component
 *
 * Collapsible component showing player's active involvement in the current game
 * - Active matches (your turn)
 * - In-progress tournaments (waiting for other rounds)
 * - Unfilled tournaments (enrollment phase)
 */

import { useState, useRef, useEffect } from 'react';
import { Users, X, Zap, Trophy, Clock, Play, Eye, RefreshCw, ChevronDown, ChevronUp, TrendingUp, AlertCircle, ExternalLink, History, CheckCircle2 } from 'lucide-react';
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
  isExpanded: externalIsExpanded, // External control for mobile single-panel coordination
  onToggleExpand, // External toggle handler
  hideOnMobile = false, // Hide this panel on mobile when another panel is expanded
  gamesCardHeight = 0, // Height of the GamesCard above this component
  tierConfig = null, // Tier configuration for match labeling
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

  const getOutcomeLabel = (isDraw, isWinner, reason) => {
    const reasons = {
      0: 'Normal',
      1: 'Timeout (ML1)',
      2: 'Draw',
      3: 'Force Elimination (ML2)',
      4: 'Abandoned Match (ML3)',
      5: 'All Draw'
    };

    if (isDraw) return 'Draw';

    const reasonText = reasons[reason] || `Unknown (${reason})`;

    if (isWinner) {
      return reason === 0 ? 'Victory' : `Victory by ${reasonText}`;
    } else {
      return reason === 0 ? 'Defeat' : `Defeat by ${reasonText}`;
    }
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
    if (showTransactionHistory) {
      setTransactionHistory([]);
      fetchTransactionHistory();
    }

    // Clear and refetch recent matches if visible
    if (showRecentMatches) {
      setRecentMatches([]);
      fetchRecentMatches();
    }

    // Clear local completed matches state to get fresh data
    setCompletedMatches(new Map());

    // Clear local dismissed matches to get fresh state
    setLocalDismissedMatches(new Set());
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

  // OPTIMIZATION: Fetch recent matches using getPlayerMatches() instead of events
  const fetchRecentMatches = async () => {
    if (!contract || !account) return;

    setLoadingRecentMatches(true);
    try {
      console.log('[RecentMatches] Fetching player matches for:', account);

      // Fetch all player matches using the optimized function
      const allMatches = await contract.getPlayerMatches();

      console.log('[RecentMatches] Total matches fetched:', allMatches.length);
      console.log('[RecentMatches] Match statuses:', allMatches.map(m => ({
        tierId: Number(m.tierId),
        instanceId: Number(m.instanceId),
        round: Number(m.roundNumber),
        match: Number(m.matchNumber),
        status: Number(m.status),
        endTime: Number(m.endTime),
        player1: m.player1.slice(0, 10),
        player2: m.player2.slice(0, 10)
      })));

      // Filter for completed matches (status === 2) OR matches with endTime > 0 (finished)
      // Some matches might have endTime but status not yet updated
      // Convert to regular array first (ethers Result objects are immutable)
      const recentCompletedMatches = [...allMatches]
        .filter(m => {
          const status = Number(m.status);
          const endTime = Number(m.endTime);
          // Include if status is 2 (completed) OR if endTime is set (match finished)
          return status === 2 || endTime > 0;
        })
        .sort((a, b) => Number(b.endTime) - Number(a.endTime)) // Most recent first
        .slice(0, 20); // Take 20 most recent

      console.log('[RecentMatches] Recent completed matches:', recentCompletedMatches.length);

      // Parse move history for each match
      const matchesWithMoveHistory = recentCompletedMatches.map((match) => {
        const movesString = match.moves || '';
        let moveHistory = [];

        // Parse moves based on game type
        if (movesString && movesString.length > 0) {
          try {
            if (gameName === 'chess') {
              // Chess: 2 bytes per move (from, to)
              for (let i = 0; i < movesString.length - 1; i += 2) {
                const fromByte = movesString.charCodeAt(i);
                const toByte = movesString.charCodeAt(i + 1);
                if (fromByte >= 0 && fromByte < 64 && toByte >= 0 && toByte < 64) {
                  const isPlayer1Move = (moveHistory.length) % 2 === 0;
                  const fromFile = String.fromCharCode(97 + (fromByte % 8));
                  const fromRank = Math.floor(fromByte / 8) + 1;
                  const toFile = String.fromCharCode(97 + (toByte % 8));
                  const toRank = Math.floor(toByte / 8) + 1;
                  moveHistory.push({
                    player: isPlayer1Move ? '♚' : '♔',
                    move: `${fromFile}${fromRank}→${toFile}${toRank}`,
                    from: fromByte,
                    to: toByte
                  });
                }
              }
            } else if (gameName === 'tictactoe') {
              // TicTacToe: 1 byte per move (cell index 0-8)
              for (let i = 0; i < movesString.length; i++) {
                const cellIndex = movesString.charCodeAt(i);
                if (cellIndex >= 0 && cellIndex <= 8) {
                  const isPlayer1Move = (moveHistory.length) % 2 === 0;
                  moveHistory.push({
                    player: isPlayer1Move ? 'X' : 'O',
                    cell: cellIndex
                  });
                }
              }
            } else if (gameName === 'connect4') {
              // ConnectFour: 1 byte per move (cell index 0-41)
              for (let i = 0; i < movesString.length; i++) {
                const cellIndex = movesString.charCodeAt(i);
                if (cellIndex >= 0 && cellIndex <= 41) {
                  const isPlayer1Move = (moveHistory.length) % 2 === 0;
                  const column = (cellIndex % 7) + 1; // Convert to column (1-7)
                  moveHistory.push({
                    player: isPlayer1Move ? 'Red' : 'Blue',
                    column: column,
                    cellIndex: cellIndex
                  });
                }
              }
            }
          } catch (err) {
            console.warn('[RecentMatches] Error parsing moves for match:', err);
          }
        }

        const matchData = {
          matchId: `${match.tierId}-${match.instanceId}-${match.roundNumber}-${match.matchNumber}`,
          tierId: Number(match.tierId),
          instanceId: Number(match.instanceId),
          roundNumber: Number(match.roundNumber),
          matchNumber: Number(match.matchNumber),
          player1: match.player1,
          player2: match.player2,
          winner: match.winner,
          isDraw: match.isDraw,
          reason: Number(match.completionReason),
          board: match.packedBoard,
          startTime: Number(match.startTime),
          endTime: Number(match.endTime),
          timestamp: Number(match.endTime), // Keep for backwards compatibility
          moveHistory: moveHistory // Include parsed move history
        };

        // Debug logging
        console.log('[RecentMatches] Match data:', {
          matchId: matchData.matchId,
          player1: matchData.player1,
          player2: matchData.player2,
          winner: matchData.winner,
          isDraw: matchData.isDraw,
          account: account,
          isPlayer1: matchData.player1.toLowerCase() === account.toLowerCase(),
          isPlayer2: matchData.player2.toLowerCase() === account.toLowerCase(),
          winnerMatchesAccount: matchData.winner?.toLowerCase() === account.toLowerCase()
        });

        return matchData;
      });

      console.log('[RecentMatches] Parsed matches with move history:', matchesWithMoveHistory.length);
      setRecentMatches(matchesWithMoveHistory);
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
      0: 'Normal',
      1: 'Timeout (ML1)',
      2: 'Draw',
      3: 'Force Elimination (ML2)',
      4: 'Abandoned Match (ML3)',
      5: 'All Draw'
    };
    return reasons[reason] || `Unknown (${reason})`;
  };

  // Helper to format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      // Chess: 64 cells, 4 bits per cell
      // Encoding: 0=empty, 1-6=white pieces, 7-12=black pieces
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 64; i++) {
        const value = Number(p & 0xFn);
        let pieceType = 0;
        let color = 0;
        if (value >= 1 && value <= 6) {
          pieceType = value;  // white: 1-6
          color = 1;
        } else if (value >= 7 && value <= 12) {
          pieceType = value - 6;  // black: 7-12 → pieceType 1-6
          color = 2;
        }
        board.push({ pieceType, color });
        p = p >> 4n;
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
    activity.inProgressTournaments.length > 0 ||
    activity.unfilledTournaments.length > 0
  );

  // Desktop positioning (vertical stack below GamesCard)
  const BASE_TOP_DESKTOP = 80; // md:top-20 in pixels
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64; // collapsed button height on desktop
  const SPACING_DESKTOP = 90; // gap between components on desktop

  // Calculate desktop top position based on GamesCard height
  const topPositionDesktop = gamesCardHeight > 0
    ? BASE_TOP_DESKTOP + gamesCardHeight + SPACING_DESKTOP
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
      <button
        onClick={() => handleSetExpanded(!isExpanded)}
        className={`max-md:mx-auto bg-gradient-to-br backdrop-blur-lg rounded-full p-2.5 md:p-4 border-2 transition-all hover:scale-110 shadow-xl relative group ${
          isElite
            ? 'from-[#fbbf24]/90 to-[#f59e0b]/90 border-[#d4a012]/40 hover:border-[#d4a012]/70'
            : 'from-purple-600/90 to-blue-600/90 border-purple-400/40 hover:border-purple-400/70'
        }`}
        aria-label={isExpanded ? "Close player activity" : "Open player activity"}
      >
        <Users size={18} className="text-white md:w-6 md:h-6" />

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
        <div className="max-md:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Your Activity
        </div>
      </button>

      {/* Expanded State */}
      {isExpanded && (
        <div
          ref={expandedPanelRef}
          className="max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:mt-3 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded-2xl p-4 md:p-6 pb-8 border-2 border-purple-400/40 shadow-2xl md:w-[464px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-blue-500/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-purple-400/30 hover:[&::-webkit-scrollbar-thumb]:from-purple-500/80 hover:[&::-webkit-scrollbar-thumb]:to-blue-500/80"
          style={{
            maxHeight: isDesktop ? `calc(100vh - ${topPositionDesktop}px - 6rem)` : 'calc(100vh - 7rem)'
          }}
        >
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
                      const isCompleted = match.matchStatus === 2;

                      return (
                        <div
                          key={matchKey}
                          className={`bg-gradient-to-br ${isCompleted ? 'from-slate-500/20 to-slate-600/20 border-slate-400/50' : 'from-yellow-500/20 to-orange-500/20 border-yellow-400/50 hover:border-yellow-400/80'} border-2 rounded-lg p-3 transition-all`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">
                                Tier {match.tierId + 1} Instance {match.instanceId + 1}
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
                            <span className={`${isCompleted ? 'text-slate-400 bg-slate-800/30' : 'text-yellow-300 bg-yellow-900/30'} font-mono text-xs font-bold px-2 py-1 rounded`}>
                              {isCompleted ? 'Complete' : formatTimeRemaining(match.timeRemaining)}
                            </span>
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
                          // Normalize all addresses to lowercase for comparison
                          const accountLower = account?.toLowerCase() || '';
                          const winnerLower = match.winner?.toLowerCase() || '';
                          const player1Lower = match.player1?.toLowerCase() || '';
                          const player2Lower = match.player2?.toLowerCase() || '';

                          // Check if current account is the winner
                          const isWinner = !match.isDraw && winnerLower === accountLower && winnerLower !== '0x0000000000000000000000000000000000000000';

                          // Determine opponent
                          const opponent = player1Lower === accountLower ? match.player2 : match.player1;
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
                              {/* Match Header - All Labels and Arbiscan Link */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Tournament Context Labels */}
                                  {getTierLabel(match.tierId) && (
                                    <span className="bg-teal-500/20 text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-teal-400/30">
                                      {getTierLabel(match.tierId)}
                                    </span>
                                  )}
                                  {/* Only show round label for non-duel tournaments */}
                                  {tierConfig && tierConfig[match.tierId] && tierConfig[match.tierId].playerCount > 2 && (
                                    <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-400/30">
                                      {getRoundLabel(match.tierId, match.roundNumber)}
                                    </span>
                                  )}
                                  {/* Combined Match Outcome */}
                                  {(match.reason === 1 || match.reason === 3 || match.reason === 4) ? (
                                    <a
                                      href={match.reason === 1 ? '#ml1' : match.reason === 3 ? '#ml2' : '#ml3'}
                                      onClick={() => handleSetExpanded(false)}
                                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                        match.isDraw
                                          ? 'bg-yellow-500/60 text-white'
                                          : isWinner
                                          ? 'bg-green-500/60 text-white'
                                          : 'bg-red-500/60 text-white'
                                      } hover:opacity-80 transition-colors underline decoration-dotted cursor-pointer`}
                                      title={`Learn more about ${match.reason === 1 ? 'ML1' : match.reason === 3 ? 'ML2' : 'ML3'} in the User Manual`}
                                    >
                                      {getOutcomeLabel(match.isDraw, isWinner, match.reason)}
                                    </a>
                                  ) : (
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                      match.isDraw
                                        ? 'bg-yellow-500/60 text-white'
                                        : isWinner
                                        ? 'bg-green-500/60 text-white'
                                        : 'bg-red-500/60 text-white'
                                    }`}>
                                      {getOutcomeLabel(match.isDraw, isWinner, match.reason)}
                                    </span>
                                  )}
                                </div>
                                {/* Arbiscan Link */}
                                <a
                                  href={`https://arbiscan.io/tx/${match.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 flex-shrink-0"
                                  title="View on Arbiscan"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              </div>

                              {/* Match Participants */}
                              <div className="text-slate-300 text-[10px] mb-2">
                                <span className="font-mono">{account.slice(0, 6)}...</span>
                                <span className="text-slate-400"> vs </span>
                                <span className="font-mono">{opponent.slice(0, 6)}...</span>
                              </div>

                              {/* Match Details */}
                              <div className="space-y-1 text-[10px] text-slate-400 mb-2">
                                <div className="text-slate-300">
                                  <span className="text-slate-400">Started </span>
                                  {formatTimestamp(match.startTime)}
                                </div>
                                <div className="text-slate-300">
                                  <span className="text-slate-400">Ended </span>
                                  {formatTimestamp(match.endTime)}
                                </div>
                              </div>

                              {/* Winner Info */}
                              <div className="text-slate-300 text-[10px] mb-2">
                                <span className="text-slate-400">Winner </span>
                                {match.isDraw ? (
                                  <span className="text-yellow-300 font-semibold">Draw</span>
                                ) : match.winner === '0x0000000000000000000000000000000000000000' || !match.winner ? (
                                  <span className="text-slate-500 font-semibold">None</span>
                                ) : (
                                  <span className={`font-mono ${isWinner ? 'text-green-400 font-semibold' : 'text-red-400'}`}>
                                    {shortenAddress(match.winner)}
                                  </span>
                                )}
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
                                              className="aspect-square bg-slate-800/50 border border-slate-600/50 rounded flex items-center justify-center text-xl font-bold"
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
                                    // Map pieceType (1-6) to symbols
                                    const whitePieceSymbols = ['', '♙', '♘', '♗', '♖', '♕', '♔']; // index 0 unused, 1-6 for pawn-king
                                    const blackPieceSymbols = ['', '♟', '♞', '♝', '♜', '♛', '♚']; // index 0 unused, 1-6 for pawn-king

                                    return (
                                      <div className="flex justify-center">
                                        <div className="grid grid-cols-8 gap-0 w-64 h-64 border border-slate-600">
                                          {board.map((cell, idx) => {
                                            const row = Math.floor(idx / 8);
                                            const col = idx % 8;
                                            const isLight = (row + col) % 2 === 0;

                                            // Get the appropriate symbol based on color and pieceType
                                            let symbol = '';
                                            let textColor = '';
                                            if (cell.pieceType > 0) {
                                              if (cell.color === 1) {
                                                // White piece
                                                symbol = whitePieceSymbols[cell.pieceType] || '';
                                                textColor = 'text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]';
                                              } else if (cell.color === 2) {
                                                // Black piece
                                                symbol = blackPieceSymbols[cell.pieceType] || '';
                                                textColor = 'text-black drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]';
                                              }
                                            }

                                            return (
                                              <div
                                                key={idx}
                                                className={`aspect-square flex items-center justify-center text-2xl ${
                                                  isLight ? 'bg-amber-200/20' : 'bg-amber-900/20'
                                                } ${textColor}`}
                                              >
                                                {symbol}
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

                                  {/* Move History Section */}
                                  {match.moveHistory && match.moveHistory.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-600/30">
                                      <div className="flex items-center gap-2 mb-2">
                                        <History size={14} className="text-purple-400" />
                                        <h5 className="text-xs font-semibold text-slate-300 uppercase">
                                          Move History ({match.moveHistory.length} moves)
                                        </h5>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
                                        {match.moveHistory.map((move, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-2 text-xs bg-slate-800/30 rounded px-2 py-1"
                                          >
                                            <span className="text-slate-500 font-mono w-6">{idx + 1}.</span>
                                            <span className="font-bold w-6 text-center">
                                              {move.player}
                                            </span>
                                            <span className="text-slate-300 flex-1">
                                              {gameName === 'chess' && move.move}
                                              {gameName === 'tictactoe' && `Cell ${move.cell}`}
                                              {gameName === 'connect4' && `Column ${move.column}`}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
