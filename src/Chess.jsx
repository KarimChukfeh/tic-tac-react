/**
 * Chess 
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Deploy the contract:
 *    cd ../e-tour && npm run deploy:all
 *
 * 2. Sync ABIs to frontend:
 *    npm run sync:abis
 *
 * 3. Configure network in .env:
 *    VITE_NETWORK=localhost (or arbitrumOne)
 *    VITE_CHESS_ADDRESS=0x...
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Zap, Coins, History,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, HelpCircle, Calendar
} from 'lucide-react';
import { ethers } from 'ethers';
import ChessABIData from './ChessOnChain-ABI-modular.json';
import TicTacChainABIData from './TTTABI-modular.json';
import ConnectFourABIData from './ConnectFourABI-modular.json';

const CHESS_ABI = ChessABIData.abi;
const CONTRACT_ADDRESS = ChessABIData.address;
const MODULE_ADDRESSES = ChessABIData.modules;

import { CURRENT_NETWORK, getAddressUrl, getExplorerHomeUrl } from './config/networks';
import { shortenAddress, formatTime as formatTimeHMS, getTierName, getTournamentTypeLabel } from './utils/formatters';
import { parseTournamentParams } from './utils/urlHelpers';
import { determineMatchResult } from './utils/matchCompletionHandler';
import { fetchTierTimeoutConfig } from './utils/timeCalculations';
import { getCompletionReasonText, getCompletionReasonDescription } from './utils/completionReasons';
import { batchFetchTournamentInfo } from './utils/multicall';
import ParticleBackground from './components/shared/ParticleBackground';
import MatchCard from './components/shared/MatchCard';
import TournamentCard from './components/shared/TournamentCard';
import WinnersLeaderboard from './components/shared/WinnersLeaderboard';
import UserManual from './components/shared/UserManual';
import MatchEndModal from './components/shared/MatchEndModal';
import WhyArbitrum from './components/shared/WhyArbitrum';
import GameMatchLayout from './components/shared/GameMatchLayout';
import TournamentHeader from './components/shared/TournamentHeader';
import PlayerActivity from './components/shared/PlayerActivity';
import CommunityRaffleCard from './components/shared/CommunityRaffleCard';
import EliteMatchesCard from './components/shared/EliteMatchesCard';
import PlayerPanel from './components/shared/PlayerPanel';
import BracketScrollHint from './components/shared/BracketScrollHint';
import { usePlayerActivity } from './hooks/usePlayerActivity';

// Chess piece symbols for particles
const CHESS_PIECES = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];

// Chess piece symbols for board display
// Use outline pieces for white, filled pieces for black
const PIECE_SYMBOLS = {
  white: { pawn: '♙', knight: '♘', bishop: '♗', rook: '♖', queen: '♕', king: '♔' },  // Outline/white Unicode symbols
  black: { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚' }   // Filled/black Unicode symbols
};

const PIECE_TYPES = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

// Hardcoded tier configuration (matches ChessOnChain.sol deployment)
const TIER_CONFIG = {
  0: {
    playerCount: 2,
    instanceCount: 100,
    entryFee: '0.003',
    timeouts: {
      matchTimePerPlayer: 600,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 600,
      enrollmentLevel2Delay: 300
    }
  },
  1: {
    playerCount: 2,
    instanceCount: 100,
    entryFee: '0.008',
    timeouts: {
      matchTimePerPlayer: 600,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 600,
      enrollmentLevel2Delay: 300
    }
  },
  2: {
    playerCount: 2,
    instanceCount: 100,
    entryFee: '0.015',
    timeouts: {
      matchTimePerPlayer: 600,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 600,
      enrollmentLevel2Delay: 300
    }
  },
  3: {
    playerCount: 2,
    instanceCount: 100,
    entryFee: '0.1',
    timeouts: {
      matchTimePerPlayer: 1200,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 600,
      enrollmentLevel2Delay: 300
    }
  },
  4: {
    playerCount: 4,
    instanceCount: 50,
    entryFee: '0.004',
    timeouts: {
      matchTimePerPlayer: 600,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 1800,
      enrollmentLevel2Delay: 300
    }
  },
  5: {
    playerCount: 4,
    instanceCount: 50,
    entryFee: '0.009',
    timeouts: {
      matchTimePerPlayer: 600,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 1800,
      enrollmentLevel2Delay: 300
    }
  },
  6: {
    playerCount: 4,
    instanceCount: 50,
    entryFee: '0.02',
    timeouts: {
      matchTimePerPlayer: 600,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 1800,
      enrollmentLevel2Delay: 300
    }
  },
  7: {
    playerCount: 4,
    instanceCount: 50,
    entryFee: '0.15',
    timeouts: {
      matchTimePerPlayer: 1200,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 180,
      matchLevel3Delay: 360,
      enrollmentWindow: 1800,
      enrollmentLevel2Delay: 300
    }
  }
};

// Get piece symbol from contract piece data
const getPieceSymbol = (piece) => {
  if (!piece) return '';
  const pieceType = Number(piece.pieceType);
  const pieceColor = Number(piece.color);
  if (pieceType === 0) return '';
  const color = pieceColor === 1 ? 'white' : 'black';
  return PIECE_SYMBOLS[color][PIECE_TYPES[pieceType]] || '';
};

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, /* onSpectateMatch, */ onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onResetEnrollmentWindow, onEnroll, account, loading, syncDots, isEnrolled, entryFee, isFull, contract, isEnrolledInElite }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers, firstEnrollmentTime, countdownActive, enrollmentTimeout } = tournamentData;

  // Calculate total rounds based on player count
  const totalRounds = Math.ceil(Math.log2(playerCount));

  // Determine tournament type label (Duel vs Tournament)
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);

  // Ref for active match scrolling
  const activeMatchRef = useRef(null);

  // Ref for scroll hint component
  const bracketViewRef = useRef(null);

  // Countdown timer logic for enrollment
  const ENROLLMENT_DURATION = 1 * 60; // 1 minute in seconds (matches contract)
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownExpired, setCountdownExpired] = useState(false);

  useEffect(() => {
    if (!countdownActive || !firstEnrollmentTime || status !== 0) {
      setTimeRemaining(0);
      setCountdownExpired(false);
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const deadline = firstEnrollmentTime + ENROLLMENT_DURATION;
      const remaining = deadline - now;

      if (remaining <= 0) {
        setTimeRemaining(0);
        setCountdownExpired(true);
      } else {
        setTimeRemaining(remaining);
        setCountdownExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [firstEnrollmentTime, countdownActive, status]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Auto-scroll to user's active match after every sync
  useEffect(() => {
    if (!account || !rounds || status !== 1) return;

    // Find the user's active match that needs their attention
    let userActiveMatch = null;

    for (const round of rounds) {
      for (const match of round.matches) {
        const isUserPlayer =
          match.player1?.toLowerCase() === account.toLowerCase() ||
          match.player2?.toLowerCase() === account.toLowerCase();

        const isMatchInProgress = match.matchStatus === 1;
        const isUserTurn = match.currentTurn?.toLowerCase() === account.toLowerCase();

        if (isUserPlayer && isMatchInProgress && isUserTurn) {
          userActiveMatch = match;
          break;
        }
      }
      if (userActiveMatch) break;
    }
  }, [account, rounds, status, syncDots]); // Include syncDots to trigger on every sync

  // Chess-specific options for match status display
  const matchStatusOptions = { doubleForfeitText: 'Eliminated - Double Forfeit' };

  // Bracket colors (used for bracket section below)
  const colors = {
    headerBorder: 'border-purple-400/30',
    text: 'text-purple-300',
    icon: 'text-purple-400'
  };

  return (
    <div className="mb-16">
      {/* Header */}
      <TournamentHeader
        gameType="chess"
        tierId={tierId}
        instanceId={instanceId}
        status={status}
        currentRound={currentRound}
        playerCount={playerCount}
        enrolledCount={enrolledCount}
        prizePool={prizePool}
        enrolledPlayers={enrolledPlayers}
        syncDots={syncDots}
        account={account}
        onBack={onBack}
        isEnrolled={isEnrolled}
        isFull={isFull}
        entryFee={entryFee}
        onEnroll={onEnroll}
        loading={loading}
        colors={isEnrolledInElite ? {
          headerBg: 'from-[#fbbf24]/30 to-[#f59e0b]/30',
          headerBorder: 'border-[#d4a012]/30',
          text: 'text-[#f5e6c8]',
          textHover: 'hover:text-[#fff8e7]',
          textMuted: 'text-[#d4b866]/70',
          icon: 'text-[#fbbf24]',
          buttonGradient: 'from-[#fbbf24] to-[#f59e0b]',
          buttonHover: 'hover:from-[#f59e0b] hover:to-[#d4a012]'
        } : null}
        renderCountdown={countdownActive && status === 0 ? () => (
          <div className="mt-4 bg-orange-500/20 border border-orange-400/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-orange-400" size={20} />
                <span className="text-orange-300 font-semibold">
                  {countdownExpired ? 'Enrollment Countdown Expired' : 'Enrollment Time Remaining'}
                </span>
              </div>
              <span className="text-orange-300 font-bold text-lg">
                {countdownExpired ? '0h 0m 0s' : formatTime(timeRemaining)}
              </span>
            </div>
            {countdownExpired && (
              <p className="text-orange-200 text-sm mt-2">
                Enrolled players can force-start the tournament using the button below.
              </p>
            )}
          </div>
        ) : null}
        enrollmentTimeout={enrollmentTimeout}
        onManualStart={onManualStart}
        onClaimAbandonedPool={onClaimAbandonedPool}
        onResetEnrollmentWindow={onResetEnrollmentWindow}
        contract={contract}
      />

      {/* Bracket View */}
      <div ref={bracketViewRef} className={`bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder}`}>
        <h3 className={`text-2xl font-bold ${colors.text} mb-6 flex items-center gap-2`}>
          <Grid size={24} />
          {tournamentTypeLabel} Bracket
        </h3>

        {rounds && rounds.length > 0 ? (
          <div className="space-y-8">
            {rounds.map((round, roundIdx) => (
            <div key={roundIdx}>
              <h4 className={`text-xl font-bold ${colors.icon} mb-4`}>
                Round {roundIdx + 1}
                {roundIdx === totalRounds - 1 && ' - Finals'}
                {roundIdx === totalRounds - 2 && rounds.length > 1 && ' - Semi-Finals'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {round.matches.map((match, matchIdx) => {
                  // Check if this is the user's active match that needs their turn
                  const isUserPlayer =
                    match.player1?.toLowerCase() === account?.toLowerCase() ||
                    match.player2?.toLowerCase() === account?.toLowerCase();
                  const isMatchInProgress = match.matchStatus === 1;
                  const isUserTurn = match.currentTurn?.toLowerCase() === account?.toLowerCase();
                  const shouldHighlight = isUserPlayer && isMatchInProgress && isUserTurn;

                  return (
                    <div
                      key={matchIdx}
                      ref={shouldHighlight ? activeMatchRef : null}
                    >
                      <MatchCard
                        match={match}
                        matchIdx={matchIdx}
                        roundIdx={roundIdx}
                        tierId={tierId}
                        instanceId={instanceId}
                        account={account}
                        loading={loading}
                        onEnterMatch={onEnterMatch}
                        // onSpectateMatch={onSpectateMatch} // COMMENTED OUT: Spectate disabled
                        onForceEliminate={onForceEliminate}
                        onClaimReplacement={onClaimReplacement}
                        playerIcons={{ player1: '♚', player2: '♔' }}
                        matchStatusOptions={matchStatusOptions}
                        showEscalation={true}
                        showThisIsYou={true}
                        tournamentRounds={rounds}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className={`${colors.text} text-lg`}>
              {status === 0
                ? 'Tournament bracket will be generated once the tournament starts.'
                : 'No bracket data available.'}
            </div>
          </div>
        )}
      </div>

      {/* Mobile scroll hint */}
      <BracketScrollHint
        bracketRef={bracketViewRef}
        isUserEnrolled={isEnrolled}
        isTournamentInProgress={status === 1}
      />
    </div>
  );
};

// Chess Board Component - copied from Chess.jsx
const ChessBoard = ({ board, onMove, currentTurn, account, player1, player2, firstPlayer, matchStatus, loading, whiteInCheck, blackInCheck, lastMoveTime, startTime, lastMove, maxSize = 520 }) => {
  // Debug: Log lastMove prop
  console.log('[ChessBoard] lastMove prop:', lastMove);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [boardSize, setBoardSize] = useState(null);
  const containerRef = useRef(null);
  const [animatingMove, setAnimatingMove] = useState(null);
  const prevBoardRef = useRef(null);
  const prevLastMoveRef = useRef(null);

  useEffect(() => {
    const updateSize = () => {
      const vh60 = window.innerHeight * 0.60;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      const size = Math.min(vh60, containerWidth, maxSize);
      setBoardSize(size);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [maxSize]);

  // Disabled animation to fix disappearing pieces issue
  // useEffect(() => {
  //   if (lastMove && prevBoardRef.current && (prevLastMoveRef.current?.from !== lastMove.from || prevLastMoveRef.current?.to !== lastMove.to)) {
  //     const piece = board[lastMove.to];
  //     if (piece && Number(piece.pieceType) !== 0) {
  //       setAnimatingMove({ from: lastMove.from, to: lastMove.to, piece: piece, isMyMove: lastMove.isMyMove });
  //       const timer = setTimeout(() => setAnimatingMove(null), 450);
  //       return () => clearTimeout(timer);
  //     }
  //   }
  //   prevBoardRef.current = board;
  //   prevLastMoveRef.current = lastMove;
  // }, [lastMove, board]);

  const isPlayer1 = account && player1?.toLowerCase() === account.toLowerCase();
  const isPlayer2 = account && player2?.toLowerCase() === account.toLowerCase();

  // firstPlayer is white, so check if current account is the firstPlayer
  // Fallback to player1 if firstPlayer is not set (zero address or undefined)
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const whitePlayer = (firstPlayer && firstPlayer.toLowerCase() !== zeroAddress) ? firstPlayer : player1;
  const isWhite = account && whitePlayer?.toLowerCase() === account.toLowerCase();

  const isMyTurn = account && currentTurn?.toLowerCase() === account.toLowerCase();
  // Flip board: white player needs flip to see their pieces at bottom
  // (board indices 0-7 are rank 1, but CSS grid renders 0 at top-left)
  const shouldFlip = isWhite;

  const MOVE_TIMEOUT = 300;
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
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  // Flip board based on player color
  // White view: flip vertically - a1 at bottom-left (dark), h1 at bottom-right (light)
  // Black view: flip horizontally - h8 at bottom-left (dark), a8 at bottom-right (light)
  const getActualIndex = (displayIdx) => {
    const displayRow = Math.floor(displayIdx / 8);
    const displayCol = displayIdx % 8;

    if (shouldFlip) {
      // White: flip rows (vertical flip)
      return (7 - displayRow) * 8 + displayCol;
    } else {
      // Black: flip columns (horizontal flip)
      return displayRow * 8 + (7 - displayCol);
    }
  };

  const getSquareColor = (actualIdx) => {
    const row = Math.floor(actualIdx / 8);
    const col = actualIdx % 8;
    return (row + col) % 2 === 1;
  };

  const isMyPiece = (piece) => {
    if (!piece) return false;
    const pieceType = Number(piece.pieceType);
    const pieceColor = Number(piece.color);
    if (pieceType === 0) return false;
    if (isWhite && pieceColor === 1) return true;
    if (!isWhite && isPlayer2 && pieceColor === 2) return true;
    return false;
  };

  const handleSquareClick = (displayIdx) => {
    if (matchStatus !== 1 || !isMyTurn || loading) return;
    const actualIdx = getActualIndex(displayIdx);
    const piece = board[actualIdx];
    if (selectedSquare === null) {
      if (isMyPiece(piece)) setSelectedSquare(displayIdx);
    } else {
      const fromActual = getActualIndex(selectedSquare);
      const fromPiece = board[fromActual];
      if (isMyPiece(piece)) {
        setSelectedSquare(displayIdx);
        return;
      }
      const toRow = Math.floor(actualIdx / 8);
      const isPawn = fromPiece && Number(fromPiece.pieceType) === 1;
      const isPromotionRank = toRow === 0 || toRow === 7;
      if (isPawn && isPromotionRank) {
        setPromotionSquare(actualIdx);
        setPendingMove({ from: fromActual, to: actualIdx });
      } else {
        onMove(fromActual, actualIdx, 0);
        setSelectedSquare(null);
      }
    }
  };

  const handlePromotion = (pieceType) => {
    if (pendingMove) {
      onMove(pendingMove.from, pendingMove.to, pieceType);
      setPromotionSquare(null);
      setPendingMove(null);
      setSelectedSquare(null);
    }
  };

  const getDisplayPosition = (actualIdx) => {
    const actualRow = Math.floor(actualIdx / 8);
    const actualCol = actualIdx % 8;
    if (shouldFlip) {
      return { row: 7 - actualRow, col: actualCol };
    }
    return { row: actualRow, col: actualCol };
  };

  const renderBoard = () => {
    const squares = [];
    for (let displayIdx = 0; displayIdx < 64; displayIdx++) {
      const actualIdx = getActualIndex(displayIdx);
      const piece = board[actualIdx];
      const isLight = getSquareColor(actualIdx);
      const isSelected = selectedSquare === displayIdx;
      const isLastMoveFrom = lastMove && lastMove.from === actualIdx;
      const isLastMoveTo = lastMove && lastMove.to === actualIdx;
      // Use isMyMove from lastMove object (set based on player address from event)
      const isMyMove = lastMove?.isMyMove;
      const hideForAnimation = false; // Disabled animation to fix disappearing pieces
      const pieceType = piece ? Number(piece.pieceType) : 0;
      const pieceColor = piece ? Number(piece.color) : 0;
      const isKingInCheck = pieceType === 6 && ((pieceColor === 1 && whiteInCheck) || (pieceColor === 2 && blackInCheck));
      const displayRow = Math.floor(displayIdx / 8);
      const displayCol = displayIdx % 8;
      const showRankLabel = displayCol === 0;
      const showFileLabel = displayRow === 7;
      const actualRow = Math.floor(actualIdx / 8);
      const actualCol = actualIdx % 8;
      // Chess notation always from White's perspective: a1 = bottom-left, h8 = top-right
      // Index 0 = a1 (rank 1), Index 63 = h8 (rank 8)
      const rankLabel = actualRow + 1; // 1 to 8
      const fileLabel = String.fromCharCode(97 + actualCol); // 'a' to 'h'

      // My move: purple (from) -> blue (to)
      // Opponent move: yellow (from) -> red (to)
      const getLastMoveFromClass = () => {
        if (!isLastMoveFrom || isSelected || isKingInCheck) return '';
        return isMyMove ? 'bg-purple-500/50 ring-2 ring-purple-400 ring-inset' : 'bg-yellow-500/50 ring-2 ring-yellow-400 ring-inset';
      };
      const getLastMoveToClass = () => {
        if (!isLastMoveTo || isSelected || isKingInCheck) return '';
        return isMyMove ? 'bg-blue-500/50 ring-2 ring-blue-400 ring-inset' : 'bg-red-500/50 ring-2 ring-red-400 ring-inset';
      };
      const getLastMoveShadow = () => {
        if (isSelected) return '0 0 20px rgba(6, 182, 212, 0.3)';
        if (isLastMoveTo && !isKingInCheck) return isMyMove ? 'inset 0 0 20px rgba(59, 130, 246, 0.5)' : 'inset 0 0 20px rgba(239, 68, 68, 0.5)';
        if (isLastMoveFrom && !isKingInCheck) return isMyMove ? 'inset 0 0 15px rgba(168, 85, 247, 0.4)' : 'inset 0 0 15px rgba(234, 179, 8, 0.4)';
        return 'none';
      };
      const getPieceGlow = () => {
        if (!isLastMoveTo || hideForAnimation || pieceType === 0) return undefined;
        return isMyMove ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))' : 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))';
      };
      const isPotentialTarget = selectedSquare !== null && !isSelected && !isMyPiece(piece);

      squares.push(<div key={displayIdx} onClick={() => handleSquareClick(displayIdx)} className={'relative flex items-center justify-center cursor-pointer transition-all duration-200 ' + (isLight ? 'bg-stone-300' : 'bg-stone-700') + (isSelected ? ' ring-2 ring-emerald-400 ring-inset bg-emerald-500/50' : '') + (isKingInCheck ? ' bg-red-500/50 ring-2 ring-red-400 ring-inset' : '') + ' ' + getLastMoveFromClass() + ' ' + getLastMoveToClass() + (isMyTurn && isMyPiece(piece) && !isSelected ? ' hover:bg-emerald-500/30' : '') + (isMyTurn && isPotentialTarget ? ' hover:bg-yellow-400/40' : '')} style={{ boxShadow: isSelected ? 'inset 0 0 20px rgba(16, 185, 129, 0.5)' : getLastMoveShadow() }}>
        <span className={'text-3xl md:text-4xl lg:text-5xl select-none transition-all duration-300 ' + (isSelected ? 'scale-110' : '') + ' ' + (pieceColor === 1 ? 'text-white' : 'text-gray-900')} style={{ opacity: hideForAnimation ? 0 : 1, textShadow: pieceColor === 1 ? '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' : '0 1px 2px rgba(255,255,255,0.8)' }}>{getPieceSymbol(piece)}</span>
        {showRankLabel && <span className={'absolute left-1 top-0.5 text-[10px] font-medium ' + (isLight ? 'text-slate-500' : 'text-slate-600')}>{rankLabel}</span>}
        {showFileLabel && <span className={'absolute right-1 bottom-0.5 text-[10px] font-medium ' + (isLight ? 'text-slate-500' : 'text-slate-600')}>{fileLabel}</span>}
      </div>);
    }
    return squares;
  };

  // Disabled animation to fix disappearing pieces issue
  const renderAnimatedPiece = () => {
    return null; // Animation disabled
    // if (!animatingMove || !boardSize) return null;
    // const fromPos = getDisplayPosition(animatingMove.from);
    // const toPos = getDisplayPosition(animatingMove.to);
    // const squareSize = boardSize / 8;
    // const pieceColor = animatingMove.piece ? Number(animatingMove.piece.color) : 0;
    // const isMyAnimatedMove = animatingMove.isMyMove;
    // const animationGlow = isMyAnimatedMove ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)'; // blue for my move, red for opponent
    // return (<div className="absolute pointer-events-none z-20" style={{ width: squareSize, height: squareSize, transform: 'translate(' + (toPos.col * squareSize) + 'px, ' + (toPos.row * squareSize) + 'px)' }}><div className="w-full h-full flex items-center justify-center" style={{ '--from-x': ((fromPos.col - toPos.col) * squareSize) + 'px', '--from-y': ((fromPos.row - toPos.row) * squareSize) + 'px' }}><span className={'text-3xl md:text-4xl lg:text-5xl select-none ' + (pieceColor === 1 ? 'text-white' : 'text-gray-900')} style={{ transform: 'translate(var(--from-x), var(--from-y))', animation: 'pieceMove 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards', textShadow: pieceColor === 1 ? '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' : '0 1px 2px rgba(255,255,255,0.8)' }}>{getPieceSymbol(animatingMove.piece)}</span></div></div>);
  };

  return (<div className="relative flex flex-col items-center"><div ref={containerRef} className="w-full flex justify-center"><div className="relative rounded-xl overflow-hidden" style={{ width: boardSize || 400, height: boardSize || 400, minWidth: 280, minHeight: 280, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}><div className="grid gap-0 w-full h-full" style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}>{renderBoard()}</div>{renderAnimatedPiece()}</div></div><style>{'@keyframes pieceMove { 0% { transform: translate(var(--from-x), var(--from-y)) scale(1); } 50% { transform: translate(calc(var(--from-x) * 0.3), calc(var(--from-y) * 0.3)) scale(1.15); } 100% { transform: translate(0, 0) scale(1); } }'}</style>{promotionSquare !== null && (<div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl"><div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))', border: '1px solid rgba(168, 85, 247, 0.4)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.2)' }}><h3 className="text-slate-100 font-bold text-lg mb-4 text-center">Promote Pawn</h3><div className="flex gap-3">{[5, 4, 3, 2].map((pt) => (<button key={pt} onClick={() => handlePromotion(pt)} className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-3xl md:text-4xl transition-all duration-200 hover:scale-110" style={{ background: 'rgba(51, 65, 85, 0.6)', border: '1px solid rgba(148, 163, 184, 0.3)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)'; e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(51, 65, 85, 0.6)'; e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)'; }}><span className={isWhite ? 'text-white' : 'text-gray-900'} style={{ textShadow: isWhite ? '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' : '0 1px 2px rgba(255,255,255,0.8)' }}>{PIECE_SYMBOLS[isWhite ? 'white' : 'black'][PIECE_TYPES[pt]]}</span></button>))}</div></div></div>)}{(whiteInCheck || blackInCheck) && matchStatus === 1 && (<div className="mt-3 text-center py-2 px-6 rounded-full text-red-300 font-semibold text-sm animate-pulse" style={{ ...(boardSize ? { width: boardSize } : { maxWidth: '100%' }), background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>{whiteInCheck ? 'White' : 'Black'} King in Check</div>)}</div>);
};


export default function Chess() {
  // Use network config instead of hardcoded values
  // const EXPECTED_CHAIN_ID = CURRENT_NETWORK.chainId;
  const EXPECTED_CHAIN_ID = 42161;
  // const RPC_URL = import.meta.env.VITE_RPC_URL || CURRENT_NETWORK.rpcUrl;
  const RPC_URL = "https://rpc.ankr.com/arbitrum/fa78359589ebb4ba1c97e306d5ad98192c1b897a76d2df05acf7ade04aa2687b";
  const EXPLORER_URL = getAddressUrl(CONTRACT_ADDRESS);

  // Helper to get read-only contract (bypasses MetaMask for read operations)
  const getReadOnlyContract = useCallback(() => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, provider);
  }, [RPC_URL]);

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null); // This contract has signer for write ops

  // Time Configuration from Contract
  const [matchTimePerPlayer, setMatchTimePerPlayer] = useState(600); // Default 10 minutes for Chess
  const [timeIncrement, setTimeIncrement] = useState(0); // Default no increment
  const [escalationInterval, setEscalationInterval] = useState(60); // Default 60 seconds between escalations
  const [displayTimeoutConfig, setDisplayTimeoutConfig] = useState({ matchTimePerPlayer: 600 }); // Dynamic timeout config for display

  // Loading State
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [networkInfo, setNetworkInfo] = useState(null);

  // Tournament State - Lazy Loading Architecture
  // tierMetadata: Basic tier info loaded on initial page load (fast)
  // tierInstances: Detailed tournament instances loaded on tier expand (lazy)
  const [selectedMode, setSelectedMode] = useState(null); // null = mode selection view, 'duels' = 1v1 tiers, 'tournaments' = 4-player tiers
  const [tierMetadata, setTierMetadata] = useState({}); // { [tierId]: { playerCount, instanceCount, entryFee, statuses, enrolledCounts } }
  const [tierInstances, setTierInstances] = useState({}); // { [tierId]: [tournament instances] }
  const [tierLoading, setTierLoading] = useState({}); // { [tierId]: boolean }
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null); // { tierId, instanceId, tournamentData, bracketData }
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [expandedTiers, setExpandedTiers] = useState({});
  const [visibleInstancesCount, setVisibleInstancesCount] = useState({}); // { [tierId]: number } - tracks how many instances to show per tier
  const [contractsExpanded, setContractsExpanded] = useState(false);

  // URL Parameters State for shareable tournament links
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlTournamentParams, setUrlTournamentParams] = useState(null);
  const [hasProcessedUrlParams, setHasProcessedUrlParams] = useState(false);

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [syncDots, setSyncDots] = useState(1);
  const [isSpectator, setIsSpectator] = useState(false); // Track if user is spectating (not a participant)
  const [matchEndResult, setMatchEndResult] = useState(null); // 'win' | 'lose' | 'draw' | 'forfeit_win' | 'forfeit_lose' | 'double_forfeit'
  const [matchEndWinnerLabel, setMatchEndWinnerLabel] = useState('');
  const [matchEndWinner, setMatchEndWinner] = useState(null); // Winner address for modal display
  const [matchEndLoser, setMatchEndLoser] = useState(null); // Loser address for modal display
  const previousBoardRef = useRef(null); // Track previous board state for move history sync
  const tournamentBracketRef = useRef(null); // Ref for auto-scrolling to tournament after URL navigation
  const matchViewRef = useRef(null); // Ref for auto-scrolling to match view

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Connection Error State
  const [connectionError, setConnectionError] = useState(null); // null = no error, string = error message
  const [leaderboardError, setLeaderboardError] = useState(false);

  // Raffle Info State
  const [raffleInfo, setRaffleInfo] = useState({
    raffleIndex: 0n,
    isReady: false,
    currentAccumulated: 0n,
    threshold: 0n,
    reserve: 0n,
    raffleAmount: 0n,
    ownerShare: 0n,
    winnerShare: 0n,
    eligiblePlayerCount: 0n
  });

  // Raffle History State
  const [raffleHistory, setRaffleHistory] = useState([]);

  const [raffleSyncing, setRaffleSyncing] = useState(false);

  // Elite Matches State
  const [eliteMatches, setEliteMatches] = useState([]);
  const [eliteMatchesSyncing, setEliteMatchesSyncing] = useState(false);
  const [viewingArchivedMatch, setViewingArchivedMatch] = useState(null);
  const [moveHistoryLoading, setMoveHistoryLoading] = useState(false);

  // Player Activity Hook
  const playerActivity = usePlayerActivity(contract, account, 'chess', TIER_CONFIG);
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);
  const [raffleCardHeight, setRaffleCardHeight] = useState(0);

  // Player Activity Collapse Function Ref
  const collapseActivityPanelRef = useRef(null);

  // Mobile Panel Expansion Coordination (only one panel expanded at a time on mobile)
  const [expandedPanel, setExpandedPanel] = useState(null); // 'playerActivity' | 'communityRaffle' | 'eliteMatches' | null

  // Set page title
  useEffect(() => {
    document.title = 'ETour - Chess';
  }, []);

  // Add mobile debugging console (Eruda) on mobile devices
  useEffect(() => {
    if ('ontouchstart' in window) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda';
      script.onload = () => {
        window.eruda.init();
        console.log('Eruda mobile console initialized');
      };
      document.body.appendChild(script);
    }
  }, []);

  // Parse URL parameters on initial load (for shareable tournament links)
  useEffect(() => {
    if (hasProcessedUrlParams) return;

    const params = parseTournamentParams(searchParams);

    if (params) {
      const { tierId, instanceId } = params;
      // Validate tier/instance are reasonable (0-6 for tiers, 0+ for instances)
      if (tierId >= 0 && tierId <= 6 && instanceId >= 0) {
        setUrlTournamentParams({ tierId, instanceId });
      } else {
        // Invalid params, clear them
        setSearchParams({});
      }
    }

    setHasProcessedUrlParams(true);
  }, [searchParams, hasProcessedUrlParams, setSearchParams]);

  // Auto-navigate to tournament if URL params present and wallet connected
  useEffect(() => {
    if (!urlTournamentParams || !account || !contract || viewingTournament) return;

    const autoNavigate = async () => {
      const { tierId, instanceId } = urlTournamentParams;

      try {
        setTournamentsLoading(true);
        const bracketData = await refreshTournamentBracket(contract, tierId, instanceId, matchTimePerPlayer);

        if (bracketData) {
          setViewingTournament(bracketData);
          // Clear URL params after successful navigation
          setSearchParams({});

          // Auto-scroll to tournament bracket after a brief delay for rendering
          setTimeout(() => {
            if (tournamentBracketRef.current) {
              tournamentBracketRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        } else {
          // Tournament not found, clear params
          setSearchParams({});
          alert(`Tournament T${tierId + 1}-I${instanceId + 1} not found or not accessible.`);
        }
      } catch (err) {
        console.error('Failed to load tournament from URL:', err);
        setSearchParams({});
        alert('Failed to load tournament. It may not exist yet.');
      } finally {
        setTournamentsLoading(false);
      }

      // Clear the params state so we don't retry
      setUrlTournamentParams(null);
    };

    autoNavigate();
  }, [urlTournamentParams, account, contract, viewingTournament, matchTimePerPlayer, setSearchParams]);

  // Update display timeout config when viewing tournament changes
  useEffect(() => {
    const updateDisplayConfig = async () => {
      if (!contract) return;

      if (viewingTournament?.tierId !== undefined) {
        // Fetch timeout config for the viewing tournament's tier
        try {
          const timeoutConfig = await fetchTierTimeoutConfig(contract, viewingTournament.tierId, 300, TIER_CONFIG[viewingTournament.tierId]);
          if (timeoutConfig?.matchTimePerPlayer) {
            setDisplayTimeoutConfig(timeoutConfig);
          }
        } catch (err) {
          console.warn(`Could not fetch timeout config for tier ${viewingTournament.tierId}:`, err);
        }
      } else {
        // No tournament viewing, reset to tier 0 (default)
        try {
          const timeoutConfig = await fetchTierTimeoutConfig(contract, 0, 300, TIER_CONFIG[0]);
          if (timeoutConfig?.matchTimePerPlayer) {
            setDisplayTimeoutConfig(timeoutConfig);
          }
        } catch (err) {
          console.warn('Could not fetch default timeout config for tier 0:', err);
        }
      }
    };

    updateDisplayConfig();
  }, [viewingTournament, contract]);

  // Check if player is enrolled in elite tiers (3 or 7) using activity panel data
  const isEnrolledInElite = playerActivity.data &&
    [...playerActivity.data.activeMatches, ...playerActivity.data.inProgressTournaments, ...playerActivity.data.unfilledTournaments]
      .some((activity) => activity.tierId === 3 || activity.tierId === 7);

  // Elite gold theme - comprehensive gold palette
  const eliteTheme = {
    primary: 'rgba(251, 191, 36, 0.5)',
    secondary: 'rgba(245, 158, 11, 0.5)',
    gradient: 'linear-gradient(135deg, #1a0f00 0%, #2d1a00 50%, #1f1200 100%)',
    border: 'rgba(212, 160, 18, 0.3)',
    glow: 'rgba(251, 191, 36, 0.4)',
    particleColors: ['#fbbf24', '#f59e0b'],
    heroGlow: 'from-[#fbbf24] via-[#f59e0b] to-[#d4a012]',
    heroIcon: 'text-[#fbbf24]',
    heroTitle: 'from-[#fff8e7] via-[#fbbf24] to-[#f59e0b]',
    heroText: 'text-[#f5e6c8]',
    heroSubtext: 'text-[#d4b866]',
    buttonGradient: 'from-[#fbbf24] to-[#f59e0b]',
    buttonHover: 'hover:from-[#f59e0b] hover:to-[#d4a012]',
    infoCard: 'from-[#fbbf24]/20 to-[#f59e0b]/20',
    infoBorder: 'border-[#d4a012]/30',
    infoIcon: 'text-[#fbbf24]',
    infoTitle: 'text-[#fff8e7]',
    infoText: 'text-[#f5e6c8]',
    // State colors
    success: '#22c55e',
    successBg: 'bg-[#2d4a1c]',
    successText: 'text-[#22c55e]',
    successBorder: 'border-[#22c55e]/40',
    error: '#ef4444',
    errorBg: 'bg-[#4a1c1c]',
    errorText: 'text-[#ef4444]',
    errorBorder: 'border-[#ef4444]/40',
    info: '#3b82f6',
    infoBgColor: 'bg-[#1c2d4a]',
    infoTextColor: 'text-[#3b82f6]',
    // Text hierarchy
    heading: 'text-[#fff8e7]',
    bodyText: 'text-[#f5e6c8]',
    secondaryText: 'text-[#d4b866]',
    tertiaryText: 'text-[#a8935a]',
    mutedText: 'text-[#a8935a]',
    disabledText: 'text-[#7a6a42]',
    placeholder: 'text-[#6b5d3a]'
  };

  // Default theme (purple/cyan)
  const defaultTheme = {
    primary: 'rgba(0, 255, 255, 0.5)',
    secondary: 'rgba(255, 0, 255, 0.5)',
    gradient: 'linear-gradient(135deg, #05000f 0%, #130028 50%, #090013 100%)',
    border: 'rgba(0, 255, 255, 0.3)',
    glow: 'rgba(0, 255, 255, 0.3)',
    particleColors: ['#00ffff', '#ff00ff'],
    heroGlow: 'from-blue-500 via-cyan-500 to-blue-500',
    heroIcon: 'text-blue-400',
    heroTitle: 'from-blue-400 via-cyan-400 to-blue-400',
    heroText: 'text-blue-200',
    heroSubtext: 'text-blue-300',
    buttonGradient: 'from-blue-500 to-cyan-500',
    buttonHover: 'hover:from-blue-600 hover:to-cyan-600',
    infoCard: 'from-blue-500/20 to-cyan-500/20',
    infoBorder: 'border-blue-400/30',
    infoIcon: 'text-blue-400',
    infoTitle: 'text-blue-300',
    infoText: 'text-blue-200'
  };

  // Theme colors - dynamically switch based on elite enrollment
  const currentTheme = isEnrolledInElite ? eliteTheme : defaultTheme;

  // Switch to Arbitrum One (Chain ID 42161)
  const switchToArbitrum = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xa4b1' }], // 42161 in hex (Arbitrum One)
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
          chainId: '0xa4b1', // 42161 in hex (Arbitrum One)
          chainName: 'Arbitrum One',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://arb1.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://arbiscan.io'],
              },
            ],
          });
          alert('✅ Arbitrum One network added! Please connect your wallet again.');
        } catch (addError) {
          console.error('Error adding Arbitrum One:', addError);
          alert('Failed to add Arbitrum One. Please add it manually in MetaMask.');
        }
      } else {
        console.error('Error switching network:', switchError);
        alert('Failed to switch network: ' + switchError.message);
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

      // Request accounts - this prompts MetaMask unlock if needed
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned. Please unlock MetaMask and try again.');
      }

      // Use MetaMask's provider for network check (works on deployed domains)
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();

      const networkData = {
        name: network.name || 'Unknown',
        chainId: network.chainId.toString(),
        isArbitrum: network.chainId === BigInt(EXPECTED_CHAIN_ID)
      };

      setNetworkInfo(networkData);

      // Check if connected to expected network (chain ID 42161)
      if (network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
        const shouldSwitch = window.confirm(
          `⚠️ Wrong Network Detected\n\n` +
          `You're connected to: ${network.name || 'Unknown'} (Chain ID: ${network.chainId})\n` +
          `Expected: Arbitrum One (Chain ID: ${EXPECTED_CHAIN_ID})\n\n` +
          `Click OK to automatically switch networks, or Cancel to stay on current network.`
        );

        if (shouldSwitch) {
          await switchToArbitrum();
          // Reload after switch attempt
          window.location.reload();
          return;
        }
      }

      // Get signer from MetaMask for write operations
      const web3Signer = await web3Provider.getSigner();

      // Create contract with signer for write operations
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CHESS_ABI,
        web3Signer
      );

      setAccount(accounts[0]);
      setContract(contractInstance);

      // Refresh tier data with new account (lazy loading)
      await refreshAfterAction(null, contractInstance, accounts[0]);
      await fetchLeaderboard(false);
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);

      let errorMessage = 'Failed to connect wallet.\n\n';

      if (error.message.includes('user rejected')) {
        errorMessage += 'You rejected the connection request.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage += 'Network error. Are you connected to Arbitrum One?\n\nSwitch to Arbitrum One in MetaMask.';
      } else if (error.code === -32002) {
        errorMessage += 'MetaMask is busy. Please open MetaMask and complete any pending actions.';
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);
      setLoading(false);
    }
  };


  // Load contract data (simplified - matches ConnectFour/TicTacChain pattern)
  // Uses lazy loading: only fetch tier metadata initially, instances load on expand
  const loadContractData = async (contractInstance, isInitialLoad = false) => {
    try {
      // Fetch tier metadata only (fast) - instances load on tier expand
      await fetchTierMetadata(contractInstance);
      await fetchLeaderboard(false);

      // Fetch match time from first tier for display in Game Info Cards
      try {
        const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, 0, 300, TIER_CONFIG[0]);
        if (timeoutConfig?.matchTimePerPlayer) {
          setMatchTimePerPlayer(timeoutConfig.matchTimePerPlayer);
          setDisplayTimeoutConfig(timeoutConfig);
        }
      } catch (err) {
        console.warn('Could not fetch default match time from tier 0:', err);
      }

      if (isInitialLoad) {
        setInitialLoading(false);
      }
    } catch (error) {
      console.error('Error loading contract data:', error);
      if (isInitialLoad) {
        setInitialLoading(false);
      }
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLeaderboardLoading(true);
        setLeaderboardError(false);
      }

      // Use read-only ChessOnChain contract
      const readOnlyContract = getReadOnlyContract();

      const leaderboardData = await readOnlyContract.getLeaderboard();
      // Convert to plain array with player and earnings, sorted by earnings descending
      const entries = Array.from(leaderboardData).map(entry => ({
        player: entry.player,
        earnings: entry.earnings
      })).sort((a, b) => (b.earnings > a.earnings ? 1 : b.earnings < a.earnings ? -1 : 0));

      setLeaderboard(entries);
      setLeaderboardError(false);
      if (!silent) {
        setLeaderboardLoading(false);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error.message || error);
      setLeaderboard([]);
      setLeaderboardError(true);
      if (!silent) {
        setLeaderboardLoading(false);
      }
    }
  }, [getReadOnlyContract]);

  // Fetch raffle info (view function)
  const fetchRaffleInfo = useCallback(async () => {
    try {
      setRaffleSyncing(true);
      const readOnlyContract = getReadOnlyContract();

      const [raffleIndex, isReady, currentAccumulated, threshold, reserve, raffleAmount, ownerShare, winnerShare, eligiblePlayerCount] =
        await readOnlyContract.getRaffleInfo();

      setRaffleInfo({
        raffleIndex,
        isReady,
        currentAccumulated,
        threshold,
        reserve,
        raffleAmount,
        ownerShare,
        winnerShare,
        eligiblePlayerCount
      });

      console.log('Raffle Info:', {
        raffleIndex: raffleIndex.toString(),
        isReady,
        currentAccumulated: ethers.formatEther(currentAccumulated),
        threshold: ethers.formatEther(threshold),
        reserve: ethers.formatEther(reserve),
        raffleAmount: ethers.formatEther(raffleAmount),
        eligiblePlayerCount: eligiblePlayerCount.toString()
      });
    } catch (error) {
      console.error('Error fetching raffle info:', error);
      // Keep previous state on error
    } finally {
      setRaffleSyncing(false);
    }
  }, [getReadOnlyContract]);

  // Fetch Raffle History - Called once on page load
  const fetchRaffleHistory = useCallback(async () => {
    try {
      const readContract = getReadOnlyContract();

      // Fetch all past raffle results using the getRaffleHistory function
      const results = await readContract.getRaffleHistory();

      // Format results and reverse to show newest first
      const formattedHistory = results.map((result, index) => ({
        raffleNumber: index,
        executor: result.executor,
        timestamp: Number(result.timestamp),
        rafflePot: result.rafflePot,
        winner: result.winner,
        winnerPrize: result.winnerPrize,
        protocolReserve: result.protocolReserve,
        ownerShare: result.ownerShare
      })).reverse(); // Newest first

      setRaffleHistory(formattedHistory);

      console.log('Chess Raffle History fetched:', formattedHistory.length, 'raffles');
    } catch (error) {
      console.error('Error fetching raffle history:', error);
      setRaffleHistory([]);
    }
  }, [getReadOnlyContract]);

  // Fetch elite matches from the contract
  const fetchEliteMatches = useCallback(async () => {
    try {
      setEliteMatchesSyncing(true);
      const readOnlyContract = getReadOnlyContract();

      const matches = [];
      let index = 0;
      const MAX_MATCHES = 50; // Safety limit

      while (index < MAX_MATCHES) {
        try {
          const match = await readOnlyContract.eliteMatches(index);
          const zeroAddress = '0x0000000000000000000000000000000000000000';

          // Check if this is a valid match (has at least one player)
          if (!match.player1 || match.player1 === zeroAddress) {
            break;
          }

          matches.push({
            player1: match.player1,
            player2: match.player2,
            winner: match.winner,
            currentTurn: match.currentTurn,
            firstPlayer: match.firstPlayer,
            status: Number(match.status),
            isDraw: match.isDraw,
            startTime: match.startTime,
            lastMoveTime: match.lastMoveTime,
            player1TimeRemaining: match.player1TimeRemaining,
            player2TimeRemaining: match.player2TimeRemaining,
            moves: match.moves || '' // New moves string field
          });

          index++;
        } catch (e) {
          // Array index out of bounds - we've read all matches
          break;
        }
      }

      // Reverse to show newest first
      setEliteMatches(matches.reverse());

      console.log('Elite Matches fetched:', matches.length);
    } catch (error) {
      console.error('Error fetching elite matches:', error);
    } finally {
      setEliteMatchesSyncing(false);
    }
  }, [getReadOnlyContract]);

  // Handler to view an archived elite match
  const handleViewArchivedMatch = useCallback(async (matchIndex) => {
    try {
      const readOnlyContract = getReadOnlyContract();
      const matchData = await readOnlyContract.eliteMatches(matchIndex);

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (!matchData.player1 || matchData.player1 === zeroAddress) {
        console.error('Match not found at index:', matchIndex);
        return;
      }

      // Unpack the chess board from packedBoard
      const board = [];
      let packed = BigInt(matchData.packedBoard);
      for (let i = 0; i < 64; i++) {
        const val = Number(packed & 0xFn);
        if (val === 0) {
          board.push({ pieceType: 0, color: 0 });
        } else if (val >= 1 && val <= 6) {
          board.push({ pieceType: val, color: 1 });
        } else {
          board.push({ pieceType: val - 6, color: 2 });
        }
        packed = packed >> 4n;
      }

      const archivedMatch = {
        player1: matchData.player1,
        player2: matchData.player2,
        winner: matchData.winner,
        currentTurn: matchData.currentTurn,
        firstPlayer: matchData.firstPlayer,
        matchStatus: Number(matchData.status),
        isDraw: matchData.isDraw,
        startTime: matchData.startTime,
        lastMoveTime: matchData.lastMoveTime,
        player1TimeRemaining: matchData.player1TimeRemaining,
        player2TimeRemaining: matchData.player2TimeRemaining,
        board,
        // Archive-specific metadata
        isArchived: true,
        tierId: null,
        instanceId: null,
        roundNumber: null,
        matchNumber: null
      };

      setViewingArchivedMatch(archivedMatch);

      // Parse move history from the moves string
      // The moves string contains concatenated uint8 pairs (from, to)
      // Format: abi.encodePacked(m.moves, from, to) for each move
      setMoveHistoryLoading(true);
      setMoveHistory([]); // Clear previous history
      try {
        const movesString = matchData.moves || '';
        console.log('Parsing moves string:', movesString);

        if (movesString && movesString.length > 0) {
          console.log('Moves string length:', movesString.length);

          // The moves string is NOT hex - it's a raw string where each character is a byte
          // abi.encodePacked creates bytes, then cast to string treats bytes as characters
          // So we need to read character codes (bytes) directly
          const moves = [];

          // Each move is 2 bytes (2 characters in the string)
          for (let i = 0; i < movesString.length - 1; i += 2) {
            // Get the byte values from character codes
            const fromByte = movesString.charCodeAt(i);
            const toByte = movesString.charCodeAt(i + 1);

            console.log(`Move ${moves.length + 1}: from=${fromByte} (char: "${movesString[i]}") to=${toByte} (char: "${movesString[i + 1]}")`);

            // Validate that these are valid board positions (0-63)
            if (fromByte >= 0 && fromByte < 64 && toByte >= 0 && toByte < 64) {
              moves.push({
                from: fromByte,
                to: toByte
              });
            } else {
              console.warn(`Invalid move data: from=${fromByte} to=${toByte}`);
            }
          }

          console.log('Parsed moves:', moves);

          // Convert to display format
          // White moves first (index 0), then alternates
          const history = moves.map((move, idx) => {
            const isWhiteMove = idx % 2 === 0; // Even indices (0, 2, 4...) are white moves
            const fromFile = String.fromCharCode(97 + (move.from % 8));
            const fromRank = Math.floor(move.from / 8) + 1;
            const toFile = String.fromCharCode(97 + (move.to % 8));
            const toRank = Math.floor(move.to / 8) + 1;

            console.log(`  Move ${idx + 1}: isWhiteMove=${isWhiteMove}, icon=${isWhiteMove ? '♚' : '♔'}`);

            return {
              player: isWhiteMove ? '♚' : '♔', // ♚ for white, ♔ for black
              move: `${fromFile}${fromRank} → ${toFile}${toRank}`
            };
          });

          console.log('Move history:', history);
          setMoveHistory(history);
        } else {
          console.log('No moves in moves string');
          setMoveHistory([]);
        }
      } catch (err) {
        console.error('Error parsing move history:', err);
        setMoveHistory([]);
      } finally {
        setMoveHistoryLoading(false);
      }
    } catch (error) {
      console.error('Error fetching archived match:', error);
      setMoveHistoryLoading(false);
    }
  }, [getReadOnlyContract]);

  // Handler to go back from archived match view
  const handleBackFromArchived = useCallback(() => {
    setViewingArchivedMatch(null);
    setMoveHistory([]);
    setMoveHistoryLoading(false);
  }, []);

  // LAZY LOADING: Fetch tier metadata from hardcoded TIER_CONFIG (no RPC calls)
  // Active enrollment counts come from tierInstances when tiers are expanded
  const fetchTierMetadata = useCallback(async (_contractInstance = null, silentUpdate = false) => {
    if (!silentUpdate) setMetadataLoading(true);
    if (!silentUpdate) setConnectionError(null);

    // Build metadata directly from TIER_CONFIG - zero RPC calls
    const metadata = {};
    for (const [tierId, tierConfig] of Object.entries(TIER_CONFIG)) {
      const { playerCount, instanceCount, entryFee } = tierConfig;
      metadata[tierId] = {
        playerCount,
        instanceCount,
        entryFee,
        statuses: [],
        enrolledCounts: [],
        prizePools: []
      };
    }

    setTierMetadata(metadata);
    if (!silentUpdate) setMetadataLoading(false);
  }, []);

  // LAZY LOADING: Fetch detailed instances for a specific tier (called on expand)
  // Note: Uses functional state updates to avoid dependency on tierInstances/tierMetadata
  const fetchTierInstances = useCallback(async (tierId, contractInstance = null, userAccount = null, metadataOverride = null, silentUpdate = false) => {
    const readContract = contractInstance || getReadOnlyContract();
    const currentAccount = userAccount ?? account;
    if (!readContract) return;

    if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: true }));

    try {
      let metadata = metadataOverride;
      if (!metadata) {
        // Get tier config from HARDCODED data (matches TicTacChain pattern)
        const tierConfig = TIER_CONFIG[tierId];
        if (!tierConfig) {
          if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: false }));
          return;
        }

        const { playerCount, instanceCount, entryFee } = tierConfig;

        const statuses = [];
        const enrolledCounts = [];

        // OPTIMIZATION: Fetch all tournament instances using multicall (batches into single RPC call)
        // Falls back to parallel calls if Multicall3 is not available on the network
        const provider = readContract.runner?.provider || readContract.provider;
        const results = await batchFetchTournamentInfo(readContract, tierId, instanceCount, provider);

        // Process results - stop at first uninitialized instance
        for (const result of results) {
          if (!result.success) break; // Instance not initialized yet
          statuses.push(result.status);
          enrolledCounts.push(result.enrolledCount);
        }

        metadata = {
          playerCount,
          instanceCount: statuses.length,
          entryFee,
          statuses,
          enrolledCounts
        };
      }

      if (!metadata || metadata.instanceCount === 0) {
        if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: false }));
        return;
      }

      const instances = [];

      // Fetch detailed data for each instance in this tier
      for (let i = 0; i < metadata.instanceCount; i++) {
        try {
          // Parallel fetch tournament data and enrollment status
          const [tournamentInfo, isUserEnrolled] = await Promise.all([
            readContract.tournaments(tierId, i),
            currentAccount ? readContract.isEnrolled(tierId, i, currentAccount).catch(() => false) : Promise.resolve(false)
          ]);

          // Calculate prize pool (enrolled count * entry fee * 0.9 to account for 10% network fee)
          const prizePoolETH = (metadata.enrolledCounts[i] * parseFloat(metadata.entryFee) * 0.9).toFixed(4);

          instances.push({
            tierId,
            instanceId: i,
            status: metadata.statuses[i],
            enrolledCount: metadata.enrolledCounts[i],
            maxPlayers: metadata.playerCount,
            entryFee: metadata.entryFee,
            prizePool: prizePoolETH,
            isEnrolled: isUserEnrolled,
            enrollmentTimeout: tournamentInfo.enrollmentTimeout,
            hasStartedViaTimeout: tournamentInfo.hasStartedViaTimeout,
            tournamentStatus: metadata.statuses[i]
          });
        } catch (err) {
          console.log(`Could not fetch instance ${i} for tier ${tierId}:`, err.message);
        }
      }

      // Sort instances by priority
      const getSortPriority = (instance) => {
        const { tournamentStatus, isEnrolled, enrolledCount } = instance;

        if (tournamentStatus === 1 && isEnrolled) return 1;
        if (tournamentStatus === 0 && isEnrolled) return 2;
        if (tournamentStatus === 0 && !isEnrolled && enrolledCount > 0) return 3;
        if (tournamentStatus === 0 && !isEnrolled && enrolledCount === 0) return 4;
        if (tournamentStatus === 1 && !isEnrolled) return 5;
        return 6;
      };

      instances.sort((a, b) => getSortPriority(a) - getSortPriority(b));

      setTierInstances(prev => ({ ...prev, [tierId]: instances }));
    } catch (error) {
      console.error(`Error fetching tier ${tierId} instances:`, error);
    }

    if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: false }));
  }, [getReadOnlyContract, account]);

  // Execute protocol raffle (state-modifying transaction)
  const executeRaffle = useCallback(async () => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setRaffleSyncing(true);

      // Get ChessOnChain contract with signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chessContract = new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, signer);

      const tx = await chessContract.executeProtocolRaffle();
      console.log('Raffle transaction submitted:', tx.hash);
      alert('Raffle transaction submitted! Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Raffle transaction confirmed:', receipt);

      // Parse event logs for winner info
      let winner = null;
      let winnerAmount = null;
      let ownerAmount = null;

      for (const log of receipt.logs) {
        try {
          const parsedLog = chessContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });

          if (parsedLog.name === 'ProtocolRaffleExecuted') {
            winner = parsedLog.args.winner;
            winnerAmount = parsedLog.args.winnerShare;
            ownerAmount = parsedLog.args.ownerShare;
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      // Show success message
      if (winner) {
        const winnerETH = ethers.formatEther(winnerAmount);
        const ownerETH = ethers.formatEther(ownerAmount);
        const isYouWinner = winner.toLowerCase() === account.toLowerCase();

        alert(
          `Raffle Complete!\n\n` +
          `Winner: ${isYouWinner ? 'YOU!' : shortenAddress(winner)}\n` +
          `Winner Prize: ${winnerETH} ETH\n` +
          `Owner Share: ${ownerETH} ETH`
        );
      } else {
        alert('Raffle executed successfully!');
      }

      // Refresh data
      await fetchRaffleInfo();

      // Refresh tournament instances
      if (expandedTiers) {
        const expandedTierIds = Object.keys(expandedTiers)
          .filter(id => expandedTiers[id])
          .map(id => parseInt(id));

        for (const tierId of expandedTierIds) {
          await fetchTierInstances(tierId, null, null, null, true);
        }
      }

    } catch (error) {
      console.error('Error executing raffle:', error);

      let errorMessage = error.message || 'Unknown error';

      if (error.message?.includes('InsufficientThreshold')) {
        errorMessage = 'Raffle threshold not reached yet';
      } else if (error.message?.includes('NotEligible')) {
        errorMessage = 'You must be enrolled in at least one tournament to trigger the raffle';
      } else if (error.message?.includes('NoEligiblePlayers')) {
        errorMessage = 'No eligible players for raffle';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled';
      }

      alert(`Raffle execution failed: ${errorMessage}`);
    } finally {
      setRaffleSyncing(false);
    }
  }, [contract, account, fetchRaffleInfo, expandedTiers, fetchTierInstances]);

  // Refs to access current state without causing dependency loops
  const expandedTiersRef = useRef(expandedTiers);
  const tierInstancesRef = useRef(tierInstances);
  useEffect(() => { expandedTiersRef.current = expandedTiers; }, [expandedTiers]);
  useEffect(() => { tierInstancesRef.current = tierInstances; }, [tierInstances]);

  // Toggle tier expansion with lazy loading
  const toggleTier = useCallback(async (tierId) => {
    const isCurrentlyExpanded = expandedTiersRef.current[tierId];
    const alreadyLoaded = tierInstancesRef.current[tierId];

    // If expanding and not yet loaded, fetch instances
    if (!isCurrentlyExpanded && !alreadyLoaded) {
      setExpandedTiers(prev => ({ ...prev, [tierId]: true }));
      setVisibleInstancesCount(prev => ({ ...prev, [tierId]: 4 })); // Initialize to show 4 instances
      await fetchTierInstances(tierId);
    } else {
      setExpandedTiers(prev => ({ ...prev, [tierId]: !prev[tierId] }));
      if (!isCurrentlyExpanded) {
        // When expanding an already loaded tier, ensure visible count is set
        setVisibleInstancesCount(prev => ({ ...prev, [tierId]: prev[tierId] || 4 }));
      }
    }
  }, [fetchTierInstances]);

  // Show more instances for a tier
  const showMoreInstances = useCallback((tierId) => {
    setVisibleInstancesCount(prev => ({
      ...prev,
      [tierId]: (prev[tierId] || 4) + 4
    }));
  }, []);

  // LAZY LOADING: Refresh data after an action (enroll, claim, etc.)
  // Refreshes metadata and re-fetches instances for expanded/affected tiers
  const refreshAfterAction = useCallback(async (affectedTierId = null, contractInstance = null, userAccount = null) => {
    const readContract = contractInstance || getReadOnlyContract();
    const currentAccount = userAccount ?? account;

    // Refresh tier metadata
    await fetchTierMetadata(readContract);

    // Clear and re-fetch instances for affected/expanded tiers
    const tiersToRefresh = new Set();
    if (affectedTierId !== null) tiersToRefresh.add(affectedTierId);
    const currentExpanded = expandedTiersRef.current;
    Object.keys(currentExpanded).forEach(tid => {
      if (currentExpanded[tid]) tiersToRefresh.add(Number(tid));
    });

    // Clear cached instances for tiers that need refresh
    if (tiersToRefresh.size > 0) {
      setTierInstances(prev => {
        const updated = { ...prev };
        tiersToRefresh.forEach(tid => delete updated[tid]);
        return updated;
      });

      // Re-fetch instances for expanded tiers
      for (const tid of tiersToRefresh) {
        if (currentExpanded[tid]) {
          await fetchTierInstances(tid, readContract, currentAccount);
        }
      }
    }
  }, [getReadOnlyContract, account, fetchTierMetadata, fetchTierInstances]);

  // Handle tournament enrollment
  const handleEnroll = async (tierId, instanceId, entryFee) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTournamentsLoading(true);

      // Use hardcoded entry fee from TIER_CONFIG (matches TicTacChain pattern)
      const tierConfig = TIER_CONFIG[tierId];
      if (!tierConfig) {
        alert(`Invalid tier ID: ${tierId}`);
        setTournamentsLoading(false);
        return;
      }
      const feeInWei = ethers.parseEther(tierConfig.entryFee);
      console.log('[handleEnroll] Using hardcoded entry fee:', tierConfig.entryFee, 'ETH');

      // Get ChessOnChain contract with signer for enrollInTournament
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chessContract = new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, signer);

      // Call enrollInTournament function with entry fee as value
      const tx = await chessContract.enrollInTournament(tierId, instanceId, { value: feeInWei });
      await tx.wait();

      // Refresh player activity panel immediately after enrollment
      playerActivity.refetch();

      alert('Successfully enrolled in tournament!');

      // Navigate to tournament bracket view
      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId, matchTimePerPlayer);
      if (bracketData) {
        setViewingTournament(bracketData);
      }

      // Refresh tier data (lazy loading)
      await refreshAfterAction(tierId);

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error enrolling:', error);
      alert(`Error enrolling: ${error.message}`);
      setTournamentsLoading(false);
    }
  };

  // Handle force start tournament (with timeout tier system)
  const handleManualStart = async (tierId, instanceId) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTournamentsLoading(true);

      // Get ChessOnChain contract with signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chessContract = new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, signer);

      // First check if this instance exists using TIER_CONFIG
      const tierConfig = TIER_CONFIG[tierId];
      if (!tierConfig) {
        alert(`Invalid tier ID: ${tierId}`);
        setTournamentsLoading(false);
        return;
      }
      const instanceCount = tierConfig.instanceCount;
      if (instanceId >= instanceCount) {
        alert(`Invalid instance ID. Tier ${tierId + 1} only has ${instanceCount} instances (1-${instanceCount})`);
        setTournamentsLoading(false);
        return;
      }

      // Get tournament info to validate
      const tournamentInfo = await chessContract.tournaments(tierId, instanceId);
      const enrolledCount = Number(tournamentInfo.enrolledCount);
      const status = Number(tournamentInfo.status);
      const enrollmentTimeout = tournamentInfo.enrollmentTimeout;

      // Extract escalation level information
      const escalation1Start = Number(enrollmentTimeout.escalation1Start);
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const forfeitPool = enrollmentTimeout.forfeitPool;

      // Calculate client-side escalation availability
      const now = Math.floor(Date.now() / 1000);
      const canStartEscalation1 = escalation1Start > 0 && now >= escalation1Start;
      const canStartEscalation2 = escalation2Start > 0 && now >= escalation2Start;

      // Validation checks
      if (status !== 0) {
        alert('Tournament has already started or completed');
        setTournamentsLoading(false);
        return;
      }

      // Check if any escalation window is open
      if (!canStartEscalation1 && !canStartEscalation2) {
        let timeUntilCanStart = 0;

        if (escalation1Start > 0) {
          timeUntilCanStart = escalation1Start - now;
        }

        if (timeUntilCanStart > 0) {
          const minutes = Math.floor(timeUntilCanStart / 60);
          const seconds = timeUntilCanStart % 60;
          alert(`Tournament cannot be force-started yet. Wait ${minutes}m ${seconds}s for the escalation window to open.`);
        } else {
          alert('Tournament cannot be force-started at this time');
        }
        setTournamentsLoading(false);
        return;
      }

      if (enrolledCount < 1) {
        alert('Tournament has no enrolled players');
        setTournamentsLoading(false);
        return;
      }

      // Check if user is enrolled
      const isEnrolled = await chessContract.isEnrolled(tierId, instanceId, account);

      // Only enrolled players can force start
      if (!isEnrolled) {
        alert('You must be enrolled in the tournament to force-start it.');
        setTournamentsLoading(false);
        return;
      }

      // Build warning message for Escalation 1 force start
      let warningMessage = '';

      if (enrolledCount === 1) {
        // Escalation 1: Only you are enrolled
        warningMessage = 'You are the only enrolled player. Force-starting will declare you the winner and award you the prize pool';
        if (forfeitPool && forfeitPool > 0n) {
          warningMessage += ` plus any forfeited fees (${ethers.formatEther(forfeitPool)} ETH)`;
        }
        warningMessage += '. Continue?';
      } else {
        // Escalation 1: Multiple players enrolled
        warningMessage = `Force-starting will begin the tournament with ${enrolledCount} players`;
        if (forfeitPool && forfeitPool > 0n) {
          warningMessage += `. Forfeit pool of ${ethers.formatEther(forfeitPool)} ETH will be distributed`;
        }
        warningMessage += '. Continue?';
      }

      const confirmStart = window.confirm(warningMessage);
      if (!confirmStart) {
        setTournamentsLoading(false);
        return;
      }

      const tx = await chessContract.forceStartTournament(tierId, instanceId);
      await tx.wait();

      alert('Tournament force-started successfully!');

      // Exit tournament view and go back to tournaments list
      setViewingTournament(null);
      setCurrentMatch(null);

      // Refresh cached stats
      await fetchLeaderboard(true);

      // Refresh tier data (lazy loading)
      await refreshAfterAction(tierId);

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error force-starting tournament:', error);
      let errorMessage = error.message;
      if (error.message.includes('ARRAY_RANGE_ERROR')) {
        errorMessage = `Tournament cannot be started. This may be due to:\n- Invalid tier ID (${tierId + 1}) or instance ID (${instanceId + 1})\n- Tournament already started\n- Contract state issue\n\nCheck console for full error details.`;
      } else if (error.message.includes('TimeoutNotReached')) {
        errorMessage = 'Enrollment timeout window has not been reached yet';
      } else if (error.message.includes('NotEnrolled')) {
        errorMessage = 'You must be enrolled to force-start the tournament';
      } else if (error.message.includes('TournamentAlreadyStarted')) {
        errorMessage = 'Tournament has already been started';
      } else if (error.message.includes('InvalidTournamentStatus')) {
        errorMessage = 'Tournament is not in enrollment phase';
      } else if (error.message.includes('CannotForceStart')) {
        errorMessage = 'Tournament cannot be force-started yet - timeout tier requirements not met';
      }

      alert(`Error force-starting tournament: ${errorMessage}`);
      setTournamentsLoading(false);
    }
  };

  // Handle resetting enrollment window (EL1*)
  const handleResetEnrollmentWindow = useCallback(async (tierId, instanceId) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTournamentsLoading(true);

      // Confirm action with user
      const confirmed = window.confirm(
        `Reset Enrollment Window\n\n` +
        `This will restart the enrollment period for this tournament, ` +
        `allowing new players to join.\n\n` +
        `Continue?`
      );

      if (!confirmed) {
        setTournamentsLoading(false);
        return;
      }

      // Get ChessOnChain contract with signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chessContract = new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, signer);

      // Call contract function
      const tx = await chessContract.resetEnrollmentWindow(tierId, instanceId);
      console.log('Reset enrollment window transaction submitted:', tx.hash);
      alert('Transaction submitted! Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('Reset enrollment window confirmed:', receipt);

      alert('Enrollment window has been reset successfully! New players can now join.');

      // Refresh tournament data
      await fetchTierInstances(tierId, null, null, null, true);

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error resetting enrollment window:', error);

      let errorMessage = error.message || 'Unknown error';

      // Parse common error messages
      if (error.message?.includes('NotSoloEnrolled')) {
        errorMessage = 'Only solo enrolled players can reset the enrollment window';
      } else if (error.message?.includes('EnrollmentNotExpired')) {
        errorMessage = 'Enrollment window has not expired yet';
      } else if (error.message?.includes('TournamentNotInEnrollment')) {
        errorMessage = 'Tournament is no longer in enrollment phase';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled';
      }

      alert(`Failed to reset enrollment window: ${errorMessage}`);
      setTournamentsLoading(false);
    }
  }, [contract, account, fetchTierInstances]);

  // Handle claiming abandoned enrollment pool
  const handleClaimAbandonedPool = async (tierId, instanceId) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTournamentsLoading(true);

      // Get ChessOnChain contract with signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chessContract = new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, signer);

      // Get tournament info to validate
      const tournamentInfo = await chessContract.tournaments(tierId, instanceId);
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
          setTournamentsLoading(false);
          return;
        }

        const confirmClaim = window.confirm(
          `Claim the abandoned enrollment pool (Escalation 2)?\n\n` +
          `This tournament has ${enrolledCount} enrolled player${enrolledCount !== 1 ? 's' : ''} but failed to start in time.\n` +
          `You will receive the entire enrollment pool${forfeitPool > 0n ? ` plus ${ethers.formatEther(forfeitPool)} ETH in forfeited fees` : ''}.\n\n` +
          `The tournament will be terminated and reset.`
        );

        if (!confirmClaim) {
          setTournamentsLoading(false);
          return;
        }
      } else {
        // For completed tournaments (status >= 2)
        if (forfeitPool <= 0n) {
          alert('No forfeited funds to claim');
          setTournamentsLoading(false);
          return;
        }

        const confirmClaim = window.confirm(
          `Claim ${ethers.formatEther(forfeitPool)} ETH from abandoned enrollment pool?\n\nThis pool consists of forfeited entry fees from players who did not start the tournament.`
        );

        if (!confirmClaim) {
          setTournamentsLoading(false);
          return;
        }
      }

      const tx = await chessContract.claimAbandonedEnrollmentPool(tierId, instanceId);
      await tx.wait();

      alert('Abandoned enrollment pool claimed successfully!');

      // Exit tournament view and go back to tournaments list
      setViewingTournament(null);
      setCurrentMatch(null);

      // Refresh cached stats
      await fetchLeaderboard(true);

      // Refresh tier data (lazy loading)
      await refreshAfterAction(tierId);

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error claiming abandoned pool:', error);

      let errorMessage = error.message;
      if (error.message.includes('NothingToClaim')) {
        errorMessage = 'No forfeited funds available to claim';
      } else if (error.message.includes('TournamentNotEnded')) {
        errorMessage = 'Tournament must be completed before claiming abandoned pool';
      } else if (error.message.includes('ClaimWindowNotOpen')) {
        errorMessage = 'Claim window is not open yet';
      }

      alert(`Error claiming abandoned pool: ${errorMessage}`);
      setTournamentsLoading(false);
    }
  };

  // Refresh tournament bracket data
  const refreshTournamentBracket = useCallback(async (contractInstance, tierId, instanceId, totalMatchTime) => {
    try {
      // Get tournament info using getTournamentInfo() view function (matches TicTacChain pattern)
      const tournamentInfo = await contractInstance.getTournamentInfo(tierId, instanceId);
      const status = Number(tournamentInfo[0]);
      const currentRound = Number(tournamentInfo[1]);
      const enrolledCount = Number(tournamentInfo[2]);
      const prizePool = tournamentInfo[3];

      // Get tier config from hardcoded data
      const tierConfig = TIER_CONFIG[tierId];
      const playerCount = tierConfig.playerCount;

      // Extract timeout config using shared utility function
      const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, tierId, totalMatchTime, tierConfig);

      // Get enrolled players by iterating through enrolledPlayers mapping
      const enrolledPlayers = [];
      for (let i = 0; i < enrolledCount; i++) {
        try {
          const player = await contractInstance.enrolledPlayers(tierId, instanceId, i);
          enrolledPlayers.push(player);
        } catch (err) {
          console.warn(`Could not fetch enrolled player ${i}:`, err);
          break;
        }
      }

      // Get countdown data
      let firstEnrollmentTime = 0;
      let countdownActive = false;
      let enrollmentTimeout = null;
      try {
        const tournamentData = await contractInstance.tournaments(tierId, instanceId);
        firstEnrollmentTime = Number(tournamentData.firstEnrollmentTime);
        countdownActive = tournamentData.countdownActive;
        enrollmentTimeout = tournamentData.enrollmentTimeout;
      } catch (err) {
        console.log('Could not fetch countdown data:', err);
      }

      // Use per-tier timeout config (fetched above), fallback to parameter if not available
      const tierMatchTime = timeoutConfig?.matchTimePerPlayer ?? totalMatchTime;

      // Calculate total rounds
      const totalRounds = Math.ceil(Math.log2(playerCount));

      // Fetch all rounds and matches
      const rounds = [];
      for (let roundNum = 0; roundNum < totalRounds; roundNum++) {
        const roundInfo = await contractInstance.getRoundInfo(tierId, instanceId, roundNum);
        const totalMatches = Number(roundInfo[0]);

        // OPTIMIZATION: Fetch all matches for this round in parallel
        const matchPromises = Array.from({ length: totalMatches }, (_, matchNum) =>
          contractInstance.getMatch(tierId, instanceId, roundNum, matchNum)
            .then(matchData => ({ matchNum, matchData, success: true }))
            .catch(err => ({ matchNum, error: err, success: false }))
        );

        const matchResults = await Promise.all(matchPromises);

        const matches = [];
        for (const result of matchResults) {
          const matchNum = result.matchNum;
          try {
            if (!result.success) {
              throw result.error;
            }
            const matchData = result.matchData;

            // Parse match data from nested structure
            const zeroAddress = '0x0000000000000000000000000000000000000000';
            const player1 = matchData.common.player1;
            const player2 = matchData.common.player2;
            const winner = matchData.common.winner;
            const matchStatus = Number(matchData.common.status);
            const isDraw = matchData.common.isDraw;

            // Get loser from common data
            const loser = matchData.common.loser || zeroAddress;

            // Extract check status and move number from packedState
            // Bit 12: whiteInCheck, Bit 13: blackInCheck, Bits 22-31: fullMoveNumber
            const packedState = BigInt(matchData.packedState);
            const whiteInCheck = ((packedState >> 12n) & 1n) === 1n;
            const blackInCheck = ((packedState >> 13n) & 1n) === 1n;
            const fullMoveNumber = Number((packedState >> 22n) & 0x3FFn);

            const parsedMatch = {
              player1,
              player2,
              currentTurn: matchData.currentTurn,
              winner,
              loser,
              matchStatus,
              isDraw,
              startTime: Number(matchData.common.startTime),
              lastMoveTime: Number(matchData.common.lastMoveTime),
              fullMoveNumber,
              whiteInCheck,
              blackInCheck
            };

            // Calculate time remaining client-side (contract stores time at last move)
            // Formula: current player's time = stored time - elapsed since last move
            const now = Math.floor(Date.now() / 1000);
            const elapsed = parsedMatch.lastMoveTime > 0 ? now - parsedMatch.lastMoveTime : 0;

            let player1TimeRemaining = matchData.player1TimeRemaining !== undefined
              ? Number(matchData.player1TimeRemaining) : tierMatchTime;
            let player2TimeRemaining = matchData.player2TimeRemaining !== undefined
              ? Number(matchData.player2TimeRemaining) : tierMatchTime;

            // Only subtract elapsed time from the current player's clock (if match is active)
            if (parsedMatch.matchStatus === 1 && parsedMatch.currentTurn && elapsed > 0) {
              const isPlayer1Turn = parsedMatch.currentTurn.toLowerCase() === parsedMatch.player1.toLowerCase();
              if (isPlayer1Turn) {
                player1TimeRemaining = Math.max(0, player1TimeRemaining - elapsed);
              } else {
                player2TimeRemaining = Math.max(0, player2TimeRemaining - elapsed);
              }
            }

            // Fetch escalation state and firstPlayer using chessMatches mapping
            let timeoutState = null;
            let firstPlayer = null;
            try {
              const matchKey = ethers.solidityPackedKeccak256(
                ['uint8', 'uint8', 'uint8', 'uint8'],
                [tierId, instanceId, roundNum, matchNum]
              );
              const chessMatchData = await contractInstance.chessMatches(matchKey);

              // Extract firstPlayer (white player)
              firstPlayer = chessMatchData.firstPlayer;

              // Chess contract has timeoutState nested structure
              const esc1Start = Number(chessMatchData.timeoutState.escalation1Start);
              const esc2Start = Number(chessMatchData.timeoutState.escalation2Start);
              const esc3Start = Number(chessMatchData.timeoutState.escalation3Start);
              const hasTimeoutData = esc1Start > 0 || esc2Start > 0 || esc3Start > 0 || chessMatchData.timeoutState.timeoutActive;

              if (hasTimeoutData) {
                timeoutState = {
                  escalation1Start: esc1Start,
                  escalation2Start: esc2Start,
                  escalation3Start: esc3Start,
                  activeEscalation: Number(chessMatchData.timeoutState.activeEscalation),
                  timeoutActive: chessMatchData.timeoutState.timeoutActive,
                  forfeitAmount: chessMatchData.timeoutState.forfeitAmount
                };
              }
            } catch (escalationErr) {
              // Match may not have timeout state yet - this is normal for active matches
              console.debug('No escalation state for match (normal for non-stalled matches):', escalationErr.message);
            }

            // Check escalation availability using contract functions (more reliable than client calculation)
            let escL2Available = false;
            let escL3Available = false;
            try {
              escL2Available = await contractInstance.isMatchEscL2Available(tierId, instanceId, roundNum, matchNum);
              escL3Available = await contractInstance.isMatchEscL3Available(tierId, instanceId, roundNum, matchNum);
            } catch (escCheckErr) {
              console.debug('Could not check escalation availability:', escCheckErr.message);
            }

            // Check if current user is an advanced player for this round
            let isUserAdvancedForRound = false;
            if (account) {
              try {
                isUserAdvancedForRound = await contractInstance.isPlayerInAdvancedRound(tierId, instanceId, roundNum, account);
                console.log(`[Bracket R${roundNum}] isUserAdvancedForRound:`, isUserAdvancedForRound);
              } catch (advErr) {
                console.debug('[Bracket] Advanced player check failed:', advErr.reason || advErr.message);
              }
            }

            // Create client-side timeout state if contract doesn't have it
            if (!timeoutState) {
              const timeoutOccurred = parsedMatch.lastMoveTime + (player1TimeRemaining <= 0
                ? (parsedMatch.player1TimeRemaining ?? tierMatchTime)
                : (parsedMatch.player2TimeRemaining ?? tierMatchTime));
              const matchLevel2Delay = timeoutConfig?.matchLevel2Delay || 120;
              const matchLevel3Delay = timeoutConfig?.matchLevel3Delay || 240;

              timeoutState = {
                escalation1Start: timeoutOccurred + matchLevel2Delay,
                escalation2Start: timeoutOccurred + matchLevel3Delay,
                escalation3Start: 0,
                activeEscalation: 0,
                timeoutActive: true, // We detected a timeout
                forfeitAmount: 0,
                clientDetected: true // Flag to indicate this was detected client-side
              };
              console.log(`[Bracket R${roundNum}M${matchNum}] Client-detected timeout state:`, timeoutState);
            }

            // Determine if match was completed by timeout
            const isTimedOut = parsedMatch.matchStatus === 2 && timeoutState?.timeoutActive === true;

            matches.push({
              ...parsedMatch,
              firstPlayer, // White player
              timeoutState,
              isTimedOut,
              // Override with contract's real-time values
              player1TimeRemaining,
              player2TimeRemaining,
              matchTimePerPlayer: tierMatchTime, // Pass through per-tier value for UI
              timeoutConfig, // Add tier timeout config for escalation calculations
              escL2Available, // Contract says Level 2 is available
              escL3Available, // Contract says Level 3 is available
              isUserAdvancedForRound // User's advanced status for this round
            });
          } catch (err) {
            // Match might not exist yet - create placeholder with all required fields
            console.warn(`Match ${matchNum} not yet initialized`);
            const zeroAddress = '0x0000000000000000000000000000000000000000';
            matches.push({
              player1: zeroAddress,
              player2: zeroAddress,
              currentTurn: zeroAddress,
              winner: zeroAddress,
              loser: zeroAddress,
              board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
              matchStatus: 0,
              isDraw: false,
              startTime: 0,
              lastMoveTime: 0,
              timeoutState: null,
              player1TimeRemaining: tierMatchTime,
              player2TimeRemaining: tierMatchTime,
              matchTimePerPlayer: tierMatchTime,
              timeoutConfig, // Add tier timeout config for placeholder matches too
              escL2Available: false, // Placeholder: no escalations available
              escL3Available: false  // Placeholder: no escalations available
            });
          }
        }

        rounds.push({ roundNumber: roundNum, matches });
      }

      return {
        tierId,
        instanceId,
        status,
        currentRound,
        enrolledCount,
        prizePool,
        playerCount,
        entryFee: tierConfig.entryFee,
        enrolledPlayers,
        rounds,
        firstEnrollmentTime,
        countdownActive,
        enrollmentTimeout,
        timeoutConfig // Add tier timeout configuration
      };
    } catch (error) {
      console.error('Error refreshing tournament bracket:', error);
      return null;
    }
  }, [escalationInterval, account]);

  // Handle entering tournament (fetch and display bracket)
  const handleEnterTournament = async (tierId, instanceId) => {
    if (!contract) return;

    try {
      setTournamentsLoading(true);

      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId, matchTimePerPlayer);
      if (bracketData) {
        setViewingTournament(bracketData);

        // Scroll to tournament bracket after rendering
        setTimeout(() => {
          if (tournamentBracketRef.current) {
            tournamentBracketRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // Collapse activity panel after scrolling
          if (collapseActivityPanelRef.current) {
            collapseActivityPanelRef.current();
          }
        }, 100);
      }

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error loading tournament bracket:', error);
      alert(`Error loading tournament: ${error.message}`);
      setTournamentsLoading(false);
    }
  };

  // Helper function to convert board index to chess notation (e.g., 0 → "a1", 63 → "h8")
  const indexToChessNotation = useCallback((index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const file = String.fromCharCode(97 + col); // 'a' to 'h'
    const rank = row + 1; // 1 to 8
    return `${file}${rank}`;
  }, []);

  // Fetch move history from blockchain events with fallback to board state reconstruction
  const fetchMoveHistory = useCallback(async (contractInstance, tierId, instanceId, roundNumber, matchNumber) => {
    try {
      // Chess move history - get match data using chess functions
      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const player1 = matchData.common.player1;
      const matchStartTime = Number(matchData.common.startTime);

      // Try to query ChessMoveMade events for this match
      try {
        // Use solidityPackedKeccak256 to match Solidity's keccak256(abi.encodePacked(...))
        const matchKey = ethers.solidityPackedKeccak256(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [tierId, instanceId, roundNumber, matchNumber]
        );

        const filter = contractInstance.filters.MoveMade(matchKey);
        const events = await contractInstance.queryFilter(filter);

        if (events.length > 0) {
          // Filter events to only include those from the current match instance
          // Get block timestamps and filter by match start time
          const eventsWithTimestamps = await Promise.all(
            events.map(async (event) => {
              const block = await event.getBlock();
              return {
                event,
                timestamp: block.timestamp
              };
            })
          );

          // Only include events that occurred at or after the match started
          const currentMatchEvents = eventsWithTimestamps
            .filter(({ timestamp }) => timestamp >= matchStartTime)
            .map(({ event }) => event);

          if (currentMatchEvents.length === 0) {
            return [];
          }

          // Convert events to move history with proper chess notation
          const history = currentMatchEvents.map(event => {
            const player = event.args.player;
            const from = Number(event.args.from);
            const to = Number(event.args.to);
            const promotion = 0; // MoveMade event doesn't include promotion
            const isPlayer1 = player.toLowerCase() === player1.toLowerCase();
            const fromNotation = indexToChessNotation(from);
            const toNotation = indexToChessNotation(to);
            return {
              player: isPlayer1 ? '♚' : '♔', // ♚ for white (player1), ♔ for black (player2)
              move: `${fromNotation}→${toNotation}${promotion ? ' ♕' : ''}`, // e.g., "e2→e4"
              from,
              to,
              promotion,
              address: player,
              blockNumber: event.blockNumber
            };
          });

          // Sort by block number to ensure correct order
          history.sort((a, b) => a.blockNumber - b.blockNumber);
          return history;
        }
      } catch (eventError) {
        console.warn('Event query failed, falling back to empty history:', eventError);
      }

      // No events found - return empty array
      return [];
    } catch (error) {
      console.error('Error fetching move history:', error);
      return [];
    }
  }, [indexToChessNotation]);

  // Refresh match data from contract
  const refreshMatchData = useCallback(async (contractInstance, userAccount, matchInfo, totalMatchTime) => {
    try {
      const { tierId, instanceId, roundNumber, matchNumber } = matchInfo;

      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);

      // Unpack the chess board from packedBoard (4 bits per square, 64 squares)
      // Encoding: 0=empty, 1-6=white pieces (pawn..king), 7-12=black pieces (pawn..king)
      const board = [];
      let packed = BigInt(matchData.packedBoard);
      for (let i = 0; i < 64; i++) {
        const value = Number(packed & 0xFn);
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
        packed = packed >> 4n;
      }

      // Fetch per-tier timeout config to get correct match time
      const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, tierId, totalMatchTime, TIER_CONFIG[tierId]);
      const tierMatchTime = timeoutConfig?.matchTimePerPlayer ?? totalMatchTime;

      // Fetch escalation state using chessMatches mapping
      let timeoutState = null;
      let firstPlayer = matchData.firstPlayer; // Initialize from getMatch
      try {
        const matchKey = ethers.solidityPackedKeccak256(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [tierId, instanceId, roundNumber, matchNumber]
        );
        const chessMatchData = await contractInstance.chessMatches(matchKey);

        // Check if timeoutState exists (it won't for new matches)
        if (chessMatchData.timeoutState) {
          timeoutState = {
            escalation1Start: Number(chessMatchData.timeoutState.escalation1Start),
            escalation2Start: Number(chessMatchData.timeoutState.escalation2Start),
            escalation3Start: Number(chessMatchData.timeoutState.escalation3Start),
            activeEscalation: Number(chessMatchData.timeoutState.activeEscalation),
            timeoutActive: chessMatchData.timeoutState.timeoutActive,
            forfeitAmount: chessMatchData.timeoutState.forfeitAmount
          };
        }
      } catch (escalationErr) {
        // Match may not have timeout state yet - this is normal for active matches
        console.debug('No escalation state for match (normal for non-stalled matches):', escalationErr.message);
      }

      // Parse match data from nested structure
      const player1 = matchData.common.player1;
      const player2 = matchData.common.player2;
      const currentTurn = matchData.currentTurn;
      const winner = matchData.common.winner;
      const matchStatus = Number(matchData.common.status);
      const isDraw = matchData.common.isDraw;
      const startTime = Number(matchData.common.startTime);
      const lastMoveTime = Number(matchData.common.lastMoveTime);

      // Extract check status and move number from packedState
      // Bit 12: whiteInCheck, Bit 13: blackInCheck, Bits 22-31: fullMoveNumber
      const packedState = BigInt(matchData.packedState);
      const whiteInCheck = ((packedState >> 12n) & 1n) === 1n;
      const blackInCheck = ((packedState >> 13n) & 1n) === 1n;
      const fullMoveNumber = Number((packedState >> 22n) & 0x3FFn);

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const isMatchInitialized =
        player1.toLowerCase() !== zeroAddress &&
        player2.toLowerCase() !== zeroAddress;

      // If contract returns cleared data (zero addresses + empty board), query MatchCompleted event
      // Keep polling until we find an event matching this exact match instance
      const isBoardEmpty = board.every(cell => cell.pieceType === 0);
      if (!isMatchInitialized && isBoardEmpty) {
        console.log('[refreshMatchData] Match data cleared, querying MatchCompleted event');

        try {
          const matchId = ethers.solidityPackedKeccak256(
            ['uint8', 'uint8', 'uint8', 'uint8'],
            [tierId, instanceId, roundNumber, matchNumber]
          );

          const filter = contractInstance.filters.MatchCompleted(matchId);
          const events = await contractInstance.queryFilter(filter);

          // Find event that matches this exact match instance
          for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            const { winner: eventWinner, isDraw: eventIsDraw, reason: eventReason, board: eventPackedBoard } = event.args;

            // Verify winner is one of our players
            const winnerLower = eventWinner.toLowerCase();
            const p1Lower = matchInfo.player1?.toLowerCase();
            const p2Lower = matchInfo.player2?.toLowerCase();
            const winnerIsPlayer = eventIsDraw || winnerLower === p1Lower || winnerLower === p2Lower || winnerLower === zeroAddress;

            if (!winnerIsPlayer) continue;

            // Verify event occurred after match start time
            const block = await event.getBlock();
            const eventTimestamp = Number(block.timestamp);
            const matchStartTime = matchInfo.startTime;

            if (matchStartTime && eventTimestamp < matchStartTime) continue;

            // Unpack the chess board from the event (4 bits per square, 64 squares)
            const unpackChessBoard = (packed) => {
              const boardArray = [];
              let p = BigInt(packed);
              for (let j = 0; j < 64; j++) {
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
                boardArray.push({ pieceType, color });
                p = p >> 4n;
              }
              return boardArray;
            };
            const eventBoard = unpackChessBoard(eventPackedBoard);

            console.log('[refreshMatchData] Found matching MatchCompleted event:', {
              winner: eventWinner,
              isDraw: eventIsDraw,
              reason: Number(eventReason),
              eventTimestamp,
              matchStartTime
            });

            const eventLoser = eventIsDraw ? zeroAddress :
              (winnerLower === p1Lower ? matchInfo.player2 : matchInfo.player1);

            return {
              ...matchInfo,
              matchStatus: 2,
              winner: eventWinner,
              loser: eventLoser,
              isDraw: eventIsDraw,
              board: eventBoard,
              isYourTurn: false,
              completedFromEventPoll: true,
              completionReason: Number(eventReason)
            };
          }

          console.log('[refreshMatchData] No matching MatchCompleted event found yet, continuing to poll');
        } catch (err) {
          console.error('[refreshMatchData] Error querying MatchCompleted event:', err);
        }

        return null;
      }

      let actualPlayer1 = player1;
      let actualPlayer2 = player2;

      if (!isMatchInitialized && matchInfo.player1 && matchInfo.player2) {
        actualPlayer1 = matchInfo.player1;
        actualPlayer2 = matchInfo.player2;
      }

      // Calculate time remaining client-side (contract stores time at last move)
      // Formula: current player's time = stored time - elapsed since last move
      const now = Math.floor(Date.now() / 1000);
      const elapsed = lastMoveTime > 0 ? now - lastMoveTime : 0;

      let player1TimeRemaining = matchData.player1TimeRemaining !== undefined
        ? Number(matchData.player1TimeRemaining) : tierMatchTime;
      let player2TimeRemaining = matchData.player2TimeRemaining !== undefined
        ? Number(matchData.player2TimeRemaining) : tierMatchTime;

      // Only subtract elapsed time from the current player's clock (if match is active)
      if (matchStatus === 1 && currentTurn && elapsed > 0) {
        const isPlayer1Turn = currentTurn.toLowerCase() === player1.toLowerCase();
        if (isPlayer1Turn) {
          player1TimeRemaining = Math.max(0, player1TimeRemaining - elapsed);
        } else {
          player2TimeRemaining = Math.max(0, player2TimeRemaining - elapsed);
        }
      }

      const boardState = Array.from(board);
      const isPlayer1 = actualPlayer1.toLowerCase() === userAccount.toLowerCase();
      const isYourTurn = currentTurn.toLowerCase() === userAccount.toLowerCase();

      // Get loser from match data
      const loser = matchData.common.loser || zeroAddress;

      // Determine if match was completed by timeout
      // A match is timed out if it completed with an active timeout state
      const isTimedOut = matchStatus === 2 && timeoutState?.timeoutActive === true;

      // Fetch last move from MoveMade events (persists after page refresh)
      let lastMove = null;
      try {
        // Use solidityPackedKeccak256 to match Solidity's keccak256(abi.encodePacked(...))
        const matchKey = ethers.solidityPackedKeccak256(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [tierId, instanceId, roundNumber, matchNumber]
        );
        const filter = contractInstance.filters.MoveMade(matchKey);
        const events = await contractInstance.queryFilter(filter);
        if (events.length > 0) {
          // Filter events to only include those from current match instance
          const matchStartTime = Number(matchData.common.startTime);
          const eventsWithTimestamps = await Promise.all(
            events.map(async (event) => {
              const block = await event.getBlock();
              return {
                event,
                timestamp: block.timestamp
              };
            })
          );

          // Only include events that occurred at or after the match started
          const currentMatchEvents = eventsWithTimestamps
            .filter(({ timestamp }) => timestamp >= matchStartTime)
            .map(({ event }) => event);

          if (currentMatchEvents.length > 0) {
            const lastEvent = currentMatchEvents[currentMatchEvents.length - 1];
            const movePlayer = lastEvent.args.player;
            lastMove = {
              from: Number(lastEvent.args.from),
              to: Number(lastEvent.args.to),
              player: movePlayer,
              isMyMove: movePlayer?.toLowerCase() === userAccount?.toLowerCase()
            };
          }
        }
      } catch (err) {
        console.error('Error fetching MoveMade events:', err.message);
      }

      return {
        ...matchInfo,
        player1: actualPlayer1,
        player2: actualPlayer2,
        firstPlayer, // White player
        currentTurn,
        winner,
        loser,
        board: boardState,
        matchStatus,
        isDraw,
        isTimedOut,
        isPlayer1,
        isYourTurn,
        isMatchInitialized,
        timeoutState,
        lastMoveTime,
        startTime,
        fullMoveNumber,
        whiteInCheck,
        blackInCheck,
        // Time tracking fields
        player1TimeRemaining,
        player2TimeRemaining,
        lastMoveTimestamp: lastMoveTime, // Use lastMoveTime as timestamp
        matchTimePerPlayer: tierMatchTime, // Pass through per-tier value for UI components
        timeoutConfig, // Pass timeout config to UI components
        lastMove // Last move for highlighting (from events)
      };
    } catch (error) {
      console.error('Error refreshing match:', error);
      return null;
    }
  }, [escalationInterval]);

  // Handle making a chess move (called from ChessBoard component)
  const handleMakeMove = async (fromSquare, toSquare, promotion = 0) => {
    if (!currentMatch || !contract || !account) return;

    // Attempt to make the move
    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      console.log('Making chess move:', { from: fromSquare, to: toSquare, promotion });

      // Chess makeMove signature: (tierId, instanceId, roundNumber, matchNumber, from, to, promotion)
      const tx = await contract.makeMove(
        tierId,
        instanceId,
        roundNumber,
        matchNumber,
        fromSquare,
        toSquare,
        promotion
      );

      await tx.wait();

      // Refresh match data
      const updated = await refreshMatchData(contract, account, currentMatch, matchTimePerPlayer);
      if (updated) {
        setCurrentMatch(updated);
        previousBoardRef.current = [...updated.board];

        // Refresh move history
        const history = await fetchMoveHistory(
          contract,
          currentMatch.tierId,
          currentMatch.instanceId,
          currentMatch.roundNumber,
          currentMatch.matchNumber
        );
        setMoveHistory(history);
      }

      setMatchLoading(false);
    } catch (error) {
      console.error('Error making chess move:', error);

      // Parse error message for user-friendly display
      let errorMsg = 'Invalid Move';

      // Check for common contract revert patterns
      const errorString = error.message || error.toString();

      if (errorString.includes('user rejected') || errorString.includes('User denied')) {
        errorMsg = 'Transaction cancelled';
      } else if (errorString.includes('insufficient funds')) {
        errorMsg = 'Insufficient funds for gas';
      } else if (errorString.includes('Not your turn') || errorString.includes('not your turn')) {
        errorMsg = 'Not your turn';
      } else if (errorString.includes('Match not active') || errorString.includes('match not active')) {
        errorMsg = 'Match is not active';
      } else if (errorString.includes('execution reverted')) {
        // Generic contract revert - likely an invalid move
        errorMsg = 'Invalid Move - This move is not allowed by chess rules';
      }

      alert(errorMsg);
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

      // Refresh match data to get updated winner/loser
      const updatedMatch = await refreshMatchData(contract, account, currentMatch, matchTimePerPlayer);
      if (updatedMatch) {
        setCurrentMatch(updatedMatch);

        // Show victory modal with proper winner/loser info (timeout = reason 1)
        setMatchEndResult({ result: 'forfeit_win', completionReason: 1 });
        setMatchEndWinnerLabel('You');
        setMatchEndWinner(updatedMatch.winner);
        setMatchEndLoser(updatedMatch.loser);
      }

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

      // Get ChessOnChain contract with signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chessContract = new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, signer);

      const tx = await chessContract.forceEliminateStalledMatch(tierId, instanceId, roundNumber, matchNumber);
      await tx.wait();

      alert('Stalled match eliminated! Tournament can now continue.');

      // Exit match view and go to tournament bracket
      setCurrentMatch(null);

      // Refresh cached stats
      await fetchLeaderboard(true);

      // Refresh tier data (lazy loading)
      await refreshAfterAction(tierId);

      // Refresh and show tournament bracket
      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId, matchTimePerPlayer);
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
    // If called from bracket, matchData will be provided
    // If called from match view, use currentMatch
    const match = matchData || currentMatch;
    if (!match || !contract) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = match;

      // Get ChessOnChain contract with signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const chessContract = new ethers.Contract(CONTRACT_ADDRESS, CHESS_ABI, signer);

      const tx = await chessContract.claimMatchSlotByReplacement(tierId, instanceId, roundNumber, matchNumber);
      await tx.wait();

      alert('Match slot claimed! You have replaced both players and advanced.');

      // Exit match view and go back to tournaments list
      setCurrentMatch(null);
      setViewingTournament(null);

      // Refresh cached stats
      await fetchLeaderboard(true);

      // Refresh tier data (lazy loading)
      await refreshAfterAction(tierId);

      setMatchLoading(false);
    } catch (error) {
      console.error('Error claiming match slot:', error);
      alert(`Error claiming match slot: ${error.message}`);
      setMatchLoading(false);
    }
  };

  // Handle entering a match from tournament bracket
  const handlePlayMatch = async (tierId, instanceId, roundNumber, matchNumber) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setMatchLoading(true);

      // Fetch tournament info using getTournamentInfo() view function (matches TicTacChain pattern)
      const tournamentInfo = await contract.getTournamentInfo(tierId, instanceId);
      // Get tier config from hardcoded data
      const tierConfig = TIER_CONFIG[tierId];
      const playerCount = tierConfig.playerCount;
      const prizePool = tournamentInfo[3]; // prizePool at index 3 in getTournamentInfo

      const matchData = await contract.getMatch(tierId, instanceId, roundNumber, matchNumber);

      const player1 = matchData.common.player1;
      const player2 = matchData.common.player2;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      let actualPlayer1 = player1;
      let actualPlayer2 = player2;

      if (player1.toLowerCase() === zeroAddress) {
        // Get first two enrolled players
        const enrolledCount = Number(tournamentInfo[2]); // enrolledCount at index 2 in getTournamentInfo
        if (enrolledCount >= 2) {
          actualPlayer1 = await contract.enrolledPlayers(tierId, instanceId, 0);
          actualPlayer2 = await contract.enrolledPlayers(tierId, instanceId, 1);
        }
      }

      const updated = await refreshMatchData(contract, account, {
        tierId, instanceId, roundNumber, matchNumber,
        player1: actualPlayer1,
        player2: actualPlayer2,
        playerCount, // Add tournament context
        prizePool    // Add tournament context
      }, matchTimePerPlayer);

      if (updated) {
        setCurrentMatch(updated);
        // Initialize board ref for move detection
        previousBoardRef.current = [...updated.board];
        // Fetch move history from blockchain events
        const history = await fetchMoveHistory(contract, tierId, instanceId, roundNumber, matchNumber);
        setMoveHistory(history);

        // Scroll to match view after rendering
        setTimeout(() => {
          if (matchViewRef.current) {
            matchViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // Collapse activity panel after scrolling
          if (collapseActivityPanelRef.current) {
            collapseActivityPanelRef.current();
          }
        }, 100);
      }

      setMatchLoading(false);
    } catch (error) {
      console.error('Error loading match:', error);
      alert(`Error loading match: ${error.message}`);
      setMatchLoading(false);
    }
  };

  // Handle spectating a match (for non-participants)
  // COMMENTED OUT: Spectate functionality disabled for now
  /* const handleSpectateMatch = async (tierId, instanceId, roundNumber, matchNumber) => {
    if (!contract) {
      alert('Contract not loaded');
      return;
    }

    try {
      setMatchLoading(true);
      setIsSpectator(true); // Mark as spectator mode

      // Fetch tournament info using getTournamentInfo() view function
      const tournamentInfo = await contract.getTournamentInfo(tierId, instanceId);
      // Get tier config from hardcoded data
      const tierConfig = TIER_CONFIG[tierId];
      const playerCount = tierConfig.playerCount;
      const prizePool = tournamentInfo[3]; // prizePool at index 3 in getTournamentInfo

      const matchData = await contract.getMatch(tierId, instanceId, roundNumber, matchNumber);

      const player1 = matchData.common.player1;
      const player2 = matchData.common.player2;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      let actualPlayer1 = player1;
      let actualPlayer2 = player2;

      if (player1.toLowerCase() === zeroAddress) {
        // Get first two enrolled players
        const enrolledCount = Number(tournamentInfo[2]); // enrolledCount at index 2 in getTournamentInfo
        if (enrolledCount >= 2) {
          actualPlayer1 = await contract.enrolledPlayers(tierId, instanceId, 0);
          actualPlayer2 = await contract.enrolledPlayers(tierId, instanceId, 1);
        }
      }

      // Use a dummy account for refreshMatchData if user not connected
      const viewerAccount = account || zeroAddress;

      const updated = await refreshMatchData(contract, viewerAccount, {
        tierId, instanceId, roundNumber, matchNumber,
        player1: actualPlayer1,
        player2: actualPlayer2,
        playerCount, // Add tournament context
        prizePool    // Add tournament context
      }, matchTimePerPlayer);

      if (updated) {
        setCurrentMatch(updated);
        // Initialize board ref for move detection
        previousBoardRef.current = [...updated.board];
        // Fetch move history from blockchain events
        const history = await fetchMoveHistory(contract, tierId, instanceId, roundNumber, matchNumber);
        setMoveHistory(history);

        // Scroll to match view after rendering
        setTimeout(() => {
          if (matchViewRef.current) {
            matchViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // Collapse activity panel after scrolling
          if (collapseActivityPanelRef.current) {
            collapseActivityPanelRef.current();
          }
        }, 100);
      }

      setMatchLoading(false);
    } catch (error) {
      console.error('Error loading match for spectating:', error);
      alert(`Error loading match: ${error.message}`);
      setMatchLoading(false);
      setIsSpectator(false);
    }
  }; */

  // Close match view and refresh tournament bracket
  const closeMatch = async () => {
    const tournamentInfo = currentMatch ? {
      tierId: currentMatch.tierId,
      instanceId: currentMatch.instanceId
    } : viewingTournament ? {
      tierId: viewingTournament.tierId,
      instanceId: viewingTournament.instanceId
    } : null;

    setCurrentMatch(null);
    setMoveHistory([]);
    setIsSpectator(false); // Reset spectator mode
    previousBoardRef.current = null;

    // Refresh tournament bracket and cached stats (with loading indicator)
    if (tournamentInfo && contract) {
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(contract, tournamentInfo.tierId, tournamentInfo.instanceId, matchTimePerPlayer);
      if (bracketData) {
        setViewingTournament(bracketData);
      }
      await fetchLeaderboard(false);
      setTournamentsLoading(false);
    }
  };

  // Handle closing the match end modal
  const handleMatchEndModalClose = () => {
    // Clear the modal state only - no navigation
    setMatchEndResult(null);
    setMatchEndWinnerLabel('');
  };


  // Go back from tournament bracket to tournaments list
  const handleBackToTournaments = async () => {
    setViewingTournament(null);
    setSearchParams({}); // Clear URL params when going back

    // Refresh tier metadata and cached stats (lazy loading)
    if (contract) {
      await refreshAfterAction();
      await fetchLeaderboard(false);
    }
  };

  // Initialize contract in read-only mode on mount (using public RPC - no wallet required)
  useEffect(() => {
    const initReadOnlyContract = async () => {
      try {
        // Use JsonRpcProvider for read-only access - doesn't require MetaMask
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const readOnlyContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CHESS_ABI,
          provider
        );

        setContract(readOnlyContract);
        await loadContractData(readOnlyContract, true);
      } catch (error) {
        console.error('Error initializing read-only contract:', error);
        // Page should still load even if contract init fails
        setInitialLoading(false);
      }
    };

    if (!contract) {
      initReadOnlyContract();
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum && typeof window.ethereum.on === 'function') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
        } else {
          connectWallet().catch(err => {
            console.error('Error reconnecting wallet:', err);
          });
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);


  // Listen for MatchCompleted events to notify players and update match state
  useEffect(() => {
    if (!contract || !account || !currentMatch) return;

    console.log('[MatchCompleted] Setting up event listener for current match:', {
      tierId: currentMatch.tierId,
      instanceId: currentMatch.instanceId,
      roundNumber: currentMatch.roundNumber,
      matchNumber: currentMatch.matchNumber
    });

    const handleMatchCompleted = async (matchId, player1, player2, winner, isDraw, reason, packedBoard, event) => {
      console.log('[MatchCompleted Event] ===== EVENT FIRED =====');
      console.log('[MatchCompleted Event] MatchId:', matchId);
      console.log('[MatchCompleted Event] Player1:', player1, 'Player2:', player2);
      console.log('[MatchCompleted Event] Winner:', winner, 'isDraw:', isDraw, 'reason:', Number(reason));

      // Check if this event is for the current match being viewed
      const currentMatchId = ethers.solidityPackedKeccak256(
        ['uint8', 'uint8', 'uint8', 'uint8'],
        [currentMatch.tierId, currentMatch.instanceId, currentMatch.roundNumber, currentMatch.matchNumber]
      );

      if (matchId !== currentMatchId) {
        console.log('[MatchCompleted Event] Event is for different match, ignoring');
        return;
      }

      // Time-gate: Only process events that occurred after current match started
      if (event) {
        try {
          const block = await event.getBlock();
          const eventTimestamp = block.timestamp;
          const matchStartTime = currentMatch.startTime;

          console.log('[MatchCompleted Event] Timestamp check:', {
            eventTimestamp,
            matchStartTime,
            isValidEvent: eventTimestamp >= matchStartTime
          });

          if (eventTimestamp < matchStartTime) {
            console.log('[MatchCompleted Event] Event is older than current match start time, ignoring');
            return;
          }
        } catch (err) {
          console.error('[MatchCompleted Event] Error checking timestamp:', err);
          // Continue processing if timestamp check fails
        }
      }

      console.log('[MatchCompleted Event] ✓ Event is for current match - processing completion');

      // Unpack chess board state (4 packed uint256s)
      const unpackChessBoard = (packed) => {
        // Chess board is packed differently - implementation matches refreshMatchData
        const boardArray = [];
        let p = BigInt(packed);
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const pieceData = Number(p & 0xFFn); // 8 bits per cell
            const pieceType = pieceData & 0x0F;
            const color = (pieceData >> 4) & 0x01;
            boardArray.push({ pieceType, color });
            p = p >> 8n;
          }
        }
        return boardArray;
      };
      const eventBoard = unpackChessBoard(packedBoard);

      // Determine loser
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const winnerLower = winner.toLowerCase();
      const p1Lower = currentMatch.player1?.toLowerCase();
      const eventLoser = isDraw ? zeroAddress : (winnerLower === p1Lower ? currentMatch.player2 : currentMatch.player1);

      // Update match state with completion data
      setCurrentMatch(prev => {
        if (!prev || prev.matchStatus === 2) return prev; // Already completed

        return {
          ...prev,
          matchStatus: 2,
          winner,
          loser: eventLoser,
          isDraw,
          board: eventBoard,
          isYourTurn: false,
          completionReason: Number(reason)
        };
      });

      // Show winner/loser banner
      const isPlayer1 = currentMatch.player1?.toLowerCase() === account.toLowerCase();
      const isPlayer2 = currentMatch.player2?.toLowerCase() === account.toLowerCase();
      const isParticipant = isPlayer1 || isPlayer2;

      if (isParticipant) {
        const userWon = !isDraw && winner.toLowerCase() === account.toLowerCase();
        const reasonNum = Number(reason);

        let resultType = 'lose';
        if (isDraw) {
          resultType = 'draw';
        } else if (userWon) {
          resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_win' : 'win';
        } else {
          resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_lose' : 'lose';
        }

        console.log('[MatchCompleted Event] Setting match end result:', resultType, 'with completion reason:', reasonNum);
        setMatchEndResult({ result: resultType, completionReason: reasonNum });
        setMatchEndWinner(winner);
        setMatchEndLoser(eventLoser);
      }
    };

    // Register event listener (listen to all MatchCompleted events, filter in handler)
    contract.on('MatchCompleted', handleMatchCompleted);
    console.log('[MatchCompleted] Event listener registered');

    // Query recent events to catch any missed while page was loading
    const checkRecentEvents = async () => {
      try {
        const currentMatchId = ethers.solidityPackedKeccak256(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [currentMatch.tierId, currentMatch.instanceId, currentMatch.roundNumber, currentMatch.matchNumber]
        );

        const filter = contract.filters.MatchCompleted(currentMatchId);
        const events = await contract.queryFilter(filter, -50);
        console.log('[MatchCompleted] Found', events.length, 'recent events for current match in last 50 blocks');

        // Process most recent event for this match
        if (events.length > 0) {
          const event = events[events.length - 1];
          const { player1, player2, winner, isDraw, reason, board } = event.args;
          handleMatchCompleted(currentMatchId, player1, player2, winner, isDraw, reason, board, event);
        }
      } catch (err) {
        console.error('[MatchCompleted] Error checking recent events:', err);
      }
    };

    checkRecentEvents();

    return () => {
      console.log('[MatchCompleted] Cleaning up event listener');
      contract.off('MatchCompleted', handleMatchCompleted);
    };
  }, [contract, account, currentMatch]);

  // Refresh tier data when account changes (initial load handled by initReadOnlyContract)
  useEffect(() => {
    // Skip initial mount - initReadOnlyContract handles that via loadContractData
    if (account) {
      // Clear cached instances so they re-fetch with new account's enrollment status
      setTierInstances({});
      refreshAfterAction();
    }
  }, [account, refreshAfterAction]);

  // Fetch cached stats when contract is available
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Poll raffle info every 10 seconds (runs globally when wallet connected)
  useEffect(() => {
    if (!account) return;
    fetchRaffleInfo();
    fetchRaffleHistory(); // Fetch history once on mount
    const pollInterval = setInterval(fetchRaffleInfo, 10000);
    return () => clearInterval(pollInterval);
  }, [account, fetchRaffleInfo, fetchRaffleHistory]);

  // Poll elite matches every 30 seconds (runs globally when wallet connected)
  useEffect(() => {
    if (!account) return;
    fetchEliteMatches();
    const pollInterval = setInterval(fetchEliteMatches, 30000);
    return () => clearInterval(pollInterval);
  }, [account, fetchEliteMatches]);

  // Poll leaderboard every 1 minute (runs globally)
  useEffect(() => {
    if (!contract) return;

    // Set up polling interval - runs every 60 seconds
    const pollInterval = setInterval(() => {
      fetchLeaderboard(true); // Silent update (no loading indicator)
    }, 60000);

    return () => clearInterval(pollInterval);
  }, [contract, fetchLeaderboard]);

  // Poll tier metadata and expanded tier instances every 10 seconds on home page
  useEffect(() => {
    // Only poll when on home page (not viewing tournament or match)
    if (currentMatch || viewingTournament || !contract) return;

    const pollHomePageData = async () => {
      try {
        // Fetch tier metadata silently (no loading indicators)
        await fetchTierMetadata(null, true);

        // Re-fetch instances for expanded tiers silently
        const expandedTierIds = Object.keys(expandedTiers)
          .filter(id => expandedTiers[id])
          .map(id => parseInt(id));

        for (const tierId of expandedTierIds) {
          await fetchTierInstances(tierId, null, null, null, true);
        }
      } catch (err) {
        console.error('Error polling home page data:', err);
      }
    };

    // Set up polling interval - runs every 10 seconds
    const pollInterval = setInterval(pollHomePageData, 10000);

    return () => clearInterval(pollInterval);
  }, [currentMatch, viewingTournament, contract, expandedTiers, fetchTierMetadata, fetchTierInstances]);

  // Poll tournament bracket every 3 seconds (using refs for seamless syncing)
  const tournamentRef = useRef(viewingTournament);
  const contractRefForBracket = useRef(contract);

  // Keep refs updated
  useEffect(() => {
    tournamentRef.current = viewingTournament;
    contractRefForBracket.current = contract;
  }, [viewingTournament, contract]);

  useEffect(() => {
    if (!viewingTournament || !contract) return;

    const doSync = async () => {
      const tournament = tournamentRef.current;
      const contractInstance = contractRefForBracket.current;

      if (!tournament || !contractInstance) return;

      const updated = await refreshTournamentBracket(contractInstance, tournament.tierId, tournament.instanceId, matchTimePerPlayer);
      if (updated) setViewingTournament(updated);

      // Reset dots to 1 after sync completes
      setBracketSyncDots(1);
    };

    // Set up polling interval - runs every 3 seconds
    const pollInterval = setInterval(doSync, 3000);

    return () => clearInterval(pollInterval);
  }, [viewingTournament?.tierId, viewingTournament?.instanceId, refreshTournamentBracket]);

  // Poll current match every 2 seconds for live timer updates (using refs for seamless syncing)
  const currentMatchRef = useRef(currentMatch);
  const contractRefForMatch = useRef(contract);
  const accountRefForMatch = useRef(account);

  // Keep refs updated
  useEffect(() => {
    currentMatchRef.current = currentMatch;
    contractRefForMatch.current = contract;
    accountRefForMatch.current = account;
  }, [currentMatch, contract, account]);

  // Polling for turn tracking and time remaining - events handle moves/completion
  useEffect(() => {
    if (!currentMatch || !contract || !account) return;

    const doMatchSync = async () => {
      const match = currentMatchRef.current;
      const contractInstance = contractRefForMatch.current;
      const userAccount = accountRefForMatch.current;

      if (!match || !contractInstance || !userAccount) return;

      // Skip polling if match is completed - events have set final state
      if (match.matchStatus === 2) {
        return;
      }

      try {
        const updatedMatch = await refreshMatchData(
          contractInstance,
          userAccount,
          match,
          matchTimePerPlayer
        );

        if (updatedMatch) {
          // If match just completed (detected via event query in refreshMatchData)
          if (updatedMatch.matchStatus === 2) {
            console.log('[Chess Polling] Match completion detected, updating state and showing modal');

            // Update match state with completion data
            setCurrentMatch(prev => {
              if (!prev || prev.matchStatus === 2) return prev; // Already completed
              return updatedMatch;
            });

            // Show completion modal (in case event listener missed it)
            const isPlayer1 = match.player1?.toLowerCase() === userAccount.toLowerCase();
            const isPlayer2 = match.player2?.toLowerCase() === userAccount.toLowerCase();
            const isParticipant = isPlayer1 || isPlayer2;

            if (isParticipant) {
              const userWon = !updatedMatch.isDraw && updatedMatch.winner.toLowerCase() === userAccount.toLowerCase();
              const reasonNum = updatedMatch.completionReason || 0;

              let resultType = 'lose';
              if (updatedMatch.isDraw) {
                resultType = 'draw';
              } else if (userWon) {
                resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_win' : 'win';
              } else {
                resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_lose' : 'lose';
              }

              console.log('[Chess Polling] Setting match end result:', resultType, 'with completion reason:', reasonNum);
              setMatchEndResult({ result: resultType, completionReason: reasonNum });
              setMatchEndWinner(updatedMatch.winner);
              setMatchEndLoser(updatedMatch.loser);
            }

            return; // Stop polling
          }

          // Update for in-progress matches only - update turn, timer, and board fields
          setCurrentMatch(prev => {
            if (!prev) return updatedMatch;

            // Preserve completed state set by events
            if (prev.matchStatus === 2) {
              return prev;
            }

            // Update turn, timer, and board fields from contract (source of truth)
            return {
              ...prev,
              board: updatedMatch.board,
              currentTurn: updatedMatch.currentTurn,
              isYourTurn: updatedMatch.isYourTurn,
              player1TimeRemaining: updatedMatch.player1TimeRemaining,
              player2TimeRemaining: updatedMatch.player2TimeRemaining,
              lastMoveTime: updatedMatch.lastMoveTime,
              lastMoveTimestamp: updatedMatch.lastMoveTimestamp,
              // matchStatus, winner, loser, isDraw are preserved from prev (event-driven)
            };
          });
        }
      } catch (error) {
        console.error('[Chess Polling] Error syncing match:', error);
      }

      setSyncDots(1);
    };

    // Poll every 2 seconds for turn/timer updates
    const matchPollInterval = setInterval(doMatchSync, 2000);

    return () => clearInterval(matchPollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, fetchMoveHistory, matchTimePerPlayer]);

  // Increment match sync dots every second (1 -> 2 -> 3, resets on sync)
  useEffect(() => {
    if (!currentMatch) return;
    const dotsInterval = setInterval(() => {
      setSyncDots(prev => prev >= 3 ? 3 : prev + 1);
    }, 1000);
    return () => clearInterval(dotsInterval);
  }, [currentMatch]);

  // Increment bracket sync dots every second
  useEffect(() => {
    if (!viewingTournament) return;

    const dotsInterval = setInterval(() => {
      setBracketSyncDots(prev => {
        if (prev >= 3) return 3;
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(dotsInterval);
  }, [viewingTournament]);

  // Loading animation component
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
              <Grid className="text-blue-400 animate-pulse" size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-blue-300 mb-2">Loading Game Data</h2>
          <p className="text-blue-400/70">Connecting to Arbitrum blockchain...</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
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
      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeInSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Particle Background */}
      <ParticleBackground colors={currentTheme.particleColors} symbols={CHESS_PIECES} fontSize="40px" />

      {/* Tournament Invitation Banner - shown when URL params present but not connected */}
      {urlTournamentParams && !account && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className={`max-w-2xl mx-auto bg-gradient-to-r backdrop-blur-lg rounded-xl p-4 border shadow-2xl ${
            isEnrolledInElite
              ? 'from-[#fbbf24]/90 to-[#f59e0b]/90 border-[#d4a012]/50'
              : 'from-purple-600/90 to-blue-600/90 border-purple-400/50'
          }`}>
            <div className="flex items-start gap-3">
              <Trophy className={isEnrolledInElite ? 'text-[#fff8e7]' : 'text-yellow-400'} size={24} />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold mb-1 ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-white'}`}>
                  Tournament Invitation
                </p>
                <p className={`text-sm mb-3 ${isEnrolledInElite ? 'text-[#f5e6c8]' : 'text-purple-100'}`}>
                  You've been invited to Tournament T{urlTournamentParams.tierId + 1}-I{urlTournamentParams.instanceId + 1}.
                  Connect your wallet to view and join!
                </p>
                <button
                  onClick={connectWallet}
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                >
                  <Wallet size={18} />
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Mobile Only */}
      {account && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto">
          {/* Solid background bar on mobile */}
          <div className="md:hidden bg-gradient-to-b from-slate-900 to-slate-950 border-t border-purple-400/30 px-4 py-2 flex items-center justify-between">
            {/* Player Activity Component */}
            <PlayerActivity
              activity={playerActivity.data}
              loading={playerActivity.loading}
              syncing={playerActivity.syncing}
              contract={contract}
              account={account}
              onEnterMatch={handlePlayMatch}
              onEnterTournament={handleEnterTournament}
              onRefresh={playerActivity.refetch}
              onDismissMatch={playerActivity.dismissMatch}
              gameName="chess"
              gameEmoji="♚"
              onHeightChange={setPlayerActivityHeight}
              onCollapse={(collapseFn) => { collapseActivityPanelRef.current = collapseFn; }}
              isElite={isEnrolledInElite}
              isExpanded={expandedPanel === 'playerActivity'}
              onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            />

            {/* Community Raffle Card */}
            <CommunityRaffleCard
              raffleInfo={raffleInfo}
              raffleHistory={raffleHistory}
              playerActivityHeight={playerActivityHeight}
              onRefresh={fetchRaffleInfo}
              onTriggerRaffle={executeRaffle}
              syncing={raffleSyncing}
              onHeightChange={setRaffleCardHeight}
              isExpanded={expandedPanel === 'communityRaffle'}
              onToggleExpand={() => setExpandedPanel(expandedPanel === 'communityRaffle' ? null : 'communityRaffle')}
            />

            {/* Elite Matches Card */}
            <EliteMatchesCard
              eliteMatches={eliteMatches}
              playerActivityHeight={playerActivityHeight}
              raffleCardHeight={raffleCardHeight}
              onRefresh={fetchEliteMatches}
              syncing={eliteMatchesSyncing}
              account={account}
              onViewMatch={handleViewArchivedMatch}
              isExpanded={expandedPanel === 'eliteMatches'}
              onToggleExpand={() => setExpandedPanel(expandedPanel === 'eliteMatches' ? null : 'eliteMatches')}
            />
          </div>

          {/* Desktop positioning (hidden on mobile, shown on desktop with original behavior) */}
          <div className="hidden md:block">
            <PlayerActivity
              activity={playerActivity.data}
              loading={playerActivity.loading}
              syncing={playerActivity.syncing}
              contract={contract}
              account={account}
              onEnterMatch={handlePlayMatch}
              onEnterTournament={handleEnterTournament}
              onRefresh={playerActivity.refetch}
              onDismissMatch={playerActivity.dismissMatch}
              gameName="chess"
              gameEmoji="♚"
              onHeightChange={setPlayerActivityHeight}
              onCollapse={(collapseFn) => { collapseActivityPanelRef.current = collapseFn; }}
              isElite={isEnrolledInElite}
              isExpanded={expandedPanel === 'playerActivity'}
              onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            />

            <CommunityRaffleCard
              raffleInfo={raffleInfo}
              raffleHistory={raffleHistory}
              playerActivityHeight={playerActivityHeight}
              onRefresh={fetchRaffleInfo}
              onTriggerRaffle={executeRaffle}
              syncing={raffleSyncing}
              onHeightChange={setRaffleCardHeight}
              isExpanded={expandedPanel === 'communityRaffle'}
              onToggleExpand={() => setExpandedPanel(expandedPanel === 'communityRaffle' ? null : 'communityRaffle')}
            />

            <EliteMatchesCard
              eliteMatches={eliteMatches}
              playerActivityHeight={playerActivityHeight}
              raffleCardHeight={raffleCardHeight}
              onRefresh={fetchEliteMatches}
              syncing={eliteMatchesSyncing}
              account={account}
              onViewMatch={handleViewArchivedMatch}
              isExpanded={expandedPanel === 'eliteMatches'}
              onToggleExpand={() => setExpandedPanel(expandedPanel === 'eliteMatches' ? null : 'eliteMatches')}
            />
          </div>
        </div>
      )}

      {/* Trust Banner */}
      <div style={{
        background: isEnrolledInElite ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 100, 200, 0.2)',
        borderBottom: `1px solid ${currentTheme.border}`,
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className={`flex flex-col md:flex-row md:items-center ${EXPLORER_URL ? 'md:justify-between' : 'md:justify-center'} gap-3 md:gap-4 text-xs md:text-sm`}>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-6 justify-center ${EXPLORER_URL ? 'md:justify-start' : ''}`}>
              <div className="flex items-center gap-2">
                <Shield className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-blue-400'} size={16} />
                <span className={`font-medium ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-blue-100'}`}>100% On-Chain</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-blue-400'} size={16} />
                <span className={`font-medium ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-blue-100'}`}>Immutable Rules</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-blue-400'} size={16} />
                <span className={`font-medium ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-blue-100'}`}>Every Move Verifiable</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-blue-400'} size={16} />
                <span className={`font-medium ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-blue-100'}`}>Zero Trackers</span>
              </div>
            </div>
            {EXPLORER_URL && (
              <a
                href={EXPLORER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 transition-colors justify-center md:justify-end ${
                  isEnrolledInElite
                    ? 'text-[#d4b866] hover:text-[#fbbf24]'
                    : 'text-blue-300 hover:text-blue-200'
                }`}
              >
                <Code size={16} />
                <span className="font-mono text-xs">{shortenAddress(CONTRACT_ADDRESS)}</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`}></div>
              <span className="relative text-8xl">♚</span>
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
            <div className={`bg-gradient-to-br rounded-xl p-4 border ${
              isEnrolledInElite
                ? 'from-[#fbbf24]/20 to-[#f59e0b]/20 border-[#d4a012]/30'
                : 'from-yellow-500/20 to-amber-500/20 border-yellow-400/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-yellow-400'} size={20} />
                <span className={`font-bold ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-yellow-300'}`}>10 minutes per match</span>
              </div>
              <p className={`text-sm ${isEnrolledInElite ? 'text-[#f5e6c8]' : 'text-yellow-200'}`}>
                Each player gets 10 minutes total for all their moves in the match.
              </p>
            </div>
            <div className={`bg-gradient-to-br rounded-xl p-4 border ${
              isEnrolledInElite
                ? `${currentTheme.successBg} ${currentTheme.successBorder}`
                : 'from-green-500/20 to-emerald-500/20 border-green-400/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="20" height="20" viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg" className={isEnrolledInElite ? currentTheme.successText : 'text-green-400'} fill="currentColor">
                  <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity="0.6"/>
                  <path d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
                  <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity="0.6"/>
                  <path d="M127.962 416.905v-104.72L0 236.585z"/>
                  <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity="0.2"/>
                  <path d="M0 212.32l127.96 75.638v-133.8z" fillOpacity="0.6"/>
                </svg>
                <span className={`font-bold ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-green-300'}`}>Instant ETH Payouts</span>
              </div>
              <p className={`text-sm ${isEnrolledInElite ? 'text-[#f5e6c8]' : 'text-green-200'}`}>
                Winners paid automatically on-chain. No delays, no middlemen.
              </p>
            </div>
            <div className={`relative bg-gradient-to-br rounded-xl p-4 border ${
              isEnrolledInElite
                ? 'from-[#fbbf24]/20 to-[#f59e0b]/20 border-[#d4a012]/30'
                : 'from-purple-500/20 to-violet-500/20 border-purple-400/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'} size={20} />
                <span className={`font-bold ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-purple-300'}`}>Impossible to grief</span>
              </div>
              <a
                href="#user-manual"
                className={`absolute top-3 right-3 transition-colors ${
                  isEnrolledInElite
                    ? 'text-[#d4b866] hover:text-[#fbbf24]'
                    : 'text-purple-400 hover:text-purple-300'
                }`}
                title="Learn more about anti-griefing"
              >
                <HelpCircle size={16} />
              </a>
              <p className={`text-sm ${isEnrolledInElite ? 'text-[#f5e6c8]' : 'text-purple-200'}`}>
                Anti-stalling mechanisms ensure every match completes. No admin required.
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
            <div className={`inline-flex items-center gap-4 px-8 py-4 rounded-2xl ${
              isEnrolledInElite
                ? `${currentTheme.successBg} ${currentTheme.successBorder} border`
                : 'bg-green-500/20 border border-green-400/50'
            }`}>
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                isEnrolledInElite ? 'bg-[#22c55e]' : 'bg-green-400'
              }`}></div>
              <span className={`font-mono text-lg ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-white'}`}>
                {shortenAddress(account)}
              </span>
            </div>
          )}

          {/* Why Arbitrum Info */}
          <WhyArbitrum variant="blue" />
        </div>

        {/* Archived Match View - Shows when viewing an elite match from history */}
        {viewingArchivedMatch && (
          <div className="mb-16">
            <button
              onClick={handleBackFromArchived}
              className="mb-6 flex items-center gap-2 px-4 py-2 bg-slate-800/60 backdrop-blur-lg text-cyan-300 rounded-lg hover:bg-slate-700/60 transition-all border border-cyan-500/30"
            >
              <ArrowLeft size={20} />
              Back to Matches
            </button>

            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4 mb-6 text-center">
              <h2 className="text-2xl font-bold text-amber-300 mb-2">
                Viewing Archived Elite Match
              </h2>
              <p className="text-amber-200 text-sm">
                This match has been completed and archived. Complete move history is stored on-chain.
              </p>
            </div>

            {/* Custom 3-column layout for archived matches: Players | Board | History */}
            <div className="grid grid-cols-1 xl:grid-cols-[20%_60%_20%] gap-4 items-start">
              {/* Left Column - Both Player Panels */}
              <div className="space-y-4">
                <PlayerPanel
                  playerAddress={viewingArchivedMatch.player1}
                  currentAccount={null}
                  isCurrentTurn={false}
                  isGameOver={true}
                  icon="♚"
                  label="White"
                  colorScheme="white"
                  variant="full"
                />
                <PlayerPanel
                  playerAddress={viewingArchivedMatch.player2}
                  currentAccount={null}
                  isCurrentTurn={false}
                  isGameOver={true}
                  icon="♔"
                  label="Black"
                  colorScheme="black"
                  variant="full"
                />
              </div>

              {/* Center Column - Larger Chess Board */}
              <div className="flex flex-col items-center w-full">
                <ChessBoard
                  board={viewingArchivedMatch.board}
                  onMove={null}
                  currentTurn={viewingArchivedMatch.currentTurn}
                  account={null}
                  player1={viewingArchivedMatch.player1}
                  player2={viewingArchivedMatch.player2}
                  firstPlayer={viewingArchivedMatch.firstPlayer}
                  matchStatus={viewingArchivedMatch.matchStatus}
                  loading={false}
                  whiteInCheck={false}
                  blackInCheck={false}
                  lastMoveTime={viewingArchivedMatch.lastMoveTime}
                  startTime={viewingArchivedMatch.startTime}
                  lastMove={null}
                  player1TimeRemaining={viewingArchivedMatch.player1TimeRemaining}
                  player2TimeRemaining={viewingArchivedMatch.player2TimeRemaining}
                  lastMoveTimestamp={viewingArchivedMatch.lastMoveTime}
                  matchTimePerPlayer={matchTimePerPlayer}
                  maxSize={900}
                />
              </div>

              {/* Right Column - Move History */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30 h-full">
                <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                  <History size={20} />
                  Move History
                </h3>
                {moveHistoryLoading ? (
                  <div className="text-center py-8 text-purple-300/60">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-2"></div>
                    <p className="text-sm">Loading move history...</p>
                    <p className="text-xs mt-2 text-purple-400/40">
                      Fetching moves from blockchain
                    </p>
                  </div>
                ) : moveHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-pink-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {moveHistory.map((move, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm bg-purple-500/10 p-3 rounded-lg hover:bg-purple-500/20 transition-colors">
                        <span className="text-purple-300 font-semibold min-w-[2rem]">#{idx + 1}</span>
                        <span className="text-white font-bold text-lg">{move.player}</span>
                        <span className="text-purple-200 font-mono">{move.move}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-purple-300/60">
                    <p className="text-sm">No move history available</p>
                    <p className="text-xs mt-2 text-purple-400/40">
                      No moves recorded for this match
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Match View - Shows when player enters a match or spectates */}
        {contract && currentMatch && !viewingArchivedMatch && (
          <div ref={matchViewRef}>
            <GameMatchLayout
            gameType="chess"
            match={currentMatch}
            account={account}
            loading={matchLoading}
            syncDots={syncDots}
            onClose={closeMatch}
            onClaimTimeoutWin={isSpectator ? null : handleClaimTimeoutWin}
            onForceEliminate={isSpectator ? null : handleForceEliminateStalledMatch}
            onClaimReplacement={isSpectator ? null : handleClaimMatchSlotByReplacement}
            tournamentRounds={viewingTournament?.rounds || null}
            currentRoundNumber={currentMatch.roundNumber}
            playerCount={viewingTournament?.playerCount || null}
            playerConfig={{
              player1: { icon: '♚', label: 'White' },
              player2: { icon: '♔', label: 'Black' }
            }}
            layout="players-board-history"
            isSpectator={isSpectator}
            renderPlayer1Extra={currentMatch.whiteInCheck ? () => (
              <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center mt-2">
                <span className="text-red-300 text-xs font-bold">⚠️ CHECK</span>
              </div>
            ) : undefined}
            renderPlayer2Extra={currentMatch.blackInCheck ? () => (
              <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center mt-2">
                <span className="text-red-300 text-xs font-bold">⚠️ CHECK</span>
              </div>
            ) : undefined}
            renderMoveHistory={moveHistory.length > 0 ? () => (
              <>
                <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                  <History size={20} />
                  Move History
                </h3>
                <div className="space-y-2">
                  {moveHistory.map((move, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm bg-purple-500/10 p-3 rounded-lg hover:bg-purple-500/20 transition-colors">
                      <span className="text-purple-300 font-semibold min-w-[2rem]">#{idx + 1}</span>
                      <span className="text-white font-bold text-lg">{move.player}</span>
                      <span className="text-purple-200 font-mono">{move.move}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : undefined}
          >
            {/* Chess Board Component */}
            <ChessBoard
              board={currentMatch.board}
              onMove={isSpectator ? null : handleMakeMove}
              currentTurn={currentMatch.currentTurn}
              account={isSpectator ? null : account}
              player1={currentMatch.player1}
              player2={currentMatch.player2}
              firstPlayer={currentMatch.firstPlayer}
              matchStatus={currentMatch.matchStatus}
              loading={matchLoading}
              whiteInCheck={currentMatch.whiteInCheck}
              blackInCheck={currentMatch.blackInCheck}
              lastMoveTime={currentMatch.lastMoveTime}
              startTime={currentMatch.startTime}
              lastMove={currentMatch.lastMove}
              player1TimeRemaining={currentMatch.player1TimeRemaining}
              player2TimeRemaining={currentMatch.player2TimeRemaining}
              lastMoveTimestamp={currentMatch.lastMoveTimestamp}
              matchTimePerPlayer={matchTimePerPlayer}
              maxSize={900}
            />
          </GameMatchLayout>
          </div>
        )}

        {/* Tournaments Section */}
        {contract && !currentMatch && !viewingArchivedMatch && (
          <>
            {viewingTournament ? (
              <div ref={tournamentBracketRef}>
                <TournamentBracket
                  tournamentData={viewingTournament}
                  onBack={handleBackToTournaments}
                  onEnterMatch={handlePlayMatch}
                  // onSpectateMatch={handleSpectateMatch} // COMMENTED OUT: Spectate disabled
                  onForceEliminate={handleForceEliminateStalledMatch}
                  onClaimReplacement={handleClaimMatchSlotByReplacement}
                  onManualStart={handleManualStart}
                  onClaimAbandonedPool={handleClaimAbandonedPool}
                  onResetEnrollmentWindow={handleResetEnrollmentWindow}
                  onEnroll={handleEnroll}
                  account={account}
                  loading={tournamentsLoading}
                  syncDots={bracketSyncDots}
                  isEnrolled={viewingTournament?.enrolledPlayers?.some(addr => addr.toLowerCase() === account?.toLowerCase())}
                  entryFee={viewingTournament?.entryFee || '0'}
                  isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount}
                  contract={contract}
                  isEnrolledInElite={isEnrolledInElite}
                />
              </div>
            ) : (
              // Show Tournament List
              <div className="mb-16">
                {/* Section Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <Trophy className="text-blue-400" size={48} />
                    <div className="flex flex-col items-start">
                      <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Live Instances
                      </h2>
                    </div>
                  </div>
                  <p className="text-xl text-blue-200 items-center gap-2">
                    Classic chess with real ETH stakes&nbsp;&nbsp;&nbsp;
                    <a
                      href="#chess-specifics"
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all hover:scale-110 ${
                        isEnrolledInElite
                          ? 'border-[#d4a012]/50 text-[#fbbf24] hover:bg-[#fbbf24]/20'
                          : 'border-purple-400/50 text-purple-400 hover:bg-purple-400/20'
                      }`}
                      title="Learn about Chess rules and Elite tier"
                    >
                      <HelpCircle size={12} />
                    </a>
                  </p>
                </div>

                {/* Loading State */}
                {metadataLoading && (
                  <div className="text-center py-12">
                    <div className="inline-block">
                      <div className={`w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4 ${
                        isEnrolledInElite
                          ? 'border-[#f59e0b]/30 border-t-[#fbbf24]'
                          : 'border-purple-500/30 border-t-purple-500'
                      }`}></div>
                      <p className={isEnrolledInElite ? 'text-[#d4b866]' : 'text-purple-300'}>Loading tournaments...</p>
                    </div>
                  </div>
                )}

                {/* Mode Selection: Duels vs Tournaments */}
                {!metadataLoading && Object.keys(tierMetadata).length > 0 && !selectedMode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12 animate-[fadeIn_0.5s_ease-out]">
                    {/* Duels Card */}
                    <button
                      onClick={() => setSelectedMode('duels')}
                      className={`backdrop-blur-lg rounded-2xl p-8 border-2 transition-all hover:shadow-xl cursor-pointer text-left group ${
                        isEnrolledInElite
                          ? 'bg-gradient-to-br from-amber-600/20 to-yellow-600/20 border-amber-400/40 hover:border-amber-400/70 hover:shadow-amber-500/20'
                          : 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-400/40 hover:border-purple-400/70 hover:shadow-purple-500/20'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="text-6xl mb-2 group-hover:scale-110 transition-transform flex items-center gap-3">
                          <span>♚</span>
                          <span className={`text-2xl ${isEnrolledInElite ? 'text-amber-400/60' : 'text-purple-400/60'}`}>vs</span>
                          <span>♔</span>
                        </div>
                        <h2 className={`text-3xl font-bold transition-colors ${
                          isEnrolledInElite
                            ? 'text-amber-300 group-hover:text-amber-200'
                            : 'text-purple-300 group-hover:text-purple-200'
                        }`}>
                          1v1 Duels
                        </h2>
                        <p className={`text-sm leading-relaxed ${isEnrolledInElite ? 'text-amber-300/80' : 'text-purple-300/80'}`}>
                          Compete 1v1 against strangers or invite friends to challenge them.
                          Stakes range from 0.01 ETH for Casual duels to 0.1 ETH for Elite showdowns.
                        </p>
                        <div className={`flex items-center gap-2 text-xs ${isEnrolledInElite ? 'text-amber-400' : 'text-purple-400'}`}>
                          <span className={`px-3 py-1 rounded-full ${isEnrolledInElite ? 'bg-amber-500/20' : 'bg-purple-500/20'}`}>2 Players</span>
                          <span className={`px-3 py-1 rounded-full ${isEnrolledInElite ? 'bg-amber-500/20' : 'bg-purple-500/20'}`}>Quick Matches</span>
                        </div>
                      </div>
                    </button>

                    {/* Tournaments Card */}
                    <button
                      onClick={() => setSelectedMode('tournaments')}
                      className={`backdrop-blur-lg rounded-2xl p-8 border-2 transition-all hover:shadow-xl cursor-pointer text-left group ${
                        isEnrolledInElite
                          ? 'bg-gradient-to-br from-amber-600/20 to-yellow-600/20 border-amber-400/40 hover:border-amber-400/70 hover:shadow-amber-500/20'
                          : 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-400/40 hover:border-purple-400/70 hover:shadow-purple-500/20'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="text-6xl mb-2 group-hover:scale-110 transition-transform">
                          🏆
                        </div>
                        <h2 className={`text-3xl font-bold transition-colors ${
                          isEnrolledInElite
                            ? 'text-amber-300 group-hover:text-amber-200'
                            : 'text-purple-300 group-hover:text-purple-200'
                        }`}>
                          Tournaments
                        </h2>
                        <p className={`text-sm leading-relaxed ${isEnrolledInElite ? 'text-amber-300/80' : 'text-purple-300/80'}`}>
                          Battle through brackets to claim victory. Compete against 4 players in elimination-style tournaments.
                          Entry fees range from 0.015 ETH to 0.15 ETH.
                        </p>
                        <div className={`flex items-center gap-2 text-xs ${isEnrolledInElite ? 'text-amber-400' : 'text-purple-400'}`}>
                          <span className={`px-3 py-1 rounded-full ${isEnrolledInElite ? 'bg-amber-500/20' : 'bg-purple-500/20'}`}>4 Players</span>
                          <span className={`px-3 py-1 rounded-full ${isEnrolledInElite ? 'bg-amber-500/20' : 'bg-purple-500/20'}`}>Bracket Style</span>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Tournament Cards Grid - Grouped by Tier (Lazy Loading) */}
                {!metadataLoading && Object.keys(tierMetadata).length > 0 && selectedMode && (
                  <div className="animate-[fadeInSlideUp_0.6s_ease-out]">
                    {/* Back to Mode Selection */}
                    <div className="mb-6 animate-[fadeIn_0.8s_ease-out]">
                      <button
                        onClick={() => setSelectedMode(null)}
                        className={`flex items-center gap-2 transition-all hover:translate-x-[-4px] ${
                          isEnrolledInElite
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-purple-400 hover:text-purple-300'
                        }`}
                      >
                        <span>←</span> Back to mode selection
                      </button>
                    </div>

                    {(selectedMode === 'duels' ? [0, 1, 2, 3] : [4, 5, 6, 7]).map((tierId, index) => {
                      const metadata = tierMetadata[tierId];
                      if (!metadata) return null;

                      const allInstances = tierInstances[tierId] || [];
                      const visibleCount = visibleInstancesCount[tierId] || 4;
                      const instances = allInstances.slice(0, visibleCount);
                      const hasMore = allInstances.length > visibleCount;
                      const isLoading = tierLoading[tierId];

                      // Calculate prize pool per tournament
                      const totalPrizePool = (parseFloat(metadata.entryFee) * metadata.playerCount * 0.9).toFixed(4);

                      const isElite = tierId === 3 || tierId === 7;

                      return (
                        <div
                          key={tierId}
                          className="mb-6 animate-[fadeInSlideUp_0.6s_ease-out]"
                          style={{ animationDelay: `${index * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}
                        >
                          <button
                            onClick={() => toggleTier(tierId)}
                            className={`w-full backdrop-blur-lg rounded-xl p-4 border transition-all cursor-pointer ${
                              isElite
                                ? 'bg-gradient-to-r from-amber-600/40 via-yellow-500/40 to-amber-600/40 border-amber-400/70 hover:border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.5),0_0_60px_rgba(251,191,36,0.3),inset_0_0_20px_rgba(251,191,36,0.1)] hover:shadow-[0_0_40px_rgba(251,191,36,0.7),0_0_80px_rgba(251,191,36,0.4),inset_0_0_30px_rgba(251,191,36,0.15)] animate-[pulse_3s_ease-in-out_infinite]'
                                : isEnrolledInElite
                                  ? 'bg-gradient-to-r from-[#fbbf24]/20 to-[#f59e0b]/20 border-[#d4a012]/40 hover:border-[#d4a012]/60'
                                  : 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-400/40 hover:border-purple-400/60'
                            }`}
                          >
                            <h3 className={`text-2xl font-bold flex items-center gap-2 flex-wrap ${
                              isElite
                                ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                                : isEnrolledInElite
                                  ? 'text-[#fff8e7]'
                                  : 'text-purple-400'
                            }`}>
                              ♚ {getTierName(metadata.playerCount, tierId)}
                              <span className={`text-sm font-normal ${
                                isElite ? 'text-amber-200/90' : isEnrolledInElite ? 'text-[#d4b866]' : 'text-purple-300'
                              }`}>• {metadata.playerCount} players total</span>
                              <span className={`text-sm font-normal ${
                                isElite ? 'text-amber-200/90' : isEnrolledInElite ? 'text-[#d4b866]' : 'text-purple-300'
                              }`}>• {metadata.entryFee} ETH entry</span>
                              <span className={`text-sm font-normal ${
                                isElite ? 'text-amber-200/90' : isEnrolledInElite ? 'text-[#d4b866]' : 'text-purple-300'
                              }`}>• {totalPrizePool} ETH prize pool</span>
                              <span className="ml-auto flex items-center gap-2">
                                <ChevronDown
                                  size={24}
                                  className={`transition-transform duration-200 ${expandedTiers[tierId] ? 'rotate-180' : ''}`}
                                />
                              </span>
                            </h3>
                          </button>

                          {expandedTiers[tierId] && (
                            <div className="mt-6">
                              {isLoading ? (
                                <div className="text-center py-8">
                                  <div className={`w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3 ${
                                    isElite
                                      ? 'border-amber-500/30 border-t-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                                      : isEnrolledInElite
                                        ? 'border-[#f59e0b]/30 border-t-[#fbbf24]'
                                        : 'border-purple-500/30 border-t-purple-500'
                                  }`}></div>
                                  <p className={`text-sm ${
                                    isElite
                                      ? 'text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                      : isEnrolledInElite
                                        ? 'text-[#d4b866]'
                                        : 'text-purple-300'
                                  }`}>Loading {getTierName(metadata.playerCount, tierId)} instances...</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                  {instances.map((tournament) => {
                                    const isEliteCard = tournament.tierId === 3 || tournament.tierId === 7;
                                    const eliteColors = isEliteCard ? {
                                      cardBg: 'from-amber-600/25 to-yellow-500/25',
                                      cardBorder: 'border-amber-400/50 hover:border-amber-400/70',
                                      cardShadow: 'hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]',
                                      icon: 'text-amber-400',
                                      text: 'text-amber-300',
                                      textMuted: 'text-amber-300/70',
                                      progress: 'from-amber-500 to-yellow-500',
                                      buttonEnter: 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600',
                                      fullBadgeBg: 'bg-red-500/20',
                                      fullBadgeBorder: 'border-red-400',
                                      fullBadgeText: 'text-red-300',
                                    } : undefined;

                                    return (
                                      <TournamentCard
                                        key={`${tournament.tierId}-${tournament.instanceId}`}
                                        tierId={tournament.tierId}
                                        instanceId={tournament.instanceId}
                                        maxPlayers={tournament.maxPlayers}
                                        currentEnrolled={tournament.enrolledCount}
                                        entryFee={tournament.entryFee}
                                        prizePool={tournament.prizePool}
                                        isEnrolled={tournament.isEnrolled}
                                        onEnroll={() => handleEnroll(tournament.tierId, tournament.instanceId, tournament.entryFee)}
                                        onEnter={() => handleEnterTournament(tournament.tierId, tournament.instanceId)}
                                        loading={tournamentsLoading}
                                        tierName={getTierName(tournament.maxPlayers, tournament.tierId)}
                                        enrollmentTimeout={tournament.enrollmentTimeout}
                                        hasStartedViaTimeout={tournament.hasStartedViaTimeout}
                                        tournamentStatus={tournament.tournamentStatus}
                                        onManualStart={handleManualStart}
                                        onClaimAbandonedPool={handleClaimAbandonedPool}
                                        onResetEnrollmentWindow={handleResetEnrollmentWindow}
                                        account={account}
                                        contract={contract}
                                        colors={eliteColors}
                                      />
                                    );
                                  })}
                                </div>
                              )}

                              {/* Show More Button */}
                              {!isLoading && hasMore && (
                                <div className="mt-6 text-center">
                                  <button
                                    onClick={() => showMoreInstances(tierId)}
                                    className={`bg-gradient-to-r text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 mx-auto ${
                                      isEnrolledInElite
                                        ? 'from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a012]'
                                        : 'from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                                    }`}
                                  >
                                    <ChevronDown size={20} />
                                    Show More ({allInstances.length - visibleCount} remaining)
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Connection Error State */}
                {!metadataLoading && connectionError && (
                  <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-lg rounded-2xl p-12 border border-red-400/30 text-center">
                    <AlertCircle className="text-red-400 mx-auto mb-4" size={64} />
                    <h3 className="text-2xl font-bold text-red-300 mb-2">Connection Error</h3>
                    <p className="text-red-200/70 mb-4">{connectionError}</p>
                    <button
                      onClick={() => {
                        setMetadataLoading(true);
                        setConnectionError(null);
                        fetchTierMetadata();
                        fetchLeaderboard();
                      }}
                      className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-2 px-6 rounded-xl transition-all"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}

                {/* User Info Footer - Only show when wallet is connected */}
                {account && (
                  <div className="mt-8 flex justify-center gap-4">
                    <div className="bg-purple-500/20 border border-purple-400/50 rounded-xl p-4">
                      <div className="text-purple-300 text-sm mb-1">Your Address</div>
                      <div className="font-mono text-purple-100 font-bold">{account.slice(0, 6)}...{account.slice(-4)}</div>
                    </div>
                    <div className="bg-blue-500/20 border border-blue-400/50 rounded-xl p-4">
                      <div className="text-blue-300 text-sm mb-1">Network</div>
                      <div className="font-bold text-blue-100">{networkInfo?.name || 'Connected'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Winners Leaderboard Section */}
      <div className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <WinnersLeaderboard
          leaderboard={leaderboard}
          loading={leaderboardLoading}
          error={leaderboardError}
          currentAccount={account}
          onRetry={() => fetchLeaderboard()}
          onRefresh={() => fetchLeaderboard()}
        />
      </div>

      {/* User Manual Section */}
      <div id="user-manual" className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <UserManual
          contractInstance={contract}
          tierConfigurations={Object.entries(TIER_CONFIG).map(([tierId, config]) => ({
            tierId: Number(tierId),
            playerCount: config.playerCount,
            instanceCount: config.instanceCount,
            entryFee: config.entryFee,
            matchTimePerPlayer: config.timeouts.matchTimePerPlayer,
            timeIncrementPerMove: config.timeouts.timeIncrementPerMove,
            matchLevel2Delay: config.timeouts.matchLevel2Delay,
            matchLevel3Delay: config.timeouts.matchLevel3Delay,
            enrollmentWindow: config.timeouts.enrollmentWindow,
            enrollmentLevel2Delay: config.timeouts.enrollmentLevel2Delay
          }))}
          raffleThresholds={['0.005', '0.02', '0.05', '3']}
          isElite={isEnrolledInElite}
          gameSpecificContent={
            <div>
              <h2 id="chess-specifics" className={`text-2xl font-bold ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-purple-200'} mb-6 scroll-mt-24`}>Chess Specifics</h2>

              {/* Chess Rules Implementation */}
              <div className="mb-8">
                <h3 className={`text-lg font-semibold ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-purple-100'} mb-3`}>What chess rules are supported?</h3>
                <div className="space-y-3 text-gray-300">
                  <p>ETour Chess implements the core competitive chess ruleset including:</p>
                  <ul className="space-y-1 ml-4">
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span>Standard piece movement and capture rules</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span>Castling (both kingside and queenside)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span>En passant captures</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span>Pawn promotion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span>Check and checkmate detection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span>Stalemate detection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span>Insufficient material draws (e.g., King vs King scenarios)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span><strong>50-move rule</strong>: Games automatically draw after 50 moves without a pawn move or capture</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span><strong>Threefold repetition rule</strong>: Games automatically draw upon position repetition</span>
                    </li>
                  </ul>
                </div>
              </div>

              <hr className={isEnrolledInElite ? 'border-[#d4a012]/20' : 'border-purple-400/20'} style={{ marginBottom: '2rem' }} />

              {/* Elite Tier Pricing Structure */}
              <div className="mb-8">
                <h3 id="elite-matches" className={`text-lg font-semibold ${isEnrolledInElite ? 'text-[#fff8e7]' : 'text-purple-100'} mb-3 scroll-mt-24`}>Why are Elite tiers so expensive?</h3>
                <div className="space-y-3 text-gray-300">
                  <p>
                    Elite tiers are high-stakes to serves a specific purpose. Elite chess on ETour isn't just another tournament level. It's as an exclusive club for serious chess competitors.
                  </p>
                  <p className="font-semibold text-gray-200">Here's what makes Elite tiers special:</p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span><strong>Permanent Legacy</strong>: Every Elite finals is stored permanently on-chain. Winners and their games become part of ETour's permanent record.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span><strong>High Stakes / High Rewards</strong>: The dramatic entry fee increase creates genuine high-stakes competition with proportional rewards.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span><strong>Exclusive Status</strong>: The price barrier ensures only the most confident players participate, creating a prestigious competitive environment.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={isEnrolledInElite ? 'text-[#fbbf24]' : 'text-purple-400'}>•</span>
                      <span><strong>Bragging Rights</strong>: Elite tier victories carry significant bragging rights due to the skill and financial commitment required to participate.</span>
                    </li>
                  </ul>
                  <div className={`${isEnrolledInElite ? 'bg-[#fbbf24]/20 border-[#d4a012]/40' : 'bg-purple-500/20 border-purple-400/40'} border rounded-lg p-3`}>
                    <p className={isEnrolledInElite ? 'text-[#fff8e7]' : 'text-purple-100'}>
                      This isn't a gradual progression, it's an intentional leap into elite territory where every victory is immortalized on chain.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          }
        />
      </div>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-slate-800/50 px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">

          {/* Main Footer Content */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">

            {/* Left: Tech Credit */}
            <div className="text-center md:text-left">
              <p className="text-slate-500 text-sm mb-2">
                Powered by{' '}
                <span
                  className="font-semibold bg-clip-text text-transparent"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text' }}
                >
                  ETour Protocol
                </span>
              </p>
              <p className="text-slate-600 text-xs">
                Open-source perpetual tournament infrastructure on Arbitrum
              </p>
            </div>

            {/* Right: Links */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setContractsExpanded(!contractsExpanded)}
                className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                Contracts {contractsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <a
                href="https://reclaimweb3.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-white transition-colors text-sm"
              >
                RW3 Manifesto
              </a>
            </div>

          </div>

          {/* Expandable Contracts Table */}
          {contractsExpanded && (
            <div className="mb-8 overflow-x-auto">
              <table className="w-full border-collapse bg-slate-900/60 rounded-lg">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-cyan-300 font-semibold">ETour Modules</th>
                    <th className="text-left p-4 text-cyan-300 font-semibold">Game Contracts</th>
                    <th className="text-left p-4 text-cyan-300 font-semibold">Game Modules</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-4 align-top">
                      <div className="space-y-2">
                        <a
                          href={`https://arbiscan.io/address/${MODULE_ADDRESSES.core}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Core.sol
                        </a>
                        <a
                          href={`https://arbiscan.io/address/${MODULE_ADDRESSES.matches}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Matches.sol
                        </a>
                        <a
                          href={`https://arbiscan.io/address/${MODULE_ADDRESSES.prizes}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Prizes.sol
                        </a>
                        <a
                          href={`https://arbiscan.io/address/${MODULE_ADDRESSES.raffle}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Raffle.sol
                        </a>
                        <a
                          href={`https://arbiscan.io/address/${MODULE_ADDRESSES.escalation}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Escalation.sol
                        </a>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="space-y-2">
                        <a
                          href={`https://arbiscan.io/address/${TicTacChainABIData.address}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          TicTacChain.sol
                        </a>
                        <a
                          href={`https://arbiscan.io/address/${ChessABIData.address}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ChessOnChain.sol
                        </a>
                        <a
                          href={`https://arbiscan.io/address/${ConnectFourABIData.address}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ConnectFourOnChain.sol
                        </a>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="space-y-2">
                        <a
                          href={`https://arbiscan.io/address/${MODULE_ADDRESSES.chessRules}#code`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ChessRules.sol
                        </a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Line */}
          <div className="text-center pt-8 border-t border-slate-800/30">
            <p className="text-slate-600 text-xs">
              No company needed. No trust required. No servers to shutdown.
            </p>
          </div>

        </div>
      </footer>

      {/* CSS Animations & Custom Styles */}
      <style>{`
        /* Smooth scrolling for anchor links */
        html {
          scroll-behavior: smooth;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        /* Custom scrollbar for game log */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }

        /* Smooth transitions for all interactive elements */
        button, .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }

        /* Enhanced glow effects */
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
          }
        }

        /* Grid cell hover glow */
        button:hover:not(:disabled) {
          box-shadow: 0 0 20px currentColor;
        }

        /* Particle styles */
        .particle {
          font-size: 16px;
        }

        /* Mobile particle adjustments */
        @media (max-width: 768px) {
          .particle {
            font-size: 12px;
          }
        }

        /* Particle animation for Dream theme - Desktop */
        @keyframes particle-float {
          0% {
            transform: translateY(100vh) translateX(0);
            opacity: 0.3;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(calc(-100vh - 100px)) translateX(100px);
            opacity: 0;
          }
        }

        /* Mobile particle animation with lower opacity */
        @media (max-width: 768px) {
          @keyframes particle-float {
            0% {
              transform: translateY(100vh) translateX(0);
              opacity: 0.2;
            }
            10% {
              opacity: 0.3;
            }
            90% {
              opacity: 0.7;
            }
            100% {
              transform: translateY(calc(-100vh - 100px)) translateX(100px);
              opacity: 0;
            }
          }
        }

        /* Mobile text size reduction - reduce all text by 4 points */
        @media (max-width: 768px) {
          body {
            font-size: 12px;
          }

          h1 {
            font-size: calc(1em - 4px);
          }

          h2 {
            font-size: calc(1em - 4px);
          }

          h3 {
            font-size: calc(1em - 4px);
          }

          h4 {
            font-size: calc(1em - 4px);
          }

          p, span, div, button, a {
            font-size: inherit;
          }

          .text-xs {
            font-size: 0.5rem !important; /* 8px instead of 12px */
          }

          .text-sm {
            font-size: 0.625rem !important; /* 10px instead of 14px */
          }

          .text-base {
            font-size: 0.75rem !important; /* 12px instead of 16px */
          }

          .text-lg {
            font-size: 0.875rem !important; /* 14px instead of 18px */
          }

          .text-xl {
            font-size: 1rem !important; /* 16px instead of 20px */
          }

          .text-2xl {
            font-size: 1.25rem !important; /* 20px instead of 24px */
          }

          .text-3xl {
            font-size: 1.625rem !important; /* 26px instead of 30px */
          }

          .text-4xl {
            font-size: 1.875rem !important; /* 30px instead of 36px */
          }

          .text-5xl {
            font-size: 2.375rem !important; /* 38px instead of 48px */
          }

          .text-6xl {
            font-size: 2.875rem !important; /* 46px instead of 60px */
          }
        }
      `}</style>

      {/* Match End Modal */}
      <MatchEndModal
        result={matchEndResult?.result || matchEndResult}
        completionReason={matchEndResult?.completionReason}
        onClose={handleMatchEndModalClose}
        winnerLabel={matchEndWinnerLabel}
        winnerAddress={matchEndWinner}
        loserAddress={matchEndLoser}
        currentAccount={account}
        gameType="chess"
        isVisible={!!matchEndResult}
        roundNumber={currentMatch?.roundNumber}
        totalRounds={currentMatch?.playerCount ? Math.ceil(Math.log2(currentMatch.playerCount)) : undefined}
        prizePool={currentMatch?.prizePool}
      />

    </div>
  );
}
