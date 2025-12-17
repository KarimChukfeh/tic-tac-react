/**
 * ChessOnChain - On-Chain Chess Protocol Frontend
 *
 * Chess tournaments on the blockchain with full game verification
 * Uses the same design language as the TicTacToe frontend
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Swords, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Play, Users, Zap, Coins, ChevronDown, ArrowLeft
} from 'lucide-react';
import { ethers } from 'ethers';
import CHESS_ABI from './COCABI.json';
import { shortenAddress, formatTime as formatTimeHMS, getTierName, getEstimatedDuration, countInstancesByStatus } from './utils/formatters';
import ParticleBackground from './components/shared/ParticleBackground';
import StatsGrid from './components/shared/StatsGrid';
import EnrolledPlayersList from './components/shared/EnrolledPlayersList';
import MatchCard from './components/shared/MatchCard';
import TournamentCard from './components/shared/TournamentCard';
import TurnTimer from './components/shared/TurnTimer';
import MatchTimeoutEscalation from './components/shared/MatchTimeoutEscalation';
import WinnersLeaderboard from './components/shared/WinnersLeaderboard';
import MatchEndModal from './components/shared/MatchEndModal';
import WhyArbitrum from './components/shared/WhyArbitrum';

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
  startTime,
  lastMove // { from: actualIdx, to: actualIdx }
}) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [boardSize, setBoardSize] = useState(null);
  const containerRef = useRef(null);

  // Animation state
  const [animatingMove, setAnimatingMove] = useState(null); // { from, to, piece }
  const prevBoardRef = useRef(null);
  const prevLastMoveRef = useRef(null);

  // Calculate board size to fit viewport while staying square
  useEffect(() => {
    const updateSize = () => {
      const vh60 = window.innerHeight * 0.60;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      // Cap at 520px max for good balance
      const size = Math.min(vh60, containerWidth, 520);
      setBoardSize(size);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle move animation
  useEffect(() => {
    // Only animate if lastMove changed and we have a previous board to compare
    if (lastMove && prevBoardRef.current &&
        (prevLastMoveRef.current?.from !== lastMove.from || prevLastMoveRef.current?.to !== lastMove.to)) {
      const piece = board[lastMove.to]; // Piece is now at destination
      if (piece && Number(piece.pieceType) !== 0) {
        setAnimatingMove({
          from: lastMove.from,
          to: lastMove.to,
          piece: piece
        });
        // Clear animation after it completes
        const timer = setTimeout(() => {
          setAnimatingMove(null);
        }, 450); // Match animation duration
        return () => clearTimeout(timer);
      }
    }
    prevBoardRef.current = board;
    prevLastMoveRef.current = lastMove;
  }, [lastMove, board]);

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

      // Check for pawn promotion - any pawn reaching row 0 or row 7 must promote
      const toRow = Math.floor(actualIdx / 8);
      const isPawn = fromPiece && Number(fromPiece.pieceType) === 1;
      const isPromotionRank = toRow === 0 || toRow === 7;

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

  // Helper to convert actual index to display position (row, col)
  const getDisplayPosition = (actualIdx) => {
    const displayIdx = shouldFlip ? 63 - actualIdx : actualIdx;
    return {
      row: Math.floor(displayIdx / 8),
      col: displayIdx % 8
    };
  };

  // Render board
  const renderBoard = () => {
    const squares = [];
    for (let displayIdx = 0; displayIdx < 64; displayIdx++) {
      const actualIdx = getActualIndex(displayIdx);
      const piece = board[actualIdx];
      const isLight = getSquareColor(actualIdx);
      const isSelected = selectedSquare === displayIdx;

      // Check if this is part of the last move
      const isLastMoveFrom = lastMove && lastMove.from === actualIdx;
      const isLastMoveTo = lastMove && lastMove.to === actualIdx;

      // Determine if last move was made by ME based on the piece that moved
      // My moves = green/yellow, Opponent's moves = orange/red
      const movedPiece = lastMove && board[lastMove.to];
      const movedPieceColor = movedPiece ? Number(movedPiece.color) : 0;
      const isMyMove = lastMove && (
        (movedPieceColor === 1 && isPlayer1) || // White piece and I'm white
        (movedPieceColor === 2 && isPlayer2)    // Black piece and I'm black
      );

      // Hide piece at destination during animation (animated piece shows instead)
      const hideForAnimation = animatingMove && actualIdx === animatingMove.to;

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

      // Color scheme for last move highlighting
      // My moves: green (from) → yellow (to)
      // Opponent's moves: orange (from) → red (to)
      const getLastMoveFromClass = () => {
        if (!isLastMoveFrom || isSelected || isKingInCheck) return '';
        return isMyMove
          ? 'bg-emerald-500/50 ring-2 ring-emerald-400 ring-inset'  // My move: green from
          : 'bg-orange-500/50 ring-2 ring-orange-400 ring-inset';   // Opponent's move: orange from
      };

      const getLastMoveToClass = () => {
        if (!isLastMoveTo || isSelected || isKingInCheck) return '';
        return isMyMove
          ? 'bg-yellow-400/50 ring-2 ring-yellow-300 ring-inset'    // My move: yellow to
          : 'bg-red-500/50 ring-2 ring-red-400 ring-inset';         // Opponent's move: red to
      };

      const getLastMoveShadow = () => {
        if (isSelected) return '0 0 20px rgba(6, 182, 212, 0.3)';
        if (isLastMoveTo && !isKingInCheck) {
          return isMyMove
            ? 'inset 0 0 20px rgba(234, 179, 8, 0.5)'    // My move: yellow glow
            : 'inset 0 0 20px rgba(239, 68, 68, 0.5)';   // Opponent's move: red glow
        }
        if (isLastMoveFrom && !isKingInCheck) {
          return isMyMove
            ? 'inset 0 0 15px rgba(16, 185, 129, 0.4)'   // My move: green glow
            : 'inset 0 0 15px rgba(249, 115, 22, 0.4)';  // Opponent's move: orange glow
        }
        return 'none';
      };

      const getPieceGlow = () => {
        if (!isLastMoveTo || hideForAnimation || pieceType === 0) return undefined;
        return isMyMove
          ? 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.8))'    // My move: yellow glow
          : 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))';   // Opponent's move: red glow
      };

      // When a piece is selected, potential target squares should highlight yellow on hover
      const isPotentialTarget = selectedSquare !== null && !isSelected && !isMyPiece(piece);

      squares.push(
        <div
          key={displayIdx}
          onClick={() => handleSquareClick(displayIdx)}
          className={`relative flex items-center justify-center cursor-pointer transition-all duration-200
            ${isLight
              ? 'bg-slate-700/50'
              : 'bg-slate-900/80'}
            ${isSelected
              ? 'ring-2 ring-emerald-400 ring-inset bg-emerald-500/50'
              : ''}
            ${isKingInCheck
              ? 'bg-red-500/50 ring-2 ring-red-400 ring-inset'
              : ''}
            ${getLastMoveFromClass()}
            ${getLastMoveToClass()}
            ${isMyTurn && isMyPiece(piece) && !isSelected
              ? 'hover:bg-emerald-500/30'
              : ''}
            ${isMyTurn && isPotentialTarget
              ? 'hover:bg-yellow-400/40'
              : ''}
          `}
          style={{
            boxShadow: isSelected
              ? 'inset 0 0 20px rgba(16, 185, 129, 0.5)'
              : getLastMoveShadow()
          }}
        >
          <span
            className={`text-3xl md:text-4xl lg:text-5xl select-none transition-all duration-300 ${
              isSelected ? 'scale-110' : ''
            } ${pieceColor === 1
              ? 'text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
              : 'text-purple-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
            }`}
            style={{
              opacity: hideForAnimation ? 0 : 1,
              filter: getPieceGlow()
            }}
          >
            {getPieceSymbol(piece)}
          </span>

          {/* Rank labels */}
          {showRankLabel && (
            <span className={`absolute left-1 top-0.5 text-[10px] font-medium ${
              isLight ? 'text-slate-500' : 'text-slate-600'
            }`}>
              {rankLabel}
            </span>
          )}

          {/* File labels */}
          {showFileLabel && (
            <span className={`absolute right-1 bottom-0.5 text-[10px] font-medium ${
              isLight ? 'text-slate-500' : 'text-slate-600'
            }`}>
              {fileLabel}
            </span>
          )}
        </div>
      );
    }
    return squares;
  };

  // Render animated piece overlay
  const renderAnimatedPiece = () => {
    if (!animatingMove || !boardSize) return null;

    const fromPos = getDisplayPosition(animatingMove.from);
    const toPos = getDisplayPosition(animatingMove.to);
    const squareSize = boardSize / 8;

    const pieceColor = animatingMove.piece ? Number(animatingMove.piece.color) : 0;

    // Determine if this is MY move based on piece color
    // My moves = yellow glow, Opponent's moves = red glow
    const isMyAnimatedMove = (pieceColor === 1 && isPlayer1) || (pieceColor === 2 && isPlayer2);
    const animationGlow = isMyAnimatedMove
      ? 'rgba(234, 179, 8, 0.8)'   // My move: yellow glow
      : 'rgba(239, 68, 68, 0.8)';  // Opponent's move: red glow

    return (
      <div
        className="absolute pointer-events-none z-20"
        style={{
          width: squareSize,
          height: squareSize,
          transform: `translate(${toPos.col * squareSize}px, ${toPos.row * squareSize}px)`,
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            '--from-x': `${(fromPos.col - toPos.col) * squareSize}px`,
            '--from-y': `${(fromPos.row - toPos.row) * squareSize}px`,
          }}
        >
          <span
            className={`text-3xl md:text-4xl lg:text-5xl select-none ${
              pieceColor === 1
                ? 'text-slate-100'
                : 'text-purple-300'
            }`}
            style={{
              transform: `translate(var(--from-x), var(--from-y))`,
              animation: 'pieceMove 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
              filter: `drop-shadow(0 0 12px ${animationGlow})`,
            }}
          >
            {getPieceSymbol(animatingMove.piece)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Timer */}
      {matchStatus === 1 && (
        <div className={`mb-4 text-center py-2 px-6 rounded-full font-mono text-base font-semibold backdrop-blur-sm ${
          timeRemaining !== null && timeRemaining < 60
            ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
            : 'bg-slate-800/60 text-cyan-300 border border-cyan-500/30'
        }`}>
          <Clock className="inline-block mr-2" size={16} />
          {formatTime(timeRemaining)}
        </div>
      )}

      {/* Board container with JS-calculated size for cross-browser compatibility */}
      <div ref={containerRef} className="w-full flex justify-center">
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            width: boardSize || 400,
            height: boardSize || 400,
            minWidth: 280,
            minHeight: 280,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          <div
            className="grid gap-0 w-full h-full"
            style={{
              gridTemplateColumns: 'repeat(8, 1fr)',
              gridTemplateRows: 'repeat(8, 1fr)'
            }}
          >
            {renderBoard()}
          </div>
          {/* Animated piece overlay */}
          {renderAnimatedPiece()}
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes pieceMove {
          0% {
            transform: translate(var(--from-x), var(--from-y)) scale(1);
          }
          50% {
            transform: translate(calc(var(--from-x) * 0.3), calc(var(--from-y) * 0.3)) scale(1.15);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }
      `}</style>

      {/* Promotion Dialog */}
      {promotionSquare !== null && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.2)'
            }}
          >
            <h3 className="text-slate-100 font-bold text-lg mb-4 text-center">Promote Pawn</h3>
            <div className="flex gap-3">
              {[5, 4, 3, 2].map((pieceType) => (
                <button
                  key={pieceType}
                  onClick={() => handlePromotion(pieceType)}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-3xl md:text-4xl transition-all duration-200 hover:scale-110"
                  style={{
                    background: 'rgba(51, 65, 85, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(51, 65, 85, 0.6)';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                  }}
                >
                  <span className={isWhite ? 'text-slate-100' : 'text-purple-300'}>
                    {PIECE_SYMBOLS[isWhite ? 'white' : 'black'][PIECE_TYPES[pieceType]]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Turn indicator */}
      {matchStatus === 1 && (
        <div
          className={`mt-4 text-center py-3 px-6 rounded-xl font-semibold text-base backdrop-blur-sm ${
            isMyTurn
              ? 'text-cyan-300'
              : 'text-slate-400'
          }`}
          style={{
            ...(boardSize ? { width: boardSize } : { maxWidth: '100%' }),
            background: isMyTurn
              ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))'
              : 'rgba(30, 41, 59, 0.6)',
            border: isMyTurn
              ? '1px solid rgba(6, 182, 212, 0.4)'
              : '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: isMyTurn ? '0 0 20px rgba(6, 182, 212, 0.15)' : 'none'
          }}
        >
          {isMyTurn ? (
            <div className="space-y-1">
              <div className="text-lg flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Your Move
              </div>
              <div className="text-sm text-slate-400">Playing as {isWhite ? 'White' : 'Black'}</div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>
                Opponent's Turn
              </div>
              <div className="text-sm text-slate-500">Waiting for their move...</div>
            </div>
          )}
        </div>
      )}

      {/* Check indicator */}
      {(whiteInCheck || blackInCheck) && matchStatus === 1 && (
        <div
          className="mt-3 text-center py-2 px-6 rounded-full text-red-300 font-semibold text-sm animate-pulse"
          style={{
            ...(boardSize ? { width: boardSize } : { maxWidth: '100%' }),
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
          }}
        >
          {whiteInCheck ? 'White' : 'Black'} King in Check
        </div>
      )}
    </div>
  );
};

// Tournament Card Component
// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onManualStart, onEnroll, account, loading, syncDots, theme, isEnrolled, entryFee, isFull }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers, enrollmentTimeout } = tournamentData;

  const totalRounds = Math.ceil(Math.log2(playerCount));


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
                  Chess Tournament T{tierId + 1}-I{instanceId + 1}
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
        <StatsGrid
          enrolledCount={enrolledCount}
          playerCount={playerCount}
          status={status}
          currentRound={currentRound}
          totalRounds={totalRounds}
          colors={colors}
        />

        {/* Enrolled Players List */}
        <EnrolledPlayersList
          enrolledPlayers={enrolledPlayers}
          account={account}
          colors={colors}
        />
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
                  {round.matches.map((match, matchIdx) => (
                    <MatchCard
                      key={matchIdx}
                      match={match}
                      matchIdx={matchIdx}
                      roundIdx={roundIdx}
                      tierId={tierId}
                      instanceId={instanceId}
                      account={account}
                      loading={loading}
                      onEnterMatch={onEnterMatch}
                      playerIcons={{ player1: '♔', player2: '♚' }}
                      showEscalation={false}
                      showThisIsYou={false}
                    />
                  ))}
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

  // Tournament State - Lazy Loading Architecture
  const [tierMetadata, setTierMetadata] = useState({});
  const [tierInstances, setTierInstances] = useState({});
  const [tierLoading, setTierLoading] = useState({});
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [expandedTiers, setExpandedTiers] = useState({});

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [syncDots, setSyncDots] = useState(1);
  const [lastMove, setLastMove] = useState(null); // { from: actualIdx, to: actualIdx }
  const previousBoardRef = useRef(null);
  const [moveHistory, setMoveHistory] = useState([]); // Array of { from, to, promotion, notation }
  const [matchEndResult, setMatchEndResult] = useState(null); // 'win' | 'lose' | 'draw' | 'forfeit_win' | 'forfeit_lose' | 'double_forfeit'
  const [matchEndWinnerLabel, setMatchEndWinnerLabel] = useState('');

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

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

  // Convert square index to chess notation (0=a8, 7=h8, 56=a1, 63=h1)
  const squareToNotation = (idx) => {
    const file = String.fromCharCode(97 + (idx % 8)); // a-h
    const rank = 8 - Math.floor(idx / 8); // 8-1
    return `${file}${rank}`;
  };

  // Piece type names for notation
  const PIECE_NOTATION = ['', '', 'N', 'B', 'R', 'Q', 'K']; // Pawn has no letter

  // Fetch and decode move history from contract
  const fetchMoveHistory = useCallback(async (contractInstance, tierId, instanceId, roundNumber, matchNumber) => {
    try {
      const historyBytes = await contractInstance.getMoveHistory(tierId, instanceId, roundNumber, matchNumber);

      // Decode bytes - each move is 3 bytes: from, to, promotion
      const moves = [];
      const bytes = ethers.getBytes(historyBytes);

      for (let i = 0; i < bytes.length; i += 3) {
        const from = bytes[i];
        const to = bytes[i + 1];
        const promotion = bytes[i + 2];

        // Create notation (simplified - just from-to for now)
        const fromNotation = squareToNotation(from);
        const toNotation = squareToNotation(to);
        let notation = `${fromNotation}-${toNotation}`;

        // Add promotion piece if applicable
        if (promotion > 0 && promotion <= 6) {
          notation += `=${PIECE_NOTATION[promotion] || '?'}`;
        }

        moves.push({
          moveNumber: Math.floor(i / 6) + 1, // Full move number (each full move = 2 half moves)
          isWhite: (i / 3) % 2 === 0,
          from,
          to,
          promotion,
          notation
        });
      }

      return moves;
    } catch (error) {
      console.error('Error fetching move history:', error);
      return [];
    }
  }, []);

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
        CHESS_ABI,
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
    // Fetch leaderboard
    try {
      console.log('🔄 Fetching leaderboard...');
      setLeaderboardLoading(true);

      const leaderboardData = await contractInstance.getLeaderboard();
      // Sort by earnings descending (highest to lowest)
      const entries = Array.from(leaderboardData).map(entry => ({
        player: entry.player,
        earnings: entry.earnings
      })).sort((a, b) => (b.earnings > a.earnings ? 1 : b.earnings < a.earnings ? -1 : 0));
      console.log('✅ Fetched', entries.length, 'leaderboard entries');

      setLeaderboard(entries);
      setLeaderboardLoading(false);
    } catch (err) {
      console.error('Could not fetch leaderboard:', err);
      setLeaderboard([]);
      setLeaderboardLoading(false);
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
        await fetchTierMetadata(contractInstance);
        setInitialLoading(false);
      }
    } catch (error) {
      console.error('Error verifying contract:', error);
      if (isInitialLoad) {
        setInitialLoading(false);
      }
    }
  };

  // LAZY LOADING: Fetch tier metadata only (fast initial load)
  const fetchTierMetadata = useCallback(async (contractInstance = null) => {
    const readContract = contractInstance || contract;
    if (!readContract) return;

    setMetadataLoading(true);
    const metadata = {};

    for (let tierId = 0; tierId <= 6; tierId++) {
      try {
        const [tierConfig, fee, tierOverview] = await Promise.all([
          readContract.tierConfigs(tierId),
          readContract.ENTRY_FEES(tierId),
          readContract.getTierOverview(tierId)
        ]);

        const instanceCount = tierOverview[0].length;
        if (instanceCount === 0) continue;

        metadata[tierId] = {
          playerCount: Number(tierConfig.playerCount),
          instanceCount,
          entryFee: ethers.formatEther(fee),
          statuses: tierOverview[0].map(s => Number(s)),
          enrolledCounts: tierOverview[1].map(c => Number(c)),
          prizePools: tierOverview[2]
        };
      } catch (error) {
        console.log(`Could not fetch tier ${tierId} metadata:`, error.message);
      }
    }

    setTierMetadata(metadata);
    setMetadataLoading(false);
  }, [contract]);

  // LAZY LOADING: Fetch detailed instances for a specific tier
  const fetchTierInstances = useCallback(async (tierId, contractInstance = null, userAccount = null, metadataOverride = null) => {
    const readContract = contractInstance || contract;
    const currentAccount = userAccount ?? account;
    if (!readContract) return;

    setTierLoading(prev => ({ ...prev, [tierId]: true }));

    try {
      let metadata = metadataOverride;
      if (!metadata) {
        const [tierConfig, fee, tierOverview] = await Promise.all([
          readContract.tierConfigs(tierId),
          readContract.ENTRY_FEES(tierId),
          readContract.getTierOverview(tierId)
        ]);
        metadata = {
          playerCount: Number(tierConfig.playerCount),
          instanceCount: tierOverview[0].length,
          entryFee: ethers.formatEther(fee),
          statuses: tierOverview[0].map(s => Number(s)),
          enrolledCounts: tierOverview[1].map(c => Number(c))
        };
      }

      if (!metadata || metadata.instanceCount === 0) {
        setTierLoading(prev => ({ ...prev, [tierId]: false }));
        return;
      }

      const instances = [];

      for (let i = 0; i < metadata.instanceCount; i++) {
        try {
          const [tournamentInfo, isUserEnrolled] = await Promise.all([
            readContract.tournaments(tierId, i),
            currentAccount ? readContract.isEnrolled(tierId, i, currentAccount).catch(() => false) : Promise.resolve(false)
          ]);

          instances.push({
            tierId,
            instanceId: i,
            status: metadata.statuses[i],
            enrolledCount: metadata.enrolledCounts[i],
            maxPlayers: metadata.playerCount,
            entryFee: metadata.entryFee,
            isEnrolled: isUserEnrolled,
            enrollmentTimeout: tournamentInfo.enrollmentTimeout,
            tournamentStatus: metadata.statuses[i]
          });
        } catch (err) {
          console.log(`Could not fetch instance ${i} for tier ${tierId}:`, err.message);
        }
      }

      setTierInstances(prev => ({ ...prev, [tierId]: instances }));
    } catch (error) {
      console.error(`Error fetching tier ${tierId} instances:`, error);
    }

    setTierLoading(prev => ({ ...prev, [tierId]: false }));
  }, [contract, account]);

  // Refs to access current state without causing dependency loops
  const expandedTiersRef = useRef(expandedTiers);
  const tierInstancesRef = useRef(tierInstances);
  useEffect(() => { expandedTiersRef.current = expandedTiers; }, [expandedTiers]);
  useEffect(() => { tierInstancesRef.current = tierInstances; }, [tierInstances]);

  // Toggle tier expansion with lazy loading
  const toggleTier = useCallback(async (tierId) => {
    const isCurrentlyExpanded = expandedTiersRef.current[tierId];
    const alreadyLoaded = tierInstancesRef.current[tierId];

    if (!isCurrentlyExpanded && !alreadyLoaded) {
      setExpandedTiers(prev => ({ ...prev, [tierId]: true }));
      await fetchTierInstances(tierId);
    } else {
      setExpandedTiers(prev => ({ ...prev, [tierId]: !prev[tierId] }));
    }
  }, [fetchTierInstances]);

  // LAZY LOADING: Refresh data after an action
  const refreshAfterAction = useCallback(async (affectedTierId = null, contractInstance = null, userAccount = null) => {
    const readContract = contractInstance || contract;
    const currentAccount = userAccount ?? account;

    await fetchTierMetadata(readContract);

    const tiersToRefresh = new Set();
    if (affectedTierId !== null) tiersToRefresh.add(affectedTierId);
    const currentExpanded = expandedTiersRef.current;
    Object.keys(currentExpanded).forEach(tid => {
      if (currentExpanded[tid]) tiersToRefresh.add(Number(tid));
    });

    if (tiersToRefresh.size > 0) {
      setTierInstances(prev => {
        const updated = { ...prev };
        tiersToRefresh.forEach(tid => delete updated[tid]);
        return updated;
      });

      for (const tid of tiersToRefresh) {
        if (currentExpanded[tid]) {
          await fetchTierInstances(tid, readContract, currentAccount);
        }
      }
    }
  }, [contract, account, fetchTierMetadata, fetchTierInstances]);

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

      // Fetch timeoutState from chessMatches mapping
      const matchKey = ethers.solidityPackedKeccak256(
        ['uint8', 'uint8', 'uint8', 'uint8'],
        [match.tierId, match.instanceId, match.roundNumber, match.matchNumber]
      );
      const chessMatchData = await contractInstance.chessMatches(matchKey);

      const timeoutState = {
        escalation1Start: Number(chessMatchData.timeoutState.escalation1Start),
        escalation2Start: Number(chessMatchData.timeoutState.escalation2Start),
        escalation3Start: Number(chessMatchData.timeoutState.escalation3Start),
        activeEscalation: Number(chessMatchData.timeoutState.activeEscalation),
        timeoutActive: chessMatchData.timeoutState.timeoutActive,
        forfeitAmount: chessMatchData.timeoutState.forfeitAmount
      };

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
        isYourTurn: matchData[2].toLowerCase() === userAccount.toLowerCase(),
        timeoutState
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
      await refreshAfterAction(tierId);
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

      const [matchData, board, tierConfig] = await Promise.all([
        contract.getChessMatch(tierId, instanceId, roundNumber, matchNumber),
        contract.getBoard(tierId, instanceId, roundNumber, matchNumber),
        contract.tierConfigs(tierId)
      ]);
      const playerCount = Number(tierConfig.playerCount);

      // Fetch timeoutState from chessMatches mapping
      const matchKey = ethers.solidityPackedKeccak256(
        ['uint8', 'uint8', 'uint8', 'uint8'],
        [tierId, instanceId, roundNumber, matchNumber]
      );
      const chessMatchData = await contract.chessMatches(matchKey);

      const timeoutState = {
        escalation1Start: Number(chessMatchData.timeoutState.escalation1Start),
        escalation2Start: Number(chessMatchData.timeoutState.escalation2Start),
        escalation3Start: Number(chessMatchData.timeoutState.escalation3Start),
        activeEscalation: Number(chessMatchData.timeoutState.activeEscalation),
        timeoutActive: chessMatchData.timeoutState.timeoutActive,
        forfeitAmount: chessMatchData.timeoutState.forfeitAmount
      };

      const isPlayer1 = matchData[0].toLowerCase() === account.toLowerCase();

      const boardArray = Array.from(board);

      // Initialize board tracking for move detection
      previousBoardRef.current = boardArray;
      setLastMove(null);

      // Fetch move history
      const history = await fetchMoveHistory(contract, tierId, instanceId, roundNumber, matchNumber);
      setMoveHistory(history);

      setCurrentMatch({
        tierId,
        instanceId,
        roundNumber,
        matchNumber,
        playerCount,
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
        board: boardArray,
        isPlayer1,
        isYourTurn: matchData[2].toLowerCase() === account.toLowerCase(),
        timeoutState
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

      // Track the move for animation before making it
      setLastMove({ from, to });

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

      // Refresh match data and move history
      const updated = await refreshMatchData(contract, account, currentMatch);
      if (updated) {
        previousBoardRef.current = updated.board;
        setCurrentMatch(updated);
      }

      // Refresh move history
      const history = await fetchMoveHistory(contract, currentMatch.tierId, currentMatch.instanceId, currentMatch.roundNumber, currentMatch.matchNumber);
      setMoveHistory(history);

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

  // Handle Escalation 1: Opponent claims timeout win
  const handleClaimTimeoutWin = async () => {
    if (!currentMatch || !contract) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      const tx = await contract.claimTimeoutWin(tierId, instanceId, roundNumber, matchNumber);
      await tx.wait();

      alert('Timeout victory claimed! You win by opponent forfeit.');

      setCurrentMatch(null);
      setViewingTournament(null);

      await refreshAfterAction();

      setMatchLoading(false);
    } catch (error) {
      console.error('Error claiming timeout win:', error);
      alert(`Error claiming timeout win: ${error.message}`);
      setMatchLoading(false);
    }
  };

  // Handle Escalation 2: Higher-ranked player force eliminates stalled match
  const handleForceEliminateStalledMatch = async (matchData = null) => {
    const match = matchData || currentMatch;
    if (!match || !contract) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = match;

      const tx = await contract.forceEliminateStalledMatch(tierId, instanceId, roundNumber, matchNumber);
      await tx.wait();

      alert('Stalled match eliminated! Tournament can now continue.');

      setCurrentMatch(null);

      await refreshAfterAction(tierId);

      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId);
      if (bracketData) {
        setViewingTournament(bracketData);
      }

      setMatchLoading(false);
    } catch (error) {
      console.error('Error force eliminating match:', error);
      alert(`Error force eliminating match: ${error.message}`);
      setMatchLoading(false);
    }
  };

  // Handle Escalation 3: Outsider claims match slot by replacement
  const handleClaimMatchSlotByReplacement = async (matchData = null) => {
    const match = matchData || currentMatch;
    if (!match || !contract) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = match;

      const tx = await contract.claimMatchSlotByReplacement(tierId, instanceId, roundNumber, matchNumber);
      await tx.wait();

      alert('Match slot claimed! You have replaced both players and advanced.');

      setCurrentMatch(null);
      setViewingTournament(null);

      await refreshAfterAction(tierId);

      setMatchLoading(false);
    } catch (error) {
      console.error('Error claiming replacement:', error);
      alert(`Error claiming replacement: ${error.message}`);
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
      await refreshAfterAction(tierId);
      setLoading(false);
    } catch (error) {
      console.error('Force start error:', error);
      alert('Force start failed: ' + error.message);
      setLoading(false);
    }
  };

  // Handle claim abandoned pool (Escalation 2)
  const handleClaimAbandonedPool = async (tierId, instanceId) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);

      // Get tournament info to validate
      const tournamentInfo = await contract.tournaments(tierId, instanceId);
      const status = Number(tournamentInfo.status);
      const enrolledCount = Number(tournamentInfo.enrolledCount);
      const enrollmentTimeout = tournamentInfo.enrollmentTimeout;
      const forfeitPool = enrollmentTimeout.forfeitPool || 0n;

      // Calculate escalation availability
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const now = Math.floor(Date.now() / 1000);
      const canStartEscalation2 = escalation2Start > 0 && now >= escalation2Start;

      // For ongoing tournaments (status 0), check if we're in Escalation 2
      if (status === 0) {
        if (!canStartEscalation2) {
          alert('Escalation 2 has not opened yet. Wait for the escalation period to complete.');
          setLoading(false);
          return;
        }

        const confirmClaim = window.confirm(
          `Claim the entire tournament pool (Escalation 2 - Abandoned Tournament)?\n\n` +
          `This tournament has ${enrolledCount} enrolled player${enrolledCount !== 1 ? 's' : ''} but failed to start in time.\n` +
          `You will receive the entire enrollment pool${forfeitPool > 0n ? ` plus ${ethers.formatEther(forfeitPool)} ETH in forfeited fees` : ''}.\n\n` +
          `The tournament will be reset after claiming.`
        );

        if (!confirmClaim) {
          setLoading(false);
          return;
        }
      } else {
        // For completed tournaments (status >= 2)
        if (forfeitPool <= 0n) {
          alert('No forfeited funds to claim');
          setLoading(false);
          return;
        }

        const confirmClaim = window.confirm(
          `Claim ${ethers.formatEther(forfeitPool)} ETH from abandoned enrollment pool?\n\nThis pool consists of forfeited entry fees from players who did not start the tournament.`
        );

        if (!confirmClaim) {
          setLoading(false);
          return;
        }
      }

      const tx = await contract.claimAbandonedEnrollmentPool(tierId, instanceId);
      await tx.wait();

      alert('Abandoned enrollment pool claimed successfully!');

      // Exit tournament view and go back to tournaments list
      setViewingTournament(null);
      setCurrentMatch(null);

      // Refresh tier data
      await refreshAfterAction(tierId);
    } catch (error) {
      console.error('Claim abandoned pool error:', error);
      alert('Claim failed: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Close match view
  const closeMatch = () => {
    setCurrentMatch(null);
  };

  // Handle closing the match end modal
  const handleMatchEndModalClose = async () => {
    const tournamentInfo = currentMatch ? {
      tierId: currentMatch.tierId,
      instanceId: currentMatch.instanceId
    } : null;
    const wasWinner = matchEndResult === 'win' || matchEndResult === 'forfeit_win';

    // Clear the modal state
    setMatchEndResult(null);
    setMatchEndWinnerLabel('');
    setCurrentMatch(null);
    setMoveHistory([]);
    setLastMove(null);

    // Refresh data
    if (contract) {
      await refreshAfterAction(tournamentInfo?.tierId ?? null);

      // Show tournament bracket for winners, go back to list for losers
      if (tournamentInfo && wasWinner) {
        const bracketData = await refreshTournamentBracket(contract, tournamentInfo.tierId, tournamentInfo.instanceId);
        if (bracketData) {
          setViewingTournament(bracketData);
        }
      } else {
        setViewingTournament(null);
      }
    }
  };

  // Initialize contract in read-only mode
  useEffect(() => {
    const initReadOnlyContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

        const readOnlyContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CHESS_ABI,
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

  // Refresh tier data when account changes
  useEffect(() => {
    if (contract && account) {
      setTierInstances({});
      refreshAfterAction();
    }
  }, [contract, account, refreshAfterAction]);

  // Helper to detect move by comparing two boards
  const detectMoveFromBoards = useCallback((oldBoard, newBoard) => {
    if (!oldBoard || !newBoard) return null;

    let fromSquare = null;
    let toSquare = null;

    for (let i = 0; i < 64; i++) {
      const oldPiece = oldBoard[i];
      const newPiece = newBoard[i];
      const oldType = oldPiece ? Number(oldPiece.pieceType) : 0;
      const newType = newPiece ? Number(newPiece.pieceType) : 0;

      // Square had a piece but now is empty = from square
      if (oldType !== 0 && newType === 0) {
        fromSquare = i;
      }
      // Square has a different piece or piece appeared = potential to square
      else if (oldType !== newType || (oldType !== 0 && newType !== 0 && Number(oldPiece.color) !== Number(newPiece.color))) {
        toSquare = i;
      }
    }

    // If we found both from and to, return the move
    if (fromSquare !== null && toSquare !== null) {
      return { from: fromSquare, to: toSquare };
    }

    return null;
  }, []);

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

    // Initialize previousBoardRef if needed
    if (!previousBoardRef.current && currentMatch.board) {
      previousBoardRef.current = currentMatch.board;
    }

    const doSync = async () => {
      const match = matchRef.current;
      const contractInstance = contractRef.current;
      const userAccount = accountRef.current;

      if (!match || !contractInstance || !userAccount) return;

      const updated = await refreshMatchData(contractInstance, userAccount, match);
      if (updated) {
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        const matchWasCompleted = updated.matchStatus === 2 && match.matchStatus !== 2;
        const wasParticipant =
          updated.player1?.toLowerCase() === userAccount.toLowerCase() ||
          updated.player2?.toLowerCase() === userAccount.toLowerCase();

        // Detect match completion and show modal
        if (matchWasCompleted && wasParticipant) {
          const userWon = updated.winner?.toLowerCase() === userAccount.toLowerCase();
          const isDoubleForfeited = updated.winner?.toLowerCase() === zeroAddress && !updated.isDraw;
          const winnerIsWhite = updated.winner?.toLowerCase() === updated.player1?.toLowerCase();

          if (updated.isDraw) {
            setMatchEndResult('draw');
            setMatchEndWinnerLabel('');
          } else if (isDoubleForfeited) {
            setMatchEndResult('double_forfeit');
            setMatchEndWinnerLabel('');
          } else if (updated.isTimedOut) {
            setMatchEndResult(userWon ? 'forfeit_win' : 'forfeit_lose');
            setMatchEndWinnerLabel(winnerIsWhite ? 'White' : 'Black');
          } else {
            setMatchEndResult(userWon ? 'win' : 'lose');
            setMatchEndWinnerLabel(winnerIsWhite ? 'White' : 'Black');
          }

          setCurrentMatch(updated);
          setSyncDots(1);
          return;
        }

        // Detect opponent's move by comparing boards
        if (previousBoardRef.current && updated.board) {
          const detectedMove = detectMoveFromBoards(previousBoardRef.current, updated.board);
          if (detectedMove) {
            setLastMove(detectedMove);
            // Refresh move history when a move is detected
            const history = await fetchMoveHistory(contractInstance, match.tierId, match.instanceId, match.roundNumber, match.matchNumber);
            setMoveHistory(history);
          }
        }
        previousBoardRef.current = updated.board;
        setCurrentMatch(updated);
      }
      setSyncDots(1);
    };

    const pollInterval = setInterval(doSync, 3000);
    return () => clearInterval(pollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, refreshMatchData, detectMoveFromBoards, fetchMoveHistory]);

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
      <ParticleBackground colors={currentTheme.particleColors} symbols={CHESS_PARTICLES} fontSize="20px" />

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
            ETour Chess
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
          <WhyArbitrum variant={theme === 'daring' ? 'red' : 'blue'} />
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
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Player Cards - Side by side on mobile/tablet, stacked on left for desktop */}
                <div className="flex flex-row xl:flex-col gap-4 xl:w-56 shrink-0">
                  {/* Player 1 (White) */}
                  <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-blue-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl font-bold text-black border-2 border-blue-400 shrink-0">
                        ♔
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white">White</h3>
                        <p className="text-blue-300 font-mono text-xs truncate">
                          {shortenAddress(currentMatch.player1)}
                        </p>
                        {currentMatch.player1?.toLowerCase() === account?.toLowerCase() && (
                          <span className="text-yellow-300 text-xs font-bold">YOU</span>
                        )}
                      </div>
                    </div>
                    {currentMatch.whiteInCheck && (
                      <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center">
                        <span className="text-red-300 text-xs font-bold">⚠️ CHECK</span>
                      </div>
                    )}
                  </div>

                  {/* Player 2 (Black) */}
                  <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-pink-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-xl font-bold text-white border-2 border-pink-400 shrink-0">
                        ♚
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white">Black</h3>
                        <p className="text-pink-300 font-mono text-xs truncate">
                          {shortenAddress(currentMatch.player2)}
                        </p>
                        {currentMatch.player2?.toLowerCase() === account?.toLowerCase() && (
                          <span className="text-yellow-300 text-xs font-bold">YOU</span>
                        )}
                      </div>
                    </div>
                    {currentMatch.blackInCheck && (
                      <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center">
                        <span className="text-red-300 text-xs font-bold">⚠️ CHECK</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center: Board */}
                <div className="flex-1 flex flex-col items-center min-w-0">
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
                    lastMove={lastMove}
                  />

                  {/* Turn Timer */}
                  {currentMatch.matchStatus === 1 && (() => {
                    const MOVE_TIMEOUT = 60; // 1 minute in seconds
                    const now = Math.floor(Date.now() / 1000);
                    const timeReference = currentMatch.lastMoveTime > 0 ? currentMatch.lastMoveTime : currentMatch.startTime;
                    const timeSinceLastMove = now - timeReference;
                    const timeRemaining = Math.max(0, MOVE_TIMEOUT - timeSinceLastMove);

                    if (timeReference > 0) {
                      return (
                        <div className="w-full max-w-md mt-4">
                          <TurnTimer
                            isYourTurn={currentMatch.isYourTurn}
                            timeRemaining={timeRemaining}
                            onClaimTimeoutWin={handleClaimTimeoutWin}
                            loading={matchLoading}
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Match Timeout Escalation UI */}
                  {currentMatch.timeoutState && (
                    <div className="w-full max-w-md mt-4">
                      <MatchTimeoutEscalation
                        timeoutState={currentMatch.timeoutState}
                        matchStatus={currentMatch.matchStatus}
                        isYourTurn={currentMatch.isYourTurn}
                        onClaimTimeoutWin={handleClaimTimeoutWin}
                        onForceEliminate={handleForceEliminateStalledMatch}
                        onClaimReplacement={handleClaimMatchSlotByReplacement}
                        loading={matchLoading}
                      />
                    </div>
                  )}

                  {/* Resign Button */}
                  {currentMatch.matchStatus === 1 && (
                    currentMatch.player1?.toLowerCase() === account?.toLowerCase() ||
                    currentMatch.player2?.toLowerCase() === account?.toLowerCase()
                  ) && (
                    <button
                      onClick={handleResign}
                      disabled={matchLoading}
                      className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold py-2 px-6 rounded-full transition-all disabled:opacity-50 border border-red-500/40"
                    >
                      🏳️ Resign
                    </button>
                  )}

                  {/* Match Complete */}
                  {currentMatch.matchStatus === 2 && (
                    <div
                      className="mt-4 rounded-xl p-4 text-center w-full max-w-md"
                      style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        boxShadow: '0 0 20px rgba(34, 197, 94, 0.15)'
                      }}
                    >
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
              </div>

              {/* Match Info */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-purple-300 text-sm">Move #</div>
                  <div className="text-white font-bold text-xl">{currentMatch.fullMoveNumber}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-purple-300 text-sm">Tier</div>
                  <div className="text-white font-bold text-xl">{getTierName(currentMatch.playerCount)}</div>
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

              {/* Move History */}
              {moveHistory.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={18} className="text-cyan-400" />
                    <h3 className="text-white font-bold">Move History</h3>
                    <span className="text-slate-400 text-sm">({moveHistory.length} moves)</span>
                  </div>
                  <div
                    className="rounded-xl p-4 max-h-48 overflow-y-auto"
                    style={{
                      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8))',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
                      {/* Group moves into pairs (white + black) */}
                      {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
                        const whiteMove = moveHistory[i * 2];
                        const blackMove = moveHistory[i * 2 + 1];
                        const moveNum = i + 1;
                        return (
                          <div key={moveNum} className="contents">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 w-6 text-right">{moveNum}.</span>
                              <span className="text-slate-100">{whiteMove?.notation || ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {blackMove && (
                                <>
                                  <span className="text-slate-500 w-6 text-right">{moveNum}...</span>
                                  <span className="text-purple-300">{blackMove.notation}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
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
                      Available Tournaments
                    </h2>
                  </div>
                  <p className={`text-xl ${theme === 'dream' ? 'text-blue-200' : 'text-red-200'}`}>
                    Compete in on-chain chess tournaments with real stakes
                  </p>
                </div>

                {/* Loading State */}
                {metadataLoading && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-purple-300">Loading tournaments...</p>
                  </div>
                )}

                {/* Tournament Cards - Lazy Loading */}
                {!metadataLoading && Object.keys(tierMetadata).length > 0 && (
                  <>
                    {[0, 6, 1, 2, 3, 4, 5].map((tierId) => {
                      const metadata = tierMetadata[tierId];
                      if (!metadata) return null;

                      const instances = tierInstances[tierId] || [];
                      const isLoading = tierLoading[tierId];
                      const statusCounts = countInstancesByStatus(metadata.statuses, metadata.enrolledCounts);

                      return (
                        <div key={tierId} className="mb-6">
                          <button
                            onClick={() => toggleTier(tierId)}
                            className="w-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-4 border border-purple-400/40 hover:border-purple-400/60 transition-all cursor-pointer"
                          >
                            <h3 className="text-2xl font-bold text-purple-400 flex items-center gap-2 flex-wrap">
                              ♔ {getTierName(metadata.playerCount)}s
                              <span className="text-sm font-normal text-purple-300">• {metadata.playerCount} players total</span>
                              <span className="text-sm font-normal text-purple-300">• {metadata.entryFee} ETH entry</span>
                              <span className="text-sm font-normal text-purple-300">• <span className="text-cyan-400">{metadata.instanceCount} lobbies</span> • <span className="font-bold text-green-400">{statusCounts.enrolling} enrolling</span> • <span className="font-bold text-yellow-400">{statusCounts.inProgress} in progress</span></span>
                              <span className="text-sm font-normal text-purple-300">• {getEstimatedDuration('chess', metadata.playerCount)}</span>
                              <ChevronDown
                                size={24}
                                className={`ml-auto transition-transform duration-200 ${expandedTiers[tierId] ? 'rotate-180' : ''}`}
                              />
                            </h3>
                          </button>

                          {expandedTiers[tierId] && (
                            <div className="mt-6">
                              {isLoading ? (
                                <div className="text-center py-8">
                                  <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
                                  <p className="text-purple-300 text-sm">Loading {getTierName(metadata.playerCount)} instances...</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                  {instances.map((tournament) => (
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
                                      tierName={getTierName(tournament.maxPlayers)}
                                      theme={theme}
                                      enrollmentTimeout={tournament.enrollmentTimeout}
                                      tournamentStatus={tournament.tournamentStatus}
                                      onManualStart={handleManualStart}
                                      onClaimAbandonedPool={handleClaimAbandonedPool}
                                      account={account}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Empty State */}
                {!metadataLoading && Object.keys(tierMetadata).length === 0 && (
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

      {/* Winners Leaderboard Section */}
      <div className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-2xl mx-auto mb-16">
          <WinnersLeaderboard
            leaderboard={leaderboard}
            loading={leaderboardLoading}
            currentAccount={account}
          />
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

      {/* Match End Modal */}
      <MatchEndModal
        result={matchEndResult}
        onClose={handleMatchEndModalClose}
        winnerLabel={matchEndWinnerLabel}
        gameType="chess"
        isVisible={!!matchEndResult}
      />
    </div>
  );
}
