/**
 * RecentMatchesCard - Collapsible component showing player's recent match history
 *
 * Displays completed matches with board states and move history
 */

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, History, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import CapturedPieces from './CapturedPieces';

const RecentMatchesCard = ({
  contract,
  account,
  gameName,
  gameEmoji,
  gamesCardHeight = 0,
  playerActivityHeight = 0,
  onHeightChange,
  isExpanded: externalIsExpanded,
  onToggleExpand,
  tierConfig = null,
  isElite = false,
  disabled = false, // Disable interaction when wallet not connected
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingRecentMatches, setLoadingRecentMatches] = useState(false);
  const [expandedRecentMatches, setExpandedRecentMatches] = useState(new Set());
  const [syncing, setSyncing] = useState(false);
  const expandedPanelRef = useRef(null);
  const prevExpandedRef = useRef(false);
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  // Helper to handle expansion changes
  const handleSetExpanded = (value) => {
    if (onToggleExpand) {
      if (value && !externalIsExpanded) {
        onToggleExpand();
      } else if (!value && externalIsExpanded) {
        onToggleExpand();
      }
    } else {
      setInternalIsExpanded(value);
    }
  };

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
    if (isExpanded && !prevExpandedRef.current) {
      fetchRecentMatches();
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded]);

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
      onHeightChange(0);
    }
  }, [isExpanded, recentMatches, expandedRecentMatches, onHeightChange]);

  // Fetch recent matches using getPlayerMatches()
  const fetchRecentMatches = async () => {
    if (!contract || !account) return;

    setLoadingRecentMatches(true);
    setSyncing(true);
    try {
      console.log('[RecentMatches] Fetching player matches for:', account);

      const allMatches = await contract.getPlayerMatches();

      console.log('[RecentMatches] Total matches fetched:', allMatches.length);

      const recentCompletedMatches = [...allMatches]
        .filter(m => {
          const status = Number(m.status);
          const endTime = Number(m.endTime);
          return status === 2 || endTime > 0;
        })
        .sort((a, b) => Number(b.endTime) - Number(a.endTime))
        .slice(0, 20);

      console.log('[RecentMatches] Recent completed matches:', recentCompletedMatches.length);

      const matchesWithMoveHistory = recentCompletedMatches.map((match) => {
        const movesString = match.moves || '';
        let moveHistory = [];

        if (movesString && movesString.length > 0) {
          try {
            if (gameName === 'chess') {
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
              for (let i = 0; i < movesString.length; i++) {
                const cellIndex = movesString.charCodeAt(i);
                if (cellIndex >= 0 && cellIndex <= 41) {
                  const isPlayer1Move = (moveHistory.length) % 2 === 0;
                  const column = (cellIndex % 7) + 1;
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

        return {
          matchId: `${match.tierId}-${match.instanceId}-${match.roundNumber}-${match.matchNumber}`,
          tierId: Number(match.tierId),
          instanceId: Number(match.instanceId),
          roundNumber: Number(match.roundNumber),
          matchNumber: Number(match.matchNumber),
          player1: match.player1,
          player2: match.player2,
          firstPlayer: match.firstPlayer,
          winner: match.winner,
          isDraw: match.isDraw,
          reason: Number(match.completionReason),
          board: match.packedBoard,
          startTime: Number(match.startTime),
          endTime: Number(match.endTime),
          timestamp: Number(match.endTime),
          moveHistory: moveHistory
        };
      });

      console.log('[RecentMatches] Parsed matches with move history:', matchesWithMoveHistory.length);
      setRecentMatches(matchesWithMoveHistory);
    } catch (err) {
      console.error('[RecentMatches] Error fetching recent matches:', err);
    } finally {
      setLoadingRecentMatches(false);
      setSyncing(false);
    }
  };

  const handleRefresh = () => {
    setRecentMatches([]);
    fetchRecentMatches();
  };

  // Helper functions
  const getTierLabel = (tierId) => {
    if (!tierConfig || !tierConfig[tierId]) return null;
    const playerCount = tierConfig[tierId].playerCount;
    if (playerCount === 2) return 'Duel';
    if (playerCount === 4) return '4-Players';
    if (playerCount === 8) return '8-Players';
    return `${playerCount}-Players`;
  };

  const getRoundLabel = (tierId, roundNumber) => {
    if (!tierConfig || !tierConfig[tierId]) return `Round ${roundNumber + 1}`;
    const playerCount = tierConfig[tierId].playerCount;
    const totalRounds = Math.ceil(Math.log2(playerCount));

    if (playerCount === 2) return 'Finals';
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

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  const unpackBoard = (packedBoard, gameType) => {
    if (gameType === 'tictactoe') {
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 9; i++) {
        board.push(Number(p & 3n));
        p = p >> 2n;
      }
      return board;
    } else if (gameType === 'chess') {
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 64; i++) {
        const value = Number(p & 0xFn);
        let pieceType = 0;
        let color = 0;
        if (value >= 1 && value <= 6) {
          pieceType = value;
          color = 1;
        } else if (value >= 7 && value <= 12) {
          pieceType = value - 6;
          color = 2;
        }
        board.push({ pieceType, color });
        p = p >> 4n;
      }
      return board;
    } else if (gameType === 'connect4') {
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

  // Calculate captured pieces for chess by comparing current board to starting position
  const calculateCapturedPieces = (board) => {
    if (!board || board.length !== 64) {
      return { white: [], black: [] };
    }

    // Starting piece counts for each side
    const startingPieces = {
      1: 8,  // pawns
      2: 2,  // knights
      3: 2,  // bishops
      4: 2,  // rooks
      5: 1,  // queen
      6: 1   // king
    };

    // Count current pieces on board
    const whitePieces = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const blackPieces = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    board.forEach(square => {
      if (square.pieceType > 0) {
        if (square.color === 1) {
          // White piece
          whitePieces[square.pieceType]++;
        } else if (square.color === 2) {
          // Black piece
          blackPieces[square.pieceType]++;
        }
      }
    });

    // Calculate missing pieces (captured)
    const whiteCaptured = [];
    const blackCaptured = [];

    for (let pieceType = 1; pieceType <= 6; pieceType++) {
      const whiteLost = startingPieces[pieceType] - whitePieces[pieceType];
      const blackLost = startingPieces[pieceType] - blackPieces[pieceType];

      for (let i = 0; i < whiteLost; i++) {
        whiteCaptured.push(pieceType);
      }
      for (let i = 0; i < blackLost; i++) {
        blackCaptured.push(pieceType);
      }
    }

    return { white: whiteCaptured, black: blackCaptured };
  };

  // Desktop positioning
  const BASE_TOP_DESKTOP = 80;
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64;
  const SPACING_DESKTOP = 16; // gap between collapsed circles
  const EXPANDED_BOTTOM_MARGIN = 88; // margin below expanded cards

  let topPositionDesktop = BASE_TOP_DESKTOP;

  if (gamesCardHeight > 0) {
    topPositionDesktop += gamesCardHeight + EXPANDED_BOTTOM_MARGIN;
  } else {
    topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;
  }

  if (playerActivityHeight > 0) {
    topPositionDesktop += playerActivityHeight + EXPANDED_BOTTOM_MARGIN;
  } else {
    topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;
  }

  return (
    <div
      className={`max-md:relative md:fixed max-md:flex-1 max-md:flex max-md:justify-center z-50 transition-all duration-300 md:bottom-auto md:left-16`}
      style={{
        top: isDesktop ? `${topPositionDesktop}px` : undefined
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => {
          if (disabled) {
            setShowMobileTooltip(true);
            setTimeout(() => setShowMobileTooltip(false), 2000);
          } else {
            handleSetExpanded(!isExpanded);
          }
        }}
        disabled={false}
        className={`max-md:mx-auto bg-gradient-to-br backdrop-blur-lg rounded-full p-2.5 md:p-4 border-2 transition-all shadow-xl relative group ${
          disabled
            ? 'opacity-100 cursor-not-allowed from-gray-600/90 to-gray-700/90 border-gray-500/40'
            : 'from-teal-600/90 to-cyan-600/90 ' + (isExpanded
            ? 'border-teal-300 shadow-[0_0_20px_rgba(94,234,212,0.6)] scale-105'
            : 'border-teal-400/40 hover:border-teal-400/70 hover:scale-110')
        }`}
        aria-label={disabled ? "Connect wallet to access recent matches" : isExpanded ? "Close recent matches" : "Open recent matches"}
        title={disabled ? "Connect Wallet to View Your Match History" : ""}
      >
        <History size={18} className="text-white md:w-6 md:h-6" />

        {/* Sync Circle Animation */}
        {syncing && (
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
        )}

        {/* Tooltip - Desktop only */}
        {disabled ? (
          <a
            href="#connect-wallet-cta"
            className="max-md:hidden absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all shadow-2xl border-2 border-purple-400/60 hover:scale-105"
          >
            Connect Wallet to View Your Match History
          </a>
        ) : (
          <div className="max-md:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Match History
          </div>
        )}

        {/* Tooltip - Mobile only */}
        {showMobileTooltip && disabled && (
          <a
            href="#connect-wallet-cta"
            onClick={() => setShowMobileTooltip(false)}
            className="md:hidden absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl whitespace-nowrap z-[100] animate-fade-in shadow-2xl border-2 border-purple-400/60 hover:scale-105 transition-transform"
          >
            Connect Wallet to View Your Match History
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-purple-600"></div>
          </a>
        )}
      </button>

      {/* Expanded State */}
      {isExpanded && (
        <div
          ref={expandedPanelRef}
          className="max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:mt-3 bg-gradient-to-br from-teal-900/95 to-cyan-900/95 backdrop-blur-lg rounded-2xl p-4 md:p-6 pb-8 border-2 border-teal-400/40 shadow-2xl md:w-[464px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-teal-500/60 [&::-webkit-scrollbar-thumb]:to-cyan-500/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-teal-400/30 hover:[&::-webkit-scrollbar-thumb]:from-teal-500/80 hover:[&::-webkit-scrollbar-thumb]:to-cyan-500/80"
          style={{
            maxHeight: isDesktop ? `calc(100vh - ${topPositionDesktop}px - 6rem)` : 'calc(100vh - 7rem)'
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <History size={24} className="text-teal-400" />
                <h3 className="text-white font-bold text-lg">Match History</h3>
              </div>
              <div className="flex items-center gap-1">
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={syncing}
                  className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh"
                  title="Refresh recent matches"
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
          </div>

          {/* Content */}
          {loadingRecentMatches ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-slate-400 mt-2 text-xs">Loading recent matches...</p>
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="text-center py-6">
              <History className="text-slate-500 mx-auto mb-2" size={32} />
              <p className="text-slate-400 text-xs">No recent matches found</p>
              <p className="text-slate-500 text-xs mt-1">Events expire after ~50,000 blocks</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentMatches.map((match, index) => {
                const accountLower = account?.toLowerCase() || '';
                const winnerLower = match.winner?.toLowerCase() || '';
                const player1Lower = match.player1?.toLowerCase() || '';
                const player2Lower = match.player2?.toLowerCase() || '';

                const isWinner = !match.isDraw && winnerLower === accountLower && winnerLower !== '0x0000000000000000000000000000000000000000';

                const opponent = player1Lower === accountLower ? match.player2 : match.player1;
                const matchKey = `recent-${match.matchId}-${index}`;
                const isMatchExpanded = expandedRecentMatches.has(matchKey);

                const firstPlayerLower = match.firstPlayer?.toLowerCase() || '';
                const isAccountFirstPlayer = firstPlayerLower === accountLower;

                let accountSymbol = '';
                let opponentSymbol = '';

                if (gameName === 'tictactoe') {
                  accountSymbol = isAccountFirstPlayer ? 'X' : 'O';
                  opponentSymbol = isAccountFirstPlayer ? 'O' : 'X';
                } else if (gameName === 'connect4') {
                  accountSymbol = isAccountFirstPlayer ? 'Red' : 'Blue';
                  opponentSymbol = isAccountFirstPlayer ? 'Blue' : 'Red';
                } else if (gameName === 'chess') {
                  accountSymbol = isAccountFirstPlayer ? 'White' : 'Black';
                  opponentSymbol = isAccountFirstPlayer ? 'Black' : 'White';
                }

                return (
                  <div
                    key={matchKey}
                    className={`border-2 rounded-lg p-3 transition-all ${
                      match.isDraw
                        ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-400/50'
                        : isWinner
                        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-400/50'
                        : 'bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-400/50'
                    }`}
                  >
                    {/* Match Number and Details */}
                    <div className="mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 text-[10px] font-semibold">
                          Match #{recentMatches.length - index}
                        </span>
                        {getTierLabel(match.tierId) && (
                          <span className="bg-teal-500/20 text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-teal-400/30">
                            {getTierLabel(match.tierId)}
                          </span>
                        )}
                        {tierConfig && tierConfig[match.tierId] && tierConfig[match.tierId].playerCount > 2 && (
                          <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-400/30">
                            {getRoundLabel(match.tierId, match.roundNumber)}
                          </span>
                        )}
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
                    </div>

                    {/* Started Timestamp */}
                    <div className="mb-2.5">
                      <div className="bg-slate-500/20 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded border border-slate-400/30 text-center w-full">
                        Started {formatTimestamp(match.startTime)}
                      </div>
                    </div>

                    {/* Match Participants */}
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-400/30 font-mono flex flex-col items-center gap-1 max-md:w-full md:flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-normal">You</span>
                          <span className="font-semibold">{account.slice(0, 6)}...{account.slice(-4)}</span>
                          <span className="font-normal">as</span>
                          {gameName === 'chess' ? (
                            <img
                              src={accountSymbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                              alt={accountSymbol}
                              className="w-3.5 h-3.5 inline-block"
                              draggable="false"
                            />
                          ) : gameName === 'tictactoe' ? (
                            accountSymbol === 'X' ? (
                              <span className="w-3 h-3 inline-block relative">
                                <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                              </span>
                            ) : (
                              <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                            )
                          ) : gameName === 'connect4' ? (
                            <span className={`w-3 h-3 rounded-full inline-block ${accountSymbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                          ) : (
                            <span>({accountSymbol})</span>
                          )}
                        </div>
                        {(() => {
                          const hasWinner = !match.isDraw && match.winner && match.winner !== '0x0000000000000000000000000000000000000000';
                          const accountIsWinner = hasWinner && match.winner.toLowerCase() === account.toLowerCase();
                          const accountIsLoser = hasWinner && match.winner.toLowerCase() !== account.toLowerCase();
                          const isDraw = match.isDraw || match.reason === 2 || match.reason === 5;

                          if (accountIsWinner) {
                            return (
                              <div className="bg-green-500/40 text-green-200 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                                Victory
                              </div>
                            );
                          } else if (accountIsLoser || isDraw) {
                            return (
                              <div className="bg-red-500/40 text-red-200 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                                Defeat
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </span>
                      <span className="text-slate-400 text-[10px] max-md:w-full max-md:text-center">vs</span>
                      <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-400/30 font-mono flex flex-col items-center gap-1 max-md:w-full md:flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{opponent.slice(0, 6)}...{opponent.slice(-4)}</span>
                          <span className="font-normal">as</span>
                          {gameName === 'chess' ? (
                            <img
                              src={opponentSymbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                              alt={opponentSymbol}
                              className="w-3.5 h-3.5 inline-block"
                              draggable="false"
                            />
                          ) : gameName === 'tictactoe' ? (
                            opponentSymbol === 'X' ? (
                              <span className="w-3 h-3 inline-block relative">
                                <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                              </span>
                            ) : (
                              <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                            )
                          ) : gameName === 'connect4' ? (
                            <span className={`w-3 h-3 rounded-full inline-block ${opponentSymbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                          ) : (
                            <span>({opponentSymbol})</span>
                          )}
                        </div>
                        {(() => {
                          const hasWinner = !match.isDraw && match.winner && match.winner !== '0x0000000000000000000000000000000000000000';
                          const opponentIsWinner = hasWinner && match.winner.toLowerCase() === opponent.toLowerCase();
                          const opponentIsLoser = hasWinner && match.winner.toLowerCase() !== opponent.toLowerCase();
                          const isDraw = match.isDraw || match.reason === 2 || match.reason === 5;

                          if (opponentIsWinner) {
                            return (
                              <div className="bg-green-500/40 text-green-200 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                                Victory
                              </div>
                            );
                          } else if (opponentIsLoser || isDraw) {
                            return (
                              <div className="bg-red-500/40 text-red-200 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                                Defeat
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </span>
                    </div>

                    {/* Ended Timestamp */}
                    <div className="mb-2.5">
                      <div className="bg-slate-500/20 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded border border-slate-400/30 text-center w-full">
                        Ended {formatTimestamp(match.endTime)}
                      </div>
                    </div>

                    {/* Winner Info - Only show for ML3 wins or no winner cases */}
                    {(() => {
                      const noWinner = match.isDraw || match.reason === 2 || match.reason === 3 || match.reason === 5;
                      const isML3Win = match.reason === 4;
                      const hasNoWinnerAddress = !match.winner || match.winner === '0x0000000000000000000000000000000000000000';

                      // Only show this section if: no winner, ML3 win, or no winner address
                      if (!noWinner && !isML3Win && !hasNoWinnerAddress) {
                        return null;
                      }

                      return (
                        <div className="text-slate-300 text-[10px] mb-2.5 text-center flex justify-center">
                          {noWinner ? (
                            <span className="text-slate-400">No winner</span>
                          ) : hasNoWinnerAddress ? (
                            <><span className="text-slate-400">Winner </span><span className="text-slate-500 font-semibold">None</span></>
                          ) : isML3Win ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Winner </span>
                              <span className={`font-mono ${isWinner ? 'text-green-400 font-semibold' : 'text-red-400'}`}>
                                {shortenAddress(match.winner)}
                              </span>
                              <span className="text-slate-400"> (ML3)</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

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
                      {isMatchExpanded ? 'Hide Board' : 'View Board'}
                    </button>

                    {/* Board Display */}
                    {isMatchExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-600/30">
                        {/* Lost Pieces for Chess ONLY */}
                        {gameName === 'chess' && (() => {
                          const board = unpackBoard(match.board, 'chess');
                          const capturedPieces = calculateCapturedPieces(board);

                          return (
                            <div className="mb-4 space-y-2">
                              <CapturedPieces capturedPieces={capturedPieces.white} color="white" />
                              <CapturedPieces capturedPieces={capturedPieces.black} color="black" />
                            </div>
                          );
                        })()}

                        {gameName === 'tictactoe' && (() => {
                          const board = unpackBoard(match.board, 'tictactoe');

                          // Determine which cell value (1 or 2) corresponds to the firstPlayer
                          // X = firstPlayer (always blue), O = second player (always red)
                          const isPlayer1First = match.firstPlayer?.toLowerCase() === match.player1?.toLowerCase();

                          return (
                            <div className="flex justify-center">
                              <div className="grid grid-cols-3 gap-1 w-32 h-32">
                                {board.map((cell, idx) => (
                                  <div
                                    key={idx}
                                    className="aspect-square bg-slate-800/50 border border-slate-600/50 rounded flex items-center justify-center text-xl font-bold"
                                  >
                                    {cell === 1 ? (
                                      isPlayer1First ? (
                                        <span className="text-blue-400">X</span>
                                      ) : (
                                        <span className="text-red-400">O</span>
                                      )
                                    ) : cell === 2 ? (
                                      isPlayer1First ? (
                                        <span className="text-red-400">O</span>
                                      ) : (
                                        <span className="text-blue-400">X</span>
                                      )
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {gameName === 'chess' && (() => {
                          const board = unpackBoard(match.board, 'chess');
                          const pieceTypes = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
                          const shouldFlip = isAccountFirstPlayer;

                          return (
                            <div className="flex justify-center">
                              <div className="grid grid-cols-8 grid-rows-8 gap-0 w-full max-w-[256px] aspect-square border border-slate-600">
                                {board.map((_cell, idx) => {
                                  const displayRow = Math.floor(idx / 8);
                                  const displayCol = idx % 8;

                                  const actualIdx = shouldFlip ? ((7 - displayRow) * 8 + displayCol) : idx;
                                  const actualCell = board[actualIdx];

                                  const row = Math.floor(actualIdx / 8);
                                  const col = actualIdx % 8;
                                  const isLight = (row + col) % 2 === 0;

                                  let svgPath = '';
                                  if (actualCell.pieceType > 0) {
                                    const pieceName = pieceTypes[actualCell.pieceType];
                                    const colorSuffix = actualCell.color === 1 ? 'w' : 'b';
                                    svgPath = `/chess-pieces/${pieceName}-${colorSuffix}.svg`;
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center justify-center p-0.5 min-h-0 min-w-0 ${
                                        isLight ? 'bg-amber-200/20' : 'bg-amber-900/20'
                                      }`}
                                    >
                                      {svgPath && <img src={svgPath} alt="" className="w-full h-full object-contain" draggable="false" />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {gameName === 'connect4' && (() => {
                          const board = unpackBoard(match.board, 'connect4');
                          const grid = [];
                          for (let row = 0; row < 6; row++) {
                            grid.push(board.slice(row * 7, (row + 1) * 7));
                          }

                          // Determine which cell value (1 or 2) corresponds to the firstPlayer
                          // to correctly assign RED (firstPlayer) and BLUE (second player) colors
                          const isPlayer1First = match.firstPlayer?.toLowerCase() === match.player1?.toLowerCase();
                          const firstPlayerCellValue = isPlayer1First ? 1 : 2;

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
                                          {cell === firstPlayerCellValue ? (
                                            <div className="w-5 h-5 rounded-full bg-red-500"></div>
                                          ) : cell === (firstPlayerCellValue === 1 ? 2 : 1) ? (
                                            <div className="w-5 h-5 rounded-full bg-blue-500"></div>
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
                              <History size={14} className="text-teal-400" />
                              <h5 className="text-xs font-semibold text-slate-300 uppercase">
                                Move History ({match.moveHistory.length} moves)
                              </h5>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-teal-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
                              {match.moveHistory.map((move, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs bg-slate-800/30 rounded px-2 py-1"
                                >
                                  <span className="text-slate-500 font-mono w-6">{idx + 1}.</span>
                                  <div className="w-6 h-6 flex items-center justify-center">
                                    {gameName === 'chess' ? (
                                      <img
                                        src={move.player === '♚' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                                        alt={move.player === '♚' ? 'White' : 'Black'}
                                        className="w-5 h-5"
                                        draggable="false"
                                      />
                                    ) : (
                                      <span className="font-bold text-center">{move.player}</span>
                                    )}
                                  </div>
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
  );
};

export default RecentMatchesCard;
