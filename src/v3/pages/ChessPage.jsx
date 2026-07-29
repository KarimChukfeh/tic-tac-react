import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Link2,
  Lock,
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
  Gamepad2,
} from 'lucide-react';
import { ethers } from 'ethers';
import { shortenAddress } from '../../utils/formatters';
import {
  V3_NETWORK_NAME,
  V3_TARGET_CHAIN_ID_HEX,
  getV3AddressUrl,
  getV3WalletAddChainParams,
} from '../config/walletConfig';
import { createV3TournamentUrl, parseV3InstanceParam } from '../routing/tournamentUrl';
import { shouldResetOnInitialDocumentLoad } from '../../utils/navigation';
import { CompletionReason, isDraw } from '../../utils/completionReasons';
import { boardArrayToPackedBoard, getCheckStatusFromPackedBoard, getLegalMovesForSquare, validateMoveWithReason } from '../../utils/chessValidator';
import { didMatchStateAdvance, waitForTxOrStateSync } from '../../utils/txSync';
import {
  readV3ActiveMatchState,
  readV3FactoryDashboard,
  readV3TournamentState,
} from '../lib/readOrchestration';
import { getChessPlayerSideIcons } from '../../utils/chessPieceAssets';
import ParticleBackground from '../../components/shared/ParticleBackground';
import MatchCard from '../../components/shared/MatchCard';
import UserManualV2 from '../components/UserManualV2';
import QuickGuideModal from '../components/QuickGuideModal';
import WhatIsThisModal from '../components/WhatIsThisModal';
import CenteredErrorFlash from '../components/CenteredErrorFlash';
import MatchEndModal from '../../components/shared/MatchEndModal';
import ActiveMatchAlertModal from '../../components/shared/ActiveMatchAlertModal';
import GameMatchLayout from '../../components/shared/GameMatchLayout';
import TournamentHeader from '../../components/shared/TournamentHeader';
import PlayerActivity from '../../components/shared/PlayerActivity';
import ActiveLobbiesCard from '../../components/shared/ActiveLobbiesCard';
import RecentMatchesCard from '../../components/shared/RecentMatchesCard';
import GamesCard from '../../components/shared/GamesCard';
import MobileBottomNavDrawer from '../../components/shared/MobileBottomNavDrawer';
import BracketScrollHint from '../../components/shared/BracketScrollHint';
import RecentInstanceCard from '../../components/shared/RecentInstanceCard';
import TraditionalTournamentBracket from '../../components/shared/TraditionalTournamentBracket';
import CapturedPieces from '../../components/shared/CapturedPieces';
import UserManualAnchorIcon from '../../components/shared/UserManualAnchorIcon';
import V2GameLobbyIntro from '../../components/shared/V2GameLobbyIntro';
import ArenaGameHero from '../components/ArenaGameHero';
import ArenaEffectsSwitch from '../components/ArenaEffectsSwitch';
import EtourFooter from '../../components/shared/EtourFooter';
import PlayerProfileModal from '../../components/shared/PlayerProfileModal';
import WalletBrowserPrompt from '../../components/WalletBrowserPrompt';
import DemoLevelModal from '../components/DemoLevelModal';
import EntryFeeSlider, { DEFAULT_SELECTED_ENTRY_FEE } from '../components/EntryFeeSlider';
import TimeoutSettingSlider, { clampCreateTimeoutValue, isCreateTimeoutField, normalizeCreateTimeouts } from '../components/TimeoutSettingSlider';
import { useInitialDocumentScrollTop } from '../../hooks/useInitialDocumentScrollTop';
import { useWalletBrowserPrompt } from '../../hooks/useWalletBrowserPrompt';
import { useV3Wallet } from '../hooks/useV3Wallet';
import { useV3Session } from '../hooks/useV3Session';
import { createV3RpcProvider } from '../sdk/adapter';
import { isMobileDevice, isWalletBrowser } from '../../utils/mobileDetection';
import { useChessV2PlayerActivity } from '../hooks/useChessV2PlayerActivity';
import { useChessPlayerProfile } from '../hooks/useChessPlayerProfile';
import { useChessV2MatchHistory } from '../hooks/useChessV2MatchHistory';
import { useActiveLobbies } from '../hooks/useActiveLobbies';
import {
  PLAYER_COUNT_OPTIONS,
  CHESS_FACTORY_ADDRESS,
  CHESS_FACTORY_ADDRESS_CANDIDATES,
  CHESS_IMPLEMENTATION_ADDRESS,
  formatEth,
  getDefaultTimeouts,
  getFactoryContract,
  getWritableFactoryContract,
  getWritableInstanceContract,
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
import { V2TournamentResolutionReason } from '../lib/reasonLabels';

const CHESS_PIECES = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
const CHESS_ARENA_EFFECTS_STORAGE_KEY = 'etour:chess2:3d-effects';
const VIRTUAL_TIER_ID = 0;
const VIRTUAL_INSTANCE_ID = 0;
const DEFAULT_MATCH_LOADING_MESSAGE = 'Loading match...';
const DEMO_HUMAN_ADDRESS = '0xDeF0000000000000000000000000000000000001';
const DEMO_COMPUTER_ADDRESS = '0xDeF0000000000000000000000000000000000002';
const DEMO_MATCH_TIME_SECONDS = 300;
const CHESS_NO_EN_PASSANT = 63n;
const WHITE_KING_MOVED = 1n << 6n;
const BLACK_KING_MOVED = 1n << 7n;
const WHITE_ROOK_A_MOVED = 1n << 8n;
const WHITE_ROOK_H_MOVED = 1n << 9n;
const BLACK_ROOK_A_MOVED = 1n << 10n;
const BLACK_ROOK_H_MOVED = 1n << 11n;
const WHITE_IN_CHECK = 1n << 12n;
const BLACK_IN_CHECK = 1n << 13n;
const DEMO_CHESS_MIN_ELO = 0;
const DEMO_CHESS_MAX_ELO = 2000;
const DEFAULT_DEMO_CHESS_ELO = 1000;
const DEMO_CHESS_AI_CENTER_SQUARES = new Set([27, 28, 35, 36]);
const DEMO_CHESS_AI_EXTENDED_CENTER_SQUARES = new Set([18, 19, 20, 21, 26, 29, 34, 37, 42, 43, 44, 45]);
const DEMO_CHESS_PIECE_VALUES = {
  1: 100,
  2: 320,
  3: 330,
  4: 500,
  5: 900,
  6: 20_000,
};

function clampDemoChessElo(elo) {
  const parsedElo = Number(elo);
  if (!Number.isFinite(parsedElo)) return DEFAULT_DEMO_CHESS_ELO;
  return Math.min(DEMO_CHESS_MAX_ELO, Math.max(DEMO_CHESS_MIN_ELO, Math.round(parsedElo / 25) * 25));
}

function getDemoChessAiSettings(elo) {
  const selectedElo = clampDemoChessElo(elo);
  if (selectedElo < 100) {
    const lowEloProgress = selectedElo / 100;
    return {
      smartMoveChance: 0.02 + 0.16 * lowEloProgress,
      sensibleMoveMargin: Math.round(550 - 250 * lowEloProgress),
      imperfectMoveMargin: Math.round(1600 - 700 * lowEloProgress),
      imperfectMovePoolRatio: 1 - 0.25 * lowEloProgress,
      scoreNoise: 150 - 70 * lowEloProgress,
    };
  }

  const normalizedLevel = (selectedElo - 100) / (DEMO_CHESS_MAX_ELO - 100);
  const remainingStrength = 1 - normalizedLevel;

  return {
    smartMoveChance: 0.18 + 0.8 * (normalizedLevel ** 0.32),
    sensibleMoveMargin: Math.round(25 + 275 * (remainingStrength ** 4)),
    imperfectMoveMargin: Math.round(100 + 800 * (remainingStrength ** 2)),
    imperfectMovePoolRatio: 0.1 + 0.65 * (remainingStrength ** 1.4),
    scoreNoise: 3 + 77 * (remainingStrength ** 2),
  };
}

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

const arenaTheme = {
  ...currentTheme,
  border: 'rgba(246, 200, 95, 0.26)',
  particleColors: ['#f6c85f', '#d99b2b'],
  gradient: 'radial-gradient(circle at 76% 12%, rgba(246, 200, 95, 0.13), transparent 28rem), radial-gradient(circle at 12% 43%, rgba(217, 155, 43, 0.08), transparent 34rem), #030811',
  connectCtaClassName: 't2-connect-wallet',
};

const PIECE_SVGS = {
  white: { pawn: 'pawn-w', knight: 'knight-w', bishop: 'bishop-w', rook: 'rook-w', queen: 'queen-w', king: 'king-w' },
  black: { pawn: 'pawn-b', knight: 'knight-b', bishop: 'bishop-b', rook: 'rook-b', queen: 'queen-b', king: 'king-b' },
};
const PIECE_TYPES = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
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

export const ChessBoard = ({ board, packedBoard, packedState, onMove, currentTurn, account, player1, player2, firstPlayer, matchStatus, loading, whiteInCheck, blackInCheck, lastMoveTime, startTime, lastMove, secondLastMove, maxSize = 520, ghostMove, arenaStyle = false, effectsEnabled = false, onToggleEffects }) => {
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
      const viewportLimit = window.innerHeight * 0.52;
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

  const interactionDisabled = matchStatus !== 1 || !isMyTurn || loading || !onMove;

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
      const isSecondLastMoveFrom = !isLastMoveFrom && !isLastMoveTo && secondLastMove?.from === actualIdx;
      const isSecondLastMoveTo = !isLastMoveFrom && !isLastMoveTo && secondLastMove?.to === actualIdx;
      const isSecondLastMyMove = secondLastMove?.isMyMove;
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
      const getSecondLastMoveFromClass = () => !isSecondLastMoveFrom || isSelected || isKingInCheck ? '' : (isSecondLastMyMove ? 'ring-1 ring-purple-300/20 ring-inset' : 'ring-1 ring-yellow-300/20 ring-inset');
      const getSecondLastMoveToClass = () => !isSecondLastMoveTo || isSelected || isKingInCheck ? '' : (isSecondLastMyMove ? 'ring-1 ring-blue-300/35 ring-inset' : 'ring-1 ring-red-300/35 ring-inset');
      const getLastMoveFromBg = () => !isLastMoveFrom || isSelected || isKingInCheck ? undefined : (isMyMove ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.72), rgba(147, 51, 234, 0.72))' : 'linear-gradient(135deg, rgba(234, 179, 8, 0.72), rgba(202, 138, 4, 0.72))');
      const getLastMoveToBg = () => !isLastMoveTo || isSelected || isKingInCheck ? undefined : (isMyMove ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.72), rgba(29, 78, 216, 0.72))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.72), rgba(220, 38, 38, 0.72))');
      const getSecondLastMoveFromBg = () => !isSecondLastMoveFrom || isSelected || isKingInCheck ? undefined : (isSecondLastMyMove ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.09), rgba(147, 51, 234, 0.07))' : 'linear-gradient(135deg, rgba(234, 179, 8, 0.09), rgba(202, 138, 4, 0.07))');
      const getSecondLastMoveToBg = () => !isSecondLastMoveTo || isSelected || isKingInCheck ? undefined : (isSecondLastMyMove ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(29, 78, 216, 0.12))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.12))');
      const getLastMoveShadow = () => {
        if (isSelected) return '0 0 20px rgba(6, 182, 212, 0.3)';
        if (isLastMoveTo && !isKingInCheck) return isMyMove ? 'inset 0 0 25px rgba(59, 130, 246, 0.6), 0 0 15px rgba(59, 130, 246, 0.4)' : 'inset 0 0 25px rgba(239, 68, 68, 0.6), 0 0 15px rgba(239, 68, 68, 0.4)';
        if (isLastMoveFrom && !isKingInCheck) return isMyMove ? 'inset 0 0 20px rgba(168, 85, 247, 0.5), 0 0 12px rgba(168, 85, 247, 0.3)' : 'inset 0 0 20px rgba(234, 179, 8, 0.5), 0 0 12px rgba(234, 179, 8, 0.3)';
        if (isSecondLastMoveTo && !isKingInCheck) return isSecondLastMyMove ? 'inset 0 0 12px rgba(59, 130, 246, 0.13), 0 0 7px rgba(59, 130, 246, 0.07)' : 'inset 0 0 12px rgba(239, 68, 68, 0.13), 0 0 7px rgba(239, 68, 68, 0.07)';
        if (isSecondLastMoveFrom && !isKingInCheck) return isSecondLastMyMove ? 'inset 0 0 10px rgba(168, 85, 247, 0.07), 0 0 5px rgba(168, 85, 247, 0.04)' : 'inset 0 0 10px rgba(234, 179, 8, 0.07), 0 0 5px rgba(234, 179, 8, 0.04)';
        if (isCaptureTarget) return 'inset 0 0 0 2px rgba(34, 211, 238, 0.9), inset 0 0 20px rgba(34, 211, 238, 0.25)';
        return 'none';
      };
      const getPieceGlow = () => !isLastMoveTo || pieceType === 0 ? undefined : (isMyMove ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))' : 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))');
      const getPieceStyle = () => {
        const style = { filter: getPieceGlow() };
        if (!effectsEnabled || !isLastMoveTo || !lastMove) return style;
        const fromDisplayIdx = getActualIndex(lastMove.from);
        const fromDisplayRow = Math.floor(fromDisplayIdx / 8);
        const fromDisplayCol = fromDisplayIdx % 8;
        return {
          ...style,
          '--arena-move-x': `${(fromDisplayCol - displayCol) * 133.333}%`,
          '--arena-move-y': `${(fromDisplayRow - displayRow) * 133.333}%`,
        };
      };
      const squareBg = isSelected
        ? undefined
        : (isKingInCheck ? undefined : (isCaptureTarget ? 'rgba(34, 211, 238, 0.15)' : (getLastMoveFromBg() || getLastMoveToBg() || getSecondLastMoveFromBg() || getSecondLastMoveToBg())));
      const ghostFromClass = isGhostFrom ? ' ring-2 ring-orange-400/60 ring-inset' : '';
      const ghostToClass = isGhostTo ? ' ring-2 ring-orange-400 ring-inset' : '';

      squares.push(
        <div
          key={displayIdx}
          data-display-square={displayIdx}
          data-piece={pieceType ? `${pieceColor === 1 ? 'white' : 'black'}-${PIECE_TYPES[pieceType]}` : 'empty'}
          data-selected={isSelected ? 'true' : undefined}
          data-legal={isLegalTarget ? 'true' : undefined}
          data-capture={isCaptureTarget ? 'true' : undefined}
          data-check={isKingInCheck ? 'true' : undefined}
          data-last-from={isLastMoveFrom ? 'true' : undefined}
          data-last-to={isLastMoveTo ? 'true' : undefined}
          data-last-owner={isLastMoveFrom || isLastMoveTo ? (isMyMove ? 'player' : 'opponent') : undefined}
          data-previous-from={isSecondLastMoveFrom ? 'true' : undefined}
          data-previous-to={isSecondLastMoveTo ? 'true' : undefined}
          data-previous-owner={isSecondLastMoveFrom || isSecondLastMoveTo ? (isSecondLastMyMove ? 'player' : 'opponent') : undefined}
          data-move-depth={isLastMoveFrom || isLastMoveTo ? 'latest' : (isSecondLastMoveFrom || isSecondLastMoveTo ? 'previous' : undefined)}
          data-ghost={isGhostFrom || isGhostTo ? 'true' : undefined}
          onClick={arenaStyle ? undefined : () => handleSquareClick(displayIdx)}
          className={`relative flex items-center justify-center cursor-pointer transition-all duration-200 ${arenaStyle ? 'arena-chess-square' : ''} ${isLight ? 'bg-stone-300' : 'bg-stone-700'}${isSelected ? ' ring-2 ring-emerald-400 ring-inset bg-emerald-500/50' : ''}${isKingInCheck ? ' bg-red-500/50 ring-2 ring-red-400 ring-inset' : ''}${isLegalTarget && !isCaptureTarget ? ' bg-cyan-400/10' : ''} ${getLastMoveFromClass()} ${getLastMoveToClass()} ${getSecondLastMoveFromClass()} ${getSecondLastMoveToClass()}${ghostFromClass}${ghostToClass}${isMyTurn && isMyPiece(piece) && !isSelected ? ' hover:bg-emerald-500/30' : ''}${isMyTurn && isLegalTarget ? ' hover:bg-cyan-400/20' : ''}`}
          style={{ boxShadow: isSelected ? 'inset 0 0 20px rgba(16, 185, 129, 0.5)' : getLastMoveShadow(), background: isGhostTo ? 'rgba(251, 146, 60, 0.25)' : squareBg }}
        >
          {getPieceSvg(piece) && <img src={getPieceSvg(piece)} alt="" className={`w-3/4 h-3/4 select-none transition-all duration-300 ${isSelected ? 'scale-110' : ''}${isGhostFrom ? ' opacity-30' : ''}${effectsEnabled && isLastMoveTo ? ' arena-chess-piece-move-in' : ''}`} style={getPieceStyle()} draggable="false" />}
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
    <div className={`relative flex flex-col items-center ${arenaStyle ? 'arena-chess-board' : ''}`}>
      {arenaStyle ? (
        <div className="arena-match-effects-control" style={{ width: boardSize || 400 }}>
          <ArenaEffectsSwitch
            enabled={effectsEnabled}
            onToggle={onToggleEffects}
            context="match"
          />
        </div>
      ) : null}
      {arenaStyle ? (
        <>
          <div className="arena-board-halo" aria-hidden="true" />
          <div className="arena-board-orbit" aria-hidden="true"><i /><i /></div>
          <div className="arena-board-projection" aria-hidden="true" />
        </>
      ) : null}
      <div ref={containerRef} className="w-full flex justify-center">
        <div className={`relative rounded-xl overflow-hidden ${arenaStyle ? 'arena-chess-board__frame' : ''}`} style={{ width: boardSize || 400, height: boardSize || 400, minWidth: 248, minHeight: 248, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <div className={`grid gap-0 w-full h-full ${arenaStyle ? 'arena-chess-visual-surface' : ''}`} aria-hidden={arenaStyle ? 'true' : undefined} style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}>{renderBoard()}</div>
          {arenaStyle ? (
            <div className="arena-chess-hit-grid" role="group" aria-label="Chess board">
              {Array.from({ length: 64 }, (_, displayIdx) => {
                const actualIdx = getActualIndex(displayIdx);
                const piece = board[actualIdx];
                const pieceType = piece ? Number(piece.pieceType) : 0;
                const pieceColor = piece ? Number(piece.color) : 0;
                const squareLabel = indexToChessNotation(actualIdx);
                const pieceLabel = pieceType
                  ? `${pieceColor === 1 ? 'White' : 'Black'} ${PIECE_TYPES[pieceType]}`
                  : 'empty';
                const setHoverState = (event, active) => {
                  const visualSquare = event.currentTarget
                    .closest('.arena-chess-board__frame')
                    ?.querySelector(`[data-display-square="${displayIdx}"]`);
                  visualSquare?.classList.toggle('is-hit-hover', active);
                };

                return (
                  <button
                    key={displayIdx}
                    type="button"
                    aria-label={`${squareLabel}, ${pieceLabel}`}
                    aria-pressed={selectedSquare === displayIdx}
                    data-display-square={displayIdx}
                    disabled={interactionDisabled}
                    onClick={() => handleSquareClick(displayIdx)}
                    onMouseEnter={(event) => setHoverState(event, true)}
                    onMouseLeave={(event) => setHoverState(event, false)}
                    onFocus={(event) => setHoverState(event, true)}
                    onBlur={(event) => setHoverState(event, false)}
                    className="arena-chess-hit-square"
                  />
                );
              })}
            </div>
          ) : null}
          {arenaStyle ? <div className="arena-board-scan" aria-hidden="true" /> : null}
        </div>
      </div>
      {promotionSquare !== null && (
        <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl ${arenaStyle ? 'arena-promotion-layer' : ''}`}>
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

function getDemoChessInitialState() {
  return CHESS_NO_EN_PASSANT;
}

function getDemoChessMovePromotion(board, from, to, requestedPromotion = 0) {
  const piece = board[from];
  if (!piece || Number(piece.pieceType) !== 1) return 0;
  const toRank = Math.floor(to / 8);
  const isPromotionRank = toRank === 0 || toRank === 7;
  if (!isPromotionRank) return 0;
  return requestedPromotion || 5;
}

function getDemoChessLegalMoves(board, packedState, isWhite) {
  const packedBoard = boardArrayToPackedBoard(board);
  const legalMoves = [];

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || Number(piece.pieceType) === 0) continue;
    if (isWhite && Number(piece.color) !== 1) continue;
    if (!isWhite && Number(piece.color) !== 2) continue;

    const targets = getLegalMovesForSquare(packedBoard, packedState, from, isWhite);
    for (const to of targets) {
      legalMoves.push({
        from,
        to,
        promotion: getDemoChessMovePromotion(board, from, to),
      });
    }
  }

  return legalMoves;
}

function applyDemoChessMove(board, packedState, from, to, promotion = 0) {
  const nextBoard = board.map(piece => ({ ...piece }));
  const movingPiece = nextBoard[from];
  if (!movingPiece || Number(movingPiece.pieceType) === 0) {
    return { board: nextBoard, packedState };
  }

  const movingPieceType = Number(movingPiece.pieceType);
  const movingColor = Number(movingPiece.color);
  const isWhite = movingColor === 1;
  const capturedPiece = nextBoard[to];
  const previousEnPassant = Number(BigInt(packedState) & 0x3Fn);
  let nextState = BigInt(packedState) & ~0x3Fn;
  nextState |= CHESS_NO_EN_PASSANT;

  if (movingPieceType === 6) {
    nextState |= isWhite ? WHITE_KING_MOVED : BLACK_KING_MOVED;
    if (Math.abs((to % 8) - (from % 8)) === 2) {
      const rookFrom = to > from ? from + 3 : from - 4;
      const rookTo = to > from ? from + 1 : from - 1;
      nextBoard[rookTo] = nextBoard[rookFrom];
      nextBoard[rookFrom] = { pieceType: 0, color: 0 };
    }
  }

  if (movingPieceType === 4) {
    if (from === 0) nextState |= WHITE_ROOK_A_MOVED;
    if (from === 7) nextState |= WHITE_ROOK_H_MOVED;
    if (from === 56) nextState |= BLACK_ROOK_A_MOVED;
    if (from === 63) nextState |= BLACK_ROOK_H_MOVED;
  }

  if (capturedPiece?.pieceType) {
    if (to === 0) nextState |= WHITE_ROOK_A_MOVED;
    if (to === 7) nextState |= WHITE_ROOK_H_MOVED;
    if (to === 56) nextState |= BLACK_ROOK_A_MOVED;
    if (to === 63) nextState |= BLACK_ROOK_H_MOVED;
  }

  if (movingPieceType === 1 && to === previousEnPassant && !capturedPiece?.pieceType) {
    const capturedPawnSquare = isWhite ? to - 8 : to + 8;
    nextBoard[capturedPawnSquare] = { pieceType: 0, color: 0 };
  }

  const fromRank = Math.floor(from / 8);
  const toRank = Math.floor(to / 8);
  const promotedPieceType = getDemoChessMovePromotion(board, from, to, promotion);
  nextBoard[to] = {
    pieceType: promotedPieceType || movingPieceType,
    color: movingColor,
  };
  nextBoard[from] = { pieceType: 0, color: 0 };

  if (movingPieceType === 1 && Math.abs(toRank - fromRank) === 2) {
    nextState = (nextState & ~0x3Fn) | BigInt(isWhite ? from + 8 : from - 8);
  }

  const checkStatus = getCheckStatusFromPackedBoard(boardArrayToPackedBoard(nextBoard));
  nextState &= ~(WHITE_IN_CHECK | BLACK_IN_CHECK);
  if (checkStatus.whiteInCheck) nextState |= WHITE_IN_CHECK;
  if (checkStatus.blackInCheck) nextState |= BLACK_IN_CHECK;

  return {
    board: nextBoard,
    packedBoard: boardArrayToPackedBoard(nextBoard),
    packedState: nextState,
    whiteInCheck: checkStatus.whiteInCheck,
    blackInCheck: checkStatus.blackInCheck,
  };
}

function getDemoChessResolution(board, packedState, nextIsWhite) {
  const legalMoves = getDemoChessLegalMoves(board, packedState, nextIsWhite);
  if (legalMoves.length > 0) return null;

  const checkStatus = getCheckStatusFromPackedBoard(boardArrayToPackedBoard(board));
  const nextPlayerInCheck = nextIsWhite ? checkStatus.whiteInCheck : checkStatus.blackInCheck;
  return nextPlayerInCheck ? 'checkmate' : 'stalemate';
}

function getDemoChessPieceValue(piece) {
  return DEMO_CHESS_PIECE_VALUES[Number(piece?.pieceType) || 0] || 0;
}

function getDemoChessSquareScore(piece, square) {
  const pieceType = Number(piece?.pieceType || 0);
  const color = Number(piece?.color || 0);
  if (!pieceType || !color) return 0;

  const file = square % 8;
  const rank = Math.floor(square / 8);
  const centerDistance = Math.abs(file - 3.5) + Math.abs(rank - 3.5);

  if (pieceType === 1) {
    const progress = color === 1 ? rank : 7 - rank;
    return progress * 9 - Math.abs(file - 3.5) * 2;
  }
  if (pieceType === 2 || pieceType === 3) return Math.round(30 - centerDistance * 7);
  if (pieceType === 4) return Math.round(12 - Math.abs(file - 3.5) * 2);
  if (pieceType === 5) return Math.round(10 - centerDistance * 2);
  if (pieceType === 6) {
    const homeRank = color === 1 ? 0 : 7;
    const isCastled = rank === homeRank && (file === 2 || file === 6);
    return isCastled ? 45 : -Math.round(centerDistance * 2);
  }
  return 0;
}

function getDemoChessPositionScore(board, computerIsWhite) {
  let score = 0;

  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (!piece?.pieceType) continue;

    const pieceScore = getDemoChessPieceValue(piece) + getDemoChessSquareScore(piece, square);
    const isComputerPiece = computerIsWhite ? Number(piece.color) === 1 : Number(piece.color) === 2;
    score += isComputerPiece ? pieceScore : -pieceScore;
  }

  return score;
}

function getDemoChessOpponentBestReplyScore(board, packedState, opponentIsWhite, computerIsWhite) {
  const opponentMoves = getDemoChessLegalMoves(board, packedState, opponentIsWhite);
  if (opponentMoves.length === 0) {
    const resolution = getDemoChessResolution(board, packedState, opponentIsWhite);
    return resolution === 'checkmate' ? 100_000 : 0;
  }

  let worstScore = Number.POSITIVE_INFINITY;
  for (const reply of opponentMoves) {
    const replyResult = applyDemoChessMove(board, packedState, reply.from, reply.to, reply.promotion);
    const computerInCheck = computerIsWhite ? replyResult.whiteInCheck : replyResult.blackInCheck;
    let replyScore = getDemoChessPositionScore(replyResult.board, computerIsWhite);

    if (computerInCheck) {
      const computerMoves = getDemoChessLegalMoves(replyResult.board, replyResult.packedState, computerIsWhite);
      if (computerMoves.length === 0) replyScore = -100_000;
      else replyScore -= 30;
    }

    worstScore = Math.min(worstScore, replyScore);
  }

  return worstScore;
}

function scoreDemoChessComputerMove(board, packedState, move, computerIsWhite, aiSettings) {
  const movingPiece = board[move.from];
  const movingPieceType = Number(movingPiece?.pieceType || 0);
  const moveResult = applyDemoChessMove(board, packedState, move.from, move.to, move.promotion);
  const opponentIsWhite = !computerIsWhite;
  const opponentInCheck = opponentIsWhite ? moveResult.whiteInCheck : moveResult.blackInCheck;
  const replyScore = getDemoChessOpponentBestReplyScore(
    moveResult.board,
    moveResult.packedState,
    opponentIsWhite,
    computerIsWhite,
  );

  if (replyScore >= 100_000) return replyScore;

  let score = replyScore;
  if (opponentInCheck) score += 35;
  if (move.promotion) score += 250;
  if (DEMO_CHESS_AI_CENTER_SQUARES.has(move.to)) score += 18;
  else if (DEMO_CHESS_AI_EXTENDED_CENTER_SQUARES.has(move.to)) score += 8;

  const fromRank = Math.floor(move.from / 8);
  const backRank = computerIsWhite ? 0 : 7;
  if ((movingPieceType === 2 || movingPieceType === 3) && fromRank === backRank) score += 18;
  if (movingPieceType === 6 && Math.abs((move.to % 8) - (move.from % 8)) === 2) score += 35;
  if (movingPieceType === 5 && board.filter(piece => Number(piece?.pieceType) > 0).length > 26) score -= 18;

  return score + Math.random() * aiSettings.scoreNoise;
}

function chooseDemoChessComputerMove(board, packedState, computerIsWhite, demoElo = DEFAULT_DEMO_CHESS_ELO) {
  const legalMoves = getDemoChessLegalMoves(board, packedState, computerIsWhite);
  if (legalMoves.length === 0) return null;

  const aiSettings = getDemoChessAiSettings(demoElo);
  const scoredMoves = legalMoves
    .map(move => ({
      ...move,
      score: scoreDemoChessComputerMove(board, packedState, move, computerIsWhite, aiSettings),
    }))
    .sort((a, b) => b.score - a.score);

  if (scoredMoves[0]?.score >= 100_000) return scoredMoves[0];

  const bestScore = scoredMoves[0]?.score ?? 0;
  const sensibleMoves = scoredMoves.filter(move => move.score >= bestScore - aiSettings.sensibleMoveMargin);
  if (Math.random() < aiSettings.smartMoveChance) {
    return sensibleMoves[Math.floor(Math.random() * sensibleMoves.length)];
  }

  const imperfectMoves = scoredMoves.filter(move => move.score >= bestScore - aiSettings.imperfectMoveMargin);
  const imperfectMoveCount = Math.max(1, Math.ceil(imperfectMoves.length * aiSettings.imperfectMovePoolRatio));
  const imperfectMovePool = imperfectMoves.slice(0, imperfectMoveCount);
  return imperfectMovePool[Math.floor(Math.random() * imperfectMovePool.length)];
}

function buildReplayChessBoard(moveHistory, effectiveMoveIndex, fallbackBoard) {
  if (effectiveMoveIndex >= moveHistory.length - 1) {
    return fallbackBoard;
  }

  const board = createInitialChessBoard();
  let packedState = getDemoChessInitialState();
  for (let i = 0; i <= effectiveMoveIndex && i < moveHistory.length; i++) {
    const move = moveHistory[i];
    if (move.from >= 0 && move.from < 64 && move.to >= 0 && move.to < 64) {
      if (move.isDemo) {
        const moveResult = applyDemoChessMove(board, packedState, move.from, move.to, move.promotion || 0);
        for (let square = 0; square < 64; square++) {
          board[square] = moveResult.board[square];
        }
        packedState = moveResult.packedState;
      } else {
        board[move.to] = board[move.from];
        board[move.from] = { pieceType: 0, color: 0 };
      }
    }
  }

  return board;
}

const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onSpectateMatch, onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onResetEnrollmentWindow, onCancelTournament, onEnroll, onConnectWallet, account, loading, connectLoading, syncDots, isEnrolled, entryFee, isFull, instanceContract, onPlayerAddressClick, arenaStyle = false, routeBase = '/v3/chess' }) => {
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
  const bracketEmptyMessage = status === 0
    ? 'Brackets will be generated once the instance starts.'
    : Number(tournamentData.completionReason) === V2TournamentResolutionReason.SOLO_ENROLL_CANCELLED
      ? 'This instance was cancelled.'
      : Number(tournamentData.completionReason) === V2TournamentResolutionReason.ABANDONED_TOURNAMENT_CLAIMED
        ? 'This instance was abandoned.'
        : 'No bracket data available.';

  return (
    <div className={`mb-16 ${arenaStyle ? 'arena-bracket t2-tournament-bracket' : ''}`}>
      <TournamentHeader
        gameType="chess"
        reasonLabelMode="v2"
        tierId={VIRTUAL_TIER_ID}
        instanceId={VIRTUAL_INSTANCE_ID}
        instanceAddress={tournamentData.address}
        shareUrlOverride={tournamentData.address ? createV3TournamentUrl('chess', tournamentData.address) : undefined}
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
      <TraditionalTournamentBracket
        bracketRef={bracketViewRef}
        title={arenaStyle ? 'Arena Bracket' : 'Bracket'}
        rounds={rounds}
        hasValidRounds={hasValidRounds}
        emptyMessage={bracketEmptyMessage}
        renderMatch={({ match, round, roundIdx, matchIdx, nextRound, isFinalRound }) => (
          <MatchCard
            match={match}
            reasonLabelMode="v2"
            tournamentCompletionReason={tournamentData.completionReason}
            totalMatchesInRound={round.matches.length}
            nextRoundLabel={nextRound?.label ?? null}
            isFinalRound={isFinalRound}
            matchIdx={matchIdx}
            roundIdx={roundIdx}
            tierId={VIRTUAL_TIER_ID}
            instanceId={VIRTUAL_INSTANCE_ID}
            account={account}
            loading={loading}
            onEnterMatch={onEnterMatch}
            onSpectateMatch={onSpectateMatch}
            onForceEliminate={onForceEliminate}
            onClaimReplacement={onClaimReplacement}
            matchStatusOptions={{ doubleForfeitText: 'Eliminated - Double Forfeit' }}
            showEscalation={true}
            showThisIsYou={true}
            gameName="chess"
            compact={true}
            isTournamentCompleted={status === 2}
          />
        )}
        renderEmpty={() => (
          <>
            {enrolledCount === 0 && <hr className="border-purple-500/20" />}
            {enrolledCount === 0 && (
              <div id="last-instance">
                <RecentInstanceCard tierId={VIRTUAL_TIER_ID} instanceId={VIRTUAL_INSTANCE_ID} contract={instanceContract} tierName={tournamentTypeLabel} walletAddress={account} reasonLabelMode="v2" />
              </div>
            )}
          </>
        )}
      />
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

export default function ChessPage({ routeBase = '/v3/chess' }) {
  useInitialDocumentScrollTop(routeBase);

  const activeTheme = arenaTheme;
  const [arenaEffectsEnabled, setArenaEffectsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(CHESS_ARENA_EFFECTS_STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  });

  const toggleArenaEffects = useCallback(() => {
    setArenaEffectsEnabled((wasEnabled) => {
      const isEnabled = !wasEnabled;
      try {
        window.localStorage.setItem(CHESS_ARENA_EFFECTS_STORAGE_KEY, isEnabled ? 'on' : 'off');
      } catch {
        // The visual preference still applies for this visit.
      }
      return isEnabled;
    });
  }, []);

  useEffect(() => {
    document.body.classList.add('t2-experience-active', 't2-experience-chess');
    return () => document.body.classList.remove('t2-experience-active', 't2-experience-chess');
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const rpcProviderRef = useRef(null);
  const pendingScrollAddressRef = useRef(null);
  const tournamentBracketRef = useRef(null);
  const matchViewRef = useRef(null);
  const boardViewRef = useRef(null);
  const collapseActivityPanelRef = useRef(null);

  const [factoryAddress, setFactoryAddress] = useState(CHESS_FACTORY_ADDRESS);
  const {
    account,
    browserProvider,
    connect: connectV3Wallet,
    isConnecting,
    walletAvailable,
  } = useV3Wallet({
    targetChainIdHex: V3_TARGET_CHAIN_ID_HEX,
    getAddChainParams: getV3WalletAddChainParams,
  });
  const [rpcReady, setRpcReady] = useState(false);
  const [rpcProvider, setRpcProvider] = useState(null);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [factoryRules, setFactoryRules] = useState(null);
  const [implementationAddress, setImplementationAddress] = useState(CHESS_IMPLEMENTATION_ADDRESS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolvedFactoryContract, setResolvedFactoryContract] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [actionState, setActionState] = useState({ type: 'info', message: '' });
  const [isCreateFormExpanded, setIsCreateFormExpanded] = useState(false);
  const [shouldRenderCreateFormBody, setShouldRenderCreateFormBody] = useState(false);
  const [isCreateFormBodyVisible, setIsCreateFormBodyVisible] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isWhatIsThisOpen, setIsWhatIsThisOpen] = useState(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState(false);
  const [isDemoLevelOpen, setIsDemoLevelOpen] = useState(false);
  const [demoElo, setDemoElo] = useState(DEFAULT_DEMO_CHESS_ELO);
  const hadConnectedAccountRef = useRef(false);

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

  const handleWhatIsThisLinkClick = useCallback((event) => {
    event.preventDefault();
    setIsWhatIsThisOpen(true);
  }, []);

  const handleQuickGuideLinkClick = useCallback((event) => {
    event.preventDefault();
    setIsQuickGuideOpen(true);
  }, []);

  const handleUserManualLinkClick = useCallback((event) => {
    event.preventDefault();
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
  const explorerUrl = getV3AddressUrl(factoryAddress);
  const [hasProcessedInviteParam, setHasProcessedInviteParam] = useState(false);
  const [allowInitialUrlHydration, setAllowInitialUrlHydration] = useState(() => !shouldResetOnInitialDocumentLoad(routeBase, { allowInviteParam: true }));
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [activeInstanceContract, setActiveInstanceContract] = useState(null);
  const v3Session = useV3Session({
    account,
    instanceAddress: viewingTournament?.address || selectedAddress,
    factoryAddress,
  });

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
  const demoComputerMoveTimeoutRef = useRef(null);

  const [leaderboard] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [isMobileBottomNavExpanded, setIsMobileBottomNavExpanded] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState(null);
  const [isTabActive, setIsTabActive] = useState(typeof document === 'undefined' ? true : !document.hidden);
  const isPlayerActivityContextActive = Boolean(activeInstanceContract || viewingTournament || currentMatch);
  const shouldPollPlayerActivity = Boolean(account) && isTabActive;
  const shouldScanFactoryForPlayerActivity = Boolean(account) && isTabActive && (expandedPanel === 'playerActivity' || isPlayerActivityContextActive);
  const shouldPollPlayerProfile = Boolean(account) && isTabActive && expandedPanel === 'recentMatches';
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [alertMatch, setAlertMatch] = useState(null);

  useEffect(() => {
    setIsMobileBottomNavExpanded(!currentMatch);
  }, [currentMatch]);
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
    for (const candidateAddress of CHESS_FACTORY_ADDRESS_CANDIDATES) {
      const code = await runner.getCode(candidateAddress);
      if (!code || code === '0x') continue;
      const contract = getFactoryContract(runner, candidateAddress);
      setFactoryAddress(candidateAddress);
      return contract;
    }
    throw new Error(`No validated Chess V3 factory found at ${CHESS_FACTORY_ADDRESS_CANDIDATES.join(' or ')} on ${V3_NETWORK_NAME}.`);
  };

  useEffect(() => {
    const provider = createV3RpcProvider();
    rpcProviderRef.current = provider;
    setRpcProvider(provider);
    setResolvedFactoryContract(getFactoryContract(provider, factoryAddress));
    setRpcReady(true);
  }, [factoryAddress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!rpcReady && !browserProvider) return;
    let cancelled = false;
    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError('');
      try {
        const {
          factory: liveFactory,
          minEntryFee,
          feeIncrement,
          implementation,
        } = await readV3FactoryDashboard(resolveFactoryContract);
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

    return readV3TournamentState({
      address,
      instance,
      runner,
      account,
      getRoundLabel,
      virtualTierId: VIRTUAL_TIER_ID,
      virtualInstanceId: VIRTUAL_INSTANCE_ID,
      mapTournamentSnapshot: ({ address: instanceAddress, info, tournament, players, enrolled }) => (
        normalizeInstanceSnapshot(instanceAddress, info, tournament, players, enrolled)
      ),
      mapPrizeDistribution: normalizePrizeDistribution,
      mapBracketMatch: ({
        roundNumber,
        matchNumber,
        matchData,
        fullMatch,
        boardResult,
        tierConfig,
        timeoutData,
        escL2Available,
        escL3Available,
        isUserAdvancedForRound,
      }) => {
        const packedBoard = Array.isArray(boardResult) ? boardResult[0] : boardResult?.board;
        const packedState = Array.isArray(boardResult) ? boardResult[1] : boardResult?.state;
        const normalized = normalizeMatch(
          roundNumber,
          matchNumber,
          matchData,
          packedBoard,
          packedState,
        );
        return hydrateBracketMatchData(account, normalized, {
          matchData,
          fullMatch,
          boardResult,
          tierConfig,
          timeoutData,
          escL2Available,
          escL3Available,
          isUserAdvancedForRound,
        });
      },
    });
  };

  const refreshTournamentBracket = useCallback(async (address) => {
    try { return await buildBracketData(address, getInstanceContract(address, getReadRunner())); } catch (error) { console.error('[ChessV2] Error refreshing tournament bracket:', error); return null; }
  }, [account]);

  const connectWallet = async () => {
    if (!walletAvailable) {
      if (isMobileDevice() && !isWalletBrowser()) { triggerWalletPrompt(); return; }
      setActionState({ type: 'error', message: 'No injected wallet detected. Open this page in a wallet browser or install MetaMask.' });
      return;
    }
    try {
      await connectV3Wallet();
    } catch (error) {
      showActionError('connect your wallet', error, 'Wallet connection failed.');
    }
  };

  const refreshDashboard = async () => {
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const {
        factory: liveFactory,
        minEntryFee,
        feeIncrement,
        implementation,
      } = await readV3FactoryDashboard(resolveFactoryContract);
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
        navigate(routeBase, { replace: false, state: { view: 'bracket', instanceAddress: address, from: location.state?.view || 'landing' } });
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
    const contractAddress = parseV3InstanceParam(searchParams);
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
    navigate(routeBase, { replace: true, state: null });
  }, [allowInitialUrlHydration, navigate]);

  useEffect(() => {
    if (allowInitialUrlHydration) return;
    if (location.pathname !== routeBase || location.search || location.state) return;
    setAllowInitialUrlHydration(true);
  }, [allowInitialUrlHydration, location.pathname, location.search, location.state]);

  const createInstance = async (event) => {
    event.preventDefault();
    if (!browserProvider || !account) { setActionState({ type: 'error', message: 'Connect a wallet before creating an instance.' }); return; }
    setCreateLoading(true);
    let preparedSession = null;
    let transactionSubmitted = false;
    setActionState({ type: 'info', message: 'Preparing an encrypted prompt-free session...' });
    try {
      const normalizedTimeouts = normalizeCreateTimeouts(createForm);
      setCreateForm(prev => ({ ...prev, ...normalizedTimeouts }));
      const signer = await browserProvider.getSigner();
      const creator = await signer.getAddress();
      const readFactory = await resolveFactoryContract();
      const writableFactory = await getWritableFactoryContract(browserProvider, readFactory, signer);
      let sessionExecutor = ethers.ZeroAddress;
      try {
        preparedSession = await v3Session.prepareCreation(readFactory.target);
        sessionExecutor = preparedSession.executor;
      } catch (sessionError) {
        if (!window.confirm('Prompt-free session setup is unavailable. Create in wallet-confirmation-only mode?')) {
          throw sessionError;
        }
        v3Session.selectDirectPrimary();
      }
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
      setActionState({ type: 'info', message: preparedSession
        ? 'Confirm once to create, enroll, and enable prompt-free moves...'
        : 'Confirm tournament creation in your wallet...' });
      const tx = await writableFactory.createInstance(
        Number(createForm.playerCount),
        entryFeeWei,
        BigInt(normalizedTimeouts.enrollmentWindow),
        BigInt(normalizedTimeouts.matchTimePerPlayer),
        BigInt(normalizedTimeouts.timeIncrementPerMove),
        sessionExecutor,
        { value: entryFeeWei },
      );
      transactionSubmitted = true;
      setActionState({ type: 'info', message: 'Transaction submitted. Waiting for block confirmation...' });
      const receipt = await tx.wait();
      setActionState({ type: 'info', message: 'Transaction confirmed. Locating the new instance and syncing tournament data...' });
      const address = await resolveCreatedInstanceAddress({ factory: readFactory, provider: getReadRunner(), creator, playerCount: Number(createForm.playerCount), entryFeeWei, countBefore, receipt });
      if (!address) throw new Error('Transaction mined, but the frontend could not locate the created instance.');
      if (preparedSession) {
        const finalized = await v3Session.finalizeCreation(preparedSession, address);
        preparedSession = null;
        if (finalized.inspection.status !== 'active') {
          throw new Error(`Creator session was registered but is ${finalized.inspection.status}.`);
        }
      }
      const createdInstance = getInstanceContract(address, getReadRunner());
      const creatorEnrolled = await createdInstance.isEnrolled(creator).catch(() => false);
      if (!creatorEnrolled) throw new Error(`Instance created at ${address}, but creator enrollment was not confirmed.`);
      setActionState({ type: 'success', message: `Instance created and enrollment verified on-chain at ${address}.` });
      await refreshDashboard();
      await enterInstanceBracket(address);
    } catch (error) {
      if (preparedSession && !transactionSubmitted) {
        await v3Session.discardCreation(preparedSession).catch(() => {});
      }
      console.error('[ChessV3 createInstance] raw error:', error);
      showActionError('create this lobby', error, 'Could not create instance.');
    } finally {
      setCreateLoading(false);
    }
  };

  const withInstanceSigner = async (instanceContract) => {
    if (!browserProvider || !account) throw new Error('Connect a wallet first.');
    if (!resolvedFactoryContract) throw new Error('The validated V3 factory is unavailable.');
    return await getWritableInstanceContract(
      browserProvider,
      resolvedFactoryContract,
      instanceContract,
    );
  };

  const handleEnroll = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract) return;
    if (!account) { setActionState({ type: 'error', message: 'Please connect your wallet first.' }); return; }
    let preparedSession = null;
    let transactionSubmitted = false;
    try {
      setTournamentsLoading(true);
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      const previousTournament = viewingTournament;
      let sessionExecutor = ethers.ZeroAddress;
      try {
        preparedSession = await v3Session.prepareEnrollment(previousTournament.address);
        sessionExecutor = preparedSession.executor;
      } catch (sessionError) {
        if (!window.confirm('Prompt-free session setup is unavailable. Join in wallet-confirmation-only mode?')) {
          throw sessionError;
        }
        v3Session.selectDirectPrimary();
      }
      setActionState({ type: 'info', message: preparedSession
        ? 'Confirm once to join and enable prompt-free moves...'
        : 'Confirm enrollment in your wallet...' });
      const tx = await writableInstance.enrollInTournament(
        sessionExecutor,
        { value: viewingTournament.entryFeeWei },
      );
      transactionSubmitted = true;
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
      if (preparedSession) {
        const inspection = await v3Session.confirmEnrollment(preparedSession);
        if (inspection.status !== 'active') {
          throw new Error(`Enrollment confirmed, but the session is ${inspection.status}.`);
        }
        preparedSession = null;
      }
      const updated = syncResult.updated || await refreshTournamentBracket(previousTournament.address);
      if (updated) setViewingTournament(updated);
      setActionState({
        type: syncResult.synced ? 'success' : 'info',
        message: syncResult.synced
          ? 'Enrollment confirmed and reflected in the tournament lobby.'
          : 'Enrollment confirmed on-chain. The tournament lobby is still syncing and should update shortly.',
      });
    } catch (error) {
      if (preparedSession && (!transactionSubmitted || Number(error?.receipt?.status) === 0)) {
        await v3Session.discardEnrollment(preparedSession).catch(() => {});
      }
      console.error('[ChessV3] Enroll error:', error);
      showActionError('join this lobby', error, 'Enrollment failed.');
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket, showActionError, v3Session]);

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
      navigate(routeBase, { replace: true, state: null });
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
    navigate(routeBase, { replace: true, state: null });
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
  const highlightViewerAddress = currentMatch?.isDemo
    ? DEMO_HUMAN_ADDRESS
    : (account || currentMatch?.firstPlayer || '');
  const getHistoryHighlightMove = (index) => {
    const move = index >= 0 ? moveHistory[index] : null;
    if (!move) return null;
    return {
      from: move.from,
      to: move.to,
      isMyMove: Boolean(
        highlightViewerAddress &&
        move.address?.toLowerCase() === highlightViewerAddress.toLowerCase()
      ),
    };
  };
  const historyLastIndex = moveHistory.length - 1;
  const historyLatestMove = getHistoryHighlightMove(historyLastIndex);
  const currentLatestMove = currentMatch?.lastMove ?? null;
  const currentMoveMatchesHistory = Boolean(
    currentLatestMove &&
    historyLatestMove &&
    currentLatestMove.from === historyLatestMove.from &&
    currentLatestMove.to === historyLatestMove.to
  );
  const displayedLastMove = currentMatch?.matchStatus === 2
    ? getHistoryHighlightMove(effectiveReplayMoveIndex)
    : (currentMoveMatchesHistory ? historyLatestMove : (currentLatestMove || historyLatestMove));
  const displayedSecondLastMove = currentMatch?.matchStatus === 2
    ? getHistoryHighlightMove(effectiveReplayMoveIndex - 1)
    : (
        currentLatestMove && historyLatestMove && !currentMoveMatchesHistory
          ? historyLatestMove
          : getHistoryHighlightMove(historyLastIndex - 1)
      );

  const refreshMatchData = useCallback(async (instanceCont, userAccount, matchInfo) => {
    try {
      const runner = getReadRunner();
      const {
        matchData,
        fullMatch,
        boardResult,
        tierConfig,
        instanceInfo,
        timeoutData,
        escL2Available,
        escL3Available,
        isUserAdvancedForRound,
      } = await readV3ActiveMatchState({
        instance: instanceCont,
        runner,
        account: userAccount,
        matchInfo,
      });
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
    // Allow viewing completed tournaments without wallet connection
    const isTournamentCompleted = viewingTournament?.status === 2;
    if (!account && !isTournamentCompleted) { alert('Please connect your wallet first.'); return; }
    const instanceAddress = (typeof _instanceId === 'string' && _instanceId.startsWith('0x')) ? _instanceId : (viewingTournament?.address || '');
    let instanceCont = activeInstanceContractRef.current;
    if (!instanceCont || (instanceAddress && (instanceCont.target || instanceCont.address)?.toLowerCase() !== instanceAddress.toLowerCase())) {
      if (!instanceAddress) { alert(isTournamentCompleted ? 'Unable to load tournament data.' : 'Missing instance address.'); return; }
      instanceCont = getInstanceContract(instanceAddress, getReadRunner());
      setActiveInstanceContract(instanceCont);
      activeInstanceContractRef.current = instanceCont;
    }
    try {
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
      setMatchLoading(true);
      const updated = await refreshMatchData(instanceCont, account, { tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID, roundNumber, matchNumber, playerCount: viewingTournament?.playerCount ?? null, prizePool: viewingTournament?.prizePoolWei || 0n, instanceAddress });
      if (updated) {
        setIsSpectator(!(account && (updated.player1?.toLowerCase() === account.toLowerCase() || updated.player2?.toLowerCase() === account.toLowerCase())));
        setCurrentMatch(updated);
        previousBoardRef.current = JSON.stringify(updated.board);
        setMatchEndResult(null);
        setMatchEndWinner(null);
        setMatchEndLoser(null);
        setMatchEndWinnerLabel('');
        matchEndModalShownRef.current = updated.matchStatus === 2;
        setMoveHistory(buildMoveHistory(updated.movesString, updated.firstPlayer, updated.player1, updated.player2));
        skipNavEffectRef.current = true;
        navigate(routeBase, { replace: false, state: { view: 'match', instanceAddress, roundNumber, matchNumber, from: location.state?.view || 'bracket' } });
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

  const resolveDemoMatch = useCallback((nextMatch, history, nextIsWhite) => {
    const resolution = getDemoChessResolution(nextMatch.board, nextMatch.packedState, nextIsWhite);
    if (!resolution) return false;

    const isDemoMatchDraw = resolution === 'stalemate';
    const whiteAddress = nextMatch.firstPlayer;
    const blackAddress = whiteAddress?.toLowerCase() === nextMatch.player1?.toLowerCase()
      ? nextMatch.player2
      : nextMatch.player1;
    const playerToMoveAddress = nextIsWhite ? whiteAddress : blackAddress;
    const winnerAddress = isDemoMatchDraw
      ? ethers.ZeroAddress
      : (playerToMoveAddress?.toLowerCase() === nextMatch.player1?.toLowerCase() ? nextMatch.player2 : nextMatch.player1);
    const loserAddress = isDemoMatchDraw
      ? ethers.ZeroAddress
      : playerToMoveAddress;

    const completedMatch = {
      ...nextMatch,
      matchStatus: 2,
      status: 2,
      completionReason: isDemoMatchDraw ? CompletionReason.DRAW : CompletionReason.NORMAL_WIN,
      winner: winnerAddress,
      loser: loserAddress,
      currentTurn: ethers.ZeroAddress,
      isYourTurn: false,
      movesString: history.map(move => `${String.fromCharCode(move.from)}${String.fromCharCode(move.to)}`).join(''),
    };

    setCurrentMatch(completedMatch);
    previousBoardRef.current = JSON.stringify(completedMatch.board);
    setMoveHistory(history);

    const userWon = winnerAddress === DEMO_HUMAN_ADDRESS;
    const resultType = isDemoMatchDraw ? 'draw' : (userWon ? 'win' : 'lose');

    window.setTimeout(() => {
      setMatchEndResult({ result: resultType, completionReason: completedMatch.completionReason });
      setMatchEndWinner(winnerAddress);
      setMatchEndLoser(loserAddress);
      matchEndModalShownRef.current = true;
    }, 350);

    return true;
  }, []);

  const makeDemoComputerMove = useCallback((matchSnapshot, history) => {
    const computerIsWhite = matchSnapshot.firstPlayer?.toLowerCase() === DEMO_COMPUTER_ADDRESS.toLowerCase();
    const move = chooseDemoChessComputerMove(
      matchSnapshot.board,
      matchSnapshot.packedState,
      computerIsWhite,
      matchSnapshot.demoElo,
    );
    if (!move) {
      resolveDemoMatch(matchSnapshot, history, computerIsWhite);
      return;
    }

    const moveResult = applyDemoChessMove(matchSnapshot.board, matchSnapshot.packedState, move.from, move.to, move.promotion);
    const computerSymbol = computerIsWhite ? 'White' : 'Black';
    const nextHistory = [
      ...history,
      {
        player: computerIsWhite ? '♔' : '♚',
        move: `${indexToChessNotation(move.from)}→${indexToChessNotation(move.to)}`,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        address: DEMO_COMPUTER_ADDRESS,
        label: `Computer (${computerSymbol})`,
        isDemo: true,
      },
    ];
    const nextMatch = {
      ...matchSnapshot,
      board: moveResult.board,
      packedBoard: moveResult.packedBoard,
      packedState: moveResult.packedState,
      currentTurn: DEMO_HUMAN_ADDRESS,
      isYourTurn: true,
      lastMoveTime: Math.floor(Date.now() / 1000),
      whiteInCheck: moveResult.whiteInCheck,
      blackInCheck: moveResult.blackInCheck,
      lastMove: { from: move.from, to: move.to, isMyMove: false },
      movesString: nextHistory.map(historyMove => `${String.fromCharCode(historyMove.from)}${String.fromCharCode(historyMove.to)}`).join(''),
    };

    if (resolveDemoMatch(nextMatch, nextHistory, !computerIsWhite)) return;

    setCurrentMatch(nextMatch);
    previousBoardRef.current = JSON.stringify(nextMatch.board);
    setMoveHistory(nextHistory);
  }, [resolveDemoMatch]);

  const handleStartDemoMatch = useCallback((selectedElo = demoElo) => {
    if (account) return;
    if (demoComputerMoveTimeoutRef.current) {
      window.clearTimeout(demoComputerMoveTimeoutRef.current);
      demoComputerMoveTimeoutRef.current = null;
    }

    const humanStarts = Math.random() < 0.5;
    const firstPlayer = humanStarts ? DEMO_HUMAN_ADDRESS : DEMO_COMPUTER_ADDRESS;
    const humanSymbol = humanStarts ? 'White' : 'Black';
    const selectedDemoElo = clampDemoChessElo(selectedElo);
    const initialBoard = createInitialChessBoard();
    const initialPackedBoard = boardArrayToPackedBoard(initialBoard);
    const initialPackedState = getDemoChessInitialState();
    const now = Math.floor(Date.now() / 1000);

    const demoMatch = {
      isDemo: true,
      tierId: VIRTUAL_TIER_ID,
      instanceId: VIRTUAL_INSTANCE_ID,
      instanceAddress: '',
      roundNumber: 0,
      matchNumber: 0,
      playerCount: 2,
      player1: DEMO_HUMAN_ADDRESS,
      player2: DEMO_COMPUTER_ADDRESS,
      player1DisplayLabel: `You (${humanSymbol})`,
      player2DisplayLabel: `Computer (${selectedDemoElo} ELO)`,
      demoElo: selectedDemoElo,
      firstPlayer,
      currentTurn: firstPlayer,
      matchStatus: 1,
      status: 1,
      completionReason: 0,
      winner: ethers.ZeroAddress,
      loser: ethers.ZeroAddress,
      lastMoveTime: now,
      startTime: now,
      isYourTurn: humanStarts,
      timeoutState: { timeoutActive: false },
      matchTimePerPlayer: DEMO_MATCH_TIME_SECONDS,
      player1TimeRemaining: DEMO_MATCH_TIME_SECONDS,
      player2TimeRemaining: DEMO_MATCH_TIME_SECONDS,
      board: initialBoard,
      packedBoard: initialPackedBoard,
      packedState: initialPackedState,
      whiteInCheck: false,
      blackInCheck: false,
      lastMove: null,
      movesString: '',
    };

    setCurrentMatch(demoMatch);
    setViewingTournament(null);
    setActiveInstanceContract(null);
    activeInstanceContractRef.current = null;
    setIsSpectator(false);
    setMatchLoading(false);
    setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
    setMoveHistory([]);
    setReplayMoveIndex(-2);
    setMoveTxTimeout(null);
    setMatchEndResult(null);
    setMatchEndWinner(null);
    setMatchEndLoser(null);
    setMatchEndWinnerLabel('');
    setNextActiveMatch(null);
    setGhostMove(null);
    previousBoardRef.current = JSON.stringify(demoMatch.board);
    matchEndModalShownRef.current = false;
    skipNavEffectRef.current = true;
    navigate(routeBase, { replace: false, state: { view: 'demo-match' } });

    window.setTimeout(() => {
      boardViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    if (!humanStarts) {
      demoComputerMoveTimeoutRef.current = window.setTimeout(() => {
        makeDemoComputerMove(demoMatch, []);
        demoComputerMoveTimeoutRef.current = null;
      }, 550);
    }
  }, [account, demoElo, makeDemoComputerMove, navigate]);

  useEffect(() => () => {
    if (demoComputerMoveTimeoutRef.current) {
      window.clearTimeout(demoComputerMoveTimeoutRef.current);
    }
  }, []);

  const handleMakeMove = async (fromSquare, toSquare, promotion = 0) => {
    if (currentMatch?.isDemo) {
      if (!currentMatch.isYourTurn || currentMatch.matchStatus === 2) return;
      const humanIsWhite = currentMatch.firstPlayer?.toLowerCase() === DEMO_HUMAN_ADDRESS.toLowerCase();
      const demoPromotion = getDemoChessMovePromotion(currentMatch.board, fromSquare, toSquare, promotion);
      const reason = validateMoveWithReason(currentMatch.packedBoard, currentMatch.packedState, fromSquare, toSquare, humanIsWhite, demoPromotion);
      if (reason) { alert(`Invalid Move: ${reason}`); return; }

      const moveResult = applyDemoChessMove(currentMatch.board, currentMatch.packedState, fromSquare, toSquare, demoPromotion);
      const humanSymbol = humanIsWhite ? 'White' : 'Black';
      const nextHistory = [
        ...moveHistory,
        {
          player: humanIsWhite ? '♔' : '♚',
          move: `${indexToChessNotation(fromSquare)}→${indexToChessNotation(toSquare)}`,
          from: fromSquare,
          to: toSquare,
          promotion: demoPromotion,
          address: DEMO_HUMAN_ADDRESS,
          label: `You (${humanSymbol})`,
          isDemo: true,
        },
      ];
      const pendingComputerMatch = {
        ...currentMatch,
        board: moveResult.board,
        packedBoard: moveResult.packedBoard,
        packedState: moveResult.packedState,
        currentTurn: DEMO_COMPUTER_ADDRESS,
        isYourTurn: false,
        lastMoveTime: Math.floor(Date.now() / 1000),
        whiteInCheck: moveResult.whiteInCheck,
        blackInCheck: moveResult.blackInCheck,
        lastMove: { from: fromSquare, to: toSquare, isMyMove: true },
        movesString: nextHistory.map(move => `${String.fromCharCode(move.from)}${String.fromCharCode(move.to)}`).join(''),
      };

      if (resolveDemoMatch(pendingComputerMatch, nextHistory, !humanIsWhite)) return;

      setCurrentMatch(pendingComputerMatch);
      previousBoardRef.current = JSON.stringify(pendingComputerMatch.board);
      setMoveHistory(nextHistory);

      demoComputerMoveTimeoutRef.current = window.setTimeout(() => {
        makeDemoComputerMove(pendingComputerMatch, nextHistory);
        demoComputerMoveTimeoutRef.current = null;
      }, 550);

      return;
    }

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
      const writableInstance = await withInstanceSigner(activeInstanceContractRef.current);
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
      const writableInstance = await withInstanceSigner(activeInstanceContractRef.current);
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
      const writableInstance = await withInstanceSigner(activeInstanceContractRef.current);
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
      const writableInstance = await withInstanceSigner(activeInstanceContractRef.current);
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
    if (demoComputerMoveTimeoutRef.current) {
      window.clearTimeout(demoComputerMoveTimeoutRef.current);
      demoComputerMoveTimeoutRef.current = null;
    }
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
      navigate(routeBase, { replace: true, state: null });
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }
    pendingScrollAddressRef.current = address;
    skipNavEffectRef.current = true;
    navigate(routeBase, {
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
    const viewerIsSpectator = ![
      match.player1.toLowerCase(),
      match.player2.toLowerCase(),
    ].includes(account.toLowerCase());
    const opponentAddress = match.player1.toLowerCase() === account.toLowerCase() ? match.player2 : match.player1;
    const handleOpponentMove = (_matchId, _player, from, to) => {
      setGhostMove({ from: Number(from), to: Number(to) });
      skipNextPollRef.current = true;
      doMatchSyncRef.current?.().then(() => setGhostMove(null)).catch(() => setGhostMove(null));
    };
    try {
      const filter = viewerIsSpectator
        ? activeInstanceContract.filters.MoveMade(matchId, null)
        : activeInstanceContract.filters.MoveMade(matchId, opponentAddress);
      activeInstanceContract.on(filter, handleOpponentMove);
      return () => activeInstanceContract.off(filter, handleOpponentMove);
    } catch {}
  }, [currentMatch?.roundNumber, currentMatch?.matchNumber, activeInstanceContract, account, isSpectator]);

  useEffect(() => { if (!currentMatch) return; const id = setInterval(() => setSyncDots(prev => prev >= 3 ? 3 : prev + 1), 1000); return () => clearInterval(id); }, [currentMatch]);
  useEffect(() => { if (!viewingTournament) return; const id = setInterval(() => setBracketSyncDots(prev => prev >= 3 ? 3 : prev + 1), 1000); return () => clearInterval(id); }, [viewingTournament]);

  useEffect(() => {
    const handleNav = async () => {
      if (skipNavEffectRef.current) { skipNavEffectRef.current = false; return; }
      if (isInitialNavRef.current) { isInitialNavRef.current = false; navigate(routeBase, { replace: true, state: null }); return; }
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

  useEffect(() => {
    document.title = 'ETour — Chess Arena';
  }, []);

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

    // Return just the badge without wrapper - will be placed inline with result pill
    return (
      <div className={`${badgeClasses} inline-flex items-center justify-center rounded-full px-2.5 py-0.5 md:rounded-lg md:px-2 md:py-2 border font-bold tracking-wide`}>
        <span className="text-[10px] leading-none md:text-xs">{badgeText}</span>
      </div>
    );
  }, [currentMatch, replayMoveIndex, effectiveReplayMoveIndex, moveHistory.length, replayCheckStatus]);

  return (
    <div
      className="t2-page arena-game-page arena-game-page--chess"
      data-t2-view={currentMatch ? 'match' : viewingTournament ? 'bracket' : 'lobby'}
      data-t2-effects={arenaEffectsEnabled ? 'on' : 'off'}
      style={{ minHeight: '100vh', background: activeTheme.gradient, color: '#fff', position: 'relative', overflow: 'clip', transition: 'background 0.8s ease-in-out' }}
    >
      {arenaEffectsEnabled ? (
        <ParticleBackground colors={activeTheme.particleColors} symbols={CHESS_PIECES} fontSize="40px" />
      ) : null}
      <CenteredErrorFlash
        message={actionState.type === 'error' ? actionState.message : ''}
        onDismiss={dismissActionError}
      />
      {showPrompt && <WalletBrowserPrompt onWalletChoice={handleWalletChoice} onContinueChoice={handleContinueChoice} />}
      {matchEndResult && <MatchEndModal result={matchEndResult.result} completionReason={matchEndResult.completionReason} winnerLabel={matchEndWinnerLabel} winnerAddress={matchEndWinner} loserAddress={matchEndLoser} currentAccount={currentMatch?.isDemo ? DEMO_HUMAN_ADDRESS : account} hasNextMatch={currentMatch?.isDemo ? false : !!nextActiveMatch} onClose={handleMatchEndModalClose} onEnterNextMatch={currentMatch?.isDemo ? null : handleEnterNextMatch} onReturnToBracket={handleReturnToBracket} gameType="chess" roundNumber={currentMatch?.roundNumber} totalRounds={viewingTournament?.totalRounds} prizePool={viewingTournament?.prizePoolWei} reasonLabelMode="v2" />}
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

      <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto t2-dashboard-dock">
        <MobileBottomNavDrawer
          enabled={Boolean(currentMatch)}
          expanded={isMobileBottomNavExpanded}
          onToggle={() => setIsMobileBottomNavExpanded(prev => !prev)}
        >
          <GamesCard currentGame="chess" onHeightChange={setGamesCardHeight} isExpanded={expandedPanel === 'games'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')} />
          <PlayerActivity activity={playerActivity.data} loading={playerActivity.loading} syncing={playerActivity.syncing} contract={activeInstanceContract} account={account} onEnterMatch={handlePlayMatch} onEnterTournament={handleEnterTournamentFromActivity} onRefresh={playerActivity.refetch} onDismissMatch={playerActivity.dismissMatch} gameName="chess" gameEmoji="♟️" connectCtaClassName={currentTheme.connectCtaClassName} gamesCardHeight={gamesCardHeight} onHeightChange={setPlayerActivityHeight} onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }} isExpanded={expandedPanel === 'playerActivity'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'playerActivity'} onShowTooltip={() => setActiveTooltip('playerActivity')} onHideTooltip={() => setActiveTooltip(null)} reasonLabelMode="v2" refreshOnExpand={false} />
          <RecentMatchesCard contract={null} account={account} gameName="chess" gameEmoji="♟️" gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} onHeightChange={setRecentMatchesCardHeight} isExpanded={expandedPanel === 'recentMatches'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'recentMatches'} onShowTooltip={() => setActiveTooltip('recentMatches')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} onNavigateToTournament={() => {}} leaderboard={leaderboard} playerProfile={playerProfile} onRefresh={refreshHistoryPanel} showTournamentRaffles={false} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} v2Matches={v2MatchHistory.matches} v2MatchesLoading={v2MatchHistory.loading} reasonLabelMode="v2" panelVariant="stats" />
          <ActiveLobbiesCard lobbies={activeLobbies.lobbies} resolvedLobbies={activeLobbies.resolvedLobbies} loading={activeLobbies.loading} resolvedLoading={activeLobbies.resolvedLoading} syncing={activeLobbies.syncing} resolvedSyncing={activeLobbies.resolvedSyncing} error={activeLobbies.error} resolvedError={activeLobbies.resolvedError} resolvedLoaded={activeLobbies.resolvedLoaded} resolvedPage={activeLobbies.resolvedPage} resolvedTotalCount={activeLobbies.resolvedTotalCount} resolvedPageSize={activeLobbies.resolvedPageSize} gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} recentMatchesCardHeight={recentMatchesCardHeight} onRefresh={activeLobbies.refetch} onRefreshResolved={activeLobbies.refetchResolved} onResolvedPageChange={activeLobbies.goToResolvedPage} onLoadResolved={activeLobbies.refetchResolved} isExpanded={expandedPanel === 'activeLobbies'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'activeLobbies' ? null : 'activeLobbies')} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} disabled={!account} showTooltip={activeTooltip === 'activeLobbies'} onShowTooltip={() => setActiveTooltip('activeLobbies')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} />
        </MobileBottomNavDrawer>
        <div className="hidden md:block">
          <GamesCard currentGame="chess" onHeightChange={setGamesCardHeight} isExpanded={expandedPanel === 'games'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')} />
          <PlayerActivity activity={playerActivity.data} loading={playerActivity.loading} syncing={playerActivity.syncing} contract={activeInstanceContract} account={account} onEnterMatch={handlePlayMatch} onEnterTournament={handleEnterTournamentFromActivity} onRefresh={playerActivity.refetch} onDismissMatch={playerActivity.dismissMatch} gameName="chess" gameEmoji="♟️" connectCtaClassName={currentTheme.connectCtaClassName} gamesCardHeight={gamesCardHeight} onHeightChange={setPlayerActivityHeight} onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }} isExpanded={expandedPanel === 'playerActivity'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'playerActivity'} onShowTooltip={() => setActiveTooltip('playerActivity')} onHideTooltip={() => setActiveTooltip(null)} reasonLabelMode="v2" refreshOnExpand={false} />
          <RecentMatchesCard contract={null} account={account} gameName="chess" gameEmoji="♟️" gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} onHeightChange={setRecentMatchesCardHeight} isExpanded={expandedPanel === 'recentMatches'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')} tierConfig={{}} disabled={!account} showTooltip={activeTooltip === 'recentMatches'} onShowTooltip={() => setActiveTooltip('recentMatches')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} onNavigateToTournament={() => {}} leaderboard={leaderboard} playerProfile={playerProfile} onRefresh={refreshHistoryPanel} showTournamentRaffles={false} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} v2Matches={v2MatchHistory.matches} v2MatchesLoading={v2MatchHistory.loading} reasonLabelMode="v2" panelVariant="stats" />
          <ActiveLobbiesCard lobbies={activeLobbies.lobbies} resolvedLobbies={activeLobbies.resolvedLobbies} loading={activeLobbies.loading} resolvedLoading={activeLobbies.resolvedLoading} syncing={activeLobbies.syncing} resolvedSyncing={activeLobbies.resolvedSyncing} error={activeLobbies.error} resolvedError={activeLobbies.resolvedError} resolvedLoaded={activeLobbies.resolvedLoaded} resolvedPage={activeLobbies.resolvedPage} resolvedTotalCount={activeLobbies.resolvedTotalCount} resolvedPageSize={activeLobbies.resolvedPageSize} gamesCardHeight={gamesCardHeight} playerActivityHeight={playerActivityHeight} recentMatchesCardHeight={recentMatchesCardHeight} onRefresh={activeLobbies.refetch} onRefreshResolved={activeLobbies.refetchResolved} onResolvedPageChange={activeLobbies.goToResolvedPage} onLoadResolved={activeLobbies.refetchResolved} isExpanded={expandedPanel === 'activeLobbies'} onToggleExpand={() => setExpandedPanel(expandedPanel === 'activeLobbies' ? null : 'activeLobbies')} onViewTournament={enterInstanceBracket} getTournamentTypeLabel={getTournamentTypeLabel} disabled={!account} showTooltip={activeTooltip === 'activeLobbies'} onShowTooltip={() => setActiveTooltip('activeLobbies')} onHideTooltip={() => setActiveTooltip(null)} connectCtaClassName={currentTheme.connectCtaClassName} />
        </div>
      </div>

      <div className="t2-trust-rail" style={{ borderBottom: `1px solid ${activeTheme.border}`, backdropFilter: 'blur(10px)', position: 'relative', zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="relative flex flex-col items-center gap-3 md:min-h-6 md:justify-center text-xs md:text-sm">
            <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-6">
              <div className="flex items-center gap-2"><Shield className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">100% On-Chain</span></div>
              <div className="flex items-center gap-2"><Link2 className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Immutable Rules</span></div>
              <div className="flex items-center gap-2"><Lock className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Every Move Verifiable</span></div>
              <div className="flex items-center gap-2"><CheckCircle className="text-blue-400" size={16} /><span className="text-blue-100 font-medium">Zero Cookies</span></div>
            </div>
            {explorerUrl ? <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-blue-300 transition-colors hover:text-blue-200 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2"><Code size={16} /><span className="font-mono text-xs">{shortenAddress(factoryAddress)}</span><ExternalLink size={14} /></a> : null}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12 t2-shell" style={{ position: 'relative', zIndex: 10 }}>
        <ArenaGameHero
          game="chess"
          compact={Boolean(currentMatch || viewingTournament)}
          effectsEnabled={arenaEffectsEnabled}
          onToggleEffects={toggleArenaEffects}
          onOpenWhatIsThis={handleWhatIsThisLinkClick}
          onOpenQuickGuide={handleQuickGuideLinkClick}
          onOpenManual={handleUserManualLinkClick}
        />

        {dashboardError ? (
          <div className="mb-8">
            <ActionMessage type="error" message={dashboardError} />
          </div>
        ) : null}

        <V2GameLobbyIntro
          account={account}
          isConnecting={isConnecting}
          onConnectWallet={connectWallet}
          connectCtaClassName={activeTheme.connectCtaClassName}
          wideArbitrumCta
          unauthenticatedActions={!account ? (
            <button
              type="button"
              onClick={() => setIsDemoLevelOpen(true)}
              className="inline-flex min-w-[240px] items-center justify-center gap-3 rounded-xl border-2 border-cyan-300/50 bg-cyan-400/15 px-6 py-3 text-base font-bold text-cyan-50 shadow-xl shadow-cyan-950/30 transition-all hover:scale-105 hover:border-cyan-200 hover:bg-cyan-400/25 md:text-lg"
            >
              <Gamepad2 size={20} />
              Play Demo
            </button>
          ) : null}
        />

        {currentMatch && (
          <div ref={matchViewRef} className="arena-match-view t2-match-view">
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
              onClaimTimeoutWin={currentMatch.isDemo || isSpectator ? null : handleClaimTimeoutWin}
              onForceEliminate={currentMatch.isDemo || isSpectator ? null : handleForceEliminateStalledMatch}
              onClaimReplacement={currentMatch.isDemo || isSpectator ? null : handleClaimMatchSlotByReplacement}
              onEnterNextMatch={currentMatch.isDemo ? null : handleEnterNextMatch}
              onReturnToBracket={handleReturnToBracket}
              onPlayerAddressClick={setSelectedProfileAddress}
              boardScrollRef={boardViewRef}
              hasNextActiveMatch={currentMatch.isDemo ? false : !!nextActiveMatch}
              playerCount={viewingTournament?.playerCount || null}
              playerConfig={(() => {
                const { player1IsWhite, player1Icon, player2Icon } = getChessPlayerSideIcons(
                  currentMatch.firstPlayer,
                  currentMatch.player1,
                );
                if (currentMatch.isDemo) {
                  return {
                    player1: { icon: player1Icon, label: currentMatch.player1DisplayLabel || 'You' },
                    player2: { icon: player2Icon, label: currentMatch.player2DisplayLabel || 'Computer' },
                  };
                }
                return {
                  player1: { icon: player1Icon, label: player1IsWhite ? 'White' : 'Black' },
                  player2: { icon: player2Icon, label: player1IsWhite ? 'Black' : 'White' },
                };
              })()}
              layout="players-board-history"
              isSpectator={isSpectator}
              demoInfo={currentMatch.isDemo ? {
                title: 'Demo Match',
                subtitle: `You vs Computer (${currentMatch.demoElo || DEFAULT_DEMO_CHESS_ELO} ELO)`,
                notice: 'Demo match against the computer with no ETH prize pool and no data preserved.',
              } : undefined}
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
              <ChessBoard board={displayedBoard} packedBoard={currentMatch.packedBoard} packedState={currentMatch.packedState} onMove={isSpectator || currentMatch.matchStatus === 2 ? null : handleMakeMove} currentTurn={currentMatch.currentTurn} account={isSpectator ? null : (currentMatch.isDemo ? DEMO_HUMAN_ADDRESS : account)} player1={currentMatch.player1} player2={currentMatch.player2} firstPlayer={currentMatch.firstPlayer} matchStatus={currentMatch.matchStatus} loading={matchLoading} whiteInCheck={currentMatch.matchStatus === 2 ? replayCheckStatus.whiteInCheck : currentMatch.whiteInCheck} blackInCheck={currentMatch.matchStatus === 2 ? replayCheckStatus.blackInCheck : currentMatch.blackInCheck} lastMoveTime={currentMatch.lastMoveTime} startTime={currentMatch.startTime} lastMove={displayedLastMove} secondLastMove={displayedSecondLastMove} maxSize={820} ghostMove={currentMatch.matchStatus === 2 ? null : ghostMove} arenaStyle effectsEnabled={arenaEffectsEnabled} onToggleEffects={toggleArenaEffects} />
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
              <div ref={tournamentBracketRef} className="t2-bracket-view">
                <TournamentBracket tournamentData={viewingTournament} onBack={handleBackToTournaments} onEnterMatch={handlePlayMatch} onSpectateMatch={handlePlayMatch} onForceEliminate={handleForceEliminateStalledMatch} onClaimReplacement={handleClaimMatchSlotByReplacement} onManualStart={handleManualStart} onClaimAbandonedPool={handleClaimAbandonedPool} onResetEnrollmentWindow={handleResetEnrollmentWindow} onCancelTournament={handleCancelTournament} onEnroll={handleEnroll} onConnectWallet={connectWallet} account={account} loading={tournamentsLoading} connectLoading={isConnecting} syncDots={bracketSyncDots} isEnrolled={viewingTournament?.players?.some(addr => addr.toLowerCase() === account?.toLowerCase())} entryFee={viewingTournament?.entryFeeEth ?? '0'} isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount} instanceContract={activeInstanceContract} onPlayerAddressClick={setSelectedProfileAddress} arenaStyle routeBase={routeBase} />
              </div>
            ) : (
              <div className="space-y-8 md:space-y-10 t2-lobby-view">
                <div id="live-instances">
                  <form onSubmit={createInstance}>
                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-4 md:p-5 t2-create-panel">
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
      <div id="user-manual" className="max-w-7xl mx-auto px-2 pt-8 pb-12 md:px-6 md:pt-10 t2-manual" style={{ position: 'relative', zIndex: 10 }}>
        <UserManualV2 />
      </div>

      <EtourFooter scope="chess" />

      <QuickGuideModal
        isOpen={isQuickGuideOpen}
        onClose={() => setIsQuickGuideOpen(false)}
      />
      <WhatIsThisModal
        isOpen={isWhatIsThisOpen}
        onClose={() => setIsWhatIsThisOpen(false)}
        onOpenQuickGuide={() => setIsQuickGuideOpen(true)}
        gameTitle="Chess"
      />
      <DemoLevelModal
        isOpen={isDemoLevelOpen}
        level={demoElo}
        minLevel={DEMO_CHESS_MIN_ELO}
        maxLevel={DEMO_CHESS_MAX_ELO}
        step={25}
        onChange={level => setDemoElo(clampDemoChessElo(level))}
        onClose={() => setIsDemoLevelOpen(false)}
        onStart={() => {
          setIsDemoLevelOpen(false);
          handleStartDemoMatch(demoElo);
        }}
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
