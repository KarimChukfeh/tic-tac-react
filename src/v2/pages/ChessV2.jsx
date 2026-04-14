import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Grid,
  Shield,
  Lock,
  Eye,
  Code,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader,
  ChevronDown,
  ChevronUp,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ethers } from 'ethers';
import { CURRENT_NETWORK, TARGET_CHAIN_ID_HEX, getAddressUrl, getWalletAddChainParams } from '../../config/networks';
import { shortenAddress } from '../../utils/formatters';
import { generateV2TournamentUrl, parseV2ContractParam } from '../../utils/urlHelpers';
import { shouldResetOnInitialDocumentLoad } from '../../utils/navigation';
import { CompletionReason, isDraw } from '../../utils/completionReasons';
import { boardArrayToPackedBoard, getCheckStatusFromPackedBoard, getLegalMovesForSquare, validateMoveWithReason } from '../../utils/chessValidator';
import { didMatchStateAdvance, waitForTxOrStateSync } from '../../utils/txSync';
import { multicallContracts } from '../../utils/multicall';
import ParticleBackground from '../../components/shared/ParticleBackground';
import MatchCard from '../../components/shared/MatchCard';
import UserManualV2 from '../components/UserManualV2';
import QuickGuideModal from '../components/QuickGuideModal';
import CenteredErrorFlash from '../components/CenteredErrorFlash';
import MatchEndModal from '../../components/shared/MatchEndModal';
import ActiveMatchAlertModal from '../../components/shared/ActiveMatchAlertModal';
import GameMatchLayout from '../../components/shared/GameMatchLayout';
import TournamentHeader from '../../components/shared/TournamentHeader';
import PlayerActivity from '../../components/shared/PlayerActivity';
import ActiveLobbiesCard from '../../components/shared/ActiveLobbiesCard';
import RecentMatchesCard from '../../components/shared/RecentMatchesCard';
import GamesCard from '../../components/shared/GamesCard';
import BracketScrollHint from '../../components/shared/BracketScrollHint';
import RecentInstanceCard from '../../components/shared/RecentInstanceCard';
import CapturedPieces from '../../components/shared/CapturedPieces';
import UserManualAnchorIcon from '../../components/shared/UserManualAnchorIcon';
import V2GameLobbyIntro from '../../components/shared/V2GameLobbyIntro';
import V2ContractsTable from '../../components/shared/V2ContractsTable';
import PlayerProfileModal from '../../components/shared/PlayerProfileModal';
import WalletBrowserPrompt from '../../components/WalletBrowserPrompt';
import EntryFeeSlider, { DEFAULT_SELECTED_ENTRY_FEE } from '../components/EntryFeeSlider';
import TimeoutSettingSlider, { clampCreateTimeoutValue, isCreateTimeoutField, normalizeCreateTimeouts } from '../components/TimeoutSettingSlider';
import { useInitialDocumentScrollTop } from '../../hooks/useInitialDocumentScrollTop';
import { useWalletBrowserPrompt } from '../../hooks/useWalletBrowserPrompt';
import { isMobileDevice, isWalletBrowser } from '../../utils/mobileDetection';
import { useChessV2PlayerActivity } from '../hooks/useChessV2PlayerActivity';
import { useChessPlayerProfile } from '../hooks/useChessPlayerProfile';
import { useChessV2MatchHistory } from '../hooks/useChessV2MatchHistory';
import { useActiveLobbies } from '../hooks/useActiveLobbies';
import {
  PLAYER_COUNT_OPTIONS,
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
import { normalizePrizeDistribution } from '../lib/prizeDistribution';
import { resolveChessBoardState } from '../lib/matchBoardState';
import { formatActionErrorMessage } from '../lib/actionErrors';

const CHESS_PIECES = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
const VIRTUAL_TIER_ID = 0;
const VIRTUAL_INSTANCE_ID = 0;
const DEFAULT_MATCH_LOADING_MESSAGE = 'Loading match...';

const DEFAULT_CREATE_FORM = {
  playerCount: 2,
  entryFee: DEFAULT_SELECTED_ENTRY_FEE,
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
const HERO_LINKS = [
  { label: 'Quick Guide', type: 'quick-guide' },
  { label: 'User Manual', type: 'manual' },
  { label: 'Visual Demos', type: 'placeholder' },
];

function isWalletAvailable() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

function buildV2MatchKey(roundNumber, matchNumber) {
  return ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);
}

function hydrateBracketMatchData(userAccount, matchInfo, {
  matchData,
  fullMatch,
  boardResult,
  tierConfig,
  timeoutData = null,
  escL2Available = false,
  escL3Available = false,
  isUserAdvancedForRound = false,
}) {
  const { packedBoard, packedState } = resolveChessBoardState(boardResult, matchInfo);
  const board = unpackBoard(packedBoard);
  const tierMatchTime = Number(tierConfig?.timeouts?.matchTimePerPlayer ?? tierConfig?.matchTimePerPlayer ?? 600);
  const player1 = matchData.player1 || matchInfo.player1;
  const player2 = matchData.player2 || matchInfo.player2;
  const matchStatus = Number(matchData.status);
  const lastMoveTime = Number(matchData.lastMoveTime);
  const startTime = Number(matchData.startTime);
  const winner = matchData.matchWinner || matchData.winner;
  const completionReason = Number(matchData.completionReason ?? 0);
  const currentTurn = fullMatch?.currentTurn;
  const firstPlayer = fullMatch?.firstPlayer || player1;
  const p1TimeRaw = Number(fullMatch?.player1TimeRemaining ?? tierMatchTime);
  const p2TimeRaw = Number(fullMatch?.player2TimeRemaining ?? tierMatchTime);
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
  if (timeoutData) {
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
  }

  if (matchStatus === 1 && currentTurn && lastMoveTime > 0) {
    const activePlayerTimeAtLastMove = isP1Turn ? p1TimeRaw : p2TimeRaw;
    const timeoutOccurredAt = lastMoveTime + activePlayerTimeAtLastMove;
    const hasClientDetectedTimeout = elapsed >= activePlayerTimeAtLastMove;
    if (hasClientDetectedTimeout && (!timeoutState || (timeoutState.timeoutActive && timeoutState.escalation1Start === 0 && timeoutState.escalation2Start === 0))) {
      const matchLevel2Delay = Number(tierConfig?.timeouts?.matchLevel2Delay ?? tierConfig?.matchLevel2Delay ?? 180);
      const matchLevel3Delay = Number(tierConfig?.timeouts?.matchLevel3Delay ?? tierConfig?.matchLevel3Delay ?? 360);
      timeoutState = {
        escalation1Start: timeoutOccurredAt + matchLevel2Delay,
        escalation2Start: timeoutOccurredAt + matchLevel3Delay,
        activeEscalation: timeoutState?.activeEscalation ?? 0,
        timeoutActive: true,
        forfeitAmount: timeoutState?.forfeitAmount ?? 0,
      };
    }
  }

  const packedStateBig = BigInt(packedState || 0);
  const whiteInCheck = ((packedStateBig >> 12n) & 1n) === 1n;
  const blackInCheck = ((packedStateBig >> 13n) & 1n) === 1n;
  const moves = movesToPairs(matchData.moves || fullMatch?.moves || '');
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

const ChessBoard = ({ board, packedBoard, packedState, onMove, currentTurn, account, player1, player2, firstPlayer, matchStatus, loading, whiteInCheck, blackInCheck, lastMoveTime, startTime, lastMove, maxSize = 520, ghostMove }) => {
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
      const viewportLimit = window.innerHeight * 0.55;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      setBoardSize(Math.min(viewportLimit, containerWidth, maxSize));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [maxSize]);

  useEffect(() => {
    setSelectedSquare(null);
    setPromotionSquare(null);
    setPendingMove(null);
  }, [packedBoard, packedState]);

  useEffect(() => {
    if (matchStatus !== 1 || !isMyTurn) {
      setSelectedSquare(null);
      setPromotionSquare(null);
      setPendingMove(null);
    }
  }, [isMyTurn, matchStatus]);

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

  const hasPackedPosition = packedBoard != null && packedState != null;
  const legalTargets = selectedSquare !== null && hasPackedPosition
    ? new Set(getLegalMovesForSquare(packedBoard, packedState, getActualIndex(selectedSquare), isWhite))
    : null;

  const handleSquareClick = (displayIdx) => {
    if (matchStatus !== 1 || !isMyTurn || loading || !onMove) return;
    const actualIdx = getActualIndex(displayIdx);
    const piece = board[actualIdx];
    if (selectedSquare === displayIdx) {
      setSelectedSquare(null);
      return;
    }
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
    if (legalTargets && !legalTargets.has(actualIdx)) return;
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
      const isLegalTarget = Boolean(legalTargets?.has(actualIdx));
      const isCaptureTarget = isLegalTarget && pieceType !== 0 && !isMyPiece(piece);
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
        if (isCaptureTarget) return 'inset 0 0 0 2px rgba(34, 211, 238, 0.9), inset 0 0 20px rgba(34, 211, 238, 0.25)';
        return 'none';
      };
      const getPieceGlow = () => !isLastMoveTo || pieceType === 0 ? undefined : (isMyMove ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))' : 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))');
      const squareBg = isSelected
        ? undefined
        : (isKingInCheck ? undefined : (isCaptureTarget ? 'rgba(34, 211, 238, 0.15)' : (getLastMoveFromBg() || getLastMoveToBg())));
      const ghostFromClass = isGhostFrom ? ' ring-2 ring-orange-400/60 ring-inset' : '';
      const ghostToClass = isGhostTo ? ' ring-2 ring-orange-400 ring-inset' : '';

      squares.push(
        <div
          key={displayIdx}
          onClick={() => handleSquareClick(displayIdx)}
          className={`relative flex items-center justify-center cursor-pointer transition-all duration-200 ${isLight ? 'bg-stone-300' : 'bg-stone-700'}${isSelected ? ' ring-2 ring-emerald-400 ring-inset bg-emerald-500/50' : ''}${isKingInCheck ? ' bg-red-500/50 ring-2 ring-red-400 ring-inset' : ''}${isLegalTarget && !isCaptureTarget ? ' bg-cyan-400/10' : ''} ${getLastMoveFromClass()} ${getLastMoveToClass()}${ghostFromClass}${ghostToClass}${isMyTurn && isMyPiece(piece) && !isSelected ? ' hover:bg-emerald-500/30' : ''}${isMyTurn && isLegalTarget ? ' hover:bg-cyan-400/20' : ''}`}
          style={{ boxShadow: isSelected ? 'inset 0 0 20px rgba(16, 185, 129, 0.5)' : getLastMoveShadow(), background: isGhostTo ? 'rgba(251, 146, 60, 0.25)' : squareBg }}
        >
          {getPieceSvg(piece) && <img src={getPieceSvg(piece)} alt="" className={`w-3/4 h-3/4 select-none transition-all duration-300 ${isSelected ? 'scale-110' : ''}${isGhostFrom ? ' opacity-30' : ''}`} style={{ filter: getPieceGlow() }} draggable="false" />}
          {isGhostTo && ghostPiece && getPieceSvg(ghostPiece) && <img src={getPieceSvg(ghostPiece)} alt="" className="w-3/4 h-3/4 select-none absolute animate-pulse" style={{ opacity: 0.4 }} draggable="false" />}
          {isLegalTarget && !isCaptureTarget && <div className="absolute w-3.5 h-3.5 rounded-full bg-cyan-300/80 shadow-[0_0_12px_rgba(103,232,249,0.65)] pointer-events-none" />}
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
        <div className="relative rounded-xl overflow-hidden" style={{ width: boardSize || 400, height: boardSize || 400, minWidth: 248, minHeight: 248, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
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
        <div className="hidden md:block mt-3 text-center py-2 px-6 rounded-full text-red-300 font-semibold text-sm animate-pulse" style={{ ...(boardSize ? { width: boardSize } : { maxWidth: '100%' }), background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
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

function createInitialChessBoard() {
  const board = Array.from({ length: 64 }, () => ({ pieceType: 0, color: 0 }));

  for (let i = 8; i < 16; i++) board[i] = { pieceType: 1, color: 1 };
  board[0] = { pieceType: 4, color: 1 };
  board[7] = { pieceType: 4, color: 1 };
  board[1] = { pieceType: 2, color: 1 };
  board[6] = { pieceType: 2, color: 1 };
  board[2] = { pieceType: 3, color: 1 };
  board[5] = { pieceType: 3, color: 1 };
  board[3] = { pieceType: 5, color: 1 };
  board[4] = { pieceType: 6, color: 1 };

  for (let i = 48; i < 56; i++) board[i] = { pieceType: 1, color: 2 };
  board[56] = { pieceType: 4, color: 2 };
  board[63] = { pieceType: 4, color: 2 };
  board[57] = { pieceType: 2, color: 2 };
  board[62] = { pieceType: 2, color: 2 };
  board[58] = { pieceType: 3, color: 2 };
  board[61] = { pieceType: 3, color: 2 };
  board[59] = { pieceType: 5, color: 2 };
  board[60] = { pieceType: 6, color: 2 };

  return board;
}

function buildReplayChessBoard(moveHistory, effectiveMoveIndex, fallbackBoard) {
  if (effectiveMoveIndex >= moveHistory.length - 1) {
    return fallbackBoard;
  }

  const board = createInitialChessBoard();
  for (let i = 0; i <= effectiveMoveIndex && i < moveHistory.length; i++) {
    const move = moveHistory[i];
    if (move.from >= 0 && move.from < 64 && move.to >= 0 && move.to < 64) {
      board[move.to] = board[move.from];
      board[move.from] = { pieceType: 0, color: 0 };
    }
  }

  return board;
}

const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onResetEnrollmentWindow, onCancelTournament, onEnroll, onConnectWallet, account, loading, connectLoading, syncDots, isEnrolled, entryFee, isFull, instanceContract, onPlayerAddressClick }) => {
  const { status, currentRound, enrolledCount, rounds, playerCount, players, enrollmentTimeout } = tournamentData;
  const bracketViewRef = useRef(null);
  const prevStatusRef = useRef(status);
  const totalRounds = Math.ceil(Math.log2(playerCount));
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);
  const enrollmentWindowDeadline = status === 0 && enrolledCount > 0
    ? Number(enrollmentTimeout?.escalation1Start ?? 0)
    : 0;

  useEffect(() => {
    if (prevStatusRef.current === 0 && status === 1 && isEnrolled && bracketViewRef.current) {
      const timer = setTimeout(() => bracketViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' }), 300);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status, isEnrolled]);

  const hasValidRounds = rounds && rounds.length > 0 && rounds.some(round => round.matches && round.matches.length > 0 && round.matches.some(match => match.player1 && match.player1 !== ethers.ZeroAddress));

  return (
    <div className="mb-16">
      <TournamentHeader
        gameType="chess"
        reasonLabelMode="v2"
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
        payoutEntries={tournamentData.payoutEntries}
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
        statusTimerTarget={enrollmentWindowDeadline}
        enrollmentTimeout={enrollmentTimeout}
        onManualStart={onManualStart ? () => onManualStart(VIRTUAL_TIER_ID, VIRTUAL_INSTANCE_ID) : null}
        onClaimAbandonedPool={onClaimAbandonedPool ? () => onClaimAbandonedPool(VIRTUAL_TIER_ID, VIRTUAL_INSTANCE_ID) : null}
        onResetEnrollmentWindow={onResetEnrollmentWindow ? () => onResetEnrollmentWindow(VIRTUAL_TIER_ID, VIRTUAL_INSTANCE_ID) : null}
        onCancelTournament={onCancelTournament ? () => onCancelTournament(VIRTUAL_TIER_ID, VIRTUAL_INSTANCE_ID) : null}
        forceShowResetEnrollmentWindow={Boolean(status === 0 && enrolledCount === 1 && isEnrolled)}
        contract={instanceContract}
        onPlayerAddressClick={onPlayerAddressClick}
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
                        reasonLabelMode="v2"
                        tournamentCompletionReason={tournamentData.completionReason}
                        totalMatchesInRound={round.matches.length}
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
                <RecentInstanceCard tierId={VIRTUAL_TIER_ID} instanceId={VIRTUAL_INSTANCE_ID} contract={instanceContract} tierName={tournamentTypeLabel} walletAddress={account} reasonLabelMode="v2" />
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
  useInitialDocumentScrollTop('/chess');

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const rpcProviderRef = useRef(null);
  const pendingScrollAddressRef = useRef(null);
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
  const [isCreateFormExpanded, setIsCreateFormExpanded] = useState(false);
  const [shouldRenderCreateFormBody, setShouldRenderCreateFormBody] = useState(false);
  const [isCreateFormBodyVisible, setIsCreateFormBodyVisible] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState(false);
  const [heroLinkNoticeVisible, setHeroLinkNoticeVisible] = useState(false);
  const heroLinkNoticeTimeoutRef = useRef(null);
  const hadConnectedAccountRef = useRef(false);

  const handlePlaceholderLinkClick = useCallback((event) => {
    event.preventDefault();
    if (heroLinkNoticeTimeoutRef.current) {
      clearTimeout(heroLinkNoticeTimeoutRef.current);
    }
    setHeroLinkNoticeVisible(true);
    heroLinkNoticeTimeoutRef.current = window.setTimeout(() => {
      setHeroLinkNoticeVisible(false);
      heroLinkNoticeTimeoutRef.current = null;
    }, 1800);
  }, []);

  useEffect(() => () => {
    if (heroLinkNoticeTimeoutRef.current) {
      clearTimeout(heroLinkNoticeTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const hasAccount = Boolean(account);
    if (hasAccount && !hadConnectedAccountRef.current) {
      setIsCreateFormExpanded(true);
    }
    hadConnectedAccountRef.current = hasAccount;
  }, [account]);

  useEffect(() => {
    let timeoutId = null;
    let frameId = null;

    if (isCreateFormExpanded) {
      setShouldRenderCreateFormBody(true);
      frameId = window.requestAnimationFrame(() => {
        setIsCreateFormBodyVisible(true);
      });
    } else if (shouldRenderCreateFormBody) {
      setIsCreateFormBodyVisible(false);
      timeoutId = window.setTimeout(() => {
        setShouldRenderCreateFormBody(false);
      }, 220);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isCreateFormExpanded, shouldRenderCreateFormBody]);

  const handleQuickGuideLinkClick = useCallback((event) => {
    event.preventDefault();
    if (heroLinkNoticeTimeoutRef.current) {
      clearTimeout(heroLinkNoticeTimeoutRef.current);
      heroLinkNoticeTimeoutRef.current = null;
    }
    setHeroLinkNoticeVisible(false);
    setIsQuickGuideOpen(true);
  }, []);

  const handleUserManualLinkClick = useCallback((event) => {
    event.preventDefault();
    if (heroLinkNoticeTimeoutRef.current) {
      clearTimeout(heroLinkNoticeTimeoutRef.current);
      heroLinkNoticeTimeoutRef.current = null;
    }
    setHeroLinkNoticeVisible(false);
    window.dispatchEvent(new CustomEvent('open-user-manual', {
      detail: { targetHash: '11-what-is-etour' },
    }));
    window.requestAnimationFrame(() => {
      const manualSection = document.getElementById('user-manual');
      manualSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const dismissActionError = useCallback(() => {
    setActionState(prev => (prev.type === 'error' ? { type: 'info', message: '' } : prev));
  }, []);

  const showActionError = useCallback((actionLabel, error, fallback = 'Transaction failed.') => {
    setActionState({
      type: 'error',
      message: formatActionErrorMessage(actionLabel, getReadableError(error, fallback), fallback),
    });
  }, []);

  const selectedAddress = searchParams.get('instance');
  const explorerUrl = getAddressUrl(factoryAddress);
  const [hasProcessedInviteParam, setHasProcessedInviteParam] = useState(false);
  const [allowInitialUrlHydration, setAllowInitialUrlHydration] = useState(() => !shouldResetOnInitialDocumentLoad('/chess', { allowInviteParam: true }));
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [activeInstanceContract, setActiveInstanceContract] = useState(null);

  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchLoadingMessage, setMatchLoadingMessage] = useState(DEFAULT_MATCH_LOADING_MESSAGE);
  const [moveHistory, setMoveHistory] = useState([]);
  const [replayMoveIndex, setReplayMoveIndex] = useState(-2); // -2 final, -1 start, 0+ move index
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
  const [selectedProfileAddress, setSelectedProfileAddress] = useState(null);
  const [isTabActive, setIsTabActive] = useState(typeof document === 'undefined' ? true : !document.hidden);
  const isPlayerActivityContextActive = Boolean(activeInstanceContract || viewingTournament || currentMatch);
  const shouldPollPlayerActivity = Boolean(account) && isTabActive;
  const shouldScanFactoryForPlayerActivity = Boolean(account) && isTabActive && (expandedPanel === 'playerActivity' || isPlayerActivityContextActive);
  const shouldPollPlayerProfile = Boolean(account) && isTabActive && expandedPanel === 'recentMatches';
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [alertMatch, setAlertMatch] = useState(null);
  const [gamesCardHeight, setGamesCardHeight] = useState(0);
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);
  const [recentMatchesCardHeight, setRecentMatchesCardHeight] = useState(0);

  const { showPrompt, handleWalletChoice, handleContinueChoice, triggerWalletPrompt } = useWalletBrowserPrompt();

  const playerActivity = useChessV2PlayerActivity(activeInstanceContract, account, resolvedFactoryContract, rpcProvider, {
    enabled: shouldPollPlayerActivity,
    pollIntervalMs: shouldScanFactoryForPlayerActivity ? 5000 : 30000,
    scanFactoryFallback: shouldScanFactoryForPlayerActivity,
    hasActiveContext: isPlayerActivityContextActive,
    pollWhenEmpty: false,
  });
  const playerProfile = useChessPlayerProfile(resolvedFactoryContract, rpcProvider, account, {
    enabled: shouldPollPlayerProfile,
    pollIntervalMs: 8000,
  });
  const v2MatchHistory = useChessV2MatchHistory(resolvedFactoryContract, rpcProvider, account, {
    enabled: shouldPollPlayerProfile,
    pollIntervalMs: 8000,
  });
  const refreshHistoryPanel = useCallback(() => {
    playerProfile.refetch();
    v2MatchHistory.refetch();
  }, [playerProfile.refetch, v2MatchHistory.refetch]);
  const activeLobbies = useActiveLobbies(
    resolvedFactoryContract,
    rpcProvider,
    account,
    getInstanceContract,
    {
      enabled: expandedPanel === 'activeLobbies',
      pollIntervalMs: 3000,
    }
  );

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
    const provider = new ethers.JsonRpcProvider(
      CURRENT_NETWORK.rpcUrl,
      CURRENT_NETWORK.chainId,
      { staticNetwork: true }
    );
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        params: [getWalletAddChainParams()],
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
        setCreateForm(prev => ({ ...prev, entryFee: DEFAULT_SELECTED_ENTRY_FEE }));
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

  const buildBracketData = async (address, instanceCont = null) => {
    const runner = getReadRunner();
    const instance = instanceCont || getInstanceContract(address, runner);

    const baseCallSpecs = [
      { contract: instance, functionName: 'getInstanceInfo' },
      { contract: instance, functionName: 'tournament' },
      { contract: instance, functionName: 'getPlayers' },
      { contract: instance, functionName: 'getPrizeDistribution' },
      { contract: instance, functionName: 'getBracket' },
      { contract: instance, functionName: 'tierConfig' },
    ];
    if (account) {
      baseCallSpecs.push({ contract: instance, functionName: 'isEnrolled', params: [account] });
    }

    const baseResults = await multicallContracts(baseCallSpecs, runner);
    const info = baseResults[0]?.success ? baseResults[0].result : await instance.getInstanceInfo();
    const tournament = baseResults[1]?.success ? baseResults[1].result : await instance.tournament();
    const players = baseResults[2]?.success ? baseResults[2].result : await instance.getPlayers();
    const prizeDistribution = baseResults[3]?.success ? baseResults[3].result : await instance.getPrizeDistribution();
    const bracket = baseResults[4]?.success ? baseResults[4].result : await instance.getBracket();
    const tierConfig = baseResults[5]?.success ? baseResults[5].result : await instance.tierConfig();
    const enrolled = account
      ? (baseResults[6]?.success ? baseResults[6].result : await instance.isEnrolled(account))
      : false;

    const totalRounds = Number(bracket.totalRounds);
    const roundDescriptors = Array.from({ length: totalRounds }, (_, roundIndex) => ({
      roundIndex,
      matchCount: Number(bracket.matchCounts[roundIndex] || 0),
      completedCount: Number(bracket.completedCounts[roundIndex] || 0),
    }));

    const advancedRoundCallSpecs = account
      ? roundDescriptors
        .filter(({ matchCount }) => matchCount > 0)
        .map(({ roundIndex }) => ({
          contract: instance,
          functionName: 'isPlayerInAdvancedRound',
          params: [roundIndex, account],
        }))
      : [];

    const matchDescriptors = [];
    const matchCallSpecs = [];
    for (const { roundIndex, matchCount } of roundDescriptors) {
      for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
        const matchKey = buildV2MatchKey(roundIndex, matchIndex);
        matchDescriptors.push({ roundIndex, matchIndex });
        matchCallSpecs.push(
          { contract: instance, functionName: 'getMatch', params: [roundIndex, matchIndex] },
          { contract: instance, functionName: 'matches', params: [matchKey] },
          { contract: instance, functionName: 'getBoard', params: [roundIndex, matchIndex] },
          { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
          { contract: instance, functionName: 'isMatchEscL2Available', params: [roundIndex, matchIndex] },
          { contract: instance, functionName: 'isMatchEscL3Available', params: [roundIndex, matchIndex] },
        );
      }
    }

    const activityCallSpecs = [...advancedRoundCallSpecs, ...matchCallSpecs];
    const activityResults = activityCallSpecs.length > 0
      ? await multicallContracts(activityCallSpecs, runner)
      : [];
    const advancedRoundResults = activityResults.slice(0, advancedRoundCallSpecs.length);
    const matchResults = activityResults.slice(advancedRoundCallSpecs.length);

    const advancedByRound = new Map();
    let advancedCursor = 0;
    for (const { roundIndex, matchCount } of roundDescriptors) {
      if (!account || matchCount === 0) continue;
      const result = advancedRoundResults[advancedCursor++];
      advancedByRound.set(roundIndex, Boolean(result?.success ? result.result : false));
    }

    const matchesByRound = new Map();
    let matchCursor = 0;
    for (const { roundIndex, matchIndex } of matchDescriptors) {
      const matchResult = matchResults[matchCursor++];
      const fullMatchResult = matchResults[matchCursor++];
      const boardResult = matchResults[matchCursor++];
      const timeoutResult = matchResults[matchCursor++];
      const escL2Result = matchResults[matchCursor++];
      const escL3Result = matchResults[matchCursor++];

      if (!matchResult?.success) continue;

      const matchData = matchResult.result;
      const rawBoardResult = boardResult?.success ? boardResult.result : null;
      const packedBoard = Array.isArray(rawBoardResult) ? rawBoardResult[0] : rawBoardResult?.board;
      const packedState = Array.isArray(rawBoardResult) ? rawBoardResult[1] : rawBoardResult?.state;
      const normalized = normalizeMatch(roundIndex, matchIndex, matchData, packedBoard, packedState);
      const hydrated = hydrateBracketMatchData(account, normalized, {
        matchData,
        fullMatch: fullMatchResult?.success ? fullMatchResult.result : null,
        boardResult: rawBoardResult,
        tierConfig,
        timeoutData: timeoutResult?.success ? timeoutResult.result : null,
        escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
        escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
        isUserAdvancedForRound: advancedByRound.get(roundIndex) || false,
      });

      const roundMatches = matchesByRound.get(roundIndex) || [];
      roundMatches.push({ ...hydrated, tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID });
      matchesByRound.set(roundIndex, roundMatches);
    }

    const rounds = roundDescriptors.map(({ roundIndex, matchCount, completedCount }) => ({
      roundIndex,
      matchCount,
      completedCount,
      label: getRoundLabel(roundIndex, totalRounds),
      matches: matchesByRound.get(roundIndex) || [],
    }));

    const snapshot = normalizeInstanceSnapshot(address, info, tournament, players, enrolled);
    return {
      ...snapshot,
      payoutEntries: normalizePrizeDistribution(prizeDistribution),
      rounds,
      tierId: VIRTUAL_TIER_ID,
      instanceId: VIRTUAL_INSTANCE_ID,
    };
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
      showActionError('connect your wallet', error, 'Wallet connection failed.');
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
    setSearchParams(next, { replace: true });
  };
  const updateCreateForm = (field, value) => setCreateForm(prev => ({
    ...prev,
    [field]: isCreateTimeoutField(field) ? clampCreateTimeoutValue(field, value) : value,
  }));
  const setPlayerCount = (playerCount) => setCreateForm(prev => ({
    ...prev,
    playerCount,
    ...normalizeCreateTimeouts(getDefaultTimeouts(playerCount)),
  }));

  const enterInstanceBracket = useCallback(async (address) => {
    if (!address) return;
    try {
      setCurrentMatch(null);
      setMoveHistory([]);
      setIsSpectator(false);
      setMoveTxTimeout(null);
      setMatchEndResult(null);
      setMatchEndWinner(null);
      setMatchEndLoser(null);
      setMatchEndWinnerLabel('');
      previousBoardRef.current = null;
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(address);
      if (bracketData) {
        pendingScrollAddressRef.current = address;
        const instance = getInstanceContract(address, getReadRunner());
        setActiveInstanceContract(instance);
        activeInstanceContractRef.current = instance;
        setViewingTournament(bracketData);
        skipNavEffectRef.current = true;
        navigate('/chess', { replace: false, state: { view: 'bracket', instanceAddress: address, from: location.state?.view || 'landing' } });
      }
    } catch (error) {
      console.error('[ChessV2] Error entering bracket:', error);
    } finally {
      setTournamentsLoading(false);
    }
  }, [refreshTournamentBracket, navigate, location.state?.view]);

  useEffect(() => {
    const pendingAddress = pendingScrollAddressRef.current;
    if (!pendingAddress || !viewingTournament || viewingTournament.address !== pendingAddress) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      tournamentBracketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      collapseActivityPanelRef.current?.();
      pendingScrollAddressRef.current = null;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [viewingTournament]);

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
    navigate('/chess', { replace: true, state: null });
  }, [allowInitialUrlHydration, navigate]);

  useEffect(() => {
    if (allowInitialUrlHydration) return;
    if (location.pathname !== '/chess' || location.search || location.state) return;
    setAllowInitialUrlHydration(true);
  }, [allowInitialUrlHydration, location.pathname, location.search, location.state]);

  const createInstance = async (event) => {
    event.preventDefault();
    if (!browserProvider || !account) { setActionState({ type: 'error', message: 'Connect a wallet before creating an instance.' }); return; }
    setCreateLoading(true);
    setActionState({ type: 'info', message: 'Submitting createInstance transaction...' });
    try {
      const normalizedTimeouts = normalizeCreateTimeouts(createForm);
      setCreateForm(prev => ({ ...prev, ...normalizedTimeouts }));
      const signer = await browserProvider.getSigner();
      const creator = await signer.getAddress();
      const readFactory = await resolveFactoryContract();
      const resolvedFactoryAddress = readFactory.target;
      const writableFactory = getFactoryContract(signer, resolvedFactoryAddress);
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
      const tx = await writableFactory.createInstance(Number(createForm.playerCount), entryFeeWei, BigInt(normalizedTimeouts.enrollmentWindow), BigInt(normalizedTimeouts.matchTimePerPlayer), BigInt(normalizedTimeouts.timeIncrementPerMove), { value: entryFeeWei });
      setActionState({ type: 'info', message: 'Transaction submitted. Waiting for block confirmation...' });
      const receipt = await tx.wait();
      setActionState({ type: 'info', message: 'Transaction confirmed. Locating the new instance and syncing tournament data...' });
      const address = await resolveCreatedInstanceAddress({ factory: readFactory, provider: getReadRunner(), creator, playerCount: Number(createForm.playerCount), entryFeeWei, countBefore, receipt });
      if (!address) throw new Error('Transaction mined, but the frontend could not locate the created instance.');
      const createdInstance = getInstanceContract(address, getReadRunner());
      const creatorEnrolled = await createdInstance.isEnrolled(creator).catch(() => false);
      if (!creatorEnrolled) throw new Error(`Instance created at ${address}, but creator enrollment was not confirmed.`);
      setActionState({ type: 'success', message: `Instance created and enrollment verified on-chain at ${address}.` });
      await refreshDashboard();
      await enterInstanceBracket(address);
    } catch (error) {
      console.error('[ChessV2 createInstance] raw error:', error);
      showActionError('create this lobby', error, 'Could not create instance.');
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
      showActionError('join this lobby', error, 'Enrollment failed.');
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket, showActionError]);

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
      if (enrolledCount < 2) {
        alert('Solo-enrolled tournaments can no longer be force-started. Cancel the tournament or reset the enrollment window instead.');
        return;
      }
      const isEnrolled = await activeInstanceContract.isEnrolled(account);
      if (!isEnrolled) { alert('You must be enrolled to force-start.'); return; }
      const msg = `Force-starting with ${enrolledCount} players.${forfeitPool > 0n ? ` Forfeit pool of ${ethers.formatEther(forfeitPool)} ETH will be distributed.` : ''} Continue?`;
      if (!window.confirm(msg)) return;
      setActionState({ type: 'info', message: 'Confirm the force-start transaction in MetaMask...' });
      const tx = await writableInstance.forceStartTournament();
      setActionState({ type: 'info', message: 'Force-start submitted. Waiting for block confirmation...' });
      await tx.wait();
      setActionState({ type: 'info', message: 'Force-start confirmed. Refreshing tournament state...' });
      alert('Tournament force-started successfully!');
      const updated = await refreshTournamentBracket(viewingTournament.address);
      if (updated) setViewingTournament(updated);
      setActionState({ type: 'success', message: 'Tournament state refreshed after the force-start transaction.' });
    } catch (error) {
      console.error('[ChessV2] Force start error:', error);
      showActionError('force-start this tournament', error, 'Could not force-start this tournament.');
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket, showActionError]);

  const handleCancelTournament = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) { alert('Please connect your wallet first.'); return; }
    try {
      setTournamentsLoading(true);
      const tournamentData = await activeInstanceContract.tournament();
      const status = Number(tournamentData.status);
      const enrolledCount = Number(tournamentData.enrolledCount);
      const isEnrolled = await activeInstanceContract.isEnrolled(account);
      if (status !== 0) { alert('Tournament has already started, completed, or been cancelled.'); return; }
      if (!isEnrolled || enrolledCount !== 1) { alert('Only the sole enrolled player can cancel this tournament.'); return; }
      const entryFee = tournamentData.entryFee ?? viewingTournament.entryFeeWei ?? 0n;
      if (!window.confirm(`Cancel this tournament and refund your ${ethers.formatEther(entryFee)} ETH entry fee?\n\nThis will be recorded as an EL0 cancellation.`)) return;
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      setActionState({ type: 'info', message: 'Confirm the tournament cancellation in MetaMask...' });
      const tx = await writableInstance.cancelTournament();
      setActionState({ type: 'info', message: 'Cancellation submitted. Waiting for block confirmation...' });
      await tx.wait();
      setActionState({ type: 'success', message: 'Tournament cancelled and refund recorded on-chain.' });
      alert('Tournament cancelled successfully!');
      skipNavEffectRef.current = true;
      setViewingTournament(null);
      setCurrentMatch(null);
      setActiveInstanceContract(null);
      activeInstanceContractRef.current = null;
      navigate('/chess', { replace: true, state: null });
    } catch (error) {
      console.error('[ChessV2] Cancel tournament error:', error);
      showActionError('cancel this tournament', error, 'Could not cancel this tournament.');
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, navigate, showActionError]);

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
      showActionError('reset the enrollment window', error, 'Could not reset the enrollment window.');
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket, showActionError]);

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
      showActionError('claim the abandoned pool', error, 'Could not claim the abandoned pool.');
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, showActionError]);

  const handleBackToTournaments = async () => {
    skipNavEffectRef.current = true;
    setViewingTournament(null);
    setCurrentMatch(null);
    setActiveInstanceContract(null);
    activeInstanceContractRef.current = null;
    navigate('/chess', { replace: true, state: null });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const buildMoveHistory = useCallback((movesString, firstPlayer, player1, player2) => {
    if (!movesString) return [];

    const moves = movesToPairs(movesString);
    return moves.map((move, idx) => {
      const isFirstMove = idx % 2 === 0;
      const movePlayer = isFirstMove ? firstPlayer : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
      return {
        player: isFirstMove ? '♔' : '♚',
        move: `${indexToChessNotation(move.from)}→${indexToChessNotation(move.to)}`,
        from: move.from,
        to: move.to,
        promotion: 0,
        address: movePlayer,
      };
    });
  }, []);

  const applyMoveHistoryUpdate = useCallback((history) => {
    setMoveHistory(prev => {
      if (!Array.isArray(history)) return prev;
      if (history.length === 0 && prev.length > 0) return prev;
      return history;
    });
  }, []);

  useEffect(() => {
    if (!currentMatch || currentMatch.matchStatus !== 2) {
      setReplayMoveIndex(-2);
    }
  }, [currentMatch?.instanceAddress, currentMatch?.roundNumber, currentMatch?.matchNumber, currentMatch?.matchStatus]);

  const effectiveReplayMoveIndex = replayMoveIndex === -2 ? moveHistory.length - 1 : replayMoveIndex;
  const displayedBoard = currentMatch
    ? (currentMatch.matchStatus === 2 && moveHistory.length > 0
      ? buildReplayChessBoard(moveHistory, effectiveReplayMoveIndex, currentMatch.board)
      : currentMatch.board)
    : null;
  const replayCheckStatus = displayedBoard
    ? getCheckStatusFromPackedBoard(boardArrayToPackedBoard(displayedBoard))
    : { whiteInCheck: false, blackInCheck: false };
  const displayedLastMove = currentMatch?.matchStatus === 2
    ? (effectiveReplayMoveIndex >= 0 && moveHistory[effectiveReplayMoveIndex]
      ? {
          from: moveHistory[effectiveReplayMoveIndex].from,
          to: moveHistory[effectiveReplayMoveIndex].to,
          isMyMove: moveHistory[effectiveReplayMoveIndex].address?.toLowerCase() === currentMatch.firstPlayer?.toLowerCase(),
        }
      : null)
    : currentMatch?.lastMove ?? null;

  const refreshMatchData = useCallback(async (instanceCont, userAccount, matchInfo) => {
    try {
      const { roundNumber, matchNumber } = matchInfo;
      const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);
      const runner = getReadRunner();
      const callSpecs = [
        { contract: instanceCont, functionName: 'getMatch', params: [roundNumber, matchNumber] },
        { contract: instanceCont, functionName: 'matches', params: [matchKey] },
        { contract: instanceCont, functionName: 'getBoard', params: [roundNumber, matchNumber] },
        { contract: instanceCont, functionName: 'tierConfig' },
        { contract: instanceCont, functionName: 'getInstanceInfo' },
        { contract: instanceCont, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instanceCont, functionName: 'isMatchEscL2Available', params: [roundNumber, matchNumber] },
        { contract: instanceCont, functionName: 'isMatchEscL3Available', params: [roundNumber, matchNumber] },
      ];
      if (userAccount) {
        callSpecs.push({
          contract: instanceCont,
          functionName: 'isPlayerInAdvancedRound',
          params: [roundNumber, userAccount],
        });
      }
      const results = runner ? await multicallContracts(callSpecs, runner) : [];
      const matchData = results[0]?.success ? results[0].result : await instanceCont.getMatch(roundNumber, matchNumber);
      const fullMatch = results[1]?.success ? results[1].result : await instanceCont.matches(matchKey);
      const boardResult = results[2]?.success ? results[2].result : await instanceCont.getBoard(roundNumber, matchNumber).catch(() => null);
      const tierConfig = results[3]?.success ? results[3].result : await instanceCont.tierConfig();
      const instanceInfo = results[4]?.success ? results[4].result : await instanceCont.getInstanceInfo().catch(() => null);
      const timeoutData = results[5]?.success ? results[5].result : await instanceCont.matchTimeouts(matchKey).catch(() => null);
      const escL2Available = results[6]?.success ? Boolean(results[6].result) : Boolean(await instanceCont.isMatchEscL2Available(roundNumber, matchNumber).catch(() => false));
      const escL3Available = results[7]?.success ? Boolean(results[7].result) : Boolean(await instanceCont.isMatchEscL3Available(roundNumber, matchNumber).catch(() => false));
      const isUserAdvancedForRound = userAccount
        ? (results[8]?.success ? Boolean(results[8].result) : Boolean(await instanceCont.isPlayerInAdvancedRound(roundNumber, userAccount).catch(() => false)))
        : false;
      const playerCount = Number(instanceInfo?.playerCount ?? matchInfo.playerCount ?? 0) || null;
      const { packedBoard, packedState } = resolveChessBoardState(boardResult, matchInfo);
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
      if (timeoutData) {
        const esc1Start = Number(timeoutData.escalation1Start);
        const esc2Start = Number(timeoutData.escalation2Start);
        if (esc1Start > 0 || esc2Start > 0 || timeoutData.isStalled) {
          timeoutState = { escalation1Start: esc1Start, escalation2Start: esc2Start, activeEscalation: Number(timeoutData.activeEscalation), timeoutActive: timeoutData.isStalled, forfeitAmount: 0 };
        }
      }

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
        playerCount,
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
        movesString: matchData.moves || fullMatch.moves || '',
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
      const updated = await refreshMatchData(instanceCont, account, { tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID, roundNumber, matchNumber, playerCount: viewingTournament?.playerCount ?? null, prizePool: viewingTournament?.prizePoolWei || 0n, instanceAddress });
      if (updated) {
        setIsSpectator(!(updated.player1?.toLowerCase() === account.toLowerCase() || updated.player2?.toLowerCase() === account.toLowerCase()));
        setCurrentMatch(updated);
        previousBoardRef.current = JSON.stringify(updated.board);
        setMatchEndResult(null);
        setMatchEndWinner(null);
        setMatchEndLoser(null);
        setMatchEndWinnerLabel('');
        matchEndModalShownRef.current = updated.matchStatus === 2;
        setMoveHistory(buildMoveHistory(updated.movesString, updated.firstPlayer, updated.player1, updated.player2));
        skipNavEffectRef.current = true;
        navigate('/chess', { replace: false, state: { view: 'match', instanceAddress, roundNumber, matchNumber, from: location.state?.view || 'bracket' } });
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
  }, [account, viewingTournament, refreshMatchData, buildMoveHistory, navigate, location.state?.view]);

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
        if (updated.matchStatus === 2 && !matchEndModalShownRef.current) {
          const reasonNum = updated.completionReason || 0;
          const isMatchDraw = isDraw(reasonNum);
          const winnerAddress = updated.winner?.toLowerCase();
          const loserAddress = updated.loser?.toLowerCase();
          const zeroAddress = ethers.ZeroAddress.toLowerCase();

          if (isMatchDraw || (winnerAddress && loserAddress && winnerAddress !== zeroAddress && loserAddress !== zeroAddress)) {
            const userIsWinner = !isMatchDraw && winnerAddress === account.toLowerCase();
            let resultType = 'lose';
            if (isMatchDraw) resultType = 'draw';
            else if (userIsWinner) resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_win' : 'win';
            else resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_lose' : 'lose';

            matchEndModalShownRef.current = true;
            setMatchEndResult({ result: resultType, completionReason: reasonNum });
            setMatchEndWinner(updated.winner);
            setMatchEndLoser(updated.loser);

            if (userIsWinner) setTimeout(() => checkForNextActiveMatch(), 500);
          }
        }
      }
      setActionState({
        type: syncResult.synced ? 'success' : 'info',
        message: syncResult.synced
          ? 'Move confirmed and reflected in the match state.'
          : 'Move confirmed on-chain. The match UI is still syncing and should update shortly.',
      });

      if (updated) {
        try {
          applyMoveHistoryUpdate(buildMoveHistory(updated.movesString, updated.firstPlayer, updated.player1, updated.player2));
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
      if (error?.code === 'TX_FAILED_ONCHAIN' || errorString.includes('TX_FAILED_ONCHAIN')) {
        setActionState({
          type: 'error',
          message: 'Your move transaction failed after submission in your wallet provider. Your move was not recorded. If your wallet shows the transaction failed, network gas may still have been spent. Please submit your move again.',
        });
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

  const closeMatch = useCallback(async () => {
    const address = currentMatch?.instanceAddress || viewingTournament?.address;
    setCurrentMatch(null);
    setMoveHistory([]);
    setIsSpectator(false);
    setMoveTxTimeout(null);
    setMatchEndResult(null);
    setMatchEndWinner(null);
    setMatchEndLoser(null);
    setMatchEndWinnerLabel('');
    previousBoardRef.current = null;
    if (!address) {
      skipNavEffectRef.current = true;
      navigate('/chess', { replace: true, state: null });
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }
    pendingScrollAddressRef.current = address;
    skipNavEffectRef.current = true;
    navigate('/chess', {
      replace: true,
      state: { view: 'bracket', instanceAddress: address, from: 'match' },
    });
    window.requestAnimationFrame(() => {
      tournamentBracketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    setTournamentsLoading(true);
    const bracketData = await refreshTournamentBracket(address);
    if (bracketData) setViewingTournament(bracketData);
    setTournamentsLoading(false);
  }, [currentMatch?.instanceAddress, viewingTournament?.address, refreshTournamentBracket, navigate]);

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
  const handleReturnToBracket = useCallback(() => closeMatch(), [closeMatch]);

  useEffect(() => { currentMatchRef.current = currentMatch; }, [currentMatch]);
  useEffect(() => { accountRefForMatch.current = account; }, [account]);
  useEffect(() => { tournamentRef.current = viewingTournament; }, [viewingTournament]);
  useEffect(() => { activeInstanceContractRef.current = activeInstanceContract; }, [activeInstanceContract]);

  useEffect(() => {
    if (!viewingTournament || !activeInstanceContractRef.current) return;
    if (currentMatch) return;
    if (!isTabActive) return;
    if (![0, 1].includes(Number(viewingTournament.status))) return;
    const doSync = async () => {
      const tournament = tournamentRef.current;
      if (!tournament || !activeInstanceContractRef.current) return;
      if (currentMatchRef.current) return;
      if (![0, 1].includes(Number(tournament.status))) return;
      const updated = await refreshTournamentBracket(tournament.address);
      if (updated) setViewingTournament(updated);
      setBracketSyncDots(1);
    };
    const pollInterval = setInterval(doSync, 5000);
    return () => clearInterval(pollInterval);
  }, [viewingTournament?.address, viewingTournament?.status, currentMatch?.instanceAddress, isTabActive, refreshTournamentBracket]);

  useEffect(() => {
    if (!currentMatch || currentMatch.matchStatus === 2 || !activeInstanceContractRef.current || !account) return;
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
            const finalHistory = buildMoveHistory(updatedMatch.movesString, updatedMatch.firstPlayer, updatedMatch.player1, updatedMatch.player2);
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
        if (boardChanged) applyMoveHistoryUpdate(buildMoveHistory(updatedMatch.movesString, updatedMatch.firstPlayer, updatedMatch.player1, updatedMatch.player2));
        previousBoardRef.current = JSON.stringify(updatedMatch.board);
      } catch (error) {
        console.error('[ChessV2 Polling] Error syncing match:', error);
      }
      setSyncDots(1);
    };
    doMatchSyncRef.current = doMatchSync;
    const id = setInterval(doMatchSync, 5000);
    return () => clearInterval(id);
  }, [currentMatch?.instanceAddress, currentMatch?.roundNumber, currentMatch?.matchNumber, currentMatch?.matchStatus, account, refreshMatchData, buildMoveHistory, checkForNextActiveMatch]);

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
      if (isInitialNavRef.current) { isInitialNavRef.current = false; navigate('/chess', { replace: true, state: null }); return; }
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
              setMoveHistory(buildMoveHistory(updated.movesString, updated.firstPlayer, updated.player1, updated.player2));
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

  useEffect(() => { document.title = 'Chess'; }, []);

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

  const renderCheckStatusBadge = useCallback((playerColor) => {
    if (!currentMatch) return null;

    const isWhite = playerColor === 'white';
    const playerAddress = isWhite ? currentMatch.player1 : currentMatch.player2;
    const isReplayFinalPosition = currentMatch.matchStatus !== 2 || replayMoveIndex === -2 || effectiveReplayMoveIndex === moveHistory.length - 1;
    const isCheckmated = isReplayFinalPosition
      && currentMatch.matchStatus === 2
      && currentMatch.completionReason === CompletionReason.NORMAL_WIN
      && playerAddress
      && currentMatch.loser
      && playerAddress.toLowerCase() === currentMatch.loser.toLowerCase();
    const isInCheck = currentMatch.matchStatus === 2
      ? (isWhite ? replayCheckStatus.whiteInCheck : replayCheckStatus.blackInCheck)
      : (isWhite ? currentMatch.whiteInCheck : currentMatch.blackInCheck);

    if (!isCheckmated && !isInCheck) return null;

    const badgeClasses = isCheckmated
      ? 'bg-red-500/20 border border-red-400 text-red-300'
      : 'bg-orange-500/20 border border-orange-400 text-orange-200';
    const badgeText = isCheckmated ? 'CHECKMATE' : 'CHECK';

    return (
      <div className="mt-1.5 text-center md:mt-2">
        <div className={`${badgeClasses} inline-flex items-center justify-center rounded-md px-1.5 py-1 md:rounded-lg md:px-2 md:py-2`}>
          <span className="text-[9px] font-semibold leading-none md:text-xs md:font-bold">{badgeText}</span>
        </div>
      </div>
    );
  }, [currentMatch, replayMoveIndex, effectiveReplayMoveIndex, moveHistory.length, replayCheckStatus]);

  return (
    <div style={{ minHeight: '100vh', background: currentTheme.gradient, color: '#fff', position: 'relative', overflow: 'clip', transition: 'background 0.8s ease-in-out' }}>
      <ParticleBackground colors={currentTheme.particleColors} symbols={CHESS_PIECES} fontSize="40px" />
      <CenteredErrorFlash
        message={actionState.type === 'error' ? actionState.message : ''}
        onDismiss={dismissActionError}
      />
      {showPrompt && <WalletBrowserPrompt onWalletChoice={handleWalletChoice} onContinueChoice={handleContinueChoice} />}
      {matchEndResult && <MatchEndModal result={matchEndResult.result} completionReason={matchEndResult.completionReason} winnerLabel={matchEndWinnerLabel} winnerAddress={matchEndWinner} loserAddress={matchEndLoser} currentAccount={account} hasNextMatch={!!nextActiveMatch} onClose={handleMatchEndModalClose} onEnterNextMatch={handleEnterNextMatch} onReturnToBracket={handleReturnToBracket} gameType="chess" roundNumber={currentMatch?.roundNumber} totalRounds={viewingTournament?.totalRounds} prizePool={viewingTournament?.prizePoolWei} reasonLabelMode="v2" />}
      {showMatchAlert && alertMatch && !isAlertMatchAlreadyOpen && <ActiveMatchAlertModal match={alertMatch} autoDismiss={isAlertMatchAlreadyOpen} onEnterMatch={() => { handleMatchAlertClose(); handlePlayMatch(alertMatch.tierId, alertMatch.instanceId, alertMatch.roundIdx, alertMatch.matchIdx); }} onDismiss={handleMatchAlertClose} />}
      <PlayerProfileModal
        isOpen={Boolean(selectedProfileAddress)}
        onClose={() => setSelectedProfileAddress(null)}
        gameType="chess"
        targetAddress={selectedProfileAddress}
        factoryContract={resolvedFactoryContract}
        runner={rpcProvider}
        onViewTournament={enterInstanceBracket}
        reasonLabelMode="v2"
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto">
        <div className="md:hidden bg-gradient-to-b from-slate-800 to-slate-900 border-t border-purple-400/30 px-4 py-2.5 flex items-center justify-between">
          <GamesCard currentGame="chess" onHeightChange={setGamesCardHeight} isExpanded={expandedPanel === 'games'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')} />
          <PlayerActivity activity={playerActivity.data} loading={playerActivity.loading} syncing={playerActivity.syncing} contract={activeInstanceContract} account={account} onEnterMatch={handlePlayMatch} onEnterTournament={handleEnterTournamentFromActivity} onRefresh={playerActivity.refetch} onDismissMatch={playerActivity.dismissMatch} gameName="chess" gameEmoji="♟️" connectCtaClassName={currentTheme.connectCtaClassName} gamesCardHeight={gamesCardHeight} onHeightChange={setPlayerActivityHeight} onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }} isExpanded={expandedPanel === 'playerActivity'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'playerActivity'} onShowTooltip={() => setActiveTooltip('playerActivity')} onHideTooltip={() => setActiveTooltip(null)} reasonLabelMode="v2" refreshOnExpand={false} />
          <RecentMatchesCard contract={null} account={account} gameName="chess" gameEmoji="♟️" gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} onHeightChange={setRecentMatchesCardHeight} isExpanded={expandedPanel === 'recentMatches'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'recentMatches'} onShowTooltip={() => setActiveTooltip('recentMatches')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} onNavigateToTournament={() => {}} leaderboard={leaderboard} playerProfile={playerProfile} onRefresh={refreshHistoryPanel} showTournamentRaffles={false} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} v2Matches={v2MatchHistory.matches} v2MatchesLoading={v2MatchHistory.loading} reasonLabelMode="v2" panelVariant="stats" />
          <ActiveLobbiesCard lobbies={activeLobbies.lobbies} resolvedLobbies={activeLobbies.resolvedLobbies} loading={activeLobbies.loading} resolvedLoading={activeLobbies.resolvedLoading} syncing={activeLobbies.syncing} resolvedSyncing={activeLobbies.resolvedSyncing} error={activeLobbies.error} resolvedError={activeLobbies.resolvedError} resolvedLoaded={activeLobbies.resolvedLoaded} resolvedPage={activeLobbies.resolvedPage} resolvedTotalCount={activeLobbies.resolvedTotalCount} resolvedPageSize={activeLobbies.resolvedPageSize} gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} recentMatchesCardHeight={recentMatchesCardHeight} onRefresh={activeLobbies.refetch} onRefreshResolved={activeLobbies.refetchResolved} onResolvedPageChange={activeLobbies.goToResolvedPage} onLoadResolved={activeLobbies.refetchResolved} isExpanded={expandedPanel === 'activeLobbies'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'activeLobbies' ? null : 'activeLobbies')} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} disabled={!account} showTooltip={activeTooltip === 'activeLobbies'} onShowTooltip={() => setActiveTooltip('activeLobbies')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} />
        </div>
        <div className="hidden md:block">
          <GamesCard currentGame="chess" onHeightChange={setGamesCardHeight} isExpanded={expandedPanel === 'games'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')} />
          <PlayerActivity activity={playerActivity.data} loading={playerActivity.loading} syncing={playerActivity.syncing} contract={activeInstanceContract} account={account} onEnterMatch={handlePlayMatch} onEnterTournament={handleEnterTournamentFromActivity} onRefresh={playerActivity.refetch} onDismissMatch={playerActivity.dismissMatch} gameName="chess" gameEmoji="♟️" connectCtaClassName={currentTheme.connectCtaClassName} gamesCardHeight={gamesCardHeight} onHeightChange={setPlayerActivityHeight} onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }} isExpanded={expandedPanel === 'playerActivity'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'playerActivity'} onShowTooltip={() => setActiveTooltip('playerActivity')} onHideTooltip={() => setActiveTooltip(null)} reasonLabelMode="v2" refreshOnExpand={false} />
          <RecentMatchesCard contract={null} account={account} gameName="chess" gameEmoji="♟️" gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} onHeightChange={setRecentMatchesCardHeight} isExpanded={expandedPanel === 'recentMatches'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'recentMatches'} onShowTooltip={() => setActiveTooltip('recentMatches')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} onNavigateToTournament={() => {}} leaderboard={leaderboard} playerProfile={playerProfile} onRefresh={refreshHistoryPanel} showTournamentRaffles={false} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} v2Matches={v2MatchHistory.matches} v2MatchesLoading={v2MatchHistory.loading} reasonLabelMode="v2" panelVariant="stats" />
          <ActiveLobbiesCard lobbies={activeLobbies.lobbies} resolvedLobbies={activeLobbies.resolvedLobbies} loading={activeLobbies.loading} resolvedLoading={activeLobbies.resolvedLoading} syncing={activeLobbies.syncing} resolvedSyncing={activeLobbies.resolvedSyncing} error={activeLobbies.error} resolvedError={activeLobbies.resolvedError} resolvedLoaded={activeLobbies.resolvedLoaded} resolvedPage={activeLobbies.resolvedPage} resolvedTotalCount={activeLobbies.resolvedTotalCount} resolvedPageSize={activeLobbies.resolvedPageSize} gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} recentMatchesCardHeight={recentMatchesCardHeight} onRefresh={activeLobbies.refetch} onRefreshResolved={activeLobbies.refetchResolved} onResolvedPageChange={activeLobbies.goToResolvedPage} onLoadResolved={activeLobbies.refetchResolved} isExpanded={expandedPanel === 'activeLobbies'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'activeLobbies' ? null : 'activeLobbies')} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} disabled={!account} showTooltip={activeTooltip === 'activeLobbies'} onShowTooltip={() => setActiveTooltip('activeLobbies')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} />
        </div>
      </div>

      <div style={{ background: 'rgba(0, 100, 200, 0.2)', borderBottom: `1px solid ${currentTheme.border}`, backdropFilter: 'blur(10px)', position: 'relative', zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="relative flex flex-col items-center gap-3 md:min-h-6 md:justify-center text-xs md:text-sm">
            <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-6">
              <div className="flex items-center gap-2"><Shield className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">100% On-Chain</span></div>
              <div className="flex items-center gap-2"><Lock className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Immutable Rules</span></div>
              <div className="flex items-center gap-2"><Eye className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Every Move Verifiable</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Zero Cookies</span></div>
            </div>
            {explorerUrl ? <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-blue-300 transition-colors hover:text-blue-200 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2"><Code size={16} /><span className="font-mono text-xs">{shortenAddress(factoryAddress)}</span><ExternalLink size={14} /></a> : null}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="text-center mb-5 md:mb-6">
          <div className="inline-block mb-6">
            <div className="relative flex h-28 w-28 items-center justify-center md:h-32 md:w-32">
              <div className={`absolute inset-0 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`} />
              <span className="relative text-[5rem] leading-none md:text-[5.5rem]">♚</span>
            </div>
          </div>
          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>ETour Chess</h1>
          <p className={`pt-4 text-2xl ${currentTheme.heroText} mb-6`}>
            Play Chess on the blockchain with real ETH on the line.
          </p>
        </div>

        {dashboardError ? (
          <div className="mb-8">
            <ActionMessage type="error" message={dashboardError} />
          </div>
        ) : null}

        <V2GameLobbyIntro
          account={account}
          isConnecting={isConnecting}
          onConnectWallet={connectWallet}
          connectCtaClassName={currentTheme.connectCtaClassName}
        >
          <div className={`relative flex flex-wrap items-center justify-center gap-2 text-sm md:text-base ${currentTheme.heroSubtext}`}>
            {heroLinkNoticeVisible ? (
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-400/40 bg-slate-950/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-cyan-500/20 backdrop-blur-sm animate-pulse">
                Coming Soon
              </div>
            ) : null}
            {HERO_LINKS.map((link, index) => (
              <div key={link.label} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">•</span> : null}
                <a
                  href={link.type === 'manual' ? '#user-manual' : '#'}
                  onClick={
                    link.type === 'manual'
                      ? handleUserManualLinkClick
                      : link.type === 'quick-guide'
                        ? handleQuickGuideLinkClick
                        : handlePlaceholderLinkClick
                  }
                  className="underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        </V2GameLobbyIntro>

        {currentMatch && (
          <div ref={matchViewRef}>
            <GameMatchLayout
              gameType="chess"
              reasonLabelMode="v2"
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
              onPlayerAddressClick={setSelectedProfileAddress}
              hasNextActiveMatch={!!nextActiveMatch}
              playerCount={viewingTournament?.playerCount || null}
              playerConfig={{ player1: { icon: '♚', label: 'White' }, player2: { icon: '♔', label: 'Black' } }}
              layout="players-board-history"
              isSpectator={isSpectator}
              renderPlayer1Extra={(isMobile) => {
                const capturedPieces = calculateCapturedPieces(displayedBoard);
                return (
                  <>
                    <CapturedPieces capturedPieces={capturedPieces.black} color="black" collapsible={!!isMobile} />
                    {renderCheckStatusBadge('white')}
                  </>
                );
              }}
              renderPlayer2Extra={(isMobile) => {
                const capturedPieces = calculateCapturedPieces(displayedBoard);
                return (
                  <>
                    <CapturedPieces capturedPieces={capturedPieces.white} color="white" collapsible={!!isMobile} />
                    {renderCheckStatusBadge('black')}
                  </>
                );
              }}
              renderMoveHistory={moveHistory.length > 0 ? () => (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <h3 className="text-xl font-bold text-purple-300 flex items-center gap-2"><History size={20} />Move History</h3>
                    {currentMatch.matchStatus === 2 ? (
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => setReplayMoveIndex(prev => Math.max(-1, (prev === -2 ? moveHistory.length - 1 : prev) - 1))}
                          disabled={(replayMoveIndex === -2 ? moveHistory.length - 1 : replayMoveIndex) <= -1}
                          className="rounded bg-slate-700/50 p-1.5 transition-colors hover:bg-slate-600/50 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Previous move"
                        >
                          <ChevronLeft size={18} className="text-purple-300" />
                        </button>
                        <span className="min-w-[3.5rem] text-center text-xs text-slate-400">
                          {replayMoveIndex === -1 ? 'Start' : replayMoveIndex === -2 ? 'Final' : `Move ${replayMoveIndex + 1}`}
                        </span>
                        <button
                          onClick={() => setReplayMoveIndex(prev => Math.min(moveHistory.length - 1, (prev === -2 ? moveHistory.length - 1 : prev) + 1))}
                          disabled={(replayMoveIndex === -2 ? moveHistory.length - 1 : replayMoveIndex) >= moveHistory.length - 1}
                          className="rounded bg-slate-700/50 p-1.5 transition-colors hover:bg-slate-600/50 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Next move"
                        >
                          <ChevronRight size={18} className="text-purple-300" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {moveHistory.map((move, idx) => {
                      const isSelected = currentMatch.matchStatus === 2 && idx === effectiveReplayMoveIndex;
                      return (
                      <div
                        key={idx}
                        onClick={currentMatch.matchStatus === 2 ? () => setReplayMoveIndex(idx) : undefined}
                        className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors ${
                          isSelected
                            ? 'cursor-pointer border border-purple-400/50 bg-purple-500/30'
                            : currentMatch.matchStatus === 2
                              ? 'cursor-pointer bg-purple-500/10 hover:bg-purple-500/20'
                              : 'bg-purple-500/10 hover:bg-purple-500/20'
                        }`}
                      >
                        <span className="text-purple-300 font-semibold min-w-[2rem]">#{idx + 1}</span>
                        <div className="w-8 h-8 flex items-center justify-center"><img src={move.player === '♔' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'} alt={move.player === '♔' ? 'White' : 'Black'} className="w-7 h-7" draggable="false" /></div>
                        <span className="text-purple-200 font-mono">{move.move}</span>
                      </div>
                    );})}
                  </div>
                </>
              ) : undefined}
            >
              <ChessBoard board={displayedBoard} packedBoard={currentMatch.packedBoard} packedState={currentMatch.packedState} onMove={isSpectator || currentMatch.matchStatus === 2 ? null : handleMakeMove} currentTurn={currentMatch.currentTurn} account={isSpectator ? null : account} player1={currentMatch.player1} player2={currentMatch.player2} firstPlayer={currentMatch.firstPlayer} matchStatus={currentMatch.matchStatus} loading={matchLoading} whiteInCheck={currentMatch.matchStatus === 2 ? replayCheckStatus.whiteInCheck : currentMatch.whiteInCheck} blackInCheck={currentMatch.matchStatus === 2 ? replayCheckStatus.blackInCheck : currentMatch.blackInCheck} lastMoveTime={currentMatch.lastMoveTime} startTime={currentMatch.startTime} lastMove={displayedLastMove} maxSize={820} ghostMove={currentMatch.matchStatus === 2 ? null : ghostMove} />
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
                <TournamentBracket tournamentData={viewingTournament} onBack={handleBackToTournaments} onEnterMatch={handlePlayMatch} onForceEliminate={handleForceEliminateStalledMatch} onClaimReplacement={handleClaimMatchSlotByReplacement} onManualStart={handleManualStart} onClaimAbandonedPool={handleClaimAbandonedPool} onResetEnrollmentWindow={handleResetEnrollmentWindow} onCancelTournament={handleCancelTournament} onEnroll={handleEnroll} onConnectWallet={connectWallet} account={account} loading={tournamentsLoading} connectLoading={isConnecting} syncDots={bracketSyncDots} isEnrolled={viewingTournament?.players?.some(addr => addr.toLowerCase() === account?.toLowerCase())} entryFee={viewingTournament?.entryFeeEth ?? '0'} isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount} instanceContract={activeInstanceContract} onPlayerAddressClick={setSelectedProfileAddress} />
              </div>
            ) : (
              <div className="space-y-8 md:space-y-10">
                <div id="live-instances">
                  <form onSubmit={createInstance}>
                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-4 md:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-white">Configure Your Lobby</h2>
                          <UserManualAnchorIcon
                            href="#21-creating-a-lobby"
                            title="Open User Manual section 2.1: Creating a Lobby"
                            className="text-cyan-200/75 hover:text-white"
                          />
                        </div>
                        {!account ? (
                          <button
                            type="button"
                            aria-expanded={isCreateFormExpanded}
                            aria-controls="configure-lobby-panel-chess"
                            onClick={() => setIsCreateFormExpanded((current) => !current)}
                            className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-purple-200 transition-colors hover:border-cyan-400/40 hover:text-white"
                          >
                            <span>{isCreateFormExpanded ? 'Collapse' : 'Expand'}</span>
                            {isCreateFormExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        ) : null}
                      </div>
                      {!isCreateFormExpanded ? (
                        <p className="text-sm leading-6 text-slate-300">
                          Connect your wallet to create a custom lobby.
                        </p>
                      ) : null}
                      {shouldRenderCreateFormBody ? (
                        <div
                          id="configure-lobby-panel-chess"
                          className={`overflow-hidden transition-[max-height,opacity,transform] duration-[220ms] ease-out ${
                            isCreateFormBodyVisible ? 'max-h-[1200px] translate-y-0 opacity-100' : 'max-h-0 -translate-y-2 opacity-0'
                          }`}
                        >
                          <div className="grid gap-4 md:grid-cols-[minmax(0,0.2fr)_minmax(0,0.8fr)] md:items-stretch">
                            <div className={`rounded-2xl border p-4 md:p-5 ${createLoading ? 'border-slate-800 bg-slate-900/50' : 'border-cyan-400/20 bg-slate-950/60 shadow-[0_0_30px_rgba(56,189,248,0.08)]'}`}>
                              <div className="text-sm text-purple-200 mb-3">Player Count</div>
                              <div className="grid grid-cols-3 gap-3 md:grid-cols-2">
                                {PLAYER_COUNT_OPTIONS.map(option => {
                                  const active = Number(createForm.playerCount) === option;
                                  return <button key={option} type="button" disabled={createLoading} onClick={() => setPlayerCount(option)} className={`px-4 py-3 rounded-xl text-base font-semibold transition-all ${option === 32 ? 'md:col-span-2' : ''} ${createLoading ? 'bg-slate-900/80 border border-slate-800 text-slate-500 cursor-not-allowed' : active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-cyan-400/40'}`}>{option}</button>;
                                })}
                              </div>
                            </div>
                            <div>
                              <EntryFeeSlider
                                factoryRules={factoryRules}
                                entryFee={createForm.entryFee}
                                playerCount={createForm.playerCount}
                                disabled={createLoading}
                                onChange={value => updateCreateForm('entryFee', value)}
                              />
                            </div>
                          </div>
                          <div className="mt-4 mb-4">
                            <button type="button" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)} className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors mb-2">{showAdvancedSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}<span className="text-sm font-semibold">More Settings</span></button>
                            {showAdvancedSettings && (
                              <div className="grid gap-4 lg:grid-cols-3 bg-slate-950/50 border border-purple-400/10 rounded-xl p-4">
                                <TimeoutSettingSlider
                                  field="enrollmentWindow"
                                  label="Enrollment Window"
                                  value={createForm.enrollmentWindow}
                                  disabled={createLoading}
                                  onChange={value => updateCreateForm('enrollmentWindow', value)}
                                />
                                <TimeoutSettingSlider
                                  field="matchTimePerPlayer"
                                  label="Time Per Player"
                                  value={createForm.matchTimePerPlayer}
                                  disabled={createLoading}
                                  onChange={value => updateCreateForm('matchTimePerPlayer', value)}
                                />
                                <TimeoutSettingSlider
                                  field="timeIncrementPerMove"
                                  label="Increment Time"
                                  value={createForm.timeIncrementPerMove}
                                  disabled={createLoading}
                                  onChange={value => updateCreateForm('timeIncrementPerMove', value)}
                                />
                              </div>
                            )}
                          </div>
                          <div className="mt-5 flex justify-stretch md:justify-end">
                            <button
                              type="submit"
                              disabled={createLoading || !account}
                              title={!account ? 'Connect your wallet to create and enrol.' : ''}
                              className={`inline-flex w-full md:w-auto min-w-[220px] items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-base md:text-lg shadow-2xl transition-all disabled:cursor-not-allowed ${account ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 transform hover:scale-105 text-white border border-sky-300/40 shadow-[0_0_30px_rgba(59,130,246,0.35)]' : 'bg-slate-800/90 border border-slate-700 text-slate-500'}`}
                            >
                              {createLoading ? <Loader size={20} className="animate-spin" /> : null}
                              {createLoading ? 'Creating Lobby...' : 'Create Lobby'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div id="user-manual" className="max-w-7xl mx-auto px-2 pt-8 pb-12 md:px-6 md:pt-10" style={{ position: 'relative', zIndex: 10 }}>
        <UserManualV2 />
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
          {contractsExpanded && <V2ContractsTable scope="chess" />}
          <div className="text-center pt-8 border-t border-slate-800/30"><p className="text-slate-600 text-xs">No company needed. No trust required. No servers to shutdown.</p></div>
        </div>
      </footer>

      <QuickGuideModal
        isOpen={isQuickGuideOpen}
        onClose={() => setIsQuickGuideOpen(false)}
      />

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
