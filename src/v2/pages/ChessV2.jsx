import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Grid,
  Clock,
  Shield,
  Lock,
  Eye,
  Code,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader,
  Plus,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { ethers } from 'ethers';
import { CURRENT_NETWORK, getAddressUrl } from '../../config/networks';
import { shortenAddress } from '../../utils/formatters';
import { generateV2TournamentUrl, parseV2ContractParam } from '../../utils/urlHelpers';
import { shouldResetOnInitialDocumentLoad } from '../../utils/navigation';
import { isDraw } from '../../utils/completionReasons';
import { validateMoveWithReason } from '../../utils/chessValidator';
import { didMatchStateAdvance, waitForTxOrStateSync } from '../../utils/txSync';
import ParticleBackground from '../../components/shared/ParticleBackground';
import MatchCard from '../../components/shared/MatchCard';
import UserManualV2 from '../components/UserManualV2';
import MatchEndModal from '../../components/shared/MatchEndModal';
import ActiveMatchAlertModal from '../../components/shared/ActiveMatchAlertModal';
import GameMatchLayout from '../../components/shared/GameMatchLayout';
import TournamentHeader from '../../components/shared/TournamentHeader';
import PlayerActivity from '../../components/shared/PlayerActivity';
import RecentMatchesCard from '../../components/shared/RecentMatchesCard';
import GamesCard from '../../components/shared/GamesCard';
import BracketScrollHint from '../../components/shared/BracketScrollHint';
import RecentInstanceCard from '../../components/shared/RecentInstanceCard';
import CapturedPieces from '../../components/shared/CapturedPieces';
import V2GameLobbyIntro from '../../components/shared/V2GameLobbyIntro';
import WalletBrowserPrompt from '../../components/WalletBrowserPrompt';
import { useInitialDocumentScrollTop } from '../../hooks/useInitialDocumentScrollTop';
import { useWalletBrowserPrompt } from '../../hooks/useWalletBrowserPrompt';
import { isMobileDevice, isWalletBrowser } from '../../utils/mobileDetection';
import { useChessV2PlayerActivity } from '../hooks/useChessV2PlayerActivity';
import { useChessPlayerProfile } from '../hooks/useChessPlayerProfile';
import { useChessV2MatchHistory } from '../hooks/useChessV2MatchHistory';
import {
  PLAYER_COUNT_OPTIONS,
  TIME_PER_PLAYER_OPTIONS,
  TIME_INCREMENT_OPTIONS,
  ENROLLMENT_WINDOW_OPTIONS,
  CHESS_V2_FACTORY_ADDRESS,
  CHESS_V2_FACTORY_ADDRESS_CANDIDATES,
  CHESS_V2_IMPLEMENTATION_ADDRESS,
  formatEth,
  getDefaultTimeouts,
  getFactoryContract,
  getReadableError,
  getInstanceContract,
  getRoundLabel,
  getTournamentTypeLabel,
  normalizeInstanceSnapshot,
  normalizeMatch,
  resolveCreatedInstanceAddress,
  unpackBoard,
} from '../lib/chess';

const CHESS_PIECES = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
const VIRTUAL_TIER_ID = 0;
const VIRTUAL_INSTANCE_ID = 0;
const TARGET_CHAIN_ID_HEX = `0x${CURRENT_NETWORK.chainId.toString(16)}`;
const DEFAULT_MATCH_LOADING_MESSAGE = 'Loading match...';

const DEFAULT_CREATE_FORM = {
  playerCount: 2,
  entryFee: '0.001',
  ...getDefaultTimeouts(2),
};

const currentTheme = {
  primary: 'rgba(0, 255, 255, 0.5)',
  secondary: 'rgba(255, 0, 255, 0.5)',
  gradient: 'linear-gradient(135deg, #05000f 0%, #130028 50%, #090013 100%)',
  border: 'rgba(0, 255, 255, 0.3)',
  particleColors: ['#00ffff', '#ff00ff'],
  heroGlow: 'from-blue-500 via-cyan-500 to-blue-500',
  heroTitle: 'from-blue-400 via-cyan-400 to-blue-400',
  heroText: 'text-blue-200',
  heroSubtext: 'text-blue-300',
  buttonGradient: 'from-purple-600 to-fuchsia-600',
  buttonHover: 'hover:from-purple-700 hover:to-fuchsia-700',
  connectButtonGradient: 'from-purple-600 to-fuchsia-600',
  connectButtonHover: 'hover:from-purple-700 hover:to-fuchsia-700',
  connectCtaClassName: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl shadow-2xl border-2 border-purple-400/60 hover:scale-105 hover:from-purple-700 hover:to-fuchsia-700',
};

const PIECE_SVGS = {
  white: { pawn: 'pawn-w', knight: 'knight-w', bishop: 'bishop-w', rook: 'rook-w', queen: 'queen-w', king: 'king-w' },
  black: { pawn: 'pawn-b', knight: 'knight-b', bishop: 'bishop-b', rook: 'rook-b', queen: 'queen-b', king: 'king-b' },
};
const PIECE_TYPES = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

function isWalletAvailable() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

const getPieceSvg = (piece) => {
  if (!piece) return '';
  const pieceType = Number(piece.pieceType);
  const pieceColor = Number(piece.color);
  if (pieceType === 0) return '';
  const color = pieceColor === 1 ? 'white' : 'black';
  const svgName = PIECE_SVGS[color][PIECE_TYPES[pieceType]];
  return svgName ? `/chess-pieces/${svgName}.svg` : '';
};

