/**
 * Connect Four On-Chain - Blockchain-Based Connect Four
 *
 * Drop discs, connect four in a row to win. Real ETH stakes.
 * Uses the same design language as the Chess and TicTacToe frontends
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Play, Users, Zap, Award, Coins, ChevronDown,
  ArrowLeft, History
} from 'lucide-react';
import { ethers } from 'ethers';
import C4_ABI from './CFOCABI.json';

// Connect Four disc particles for background
const C4_PARTICLES = ['🔴', '🔵'];

// Particle Background Component (Dream/Daring Themes)
const ParticleBackground = ({ colors }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const particles = useMemo(() => {
    const particleCount = isMobile ? 25 : 50;
    return Array.from({ length: particleCount }, (_, i) => {
      const useFirstColor = Math.random() > 0.5;
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 15,
        duration: 20 + Math.random() * 20,
        colorIndex: useFirstColor ? 0 : 1,
        symbol: C4_PARTICLES[Math.floor(Math.random() * C4_PARTICLES.length)]
      };
    });
  }, [isMobile]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map((p) => {
        const color = colors[p.colorIndex];
        return (
          <div
            key={p.id}
            className="particle"
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              transform: 'translateY(100vh)',
              animation: `particle-float ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
              willChange: 'transform, opacity',
              color: color,
              fontWeight: 'bold',
              textShadow: `0 0 8px ${color}`,
              fontSize: '24px'
            }}
          >
            {p.symbol}
          </div>
        );
      })}
    </div>
  );
};

// Helper function
const shortenAddress = (addr) => {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'TBD';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// Get tier name
const getTierName = (tierId) => {
  const tierNames = {
    0: 'Classic',
    1: 'Minor',
    2: 'Standard',
    3: 'Major',
    4: 'Mega',
    5: 'Ultimate',
    6: 'Rapid'
  };
  return tierNames[tierId] || `Tier ${tierId}`;
};

// Convert flat board array to 2D grid for rendering
// Contract stores board as row-major: index = row * 7 + col
// Row 0 is top in contract, row 5 is bottom (where pieces land)
const boardToGrid = (flatBoard) => {
  const grid = Array(6).fill(null).map(() => Array(7).fill(0));
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      // Contract index: row * 7 + col
      // Grid position: grid[row][col] (direct mapping, row 0 = top)
      const contractIdx = row * 7 + col;
      grid[row][col] = Number(flatBoard[contractIdx]);
    }
  }
  return grid;
};

// Find lowest empty row in column (for drop preview)
const getDropRow = (grid, column) => {
  for (let row = 5; row >= 0; row--) {
    if (grid[row][column] === 0) return row;
  }
  return -1; // Column full
};

// Find winning cells (4-in-a-row)
const findWinningCells = (grid, winner) => {
  if (winner === 0) return [];

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      if (grid[row][col] !== winner) continue;

      for (const [dr, dc] of directions) {
        const cells = [[row, col]];
        for (let i = 1; i < 4; i++) {
          const nr = row + dr * i;
          const nc = col + dc * i;
          if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7) break;
          if (grid[nr][nc] !== winner) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return [];
};

// Connect Four Board Component
const ConnectFourBoard = ({
  board,
  onColumnClick,
  currentTurn,
  account,
  player1,
  player2,
  matchStatus,
  loading,
  winner,
  lastColumn
}) => {
  const [hoveredColumn, setHoveredColumn] = useState(-1);
  const [boardSize, setBoardSize] = useState(null);
  const containerRef = useRef(null);

  // Calculate board size
  useEffect(() => {
    const updateSize = () => {
      const vh60 = window.innerHeight * 0.55;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      const size = Math.min(vh60, containerWidth, 500);
      setBoardSize(size);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Determine player color
  const isPlayer1 = account && player1?.toLowerCase() === account.toLowerCase();
  const isPlayer2 = account && player2?.toLowerCase() === account.toLowerCase();
  const isMyTurn = account && currentTurn?.toLowerCase() === account.toLowerCase();

  // Player 1 (firstPlayer) is Red (1), Player 2 is Blue (2)
  const myColor = isPlayer1 ? 1 : isPlayer2 ? 2 : 0;

  // Convert flat board to grid
  const grid = boardToGrid(board);

  // Find winning cells
  const winnerValue = winner && winner !== '0x0000000000000000000000000000000000000000'
    ? (winner.toLowerCase() === player1?.toLowerCase() ? 1 : 2)
    : 0;
  const winningCells = findWinningCells(grid, winnerValue);

  // Get preview row for hovered column
  const previewRow = hoveredColumn >= 0 ? getDropRow(grid, hoveredColumn) : -1;

  // Get top disc row for last move highlight
  const getTopDiscRow = (col) => {
    for (let row = 0; row < 6; row++) {
      if (grid[row][col] !== 0) return row;
    }
    return -1;
  };

  // Account for padding (32px) and gaps between 7 cells (6 gaps × 4px = 24px)
  const cellSize = boardSize ? (boardSize - 32 - 24) / 7 : 60;

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      {/* Column selectors (click zones) */}
      <div
        className="flex gap-1 mb-2"
        style={{ width: boardSize || 'auto' }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map(col => {
          const isColumnFull = getDropRow(grid, col) === -1;
          return (
            <div
              key={col}
              className={`flex-1 h-8 rounded-t-lg transition-all cursor-pointer flex items-center justify-center
                ${isMyTurn && !isColumnFull && matchStatus === 1
                  ? 'hover:bg-white/20'
                  : 'cursor-not-allowed opacity-50'
                }
                ${hoveredColumn === col && isMyTurn && !isColumnFull ? 'bg-white/20' : ''}
              `}
              onMouseEnter={() => !isColumnFull && setHoveredColumn(col)}
              onMouseLeave={() => setHoveredColumn(-1)}
              onClick={() => {
                if (isMyTurn && !isColumnFull && matchStatus === 1 && !loading) {
                  onColumnClick(col);
                }
              }}
            >
              {hoveredColumn === col && isMyTurn && !isColumnFull && (
                <span className="text-2xl animate-bounce">
                  {myColor === 1 ? '🔴' : '🔵'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Main board */}
      <div
        className="rounded-2xl p-4 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a4b8c 0%, #0d2847 100%)',
          width: boardSize || 'auto'
        }}
      >
        <div className="grid gap-1" style={{ gridTemplateRows: `repeat(6, ${cellSize}px)` }}>
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((cell, colIdx) => {
                const isWinning = winningCells.some(([r, c]) => r === rowIdx && c === colIdx);
                const isLastMove = lastColumn === colIdx && getTopDiscRow(colIdx) === rowIdx;
                const isPreview = rowIdx === previewRow && colIdx === hoveredColumn && isMyTurn && matchStatus === 1;

                return (
                  <div
                    key={colIdx}
                    className={`rounded-full flex items-center justify-center transition-all
                      ${isWinning ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                      ${isLastMove ? 'ring-2 ring-white/50' : ''}
                    `}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: '#0a1628',
                      boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.5)'
                    }}
                    onMouseEnter={() => setHoveredColumn(colIdx)}
                    onMouseLeave={() => setHoveredColumn(-1)}
                    onClick={() => {
                      if (isMyTurn && getDropRow(grid, colIdx) !== -1 && matchStatus === 1 && !loading) {
                        onColumnClick(colIdx);
                      }
                    }}
                  >
                    {cell !== 0 ? (
                      <div
                        className={`rounded-full transition-all ${isWinning ? 'scale-110' : ''}`}
                        style={{
                          width: cellSize - 8,
                          height: cellSize - 8,
                          background: cell === 1
                            ? 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)'
                            : 'radial-gradient(circle at 30% 30%, #60a5fa, #2563eb)',
                          boxShadow: cell === 1
                            ? 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 0 10px rgba(255,107,107,0.5)'
                            : 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 0 10px rgba(96,165,250,0.5)'
                        }}
                      />
                    ) : isPreview ? (
                      <div
                        className="rounded-full opacity-40"
                        style={{
                          width: cellSize - 8,
                          height: cellSize - 8,
                          background: myColor === 1
                            ? 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)'
                            : 'radial-gradient(circle at 30% 30%, #60a5fa, #2563eb)'
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Column labels */}
      <div
        className="flex gap-1 mt-2"
        style={{ width: boardSize || 'auto', paddingLeft: 16, paddingRight: 16 }}
      >
        {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((label, idx) => (
          <div key={idx} className="flex-1 text-center text-slate-500 text-sm font-medium">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({
  tierId,
  instanceId,
  maxPlayers,
  currentEnrolled,
  entryFee,
  isEnrolled,
  onEnroll,
  onEnter,
  loading,
  tierName,
  enrollmentTimeout,
  onManualStart,
  tournamentStatus,
  account
}) => {
  const isFull = currentEnrolled >= maxPlayers;
  const enrollmentPercentage = (currentEnrolled / maxPlayers) * 100;

  // Escalation state
  const [escalationState, setEscalationState] = useState({
    canStartEscalation1: false,
    timeToEscalation1: 0,
  });

  useEffect(() => {
    if (!enrollmentTimeout) {
      setEscalationState({ canStartEscalation1: false, timeToEscalation1: 0 });
      return;
    }

    const updateEscalationState = () => {
      const now = Math.floor(Date.now() / 1000);
      const escalation1Start = Number(enrollmentTimeout.escalation1Start);
      const timeToEscalation1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
      const canStartEscalation1 = escalation1Start > 0 && now >= escalation1Start;

      setEscalationState({ canStartEscalation1, timeToEscalation1 });
    };

    updateEscalationState();
    const interval = setInterval(updateEscalationState, 1000);
    return () => clearInterval(interval);
  }, [enrollmentTimeout]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const colors = {
    cardBg: 'from-purple-600/20 to-blue-600/20',
    cardBorder: 'border-purple-400/40 hover:border-purple-400/70',
    icon: 'text-purple-400',
    text: 'text-purple-300',
    progress: 'from-purple-500 to-blue-500',
    buttonEnter: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colors.cardBg} backdrop-blur-lg rounded-2xl p-6 border-2 ${colors.cardBorder} transition-all hover:shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className={colors.icon} size={24} />
          <div>
            <h3 className="text-xl font-bold text-white">{tierName || `Tier ${tierId}`}</h3>
            <div className={`text-xs ${colors.text}`}>Instance #{instanceId}</div>
          </div>
        </div>
        {isFull && (
          <div className="bg-purple-500/20 border border-purple-400 px-3 py-1 rounded-full">
            <span className="text-purple-300 text-xs font-bold">FULL</span>
          </div>
        )}
        {!isFull && !isEnrolled && (
          <div className="bg-green-500/20 border border-green-400 px-3 py-1 rounded-full">
            <span className="text-green-300 text-xs font-bold">OPEN</span>
          </div>
        )}
        {isEnrolled && (
          <div className="bg-blue-500/20 border border-blue-400 px-3 py-1 rounded-full">
            <span className="text-blue-300 text-xs font-bold">ENROLLED</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className={colors.text} size={16} />
            <span className={`${colors.text} text-xs font-semibold`}>Players</span>
          </div>
          <div className="text-white font-bold text-lg">{currentEnrolled} / {maxPlayers}</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="text-yellow-300" size={16} />
            <span className="text-yellow-300 text-xs font-semibold">Entry Fee</span>
          </div>
          <div className="text-white font-bold text-lg">{entryFee} ETH</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className={`flex justify-between text-xs ${colors.text} mb-1`}>
          <span>Enrollment</span>
          <span>{enrollmentPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${colors.progress} transition-all duration-500 rounded-full`}
            style={{ width: `${enrollmentPercentage}%` }}
          />
        </div>
      </div>

      {/* Escalation Timer */}
      {enrollmentTimeout && escalationState.timeToEscalation1 > 0 && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-400/50 rounded-lg p-3 text-center">
            <Clock className="inline-block text-orange-400 mr-2" size={16} />
            <span className="text-orange-300 text-sm">Force Start in: {formatTime(escalationState.timeToEscalation1)}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {tournamentStatus === 0 && escalationState.canStartEscalation1 && isEnrolled && (
        <button
          onClick={() => onManualStart(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mb-2 flex items-center justify-center gap-2"
        >
          <Zap size={18} />
          {loading ? 'Starting...' : 'Force Start Tournament'}
        </button>
      )}

      {isEnrolled ? (
        <button
          onClick={onEnter}
          disabled={loading || !account}
          className={`w-full bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          <Play size={18} />
          {loading ? 'Loading...' : 'Enter Tournament'}
        </button>
      ) : (
        <>
          {tournamentStatus === 0 && !isFull && (
            <button
              onClick={onEnroll}
              disabled={loading || !account}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trophy size={18} />
              {loading ? 'Enrolling...' : !account ? 'Connect Wallet' : 'Enroll Now'}
            </button>
          )}
          <button
            onClick={onEnter}
            disabled={loading}
            className={`w-full ${tournamentStatus === 0 && !isFull ? 'mt-2' : ''} bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 border ${colors.cardBorder}`}
          >
            <Eye size={18} />
            {loading ? 'Loading...' : 'View Tournament'}
          </button>
        </>
      )}
    </div>
  );
};

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, account, loading, syncDots }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers } = tournamentData;

  const totalRounds = Math.ceil(Math.log2(playerCount));

  const getMatchStatusText = (matchStatus, winner, isDraw) => {
    if (matchStatus === 0) return 'Not Started';
    if (matchStatus === 1) return 'In Progress';
    if (matchStatus === 2) {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (winner && winner.toLowerCase() === zeroAddress && !isDraw) {
        return 'Double Forfeit';
      }
      return 'Completed';
    }
    return 'Unknown';
  };

  const getMatchStatusColor = (matchStatus, winner, isDraw) => {
    if (matchStatus === 0) return 'text-gray-400';
    if (matchStatus === 1) return 'text-yellow-400';
    if (matchStatus === 2) {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (winner && winner.toLowerCase() === zeroAddress && !isDraw) return 'text-purple-400';
      return 'text-green-400';
    }
    return 'text-gray-400';
  };

  const colors = { headerBg: 'from-purple-600/30 to-blue-600/30', headerBorder: 'border-purple-400/30', text: 'text-purple-300', icon: 'text-purple-400' };

  return (
    <div className="mb-16">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colors.headerBg} backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder} mb-8`}>
        <button onClick={onBack} className={`mb-4 flex items-center gap-2 ${colors.text} hover:text-white transition-colors`}>
          <ChevronDown className="rotate-90" size={20} />
          Back to Tournaments
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🔴</span>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-bold text-white">Connect Four T{tierId}-I{instanceId}</h2>
                <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  Syncing{'.'.repeat(syncDots)}
                </span>
              </div>
              <p className={colors.text}>Round {currentRound + 1} of {totalRounds}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`${colors.text} text-sm`}>Prize Pool</div>
            <div className="text-3xl font-bold text-yellow-400">{ethers.formatEther(prizePool)} ETH</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-black/20 rounded-lg p-4">
            <div className={`${colors.text} text-sm mb-1`}>Players</div>
            <div className="text-white font-bold text-xl">{enrolledCount} / {playerCount}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className={`${colors.text} text-sm mb-1`}>Status</div>
            <div className="text-white font-bold text-xl">
              {status === 0 ? 'Enrolling' : status === 1 ? 'In Progress' : status === 2 ? 'Completed' : 'Unknown'}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className={`${colors.text} text-sm mb-1`}>Current Round</div>
            <div className="text-white font-bold text-xl">Round {currentRound + 1}</div>
          </div>
        </div>

        {/* Enrolled Players */}
        {enrolledPlayers && enrolledPlayers.length > 0 && (
          <div className="mt-4 bg-black/20 rounded-lg p-4 border border-purple-400/30">
            <div className="flex items-center gap-2 mb-3">
              <Users className={colors.icon} size={20} />
              <h4 className={`${colors.text} font-semibold`}>Enrolled Players ({enrolledPlayers.length})</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {enrolledPlayers.map((address, idx) => (
                <div
                  key={idx}
                  className={`font-mono text-sm p-2 rounded ${
                    address.toLowerCase() === account?.toLowerCase()
                      ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold'
                      : 'bg-purple-500/10 text-purple-300'
                  }`}
                >
                  {shortenAddress(address)}
                  {address.toLowerCase() === account?.toLowerCase() && ' (YOU)'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bracket */}
      <div className={`bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder}`}>
        <h3 className={`text-2xl font-bold ${colors.text} mb-6 flex items-center gap-2`}>
          <Grid size={24} />
          Tournament Bracket
        </h3>

        {rounds && rounds.length > 0 ? (
          <div className="space-y-8">
            {rounds.map((round, roundIdx) => (
              <div key={roundIdx}>
                <h4 className={`text-xl font-bold ${colors.icon} mb-4`}>
                  Round {roundIdx + 1}
                  {roundIdx === totalRounds - 1 && ' - Finals'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {round.matches.map((match, matchIdx) => {
                    const isUserMatch =
                      match.player1?.toLowerCase() === account?.toLowerCase() ||
                      match.player2?.toLowerCase() === account?.toLowerCase();

                    return (
                      <div
                        key={matchIdx}
                        className={`bg-black/30 rounded-xl p-4 border-2 transition-all ${
                          isUserMatch ? 'border-green-400/70 bg-green-900/20' : 'border-purple-400/30 hover:border-purple-400/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-purple-300 text-sm font-semibold">Match {matchIdx + 1}</span>
                          <span className={`text-xs font-bold ${getMatchStatusColor(match.matchStatus, match.winner, match.isDraw)}`}>
                            {getMatchStatusText(match.matchStatus, match.winner, match.isDraw)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {/* Player 1 - Red */}
                          <div className={`flex items-center justify-between p-2 rounded ${
                            match.winner?.toLowerCase() === match.player1?.toLowerCase()
                              ? 'bg-green-500/20 border border-green-400/50'
                              : match.player1?.toLowerCase() === account?.toLowerCase()
                              ? 'bg-cyan-500/20 border border-cyan-400/50'
                              : 'bg-purple-500/10'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🔴</span>
                              <span className="text-white font-mono text-sm">{shortenAddress(match.player1)}</span>
                            </div>
                            {match.winner?.toLowerCase() === match.player1?.toLowerCase() && (
                              <Award className="text-green-400" size={16} />
                            )}
                          </div>

                          <div className="text-center text-purple-400 font-bold">VS</div>

                          {/* Player 2 - Blue */}
                          <div className={`flex items-center justify-between p-2 rounded ${
                            match.winner?.toLowerCase() === match.player2?.toLowerCase()
                              ? 'bg-green-500/20 border border-green-400/50'
                              : match.player2?.toLowerCase() === account?.toLowerCase()
                              ? 'bg-blue-500/20 border border-blue-400/50'
                              : 'bg-blue-500/10'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🔵</span>
                              <span className="text-white font-mono text-sm">{shortenAddress(match.player2)}</span>
                            </div>
                            {match.winner?.toLowerCase() === match.player2?.toLowerCase() && (
                              <Award className="text-green-400" size={16} />
                            )}
                          </div>

                          {/* Enter Match Button */}
                          {isUserMatch && match.matchStatus !== 2 && (
                            <button
                              onClick={() => onEnterMatch(tierId, instanceId, roundIdx, matchIdx)}
                              disabled={loading || match.matchStatus === 0}
                              className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <Play size={16} />
                              {match.matchStatus === 0 ? 'Waiting to Start' : 'Enter Match'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-purple-300">
            <p>No matches available yet. Tournament may be in enrollment phase.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Connect Four Component
export default function ConnectFour() {
  const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const EXPECTED_CHAIN_ID = 412346;

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Tournament State
  const [tournaments, setTournaments] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [syncDots, setSyncDots] = useState(1);

  // Cached Stats State
  const [cachedStats, setCachedStats] = useState(null);
  const [cachedStatsLoading, setCachedStatsLoading] = useState(false);

  // Theme colors (dream theme - matches TicTacToe and Chess)
  const currentTheme = {
    gradient: 'linear-gradient(135deg, #0a0020 0%, #1a0050 50%, #0a0030 100%)',
    particleColors: ['#00ffff', '#8a2be2'],
    heroGlow: 'from-blue-500 via-cyan-500 to-blue-500',
    heroTitle: 'from-blue-400 via-cyan-400 to-blue-400',
    heroText: 'text-blue-200',
    buttonGradient: 'from-blue-500 to-cyan-500',
    buttonHover: 'hover:from-blue-600 hover:to-cyan-600',
  };

  // Switch network
  const switchToLocalNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x64aba' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x64aba',
              chainName: 'Local Network',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['http://127.0.0.1:8545'],
            }],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
        }
      }
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      setLoading(true);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();

      if (network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
        const shouldSwitch = window.confirm(`Wrong Network! Expected Chain ID: ${EXPECTED_CHAIN_ID}\nSwitch networks?`);
        if (shouldSwitch) {
          await switchToLocalNetwork();
          window.location.reload();
          return;
        }
      }

      const web3Signer = await web3Provider.getSigner();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, C4_ABI, web3Signer);

      setAccount(accounts[0]);
      setContract(contractInstance);
      await fetchAllTiers(contractInstance, accounts[0], false);
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect: ' + error.message);
      setLoading(false);
    }
  };

  // Fetch all tiers
  const fetchAllTiers = useCallback(async (contractInstance, userAccount, silent = false) => {
    if (!contractInstance) return;

    if (!silent) setTournamentsLoading(true);

    const allTournaments = [];

    for (let tierId = 0; tierId <= 6; tierId++) {
      try {
        const tierOverview = await contractInstance.getTierOverview(tierId);
        const statuses = tierOverview[0];
        const enrolledCounts = tierOverview[1];

        const tierConfig = await contractInstance.tierConfigs(tierId);
        const maxPlayers = Number(tierConfig.playerCount);

        const fee = await contractInstance.ENTRY_FEES(tierId);
        const entryFeeFormatted = ethers.formatEther(fee);

        for (let i = 0; i < statuses.length; i++) {
          let isEnrolled = false;
          let enrollmentTimeout = null;

          if (userAccount) {
            try {
              isEnrolled = await contractInstance.isEnrolled(tierId, i, userAccount);
            } catch (err) {}
          }

          try {
            const tournamentInfo = await contractInstance.tournaments(tierId, i);
            enrollmentTimeout = tournamentInfo.enrollmentTimeout;
          } catch (err) {}

          allTournaments.push({
            tierId,
            instanceId: i,
            status: Number(statuses[i]),
            currentEnrolled: Number(enrolledCounts[i]),
            maxPlayers,
            entryFee: entryFeeFormatted,
            isEnrolled,
            enrollmentTimeout,
            tournamentStatus: Number(statuses[i])
          });
        }
      } catch (error) {
        console.log(`Could not fetch tier ${tierId}:`, error.message);
      }
    }

    allTournaments.sort((a, b) => b.currentEnrolled - a.currentEnrolled);
    setTournaments(allTournaments);
    if (!silent) setTournamentsLoading(false);
  }, []);

  // Refresh bracket
  const refreshTournamentBracket = useCallback(async (contractInstance, tierId, instanceId) => {
    try {
      const tournamentInfo = await contractInstance.getTournamentInfo(tierId, instanceId);
      const tierConfig = await contractInstance.tierConfigs(tierId);
      const enrolledPlayers = await contractInstance.getEnrolledPlayers(tierId, instanceId);

      const rounds = [];

      for (let roundNum = 0; roundNum <= Number(tournamentInfo[2]); roundNum++) {
        try {
          const roundInfo = await contractInstance.getRoundInfo(tierId, instanceId, roundNum);
          const matches = [];

          for (let matchNum = 0; matchNum < Number(roundInfo.totalMatches); matchNum++) {
            try {
              const matchData = await contractInstance.getMatch(tierId, instanceId, roundNum, matchNum);
              matches.push({
                player1: matchData[0],
                player2: matchData[1],
                currentTurn: matchData[2],
                winner: matchData[3],
                board: Array.from(matchData[4]),
                matchStatus: Number(matchData[5]),
                isDraw: matchData[6],
                startTime: Number(matchData[7]),
                lastMoveTime: Number(matchData[8]),
                firstPlayer: matchData[9],
                moveCount: Number(matchData[10]),
                lastColumn: Number(matchData[11])
              });
            } catch (err) {
              matches.push({ player1: ethers.ZeroAddress, player2: ethers.ZeroAddress, matchStatus: 0 });
            }
          }

          rounds.push({ matches, roundInfo });
        } catch (err) {
          break;
        }
      }

      const fee = await contractInstance.ENTRY_FEES(tierId);

      return {
        tierId,
        instanceId,
        status: Number(tournamentInfo[0]),
        currentRound: Number(tournamentInfo[2]),
        enrolledCount: Number(tournamentInfo[3]),
        prizePool: tournamentInfo[4],
        playerCount: Number(tierConfig.playerCount),
        enrolledPlayers: Array.from(enrolledPlayers),
        rounds,
        entryFee: fee
      };
    } catch (error) {
      console.error('Error refreshing bracket:', error);
      return null;
    }
  }, []);

  // Refresh match data
  const refreshMatchData = useCallback(async (contractInstance, userAccount, match) => {
    try {
      const matchData = await contractInstance.getMatch(
        match.tierId, match.instanceId, match.roundNumber, match.matchNumber
      );

      const isPlayer1 = matchData[0].toLowerCase() === userAccount.toLowerCase();

      return {
        ...match,
        player1: matchData[0],
        player2: matchData[1],
        currentTurn: matchData[2],
        winner: matchData[3],
        board: Array.from(matchData[4]),
        matchStatus: Number(matchData[5]),
        isDraw: matchData[6],
        startTime: Number(matchData[7]),
        lastMoveTime: Number(matchData[8]),
        firstPlayer: matchData[9],
        moveCount: Number(matchData[10]),
        lastColumn: Number(matchData[11]),
        isPlayer1,
        isYourTurn: matchData[2].toLowerCase() === userAccount.toLowerCase()
      };
    } catch (error) {
      console.error('Error refreshing match:', error);
      return null;
    }
  }, []);

  // Fetch cached tournament and match stats
  const fetchCachedStats = useCallback(async (contractInstance, silent = false) => {
    if (!contractInstance) return;

    try {
      if (!silent) {
        setCachedStatsLoading(true);
      }

      let matches = [];
      let tournaments = [];

      // Fetch all cached matches
      try {
        const allCachedMatches = await contractInstance.getAllCachedMatches();
        matches = Array.from(allCachedMatches).filter(m => m && m.exists);
      } catch (err) {
        console.warn('Error fetching cached matches:', err.message || err);
      }

      // Fetch all completed tournaments
      try {
        const allCompletedTournaments = await contractInstance.getAllCompletedTournaments();
        tournaments = Array.from(allCompletedTournaments).filter(t => t && t.exists);
      } catch (err) {
        console.error('Error fetching completed tournaments:', err);
      }

      // Group tournaments by completion type
      const organicTournaments = tournaments.filter(t => Number(t.completionType) === 0);
      const partialTournaments = tournaments.filter(t => Number(t.completionType) === 1);
      const abandonedTournaments = tournaments.filter(t => Number(t.completionType) === 2);

      setCachedStats({
        matches,
        tournaments,
        organicTournaments,
        partialTournaments,
        abandonedTournaments
      });
      if (!silent) {
        setCachedStatsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching cached stats:', error.message || error);
      setCachedStats({
        matches: [],
        tournaments: [],
        organicTournaments: [],
        partialTournaments: [],
        abandonedTournaments: []
      });
      if (!silent) {
        setCachedStatsLoading(false);
      }
    }
  }, []);

  // Handle enroll
  const handleEnroll = async (tierId, instanceId, entryFee) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.enrollInTournament(tierId, instanceId, {
        value: ethers.parseEther(entryFee)
      });
      await tx.wait();
      await fetchAllTiers(contract, account, true);
      setLoading(false);
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Enrollment failed: ' + error.message);
      setLoading(false);
    }
  };

  // Handle enter tournament
  const handleEnterTournament = async (tierId, instanceId) => {
    try {
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId);
      if (bracketData) setViewingTournament(bracketData);
      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error entering tournament:', error);
      setTournamentsLoading(false);
    }
  };

  // Handle play match
  const handlePlayMatch = async (tierId, instanceId, roundNumber, matchNumber) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setMatchLoading(true);

      const matchData = await contract.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const isPlayer1 = matchData[0].toLowerCase() === account.toLowerCase();

      setCurrentMatch({
        tierId,
        instanceId,
        roundNumber,
        matchNumber,
        player1: matchData[0],
        player2: matchData[1],
        currentTurn: matchData[2],
        winner: matchData[3],
        board: Array.from(matchData[4]),
        matchStatus: Number(matchData[5]),
        isDraw: matchData[6],
        startTime: Number(matchData[7]),
        lastMoveTime: Number(matchData[8]),
        firstPlayer: matchData[9],
        moveCount: Number(matchData[10]),
        lastColumn: Number(matchData[11]),
        isPlayer1,
        isYourTurn: matchData[2].toLowerCase() === account.toLowerCase()
      });

      setMatchLoading(false);
    } catch (error) {
      console.error('Error loading match:', error);
      alert('Error loading match: ' + error.message);
      setMatchLoading(false);
    }
  };

  // Handle make move
  const handleMakeMove = async (column) => {
    if (!contract || !account || !currentMatch) return;

    try {
      setMatchLoading(true);

      const tx = await contract.makeMove(
        currentMatch.tierId,
        currentMatch.instanceId,
        currentMatch.roundNumber,
        currentMatch.matchNumber,
        column
      );

      await tx.wait();

      const updated = await refreshMatchData(contract, account, currentMatch);
      if (updated) setCurrentMatch(updated);

      setMatchLoading(false);
    } catch (error) {
      console.error('Move error:', error);
      alert('Move failed: ' + (error.reason || error.message));
      setMatchLoading(false);
    }
  };

  // Handle manual start
  const handleManualStart = async (tierId, instanceId) => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      const tx = await contract.forceStartTournament(tierId, instanceId);
      await tx.wait();
      await fetchAllTiers(contract, account, true);
      setLoading(false);
    } catch (error) {
      console.error('Force start error:', error);
      alert('Force start failed: ' + error.message);
      setLoading(false);
    }
  };

  // Close match
  const closeMatch = () => setCurrentMatch(null);

  // Initialize read-only contract (only if no wallet connected)
  useEffect(() => {
    // Skip if wallet is already connected (we have a signer contract)
    if (account) return;

    const initReadOnlyContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, C4_ABI, provider);

        setContract(readOnlyContract);
        await fetchAllTiers(readOnlyContract, null, false);
        await fetchCachedStats(readOnlyContract, false);
        setInitialLoading(false);
      } catch (error) {
        console.error('Error initializing contract:', error);
        setInitialLoading(false);
      }
    };

    initReadOnlyContract();
  }, [fetchAllTiers, fetchCachedStats, account]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
        } else {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  // Poll match data
  useEffect(() => {
    if (!currentMatch || !contract || !account) return;

    const doSync = async () => {
      const updated = await refreshMatchData(contract, account, currentMatch);
      if (updated) setCurrentMatch(updated);
      setSyncDots(1);
    };

    const pollInterval = setInterval(doSync, 3000);
    return () => clearInterval(pollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, contract, account, refreshMatchData]);

  // Sync dots animation
  useEffect(() => {
    if (!currentMatch) return;

    const dotsInterval = setInterval(() => {
      setSyncDots(prev => prev >= 3 ? 1 : prev + 1);
    }, 1000);

    return () => clearInterval(dotsInterval);
  }, [currentMatch]);

  // Poll bracket data
  useEffect(() => {
    if (!viewingTournament || !contract) return;

    const doSync = async () => {
      const updated = await refreshTournamentBracket(contract, viewingTournament.tierId, viewingTournament.instanceId);
      if (updated) setViewingTournament(updated);
      setBracketSyncDots(1);
    };

    const pollInterval = setInterval(doSync, 3000);
    return () => clearInterval(pollInterval);
  }, [viewingTournament?.tierId, viewingTournament?.instanceId, contract, refreshTournamentBracket]);

  // Bracket sync dots
  useEffect(() => {
    if (!viewingTournament) return;

    const dotsInterval = setInterval(() => {
      setBracketSyncDots(prev => prev >= 3 ? 1 : prev + 1);
    }, 1000);

    return () => clearInterval(dotsInterval);
  }, [viewingTournament]);

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-blue-500/30 rounded-full"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
              <span className="text-6xl">🔴</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-blue-300 mb-2">Loading Connect Four</h2>
          <p className="text-blue-400/70">Connecting to blockchain...</p>
        </div>
      </div>
    );
  }

  // Match view
  if (currentMatch) {
    const isPlayer1 = currentMatch.player1?.toLowerCase() === account?.toLowerCase();
    const isPlayer2 = currentMatch.player2?.toLowerCase() === account?.toLowerCase();
    const myColor = isPlayer1 ? 'Red' : isPlayer2 ? 'Blue' : 'Spectator';
    const isGameOver = currentMatch.matchStatus === 2;
    const hasWinner = currentMatch.winner && currentMatch.winner !== '0x0000000000000000000000000000000000000000';

    return (
      <div style={{ minHeight: '100vh', background: currentTheme.gradient, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <ParticleBackground colors={currentTheme.particleColors} />

        <div className="max-w-4xl mx-auto px-6 py-8" style={{ position: 'relative', zIndex: 10 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={closeMatch}
              className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Bracket
            </button>
            <div className="flex items-center gap-2 text-cyan-400 text-sm">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              Syncing{'.'.repeat(syncDots)}
            </div>
          </div>

          {/* Game Status */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">Connect Four Match</h2>
            <p className="text-purple-300">You are playing as {myColor} {myColor === 'Red' ? '🔴' : myColor === 'Blue' ? '🔵' : ''}</p>
          </div>

          {/* Turn Indicator */}
          <div className="flex justify-center mb-6">
            {isGameOver ? (
              <div className={`px-6 py-3 rounded-xl font-bold text-lg ${
                hasWinner
                  ? currentMatch.winner.toLowerCase() === account?.toLowerCase()
                    ? 'bg-green-500/20 border-2 border-green-400 text-green-300'
                    : 'bg-purple-500/20 border-2 border-purple-400 text-purple-300'
                  : 'bg-yellow-500/20 border-2 border-yellow-400 text-yellow-300'
              }`}>
                {hasWinner
                  ? currentMatch.winner.toLowerCase() === account?.toLowerCase()
                    ? '🎉 You Won!'
                    : '😢 You Lost'
                  : "🤝 It's a Draw!"
                }
              </div>
            ) : (
              <div className={`px-6 py-3 rounded-xl font-bold text-lg ${
                currentMatch.isYourTurn
                  ? 'bg-green-500/20 border-2 border-green-400 text-green-300 animate-pulse'
                  : 'bg-gray-500/20 border-2 border-gray-400 text-gray-300'
              }`}>
                {currentMatch.isYourTurn ? "🎯 Your Turn!" : "⏳ Opponent's Turn"}
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex justify-between items-center mb-6 max-w-md mx-auto">
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              currentMatch.currentTurn?.toLowerCase() === currentMatch.player1?.toLowerCase() && !isGameOver
                ? 'bg-cyan-500/30 border border-cyan-400'
                : 'bg-black/30'
            }`}>
              <span className="text-2xl">🔴</span>
              <div>
                <div className="text-xs text-gray-400">Red</div>
                <div className="font-mono text-sm">{shortenAddress(currentMatch.player1)}</div>
              </div>
            </div>
            <div className="text-xl font-bold text-gray-500">VS</div>
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              currentMatch.currentTurn?.toLowerCase() === currentMatch.player2?.toLowerCase() && !isGameOver
                ? 'bg-blue-500/30 border border-blue-400'
                : 'bg-black/30'
            }`}>
              <span className="text-2xl">🔵</span>
              <div>
                <div className="text-xs text-gray-400">Blue</div>
                <div className="font-mono text-sm">{shortenAddress(currentMatch.player2)}</div>
              </div>
            </div>
          </div>

          {/* Board */}
          <ConnectFourBoard
            board={currentMatch.board}
            onColumnClick={handleMakeMove}
            currentTurn={currentMatch.currentTurn}
            account={account}
            player1={currentMatch.player1}
            player2={currentMatch.player2}
            matchStatus={currentMatch.matchStatus}
            loading={matchLoading}
            winner={currentMatch.winner}
            lastColumn={currentMatch.lastColumn}
          />

          {/* Loading Overlay */}
          {matchLoading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-xl p-6 text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white">Processing move...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tournament bracket view
  if (viewingTournament) {
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.gradient, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <ParticleBackground colors={currentTheme.particleColors} />

        <div className="max-w-7xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
          <TournamentBracket
            tournamentData={viewingTournament}
            onBack={() => setViewingTournament(null)}
            onEnterMatch={handlePlayMatch}
            account={account}
            loading={loading}
            syncDots={bracketSyncDots}
          />
        </div>
      </div>
    );
  }

  // Main landing view
  return (
    <div style={{ minHeight: '100vh', background: currentTheme.gradient, color: '#fff', position: 'relative', overflow: 'hidden', transition: 'background 0.8s ease-in-out' }}>
      <ParticleBackground colors={currentTheme.particleColors} />

      {/* Back to ETour */}
      <Link
        to="/"
        className="fixed top-24 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-lg border border-white/20 rounded-lg text-white text-sm hover:bg-black/80 transition-all"
      >
        <ArrowLeft size={16} />
      </Link>

      {/* Trust Banner */}
      <div className="bg-blue-900/20 border-b border-blue-400/30 backdrop-blur-lg relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs md:text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center md:justify-start">
              <div className="flex items-center gap-2">
                <Shield className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">100% On-Chain</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">Immutable Rules</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">Every Move Verifiable</span>
              </div>
            </div>
            <a
              href={`https://arbiscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors justify-center md:justify-end"
            >
              <Code size={16} />
              <span className="font-mono">{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`}></div>
              <span className="relative text-8xl">🔴</span>
            </div>
          </div>

          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            Connect Four
          </h1>
          <p className={`text-2xl ${currentTheme.heroText} mb-6`}>
            Drop • Connect • Win
          </p>
          <p className={`text-lg ${currentTheme.heroText} max-w-3xl mx-auto mb-8`}>
            The classic vertical strategy game on the blockchain.
            <br/>
            Drop your discs, connect four in a row, win real ETH.
            <br/>
            Every move is verified on-chain. No cheating possible.
          </p>

          {/* Game Info */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-green-400" size={20} />
                <span className="font-bold text-green-300">Winner Takes 90%</span>
              </div>
              <p className="text-sm text-green-200">Champion walks away with 90% of the pot</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-300">ETH Entry Fees</span>
              </div>
              <p className="text-sm text-yellow-200">Multiple tiers from casual to high stakes</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-purple-400" size={20} />
                <span className="font-bold text-purple-300">Simple Rules</span>
              </div>
              <p className="text-sm text-purple-200">Drop discs, connect 4 in any direction to win</p>
            </div>
          </div>

          {/* Connect Wallet */}
          {!account ? (
            <button
              onClick={connectWallet}
              disabled={loading}
              className={`inline-flex items-center gap-3 bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-10 py-5 rounded-2xl font-bold text-2xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50`}
            >
              <Wallet size={28} />
              {loading ? 'Connecting...' : 'Connect Wallet to Play'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-4 bg-green-500/20 border border-green-400/50 px-8 py-4 rounded-2xl">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-mono text-lg">{shortenAddress(account)}</span>
            </div>
          )}
        </div>

        {/* Tournament Cards */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8 text-cyan-300">Available Tournaments</h2>

          {tournamentsLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-cyan-300">Loading tournaments...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-12 text-purple-300">
              <p>No tournaments available yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((t, idx) => (
                <TournamentCard
                  key={idx}
                  {...t}
                  tierName={getTierName(t.tierId)}
                  onEnroll={() => handleEnroll(t.tierId, t.instanceId, t.entryFee)}
                  onEnter={() => handleEnterTournament(t.tierId, t.instanceId)}
                  onManualStart={handleManualStart}
                  loading={loading}
                  account={account}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cached Stats Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <History className="text-cyan-400" size={48} />
              <div className="flex flex-col items-start">
                <h2 className="text-4xl font-bold text-white">
                  Cached Stats
                </h2>
              </div>
            </div>
            <p className="text-cyan-200/70 text-lg max-w-2xl mx-auto">
              Historical tournament and match data stored on-chain
            </p>
          </div>

          {cachedStatsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-cyan-300">Loading cached stats...</p>
              </div>
            </div>
          ) : cachedStats && (cachedStats.matches?.length > 0 || cachedStats.tournaments?.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cached Tournaments */}
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="text-purple-400" size={32} />
                  <h3 className="text-2xl font-bold text-white">Cached Tournaments</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-400/20">
                    <div className="text-purple-300 text-sm mb-1">Total Cached</div>
                    <div className="text-3xl font-bold text-white">{cachedStats.tournaments?.length || 0}</div>
                  </div>
                  {cachedStats.tournaments?.length > 0 && (
                    <>
                      {/* Organic Tournaments */}
                      {cachedStats.organicTournaments?.length > 0 && (
                        <div className="bg-green-500/10 rounded-lg p-4 border border-green-400/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="text-green-400" size={16} />
                            <div className="text-green-300 text-sm font-semibold">Organic ({cachedStats.organicTournaments.length})</div>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cachedStats.organicTournaments.slice(0, 5).map((tournament, idx) => (
                              <div key={idx} className="bg-green-500/5 p-3 rounded space-y-2">
                                <div className="flex items-center justify-between text-xs border-b border-green-400/20 pb-1">
                                  <span className="text-green-200 font-semibold">Tier {Number(tournament.tierId)}</span>
                                  <span className="text-green-300/70">
                                    {tournament.winner && tournament.winner !== ethers.ZeroAddress
                                      ? `Winner: ${tournament.winner.slice(0, 6)}...${tournament.winner.slice(-4)}`
                                      : 'Completed'}
                                  </span>
                                </div>
                                {tournament.totalAwarded && tournament.totalAwarded > 0n && (
                                  <div className="text-xs text-green-400">
                                    Prize: {parseFloat(ethers.formatEther(tournament.totalAwarded)).toFixed(4)} ETH
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Force Started Tournaments */}
                      {cachedStats.partialTournaments?.length > 0 && (
                        <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-400/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="text-orange-400" size={16} />
                            <div className="text-orange-300 text-sm font-semibold">Force Started ({cachedStats.partialTournaments.length})</div>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cachedStats.partialTournaments.slice(0, 5).map((tournament, idx) => (
                              <div key={idx} className="bg-orange-500/5 p-3 rounded space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-orange-200 font-semibold">Tier {Number(tournament.tierId)}</span>
                                  <span className="text-orange-300/70">
                                    {tournament.winner && tournament.winner !== ethers.ZeroAddress
                                      ? `${tournament.winner.slice(0, 6)}...${tournament.winner.slice(-4)}`
                                      : 'Completed'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Abandoned Tournaments */}
                      {cachedStats.abandonedTournaments?.length > 0 && (
                        <div className="bg-red-500/10 rounded-lg p-4 border border-red-400/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Coins className="text-red-400" size={16} />
                            <div className="text-red-300 text-sm font-semibold">Abandoned ({cachedStats.abandonedTournaments.length})</div>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cachedStats.abandonedTournaments.slice(0, 5).map((tournament, idx) => (
                              <div key={idx} className="bg-red-500/5 p-2 rounded">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-red-200">Tier {Number(tournament.tierId)}</span>
                                  <span className="text-white font-mono">
                                    {tournament.winner && tournament.winner !== ethers.ZeroAddress
                                      ? `${tournament.winner.slice(0, 6)}...${tournament.winner.slice(-4)}`
                                      : 'Unclaimed'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Cached Matches */}
              <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-cyan-400/30">
                <div className="flex items-center gap-3 mb-4">
                  <Grid className="text-cyan-400" size={32} />
                  <h3 className="text-2xl font-bold text-white">Cached Matches</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                    <div className="text-cyan-300 text-sm mb-1">Total Cached</div>
                    <div className="text-3xl font-bold text-white">{cachedStats.matches?.length || 0}</div>
                  </div>
                  {cachedStats.matches?.length > 0 && (
                    <>
                      {/* Match Statistics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                          <div className="text-cyan-300 text-sm mb-1">Wins</div>
                          <div className="text-2xl font-bold text-green-400">
                            {cachedStats.matches.filter(m => m?.winner && m.winner !== ethers.ZeroAddress && !m?.isDraw).length}
                          </div>
                        </div>
                        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20">
                          <div className="text-yellow-300 text-sm mb-1">Draws</div>
                          <div className="text-2xl font-bold text-yellow-400">
                            {cachedStats.matches.filter(m => m?.isDraw).length}
                          </div>
                        </div>
                      </div>

                      {/* Recent Matches */}
                      <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                        <div className="text-cyan-300 text-sm mb-2">Recent Matches</div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {[...cachedStats.matches].slice(-5).reverse().map((match, idx) => (
                            <div key={idx} className={`flex items-center justify-between text-xs p-2 rounded ${
                              match?.isDraw
                                ? 'bg-yellow-500/10 border border-yellow-400/20'
                                : 'bg-cyan-500/5 border border-cyan-400/10'
                            }`}>
                              <span className={match?.isDraw ? 'text-yellow-300 font-bold' : 'text-cyan-200'}>
                                {match?.isDraw ? '🟰 Draw' : '🏆 Winner'}
                              </span>
                              <span className="text-white font-mono">
                                {match?.isDraw
                                  ? 'Tie Game'
                                  : match?.winner ? `${match.winner.slice(0, 6)}...${match.winner.slice(-4)}` : 'Unknown'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Average Move Count */}
                      <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-400/20">
                        <div className="text-purple-300 text-sm mb-1">Average Moves per Match</div>
                        <div className="text-2xl font-bold text-purple-400">
                          {(cachedStats.matches.reduce((sum, m) => sum + (Number(m?.moveCount) || 0), 0) / cachedStats.matches.length).toFixed(1)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-purple-500/10 rounded-2xl p-8 border border-purple-400/20 max-w-md mx-auto">
                <History className="text-purple-400 mx-auto mb-4" size={48} />
                <p className="text-purple-300">No cached stats available yet.</p>
                <p className="text-purple-300/70 text-sm mt-2">Play some matches to see statistics here!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Particle Animation Keyframes */}
      <style>{`
        @keyframes particle-float {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
