/**
 * ChessOnChain - On-Chain Chess Protocol Frontend
 *
 * Chess tournaments on the blockchain with full game verification
 * Uses the same design language as the TicTacToe frontend
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Swords, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Play, Users, Zap, Award, Coins, ChevronDown, ChevronUp, Info,
  History, AlertCircle, ArrowLeft
} from 'lucide-react';
import { ethers } from 'ethers';
import CHESS_ABI from './COCABI.json';

// Chess piece symbols
const PIECE_SYMBOLS = {
  white: { pawn: '♙', knight: '♘', bishop: '♗', rook: '♖', queen: '♕', king: '♔' },
  black: { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚' }
};

const PIECE_TYPES = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

// Get piece symbol from contract piece data
const getPieceSymbol = (piece) => {
  if (!piece) return '';
  const pieceType = Number(piece.pieceType);
  const pieceColor = Number(piece.color);
  if (pieceType === 0) return '';
  const color = pieceColor === 1 ? 'white' : 'black';
  return PIECE_SYMBOLS[color][PIECE_TYPES[pieceType]] || '';
};

// Chess piece particles for background
const CHESS_PARTICLES = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];

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
        symbol: CHESS_PARTICLES[Math.floor(Math.random() * CHESS_PARTICLES.length)]
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
              fontSize: '20px'
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

// Game status labels
const getStatusLabel = (status) => {
  switch(status) {
    case 0: return 'Waiting for Players';
    case 1: return 'Ready to Start';
    case 2: return 'Game in Progress';
    case 3: return 'Game Complete';
    default: return 'Unknown';
  }
};

const getStatusEmoji = (status) => {
  switch(status) {
    case 0: return '⏳';
    case 1: return '✅';
    case 2: return '♟️';
    case 3: return '🏆';
    default: return '❓';
  }
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

// Chess Board Component
const ChessBoard = ({
  board,
  onMove,
  currentTurn,
  account,
  player1,
  player2,
  matchStatus,
  loading,
  whiteInCheck,
  blackInCheck,
  lastMoveTime,
  startTime
}) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [boardSize, setBoardSize] = useState(null);
  const containerRef = useRef(null);

  // Calculate board size to fit viewport while staying square
  useEffect(() => {
    const updateSize = () => {
      const vh60 = window.innerHeight * 0.6;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      const size = Math.min(vh60, containerWidth);
      setBoardSize(size);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Determine if current user is white or black
  const isPlayer1 = account && player1?.toLowerCase() === account.toLowerCase();
  const isPlayer2 = account && player2?.toLowerCase() === account.toLowerCase();
  const isWhite = isPlayer1; // Player 1 is white
  const isMyTurn = account && currentTurn?.toLowerCase() === account.toLowerCase();

  // Flip board for white player (contract stores board with black at top by default)
  const shouldFlip = isPlayer1;

  // Timer state
  const MOVE_TIMEOUT = 300; // 5 minutes
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (matchStatus !== 1) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const timeRef = lastMoveTime > 0 ? lastMoveTime : startTime;
      if (timeRef > 0) {
        const elapsed = now - timeRef;
        const remaining = Math.max(0, MOVE_TIMEOUT - elapsed);
        setTimeRemaining(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastMoveTime, startTime, matchStatus]);

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert display index to actual board index based on flip
  const getActualIndex = (displayIdx) => {
    if (shouldFlip) {
      return 63 - displayIdx;
    }
    return displayIdx;
  };

  // Get square color (for alternating pattern) - based on actual board position
  const getSquareColor = (actualIdx) => {
    const row = Math.floor(actualIdx / 8);
    const col = actualIdx % 8;
    // In chess, a1 (bottom-left for white) is dark, h1 is light
    // a1 = index 56, row=7, col=0, (7+0)%2=1 -> should be dark (return false for light)
    return (row + col) % 2 === 1;
  };

  // Check if a piece belongs to current player
  const isMyPiece = (piece) => {
    if (!piece) return false;
    const pieceType = Number(piece.pieceType);
    const pieceColor = Number(piece.color);
    if (pieceType === 0) return false;
    if (isWhite && pieceColor === 1) return true;
    if (!isWhite && isPlayer2 && pieceColor === 2) return true;
    return false;
  };

  // Handle square click
  const handleSquareClick = (displayIdx) => {
    console.log('Square clicked:', displayIdx, { matchStatus, isMyTurn, loading, isWhite, isPlayer1, isPlayer2 });
    if (matchStatus !== 1 || !isMyTurn || loading) {
      console.log('Click rejected:', { matchStatus, isMyTurn, loading });
      return;
    }

    const actualIdx = getActualIndex(displayIdx);
    const piece = board[actualIdx];
    console.log('Piece at square:', actualIdx, piece, 'isMyPiece:', isMyPiece(piece));

    if (selectedSquare === null) {
      // Select piece if it belongs to current player
      if (isMyPiece(piece)) {
        console.log('Selected piece at:', displayIdx);
        setSelectedSquare(displayIdx);
      }
    } else {
      const fromActual = getActualIndex(selectedSquare);
      const fromPiece = board[fromActual];

      // If clicking on own piece, reselect
      if (isMyPiece(piece)) {
        setSelectedSquare(displayIdx);
        return;
      }

      // Check for pawn promotion
      const toRow = Math.floor(actualIdx / 8);
      const isPawn = fromPiece && Number(fromPiece.pieceType) === 1;
      const isPromotionRank = (isWhite && toRow === 0) || (!isWhite && toRow === 7);

      if (isPawn && isPromotionRank) {
        // Show promotion dialog
        setPromotionSquare(actualIdx);
        setPendingMove({ from: fromActual, to: actualIdx });
      } else {
        // Execute move
        onMove(fromActual, actualIdx, 0); // 0 = no promotion
        setSelectedSquare(null);
      }
    }
  };

  // Handle promotion selection
  const handlePromotion = (pieceType) => {
    if (pendingMove) {
      onMove(pendingMove.from, pendingMove.to, pieceType);
      setPromotionSquare(null);
      setPendingMove(null);
      setSelectedSquare(null);
    }
  };

  // Render board
  const renderBoard = () => {
    const squares = [];
    for (let displayIdx = 0; displayIdx < 64; displayIdx++) {
      const actualIdx = getActualIndex(displayIdx);
      const piece = board[actualIdx];
      const isLight = getSquareColor(actualIdx);
      const isSelected = selectedSquare === displayIdx;

      // Check if this square's king is in check
      const pieceType = piece ? Number(piece.pieceType) : 0;
      const pieceColor = piece ? Number(piece.color) : 0;
      const isKingInCheck = pieceType === 6 && (
        (pieceColor === 1 && whiteInCheck) ||
        (pieceColor === 2 && blackInCheck)
      );

      // Get file and rank labels
      // Use display position for WHERE to show labels (left column, bottom row)
      const displayRow = Math.floor(displayIdx / 8);
      const displayCol = displayIdx % 8;
      const showRankLabel = displayCol === 0; // Left column of display
      const showFileLabel = displayRow === 7; // Bottom row of display
      // Use actual position for WHAT labels to show
      const actualRow = Math.floor(actualIdx / 8);
      const actualCol = actualIdx % 8;
      const rankLabel = 8 - actualRow;
      const fileLabel = String.fromCharCode(97 + actualCol);

      squares.push(
        <div
          key={displayIdx}
          onClick={() => handleSquareClick(displayIdx)}
          className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all duration-150
            ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
            ${isSelected ? 'ring-4 ring-yellow-400 ring-inset' : ''}
            ${isKingInCheck ? 'bg-red-500' : ''}
            ${isMyTurn && isMyPiece(piece) ? 'hover:brightness-110' : ''}
          `}
        >
          <span
            className={`text-4xl md:text-5xl select-none ${pieceColor === 1 ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'}`}
          >
            {getPieceSymbol(piece)}
          </span>

          {/* Rank labels */}
          {showRankLabel && (
            <span className={`absolute left-1 top-0.5 text-xs font-bold ${isLight ? 'text-amber-700' : 'text-amber-100'}`}>
              {rankLabel}
            </span>
          )}

          {/* File labels */}
          {showFileLabel && (
            <span className={`absolute right-1 bottom-0.5 text-xs font-bold ${isLight ? 'text-amber-700' : 'text-amber-100'}`}>
              {fileLabel}
            </span>
          )}
        </div>
      );
    }
    return squares;
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Timer */}
      {matchStatus === 1 && (
        <div className={`mb-4 text-center py-2 px-4 rounded-lg font-mono text-lg font-bold w-full ${
          timeRemaining !== null && timeRemaining < 60
            ? 'bg-red-500/30 text-red-300 animate-pulse'
            : 'bg-blue-500/20 text-blue-300'
        }`}>
          <Clock className="inline-block mr-2" size={20} />
          Move Timer: {formatTime(timeRemaining)}
        </div>
      )}

      {/* Board container with JS-calculated size for cross-browser compatibility */}
      <div ref={containerRef} className="w-full flex justify-center">
        <div
          className="grid grid-cols-8 gap-0 border-4 border-amber-900 rounded-lg overflow-hidden shadow-2xl"
          style={boardSize ? { width: boardSize, height: boardSize } : { width: '60vh', height: '60vh', maxWidth: '100%' }}
        >
          {renderBoard()}
        </div>
      </div>

      {/* Promotion Dialog */}
      {promotionSquare !== null && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
          <div className="bg-slate-800 p-6 rounded-xl border-2 border-purple-400">
            <h3 className="text-white font-bold text-xl mb-4 text-center">Choose Promotion</h3>
            <div className="flex gap-4">
              {[5, 4, 3, 2].map((pieceType) => (
                <button
                  key={pieceType}
                  onClick={() => handlePromotion(pieceType)}
                  className="w-16 h-16 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors flex items-center justify-center text-4xl"
                >
                  {PIECE_SYMBOLS[isWhite ? 'white' : 'black'][PIECE_TYPES[pieceType]]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Turn indicator */}
      {matchStatus === 1 && (
        <div className={`mt-4 text-center py-3 px-4 rounded-xl font-bold text-lg border-2 ${
          isMyTurn
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 text-green-300 animate-pulse'
            : 'bg-blue-500/10 border-blue-400/50 text-blue-300'
        }`} style={boardSize ? { width: boardSize } : { maxWidth: '100%' }}>
          {isMyTurn ? (
            <div className="space-y-1">
              <div className="text-xl">♟️ YOUR TURN</div>
              <div className="text-sm opacity-80">You are playing as {isWhite ? 'White' : 'Black'}</div>
            </div>
          ) : (
            <div className="space-y-1">
              <div>⏳ Opponent's Turn</div>
              <div className="text-sm opacity-80">Waiting for their move...</div>
            </div>
          )}
        </div>
      )}

      {/* Check indicator */}
      {(whiteInCheck || blackInCheck) && matchStatus === 1 && (
        <div className="mt-2 text-center py-2 px-4 rounded-lg bg-red-500/30 border border-red-400 text-red-300 font-bold animate-pulse" style={boardSize ? { width: boardSize } : { maxWidth: '100%' }}>
          ⚠️ {whiteInCheck ? 'White' : 'Black'} King is in CHECK!
        </div>
      )}
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
  theme,
  enrollmentTimeout,
  hasStartedViaTimeout,
  onManualStart,
  onClaimAbandonedPool,
  tournamentStatus,
  account
}) => {
  const isFull = currentEnrolled >= maxPlayers;
  const enrollmentPercentage = (currentEnrolled / maxPlayers) * 100;

  // Escalation system state
  const [escalationState, setEscalationState] = useState({
    activeEscalation: 0,
    canStartEscalation1: false,
    canStartEscalation2: false,
    timeToEscalation1: 0,
    timeToEscalation2: 0,
    forfeitPool: 0n
  });

  useEffect(() => {
    if (!enrollmentTimeout) {
      setEscalationState({
        activeEscalation: 0,
        canStartEscalation1: false,
        canStartEscalation2: false,
        timeToEscalation1: 0,
        timeToEscalation2: 0,
        forfeitPool: 0n
      });
      return;
    }

    const updateEscalationState = () => {
      const now = Math.floor(Date.now() / 1000);
      const escalation1Start = Number(enrollmentTimeout.escalation1Start);
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const forfeitPool = enrollmentTimeout.forfeitPool || 0n;

      const timeToEscalation1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
      const timeToEscalation2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;

      const canStartEscalation1 = escalation1Start > 0 && now >= escalation1Start;
      const canStartEscalation2 = escalation2Start > 0 && now >= escalation2Start;

      let activeEscalation = 0;
      if (canStartEscalation2) {
        activeEscalation = 2;
      } else if (canStartEscalation1) {
        activeEscalation = 1;
      }

      setEscalationState({
        activeEscalation,
        canStartEscalation1,
        canStartEscalation2,
        timeToEscalation1,
        timeToEscalation2,
        forfeitPool
      });
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

  // Theme colors
  const colors = theme === 'dream'
    ? {
        cardBg: 'from-purple-600/20 to-blue-600/20',
        cardBorder: 'border-purple-400/40 hover:border-purple-400/70',
        cardShadow: 'hover:shadow-purple-500/20',
        icon: 'text-purple-400',
        text: 'text-purple-300',
        textMuted: 'text-purple-300/70',
        progress: 'from-purple-500 to-blue-500',
        buttonEnter: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
      }
    : {
        cardBg: 'from-blue-600/20 to-cyan-600/20',
        cardBorder: 'border-blue-400/40 hover:border-blue-400/70',
        cardShadow: 'hover:shadow-blue-500/20',
        icon: 'text-blue-400',
        text: 'text-blue-300',
        textMuted: 'text-blue-300/70',
        progress: 'from-blue-500 to-cyan-500',
        buttonEnter: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
      };

  return (
    <div className={`bg-gradient-to-br ${colors.cardBg} backdrop-blur-lg rounded-2xl p-6 border-2 ${colors.cardBorder} transition-all hover:shadow-xl ${colors.cardShadow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className={colors.icon} size={24} />
          <div>
            <h3 className="text-xl font-bold text-white">
              {tierName || `Tier ${tierId}`}
            </h3>
            <div className={`text-xs ${colors.textMuted}`}>Instance #{instanceId}</div>
          </div>
        </div>
        {isFull && (
          <div className="bg-red-500/20 border border-red-400 px-3 py-1 rounded-full">
            <span className="text-red-300 text-xs font-bold">FULL</span>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className={colors.text} size={16} />
            <span className={`${colors.text} text-xs font-semibold`}>Players</span>
          </div>
          <div className="text-white font-bold text-lg">
            {currentEnrolled} / {maxPlayers}
          </div>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="text-yellow-300" size={16} />
            <span className="text-yellow-300 text-xs font-semibold">Entry Fee</span>
          </div>
          <div className="text-white font-bold text-lg">
            {entryFee} ETH
          </div>
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

      {/* Escalation timers */}
      {enrollmentTimeout && (escalationState.timeToEscalation1 > 0 || escalationState.activeEscalation > 0) && (
        <div className="mb-4 space-y-2">
          {escalationState.timeToEscalation1 > 0 && escalationState.activeEscalation === 0 && (
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/50 rounded-lg p-3 text-center">
              <Clock className="inline-block text-orange-400 mr-2" size={16} />
              <span className="text-orange-300 text-sm">Force Start in: {formatTime(escalationState.timeToEscalation1)}</span>
            </div>
          )}
          {escalationState.activeEscalation >= 1 && (
            <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-2">
              <span className="text-green-300 text-xs font-bold">✓ Force Start Available</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {tournamentStatus === 0 && escalationState.canStartEscalation1 && isEnrolled && (
        <button
          onClick={() => onManualStart(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mb-2"
        >
          <Zap size={18} />
          {loading ? 'Starting...' : 'Force Start Tournament'}
        </button>
      )}

      {isEnrolled ? (
        <button
          onClick={onEnter}
          disabled={loading || !account}
          className={`w-full bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
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
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <Trophy size={18} />
              {loading ? 'Enrolling...' : !account ? 'Connect Wallet to Enroll' : 'Enroll Now'}
            </button>
          )}

          <button
            onClick={onEnter}
            disabled={loading}
            className={`w-full ${tournamentStatus === 0 && !isFull ? 'mt-2' : ''} bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 border ${colors.cardBorder}`}
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
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onManualStart, onEnroll, account, loading, syncDots, theme, isEnrolled, entryFee, isFull }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers, enrollmentTimeout } = tournamentData;

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
      if (winner && winner.toLowerCase() === zeroAddress && !isDraw) {
        return 'text-red-400';
      }
      return 'text-green-400';
    }
    return 'text-gray-400';
  };

  const colors = theme === 'dream'
    ? {
        headerBg: 'from-purple-600/30 to-blue-600/30',
        headerBorder: 'border-purple-400/30',
        text: 'text-purple-300',
        textHover: 'hover:text-purple-200',
        icon: 'text-purple-400'
      }
    : {
        headerBg: 'from-blue-600/30 to-cyan-600/30',
        headerBorder: 'border-blue-400/30',
        text: 'text-blue-300',
        textHover: 'hover:text-blue-200',
        icon: 'text-blue-400'
      };

  return (
    <div className="mb-16">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colors.headerBg} backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder} mb-8`}>
        <button
          onClick={onBack}
          className={`mb-4 flex items-center gap-2 ${colors.text} ${colors.textHover} transition-colors`}
        >
          <ChevronDown className="rotate-90" size={20} />
          Back to Tournaments
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Trophy className={colors.icon} size={48} />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-bold text-white">
                  Chess Tournament T{tierId}-I{instanceId}
                </h2>
                <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  Syncing{'.'.repeat(syncDots)}
                </span>
              </div>
              <p className={colors.text}>
                Round {currentRound + 1} of {totalRounds}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`${colors.text} text-sm`}>Prize Pool</div>
            <div className="text-3xl font-bold text-yellow-400">
              {ethers.formatEther(prizePool)} ETH
            </div>
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

        {/* Enrolled Players List */}
        {enrolledPlayers && enrolledPlayers.length > 0 && (
          <div className="mt-4 bg-black/20 rounded-lg p-4 border border-purple-400/30">
            <div className="flex items-center gap-2 mb-3">
              <Users className={colors.icon} size={20} />
              <h4 className={`${colors.text} font-semibold`}>
                Enrolled Players ({enrolledPlayers.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {enrolledPlayers.map((address, idx) => (
                <div
                  key={idx}
                  className={`font-mono text-sm p-2 rounded ${
                    address.toLowerCase() === account?.toLowerCase()
                      ? 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 font-bold'
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

      {/* Bracket View */}
      <div className={`bg-gradient-to-br from-slate-900/50 to-${theme === 'dream' ? 'purple' : 'blue'}-900/30 backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder}`}>
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
                          <span className="text-purple-300 text-sm font-semibold">
                            Match {matchIdx + 1}
                          </span>
                          <span className={`text-xs font-bold ${getMatchStatusColor(match.matchStatus, match.winner, match.isDraw)}`}>
                            {getMatchStatusText(match.matchStatus, match.winner, match.isDraw)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {/* Player 1 - White */}
                          <div className={`flex items-center justify-between p-2 rounded ${
                            match.winner?.toLowerCase() === match.player1?.toLowerCase()
                              ? 'bg-green-500/20 border border-green-400/50'
                              : match.player1?.toLowerCase() === account?.toLowerCase()
                              ? 'bg-yellow-500/20 border border-yellow-400/50'
                              : 'bg-purple-500/10'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-white text-lg">♔</span>
                              <span className="text-white font-mono text-sm">
                                {shortenAddress(match.player1)}
                              </span>
                            </div>
                            {match.winner?.toLowerCase() === match.player1?.toLowerCase() && (
                              <Award className="text-green-400" size={16} />
                            )}
                          </div>

                          <div className="text-center text-purple-400 font-bold">VS</div>

                          {/* Player 2 - Black */}
                          <div className={`flex items-center justify-between p-2 rounded ${
                            match.winner?.toLowerCase() === match.player2?.toLowerCase()
                              ? 'bg-green-500/20 border border-green-400/50'
                              : match.player2?.toLowerCase() === account?.toLowerCase()
                              ? 'bg-yellow-500/20 border border-yellow-400/50'
                              : 'bg-purple-500/10'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 text-lg">♚</span>
                              <span className="text-white font-mono text-sm">
                                {shortenAddress(match.player2)}
                              </span>
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
                              className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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

// Main Chess Component
export default function ChessOnChain() {
  const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const EXPECTED_CHAIN_ID = 412346;

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // Game State
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [contractStatus, setContractStatus] = useState('not_checked');

  // Theme State
  const [theme, setTheme] = useState('dream');
  const [showThemeToggle, setShowThemeToggle] = useState(true);

  // Tournament State
  const [tournaments, setTournaments] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [syncDots, setSyncDots] = useState(1);

  // FAQ State
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Cached Stats State
  const [cachedStats, setCachedStats] = useState(null);
  const [cachedStatsLoading, setCachedStatsLoading] = useState(false);

  // FAQ data for chess
  const faqs = [
    {
      q: "How do chess tournaments work?",
      a: "Chess tournaments are bracket-style competitions on the blockchain. Players enroll by paying an entry fee, then compete in single-elimination matches. Each move is recorded on-chain, and the smart contract validates all moves according to official chess rules. Winners advance until a champion is crowned."
    },
    {
      q: "Why chess on the blockchain?",
      a: "Chess is the perfect game for blockchain: it's deterministic, skill-based, and has clear rules that can be fully encoded in a smart contract. Every move is recorded on-chain, making cheating impossible. Game outcomes are cryptographically secured and permanent."
    },
    {
      q: "What if my opponent doesn't move?",
      a: "Each player has a time limit per move (5 minutes). If a player fails to make a move within the time limit, their opponent can claim victory through the timeout mechanism. The smart contract enforces all timeouts automatically—no disputes, no moderators needed."
    },
    {
      q: "Are all chess rules supported?",
      a: "Yes! The smart contract implements full chess rules including castling (both kingside and queenside), en passant captures, pawn promotion to any piece, check and checkmate detection, and stalemate draws. Every special move is validated on-chain."
    },
    {
      q: "How do I know the prize pool is safe?",
      a: "All entry fees go directly to the smart contract. The contract holds the funds and distributes them automatically when a winner is determined. No human can access the funds. You can verify this by reading the contract code on the block explorer."
    }
  ];

  // Theme colors
  const themeColors = {
    dream: {
      primary: 'rgba(0, 191, 255, 0.5)',
      secondary: 'rgba(138, 43, 226, 0.5)',
      gradient: 'linear-gradient(135deg, #0a0020 0%, #1a0050 50%, #0a0030 100%)',
      border: 'rgba(0, 255, 255, 0.3)',
      glow: 'rgba(0, 255, 255, 0.3)',
      particleColors: ['#00ffff', '#8a2be2'],
      icon: '🌙',
      label: 'Dare to Level Up?',
      heroGlow: 'from-blue-500 via-cyan-500 to-blue-500',
      heroIcon: 'text-blue-400',
      heroTitle: 'from-blue-400 via-cyan-400 to-blue-400',
      heroText: 'text-blue-200',
      heroSubtext: 'text-blue-300',
      buttonGradient: 'from-blue-500 to-cyan-500',
      buttonHover: 'hover:from-blue-600 hover:to-cyan-600',
    },
    daring: {
      primary: 'rgba(255, 69, 0, 0.5)',
      secondary: 'rgba(255, 165, 0, 0.5)',
      gradient: 'linear-gradient(135deg, #1a0000 0%, #330a00 50%, #1a0500 100%)',
      border: 'rgba(255, 69, 0, 0.3)',
      glow: 'rgba(255, 69, 0, 0.3)',
      particleColors: ['#ff4500', '#ffa500'],
      icon: '✨',
      label: 'Back to Classic',
      heroGlow: 'from-red-500 via-orange-500 to-red-500',
      heroIcon: 'text-red-400',
      heroTitle: 'from-red-400 via-orange-400 to-red-400',
      heroText: 'text-red-200',
      heroSubtext: 'text-orange-300',
      buttonGradient: 'from-red-500 to-orange-500',
      buttonHover: 'hover:from-red-600 hover:to-orange-600',
    }
  };

  const currentTheme = themeColors[theme];
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Cycle theme
  const cycleTheme = () => {
    setTheme(prev => prev === 'dream' ? 'daring' : 'dream');
  };

  // Switch to Local Network
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

  // Connect Wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask to use this dApp!');
        return;
      }

      setLoading(true);

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();

      const networkData = {
        name: network.name || 'Unknown',
        chainId: network.chainId.toString(),
        isExpected: network.chainId === BigInt(EXPECTED_CHAIN_ID)
      };

      setNetworkInfo(networkData);

      if (network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
        const shouldSwitch = window.confirm(
          `Wrong Network! Expected Chain ID: ${EXPECTED_CHAIN_ID}\nSwitch networks?`
        );
        if (shouldSwitch) {
          await switchToLocalNetwork();
          window.location.reload();
          return;
        }
      }

      const web3Signer = await web3Provider.getSigner();

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CHESS_ABI.abi,
        web3Signer
      );

      setAccount(accounts[0]);
      setContract(contractInstance);

      await loadContractData(contractInstance, false);
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
      setLoading(false);
    }
  };

  // Load contract data
  const loadContractData = async (contractInstance, isInitialLoad = false) => {
    // Always try to fetch cached stats first
    try {
      console.log('🔄 Fetching cached stats...');
      setCachedStatsLoading(true);

      let matches = [];
      let tournaments = [];

      // Fetch recent cached matches
      try {
        const recentMatches = await contractInstance.getRecentCachedMatches(100);
        matches = Array.from(recentMatches).filter(m => m && m.exists);
        console.log('✅ Fetched', matches.length, 'cached matches');
      } catch (err) {
        console.warn('Error fetching cached matches:', err.message || err);
      }

      // Fetch all completed tournaments
      try {
        const allTournaments = await contractInstance.getAllCompletedTournaments();
        tournaments = Array.from(allTournaments).filter(t => t && t.exists);
        console.log('✅ Fetched', tournaments.length, 'cached tournaments');
      } catch (err) {
        console.warn('Error fetching cached tournaments:', err.message || err);
      }

      // Categorize tournaments by completion type
      // CompletionType: 0=NotCompleted, 1=Organic, 2=Partial, 3=Abandoned
      const organicTournaments = tournaments.filter(t => Number(t.completionType) === 1);
      const partialTournaments = tournaments.filter(t => Number(t.completionType) === 2);
      const abandonedTournaments = tournaments.filter(t => Number(t.completionType) === 3);

      setCachedStats({
        matches,
        tournaments,
        organicTournaments,
        partialTournaments,
        abandonedTournaments
      });
      setCachedStatsLoading(false);
    } catch (err) {
      console.error('Could not fetch cached stats:', err);
      setCachedStats({ matches: [], tournaments: [], organicTournaments: [], partialTournaments: [], abandonedTournaments: [] });
      setCachedStatsLoading(false);
    }

    // Verify contract deployment
    try {
      setContractStatus('checking');

      const provider = contractInstance.runner.provider;
      const contractAddress = await contractInstance.getAddress();
      const code = await provider.getCode(contractAddress);

      if (code === '0x' || code === '0x0') {
        setContractStatus('not_deployed');
        throw new Error(`No contract found at ${contractAddress}`);
      }

      setContractStatus('deployed');

      if (isInitialLoad) {
        await fetchAllTiers(false);
        setInitialLoading(false);
      }
    } catch (error) {
      console.error('Error verifying contract:', error);
      if (isInitialLoad) {
        setInitialLoading(false);
      }
    }
  };

  // Fetch all tournament tiers
  const fetchAllTiers = useCallback(async (silent = false) => {
    if (!contract) return;

    if (!silent) {
      setTournamentsLoading(true);
    }

    const allTournaments = [];

    for (let tierId = 0; tierId <= 6; tierId++) {
      try {
        const tierOverview = await contract.getTierOverview(tierId);
        const statuses = tierOverview[0];
        const enrolledCounts = tierOverview[1];
        const prizePools = tierOverview[2];

        const tierConfig = await contract.tierConfigs(tierId);
        const maxPlayers = Number(tierConfig.playerCount);

        const fee = await contract.ENTRY_FEES(tierId);
        const entryFeeFormatted = ethers.formatEther(fee);

        for (let i = 0; i < statuses.length; i++) {
          let isEnrolled = false;
          let enrollmentTimeout = null;

          if (account) {
            try {
              isEnrolled = await contract.isEnrolled(tierId, i, account);
            } catch (err) {}
          }

          try {
            const tournamentInfo = await contract.tournaments(tierId, i);
            enrollmentTimeout = tournamentInfo.enrollmentTimeout;
          } catch (err) {}

          allTournaments.push({
            tierId,
            instanceId: i,
            status: Number(statuses[i]),
            enrolledCount: Number(enrolledCounts[i]),
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

    allTournaments.sort((a, b) => b.enrolledCount - a.enrolledCount);
    setTournaments(allTournaments);

    if (!silent) {
      setTournamentsLoading(false);
    }
  }, [contract, account]);

  // Refresh tournament bracket data
  const refreshTournamentBracket = useCallback(async (contractInstance, tierId, instanceId) => {
    try {
      const tournamentInfo = await contractInstance.getTournamentInfo(tierId, instanceId);
      const tierConfig = await contractInstance.tierConfigs(tierId);
      const enrolledPlayers = await contractInstance.getEnrolledPlayers(tierId, instanceId);

      const rounds = [];
      const totalRounds = Math.ceil(Math.log2(Number(tierConfig.playerCount)));

      for (let roundNum = 0; roundNum <= Number(tournamentInfo[2]); roundNum++) {
        try {
          const roundInfo = await contractInstance.getRoundInfo(tierId, instanceId, roundNum);
          const matches = [];

          for (let matchNum = 0; matchNum < Number(roundInfo.totalMatches); matchNum++) {
            try {
              const matchData = await contractInstance.getChessMatch(tierId, instanceId, roundNum, matchNum);
              matches.push({
                player1: matchData[0],
                player2: matchData[1],
                currentTurn: matchData[2],
                winner: matchData[3],
                matchStatus: Number(matchData[4]),
                isDraw: matchData[5],
                startTime: Number(matchData[6]),
                lastMoveTime: Number(matchData[7])
              });
            } catch (err) {
              matches.push({
                player1: ethers.ZeroAddress,
                player2: ethers.ZeroAddress,
                matchStatus: 0
              });
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
      const matchData = await contractInstance.getChessMatch(
        match.tierId, match.instanceId, match.roundNumber, match.matchNumber
      );

      const board = await contractInstance.getBoard(
        match.tierId, match.instanceId, match.roundNumber, match.matchNumber
      );

      const isPlayer1 = matchData[0].toLowerCase() === userAccount.toLowerCase();

      return {
        ...match,
        player1: matchData[0],
        player2: matchData[1],
        currentTurn: matchData[2],
        winner: matchData[3],
        matchStatus: Number(matchData[4]),
        isDraw: matchData[5],
        startTime: Number(matchData[6]),
        lastMoveTime: Number(matchData[7]),
        fullMoveNumber: Number(matchData[8]),
        whiteInCheck: matchData[9],
        blackInCheck: matchData[10],
        board: Array.from(board),
        isPlayer1,
        isYourTurn: matchData[2].toLowerCase() === userAccount.toLowerCase()
      };
    } catch (error) {
      console.error('Error refreshing match:', error);
      return null;
    }
  }, []);

  // Handle enroll in tournament
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
      await fetchAllTiers(true);
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
      if (bracketData) {
        setViewingTournament(bracketData);
      }
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

      const matchData = await contract.getChessMatch(tierId, instanceId, roundNumber, matchNumber);
      const board = await contract.getBoard(tierId, instanceId, roundNumber, matchNumber);

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
        matchStatus: Number(matchData[4]),
        isDraw: matchData[5],
        startTime: Number(matchData[6]),
        lastMoveTime: Number(matchData[7]),
        fullMoveNumber: Number(matchData[8]),
        whiteInCheck: matchData[9],
        blackInCheck: matchData[10],
        board: Array.from(board),
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
  const handleMakeMove = async (from, to, promotion = 0) => {
    if (!contract || !account || !currentMatch) return;

    try {
      setMatchLoading(true);

      const tx = await contract.makeMove(
        currentMatch.tierId,
        currentMatch.instanceId,
        currentMatch.roundNumber,
        currentMatch.matchNumber,
        from,
        to,
        promotion
      );

      await tx.wait();

      // Refresh match data
      const updated = await refreshMatchData(contract, account, currentMatch);
      if (updated) {
        setCurrentMatch(updated);
      }

      setMatchLoading(false);
    } catch (error) {
      console.error('Move error:', error);
      alert('Move failed: ' + (error.reason || error.message));
      setMatchLoading(false);
    }
  };

  // Handle resign
  const handleResign = async () => {
    if (!contract || !account || !currentMatch) return;

    if (!window.confirm('Are you sure you want to resign? This will forfeit the match.')) {
      return;
    }

    try {
      setMatchLoading(true);

      const tx = await contract.resign(
        currentMatch.tierId,
        currentMatch.instanceId,
        currentMatch.roundNumber,
        currentMatch.matchNumber
      );

      await tx.wait();
      setCurrentMatch(null);
      setMatchLoading(false);
    } catch (error) {
      console.error('Resign error:', error);
      alert('Resign failed: ' + error.message);
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
      await fetchAllTiers(true);
      setLoading(false);
    } catch (error) {
      console.error('Force start error:', error);
      alert('Force start failed: ' + error.message);
      setLoading(false);
    }
  };

  // Close match view
  const closeMatch = () => {
    setCurrentMatch(null);
  };

  // Initialize contract in read-only mode
  useEffect(() => {
    const initReadOnlyContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

        const readOnlyContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CHESS_ABI.abi,
          provider
        );

        setContract(readOnlyContract);
        await loadContractData(readOnlyContract, true);
      } catch (error) {
        console.error('Error initializing contract:', error);
        setInitialLoading(false);
      }
    };

    if (!contract) {
      initReadOnlyContract();
    }
  }, []);

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

  // Fetch tournaments when contract changes
  useEffect(() => {
    if (contract) {
      fetchAllTiers();
    }
  }, [contract, account, fetchAllTiers]);

  // Poll match data
  const matchRef = useRef(currentMatch);
  const contractRef = useRef(contract);
  const accountRef = useRef(account);

  useEffect(() => {
    matchRef.current = currentMatch;
    contractRef.current = contract;
    accountRef.current = account;
  }, [currentMatch, contract, account]);

  useEffect(() => {
    if (!currentMatch || !contract || !account) return;

    const doSync = async () => {
      const match = matchRef.current;
      const contractInstance = contractRef.current;
      const userAccount = accountRef.current;

      if (!match || !contractInstance || !userAccount) return;

      const updated = await refreshMatchData(contractInstance, userAccount, match);
      if (updated) setCurrentMatch(updated);
      setSyncDots(1);
    };

    const pollInterval = setInterval(doSync, 3000);
    return () => clearInterval(pollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, refreshMatchData]);

  // Sync dots animation
  useEffect(() => {
    if (!currentMatch) return;

    const dotsInterval = setInterval(() => {
      setSyncDots(prev => prev >= 3 ? 3 : prev + 1);
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
  }, [viewingTournament?.tierId, viewingTournament?.instanceId, refreshTournamentBracket, contract]);

  // Bracket sync dots
  useEffect(() => {
    if (!viewingTournament) return;

    const dotsInterval = setInterval(() => {
      setBracketSyncDots(prev => prev >= 3 ? 3 : prev + 1);
    }, 1000);

    return () => clearInterval(dotsInterval);
  }, [viewingTournament]);

  // Scroll listener for theme toggle
  useEffect(() => {
    const handleScroll = () => {
      setShowThemeToggle(window.scrollY <= 600);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
              <span className="text-6xl">♟️</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-blue-300 mb-2">Loading Chess Data</h2>
          <p className="text-blue-400/70">Connecting to blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.gradient,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.8s ease-in-out'
    }}>
      {/* Particle Background */}
      <ParticleBackground colors={currentTheme.particleColors} />

      {/* Back to ETour Button */}
      <Link
        to="/"
        style={{
          position: 'fixed',
          top: 'calc(1rem + 100px)',
          left: '1rem',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0.5rem',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        <ArrowLeft size={16} />
      </Link>

      {/* Trust Banner */}
      <div style={{
        background: theme === 'dream' ? 'rgba(0, 100, 200, 0.2)' : 'rgba(139, 0, 0, 0.2)',
        borderBottom: `1px solid ${currentTheme.border}`,
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 10
      }}>
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
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`}></div>
              <span className="relative text-8xl">♔</span>
            </div>
          </div>

          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            ChessOnChain
          </h1>
          <p className={`text-2xl ${currentTheme.heroText} mb-6`}>
            Provably Fair • Zero Trust • 100% On-Chain
          </p>
          <p className={`text-lg ${currentTheme.heroSubtext} max-w-3xl mx-auto mb-8`}>
            Play Chess on the blockchain. Real opponents. Real ETH on the line.
            <br/>
            No servers required. No trust needed.
            <br/>
            Every move is a transaction. Every outcome is permanently on-chain.
          </p>

          {/* Game Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-green-400" size={20} />
                <span className="font-bold text-green-300">Winner Takes 90%</span>
              </div>
              <p className="text-sm text-green-200">
                Champion walks away with 90% of the tournament pot
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-300">ETH Entry Fees</span>
              </div>
              <p className="text-sm text-yellow-200">
                Multiple tiers from casual to high stakes
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-purple-400" size={20} />
                <span className="font-bold text-purple-300">Full Chess Rules</span>
              </div>
              <p className="text-sm text-purple-200">
                Castling, en passant, promotion - all verified on-chain
              </p>
            </div>
          </div>

          {/* Connect Wallet CTA */}
          {!account ? (
            <button
              onClick={connectWallet}
              disabled={loading}
              className={`inline-flex items-center gap-3 bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-10 py-5 rounded-2xl font-bold text-2xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Wallet size={28} />
              {loading ? 'Connecting...' : 'Connect Wallet to Enter'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-4 bg-green-500/20 border border-green-400/50 px-8 py-4 rounded-2xl">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-mono text-lg">{shortenAddress(account)}</span>
            </div>
          )}

          {/* Why Arbitrum Info */}
          <div className="mt-6 max-w-2xl mx-auto">
            <div className={`bg-${theme === 'daring' ? 'red' : 'blue'}-500/10 border border-${theme === 'daring' ? 'red' : 'blue'}-400/30 rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                <Info size={18} className={`${currentTheme.heroIcon} mt-0.5 flex-shrink-0`} />
                <div className="text-sm w-full">
                  <p className={`${currentTheme.heroText} font-medium mb-2`}>Why Arbitrum?</p>
                  <p className={`${currentTheme.heroSubtext} opacity-80 leading-relaxed mb-3`}>
                    This game runs on <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className={`font-semibold ${currentTheme.heroText} hover:text-green-300 underline decoration-current/50 hover:decoration-green-300 transition-colors`}>Arbitrum One</a>, an Ethereum Layer 2 network.
                  </p>
                  <div className={`${currentTheme.heroSubtext} opacity-80 leading-relaxed space-y-2 text-sm`}>
                    <p><strong className={currentTheme.heroText}>First time on Arbitrum?</strong> You'll need to:</p>
                    <ol className="list-decimal list-inside pl-2 space-y-1">
                      <li>Switch to Arbitrum network in MetaMask (instant and free)</li>
                      <li>Bridge ETH from Ethereum mainnet to Arbitrum (~15 min, requires L1 gas)</li>
                    </ol>
                    <p><strong className={currentTheme.heroText}>Already have Arbitrum ETH?</strong> Just switch networks and play.</p>
                    <p className="pt-1"><span className={currentTheme.heroText}>Lower fees than Ethereum mainnet. Final outcomes secured by Ethereum L1.</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match View */}
        {currentMatch && (
          <div className="mb-16">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-400 rounded-2xl p-8 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeMatch}
                    className="text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    <ChevronDown className="rotate-90" size={24} />
                  </button>
                  <Swords className="text-purple-400" size={28} />
                  <h2 className="text-3xl font-bold text-white">
                    {getStatusEmoji(currentMatch.matchStatus + 1)} Chess Match
                  </h2>
                  <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    Syncing{'.'.repeat(syncDots)}
                  </span>
                </div>
                <div className={`px-5 py-2 rounded-full text-sm font-bold ${
                  currentMatch.matchStatus === 2 ? 'bg-green-500/20 text-green-400 border-2 border-green-400' :
                  currentMatch.matchStatus === 1 ? 'bg-yellow-500/20 text-yellow-400 animate-pulse border-2 border-yellow-400' :
                  'bg-blue-500/20 text-blue-400 border-2 border-blue-400'
                }`}>
                  {getStatusLabel(currentMatch.matchStatus + 1)}
                </div>
              </div>

              {/* Game Layout */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: Player 1 (White) */}
                <div className="bg-slate-900/50 rounded-xl p-6 border border-blue-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-black border-2 border-blue-400">
                      ♔
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">White</h3>
                      <p className="text-blue-300 font-mono text-sm">
                        {shortenAddress(currentMatch.player1)}
                      </p>
                      {currentMatch.player1?.toLowerCase() === account?.toLowerCase() && (
                        <span className="text-yellow-300 text-xs font-bold">THIS IS YOU</span>
                      )}
                    </div>
                  </div>
                  {currentMatch.whiteInCheck && (
                    <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center">
                      <span className="text-red-300 text-sm font-bold">⚠️ IN CHECK</span>
                    </div>
                  )}
                </div>

                {/* Center: Board */}
                <div className="lg:col-span-1 flex flex-col items-center">
                  <ChessBoard
                    board={currentMatch.board}
                    onMove={handleMakeMove}
                    currentTurn={currentMatch.currentTurn}
                    account={account}
                    player1={currentMatch.player1}
                    player2={currentMatch.player2}
                    matchStatus={currentMatch.matchStatus}
                    loading={matchLoading}
                    whiteInCheck={currentMatch.whiteInCheck}
                    blackInCheck={currentMatch.blackInCheck}
                    lastMoveTime={currentMatch.lastMoveTime}
                    startTime={currentMatch.startTime}
                  />

                  {/* Resign Button */}
                  {currentMatch.matchStatus === 1 && (
                    currentMatch.player1?.toLowerCase() === account?.toLowerCase() ||
                    currentMatch.player2?.toLowerCase() === account?.toLowerCase()
                  ) && (
                    <button
                      onClick={handleResign}
                      disabled={matchLoading}
                      className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                      style={{ maxWidth: 'min(100%, 60vh)' }}
                    >
                      🏳️ Resign
                    </button>
                  )}

                  {/* Match Complete */}
                  {currentMatch.matchStatus === 2 && (
                    <div className="mt-4 bg-green-500/20 border border-green-400 rounded-xl p-4 text-center w-full" style={{ maxWidth: 'min(100%, 60vh)' }}>
                      <p className="text-white font-bold text-xl mb-2">
                        {currentMatch.isDraw ? "It's a Draw!" : 'Checkmate!'}
                      </p>
                      {!currentMatch.isDraw && (
                        <p className="text-green-300">
                          Winner: {currentMatch.winner?.toLowerCase() === currentMatch.player1?.toLowerCase() ? 'White' : 'Black'}
                          {currentMatch.winner?.toLowerCase() === account?.toLowerCase() && ' (YOU!)'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Player 2 (Black) */}
                <div className="bg-slate-900/50 rounded-xl p-6 border border-pink-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2 border-pink-400">
                      ♚
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Black</h3>
                      <p className="text-pink-300 font-mono text-sm">
                        {shortenAddress(currentMatch.player2)}
                      </p>
                      {currentMatch.player2?.toLowerCase() === account?.toLowerCase() && (
                        <span className="text-yellow-300 text-xs font-bold">THIS IS YOU</span>
                      )}
                    </div>
                  </div>
                  {currentMatch.blackInCheck && (
                    <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center">
                      <span className="text-red-300 text-sm font-bold">⚠️ IN CHECK</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Info */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-purple-300 text-sm">Move #</div>
                  <div className="text-white font-bold text-xl">{currentMatch.fullMoveNumber}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-purple-300 text-sm">Tier</div>
                  <div className="text-white font-bold text-xl">{getTierName(currentMatch.tierId)}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-purple-300 text-sm">Round</div>
                  <div className="text-white font-bold text-xl">{currentMatch.roundNumber + 1}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-purple-300 text-sm">Match</div>
                  <div className="text-white font-bold text-xl">{currentMatch.matchNumber + 1}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournaments Section */}
        {contract && !currentMatch && (
          <>
            {viewingTournament ? (
              <TournamentBracket
                tournamentData={viewingTournament}
                onBack={() => setViewingTournament(null)}
                onEnterMatch={handlePlayMatch}
                onManualStart={handleManualStart}
                onEnroll={handleEnroll}
                account={account}
                loading={tournamentsLoading}
                syncDots={bracketSyncDots}
                theme={theme}
                isEnrolled={viewingTournament?.enrolledPlayers?.some(addr => addr.toLowerCase() === account?.toLowerCase())}
                entryFee={viewingTournament?.entryFee ? ethers.formatEther(viewingTournament.entryFee) : '0'}
                isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount}
              />
            ) : (
              <div className="mb-16">
                {/* Section Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <Trophy className={theme === 'dream' ? 'text-blue-400' : 'text-red-400'} size={48} />
                    <h2 className={`text-5xl font-bold bg-gradient-to-r ${theme === 'dream' ? 'from-blue-400 to-cyan-400' : 'from-red-400 to-orange-400'} bg-clip-text text-transparent`}>
                      Chess Tournaments
                    </h2>
                  </div>
                  <p className={`text-xl ${theme === 'dream' ? 'text-blue-200' : 'text-red-200'}`}>
                    Compete in on-chain chess tournaments with real stakes
                  </p>
                </div>

                {/* Loading State */}
                {tournamentsLoading && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-purple-300">Loading tournaments...</p>
                  </div>
                )}

                {/* Tournament Cards */}
                {!tournamentsLoading && tournaments.length > 0 && (
                  <>
                    {[0, 6, 1, 2, 3, 4, 5].map((tierId) => {
                      const tierTournaments = tournaments.filter(t => t.tierId === tierId);
                      if (tierTournaments.length === 0) return null;

                      return (
                        <div key={tierId} className="mb-12">
                          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-4 border border-purple-400/40 mb-6">
                            <h3 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                              ♔ {getTierName(tierId)} Tier
                              <span className="text-sm opacity-70 ml-2">({tierTournaments[0]?.maxPlayers} players)</span>
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {tierTournaments.map((tournament) => (
                              <TournamentCard
                                key={`${tournament.tierId}-${tournament.instanceId}`}
                                tierId={tournament.tierId}
                                instanceId={tournament.instanceId}
                                maxPlayers={tournament.maxPlayers}
                                currentEnrolled={tournament.enrolledCount}
                                entryFee={tournament.entryFee}
                                isEnrolled={tournament.isEnrolled}
                                onEnroll={() => handleEnroll(tournament.tierId, tournament.instanceId, tournament.entryFee)}
                                onEnter={() => handleEnterTournament(tournament.tierId, tournament.instanceId)}
                                loading={tournamentsLoading}
                                tierName={getTierName(tournament.tierId)}
                                theme={theme}
                                enrollmentTimeout={tournament.enrollmentTimeout}
                                tournamentStatus={tournament.tournamentStatus}
                                onManualStart={handleManualStart}
                                account={account}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Empty State */}
                {!tournamentsLoading && tournaments.length === 0 && (
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-12 border border-purple-400/30 text-center">
                    <span className="text-6xl mb-4 block">♟️</span>
                    <h3 className="text-2xl font-bold text-purple-300 mb-2">No Tournaments Available</h3>
                    <p className="text-purple-200/70">Check back soon for new chess tournaments!</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* Zero Trust Architecture */}
      <div id="zero-trust" className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-green-500/30 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-6 text-center text-green-300">Zero-Trust Architecture</h2>

            <div className="bg-green-500/10 border-l-4 border-green-400 p-6 rounded-r-xl mb-8">
              <p className="text-lg leading-relaxed text-green-100">
                ChessOnChain is a <strong className="text-green-300">fully autonomous protocol</strong> deployed on Arbitrum (Ethereum Layer 2). Every chess move is recorded on-chain. Every rule is enforced by immutable code. No servers can go down. No admins can interfere. No company can shut it down.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-green-300 flex items-center gap-2">
                  <span className="text-2xl">♔</span> The Chess Protocol
                </h3>
                <ul className="space-y-2 text-green-100">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Every move recorded on-chain</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Full chess rules enforced by smart contract</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Automatic timeout enforcement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Checkmate & stalemate detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Game outcomes permanent on L1</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">→</span>
                    <a
                      href={`https://arbiscan.io/address/${CONTRACT_ADDRESS}#code`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-300 hover:text-green-200 underline decoration-green-400/50 hover:decoration-green-300 transition-colors"
                    >
                      Read the immutable source code here.
                    </a>
                  </li>
                </ul>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3 text-blue-300 flex items-center gap-2">
                  <span className="text-2xl">🌐</span> This Interface
                </h3>
                <ul className="space-y-2 text-blue-100">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Demo interface by creator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Reads 100% public blockchain data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Simply calls smart contract functions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Can be rebuilt by anyone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>No special privileges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">→</span>
                    <span className="text-blue-300">
                      Feel free to fork it and build your own!
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-yellow-300 flex items-center gap-2">
                <span className="text-2xl">💡</span> What This Means
              </h3>
              <div className="space-y-3 text-yellow-100">
                <p>
                  <strong className="text-yellow-200">Anyone can build their own chess interface</strong> to this protocol. All interfaces connect to the same games, display the same boards, and follow the same rules.
                </p>
                <p>
                  <strong className="text-yellow-200">This website is optional.</strong> You could play via Arbiscan, build your own UI, or use any third-party interface. The outcomes are secured by Arbitrum (and ultimately Ethereum L1), not by this website.
                </p>
                <p>
                  <strong className="text-yellow-200">Game outcomes are permanent.</strong> Even if every website disappears, the game continues forever. Your wins and prizes are secured by smart contracts settling to Ethereum L1.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-4xl mx-auto">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-blue-500/20 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="font-semibold text-left">{faq.q}</span>
                  {expandedFaq === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 py-4 bg-white/5 border-t border-blue-500/20">
                    <p className="text-blue-200 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cached Stats Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <History className="text-cyan-400" size={40} />
              <h2 className="text-4xl font-bold">
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">
                  Cached Stats
                </span>
              </h2>
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
          ) : cachedStats && (cachedStats.matches.length > 0 || cachedStats.tournaments.length > 0) ? (
            <>
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
                              {cachedStats.organicTournaments.slice(0, 5).map((tournament, idx) => {
                                let prizeRecipients = [];
                                if (tournament.prizeWinners && tournament.prizeWinners.length > 0) {
                                  prizeRecipients = Array.from(tournament.prizeWinners)
                                    .filter(r => r && r.player && r.player !== ethers.ZeroAddress && r.prize > 0n)
                                    .map(r => ({
                                      player: r.player,
                                      prize: ethers.formatEther(r.prize),
                                      ranking: r.ranking ? Number(r.ranking) : null
                                    }));
                                }
                                return (
                                  <div key={idx} className="bg-green-500/5 p-3 rounded space-y-2">
                                    <div className="flex items-center justify-between text-xs border-b border-green-400/20 pb-1">
                                      <span className="text-green-200 font-semibold">Tier {Number(tournament.tierId)}</span>
                                      <span className="text-green-300/70">{prizeRecipients.length} winner{prizeRecipients.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {prizeRecipients.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {prizeRecipients.map((recipient, recipientIdx) => (
                                          <div key={recipientIdx} className="bg-green-500/5 p-2 rounded border border-green-400/10">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                              <div className="flex flex-col">
                                                <span className={`font-mono ${
                                                  recipient.player.toLowerCase() === account?.toLowerCase()
                                                    ? 'text-yellow-300 font-bold'
                                                    : 'text-white'
                                                }`}>
                                                  #{recipient.ranking} {recipient.player.slice(0, 6)}...{recipient.player.slice(-4)}
                                                </span>
                                                {recipient.player.toLowerCase() === account?.toLowerCase() && (
                                                  <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                                )}
                                              </div>
                                              <span className="text-green-400 font-bold">{parseFloat(recipient.prize).toFixed(4)} ETH</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-green-300/50 text-center py-2">No prize data available</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Partial/Force Started Tournaments */}
                        {cachedStats.partialTournaments?.length > 0 && (
                          <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-400/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="text-orange-400" size={16} />
                              <div className="text-orange-300 text-sm font-semibold">Force Started ({cachedStats.partialTournaments.length})</div>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {cachedStats.partialTournaments.slice(0, 5).map((tournament, idx) => {
                                let prizeRecipients = [];
                                if (tournament.prizeWinners && tournament.prizeWinners.length > 0) {
                                  prizeRecipients = Array.from(tournament.prizeWinners)
                                    .filter(r => r && r.player && r.player !== ethers.ZeroAddress && r.prize > 0n)
                                    .map(r => ({
                                      player: r.player,
                                      prize: ethers.formatEther(r.prize),
                                      ranking: r.ranking ? Number(r.ranking) : null
                                    }));
                                }
                                return (
                                  <div key={idx} className="bg-orange-500/5 p-3 rounded space-y-2">
                                    <div className="flex items-center justify-between text-xs border-b border-orange-400/20 pb-1">
                                      <span className="text-orange-200 font-semibold">Tier {Number(tournament.tierId)}</span>
                                      <span className="text-orange-300/70">{prizeRecipients.length} winner{prizeRecipients.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {prizeRecipients.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {prizeRecipients.map((recipient, recipientIdx) => (
                                          <div key={recipientIdx} className="bg-orange-500/5 p-2 rounded border border-orange-400/10">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                              <div className="flex flex-col">
                                                <span className={`font-mono ${
                                                  recipient.player.toLowerCase() === account?.toLowerCase()
                                                    ? 'text-yellow-300 font-bold'
                                                    : 'text-white'
                                                }`}>
                                                  #{recipient.ranking} {recipient.player.slice(0, 6)}...{recipient.player.slice(-4)}
                                                </span>
                                                {recipient.player.toLowerCase() === account?.toLowerCase() && (
                                                  <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                                )}
                                              </div>
                                              <span className="text-green-400 font-bold">{parseFloat(recipient.prize).toFixed(4)} ETH</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-orange-300/50 text-center py-2">No prize data available</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Abandoned/Claimed Tournaments */}
                        {cachedStats.abandonedTournaments?.length > 0 && (
                          <div className="bg-red-500/10 rounded-lg p-4 border border-red-400/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Coins className="text-red-400" size={16} />
                              <div className="text-red-300 text-sm font-semibold">Abandoned & Claimed ({cachedStats.abandonedTournaments.length})</div>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {cachedStats.abandonedTournaments.slice(0, 5).map((tournament, idx) => {
                                const winner = tournament.winner;
                                const hasWinner = winner && winner !== ethers.ZeroAddress;
                                let claimAmount = null;
                                if (tournament.totalAwarded && tournament.totalAwarded > 0n) {
                                  claimAmount = ethers.formatEther(tournament.totalAwarded);
                                }
                                return (
                                  <div key={idx} className="bg-red-500/5 p-2 rounded space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-red-200">Tier {Number(tournament.tierId)}</span>
                                      <div className="flex flex-col items-end">
                                        <span className="text-white font-mono">
                                          {hasWinner ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : 'Unclaimed'}
                                        </span>
                                        {hasWinner && winner.toLowerCase() === account?.toLowerCase() && (
                                          <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                        )}
                                      </div>
                                    </div>
                                    {claimAmount && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-red-300/70">Pool Claimed</span>
                                        <span className="text-yellow-400 font-bold">{parseFloat(claimAmount).toFixed(4)} ETH</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Total Awards Distributed */}
                        <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-400/20">
                          <div className="text-purple-300 text-sm mb-3 font-bold">Total Awards Distributed</div>
                          {(() => {
                            try {
                              const addressAwards = new Map();
                              let totalAwarded = 0;

                              cachedStats.tournaments.forEach(tournament => {
                                if (tournament.prizeWinners && tournament.prizeWinners.length > 0) {
                                  Array.from(tournament.prizeWinners)
                                    .filter(r => r && r.player && r.player !== ethers.ZeroAddress && r.prize > 0n)
                                    .forEach(r => {
                                      const addr = r.player;
                                      const prizeEth = parseFloat(ethers.formatEther(r.prize));
                                      if (prizeEth > 0) {
                                        const current = addressAwards.get(addr.toLowerCase()) || 0;
                                        addressAwards.set(addr.toLowerCase(), current + prizeEth);
                                        totalAwarded += prizeEth;
                                      }
                                    });
                                }
                              });

                              const sortedAwards = Array.from(addressAwards.entries())
                                .sort((a, b) => b[1] - a[1]);

                              if (sortedAwards.length === 0) {
                                return (
                                  <div className="text-purple-300/70 text-sm text-center py-2">
                                    No awards distributed yet
                                  </div>
                                );
                              }

                              return (
                                <>
                                  <div className="bg-green-500/20 p-3 rounded-lg border border-green-400/30 mb-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-green-300 text-sm">Grand Total</span>
                                      <span className="text-2xl font-bold text-green-400">
                                        {totalAwarded.toFixed(4)} ETH
                                      </span>
                                    </div>
                                    <div className="text-green-300/70 text-xs mt-1">
                                      to {sortedAwards.length} unique recipient{sortedAwards.length !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {sortedAwards.map(([address, amount]) => (
                                      <div
                                        key={address}
                                        className={`flex items-center justify-between p-2 rounded border ${
                                          address.toLowerCase() === account?.toLowerCase()
                                            ? 'bg-yellow-500/20 border-yellow-400/50'
                                            : 'bg-purple-500/10 border-purple-400/20'
                                        }`}
                                      >
                                        <div className="flex flex-col">
                                          <span className={`font-mono text-xs ${
                                            address.toLowerCase() === account?.toLowerCase()
                                              ? 'text-yellow-300'
                                              : 'text-white'
                                          }`}>
                                            {address.slice(0, 8)}...{address.slice(-6)}
                                          </span>
                                          {address.toLowerCase() === account?.toLowerCase() && (
                                            <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                          )}
                                        </div>
                                        <span className="text-green-400 font-bold text-sm">
                                          {amount.toFixed(4)} ETH
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              );
                            } catch (err) {
                              console.warn('Error calculating total awards:', err);
                              return (
                                <div className="text-red-300/70 text-sm text-center py-2">
                                  Error loading award data
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cached Matches */}
                <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-cyan-400/30">
                  <div className="flex items-center gap-3 mb-4">
                    <Swords className="text-cyan-400" size={32} />
                    <h3 className="text-2xl font-bold text-white">Cached Matches</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                      <div className="text-cyan-300 text-sm mb-1">Total Cached</div>
                      <div className="text-3xl font-bold text-white">{cachedStats.matches?.length || 0}</div>
                    </div>
                    {cachedStats.matches?.length > 0 && (
                      <>
                        {/* Match Statistics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                            <div className="text-cyan-300 text-sm mb-1">Decisive</div>
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

                        {/* Draw Rate */}
                        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20">
                          <div className="text-yellow-300 text-sm mb-1">Draw Rate</div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-yellow-400">
                              {((cachedStats.matches.filter(m => m?.isDraw).length / cachedStats.matches.length) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-yellow-300/70">
                              {cachedStats.matches.filter(m => m?.isDraw).length} of {cachedStats.matches.length} matches
                            </div>
                          </div>
                        </div>

                        {/* Average Move Count */}
                        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                          <div className="text-cyan-300 text-sm mb-1">Average Moves per Game</div>
                          <div className="text-2xl font-bold text-cyan-400">
                            {(cachedStats.matches.reduce((sum, m) => sum + Number(m?.totalMoves || 0), 0) / cachedStats.matches.length).toFixed(1)}
                          </div>
                        </div>

                        {/* Draw Scenarios List */}
                        {cachedStats.matches.filter(m => m?.isDraw).length > 0 && (
                          <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertCircle className="text-yellow-400" size={16} />
                              <div className="text-yellow-300 text-sm font-bold">Draw Scenarios</div>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {[...cachedStats.matches]
                                .filter(m => m?.isDraw)
                                .slice(-10)
                                .reverse()
                                .map((match, idx) => (
                                  <div key={idx} className="bg-yellow-500/10 p-3 rounded border border-yellow-400/20">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-300 font-bold text-xs border border-yellow-400">
                                          =
                                        </div>
                                        <span className="text-yellow-200 text-xs font-bold">Draw Match</span>
                                      </div>
                                      <span className="text-yellow-300/70 text-xs">
                                        Tier {match?.tierId !== undefined ? Number(match.tierId) : '?'} • {Number(match?.totalMoves || 0)} moves
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="bg-cyan-500/20 p-2 rounded border border-cyan-400/20">
                                        <div className="text-cyan-300/70 mb-1">White</div>
                                        <div className="text-white font-mono">
                                          {match?.player1 ? `${match.player1.slice(0, 6)}...${match.player1.slice(-4)}` : 'Unknown'}
                                        </div>
                                      </div>
                                      <div className="bg-orange-500/20 p-2 rounded border border-orange-400/20">
                                        <div className="text-orange-300/70 mb-1">Black</div>
                                        <div className="text-white font-mono">
                                          {match?.player2 ? `${match.player2.slice(0, 6)}...${match.player2.slice(-4)}` : 'Unknown'}
                                        </div>
                                      </div>
                                    </div>
                                    {match?.startTime && match?.endTime && (
                                      <div className="mt-2 text-xs text-yellow-300/70">
                                        Duration: {Math.floor((Number(match.endTime) - Number(match.startTime)) / 60)} minutes
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Recent Matches (All) */}
                        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                          <div className="text-cyan-300 text-sm mb-2">Recent Matches (All)</div>
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
                                    ? `${Number(match?.totalMoves || 0)} moves`
                                    : match?.winner ? `${match.winner.slice(0, 6)}...${match.winner.slice(-4)}` : 'Unknown'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Prize Recipients Section */}
              {cachedStats.tournaments?.length > 0 && (
                <div className="mt-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-400/30">
                  <div className="flex items-center gap-3 mb-4">
                    <Coins className="text-green-400" size={32} />
                    <h3 className="text-2xl font-bold text-white">Top Prize Recipients</h3>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(() => {
                      try {
                        const recipients = new Map();

                        cachedStats.tournaments.forEach(tournament => {
                          if (tournament.prizeWinners && tournament.prizeWinners.length > 0) {
                            Array.from(tournament.prizeWinners)
                              .filter(r => r && r.player && r.player !== ethers.ZeroAddress && r.prize > 0n)
                              .forEach(r => {
                                const addr = r.player;
                                const prizeEth = parseFloat(ethers.formatEther(r.prize));
                                if (prizeEth > 0) {
                                  const current = recipients.get(addr.toLowerCase()) || 0;
                                  recipients.set(addr.toLowerCase(), current + prizeEth);
                                }
                              });
                          }
                        });

                        const sortedRecipients = Array.from(recipients.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10);

                        if (sortedRecipients.length === 0) {
                          return (
                            <div className="text-green-300/70 text-sm text-center py-4">
                              No prize data available yet
                            </div>
                          );
                        }

                        return sortedRecipients.map(([address, total], idx) => (
                          <div
                            key={address}
                            className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg border border-green-400/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center text-green-300 font-bold text-sm border-2 border-green-400">
                                #{idx + 1}
                              </div>
                              <span className="text-white font-mono text-sm">
                                {address.slice(0, 6)}...{address.slice(-4)}
                              </span>
                            </div>
                            <span className="text-green-400 font-bold text-lg">
                              {total.toFixed(4)} ETH
                            </span>
                          </div>
                        ));
                      } catch (err) {
                        console.warn('Error calculating top recipients:', err);
                        return (
                          <div className="text-red-300/70 text-sm text-center py-4">
                            Error loading prize data
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-12 border border-cyan-400/30 text-center">
              <History className="text-cyan-400/50 mx-auto mb-4" size={64} />
              <h3 className="text-2xl font-bold text-cyan-300 mb-2">No Cached Data Available</h3>
              <p className="text-cyan-200/70">
                Historical data will appear here once tournaments complete and matches are played.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-blue-300">
          <p className="font-semibold text-lg mb-2">ChessOnChain Protocol</p>
          <p>Built on Arbitrum (Ethereum L2). Runs forever. No servers required.</p>
          <p className="mt-2">Contract code is immutable. Game outcomes are permanent and verifiable. Always verify before interacting.</p>
          <p className="mt-4 font-mono text-xs text-blue-400/50">{CONTRACT_ADDRESS}</p>
        </div>
      </div>

      {/* CSS for particle animation */}
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
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