function ActionMessage({ type = 'info', message }) {
  if (!message) return null;
  const styles = {
    info: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    error: 'bg-red-500/15 border-red-400/30 text-red-200',
    success: 'bg-green-500/15 border-green-400/30 text-green-200',
  };
  const icon = type === 'success'
    ? <CheckCircle size={16} className="mt-0.5 shrink-0" />
    : type === 'error'
      ? <AlertCircle size={16} className="mt-0.5 shrink-0" />
      : <Loader size={16} className="mt-0.5 shrink-0 animate-spin" />;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[type] || styles.info}`}>
      <div className="flex items-start gap-3">
        {icon}
        <span>{message}</span>
      </div>
    </div>
  );
}

const ChessBoard = ({ board, onMove, currentTurn, account, player1, player2, firstPlayer, matchStatus, loading, whiteInCheck, blackInCheck, lastMoveTime, startTime, lastMove, maxSize = 520, ghostMove }) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [boardSize, setBoardSize] = useState(null);
  const containerRef = useRef(null);
  const zeroAddress = ethers.ZeroAddress;
  const whitePlayer = (firstPlayer && firstPlayer.toLowerCase() !== zeroAddress.toLowerCase()) ? firstPlayer : player1;
  const isWhite = account && whitePlayer?.toLowerCase() === account.toLowerCase();
  const isMyTurn = account && currentTurn?.toLowerCase() === account.toLowerCase();
  const shouldFlip = isWhite;

  useEffect(() => {
    const updateSize = () => {
      const vh60 = window.innerHeight * 0.60;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      setBoardSize(Math.min(vh60, containerWidth, maxSize));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [maxSize]);

  const getActualIndex = (displayIdx) => {
    const displayRow = Math.floor(displayIdx / 8);
    const displayCol = displayIdx % 8;
    if (shouldFlip) return (7 - displayRow) * 8 + displayCol;
    return displayRow * 8 + (7 - displayCol);
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
    return isWhite ? pieceColor === 1 : pieceColor === 2;
  };

  const handleSquareClick = (displayIdx) => {
    if (matchStatus !== 1 || !isMyTurn || loading || !onMove) return;
    const actualIdx = getActualIndex(displayIdx);
    const piece = board[actualIdx];
    if (selectedSquare === null) {
      if (isMyPiece(piece)) setSelectedSquare(displayIdx);
      return;
    }
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
  };

  const handlePromotion = (pieceType) => {
    if (pendingMove) {
      onMove?.(pendingMove.from, pendingMove.to, pieceType);
      setPromotionSquare(null);
      setPendingMove(null);
      setSelectedSquare(null);
    }
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
      const isMyMove = lastMove?.isMyMove;
      const pieceType = piece ? Number(piece.pieceType) : 0;
      const pieceColor = piece ? Number(piece.color) : 0;
      const isKingInCheck = pieceType === 6 && ((pieceColor === 1 && whiteInCheck) || (pieceColor === 2 && blackInCheck));
      const isGhostFrom = ghostMove && ghostMove.from === actualIdx;
      const isGhostTo = ghostMove && ghostMove.to === actualIdx;
      const ghostPiece = ghostMove && board[ghostMove.from] ? board[ghostMove.from] : null;
      const displayRow = Math.floor(displayIdx / 8);
      const displayCol = displayIdx % 8;
      const showRankLabel = displayCol === 0;
      const showFileLabel = displayRow === 7;
      const actualRow = Math.floor(actualIdx / 8);
      const actualCol = actualIdx % 8;
      const rankLabel = actualRow + 1;
      const fileLabel = String.fromCharCode(97 + actualCol);

      const getLastMoveFromClass = () => !isLastMoveFrom || isSelected || isKingInCheck ? '' : (isMyMove ? 'ring-2 ring-purple-400 ring-inset' : 'ring-2 ring-yellow-400 ring-inset');
      const getLastMoveToClass = () => !isLastMoveTo || isSelected || isKingInCheck ? '' : (isMyMove ? 'ring-2 ring-blue-400 ring-inset' : 'ring-2 ring-red-400 ring-inset');
      const getLastMoveFromBg = () => !isLastMoveFrom || isSelected || isKingInCheck ? undefined : (isMyMove ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.5), rgba(147, 51, 234, 0.5))' : 'linear-gradient(135deg, rgba(234, 179, 8, 0.5), rgba(202, 138, 4, 0.5))');
      const getLastMoveToBg = () => !isLastMoveTo || isSelected || isKingInCheck ? undefined : (isMyMove ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(29, 78, 216, 0.5))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.5), rgba(220, 38, 38, 0.5))');
      const getLastMoveShadow = () => {
        if (isSelected) return '0 0 20px rgba(6, 182, 212, 0.3)';
        if (isLastMoveTo && !isKingInCheck) return isMyMove ? 'inset 0 0 25px rgba(59, 130, 246, 0.6), 0 0 15px rgba(59, 130, 246, 0.4)' : 'inset 0 0 25px rgba(239, 68, 68, 0.6), 0 0 15px rgba(239, 68, 68, 0.4)';
        if (isLastMoveFrom && !isKingInCheck) return isMyMove ? 'inset 0 0 20px rgba(168, 85, 247, 0.5), 0 0 12px rgba(168, 85, 247, 0.3)' : 'inset 0 0 20px rgba(234, 179, 8, 0.5), 0 0 12px rgba(234, 179, 8, 0.3)';
        return 'none';
      };
      const getPieceGlow = () => !isLastMoveTo || pieceType === 0 ? undefined : (isMyMove ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))' : 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))');
      const isPotentialTarget = selectedSquare !== null && !isSelected && !isMyPiece(piece);
      const squareBg = isSelected ? undefined : (isKingInCheck ? undefined : (getLastMoveFromBg() || getLastMoveToBg()));
      const ghostFromClass = isGhostFrom ? ' ring-2 ring-orange-400/60 ring-inset' : '';
      const ghostToClass = isGhostTo ? ' ring-2 ring-orange-400 ring-inset' : '';

      squares.push(
        <div
          key={displayIdx}
          onClick={() => handleSquareClick(displayIdx)}
          className={`relative flex items-center justify-center cursor-pointer transition-all duration-200 ${isLight ? 'bg-stone-300' : 'bg-stone-700'}${isSelected ? ' ring-2 ring-emerald-400 ring-inset bg-emerald-500/50' : ''}${isKingInCheck ? ' bg-red-500/50 ring-2 ring-red-400 ring-inset' : ''} ${getLastMoveFromClass()} ${getLastMoveToClass()}${ghostFromClass}${ghostToClass}${isMyTurn && isMyPiece(piece) && !isSelected ? ' hover:bg-emerald-500/30' : ''}${isMyTurn && isPotentialTarget ? ' hover:bg-yellow-400/40' : ''}`}
          style={{ boxShadow: isSelected ? 'inset 0 0 20px rgba(16, 185, 129, 0.5)' : getLastMoveShadow(), background: isGhostTo ? 'rgba(251, 146, 60, 0.25)' : squareBg }}
        >
          {getPieceSvg(piece) && <img src={getPieceSvg(piece)} alt="" className={`w-3/4 h-3/4 select-none transition-all duration-300 ${isSelected ? 'scale-110' : ''}${isGhostFrom ? ' opacity-30' : ''}`} style={{ filter: getPieceGlow() }} draggable="false" />}
          {isGhostTo && ghostPiece && getPieceSvg(ghostPiece) && <img src={getPieceSvg(ghostPiece)} alt="" className="w-3/4 h-3/4 select-none absolute animate-pulse" style={{ opacity: 0.4 }} draggable="false" />}
          {showRankLabel && <span className={`absolute left-1 top-0.5 text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>{rankLabel}</span>}
          {showFileLabel && <span className={`absolute right-1 bottom-0.5 text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>{fileLabel}</span>}
        </div>
      );
    }
    return squares;
  };

  return (
    <div className="relative flex flex-col items-center">
      <div ref={containerRef} className="w-full flex justify-center">
        <div className="relative rounded-xl overflow-hidden" style={{ width: boardSize || 400, height: boardSize || 400, minWidth: 280, minHeight: 280, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <div className="grid gap-0 w-full h-full" style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}>{renderBoard()}</div>
        </div>
      </div>
      {promotionSquare !== null && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))', border: '1px solid rgba(168, 85, 247, 0.4)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.2)' }}>
            <h3 className="text-slate-100 font-bold text-lg mb-4 text-center">Promote Pawn</h3>
            <div className="flex gap-3">
              {[5, 4, 3, 2].map((pt) => (
                <button key={pt} onClick={() => handlePromotion(pt)} className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ background: 'rgba(51, 65, 85, 0.6)', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
                  <img src={`/chess-pieces/${PIECE_TYPES[pt]}-${isWhite ? 'w' : 'b'}.svg`} alt={PIECE_TYPES[pt]} className="w-full h-full" draggable="false" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {(whiteInCheck || blackInCheck) && matchStatus === 1 && (
        <div className="mt-3 text-center py-2 px-6 rounded-full text-red-300 font-semibold text-sm animate-pulse" style={{ ...(boardSize ? { width: boardSize } : { maxWidth: '100%' }), background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
          {whiteInCheck ? 'White' : 'Black'} King in Check
        </div>
      )}
    </div>
  );
};

function calculateCapturedPieces(board) {
  if (!board || board.length !== 64) return { white: [], black: [] };
  const startingPieces = { 1: 8, 2: 2, 3: 2, 4: 2, 5: 1, 6: 1 };
  const whitePieces = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const blackPieces = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  board.forEach((square) => {
    if (square.pieceType > 0) {
      if (square.color === 1) whitePieces[square.pieceType]++;
      else if (square.color === 2) blackPieces[square.pieceType]++;
    }
  });
  const whiteCaptured = [];
  const blackCaptured = [];
  for (let pieceType = 1; pieceType <= 6; pieceType++) {
    const whiteLost = startingPieces[pieceType] - whitePieces[pieceType];
    const blackLost = startingPieces[pieceType] - blackPieces[pieceType];
    for (let i = 0; i < whiteLost; i++) whiteCaptured.push(pieceType);
    for (let i = 0; i < blackLost; i++) blackCaptured.push(pieceType);
  }
  return { white: whiteCaptured, black: blackCaptured };
}

const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onResetEnrollmentWindow, onEnroll, onConnectWallet, account, loading, connectLoading, syncDots, isEnrolled, entryFee, isFull, instanceContract }) => {
  const { status, currentRound, enrolledCount, rounds, playerCount, players, enrollmentTimeout } = tournamentData;
  const bracketViewRef = useRef(null);
  const prevStatusRef = useRef(status);
  const totalRounds = Math.ceil(Math.log2(playerCount));
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);
  const ENROLLMENT_DURATION = 60;
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownExpired, setCountdownExpired] = useState(false);
  const firstEnrollmentTime = tournamentData.firstEnrollmentTime || 0;
  const countdownActive = tournamentData.countdownActive || false;

  useEffect(() => {
    if (prevStatusRef.current === 0 && status === 1 && isEnrolled && bracketViewRef.current) {
      const timer = setTimeout(() => bracketViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' }), 300);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status, isEnrolled]);

  useEffect(() => {
    if (!countdownActive || !firstEnrollmentTime || status !== 0) {
      setTimeRemaining(0);
      setCountdownExpired(false);
      return;
    }
    const update = () => {
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
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [countdownActive, firstEnrollmentTime, status]);

  const hasValidRounds = rounds && rounds.length > 0 && rounds.some(round => round.matches && round.matches.length > 0 && round.matches.some(match => match.player1 && match.player1 !== ethers.ZeroAddress));
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  return (
    <div className="mb-16">
      <TournamentHeader
        gameType="chess"
        tierId={VIRTUAL_TIER_ID}
        instanceId={VIRTUAL_INSTANCE_ID}
        instanceAddress={tournamentData.address}
        shareUrlOverride={tournamentData.address ? generateV2TournamentUrl('chess', tournamentData.address) : undefined}
        status={status}
        currentRound={currentRound}
        playerCount={playerCount}
        enrolledCount={enrolledCount}
        prizePool={tournamentData.prizePoolWei || 0n}
        enrolledPlayers={players || []}
        winner={tournamentData.winner}
        completionReason={tournamentData.completionReason}
        totalEntryFeesAccrued={tournamentData.totalEntryFeesAccrued}
        prizeAwarded={tournamentData.prizeAwarded}
        prizeRecipient={tournamentData.prizeRecipient}
        raffleAwarded={tournamentData.raffleAwarded}
        raffleRecipient={tournamentData.raffleRecipient}
        syncDots={syncDots}
        account={account}
        onBack={onBack}
        isEnrolled={isEnrolled}
        isFull={isFull}
        entryFee={entryFee}
        onEnroll={onEnroll}
        onConnectWallet={onConnectWallet}
        loading={loading}
        connectLoading={connectLoading}
        connectButtonGradient={currentTheme.connectButtonGradient}
        connectButtonHover={currentTheme.connectButtonHover}
        renderCountdown={countdownActive && status === 0 ? () => (
          <div className="mt-4 bg-orange-500/20 border border-orange-400/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="text-orange-400" size={20} /><span className="text-orange-300 font-semibold">{countdownExpired ? 'Enrollment Countdown Expired' : 'Enrollment Time Remaining'}</span></div>
              <span className="text-orange-300 font-bold text-lg">{countdownExpired ? '0m 0s' : formatTime(timeRemaining)}</span>
            </div>
          </div>
        ) : null}
        enrollmentTimeout={enrollmentTimeout}
        onManualStart={onManualStart ? () => onManualStart(VIRTUAL_TIER_ID, VIRTUAL_INSTANCE_ID) : null}
        onClaimAbandonedPool={onClaimAbandonedPool ? () => onClaimAbandonedPool(VIRTUAL_TIER_ID, VIRTUAL_INSTANCE_ID) : null}
        onResetEnrollmentWindow={onResetEnrollmentWindow ? () => onResetEnrollmentWindow(VIRTUAL_TIER_ID, VIRTUAL_INSTANCE_ID) : null}
        contract={instanceContract}
      />
      <div ref={bracketViewRef} className="bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30">
        <h3 className="text-2xl font-bold text-purple-300 mb-3 flex items-center gap-2"><Grid size={24} />{tournamentTypeLabel} Bracket</h3>
        {hasValidRounds ? (
          <div className="space-y-8">
            {rounds.map((round, roundIdx) => (
              <div key={roundIdx}>
                <h4 className="text-xl font-bold text-purple-400 mb-4">
                  Round {roundIdx + 1}
                  {roundIdx === totalRounds - 1 && ' - Finals'}
                  {roundIdx === totalRounds - 2 && rounds.length > 1 && ' - Semi-Finals'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {round.matches.map((match, matchIdx) => (
                    <div key={matchIdx}>
                      <MatchCard
                        match={match}
                        matchIdx={matchIdx}
                        roundIdx={roundIdx}
                        tierId={VIRTUAL_TIER_ID}
                        instanceId={VIRTUAL_INSTANCE_ID}
                        account={account}
                        loading={loading}
                        onEnterMatch={onEnterMatch}
                        onForceEliminate={onForceEliminate}
                        onClaimReplacement={onClaimReplacement}
                        matchStatusOptions={{ doubleForfeitText: 'Eliminated - Double Forfeit' }}
                        showEscalation={true}
                        showThisIsYou={true}
                        gameName="chess"
                        isTournamentCompleted={status === 2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-left py-4"><div className="text-purple-300 text-lg">{status === 0 ? 'Brackets will be generated once the instance starts.' : 'No bracket data available.'}</div></div>
            {enrolledCount === 0 && <hr className="border-purple-500/20" />}
            {enrolledCount === 0 && (
              <div id="last-instance">
                <RecentInstanceCard tierId={VIRTUAL_TIER_ID} instanceId={VIRTUAL_INSTANCE_ID} contract={instanceContract} tierName={tournamentTypeLabel} walletAddress={account} />
              </div>
            )}
          </div>
        )}
      </div>
      <BracketScrollHint bracketRef={bracketViewRef} isUserEnrolled={isEnrolled} isTournamentInProgress={status === 1} />
    </div>
  );
};

function movesToPairs(movesString) {
  const moves = [];
  for (let i = 0; i < movesString.length - 1; i += 2) {
    const from = movesString.charCodeAt(i);
    const to = movesString.charCodeAt(i + 1);
    if (from >= 0 && from < 64 && to >= 0 && to < 64) moves.push({ from, to });
  }
  return moves;
}

function indexToChessNotation(index) {
  const row = Math.floor(index / 8);
  const col = index % 8;
  return `${String.fromCharCode(97 + col)}${row + 1}`;
}

export default function ChessV2() {
  useInitialDocumentScrollTop('/v2/chess');

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const rpcProviderRef = useRef(null);
  const tournamentBracketRef = useRef(null);
  const matchViewRef = useRef(null);
  const collapseActivityPanelRef = useRef(null);

  const [factoryAddress, setFactoryAddress] = useState(CHESS_V2_FACTORY_ADDRESS);
  const [browserProvider, setBrowserProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [rpcReady, setRpcReady] = useState(false);
  const [rpcProvider, setRpcProvider] = useState(null);
  const [, setWalletBootDone] = useState(!isWalletAvailable());
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractsExpanded, setContractsExpanded] = useState(false);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [factoryRules, setFactoryRules] = useState(null);
  const [implementationAddress, setImplementationAddress] = useState(CHESS_V2_IMPLEMENTATION_ADDRESS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolvedFactoryContract, setResolvedFactoryContract] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [actionState, setActionState] = useState({ type: 'info', message: '' });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const selectedAddress = searchParams.get('instance');
  const explorerUrl = getAddressUrl(factoryAddress);
  const [hasProcessedInviteParam, setHasProcessedInviteParam] = useState(false);
  const [allowInitialUrlHydration, setAllowInitialUrlHydration] = useState(() => !shouldResetOnInitialDocumentLoad('/v2/chess', { allowInviteParam: true }));
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [activeInstanceContract, setActiveInstanceContract] = useState(null);

  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchLoadingMessage, setMatchLoadingMessage] = useState(DEFAULT_MATCH_LOADING_MESSAGE);
  const [moveHistory, setMoveHistory] = useState([]);
  const [syncDots, setSyncDots] = useState(1);
  const [isSpectator, setIsSpectator] = useState(false);
  const [matchEndResult, setMatchEndResult] = useState(null);
  const [matchEndWinnerLabel, setMatchEndWinnerLabel] = useState('');
  const [matchEndWinner, setMatchEndWinner] = useState(null);
  const [matchEndLoser, setMatchEndLoser] = useState(null);
  const [nextActiveMatch, setNextActiveMatch] = useState(null);
  const [moveTxTimeout, setMoveTxTimeout] = useState(null);
  const [ghostMove, setGhostMove] = useState(null);

  const [leaderboard] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [alertMatch, setAlertMatch] = useState(null);
  const [gamesCardHeight, setGamesCardHeight] = useState(0);
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);

  const { showPrompt, handleWalletChoice, handleContinueChoice, triggerWalletPrompt } = useWalletBrowserPrompt();

  const playerActivity = useChessV2PlayerActivity(activeInstanceContract, account, resolvedFactoryContract, rpcProvider);
  const playerProfile = useChessPlayerProfile(resolvedFactoryContract, rpcProvider, account);
  const v2MatchHistory = useChessV2MatchHistory(resolvedFactoryContract, rpcProvider, account);

  const currentMatchRef = useRef(currentMatch);
  const accountRefForMatch = useRef(account);
  const skipNextPollRef = useRef(false);
  const doMatchSyncRef = useRef(null);
  const tournamentRef = useRef(viewingTournament);
  const activeInstanceContractRef = useRef(null);
  const previousBoardRef = useRef(null);
  const moveTxInProgressRef = useRef(false);
  const matchEndModalShownRef = useRef(false);
  const skipNavEffectRef = useRef(false);
  const isInitialNavRef = useRef(true);

  const getReadRunner = () => rpcProviderRef.current;

  const resolveFactoryContract = async () => {
    const runner = rpcProviderRef.current;
    if (!runner) throw new Error('RPC provider is not ready.');
    for (const candidateAddress of CHESS_V2_FACTORY_ADDRESS_CANDIDATES) {
      const code = await runner.getCode(candidateAddress);
      if (!code || code === '0x') continue;
      const contract = getFactoryContract(runner, candidateAddress);
      setFactoryAddress(candidateAddress);
      return contract;
    }
    throw new Error(`No Chess V2 factory found at ${CHESS_V2_FACTORY_ADDRESS_CANDIDATES.join(' or ')} on ${CURRENT_NETWORK.name}.`);
  };

  useEffect(() => {
    const provider = new ethers.JsonRpcProvider(CURRENT_NETWORK.rpcUrl);
    rpcProviderRef.current = provider;
    setRpcProvider(provider);
    setResolvedFactoryContract(getFactoryContract(provider, factoryAddress));
    setRpcReady(true);
  }, [factoryAddress]);

  useEffect(() => {
    if (!isWalletAvailable()) return undefined;
    const handleAccountsChanged = (accounts) => setAccount(accounts[0] || '');
    const handleChainChanged = async () => {
      if (!window.ethereum) return;
      setBrowserProvider(new ethers.BrowserProvider(window.ethereum));
    };
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!isWalletAvailable()) return;
    const bootWallet = async () => {
      setBrowserProvider(new ethers.BrowserProvider(window.ethereum));
      setWalletBootDone(true);
    };
    bootWallet().catch(() => setWalletBootDone(true));
  }, []);

  const ensureWalletOnCurrentNetwork = async (provider) => {
    const network = await provider.getNetwork();
    const currentChainId = `0x${BigInt(network.chainId).toString(16)}`;
    if (currentChainId === TARGET_CHAIN_ID_HEX) return;
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: TARGET_CHAIN_ID_HEX }] });
    } catch (switchError) {
      if (switchError?.code !== 4902) throw switchError;
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: TARGET_CHAIN_ID_HEX, chainName: CURRENT_NETWORK.name, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [CURRENT_NETWORK.rpcUrl] }],
      });
    }
  };

  useEffect(() => {
    if (!rpcReady && !browserProvider) return;
    let cancelled = false;
    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError('');
      try {
        const liveFactory = await resolveFactoryContract();
        const [minEntryFee, feeIncrement, implementation] = await Promise.all([
          liveFactory.MIN_ENTRY_FEE(),
          liveFactory.FEE_INCREMENT(),
          liveFactory.implementation(),
        ]);
        if (cancelled) return;
        setFactoryRules({ minEntryFee, feeIncrement });
        setImplementationAddress(implementation);
        setResolvedFactoryContract(liveFactory);
        setCreateForm(prev => ({ ...prev, entryFee: ethers.formatEther(minEntryFee) }));
        setLastUpdated(Date.now());
      } catch (error) {
        if (cancelled) return;
        setDashboardError(getReadableError(error, 'Failed to load Chess v2.'));
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, [rpcReady]);

  async function hydrateBracketMatch(instanceCont, userAccount, matchInfo) {
    const { roundNumber, matchNumber } = matchInfo;
    const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);

    const [matchData, fullMatch, boardResult, tierConfig] = await Promise.all([
      instanceCont.getMatch(roundNumber, matchNumber),
      instanceCont.matches(matchKey),
      instanceCont.getBoard(roundNumber, matchNumber).catch(() => [0n, 0n]),
      instanceCont.tierConfig(),
    ]);

    const packedBoard = Array.isArray(boardResult) ? boardResult[0] : boardResult.board;
    const packedState = Array.isArray(boardResult) ? boardResult[1] : boardResult.state;
    const board = unpackBoard(packedBoard);
    const tierMatchTime = Number(tierConfig.timeouts?.matchTimePerPlayer ?? tierConfig.matchTimePerPlayer ?? 600);
    const player1 = matchData.player1 || matchInfo.player1;
    const player2 = matchData.player2 || matchInfo.player2;
    const matchStatus = Number(matchData.status);
    const lastMoveTime = Number(matchData.lastMoveTime);
    const startTime = Number(matchData.startTime);
    const winner = matchData.matchWinner || matchData.winner;
    const completionReason = Number(matchData.completionReason ?? 0);
    const currentTurn = fullMatch.currentTurn;
    const firstPlayer = fullMatch.firstPlayer;
    const p1TimeRaw = Number(fullMatch.player1TimeRemaining ?? tierMatchTime);
    const p2TimeRaw = Number(fullMatch.player2TimeRemaining ?? tierMatchTime);
    const zeroAddress = ethers.ZeroAddress;

    let loser = zeroAddress;
    if (matchStatus === 2 && winner && winner.toLowerCase() !== zeroAddress.toLowerCase()) {
      loser = winner.toLowerCase() === player1.toLowerCase() ? player2 : player1;
    }

    const now = Math.floor(Date.now() / 1000);
    const elapsed = lastMoveTime > 0 ? now - lastMoveTime : 0;
    let player1TimeRemaining = p1TimeRaw;
    let player2TimeRemaining = p2TimeRaw;
    const isP1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
    if (matchStatus === 1 && currentTurn && elapsed > 0) {
      if (isP1Turn) player1TimeRemaining = Math.max(0, player1TimeRemaining - elapsed);
      else player2TimeRemaining = Math.max(0, player2TimeRemaining - elapsed);
    }

    let timeoutState = null;
    try {
      const timeoutData = await instanceCont.matchTimeouts(matchKey);
      const esc1Start = Number(timeoutData.escalation1Start);
      const esc2Start = Number(timeoutData.escalation2Start);
      if (esc1Start > 0 || esc2Start > 0 || timeoutData.isStalled) {
        timeoutState = {
          escalation1Start: esc1Start,
          escalation2Start: esc2Start,
          activeEscalation: Number(timeoutData.activeEscalation),
          timeoutActive: timeoutData.isStalled,
          forfeitAmount: 0,
        };
      }
    } catch {}

    if (matchStatus === 1 && currentTurn && lastMoveTime > 0) {
      const activePlayerTimeAtLastMove = isP1Turn ? p1TimeRaw : p2TimeRaw;
      const timeoutOccurredAt = lastMoveTime + activePlayerTimeAtLastMove;
      const hasClientDetectedTimeout = elapsed >= activePlayerTimeAtLastMove;
      if (hasClientDetectedTimeout && (!timeoutState || (timeoutState.timeoutActive && timeoutState.escalation1Start === 0 && timeoutState.escalation2Start === 0))) {
        const matchLevel2Delay = Number(tierConfig.timeouts?.matchLevel2Delay ?? tierConfig.matchLevel2Delay ?? 180);
        const matchLevel3Delay = Number(tierConfig.timeouts?.matchLevel3Delay ?? tierConfig.matchLevel3Delay ?? 360);
        timeoutState = {
          escalation1Start: timeoutOccurredAt + matchLevel2Delay,
          escalation2Start: timeoutOccurredAt + matchLevel3Delay,
          activeEscalation: timeoutState?.activeEscalation ?? 0,
          timeoutActive: true,
          forfeitAmount: timeoutState?.forfeitAmount ?? 0,
        };
      }
    }

    let escL2Available = false;
    let escL3Available = false;
    let isUserAdvancedForRound = false;
    try {
      escL2Available = await instanceCont.isMatchEscL2Available(roundNumber, matchNumber);
      escL3Available = await instanceCont.isMatchEscL3Available(roundNumber, matchNumber);
    } catch {}
    if (userAccount) {
      try {
        isUserAdvancedForRound = await instanceCont.isPlayerInAdvancedRound(roundNumber, userAccount);
      } catch {}
    }

    const packedStateBig = BigInt(packedState || 0);
    const whiteInCheck = ((packedStateBig >> 12n) & 1n) === 1n;
    const blackInCheck = ((packedStateBig >> 13n) & 1n) === 1n;
    const moves = movesToPairs(matchData.moves || fullMatch.moves || '');
    let lastMove = null;
    if (moves.length > 0) {
      const move = moves[moves.length - 1];
      lastMove = { from: move.from, to: move.to };
    }

    return {
      ...matchInfo,
      player1,
      player2,
      firstPlayer,
      currentTurn,
      winner,
      loser,
      board,
      packedBoard: BigInt(packedBoard || 0),
      packedState: BigInt(packedState || 0),
      matchStatus,
      status: matchStatus,
      completionReason,
      startTime,
      lastMoveTime,
      player1TimeRemaining,
      player2TimeRemaining,
      matchTimePerPlayer: tierMatchTime,
      timeoutState,
      escL2Available,
      escL3Available,
      isUserAdvancedForRound,
      whiteInCheck,
      blackInCheck,
      lastMove,
    };
  }

  const buildBracketData = async (address, instanceCont = null) => {
    const runner = getReadRunner();
    const instance = instanceCont || getInstanceContract(address, runner);
    const [info, tournament, players, , bracket, enrolled] = await Promise.all([
      instance.getInstanceInfo(),
      instance.tournament(),
      instance.getPlayers(),
      instance.getPrizeDistribution(),
      instance.getBracket(),
      account ? instance.isEnrolled(account) : Promise.resolve(false),
    ]);
    const totalRounds = Number(bracket.totalRounds);
    const rounds = await Promise.all(Array.from({ length: totalRounds }, async (_, roundIndex) => {
      const matchCount = Number(bracket.matchCounts[roundIndex] || 0);
      const matches = await Promise.all(Array.from({ length: matchCount }, async (_, matchIndex) => {
        const [matchData, boardResult] = await Promise.all([
          instance.getMatch(roundIndex, matchIndex),
          instance.getBoard(roundIndex, matchIndex),
        ]);
        const packedBoard = Array.isArray(boardResult) ? boardResult[0] : boardResult.board;
        const packedState = Array.isArray(boardResult) ? boardResult[1] : boardResult.state;
        const normalized = normalizeMatch(roundIndex, matchIndex, matchData, packedBoard, packedState);
        const hydrated = await hydrateBracketMatch(instance, account, normalized);
        return { ...hydrated, tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID };
      }));
      return { roundIndex, matchCount, completedCount: Number(bracket.completedCounts[roundIndex] || 0), label: getRoundLabel(roundIndex, totalRounds), matches };
    }));
    const snapshot = normalizeInstanceSnapshot(address, info, tournament, players, enrolled);
    let firstEnrollmentTime = 0;
    let countdownActive = false;
    try {
      const tournamentData = await instance.tournament();
      firstEnrollmentTime = Number(tournamentData.firstEnrollmentTime || 0);
      countdownActive = Boolean(tournamentData.countdownActive);
    } catch {}
    return { ...snapshot, rounds, firstEnrollmentTime, countdownActive, tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID };
  };

  const refreshTournamentBracket = useCallback(async (address) => {
    try { return await buildBracketData(address, getInstanceContract(address, getReadRunner())); } catch (error) { console.error('[ChessV2] Error refreshing tournament bracket:', error); return null; }
  }, [account]);

  const connectWallet = async () => {
    if (!isWalletAvailable()) {
      if (isMobileDevice() && !isWalletBrowser()) { triggerWalletPrompt(); return; }
      setActionState({ type: 'error', message: 'No injected wallet detected. Open this page in a wallet browser or install MetaMask.' });
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await ensureWalletOnCurrentNetwork(provider);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      setBrowserProvider(provider);
      setAccount(await signer.getAddress());
    } catch (error) {
      setActionState({ type: 'error', message: getReadableError(error, 'Wallet connection failed.') });
    } finally {
      setIsConnecting(false);
    }
  };

  const refreshDashboard = async () => {
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const liveFactory = await resolveFactoryContract();
      const [minEntryFee, feeIncrement, implementation] = await Promise.all([liveFactory.MIN_ENTRY_FEE(), liveFactory.FEE_INCREMENT(), liveFactory.implementation()]);
      setFactoryRules({ minEntryFee, feeIncrement });
      setImplementationAddress(implementation);
      setResolvedFactoryContract(liveFactory);
      setLastUpdated(Date.now());
    } catch (error) {
      setDashboardError(getReadableError(error, 'Refresh failed.'));
    } finally {
      setDashboardLoading(false);
    }
  };

  const clearSelectedInstance = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('instance');
    setSearchParams(next);
  };
  const updateCreateForm = (field, value) => setCreateForm(prev => ({ ...prev, [field]: value }));
  const setPlayerCount = (playerCount) => setCreateForm(prev => ({ ...prev, playerCount, ...getDefaultTimeouts(playerCount) }));

  const enterInstanceBracket = useCallback(async (address) => {
    if (!address) return;
    try {
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(address);
      if (bracketData) {
        const instance = getInstanceContract(address, getReadRunner());
        setActiveInstanceContract(instance);
        activeInstanceContractRef.current = instance;
        setViewingTournament(bracketData);
        skipNavEffectRef.current = true;
        navigate('/v2/chess', { replace: false, state: { view: 'bracket', instanceAddress: address, from: location.state?.view || 'landing' } });
        setTimeout(() => {
          tournamentBracketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          collapseActivityPanelRef.current?.();
        }, 100);
      }
    } catch (error) {
      console.error('[ChessV2] Error entering bracket:', error);
    } finally {
      setTournamentsLoading(false);
    }
  }, [refreshTournamentBracket, navigate, location.state?.view]);

  useEffect(() => {
    if (!allowInitialUrlHydration || !selectedAddress) return;
    enterInstanceBracket(selectedAddress);
  }, [allowInitialUrlHydration, selectedAddress, enterInstanceBracket]);

  useEffect(() => {
    if (!allowInitialUrlHydration) return;
    if (hasProcessedInviteParam || !rpcReady) return;
    const contractAddress = parseV2ContractParam(searchParams);
    if (!contractAddress) { setHasProcessedInviteParam(true); return; }
    setHasProcessedInviteParam(true);
    const next = new URLSearchParams(searchParams);
    next.delete('c');
    setSearchParams(next, { replace: true });
    enterInstanceBracket(contractAddress);
  }, [allowInitialUrlHydration, rpcReady, hasProcessedInviteParam, searchParams, setSearchParams, enterInstanceBracket]);

  useEffect(() => {
    if (allowInitialUrlHydration) return;

    isInitialNavRef.current = false;
    activeInstanceContractRef.current = null;
    setActiveInstanceContract(null);
    setViewingTournament(null);
    setCurrentMatch(null);
    setHasProcessedInviteParam(true);
    navigate('/v2/chess', { replace: true, state: null });
  }, [allowInitialUrlHydration, navigate]);

  useEffect(() => {
    if (allowInitialUrlHydration) return;
    if (location.pathname !== '/v2/chess' || location.search || location.state) return;
    setAllowInitialUrlHydration(true);
  }, [allowInitialUrlHydration, location.pathname, location.search, location.state]);

  const createInstance = async (event) => {
    event.preventDefault();
    if (!browserProvider || !account) { setActionState({ type: 'error', message: 'Connect a wallet before creating an instance.' }); return; }
    setCreateLoading(true);
    setActionState({ type: 'info', message: 'Submitting createInstance transaction...' });
    try {
      const signer = await browserProvider.getSigner();
      const creator = await signer.getAddress();
      const readFactory = await resolveFactoryContract();
      const writableFactory = getFactoryContract(signer, factoryAddress);
      const [countBeforeRaw, minFeeRaw, feeIncrementRaw, maxFeeRaw] = await Promise.all([
        readFactory.getInstanceCount(),
        readFactory.MIN_ENTRY_FEE(),
        readFactory.FEE_INCREMENT(),
        readFactory.maxEntryFee(),
      ]);
      const countBefore = Number(countBeforeRaw);
      const entryFeeWei = ethers.parseEther(createForm.entryFee);
      if (entryFeeWei < minFeeRaw) throw new Error(`Entry fee too low. Minimum is ${ethers.formatEther(minFeeRaw)} ETH.`);
      if (maxFeeRaw > 0n && entryFeeWei > maxFeeRaw) throw new Error(`Entry fee too high. Maximum is ${ethers.formatEther(maxFeeRaw)} ETH.`);
      if (feeIncrementRaw > 0n && entryFeeWei % feeIncrementRaw !== 0n) throw new Error(`Entry fee must be a multiple of ${ethers.formatEther(feeIncrementRaw)} ETH.`);
      const tx = await writableFactory.createInstance(Number(createForm.playerCount), entryFeeWei, BigInt(createForm.enrollmentWindow), BigInt(createForm.matchTimePerPlayer), BigInt(createForm.timeIncrementPerMove), { value: entryFeeWei });
      setActionState({ type: 'info', message: 'Transaction submitted. Waiting for block confirmation...' });
      const receipt = await tx.wait();
      setActionState({ type: 'info', message: 'Transaction confirmed. Locating the new instance and syncing tournament data...' });
      const address = await resolveCreatedInstanceAddress({ factory: await resolveFactoryContract(), provider: getReadRunner(), creator, playerCount: Number(createForm.playerCount), entryFeeWei, countBefore, receipt });
      if (!address) throw new Error('Transaction mined, but the frontend could not locate the created instance.');
      const createdInstance = getInstanceContract(address, getReadRunner());
      const creatorEnrolled = await createdInstance.isEnrolled(creator).catch(() => false);
      if (!creatorEnrolled) throw new Error(`Instance created at ${address}, but creator enrollment was not confirmed.`);
      setActionState({ type: 'success', message: `Instance created and enrollment verified on-chain at ${address}.` });
      await refreshDashboard();
      await enterInstanceBracket(address);
    } catch (error) {
      console.error('[ChessV2 createInstance] raw error:', error);
      setActionState({ type: 'error', message: getReadableError(error, 'Could not create instance.') });
    } finally {
      setCreateLoading(false);
    }
  };

  const withInstanceSigner = async (instanceContract) => {
    if (!browserProvider || !account) throw new Error('Connect a wallet first.');
    const signer = await browserProvider.getSigner();
    return getInstanceContract(instanceContract.target || instanceContract.address, signer);
  };

  const handleEnroll = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract) return;
    if (!account) { setActionState({ type: 'error', message: 'Please connect your wallet first.' }); return; }
    try {
      setTournamentsLoading(true);
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      const previousTournament = viewingTournament;
      setActionState({ type: 'info', message: 'Confirm your enrollment in MetaMask...' });
      const tx = await writableInstance.enrollInTournament({ value: viewingTournament.entryFeeWei });
      setActionState({ type: 'info', message: 'Enrollment submitted. Waiting for block confirmation...' });
      const syncResult = await waitForTxOrStateSync({
        tx,
        timeoutMs: 45_000,
        postReceiptSyncMs: 12_000,
        sync: async () => refreshTournamentBracket(previousTournament.address),
        isSynced: (updatedTournament) => {
          if (!updatedTournament) return false;
          const userEnrolled = updatedTournament.players?.some(
            (playerAddress) => playerAddress?.toLowerCase() === account.toLowerCase()
          );
          return userEnrolled || Number(updatedTournament.enrolledCount ?? 0) > Number(previousTournament.enrolledCount ?? 0);
        },
        onReceipt: () => {
          setActionState({ type: 'info', message: 'Enrollment confirmed. Syncing tournament lobby...' });
        },
      });
      const updated = syncResult.updated || await refreshTournamentBracket(previousTournament.address);
      if (updated) setViewingTournament(updated);
      setActionState({
        type: syncResult.synced ? 'success' : 'info',
        message: syncResult.synced
          ? 'Enrollment confirmed and reflected in the tournament lobby.'
          : 'Enrollment confirmed on-chain. The tournament lobby is still syncing and should update shortly.',
      });
    } catch (error) {
      console.error('[ChessV2] Enroll error:', error);
      setActionState({ type: 'error', message: getReadableError(error, 'Enrollment failed.') });
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

  const handleEnterTournamentFromActivity = useCallback((_tierId, instanceRef) => {
    const instanceAddress = (typeof instanceRef === 'string' && instanceRef.startsWith('0x'))
      ? instanceRef
      : viewingTournament?.address;
    if (instanceAddress) {
      enterInstanceBracket(instanceAddress);
    }
  }, [enterInstanceBracket, viewingTournament?.address]);

  const handleManualStart = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) { alert('Please connect your wallet first.'); return; }
    try {
      setTournamentsLoading(true);
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      const tournamentData = await activeInstanceContract.tournament();
      const enrolledCount = Number(tournamentData.enrolledCount);
      const status = Number(tournamentData.status);
      const enrollmentTimeout = tournamentData.enrollmentTimeout;
      const escalation1Start = Number(enrollmentTimeout.escalation1Start);
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const forfeitPool = enrollmentTimeout.forfeitPool;
      const now = Math.floor(Date.now() / 1000);
      const canStart1 = escalation1Start > 0 && now >= escalation1Start;
      const canStart2 = escalation2Start > 0 && now >= escalation2Start;
      if (status !== 0) { alert('Tournament has already started or completed.'); return; }
      if (!canStart1 && !canStart2) {
        const timeUntil = escalation1Start > 0 ? escalation1Start - now : 0;
        if (timeUntil > 0) alert(`Tournament cannot be force-started yet. Wait ${Math.floor(timeUntil / 60)}m ${timeUntil % 60}s.`);
        else alert('Tournament cannot be force-started at this time.');
        return;
      }
      if (enrolledCount < 1) { alert('No enrolled players.'); return; }
      const isEnrolled = await activeInstanceContract.isEnrolled(account);
      if (!isEnrolled) { alert('You must be enrolled to force-start.'); return; }
      const msg = enrolledCount === 1 ? `You are the only enrolled player. Force-starting will declare you the winner.${forfeitPool > 0n ? ` Plus ${ethers.formatEther(forfeitPool)} ETH forfeited fees.` : ''} Continue?` : `Force-starting with ${enrolledCount} players.${forfeitPool > 0n ? ` Forfeit pool of ${ethers.formatEther(forfeitPool)} ETH will be distributed.` : ''} Continue?`;
      if (!window.confirm(msg)) return;
      setActionState({ type: 'info', message: 'Confirm the force-start transaction in MetaMask...' });
      const tx = await writableInstance.forceStartTournament();
      setActionState({ type: 'info', message: 'Force-start submitted. Waiting for block confirmation...' });
      await tx.wait();
      setActionState({ type: 'info', message: 'Force-start confirmed. Refreshing tournament state...' });
      alert('Tournament force-started successfully!');
      if (enrolledCount === 1) { setViewingTournament(null); setCurrentMatch(null); }
      else {
        const updated = await refreshTournamentBracket(viewingTournament.address);
        if (updated) setViewingTournament(updated);
      }
      setActionState({ type: 'success', message: 'Tournament state refreshed after the force-start transaction.' });
    } catch (error) {
      console.error('[ChessV2] Force start error:', error);
      alert(`Error force-starting: ${getReadableError(error, 'Unknown error')}`);
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

  const handleResetEnrollmentWindow = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) { alert('Please connect your wallet first.'); return; }
    if (!window.confirm('Reset Enrollment Window\n\nThis will restart the enrollment period. Continue?')) return;
    try {
      setTournamentsLoading(true);
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      setActionState({ type: 'info', message: 'Confirm the enrollment reset in MetaMask...' });
      const tx = await writableInstance.resetEnrollmentWindow();
      setActionState({ type: 'info', message: 'Reset submitted. Waiting for block confirmation...' });
      await tx.wait();
      setActionState({ type: 'info', message: 'Reset confirmed. Refreshing tournament state...' });
      alert('Enrollment window reset successfully!');
      const updated = await refreshTournamentBracket(viewingTournament.address);
      if (updated) setViewingTournament(updated);
      setActionState({ type: 'success', message: 'Enrollment window reset and tournament state refreshed.' });
    } catch (error) {
      console.error('[ChessV2] Reset enrollment window error:', error);
      alert(`Failed: ${getReadableError(error, 'Unknown error')}`);
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

  const handleClaimAbandonedPool = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) { alert('Please connect your wallet first.'); return; }
    try {
      setTournamentsLoading(true);
      const tournamentData = await activeInstanceContract.tournament();
      const status = Number(tournamentData.status);
      const enrolledCount = Number(tournamentData.enrolledCount);
      const enrollmentTimeout = tournamentData.enrollmentTimeout;
      const forfeitPool = enrollmentTimeout.forfeitPool || 0n;
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const now = Math.floor(Date.now() / 1000);
      const canClaim = escalation2Start > 0 && now >= escalation2Start;
      if (status === 0) {
        if (!canClaim) { alert('Escalation 2 has not opened yet.'); return; }
        if (!window.confirm(`Claim abandoned pool? ${enrolledCount} enrolled player(s).${forfeitPool > 0n ? ` Plus ${ethers.formatEther(forfeitPool)} ETH.` : ''} The tournament will be terminated.`)) return;
      } else {
        if (forfeitPool <= 0n) { alert('No forfeited funds to claim.'); return; }
        if (!window.confirm(`Claim ${ethers.formatEther(forfeitPool)} ETH from abandoned pool?`)) return;
      }
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      setActionState({ type: 'info', message: 'Confirm the abandoned-pool claim in MetaMask...' });
      const tx = await writableInstance.claimAbandonedPool();
      setActionState({ type: 'info', message: 'Claim submitted. Waiting for block confirmation...' });
      await tx.wait();
      setActionState({ type: 'info', message: 'Claim confirmed. Refreshing tournament state...' });
      alert('Abandoned pool claimed successfully!');
      setViewingTournament(null);
      setCurrentMatch(null);
      setActionState({ type: 'success', message: 'Abandoned pool claim confirmed on-chain.' });
    } catch (error) {
      console.error('[ChessV2] Claim abandoned pool error:', error);
      alert(`Error: ${getReadableError(error, 'Unknown error')}`);
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account]);

  const handleBackToTournaments = async () => {
    setViewingTournament(null);
    setCurrentMatch(null);
    setActiveInstanceContract(null);
    activeInstanceContractRef.current = null;
    clearSelectedInstance();
    navigate(-1);
  };

  const fetchMoveHistory = useCallback(async (instanceCont, roundNumber, matchNumber) => {
    try {
      let movesString = '';
      try { movesString = await instanceCont.getMatchMoves(roundNumber, matchNumber); } catch {
        const matchData = await instanceCont.getMatch(roundNumber, matchNumber);
        movesString = matchData.moves || '';
      }
      if (!movesString) return [];
      const moves = movesToPairs(movesString);
      const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);
      const [matchData, fullMatch] = await Promise.all([instanceCont.getMatch(roundNumber, matchNumber), instanceCont.matches(matchKey)]);
      const firstPlayer = fullMatch.firstPlayer;
      const player1 = matchData.player1;
      const player2 = matchData.player2;
      return moves.map((move, idx) => {
        const isFirstMove = idx % 2 === 0;
        const movePlayer = isFirstMove ? firstPlayer : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
        return { player: isFirstMove ? '♔' : '♚', move: `${indexToChessNotation(move.from)}→${indexToChessNotation(move.to)}`, from: move.from, to: move.to, promotion: 0, address: movePlayer };
      });
    } catch (error) {
      console.error('[ChessV2] Error fetching move history:', error);
      return [];
    }
  }, []);

  const applyMoveHistoryUpdate = useCallback((history) => {
    setMoveHistory(prev => {
      if (!Array.isArray(history)) return prev;
      if (history.length === 0 && prev.length > 0) return prev;
      return history;
    });
  }, []);

  const refreshMatchData = useCallback(async (instanceCont, userAccount, matchInfo) => {
    try {
      const { roundNumber, matchNumber } = matchInfo;
      const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);
      const [matchData, fullMatch, boardResult, tierConfig] = await Promise.all([
        instanceCont.getMatch(roundNumber, matchNumber),
        instanceCont.matches(matchKey),
        instanceCont.getBoard(roundNumber, matchNumber).catch(() => [0n, 0n]),
        instanceCont.tierConfig(),
      ]);
      const packedBoard = Array.isArray(boardResult) ? boardResult[0] : boardResult.board;
      const packedState = Array.isArray(boardResult) ? boardResult[1] : boardResult.state;
      const board = unpackBoard(packedBoard);
      const tierMatchTime = Number(tierConfig.timeouts?.matchTimePerPlayer ?? tierConfig.matchTimePerPlayer ?? 600);
      const player1 = matchData.player1 || matchInfo.player1;
      const player2 = matchData.player2 || matchInfo.player2;
      const matchStatus = Number(matchData.status);
      const lastMoveTime = Number(matchData.lastMoveTime);
      const startTime = Number(matchData.startTime);
      const winner = matchData.matchWinner || matchData.winner;
      const completionReason = Number(matchData.completionReason ?? 0);
      const currentTurn = fullMatch.currentTurn;
      const firstPlayer = fullMatch.firstPlayer;
      const p1TimeRaw = Number(fullMatch.player1TimeRemaining ?? tierMatchTime);
      const p2TimeRaw = Number(fullMatch.player2TimeRemaining ?? tierMatchTime);
      const zeroAddress = ethers.ZeroAddress;
      let loser = zeroAddress;
      if (matchStatus === 2 && winner && winner.toLowerCase() !== zeroAddress.toLowerCase()) loser = winner.toLowerCase() === player1.toLowerCase() ? player2 : player1;
      const now = Math.floor(Date.now() / 1000);
      const elapsed = lastMoveTime > 0 ? now - lastMoveTime : 0;
      let p1Time = p1TimeRaw;
      let p2Time = p2TimeRaw;
      const isP1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
      if (matchStatus === 1 && currentTurn && elapsed > 0) {
        if (isP1Turn) p1Time = Math.max(0, p1Time - elapsed); else p2Time = Math.max(0, p2Time - elapsed);
      }
      let timeoutState = null;
      try {
        const timeoutData = await instanceCont.matchTimeouts(matchKey);
        const esc1Start = Number(timeoutData.escalation1Start);
        const esc2Start = Number(timeoutData.escalation2Start);
        if (esc1Start > 0 || esc2Start > 0 || timeoutData.isStalled) {
          timeoutState = { escalation1Start: esc1Start, escalation2Start: esc2Start, activeEscalation: Number(timeoutData.activeEscalation), timeoutActive: timeoutData.isStalled, forfeitAmount: 0 };
        }
      } catch {}

      if (matchStatus === 1 && currentTurn && lastMoveTime > 0) {
        const activePlayerTimeAtLastMove = isP1Turn ? p1TimeRaw : p2TimeRaw;
        const timeoutOccurredAt = lastMoveTime + activePlayerTimeAtLastMove;
        const hasClientDetectedTimeout = elapsed >= activePlayerTimeAtLastMove;
        if (hasClientDetectedTimeout && (!timeoutState || (timeoutState.timeoutActive && timeoutState.escalation1Start === 0 && timeoutState.escalation2Start === 0))) {
          const matchLevel2Delay = Number(tierConfig.timeouts?.matchLevel2Delay ?? tierConfig.matchLevel2Delay ?? 180);
          const matchLevel3Delay = Number(tierConfig.timeouts?.matchLevel3Delay ?? tierConfig.matchLevel3Delay ?? 360);
          timeoutState = {
            escalation1Start: timeoutOccurredAt + matchLevel2Delay,
            escalation2Start: timeoutOccurredAt + matchLevel3Delay,
            activeEscalation: timeoutState?.activeEscalation ?? 0,
            timeoutActive: true,
            forfeitAmount: timeoutState?.forfeitAmount ?? 0,
          };
        }
      }
      let escL2Available = false;
      let escL3Available = false;
      let isUserAdvancedForRound = false;
      try {
        escL2Available = await instanceCont.isMatchEscL2Available(roundNumber, matchNumber);
        escL3Available = await instanceCont.isMatchEscL3Available(roundNumber, matchNumber);
      } catch {}
      if (userAccount) {
        try { isUserAdvancedForRound = await instanceCont.isPlayerInAdvancedRound(roundNumber, userAccount); } catch {}
      }
      const packedStateBig = BigInt(packedState || 0);
      const whiteInCheck = ((packedStateBig >> 12n) & 1n) === 1n;
      const blackInCheck = ((packedStateBig >> 13n) & 1n) === 1n;
      const isPlayer1 = player1.toLowerCase() === userAccount?.toLowerCase();
      const isYourTurn = currentTurn?.toLowerCase() === userAccount?.toLowerCase();
      const isTimedOut = matchStatus === 2 && timeoutState?.timeoutActive === true;
      const moves = movesToPairs(matchData.moves || fullMatch.moves || '');
      let lastMove = null;
      if (moves.length > 0) {
        const move = moves[moves.length - 1];
        const moveIndex = moves.length - 1;
        const moveAddress = moveIndex % 2 === 0 ? firstPlayer : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
        lastMove = { from: move.from, to: move.to, isMyMove: moveAddress?.toLowerCase() === userAccount?.toLowerCase() };
      }
      return {
        ...matchInfo,
        player1,
        player2,
        firstPlayer,
        currentTurn,
        winner,
        loser,
        board,
        packedBoard: BigInt(packedBoard || 0),
        packedState: BigInt(packedState || 0),
        matchStatus,
        completionReason,
        startTime,
        lastMoveTime,
        isTimedOut,
        isPlayer1,
        isYourTurn,
        userSymbol: isPlayer1 ? 'White' : 'Black',
        player1TimeRemaining: p1Time,
        player2TimeRemaining: p2Time,
        matchTimePerPlayer: tierMatchTime,
        timeoutState,
        escL2Available,
        escL3Available,
        isUserAdvancedForRound,
        tierId: VIRTUAL_TIER_ID,
        instanceId: VIRTUAL_INSTANCE_ID,
        instanceAddress: matchInfo.instanceAddress || viewingTournament?.address,
        whiteInCheck,
        blackInCheck,
        lastMove,
      };
    } catch (error) {
      console.error('[ChessV2] Error refreshing match data:', error);
      return null;
    }
  }, [viewingTournament?.address]);

  const handlePlayMatch = useCallback(async (_tierId, _instanceId, roundNumber, matchNumber) => {
    if (!account) { alert('Please connect your wallet first.'); return; }
    const instanceAddress = (typeof _instanceId === 'string' && _instanceId.startsWith('0x')) ? _instanceId : (viewingTournament?.address || '');
    let instanceCont = activeInstanceContractRef.current;
    if (!instanceCont || (instanceAddress && (instanceCont.target || instanceCont.address)?.toLowerCase() !== instanceAddress.toLowerCase())) {
      if (!instanceAddress) { alert('Missing instance address.'); return; }
      instanceCont = getInstanceContract(instanceAddress, getReadRunner());
      setActiveInstanceContract(instanceCont);
      activeInstanceContractRef.current = instanceCont;
    }
    try {
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
      setMatchLoading(true);
      const updated = await refreshMatchData(instanceCont, account, { tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID, roundNumber, matchNumber, playerCount: viewingTournament?.playerCount || 2, prizePool: viewingTournament?.prizePoolWei || 0n, instanceAddress });
      if (updated) {
        setIsSpectator(!(updated.player1?.toLowerCase() === account.toLowerCase() || updated.player2?.toLowerCase() === account.toLowerCase()));
        setCurrentMatch(updated);
        previousBoardRef.current = JSON.stringify(updated.board);
        setMatchEndResult(null);
        setMatchEndWinner(null);
        setMatchEndLoser(null);
        setMatchEndWinnerLabel('');
        matchEndModalShownRef.current = updated.matchStatus === 2;
        setMoveHistory(await fetchMoveHistory(instanceCont, roundNumber, matchNumber));
        skipNavEffectRef.current = true;
        navigate('/v2/chess', { replace: false, state: { view: 'match', instanceAddress, roundNumber, matchNumber, from: location.state?.view || 'bracket' } });
        setTimeout(() => {
          matchViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          collapseActivityPanelRef.current?.();
        }, 100);
      }
    } catch (error) {
      console.error('[ChessV2] Error loading match:', error);
      alert(`Error loading match: ${error.message}`);
    } finally {
      setMatchLoading(false);
    }
  }, [account, viewingTournament, refreshMatchData, fetchMoveHistory, navigate, location.state?.view]);

  const handleMakeMove = async (fromSquare, toSquare, promotion = 0) => {
    if (!currentMatch || !activeInstanceContractRef.current || !account) return;
    setMoveTxTimeout(null);
    if (currentMatch.packedBoard != null && currentMatch.packedState != null) {
      const isWhite = currentMatch.firstPlayer?.toLowerCase() === account.toLowerCase();
      const reason = validateMoveWithReason(currentMatch.packedBoard, currentMatch.packedState, fromSquare, toSquare, isWhite, promotion);
      if (reason) { alert(`Invalid Move: ${reason}`); return; }
    }
    try {
      setActionState({ type: 'info', message: 'Confirm your move in MetaMask...' });
      setMatchLoadingMessage('Confirm your move in MetaMask...');
      setMatchLoading(true);
      moveTxInProgressRef.current = true;
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.makeMove(currentMatch.roundNumber, currentMatch.matchNumber, fromSquare, toSquare, promotion);
      setActionState({ type: 'info', message: 'Move submitted. Waiting for block confirmation...' });
      setMatchLoadingMessage('Move submitted. Waiting for block confirmation...');
      const syncResult = await waitForTxOrStateSync({
        tx,
        timeoutMs: 90_000,
        postReceiptSyncMs: 12_000,
        sync: async () => {
          const latestMatch = currentMatchRef.current || currentMatch;
          if (!latestMatch || !activeInstanceContractRef.current) return null;
          return refreshMatchData(activeInstanceContractRef.current, account, latestMatch);
        },
        isSynced: (updatedMatch) => didMatchStateAdvance(currentMatchRef.current || currentMatch, updatedMatch),
        onReceipt: () => {
          setActionState({ type: 'info', message: 'Move confirmed on-chain. Syncing the board and match state...' });
          setMatchLoadingMessage('Move confirmed on-chain. Syncing the board...');
        },
      });

      const latestMatch = currentMatchRef.current || currentMatch;
      const updated = syncResult.updated || ((latestMatch && activeInstanceContractRef.current)
        ? await refreshMatchData(activeInstanceContractRef.current, account, latestMatch)
        : null);
      if (updated) {
        setCurrentMatch(updated);
        previousBoardRef.current = JSON.stringify(updated.board);
      }
      setActionState({
        type: syncResult.synced ? 'success' : 'info',
        message: syncResult.synced
          ? 'Move confirmed and reflected in the match state.'
          : 'Move confirmed on-chain. The match UI is still syncing and should update shortly.',
      });

      if (updated) {
        try {
          applyMoveHistoryUpdate(await fetchMoveHistory(activeInstanceContractRef.current, currentMatch.roundNumber, currentMatch.matchNumber));
        } catch (historyError) {
          console.error('[ChessV2] Error refreshing move history after move:', historyError);
        }
      }
    } catch (error) {
      const errorString = error.message || error.toString();
      if (errorString.includes('TX_TIMEOUT')) {
        setActionState({ type: 'error', message: 'Move confirmation is taking longer than expected. If it confirms, the board will update automatically.' });
        setMoveTxTimeout({ type: 'congestion', pendingFrom: fromSquare, pendingTo: toSquare, pendingPromotion: promotion });
        return;
      }
      let errorMsg = 'Invalid Move';
      if (errorString.includes('user rejected') || errorString.includes('User denied')) errorMsg = 'Transaction cancelled';
      else if (errorString.includes('insufficient funds')) errorMsg = 'Insufficient funds for gas';
      else if (errorString.includes('Not your turn') || errorString.includes('not your turn')) errorMsg = 'Not your turn';
      else if (errorString.includes('Match not active') || errorString.includes('match not active')) errorMsg = 'Match is not active';
      setActionState({ type: 'error', message: errorMsg });
      alert(errorMsg);
    } finally {
      moveTxInProgressRef.current = false;
      setMatchLoading(false);
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
    }
  };

  const handleClaimTimeoutWin = async () => {
    if (!currentMatch || !activeInstanceContractRef.current) return;
    try {
      setActionState({ type: 'info', message: 'Confirm the timeout claim in MetaMask...' });
      setMatchLoadingMessage('Confirm the timeout claim in MetaMask...');
      setMatchLoading(true);
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.claimTimeoutWin(currentMatch.roundNumber, currentMatch.matchNumber);
      setActionState({ type: 'info', message: 'Timeout claim submitted. Waiting for block confirmation...' });
      setMatchLoadingMessage('Timeout claim submitted. Waiting for block confirmation...');
      const syncResult = await waitForTxOrStateSync({
        tx,
        timeoutMs: 60_000,
        postReceiptSyncMs: 12_000,
        sync: async () => refreshMatchData(activeInstanceContractRef.current, account, currentMatchRef.current || currentMatch),
        isSynced: (updatedMatch) => Boolean(updatedMatch && Number(updatedMatch.matchStatus) === 2),
        onReceipt: () => {
          setActionState({ type: 'info', message: 'Timeout claim confirmed. Syncing match resolution...' });
          setMatchLoadingMessage('Timeout claim confirmed. Syncing match resolution...');
        },
      });
      const updatedMatch = syncResult.updated || await refreshMatchData(activeInstanceContractRef.current, account, currentMatch);
      if (updatedMatch) {
        setCurrentMatch(updatedMatch);
        setMatchEndResult({ result: 'forfeit_win', completionReason: 1 });
        setMatchEndWinnerLabel('You');
        setMatchEndWinner(updatedMatch.winner);
        setMatchEndLoser(updatedMatch.loser);
      }
      setActionState({
        type: syncResult.synced ? 'success' : 'info',
        message: syncResult.synced
          ? 'Timeout victory confirmed and reflected in the match.'
          : 'Timeout victory confirmed on-chain. The match UI is still syncing and should update shortly.',
      });
    } catch (error) {
      console.error('[ChessV2] Claim timeout win error:', error);
      setActionState({ type: 'error', message: getReadableError(error, 'Could not claim the timeout win.') });
      alert(`Error: ${error.message}`);
    } finally {
      setMatchLoading(false);
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
    }
  };

  const handleForceEliminateStalledMatch = async (matchData = null) => {
    const match = matchData || currentMatch;
    if (!match || !activeInstanceContractRef.current) return;
    try {
      setActionState({ type: 'info', message: 'Confirm the force-elimination in MetaMask...' });
      setMatchLoadingMessage('Confirm the force-elimination in MetaMask...');
      setMatchLoading(true);
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.forceEliminateStalledMatch(match.roundNumber, match.matchNumber);
      setActionState({ type: 'info', message: 'Force-elimination submitted. Waiting for block confirmation...' });
      setMatchLoadingMessage('Force-elimination submitted. Waiting for block confirmation...');
      await tx.wait();
      setActionState({ type: 'info', message: 'Force-elimination confirmed. Refreshing tournament bracket...' });
      alert('Stalled match eliminated! Tournament can now continue.');
      setCurrentMatch(null);
      const address = viewingTournament?.address;
      if (address) {
        const updated = await refreshTournamentBracket(address);
        if (updated) setViewingTournament(updated);
      }
      setActionState({ type: 'success', message: 'Stalled match eliminated and tournament state refreshed.' });
    } catch (error) {
      console.error('[ChessV2] Force eliminate error:', error);
      setActionState({ type: 'error', message: getReadableError(error, 'Could not eliminate the stalled match.') });
      alert(`Error: ${error.message}`);
    } finally {
      setMatchLoading(false);
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
    }
  };

  const handleClaimMatchSlotByReplacement = async (matchData = null) => {
    const match = matchData || currentMatch;
    if (!match || !activeInstanceContractRef.current) return;
    try {
      setActionState({ type: 'info', message: 'Confirm the replacement claim in MetaMask...' });
      setMatchLoadingMessage('Confirm the replacement claim in MetaMask...');
      setMatchLoading(true);
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.claimMatchSlotByReplacement(match.roundNumber, match.matchNumber);
      setActionState({ type: 'info', message: 'Replacement claim submitted. Waiting for block confirmation...' });
      setMatchLoadingMessage('Replacement claim submitted. Waiting for block confirmation...');
      await tx.wait();
      setActionState({ type: 'info', message: 'Replacement claim confirmed. Refreshing tournament state...' });
      alert('Match slot claimed! You have replaced both players and advanced.');
      setCurrentMatch(null);
      setViewingTournament(null);
      setActionState({ type: 'success', message: 'Replacement claim confirmed on-chain.' });
    } catch (error) {
      console.error('[ChessV2] Claim slot by replacement error:', error);
      setActionState({ type: 'error', message: getReadableError(error, 'Could not claim the match slot.') });
      alert(`Error: ${error.message}`);
    } finally {
      setMatchLoading(false);
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
    }
  };

  const closeMatch = async () => {
    const address = currentMatch?.instanceAddress || viewingTournament?.address;
    setCurrentMatch(null);
    setMoveHistory([]);
    setIsSpectator(false);
    setMoveTxTimeout(null);
    previousBoardRef.current = null;
    navigate(-1);
    if (address && activeInstanceContractRef.current) {
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(address);
      if (bracketData) setViewingTournament(bracketData);
      setTournamentsLoading(false);
    }
  };

  const handleMatchEndModalClose = () => { setMatchEndResult(null); setMatchEndWinnerLabel(''); };
  const handleMatchAlertClose = () => { setShowMatchAlert(false); setAlertMatch(null); playerActivity.clearMatchAlert(); };
  useEffect(() => { if (playerActivity.matchAlert) { setAlertMatch(playerActivity.matchAlert); setShowMatchAlert(true); } }, [playerActivity.matchAlert]);

  const checkForNextActiveMatch = useCallback(async () => {
    if (!activeInstanceContractRef.current || !account || !currentMatch) { setNextActiveMatch(null); return; }
    try {
      const nextRoundNumber = currentMatch.roundNumber + 1;
      const bracket = await activeInstanceContractRef.current.getBracket();
      const totalRounds = Number(bracket.totalRounds);
      if (nextRoundNumber >= totalRounds) { setNextActiveMatch(null); return; }
      const matchCount = Number(bracket.matchCounts[nextRoundNumber] || 0);
      for (let matchNumber = 0; matchNumber < matchCount; matchNumber++) {
        try {
          const matchData = await activeInstanceContractRef.current.getMatch(nextRoundNumber, matchNumber);
          const matchStatus = Number(matchData.status);
          const p1 = matchData.player1;
          const p2 = matchData.player2;
          if (matchStatus === 1) {
            const isInMatch = p1.toLowerCase() === account.toLowerCase() || p2.toLowerCase() === account.toLowerCase();
            if (isInMatch) { setNextActiveMatch({ tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID, roundNumber: nextRoundNumber, matchNumber }); return; }
          }
        } catch {}
      }
      setNextActiveMatch(null);
    } catch (error) {
      console.error('[ChessV2] Check next match error:', error);
      setNextActiveMatch(null);
    }
  }, [account, currentMatch]);

  const handleEnterNextMatch = useCallback(() => {
    if (nextActiveMatch) handlePlayMatch(nextActiveMatch.tierId, nextActiveMatch.instanceId, nextActiveMatch.roundNumber, nextActiveMatch.matchNumber);
  }, [nextActiveMatch, handlePlayMatch]);
  const handleReturnToBracket = useCallback(() => closeMatch(), []);

  useEffect(() => { currentMatchRef.current = currentMatch; }, [currentMatch]);
  useEffect(() => { accountRefForMatch.current = account; }, [account]);
  useEffect(() => { tournamentRef.current = viewingTournament; }, [viewingTournament]);
  useEffect(() => { activeInstanceContractRef.current = activeInstanceContract; }, [activeInstanceContract]);

  useEffect(() => {
    if (!viewingTournament || !activeInstanceContractRef.current) return;
    const doSync = async () => {
      const tournament = tournamentRef.current;
      if (!tournament || !activeInstanceContractRef.current) return;
      const updated = await refreshTournamentBracket(tournament.address);
      if (updated) setViewingTournament(updated);
      setBracketSyncDots(1);
    };
    const pollInterval = setInterval(doSync, 3000);
    return () => clearInterval(pollInterval);
  }, [viewingTournament?.address, refreshTournamentBracket]);

  useEffect(() => {
    if (!currentMatch || !activeInstanceContractRef.current || !account) return;
    const doMatchSync = async () => {
      const match = currentMatchRef.current;
      const instanceCont = activeInstanceContractRef.current;
      const userAccount = accountRefForMatch.current;
      if (!match || !instanceCont || !userAccount) return;
      if (skipNextPollRef.current) { skipNextPollRef.current = false; return; }
      if (match.matchStatus === 2 && matchEndModalShownRef.current) return;
      if (moveTxInProgressRef.current) return;
      try {
        const updatedMatch = await refreshMatchData(instanceCont, userAccount, match);
        if (!updatedMatch) return;
        if (updatedMatch.matchStatus === 2) {
          try {
            const finalHistory = await fetchMoveHistory(instanceCont, match.roundNumber, match.matchNumber);
            if (finalHistory && finalHistory.length > 0) setMoveHistory(finalHistory);
          } catch {}
          setCurrentMatch(prev => (!prev || prev.matchStatus === 2 ? prev : updatedMatch));
          const isP1 = match.player1?.toLowerCase() === userAccount.toLowerCase();
          const isP2 = match.player2?.toLowerCase() === userAccount.toLowerCase();
          if (!isP1 && !isP2) return;
          if (matchEndModalShownRef.current) return;
          const reasonNum = updatedMatch.completionReason || 0;
          const isMatchDraw = isDraw(reasonNum);
          const winnerAddress = updatedMatch.winner?.toLowerCase();
          const loserAddress = updatedMatch.loser?.toLowerCase();
          const zeroAddress = ethers.ZeroAddress.toLowerCase();
          if (!isMatchDraw && (!winnerAddress || !loserAddress || winnerAddress === zeroAddress || loserAddress === zeroAddress)) return;
          const userIsWinner = !isMatchDraw && winnerAddress === userAccount.toLowerCase();
          let resultType = 'lose';
          if (isMatchDraw) resultType = 'draw';
          else if (userIsWinner) resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_win' : 'win';
          else resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_lose' : 'lose';
          matchEndModalShownRef.current = true;
          setMatchEndResult({ result: resultType, completionReason: reasonNum });
          setMatchEndWinner(updatedMatch.winner);
          setMatchEndLoser(updatedMatch.loser);
          if (userIsWinner) setTimeout(() => checkForNextActiveMatch(), 500);
          return;
        }
        const boardChanged = previousBoardRef.current && previousBoardRef.current !== JSON.stringify(updatedMatch.board);
        setCurrentMatch(prev => {
          if (!prev) return updatedMatch;
          if (prev.matchStatus === 2) return prev;
          return { ...prev, board: updatedMatch.board, packedBoard: updatedMatch.packedBoard, packedState: updatedMatch.packedState, currentTurn: updatedMatch.currentTurn, isYourTurn: updatedMatch.isYourTurn, player1TimeRemaining: updatedMatch.player1TimeRemaining, player2TimeRemaining: updatedMatch.player2TimeRemaining, lastMoveTime: updatedMatch.lastMoveTime, whiteInCheck: updatedMatch.whiteInCheck, blackInCheck: updatedMatch.blackInCheck, lastMove: updatedMatch.lastMove };
        });
        if (boardChanged) applyMoveHistoryUpdate(await fetchMoveHistory(instanceCont, match.roundNumber, match.matchNumber));
        previousBoardRef.current = JSON.stringify(updatedMatch.board);
      } catch (error) {
        console.error('[ChessV2 Polling] Error syncing match:', error);
      }
      setSyncDots(1);
    };
    doMatchSyncRef.current = doMatchSync;
    const id = setInterval(doMatchSync, 1500);
    return () => clearInterval(id);
  }, [currentMatch?.instanceAddress, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, fetchMoveHistory, checkForNextActiveMatch]);

  useEffect(() => {
    if (!currentMatch || !activeInstanceContract || !account) return;
    const match = currentMatchRef.current;
    if (!match?.player1 || !match?.player2) return;
    const matchId = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [match.roundNumber, match.matchNumber]);
    const opponentAddress = match.player1.toLowerCase() === account.toLowerCase() ? match.player2 : match.player1;
    const handleOpponentMove = (_matchId, _player, from, to) => {
      setGhostMove({ from: Number(from), to: Number(to) });
      skipNextPollRef.current = true;
      doMatchSyncRef.current?.().then(() => setGhostMove(null)).catch(() => setGhostMove(null));
    };
    try {
      const filter = activeInstanceContract.filters.MoveMade(matchId, opponentAddress);
      activeInstanceContract.on(filter, handleOpponentMove);
      return () => activeInstanceContract.off(filter, handleOpponentMove);
    } catch {}
  }, [currentMatch?.roundNumber, currentMatch?.matchNumber, activeInstanceContract, account]);

  useEffect(() => { if (!currentMatch) return; const id = setInterval(() => setSyncDots(prev => prev >= 3 ? 3 : prev + 1), 1000); return () => clearInterval(id); }, [currentMatch]);
  useEffect(() => { if (!viewingTournament) return; const id = setInterval(() => setBracketSyncDots(prev => prev >= 3 ? 3 : prev + 1), 1000); return () => clearInterval(id); }, [viewingTournament]);

  useEffect(() => {
    const handleNav = async () => {
      if (skipNavEffectRef.current) { skipNavEffectRef.current = false; return; }
      if (isInitialNavRef.current) { isInitialNavRef.current = false; navigate('/v2/chess', { replace: true, state: null }); return; }
      const state = location.state;
      if (!state || !state.view) { if (currentMatch || viewingTournament) { setCurrentMatch(null); setViewingTournament(null); } return; }
      if (state.view === 'bracket' && state.instanceAddress) {
        const needsUpdate = !viewingTournament || viewingTournament.address !== state.instanceAddress;
        if (needsUpdate) {
          setCurrentMatch(null);
          const bracketData = await refreshTournamentBracket(state.instanceAddress);
          if (bracketData) {
            setViewingTournament(bracketData);
            const instance = getInstanceContract(state.instanceAddress, getReadRunner());
            setActiveInstanceContract(instance);
            activeInstanceContractRef.current = instance;
          }
        } else if (currentMatch) setCurrentMatch(null);
      } else if (state.view === 'match' && state.instanceAddress && state.roundNumber !== undefined && state.matchNumber !== undefined) {
        const needsUpdate = !currentMatch || currentMatch.roundNumber !== state.roundNumber || currentMatch.matchNumber !== state.matchNumber;
        if (needsUpdate && activeInstanceContractRef.current && account) {
          try {
            setMatchLoading(true);
            const instanceCont = activeInstanceContractRef.current;
            const updated = await refreshMatchData(instanceCont, account, { tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID, roundNumber: state.roundNumber, matchNumber: state.matchNumber, instanceAddress: state.instanceAddress });
            if (updated) {
              setCurrentMatch(updated);
              setIsSpectator(!(updated.player1?.toLowerCase() === account.toLowerCase() || updated.player2?.toLowerCase() === account.toLowerCase()));
              previousBoardRef.current = JSON.stringify(updated.board);
              setMatchEndResult(null);
              setMatchEndWinner(null);
              setMatchEndLoser(null);
              setMatchEndWinnerLabel('');
              matchEndModalShownRef.current = updated.matchStatus === 2;
              setMoveHistory(await fetchMoveHistory(instanceCont, state.roundNumber, state.matchNumber));
            }
          } catch (error) {
            console.error('[ChessV2] Error loading match from history:', error);
          } finally {
            setMatchLoading(false);
          }
        }
      } else if (state.view === 'landing') {
        if (currentMatch || viewingTournament) { setCurrentMatch(null); setViewingTournament(null); }
      }
    };
    handleNav();
  }, [location.state?.view, location.state?.instanceAddress, location.state?.roundNumber, location.state?.matchNumber]);

  useEffect(() => {
    if (!activeTooltip) return;
    const handleClickAway = () => setActiveTooltip(null);
    const timer = setTimeout(() => document.addEventListener('click', handleClickAway), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClickAway); };
  }, [activeTooltip]);

  useEffect(() => { document.title = 'ETour - Chess V2'; }, []);

  const isAlertMatchAlreadyOpen = Boolean(
    currentMatch &&
    alertMatch &&
    typeof alertMatch.instanceId === 'string' &&
    currentMatch.instanceAddress?.toLowerCase() === alertMatch.instanceId.toLowerCase() &&
    currentMatch.roundNumber === alertMatch.roundIdx &&
    currentMatch.matchNumber === alertMatch.matchIdx
  );

  useEffect(() => {
    if (showMatchAlert && isAlertMatchAlreadyOpen) {
      handleMatchAlertClose();
    }
  }, [showMatchAlert, isAlertMatchAlreadyOpen]);

  return (
    <div style={{ minHeight: '100vh', background: currentTheme.gradient, color: '#fff', position: 'relative', overflow: 'clip', transition: 'background 0.8s ease-in-out' }}>
      <ParticleBackground colors={currentTheme.particleColors} symbols={CHESS_PIECES} fontSize="40px" />
      {showPrompt && <WalletBrowserPrompt onWalletChoice={handleWalletChoice} onContinueChoice={handleContinueChoice} />}
      {matchEndResult && <MatchEndModal result={matchEndResult.result} completionReason={matchEndResult.completionReason} winnerLabel={matchEndWinnerLabel} winnerAddress={matchEndWinner} loserAddress={matchEndLoser} currentAccount={account} hasNextMatch={!!nextActiveMatch} onClose={handleMatchEndModalClose} onEnterNextMatch={handleEnterNextMatch} onReturnToBracket={handleReturnToBracket} gameType="chess" roundNumber={currentMatch?.roundNumber} totalRounds={viewingTournament?.totalRounds} prizePool={viewingTournament?.prizePoolWei} />}
      {showMatchAlert && alertMatch && !isAlertMatchAlreadyOpen && <ActiveMatchAlertModal match={alertMatch} autoDismiss={isAlertMatchAlreadyOpen} onEnterMatch={() => { handleMatchAlertClose(); handlePlayMatch(alertMatch.tierId, alertMatch.instanceId, alertMatch.roundIdx, alertMatch.matchIdx); }} onDismiss={handleMatchAlertClose} />}

      <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto">
        <div className="md:hidden bg-gradient-to-b from-slate-800 to-slate-900 border-t border-purple-400/30 px-4 py-2.5 flex items-center justify-between">
          <GamesCard currentGame="chess" onHeightChange={setGamesCardHeight} isExpanded={expandedPanel === 'games'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')} />
          <PlayerActivity activity={playerActivity.data} loading={playerActivity.loading} syncing={playerActivity.syncing} contract={activeInstanceContract} account={account} onEnterMatch={handlePlayMatch} onEnterTournament={handleEnterTournamentFromActivity} onRefresh={playerActivity.refetch} onDismissMatch={playerActivity.dismissMatch} gameName="chess" gameEmoji="♟️" connectCtaClassName={currentTheme.connectCtaClassName} gamesCardHeight={gamesCardHeight} onHeightChange={setPlayerActivityHeight} onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }} isExpanded={expandedPanel === 'playerActivity'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'playerActivity'} onShowTooltip={() => setActiveTooltip('playerActivity')} onHideTooltip={() => setActiveTooltip(null)} />
          <RecentMatchesCard contract={null} account={account} gameName="chess" gameEmoji="♟️" gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} onHeightChange={() => {}} isExpanded={expandedPanel === 'recentMatches'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'recentMatches'} onShowTooltip={() => setActiveTooltip('recentMatches')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} onNavigateToTournament={() => {}} leaderboard={leaderboard} playerProfile={playerProfile} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} v2Matches={v2MatchHistory.matches} v2MatchesLoading={v2MatchHistory.loading} />
        </div>
        <div className="hidden md:block">
          <GamesCard currentGame="chess" onHeightChange={setGamesCardHeight} isExpanded={expandedPanel === 'games'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')} />
          <PlayerActivity activity={playerActivity.data} loading={playerActivity.loading} syncing={playerActivity.syncing} contract={activeInstanceContract} account={account} onEnterMatch={handlePlayMatch} onEnterTournament={handleEnterTournamentFromActivity} onRefresh={playerActivity.refetch} onDismissMatch={playerActivity.dismissMatch} gameName="chess" gameEmoji="♟️" connectCtaClassName={currentTheme.connectCtaClassName} gamesCardHeight={gamesCardHeight} onHeightChange={setPlayerActivityHeight} onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }} isExpanded={expandedPanel === 'playerActivity'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'playerActivity'} onShowTooltip={() => setActiveTooltip('playerActivity')} onHideTooltip={() => setActiveTooltip(null)} />
          <RecentMatchesCard contract={null} account={account} gameName="chess" gameEmoji="♟️" gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} onHeightChange={() => {}} isExpanded={expandedPanel === 'recentMatches'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'recentMatches'} onShowTooltip={() => setActiveTooltip('recentMatches')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} onNavigateToTournament={() => {}} leaderboard={leaderboard} playerProfile={playerProfile} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} v2Matches={v2MatchHistory.matches} v2MatchesLoading={v2MatchHistory.loading} />
        </div>
      </div>

      <div style={{ background: 'rgba(0, 100, 200, 0.2)', borderBottom: `1px solid ${currentTheme.border}`, backdropFilter: 'blur(10px)', position: 'relative', zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className={`flex flex-col md:flex-row md:items-center ${explorerUrl ? 'md:justify-between' : 'md:justify-center'} gap-3 md:gap-4 text-xs md:text-sm`}>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-6 justify-center ${explorerUrl ? 'md:justify-start' : ''}`}>
              <div className="flex items-center gap-2"><Shield className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">100% On-Chain</span></div>
              <div className="flex items-center gap-2"><Lock className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Immutable Rules</span></div>
              <div className="flex items-center gap-2"><Eye className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Every Move Verifiable</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Zero Trackers</span></div>
            </div>
            {explorerUrl ? <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors justify-center md:justify-end"><Code size={16} /><span className="font-mono text-xs">{shortenAddress(factoryAddress)}</span><ExternalLink size={14} /></a> : null}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`} />
              <span className="relative text-8xl">♚</span>
            </div>
          </div>
          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>ETour Chess</h1>
          <p className={`text-2xl ${currentTheme.heroText} mb-6`}>Provably Fair • Zero Trust • 100% On-Chain</p>
          <p className={`text-lg ${currentTheme.heroSubtext} max-w-3xl mx-auto`}>
            Play Chess on the blockchain. Real opponents. Real ETH on the line.
            <br />
            No servers required. No trust needed.
            <br />
            Every move is a transaction. Every outcome is permanently on-chain.
          </p>
        </div>

        {(actionState.message || dashboardError) ? (
          <div className="mb-8 space-y-4">
            <ActionMessage type={actionState.type} message={actionState.message} />
            <ActionMessage type="error" message={dashboardError} />
          </div>
        ) : null}

        {currentMatch && (
          <div ref={matchViewRef}>
            <GameMatchLayout
              gameType="chess"
              match={currentMatch}
              account={account}
              loading={matchLoading}
              loadingMessage={matchLoadingMessage}
              syncDots={syncDots}
              pendingOpponentMove={!!ghostMove}
              onClose={closeMatch}
              onClaimTimeoutWin={isSpectator ? null : handleClaimTimeoutWin}
              onForceEliminate={isSpectator ? null : handleForceEliminateStalledMatch}
              onClaimReplacement={isSpectator ? null : handleClaimMatchSlotByReplacement}
              onEnterNextMatch={handleEnterNextMatch}
              onReturnToBracket={handleReturnToBracket}
              hasNextActiveMatch={!!nextActiveMatch}
              playerCount={viewingTournament?.playerCount || null}
              playerConfig={{ player1: { icon: '♚', label: 'White' }, player2: { icon: '♔', label: 'Black' } }}
              layout="players-board-history"
              isSpectator={isSpectator}
              renderPlayer1Extra={(isMobile) => {
                const capturedPieces = calculateCapturedPieces(currentMatch.board);
                return (
                  <>
                    <CapturedPieces capturedPieces={capturedPieces.black} color="black" collapsible={!!isMobile} />
                    {currentMatch.whiteInCheck && <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center mt-2"><span className="text-red-300 text-xs font-bold">CHECK</span></div>}
                  </>
                );
              }}
              renderPlayer2Extra={(isMobile) => {
                const capturedPieces = calculateCapturedPieces(currentMatch.board);
                return (
                  <>
                    <CapturedPieces capturedPieces={capturedPieces.white} color="white" collapsible={!!isMobile} />
                    {currentMatch.blackInCheck && <div className="bg-red-500/20 border border-red-400 rounded-lg p-2 text-center mt-2"><span className="text-red-300 text-xs font-bold">CHECK</span></div>}
                  </>
                );
              }}
              renderMoveHistory={moveHistory.length > 0 ? () => (
                <>
                  <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2"><History size={20} />Move History</h3>
                  <div className="space-y-2">
                    {moveHistory.map((move, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm bg-purple-500/10 p-3 rounded-lg hover:bg-purple-500/20 transition-colors">
                        <span className="text-purple-300 font-semibold min-w-[2rem]">#{idx + 1}</span>
                        <div className="w-8 h-8 flex items-center justify-center"><img src={move.player === '♔' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'} alt={move.player === '♔' ? 'White' : 'Black'} className="w-7 h-7" draggable="false" /></div>
                        <span className="text-purple-200 font-mono">{move.move}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : undefined}
            >
              <ChessBoard board={currentMatch.board} onMove={isSpectator ? null : handleMakeMove} currentTurn={currentMatch.currentTurn} account={isSpectator ? null : account} player1={currentMatch.player1} player2={currentMatch.player2} firstPlayer={currentMatch.firstPlayer} matchStatus={currentMatch.matchStatus} loading={matchLoading} whiteInCheck={currentMatch.whiteInCheck} blackInCheck={currentMatch.blackInCheck} lastMoveTime={currentMatch.lastMoveTime} startTime={currentMatch.startTime} lastMove={currentMatch.lastMove} maxSize={900} ghostMove={ghostMove} />
            </GameMatchLayout>

            {moveTxTimeout && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border-2 border-amber-500/50">
                  <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-full bg-amber-500/20"><AlertCircle size={28} className="text-amber-400" /></div><h2 className="text-xl font-bold text-amber-300">Transaction Taking Too Long</h2></div>
                  <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10"><p className="text-white/90 text-sm leading-relaxed">{moveTxTimeout.type === 'gas' ? 'Your transaction may need a higher gas fee to be processed.' : 'Your transaction is taking longer than expected, likely due to network congestion. You can retry or dismiss and wait.'}</p></div>
                  <p className="text-white/40 text-xs mb-5 text-center italic">The original transaction may still confirm. If your move appears on the board, dismiss this prompt.</p>
                  <div className="flex gap-3">
                    <button onClick={() => { const { pendingFrom, pendingTo, pendingPromotion } = moveTxTimeout; setMoveTxTimeout(null); handleMakeMove(pendingFrom, pendingTo, pendingPromotion); }} className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-900 transition-all">Retry Move</button>
                    <button onClick={() => setMoveTxTimeout(null)} className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm bg-white/10 hover:bg-white/20 text-white/80 border border-white/20 transition-all">Dismiss</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!currentMatch && (
          <>
            {viewingTournament ? (
              <div ref={tournamentBracketRef}>
                <TournamentBracket tournamentData={viewingTournament} onBack={handleBackToTournaments} onEnterMatch={handlePlayMatch} onForceEliminate={handleForceEliminateStalledMatch} onClaimReplacement={handleClaimMatchSlotByReplacement} onManualStart={handleManualStart} onClaimAbandonedPool={handleClaimAbandonedPool} onResetEnrollmentWindow={handleResetEnrollmentWindow} onEnroll={handleEnroll} onConnectWallet={connectWallet} account={account} loading={tournamentsLoading} connectLoading={isConnecting} syncDots={bracketSyncDots} isEnrolled={viewingTournament?.players?.some(addr => addr.toLowerCase() === account?.toLowerCase())} entryFee={viewingTournament?.entryFeeEth ?? '0'} isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount} instanceContract={activeInstanceContract} />
              </div>
            ) : (
              <div className="space-y-8 md:space-y-10">
                <V2GameLobbyIntro
                  account={account}
                  isConnecting={isConnecting}
                  onConnectWallet={connectWallet}
                  connectCtaClassName={currentTheme.connectCtaClassName}
                />
                <div id="live-instances">
                  <form onSubmit={createInstance}>
                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-4 md:p-5">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)] md:items-end">
                        <div>
                          <div className="text-sm text-purple-200 mb-2">Player Count</div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {PLAYER_COUNT_OPTIONS.map(option => {
                              const active = Number(createForm.playerCount) === option;
                              return <button key={option} type="button" onClick={() => setPlayerCount(option)} className={`px-3 py-2.5 rounded-xl font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-cyan-400/40'}`}>{option}</button>;
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block">
                            <div className="text-sm text-purple-200 mb-2">Entry Fee ({factoryRules ? `${formatEth(factoryRules.minEntryFee)}+ ETH` : '0.001 - 1 ETH'})</div>
                            <input type="number" min="0.001" max="1" step="0.001" value={createForm.entryFee} onChange={event => updateCreateForm('entryFee', event.target.value)} className="w-full bg-slate-950/80 border border-purple-400/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400" />
                          </label>
                        </div>
                      </div>
                      <div className="mt-4 mb-4">
                        <button type="button" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)} className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors mb-2">{showAdvancedSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}<span className="text-sm font-semibold">More Settings</span></button>
                        {showAdvancedSettings && (
                          <div className="grid gap-4 lg:grid-cols-3 bg-slate-950/50 border border-purple-400/10 rounded-xl p-4">
                            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                              <div className="text-sm text-purple-200 mb-2">Enrollment Window</div>
                              <div className="grid grid-cols-2 gap-2">
                                {ENROLLMENT_WINDOW_OPTIONS.map(seconds => {
                                  const active = Number(createForm.enrollmentWindow) === seconds;
                                  const label = seconds < 60 ? `${seconds}s` : `${seconds / 60}min`;
                                  return <button key={seconds} type="button" onClick={() => updateCreateForm('enrollmentWindow', seconds)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}>{label}</button>;
                                })}
                              </div>
                            </div>
                            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                              <div className="text-sm text-purple-200 mb-2">Time Per Player</div>
                              <div className="grid grid-cols-2 gap-2">
                                {TIME_PER_PLAYER_OPTIONS.map(seconds => {
                                  const active = Number(createForm.matchTimePerPlayer) === seconds;
                                  return <button key={seconds} type="button" onClick={() => updateCreateForm('matchTimePerPlayer', seconds)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}>{seconds / 60}min</button>;
                                })}
                              </div>
                            </div>
                            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                              <div className="text-sm text-purple-200 mb-2">Increment Time</div>
                              <div className="grid grid-cols-2 gap-2">
                                {TIME_INCREMENT_OPTIONS.map(seconds => {
                                  const active = Number(createForm.timeIncrementPerMove) === seconds;
                                  return <button key={seconds} type="button" onClick={() => updateCreateForm('timeIncrementPerMove', seconds)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}>{seconds}s</button>;
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-5 flex justify-start">
                        <button
                          type="submit"
                          disabled={createLoading || !account}
                          title={!account ? 'Connect your wallet to create and enrol.' : ''}
                          className={`inline-flex min-w-[220px] items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-base md:text-lg shadow-2xl transition-all disabled:cursor-not-allowed ${account ? `bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} transform hover:scale-105 text-white` : 'bg-slate-800/90 border border-slate-700 text-slate-500'}`}
                        >
                          {createLoading ? <Loader size={20} className="animate-spin" /> : <Plus size={20} />}
                          {createLoading ? 'Creating Tournament...' : 'Create and Enrol'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div id="user-manual" className="max-w-7xl mx-auto px-6 pt-8 md:pt-10 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <UserManualV2 contractInstance={null} tierConfigurations={[]} raffleThresholds={['0.001', '0.005', '0.02', '0.05', '0.25', '0.5', '0.75', '1']} />
      </div>

      <footer className="border-t border-slate-800/50 px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="text-center md:text-left">
              <p className="text-slate-500 text-sm mb-2">Powered by <span className="font-semibold bg-clip-text text-transparent" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text' }}>ETour Protocol</span></p>
              <p className="text-slate-600 text-xs">Open-source perpetual tournament infrastructure on Arbitrum</p>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => setContractsExpanded(!contractsExpanded)} className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1">Contracts {contractsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              <Link to="/" className="text-slate-500 hover:text-white transition-colors text-sm">Back Home</Link>
            </div>
          </div>
          {contractsExpanded && (
            <div className="mb-8 overflow-x-auto">
              <table className="w-full border-collapse bg-slate-900/60 rounded-lg">
                <thead><tr className="border-b border-slate-700/50"><th className="text-left p-4 text-cyan-300 font-semibold">Deployment</th><th className="text-left p-4 text-cyan-300 font-semibold">Address</th></tr></thead>
                <tbody>
                  <tr className="border-b border-slate-800/30"><td className="p-4 text-slate-300">Chess v2 Factory</td><td className="p-4 font-mono text-slate-400 break-all">{factoryAddress}</td></tr>
                  <tr><td className="p-4 text-slate-300">Chess v2 Instance Implementation</td><td className="p-4 font-mono text-slate-400 break-all">{implementationAddress}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          <div className="text-center pt-8 border-t border-slate-800/30"><p className="text-slate-600 text-xs">No company needed. No trust required. No servers to shutdown.</p></div>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @media (max-width: 768px) { .particle { font-size: 12px; } }
        @keyframes particle-float {
          0% { transform: translateY(100vh) translateX(0); opacity: 0.3; }
          10% { opacity: 0.5; }
          90% { opacity: 1; }
          100% { transform: translateY(calc(-100vh - 100px)) translateX(100px); opacity: 0; }
        }
        @media (max-width: 768px) {
          @keyframes particle-float {
            0% { transform: translateY(100vh) translateX(0); opacity: 0.2; }
            10% { opacity: 0.3; }
            90% { opacity: 0.7; }
            100% { transform: translateY(calc(-100vh - 100px)) translateX(100px); opacity: 0; }
          }
        }
      `}</style>
    </div>
  );
}
