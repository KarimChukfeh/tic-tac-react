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
} from 'lucide-react';
import { ethers } from 'ethers';
import { CURRENT_NETWORK, TARGET_CHAIN_ID_HEX, getAddressUrl, getWalletAddChainParams } from '../../config/networks';
import { shortenAddress } from '../../utils/formatters';
import { generateV2TournamentUrl, parseV2ContractParam } from '../../utils/urlHelpers';
import { shouldResetOnInitialDocumentLoad } from '../../utils/navigation';
import { isDraw } from '../../utils/completionReasons';
import MatchCard from '../../components/shared/MatchCard';
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
import V2GameLobbyIntro from '../../components/shared/V2GameLobbyIntro';
import V2ContractsTable from '../../components/shared/V2ContractsTable';
import WalletBrowserPrompt from '../../components/WalletBrowserPrompt';
import EntryFeeSlider, { DEFAULT_SELECTED_ENTRY_FEE } from '../components/EntryFeeSlider';
import TimeoutSettingSlider, { clampCreateTimeoutValue, isCreateTimeoutField, normalizeCreateTimeouts } from '../components/TimeoutSettingSlider';
import { useInitialDocumentScrollTop } from '../../hooks/useInitialDocumentScrollTop';
import { useWalletBrowserPrompt } from '../../hooks/useWalletBrowserPrompt';
import { isMobileDevice, isWalletBrowser } from '../../utils/mobileDetection';
import { didMatchStateAdvance, waitForTxOrStateSync } from '../../utils/txSync';
import { multicallContracts } from '../../utils/multicall';
import { useCheckersV2PlayerActivity } from '../hooks/useCheckersV2PlayerActivity';
import { useCheckersPlayerProfile } from '../hooks/useCheckersPlayerProfile';
import { useCheckersV2MatchHistory } from '../hooks/useCheckersV2MatchHistory';
import { useActiveLobbies } from '../hooks/useActiveLobbies';
import {
  CHECKERS_V2_FACTORY_ADDRESS,
  CHECKERS_V2_FACTORY_ADDRESS_CANDIDATES,
  CHECKERS_V2_IMPLEMENTATION_ADDRESS,
  formatEth,
  getDefaultTimeouts,
  getFactoryContract,
  getReadableError,
  getInstanceContract,
  getRoundLabel,
  getTournamentTypeLabel,
  decodeCheckersMoves,
  normalizeInstanceSnapshot,
  normalizeMatch,
  resolveCreatedInstanceAddress,
} from '../lib/checkers';
import { normalizePrizeDistribution } from '../lib/prizeDistribution';
import { resolveFlatBoard } from '../lib/matchBoardState';

const CHECKERS_PLAYER_COUNT_OPTIONS = [2, 4];
const VIRTUAL_TIER_ID = 0;
const VIRTUAL_INSTANCE_ID = 0;
const DEFAULT_MATCH_LOADING_MESSAGE = 'Loading match...';

const DEFAULT_CREATE_FORM = {
  playerCount: 2,
  entryFee: DEFAULT_SELECTED_ENTRY_FEE,
  ...getDefaultTimeouts(2),
};

const currentTheme = {
  primary: 'rgba(251, 191, 36, 0.5)',
  secondary: 'rgba(245, 158, 11, 0.5)',
  gradient: 'linear-gradient(135deg, #1a0f00 0%, #2d1a00 50%, #1f1200 100%)',
  border: 'rgba(212, 160, 18, 0.3)',
  glow: 'rgba(251, 191, 36, 0.4)',
  heroGlow: 'from-[#fbbf24] via-[#f59e0b] to-[#d4a012]',
  heroIcon: 'text-[#fbbf24]',
  heroTitle: 'from-[#fff8e7] via-[#fbbf24] to-[#f59e0b]',
  heroText: 'text-[#f5e6c8]',
  heroSubtext: 'text-[#d4b866]',
  buttonGradient: 'from-[#fbbf24] to-[#f59e0b]',
  buttonHover: 'hover:from-[#f59e0b] hover:to-[#d4a012]',
  connectButtonGradient: 'from-[#fbbf24] to-[#f59e0b]',
  connectButtonHover: 'hover:from-[#f59e0b] hover:to-[#d4a012]',
  connectCtaClassName: 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#1a1200] rounded-xl shadow-2xl border-2 border-[#d4a012]/70 hover:scale-105 hover:from-[#f59e0b] hover:to-[#d4a012] font-semibold',
};

function isWalletAvailable() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

function buildV2MatchKey(roundNumber, matchNumber) {
  return ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));
}

function hydrateBracketMatchData(userAccount, matchInfo, {
  matchData,
  fullMatch,
  boardRaw,
  pendingCapture = null,
  tierConfig,
  timeoutData = null,
  escL2Available = false,
  escL3Available = false,
  isUserAdvancedForRound = false,
}) {
  const tierMatchTime = Number(tierConfig?.timeouts?.matchTimePerPlayer ?? tierConfig?.matchTimePerPlayer ?? 300);
  const player1 = matchData.player1 || matchInfo.player1;
  const player2 = matchData.player2 || matchInfo.player2;
  const matchStatus = Number(matchData.status);
  const lastMoveTime = Number(matchData.lastMoveTime);
  const startTime = Number(matchData.startTime);
  const winner = matchData.matchWinner || matchData.winner;
  const zeroAddress = ethers.ZeroAddress;

  let loser = zeroAddress;
  if (matchStatus === 2 && winner && winner.toLowerCase() !== zeroAddress.toLowerCase()) {
    loser = winner.toLowerCase() === player1.toLowerCase() ? player2 : player1;
  }

  const completionReason = Number(matchData.completionReason ?? 0);
  const currentTurn = fullMatch?.currentTurn;
  const firstPlayer = fullMatch?.firstPlayer || player1;
  const p1TimeRaw = fullMatch?.player1TimeRemaining !== undefined ? Number(fullMatch.player1TimeRemaining) : tierMatchTime;
  const p2TimeRaw = fullMatch?.player2TimeRemaining !== undefined ? Number(fullMatch.player2TimeRemaining) : tierMatchTime;
  const board = resolveFlatBoard(boardRaw, matchInfo.board, 32);

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
      const matchLevel2Delay = Number(tierConfig?.timeouts?.matchLevel2Delay ?? tierConfig?.matchLevel2Delay ?? 120);
      const matchLevel3Delay = Number(tierConfig?.timeouts?.matchLevel3Delay ?? tierConfig?.matchLevel3Delay ?? 240);
      timeoutState = {
        escalation1Start: timeoutOccurredAt + matchLevel2Delay,
        escalation2Start: timeoutOccurredAt + matchLevel3Delay,
        activeEscalation: timeoutState?.activeEscalation ?? 0,
        timeoutActive: true,
        forfeitAmount: timeoutState?.forfeitAmount ?? 0,
      };
    }
  }

  const moves = matchData.moves || matchInfo.moves || '';
  const decodedMoves = decodeCheckersMoves(moves);

  return {
    ...matchInfo,
    player1,
    player2,
    firstPlayer,
    currentTurn,
    winner,
    loser,
    board,
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
    pendingCaptureSource: pendingCapture?.active ? Number(pendingCapture.source) : null,
    lastMove: decodedMoves.length > 0 ? decodedMoves[decodedMoves.length - 1] : null,
  };
}

const CHECKERS_PIECES = {
  EMPTY: 0,
  PLAYER1_MAN: 1,
  PLAYER1_KING: 2,
  PLAYER2_MAN: 3,
  PLAYER2_KING: 4,
};

function createInitialCheckersBoard() {
  const board = Array(32).fill(CHECKERS_PIECES.EMPTY);
  for (let i = 0; i < 12; i++) board[i] = CHECKERS_PIECES.PLAYER2_MAN;
  for (let i = 20; i < 32; i++) board[i] = CHECKERS_PIECES.PLAYER1_MAN;
  return board;
}

function checkersIndexToCoords(index) {
  const row = Math.floor(index / 4);
  const col = ((index % 4) * 2) + ((row + 1) % 2);
  return { row, col };
}

function checkersCoordsToIndex(row, col) {
  return (row * 4) + Math.floor(col / 2);
}

function isValidCheckersCoord(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isPlayer1Piece(piece) {
  return piece === CHECKERS_PIECES.PLAYER1_MAN || piece === CHECKERS_PIECES.PLAYER1_KING;
}

function isPlayer2Piece(piece) {
  return piece === CHECKERS_PIECES.PLAYER2_MAN || piece === CHECKERS_PIECES.PLAYER2_KING;
}

function isKingPiece(piece) {
  return piece === CHECKERS_PIECES.PLAYER1_KING || piece === CHECKERS_PIECES.PLAYER2_KING;
}

function isOwnCheckersPiece(piece, isPlayer1Turn) {
  return isPlayer1Turn ? isPlayer1Piece(piece) : isPlayer2Piece(piece);
}

function isOpponentCheckersPiece(piece, isPlayer1Turn) {
  return piece !== CHECKERS_PIECES.EMPTY && !isOwnCheckersPiece(piece, isPlayer1Turn);
}

function getCheckersMoveDirections(piece, isPlayer1Turn) {
  if (isKingPiece(piece)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return isPlayer1Turn ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

function pieceHasCapture(board, from, piece, isPlayer1Turn) {
  const { row, col } = checkersIndexToCoords(from);
  return getCheckersMoveDirections(piece, isPlayer1Turn).some(([rowStep, colStep]) => {
    const middleRow = row + rowStep;
    const middleCol = col + colStep;
    const landingRow = row + (rowStep * 2);
    const landingCol = col + (colStep * 2);
    if (!isValidCheckersCoord(middleRow, middleCol) || !isValidCheckersCoord(landingRow, landingCol)) {
      return false;
    }
    const middleIndex = checkersCoordsToIndex(middleRow, middleCol);
    const landingIndex = checkersCoordsToIndex(landingRow, landingCol);
    return isOpponentCheckersPiece(board[middleIndex], isPlayer1Turn) && board[landingIndex] === CHECKERS_PIECES.EMPTY;
  });
}

function playerHasAnyCapture(board, isPlayer1Turn) {
  return board.some((piece, index) => isOwnCheckersPiece(piece, isPlayer1Turn) && pieceHasCapture(board, index, piece, isPlayer1Turn));
}

function getCheckersLegalMoves(board, from, isPlayer1Turn, pendingCaptureSource = null) {
  if (!Array.isArray(board) || from == null || from < 0 || from >= 32) return [];
  if (pendingCaptureSource != null && from !== pendingCaptureSource) return [];

  const piece = Number(board[from] || 0);
  if (!isOwnCheckersPiece(piece, isPlayer1Turn)) return [];

  const forceCapture = pendingCaptureSource != null || playerHasAnyCapture(board, isPlayer1Turn);
  const { row, col } = checkersIndexToCoords(from);
  const moves = [];

  for (const [rowStep, colStep] of getCheckersMoveDirections(piece, isPlayer1Turn)) {
    const nextRow = row + rowStep;
    const nextCol = col + colStep;
    if (!isValidCheckersCoord(nextRow, nextCol)) continue;
    const nextIndex = checkersCoordsToIndex(nextRow, nextCol);

    if (!forceCapture && board[nextIndex] === CHECKERS_PIECES.EMPTY) {
      moves.push({ to: nextIndex, isCapture: false, captureIndex: null });
      continue;
    }

    const landingRow = row + (rowStep * 2);
    const landingCol = col + (colStep * 2);
    if (!isValidCheckersCoord(landingRow, landingCol)) continue;
    const landingIndex = checkersCoordsToIndex(landingRow, landingCol);
    if (isOpponentCheckersPiece(board[nextIndex], isPlayer1Turn) && board[landingIndex] === CHECKERS_PIECES.EMPTY) {
      moves.push({ to: landingIndex, isCapture: true, captureIndex: nextIndex });
    }
  }

  return moves;
}

function applyCheckersMove(board, move, isPlayer1Turn) {
  const nextBoard = [...board];
  const piece = Number(nextBoard[move.from] || 0);
  nextBoard[move.from] = CHECKERS_PIECES.EMPTY;
  if (move.captureIndex != null) nextBoard[move.captureIndex] = CHECKERS_PIECES.EMPTY;

  let movedPiece = piece;
  const { row: toRow } = checkersIndexToCoords(move.to);
  const crowned = !isKingPiece(piece) && ((isPlayer1Turn && toRow === 0) || (!isPlayer1Turn && toRow === 7));
  if (crowned) {
    movedPiece = isPlayer1Turn ? CHECKERS_PIECES.PLAYER1_KING : CHECKERS_PIECES.PLAYER2_KING;
  }

  nextBoard[move.to] = movedPiece;
  return { board: nextBoard, movedPiece, crowned };
}

function expandCheckersBoard(board) {
  const expanded = Array(64).fill(null);
  for (let index = 0; index < 32; index++) {
    const { row, col } = checkersIndexToCoords(index);
    expanded[(row * 8) + col] = Number(board[index] || 0);
  }
  return expanded;
}

function buildCheckersMoveHistoryFromString(movesString, firstPlayer, player1, player2) {
  if (!movesString) return [];

  const decodedMoves = decodeCheckersMoves(movesString);
  const history = [];
  let board = createInitialCheckersBoard();
  let currentPlayer = firstPlayer || player1;
  let pendingCaptureSource = null;

  for (const decodedMove of decodedMoves) {
    const isPlayer1Turn = currentPlayer?.toLowerCase() === player1?.toLowerCase();
    const legalMoves = getCheckersLegalMoves(board, decodedMove.from, isPlayer1Turn, pendingCaptureSource);
    const matchedMove = legalMoves.find((candidate) => candidate.to === decodedMove.to)
      || { ...decodedMove, captureIndex: null };

    const applied = applyCheckersMove(board, { ...matchedMove, from: decodedMove.from, to: decodedMove.to }, isPlayer1Turn);
    board = applied.board;

    history.push({
      player: isPlayer1Turn ? 'Light' : 'Dark',
      move: decodedMove.notation,
      address: currentPlayer,
      from: decodedMove.from,
      to: decodedMove.to,
      isCapture: matchedMove.isCapture,
      crowned: applied.crowned,
    });

    if (matchedMove.isCapture && !applied.crowned && pieceHasCapture(board, decodedMove.to, applied.movedPiece, isPlayer1Turn)) {
      pendingCaptureSource = decodedMove.to;
    } else {
      pendingCaptureSource = null;
      currentPlayer = isPlayer1Turn ? player2 : player1;
    }
  }

  return history;
}

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

const CheckersBoard = ({
  board,
  onMove,
  currentTurn,
  account,
  player1,
  player2,
  matchStatus,
  loading,
  pendingCaptureSource,
  lastMove,
  ghostMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [boardSize, setBoardSize] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const updateSize = () => {
      const vh60 = window.innerHeight * 0.6;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      setBoardSize(Math.min(vh60, containerWidth, 560));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const isMyTurn = account && currentTurn?.toLowerCase() === account.toLowerCase();
  const isPlayer1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
  const forcedPieces = isMyTurn
    ? board.reduce((acc, piece, index) => {
      const moves = getCheckersLegalMoves(board, index, isPlayer1Turn, pendingCaptureSource ?? null);
      if (moves.length > 0) acc.add(index);
      return acc;
    }, new Set())
    : new Set();
  const selectedMoves = selectedSquare != null
    ? getCheckersLegalMoves(board, selectedSquare, isPlayer1Turn, pendingCaptureSource ?? null)
    : [];
  const selectedTargets = new Map(selectedMoves.map((move) => [move.to, move]));
  const expandedBoard = expandCheckersBoard(board);
  const cellSize = boardSize ? (boardSize / 8) : 60;

  useEffect(() => {
    if (selectedSquare == null) return;
    if (!forcedPieces.has(selectedSquare)) {
      setSelectedSquare(null);
    }
  }, [forcedPieces, selectedSquare]);

  const handleSquareClick = (compactIndex) => {
    if (!isMyTurn || matchStatus !== 1 || loading || compactIndex == null) return;

    if (selectedSquare != null) {
      const selectedMove = selectedTargets.get(compactIndex);
      if (selectedMove) {
        onMove?.(selectedSquare, compactIndex, selectedMove);
        return;
      }
    }

    if (!forcedPieces.has(compactIndex)) {
      setSelectedSquare(null);
      return;
    }

    setSelectedSquare((prev) => (prev === compactIndex ? null : compactIndex));
  };

  const renderPiece = (piece) => {
    if (!piece) return null;
    const isLightPiece = piece === CHECKERS_PIECES.PLAYER1_MAN || piece === CHECKERS_PIECES.PLAYER1_KING;
    const isKing = piece === CHECKERS_PIECES.PLAYER1_KING || piece === CHECKERS_PIECES.PLAYER2_KING;
    return (
      <div className={`flex items-center justify-center rounded-full border font-bold shadow-lg ${isLightPiece ? 'bg-stone-100 border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-700 text-stone-100'}`} style={{ width: cellSize - 10, height: cellSize - 10, fontSize: Math.max(14, cellSize * 0.24) }}>
        {isKing ? 'K' : ''}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      {pendingCaptureSource != null && isMyTurn && matchStatus === 1 && (
        <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Capture continuation required from square {pendingCaptureSource + 1}.
        </div>
      )}

      <div
        className="rounded-2xl p-3 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(120, 53, 15, 0.95) 0%, rgba(28, 25, 23, 0.98) 100%)',
          width: boardSize || 'auto',
        }}
      >
        <div className="grid grid-cols-8 gap-0 overflow-hidden rounded-xl border border-amber-400/20">
          {expandedBoard.map((piece, displayIndex) => {
            const row = Math.floor(displayIndex / 8);
            const col = displayIndex % 8;
            const isDarkSquare = (row + col) % 2 === 1;
            const compactIndex = isDarkSquare ? checkersCoordsToIndex(row, col) : null;
            const selectable = compactIndex != null && forcedPieces.has(compactIndex);
            const selected = compactIndex != null && selectedSquare === compactIndex;
            const targetMove = compactIndex != null ? selectedTargets.get(compactIndex) : null;
            const isPendingSource = compactIndex != null && pendingCaptureSource === compactIndex;
            const isLastFrom = compactIndex != null && lastMove?.from === compactIndex;
            const isLastTo = compactIndex != null && lastMove?.to === compactIndex;
            const isGhostTo = compactIndex != null && ghostMove?.to === compactIndex;

            return (
              <button
                key={displayIndex}
                type="button"
                disabled={!isDarkSquare}
                className={`relative flex items-center justify-center ${isDarkSquare ? 'cursor-pointer' : 'cursor-default'} ${selected ? 'ring-2 ring-cyan-300 ring-inset' : ''} ${targetMove ? 'ring-2 ring-emerald-400 ring-inset' : ''} ${isPendingSource ? 'ring-2 ring-amber-400 ring-inset' : ''}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: isDarkSquare ? 'rgba(120, 53, 15, 0.85)' : 'rgba(245, 158, 11, 0.16)',
                  boxShadow: isLastTo
                    ? 'inset 0 0 0 2px rgba(34, 211, 238, 0.9), 0 0 18px rgba(34, 211, 238, 0.35)'
                    : isLastFrom
                      ? 'inset 0 0 0 2px rgba(250, 204, 21, 0.9)'
                      : undefined,
                }}
                onClick={() => handleSquareClick(compactIndex)}
              >
                {isDarkSquare && targetMove && (
                  <span className={`absolute rounded-full ${targetMove.isCapture ? 'bg-red-400/80' : 'bg-emerald-300/80'}`} style={{ width: cellSize * 0.18, height: cellSize * 0.18 }} />
                )}
                {renderPiece(piece)}
                {isGhostTo && !piece && (
                  <div className="absolute animate-pulse rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/20" style={{ width: cellSize - 10, height: cellSize - 10 }} />
                )}
                {isDarkSquare && selectable && !selected && !piece && (
                  <div className="absolute inset-1 rounded-md border border-white/5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-amber-200/75">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-stone-300 bg-stone-100" /> Light</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-stone-700 bg-stone-900" /> Dark</span>
      </div>
    </div>
  );
};

const TournamentBracket = ({
  tournamentData,
  onBack,
  onEnterMatch,
  onForceEliminate,
  onClaimReplacement,
  onManualStart,
  onClaimAbandonedPool,
  onResetEnrollmentWindow,
  onCancelTournament,
  onEnroll,
  onConnectWallet,
  account,
  loading,
  connectLoading,
  syncDots,
  isEnrolled,
  entryFee,
  isFull,
  instanceContract,
}) => {
  const {
    status,
    currentRound,
    enrolledCount,
    rounds,
    playerCount,
    players,
    enrollmentTimeout,
  } = tournamentData;

  const bracketViewRef = useRef(null);
  const prevStatusRef = useRef(status);
  const totalRounds = Math.ceil(Math.log2(playerCount));
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);
  const enrollmentWindowDeadline = status === 0 && enrolledCount > 0
    ? Number(enrollmentTimeout?.escalation1Start ?? 0)
    : 0;

  useEffect(() => {
    if (prevStatusRef.current === 0 && status === 1 && isEnrolled && bracketViewRef.current) {
      const timer = setTimeout(() => {
        bracketViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }, 300);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status, isEnrolled]);

  const hasValidRounds = rounds && rounds.length > 0 && rounds.some(round =>
    round.matches && round.matches.length > 0 && round.matches.some(match =>
      match.player1 && match.player1 !== ethers.ZeroAddress
    )
  );

  const prizePool = tournamentData.prizePoolWei || 0n;

  return (
    <div className="mb-16">
      <TournamentHeader
        gameType="checkers"
        reasonLabelMode="v2"
        tierId={VIRTUAL_TIER_ID}
        instanceId={VIRTUAL_INSTANCE_ID}
        instanceAddress={tournamentData.address}
        shareUrlOverride={tournamentData.address ? generateV2TournamentUrl('checkers', tournamentData.address) : undefined}
        status={status}
        currentRound={currentRound}
        playerCount={playerCount}
        enrolledCount={enrolledCount}
        prizePool={prizePool}
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
      />

      <div ref={bracketViewRef} className="bg-gradient-to-br from-[#120b00]/80 to-[#2a1800]/60 backdrop-blur-lg rounded-2xl p-8 border border-[#d4a012]/30">
        <h3 className="text-2xl font-bold text-[#fff8e7] mb-3 flex items-center gap-2">
          <Grid size={24} />
          {tournamentTypeLabel} Bracket
        </h3>

        {hasValidRounds ? (
          <div className="space-y-8">
            {rounds.map((round, roundIdx) => (
              <div key={roundIdx}>
                <h4 className="text-xl font-bold text-[#d4b866] mb-4">
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
                        gameName="checkers"
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
            <div className="text-left py-4">
              <div className="text-[#d4b866] text-lg">
                {status === 0 ? 'Brackets will be generated once the instance starts.' : 'No bracket data available.'}
              </div>
            </div>
            {enrolledCount === 0 && <hr className="border-[#d4a012]/20" />}
            {enrolledCount === 0 && (
              <div id="last-instance">
                <RecentInstanceCard
                  tierId={VIRTUAL_TIER_ID}
                  instanceId={VIRTUAL_INSTANCE_ID}
                  contract={instanceContract}
                  tierName={tournamentTypeLabel}
                  walletAddress={account}
                  reasonLabelMode="v2"
                  theme="gold"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <BracketScrollHint
        bracketRef={bracketViewRef}
        isUserEnrolled={isEnrolled}
        isTournamentInProgress={status === 1}
      />
    </div>
  );
};

export default function CheckersV2() {
  useInitialDocumentScrollTop('/v2/checkers');

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const rpcProviderRef = useRef(null);
  const pendingScrollAddressRef = useRef(null);
  const tournamentBracketRef = useRef(null);
  const matchViewRef = useRef(null);
  const collapseActivityPanelRef = useRef(null);

  const [factoryAddress, setFactoryAddress] = useState(CHECKERS_V2_FACTORY_ADDRESS);
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
  const [implementationAddress, setImplementationAddress] = useState(CHECKERS_V2_IMPLEMENTATION_ADDRESS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolvedFactoryContract, setResolvedFactoryContract] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [actionState, setActionState] = useState({ type: 'info', message: '' });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const selectedAddress = searchParams.get('instance');
  const explorerUrl = getAddressUrl(factoryAddress);

  const [hasProcessedInviteParam, setHasProcessedInviteParam] = useState(false);
  const [allowInitialUrlHydration, setAllowInitialUrlHydration] = useState(() => !shouldResetOnInitialDocumentLoad('/v2/checkers', { allowInviteParam: true }));
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
  const [isTabActive, setIsTabActive] = useState(typeof document === 'undefined' ? true : !document.hidden);
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [alertMatch, setAlertMatch] = useState(null);
  const [gamesCardHeight, setGamesCardHeight] = useState(0);
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);
  const [recentMatchesCardHeight, setRecentMatchesCardHeight] = useState(0);

  const { showPrompt, handleWalletChoice, handleContinueChoice, triggerWalletPrompt } = useWalletBrowserPrompt();

  const v2PlayerActivity = useCheckersV2PlayerActivity(activeInstanceContract, account, resolvedFactoryContract, rpcProvider);
  const playerProfile = useCheckersPlayerProfile(resolvedFactoryContract, rpcProvider, account);
  const v2MatchHistory = useCheckersV2MatchHistory(resolvedFactoryContract, rpcProvider, account, {
    enabled: expandedPanel === 'recentMatches',
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
    for (const candidateAddress of CHECKERS_V2_FACTORY_ADDRESS_CANDIDATES) {
      const code = await runner.getCode(candidateAddress);
      if (!code || code === '0x') continue;
      const contract = getFactoryContract(runner, candidateAddress);
      setFactoryAddress(candidateAddress);
      return contract;
    }
    throw new Error(`No Checkers V2 factory found at ${CHECKERS_V2_FACTORY_ADDRESS_CANDIDATES.join(' or ')} on ${CURRENT_NETWORK.name}.`);
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      setBrowserProvider(provider);
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      setBrowserProvider(provider);
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
        setDashboardError(getReadableError(error, 'Failed to load Checkers v2.'));
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
          { contract: instance, functionName: 'getPendingCapture', params: [roundIndex, matchIndex] },
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
      const pendingCaptureResult = matchResults[matchCursor++];
      const timeoutResult = matchResults[matchCursor++];
      const escL2Result = matchResults[matchCursor++];
      const escL3Result = matchResults[matchCursor++];

      if (!matchResult?.success) continue;

      const matchData = matchResult.result;
      const board = boardResult?.success ? boardResult.result : [];
      const normalized = normalizeMatch(roundIndex, matchIndex, matchData, board);
      const hydrated = hydrateBracketMatchData(account, normalized, {
        matchData,
        fullMatch: fullMatchResult?.success ? fullMatchResult.result : null,
        boardRaw: board,
        pendingCapture: pendingCaptureResult?.success ? pendingCaptureResult.result : null,
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
    try {
      const instance = getInstanceContract(address, getReadRunner());
      return await buildBracketData(address, instance);
    } catch (error) {
      console.error('[CheckersV2] Error refreshing tournament bracket:', error);
      return null;
    }
  }, [account]);

  const connectWallet = async () => {
    if (!isWalletAvailable()) {
      if (isMobileDevice() && !isWalletBrowser()) {
        triggerWalletPrompt();
        return;
      }
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
      const [minEntryFee, feeIncrement, implementation] = await Promise.all([
        liveFactory.MIN_ENTRY_FEE(),
        liveFactory.FEE_INCREMENT(),
        liveFactory.implementation(),
      ]);
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
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(address);
      if (bracketData) {
        pendingScrollAddressRef.current = address;
        const instance = getInstanceContract(address, getReadRunner());
        setActiveInstanceContract(instance);
        activeInstanceContractRef.current = instance;
        setViewingTournament(bracketData);
        skipNavEffectRef.current = true;
        navigate('/v2/checkers', {
          replace: false,
          state: { view: 'bracket', instanceAddress: address, from: location.state?.view || 'landing' },
        });
      }
    } catch (error) {
      console.error('[CheckersV2] Error entering bracket:', error);
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
    if (!allowInitialUrlHydration) return;
    if (!selectedAddress) return;
    enterInstanceBracket(selectedAddress);
  }, [allowInitialUrlHydration, selectedAddress, enterInstanceBracket]);

  useEffect(() => {
    if (!allowInitialUrlHydration) return;
    if (hasProcessedInviteParam || !rpcReady) return;
    const contractAddress = parseV2ContractParam(searchParams);
    if (!contractAddress) {
      setHasProcessedInviteParam(true);
      return;
    }
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
    navigate('/v2/checkers', { replace: true, state: null });
  }, [allowInitialUrlHydration, navigate]);

  useEffect(() => {
    if (allowInitialUrlHydration) return;
    if (location.pathname !== '/v2/checkers' || location.search || location.state) return;
    setAllowInitialUrlHydration(true);
  }, [allowInitialUrlHydration, location.pathname, location.search, location.state]);

  const createInstance = async (event) => {
    event.preventDefault();
    if (!browserProvider || !account) {
      setActionState({ type: 'error', message: 'Connect a wallet before creating an instance.' });
      return;
    }
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
      setActionState({ type: 'info', message: 'Reading contract constraints...' });
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

      setActionState({ type: 'info', message: 'Sending createInstance transaction...' });
      const tx = await writableFactory.createInstance(
        Number(createForm.playerCount),
        entryFeeWei,
        BigInt(normalizedTimeouts.enrollmentWindow),
        BigInt(normalizedTimeouts.matchTimePerPlayer),
        BigInt(normalizedTimeouts.timeIncrementPerMove),
        { value: entryFeeWei }
      );
      setActionState({ type: 'info', message: 'Transaction submitted. Waiting for block confirmation...' });
      const receipt = await tx.wait();
      setActionState({ type: 'info', message: 'Transaction confirmed. Locating the new instance and syncing tournament data...' });
      const address = await resolveCreatedInstanceAddress({
        factory: readFactory,
        provider: getReadRunner(),
        creator,
        playerCount: Number(createForm.playerCount),
        entryFeeWei,
        countBefore,
        receipt,
      });
      if (!address) throw new Error('Transaction mined, but the frontend could not locate the created instance.');
      const createdInstance = getInstanceContract(address, getReadRunner());
      const creatorEnrolled = await createdInstance.isEnrolled(creator).catch(() => false);
      if (!creatorEnrolled) {
        throw new Error(
          `Instance created at ${address}, but creator enrollment was not confirmed. ` +
          'Your local v2 deployment is likely stale or mismatched; redeploy the v2 modules and factory together.'
        );
      }
      setActionState({ type: 'success', message: `Instance created and enrollment verified on-chain at ${address}.` });
      await refreshDashboard();
      await enterInstanceBracket(address);
    } catch (error) {
      console.error('[CheckersV2 createInstance] raw error:', error);
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
    if (!account) {
      setActionState({ type: 'error', message: 'Please connect your wallet first.' });
      return;
    }
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
      console.error('[CheckersV2] Enroll error:', error);
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
    if (!viewingTournament || !activeInstanceContract || !account) {
      alert('Please connect your wallet first.');
      return;
    }
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

      if (status !== 0) {
        alert('Tournament has already started or completed.');
        return;
      }
      if (!canStart1 && !canStart2) {
        const timeUntil = escalation1Start > 0 ? escalation1Start - now : 0;
        if (timeUntil > 0) {
          const m = Math.floor(timeUntil / 60);
          const s = timeUntil % 60;
          alert(`Tournament cannot be force-started yet. Wait ${m}m ${s}s.`);
        } else {
          alert('Tournament cannot be force-started at this time.');
        }
        return;
      }
      if (enrolledCount < 1) {
        alert('No enrolled players.');
        return;
      }
      if (enrolledCount < 2) {
        alert('Solo-enrolled tournaments can no longer be force-started. Cancel the tournament or reset the enrollment window instead.');
        return;
      }
      const isEnrolled = await activeInstanceContract.isEnrolled(account);
      if (!isEnrolled) {
        alert('You must be enrolled to force-start.');
        return;
      }
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
      console.error('[CheckersV2] Force start error:', error);
      alert(`Error force-starting: ${getReadableError(error, 'Unknown error')}`);
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

  const handleCancelTournament = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) {
      alert('Please connect your wallet first.');
      return;
    }
    try {
      setTournamentsLoading(true);
      const tournamentData = await activeInstanceContract.tournament();
      const status = Number(tournamentData.status);
      const enrolledCount = Number(tournamentData.enrolledCount);
      const isEnrolled = await activeInstanceContract.isEnrolled(account);
      if (status !== 0) {
        alert('Tournament has already started, completed, or been cancelled.');
        return;
      }
      if (!isEnrolled || enrolledCount !== 1) {
        alert('Only the sole enrolled player can cancel this tournament.');
        return;
      }
      const entryFee = tournamentData.entryFee ?? viewingTournament.entryFeeWei ?? 0n;
      if (!window.confirm(`Cancel this tournament and refund your ${ethers.formatEther(entryFee)} ETH entry fee?\n\nThis will be recorded as an EL0 cancellation.`)) {
        return;
      }
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      setActionState({ type: 'info', message: 'Confirm the tournament cancellation in MetaMask...' });
      const tx = await writableInstance.cancelTournament();
      setActionState({ type: 'info', message: 'Cancellation submitted. Waiting for block confirmation...' });
      await tx.wait();
      setActionState({ type: 'success', message: 'Tournament cancelled and refund recorded on-chain.' });
      alert('Tournament cancelled successfully!');
      setViewingTournament(null);
      setCurrentMatch(null);
      setActiveInstanceContract(null);
      activeInstanceContractRef.current = null;
      clearSelectedInstance();
    } catch (error) {
      console.error('[CheckersV2] Cancel tournament error:', error);
      alert(`Error cancelling tournament: ${getReadableError(error, 'Unknown error')}`);
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account]);

  const handleResetEnrollmentWindow = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) {
      alert('Please connect your wallet first.');
      return;
    }
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
      console.error('[CheckersV2] Reset enrollment window error:', error);
      alert(`Failed: ${getReadableError(error, 'Unknown error')}`);
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

  const handleClaimAbandonedPool = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) {
      alert('Please connect your wallet first.');
      return;
    }
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
        if (!canClaim) {
          alert('Escalation 2 has not opened yet.');
          return;
        }
        if (!window.confirm(`Claim abandoned pool? ${enrolledCount} enrolled player(s).${forfeitPool > 0n ? ` Plus ${ethers.formatEther(forfeitPool)} ETH.` : ''} The tournament will be terminated.`)) {
          return;
        }
      } else {
        if (forfeitPool <= 0n) {
          alert('No forfeited funds to claim.');
          return;
        }
        if (!window.confirm(`Claim ${ethers.formatEther(forfeitPool)} ETH from abandoned pool?`)) {
          return;
        }
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
      console.error('[CheckersV2] Claim abandoned pool error:', error);
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

  const buildMoveHistory = useCallback((movesString, firstPlayer, player1, player2) => {
    return buildCheckersMoveHistoryFromString(movesString, firstPlayer, player1, player2);
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
      const matchKey = ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));
      const [matchData, fullMatch, boardRaw, tierConfig, pendingCapture] = await Promise.all([
        instanceCont.getMatch(roundNumber, matchNumber),
        instanceCont.matches(matchKey),
        instanceCont.getBoard(roundNumber, matchNumber).catch(() => null),
        instanceCont.tierConfig(),
        instanceCont.getPendingCapture(roundNumber, matchNumber).catch(() => null),
      ]);

      const tierMatchTime = Number(tierConfig.timeouts?.matchTimePerPlayer ?? tierConfig.matchTimePerPlayer ?? 300);
      const player1 = matchData.player1 || matchInfo.player1;
      const player2 = matchData.player2 || matchInfo.player2;
      const matchStatus = Number(matchData.status);
      const lastMoveTime = Number(matchData.lastMoveTime);
      const startTime = Number(matchData.startTime);
      const winner = matchData.matchWinner || matchData.winner;
      const zeroAddress = ethers.ZeroAddress;

      let loser = zeroAddress;
      if (matchStatus === 2 && winner && winner.toLowerCase() !== zeroAddress.toLowerCase()) {
        loser = winner.toLowerCase() === player1.toLowerCase() ? player2 : player1;
      }

      const completionReason = Number(matchData.completionReason ?? 0);
      const currentTurn = fullMatch.currentTurn;
      const firstPlayer = fullMatch.firstPlayer;
      const p1TimeRaw = fullMatch.player1TimeRemaining !== undefined ? Number(fullMatch.player1TimeRemaining) : tierMatchTime;
      const p2TimeRaw = fullMatch.player2TimeRemaining !== undefined ? Number(fullMatch.player2TimeRemaining) : tierMatchTime;
      const board = resolveFlatBoard(boardRaw, matchInfo.board, 32);

      const now = Math.floor(Date.now() / 1000);
      const elapsed = lastMoveTime > 0 ? now - lastMoveTime : 0;
      let p1Time = p1TimeRaw;
      let p2Time = p2TimeRaw;
      const isP1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
      if (matchStatus === 1 && currentTurn && elapsed > 0) {
        if (isP1Turn) p1Time = Math.max(0, p1Time - elapsed);
        else p2Time = Math.max(0, p2Time - elapsed);
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
          const matchLevel2Delay = Number(tierConfig.timeouts?.matchLevel2Delay ?? tierConfig.matchLevel2Delay ?? 120);
          const matchLevel3Delay = Number(tierConfig.timeouts?.matchLevel3Delay ?? tierConfig.matchLevel3Delay ?? 240);
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

      const isPlayer1 = player1.toLowerCase() === userAccount?.toLowerCase();
      const isYourTurn = currentTurn?.toLowerCase() === userAccount?.toLowerCase();
      const isTimedOut = matchStatus === 2 && timeoutState?.timeoutActive === true;
      const moves = matchData.moves || '';
      const decodedMoves = decodeCheckersMoves(moves);
      const lastMove = decodedMoves.length > 0 ? decodedMoves[decodedMoves.length - 1] : null;

      return {
        ...matchInfo,
        player1,
        player2,
        firstPlayer,
        currentTurn,
        winner,
        loser,
        board,
        matchStatus,
        completionReason,
        startTime,
        lastMoveTime,
        isTimedOut,
        isPlayer1,
        isYourTurn,
        userSymbol: isPlayer1 ? 'Light' : 'Dark',
        player1TimeRemaining: p1Time,
        player2TimeRemaining: p2Time,
        matchTimePerPlayer: tierMatchTime,
        timeoutState,
        escL2Available,
        escL3Available,
        isUserAdvancedForRound,
        pendingCaptureSource: pendingCapture?.active ? Number(pendingCapture.source) : null,
        tierId: VIRTUAL_TIER_ID,
        instanceId: VIRTUAL_INSTANCE_ID,
        instanceAddress: matchInfo.instanceAddress || viewingTournament?.address,
        lastMove,
        movesString: moves,
      };
    } catch (error) {
      console.error('[CheckersV2] Error refreshing match data:', error);
      return null;
    }
  }, [viewingTournament?.address]);

  const handlePlayMatch = useCallback(async (_tierId, _instanceId, roundNumber, matchNumber) => {
    if (!account) {
      alert('Please connect your wallet first.');
      return;
    }
    const instanceAddress = (typeof _instanceId === 'string' && _instanceId.startsWith('0x'))
      ? _instanceId
      : (viewingTournament?.address || '');
    let instanceCont = activeInstanceContractRef.current;
    if (!instanceCont || (instanceAddress && (instanceCont.target || instanceCont.address)?.toLowerCase() !== instanceAddress.toLowerCase())) {
      if (!instanceAddress) {
        alert('Missing instance address.');
        return;
      }
      instanceCont = getInstanceContract(instanceAddress, getReadRunner());
      setActiveInstanceContract(instanceCont);
      activeInstanceContractRef.current = instanceCont;
    }
    try {
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
      setMatchLoading(true);
      const updated = await refreshMatchData(instanceCont, account, {
        tierId: VIRTUAL_TIER_ID,
        instanceId: VIRTUAL_INSTANCE_ID,
        roundNumber,
        matchNumber,
        playerCount: viewingTournament?.playerCount || 2,
        prizePool: viewingTournament?.prizePoolWei || 0n,
        instanceAddress,
      });

      if (updated) {
        setIsSpectator(!(updated.player1?.toLowerCase() === account.toLowerCase() || updated.player2?.toLowerCase() === account.toLowerCase()));
        setCurrentMatch(updated);
        previousBoardRef.current = [...updated.board];
        setMatchEndResult(null);
        setMatchEndWinner(null);
        setMatchEndLoser(null);
        setMatchEndWinnerLabel('');
        matchEndModalShownRef.current = updated.matchStatus === 2;
        const history = buildMoveHistory(updated.movesString, updated.firstPlayer, updated.player1, updated.player2);
        setMoveHistory(history);
        skipNavEffectRef.current = true;
        navigate('/v2/checkers', {
          replace: false,
          state: { view: 'match', instanceAddress, roundNumber, matchNumber, from: location.state?.view || 'bracket' },
        });
        setTimeout(() => {
          matchViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          collapseActivityPanelRef.current?.();
        }, 100);
      }
    } catch (error) {
      console.error('[CheckersV2] Error loading match:', error);
      alert(`Error loading match: ${error.message}`);
    } finally {
      setMatchLoading(false);
    }
  }, [account, viewingTournament, refreshMatchData, buildMoveHistory, navigate, location.state?.view]);

  const handleMove = async (fromIndex, toIndex, preparedMove = null) => {
    if (!currentMatch || !activeInstanceContractRef.current || !account) return;
    if (!currentMatch.isYourTurn) {
      alert("It's not your turn!");
      return;
    }
    if (currentMatch.matchStatus === 2) {
      alert('Match is already complete!');
      return;
    }
    const isPlayer1Turn = currentMatch.currentTurn?.toLowerCase() === currentMatch.player1?.toLowerCase();
    const legalMoves = getCheckersLegalMoves(currentMatch.board, fromIndex, isPlayer1Turn, currentMatch.pendingCaptureSource ?? null);
    const selectedMove = preparedMove || legalMoves.find((move) => move.to === toIndex);
    if (!selectedMove) {
      alert('Invalid move for the selected piece.');
      return;
    }
    setMoveTxTimeout(null);
    try {
      setActionState({ type: 'info', message: 'Confirm your move in MetaMask...' });
      setMatchLoadingMessage('Confirm your move in MetaMask...');
      setMatchLoading(true);
      moveTxInProgressRef.current = true;
      const { roundNumber, matchNumber } = currentMatch;
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.makeMove(roundNumber, matchNumber, fromIndex, toIndex);
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
        previousBoardRef.current = [...updated.board];
      }
      setActionState({
        type: syncResult.synced ? 'success' : 'info',
        message: syncResult.synced
          ? 'Move confirmed and reflected in the match state.'
          : 'Move confirmed on-chain. The match UI is still syncing and should update shortly.',
      });

      if (updated) {
        try {
          const history = buildMoveHistory(updated.movesString, updated.firstPlayer, updated.player1, updated.player2);
          applyMoveHistoryUpdate(history);
        } catch (historyError) {
          console.error('[CheckersV2] Error refreshing move history after move:', historyError);
        }
      }
    } catch (error) {
      const errorString = error.message || error.toString();
      if (errorString.includes('TX_TIMEOUT')) {
        setActionState({ type: 'error', message: 'Move confirmation is taking longer than expected. If it confirms, the board will update automatically.' });
        setMoveTxTimeout({ type: 'congestion', pendingFromIndex: fromIndex, pendingToIndex: toIndex });
        return;
      }
      let msg = 'Invalid Move';
      if (errorString.includes('user rejected') || errorString.includes('User denied')) msg = 'Transaction cancelled';
      else if (errorString.includes('insufficient funds')) msg = 'Insufficient funds for gas';
      else if (errorString.includes('Not your turn')) msg = 'Not your turn';
      else if (errorString.includes('Match not active')) msg = 'Match is not active';
      else if (errorString.includes('MandatoryCaptureAvailable')) msg = 'A capture is available. You must take it.';
      else if (errorString.includes('CaptureContinuationRequired')) msg = 'You must continue the capture sequence with the same piece.';
      else if (errorString.includes('NoPieceOwned')) msg = 'Select one of your pieces.';
      else if (errorString.includes('DestinationOccupied')) msg = 'That destination square is occupied.';
      else if (errorString.includes('execution reverted')) msg = 'Invalid Move - This move is not allowed';
      setActionState({ type: 'error', message: msg });
      alert(msg);
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
      console.error('[CheckersV2] Claim timeout win error:', error);
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
      console.error('[CheckersV2] Force eliminate error:', error);
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
      console.error('[CheckersV2] Claim slot by replacement error:', error);
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

  const handleMatchEndModalClose = () => {
    setMatchEndResult(null);
    setMatchEndWinnerLabel('');
  };

  const handleMatchAlertClose = () => {
    setShowMatchAlert(false);
    setAlertMatch(null);
    v2PlayerActivity.clearMatchAlert();
  };

  useEffect(() => {
    if (v2PlayerActivity.matchAlert) {
      setAlertMatch(v2PlayerActivity.matchAlert);
      setShowMatchAlert(true);
    }
  }, [v2PlayerActivity.matchAlert]);

  const checkForNextActiveMatch = useCallback(async () => {
    if (!activeInstanceContractRef.current || !account || !currentMatch) {
      setNextActiveMatch(null);
      return;
    }
    try {
      const nextRoundNumber = currentMatch.roundNumber + 1;
      const bracket = await activeInstanceContractRef.current.getBracket();
      const totalRounds = Number(bracket.totalRounds);
      if (nextRoundNumber >= totalRounds) {
        setNextActiveMatch(null);
        return;
      }
      const matchCount = Number(bracket.matchCounts[nextRoundNumber] || 0);
      for (let matchNumber = 0; matchNumber < matchCount; matchNumber++) {
        try {
          const matchData = await activeInstanceContractRef.current.getMatch(nextRoundNumber, matchNumber);
          const matchStatus = Number(matchData.status);
          const p1 = matchData.player1;
          const p2 = matchData.player2;
          if (matchStatus === 1) {
            const isInMatch = p1.toLowerCase() === account.toLowerCase() || p2.toLowerCase() === account.toLowerCase();
            if (isInMatch) {
              setNextActiveMatch({ tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID, roundNumber: nextRoundNumber, matchNumber });
              return;
            }
          }
        } catch {}
      }
      setNextActiveMatch(null);
    } catch (error) {
      console.error('[CheckersV2] Check next match error:', error);
      setNextActiveMatch(null);
    }
  }, [account, currentMatch]);

  const handleEnterNextMatch = useCallback(() => {
    if (nextActiveMatch) {
      handlePlayMatch(nextActiveMatch.tierId, nextActiveMatch.instanceId, nextActiveMatch.roundNumber, nextActiveMatch.matchNumber);
    }
  }, [nextActiveMatch, handlePlayMatch]);

  const handleReturnToBracket = useCallback(() => closeMatch(), []);

  useEffect(() => { currentMatchRef.current = currentMatch; }, [currentMatch]);
  useEffect(() => { accountRefForMatch.current = account; }, [account]);
  useEffect(() => { tournamentRef.current = viewingTournament; }, [viewingTournament]);
  useEffect(() => { activeInstanceContractRef.current = activeInstanceContract; }, [activeInstanceContract]);

  useEffect(() => {
    if (!viewingTournament || !activeInstanceContractRef.current) return;
    if (!isTabActive) return;
    if (![0, 1].includes(Number(viewingTournament.status))) return;
    const doSync = async () => {
      const tournament = tournamentRef.current;
      const instanceCont = activeInstanceContractRef.current;
      if (!tournament || !instanceCont) return;
      if (![0, 1].includes(Number(tournament.status))) return;
      const updated = await refreshTournamentBracket(tournament.address);
      if (updated) setViewingTournament(updated);
      setBracketSyncDots(1);
    };
    const pollInterval = setInterval(doSync, 5000);
    return () => clearInterval(pollInterval);
  }, [viewingTournament?.address, viewingTournament?.status, isTabActive, refreshTournamentBracket]);

  useEffect(() => {
    if (!currentMatch || !activeInstanceContractRef.current || !account) return;

    const doMatchSync = async () => {
      const match = currentMatchRef.current;
      const instanceCont = activeInstanceContractRef.current;
      const userAccount = accountRefForMatch.current;
      if (!match || !instanceCont || !userAccount) return;
      if (skipNextPollRef.current) {
        skipNextPollRef.current = false;
        return;
      }
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

          setCurrentMatch(prev => {
            if (!prev || prev.matchStatus === 2) return prev;
            return updatedMatch;
          });

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

        const boardChanged = previousBoardRef.current &&
          JSON.stringify(previousBoardRef.current) !== JSON.stringify(updatedMatch.board);

        setCurrentMatch(prev => {
          if (!prev) return updatedMatch;
          if (prev.matchStatus === 2) return prev;
          return {
            ...prev,
            board: updatedMatch.board,
            currentTurn: updatedMatch.currentTurn,
            isYourTurn: updatedMatch.isYourTurn,
            player1TimeRemaining: updatedMatch.player1TimeRemaining,
            player2TimeRemaining: updatedMatch.player2TimeRemaining,
            lastMoveTime: updatedMatch.lastMoveTime,
            lastMove: updatedMatch.lastMove,
            pendingCaptureSource: updatedMatch.pendingCaptureSource,
          };
        });

        if (boardChanged) {
          const history = buildMoveHistory(updatedMatch.movesString, updatedMatch.firstPlayer, updatedMatch.player1, updatedMatch.player2);
          applyMoveHistoryUpdate(history);
        }
        previousBoardRef.current = [...updatedMatch.board];
      } catch (error) {
        console.error('[CheckersV2 Polling] Error syncing match:', error);
      }
      setSyncDots(1);
    };

    doMatchSyncRef.current = doMatchSync;
    const interval = setInterval(doMatchSync, 1500);
    return () => clearInterval(interval);
  }, [currentMatch?.instanceAddress, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, buildMoveHistory, checkForNextActiveMatch]);

  useEffect(() => {
    if (!currentMatch || !activeInstanceContract || !account) return;
    const match = currentMatchRef.current;
    if (!match?.player1 || !match?.player2) return;

    const matchId = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [match.roundNumber, match.matchNumber]);
    const opponentAddress = match.player1.toLowerCase() === account.toLowerCase() ? match.player2 : match.player1;

    const handleOpponentMove = (_matchId, _player, from, to) => {
      setGhostMove({ from: Number(from), to: Number(to), player: _player });
      skipNextPollRef.current = true;
      doMatchSyncRef.current?.().then(() => setGhostMove(null)).catch(() => setGhostMove(null));
    };

    try {
      const filter = activeInstanceContract.filters.MoveMade(matchId, opponentAddress);
      activeInstanceContract.on(filter, handleOpponentMove);
      return () => { activeInstanceContract.off(filter, handleOpponentMove); };
    } catch {}
  }, [currentMatch?.roundNumber, currentMatch?.matchNumber, activeInstanceContract, account]);

  useEffect(() => {
    if (!currentMatch) return;
    const dotsInterval = setInterval(() => setSyncDots(prev => prev >= 3 ? 3 : prev + 1), 1000);
    return () => clearInterval(dotsInterval);
  }, [currentMatch]);

  useEffect(() => {
    if (!viewingTournament) return;
    const dotsInterval = setInterval(() => setBracketSyncDots(prev => prev >= 3 ? 3 : prev + 1), 1000);
    return () => clearInterval(dotsInterval);
  }, [viewingTournament]);

  useEffect(() => {
    const handleNav = async () => {
      if (skipNavEffectRef.current) {
        skipNavEffectRef.current = false;
        return;
      }
      if (isInitialNavRef.current) {
        isInitialNavRef.current = false;
        navigate('/v2/checkers', { replace: true, state: null });
        return;
      }

      const state = location.state;
      if (!state || !state.view) {
        if (currentMatch || viewingTournament) {
          setCurrentMatch(null);
          setViewingTournament(null);
        }
        return;
      }

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
        } else if (currentMatch) {
          setCurrentMatch(null);
        }
      } else if (state.view === 'match' && state.instanceAddress && state.roundNumber !== undefined && state.matchNumber !== undefined) {
        const needsUpdate = !currentMatch || currentMatch.roundNumber !== state.roundNumber || currentMatch.matchNumber !== state.matchNumber;
        if (needsUpdate && activeInstanceContractRef.current && account) {
          try {
            setMatchLoading(true);
            const instanceCont = activeInstanceContractRef.current;
            const updated = await refreshMatchData(instanceCont, account, {
              tierId: VIRTUAL_TIER_ID,
              instanceId: VIRTUAL_INSTANCE_ID,
              roundNumber: state.roundNumber,
              matchNumber: state.matchNumber,
              instanceAddress: state.instanceAddress,
            });
            if (updated) {
              setCurrentMatch(updated);
              setIsSpectator(!(updated.player1?.toLowerCase() === account.toLowerCase() || updated.player2?.toLowerCase() === account.toLowerCase()));
              previousBoardRef.current = [...updated.board];
              setMatchEndResult(null);
              setMatchEndWinner(null);
              setMatchEndLoser(null);
              setMatchEndWinnerLabel('');
              matchEndModalShownRef.current = updated.matchStatus === 2;
              const history = buildMoveHistory(updated.movesString, updated.firstPlayer, updated.player1, updated.player2);
              setMoveHistory(history);
            }
          } catch (error) {
            console.error('[CheckersV2] Error loading match from history:', error);
          } finally {
            setMatchLoading(false);
          }
        }
      } else if (state.view === 'landing') {
        if (currentMatch || viewingTournament) {
          setCurrentMatch(null);
          setViewingTournament(null);
        }
      }
    };
    handleNav();
  }, [location.state?.view, location.state?.instanceAddress, location.state?.roundNumber, location.state?.matchNumber]);

  useEffect(() => {
    if (!activeTooltip) return;
    const handleClickAway = () => setActiveTooltip(null);
    const timer = setTimeout(() => document.addEventListener('click', handleClickAway), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickAway);
    };
  }, [activeTooltip]);

  useEffect(() => {
    document.title = 'ETour - Checkers V2';
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: currentTheme.gradient,
        color: '#fff',
        position: 'relative',
        overflow: 'clip',
        transition: 'background 0.8s ease-in-out',
      }}
    >
      {showPrompt && (
        <WalletBrowserPrompt onWalletChoice={handleWalletChoice} onContinueChoice={handleContinueChoice} />
      )}

      {matchEndResult && (
        <MatchEndModal
          result={matchEndResult.result}
          completionReason={matchEndResult.completionReason}
          winnerLabel={matchEndWinnerLabel}
          winnerAddress={matchEndWinner}
          loserAddress={matchEndLoser}
          currentAccount={account}
          hasNextMatch={!!nextActiveMatch}
          onClose={handleMatchEndModalClose}
          onEnterNextMatch={handleEnterNextMatch}
          onReturnToBracket={handleReturnToBracket}
          gameType="checkers"
          roundNumber={currentMatch?.roundNumber}
          totalRounds={viewingTournament?.totalRounds}
          prizePool={viewingTournament?.prizePoolWei}
          reasonLabelMode="v2"
        />
      )}

      {showMatchAlert && alertMatch && !isAlertMatchAlreadyOpen && (
        <ActiveMatchAlertModal
          match={alertMatch}
          autoDismiss={isAlertMatchAlreadyOpen}
          onEnterMatch={() => {
            handleMatchAlertClose();
            handlePlayMatch(alertMatch.tierId, alertMatch.instanceId, alertMatch.roundIdx, alertMatch.matchIdx);
          }}
          onDismiss={handleMatchAlertClose}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto">
      <div className="md:hidden bg-gradient-to-b from-[#2a1800] to-[#120b00] border-t border-[#d4a012]/30 px-4 py-2.5 flex items-center justify-between">
          <GamesCard
            currentGame="checkers"
            onHeightChange={setGamesCardHeight}
            isExpanded={expandedPanel === 'games'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')}
          />
          <PlayerActivity
            activity={v2PlayerActivity.data}
            loading={v2PlayerActivity.loading}
            syncing={v2PlayerActivity.syncing}
            contract={activeInstanceContract}
            account={account}
            onEnterMatch={handlePlayMatch}
            onEnterTournament={handleEnterTournamentFromActivity}
            onRefresh={v2PlayerActivity.refetch}
            onDismissMatch={v2PlayerActivity.dismissMatch}
            gameName="checkers"
            gameEmoji="⚪"
            gamesCardHeight={gamesCardHeight}
            onHeightChange={setPlayerActivityHeight}
            onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }}
            isExpanded={expandedPanel === 'playerActivity'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            tierConfig={{}}
            isElite={true}
            disabled={!account}
            showTooltip={activeTooltip === 'playerActivity'}
            onShowTooltip={() => setActiveTooltip('playerActivity')}
            onHideTooltip={() => setActiveTooltip(null)}
            connectCtaClassName={currentTheme.connectCtaClassName}
            reasonLabelMode="v2"
          />
          <RecentMatchesCard
            contract={null}
            account={account}
            gameName="checkers"
            gameEmoji="⚪"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={setRecentMatchesCardHeight}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={{}}
            isElite={true}
            disabled={!account}
            showTooltip={activeTooltip === 'recentMatches'}
            onShowTooltip={() => setActiveTooltip('recentMatches')}
            onHideTooltip={() => setActiveTooltip(null)}
            connectCtaClassName={currentTheme.connectCtaClassName}
            onNavigateToTournament={() => {}}
            leaderboard={leaderboard}
            playerProfile={playerProfile}
            onRefresh={refreshHistoryPanel}
            showTournamentRaffles={false}
            onViewTournament={enterInstanceBracket}
            getTournamentTypeLabel={getTournamentTypeLabel}
            v2Matches={v2MatchHistory.matches}
            v2MatchesLoading={v2MatchHistory.loading}
            reasonLabelMode="v2"
          />
          <ActiveLobbiesCard
            lobbies={activeLobbies.lobbies}
            loading={activeLobbies.loading}
            syncing={activeLobbies.syncing}
            error={activeLobbies.error}
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            recentMatchesCardHeight={recentMatchesCardHeight}
            onRefresh={activeLobbies.refetch}
            isExpanded={expandedPanel === 'activeLobbies'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'activeLobbies' ? null : 'activeLobbies')}
            onViewTournament={enterInstanceBracket}
            getTournamentTypeLabel={getTournamentTypeLabel}
            disabled={!account}
            showTooltip={activeTooltip === 'activeLobbies'}
            onShowTooltip={() => setActiveTooltip('activeLobbies')}
            onHideTooltip={() => setActiveTooltip(null)}
            connectCtaClassName={currentTheme.connectCtaClassName}
          />
        </div>

        <div className="hidden md:block">
          <GamesCard
            currentGame="checkers"
            onHeightChange={setGamesCardHeight}
            isExpanded={expandedPanel === 'games'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')}
          />
          <PlayerActivity
            activity={v2PlayerActivity.data}
            loading={v2PlayerActivity.loading}
            syncing={v2PlayerActivity.syncing}
            contract={activeInstanceContract}
            account={account}
            onEnterMatch={handlePlayMatch}
            onEnterTournament={handleEnterTournamentFromActivity}
            onRefresh={v2PlayerActivity.refetch}
            onDismissMatch={v2PlayerActivity.dismissMatch}
            gameName="checkers"
            gameEmoji="🔴"
            gamesCardHeight={gamesCardHeight}
            onHeightChange={setPlayerActivityHeight}
            onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }}
            isExpanded={expandedPanel === 'playerActivity'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            tierConfig={{}}
            isElite={true}
            disabled={!account}
            showTooltip={activeTooltip === 'playerActivity'}
            onShowTooltip={() => setActiveTooltip('playerActivity')}
            onHideTooltip={() => setActiveTooltip(null)}
            connectCtaClassName={currentTheme.connectCtaClassName}
            reasonLabelMode="v2"
          />
          <RecentMatchesCard
            contract={null}
            account={account}
            gameName="checkers"
            gameEmoji="🔴"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={setRecentMatchesCardHeight}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={{}}
            isElite={true}
            disabled={!account}
            showTooltip={activeTooltip === 'recentMatches'}
            onShowTooltip={() => setActiveTooltip('recentMatches')}
            onHideTooltip={() => setActiveTooltip(null)}
            connectCtaClassName={currentTheme.connectCtaClassName}
            onNavigateToTournament={() => {}}
            leaderboard={leaderboard}
            playerProfile={playerProfile}
            onRefresh={refreshHistoryPanel}
            showTournamentRaffles={false}
            onViewTournament={enterInstanceBracket}
            getTournamentTypeLabel={getTournamentTypeLabel}
            v2Matches={v2MatchHistory.matches}
            v2MatchesLoading={v2MatchHistory.loading}
            reasonLabelMode="v2"
          />
          <ActiveLobbiesCard
            lobbies={activeLobbies.lobbies}
            loading={activeLobbies.loading}
            syncing={activeLobbies.syncing}
            error={activeLobbies.error}
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            recentMatchesCardHeight={recentMatchesCardHeight}
            onRefresh={activeLobbies.refetch}
            isExpanded={expandedPanel === 'activeLobbies'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'activeLobbies' ? null : 'activeLobbies')}
            onViewTournament={enterInstanceBracket}
            getTournamentTypeLabel={getTournamentTypeLabel}
            disabled={!account}
            showTooltip={activeTooltip === 'activeLobbies'}
            onShowTooltip={() => setActiveTooltip('activeLobbies')}
            onHideTooltip={() => setActiveTooltip(null)}
            connectCtaClassName={currentTheme.connectCtaClassName}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="text-center mb-6 md:mb-8">
          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            Welcome, Builders!
          </h1>

          <p className={`text-2xl ${currentTheme.heroText} mb-6`}>
            Checkers' live demo is built and deployed by following "21. Example: Checkers" step by step.
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
              gameType="checkers"
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
              hasNextActiveMatch={!!nextActiveMatch}
              playerCount={viewingTournament?.playerCount || null}
              playerConfig={{
                player1: { icon: '⚪', label: 'Player 1 (Light)' },
                player2: { icon: '⚫', label: 'Player 2 (Dark)' },
              }}
              layout="players-board-history"
              isSpectator={isSpectator}
              renderMoveHistory={moveHistory.length > 0 ? () => (
                <div>
                  <h3 className="text-xl font-bold text-[#fff8e7] mb-4 flex items-center gap-2">
                    <History size={20} />
                    Move History
                  </h3>
                  <div className="space-y-2">
                    {moveHistory.map((move, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm bg-[#fbbf24]/10 border border-[#d4a012]/20 p-2 rounded">
                        <span className="text-[#d4b866]">Move {idx + 1}:</span>
                        <span className="text-white">
                          <span className="font-bold">{move.player}</span>
                          <span className="text-[#fbbf24]"> → {move.move}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : undefined}
            >
              <CheckersBoard
                board={currentMatch.board}
                onMove={isSpectator ? null : handleMove}
                currentTurn={currentMatch.currentTurn}
                account={account}
                player1={currentMatch.player1}
                player2={currentMatch.player2}
                matchStatus={currentMatch.matchStatus}
                loading={matchLoading}
                pendingCaptureSource={currentMatch.pendingCaptureSource}
                lastMove={currentMatch.lastMove}
                ghostMove={ghostMove}
              />
            </GameMatchLayout>

            {moveTxTimeout && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border-2 border-amber-500/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-amber-500/20"><AlertCircle size={28} className="text-amber-400" /></div>
                    <h2 className="text-xl font-bold text-amber-300">Transaction Taking Too Long</h2>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                    <p className="text-white/90 text-sm leading-relaxed">
                      {moveTxTimeout.type === 'gas'
                        ? 'Your transaction may need a higher gas fee.'
                        : 'Your transaction is taking longer than expected, likely due to network congestion. You can retry or dismiss and wait.'}
                    </p>
                  </div>
                  <p className="text-white/40 text-xs mb-5 text-center italic">
                    The original transaction may still confirm. If your move appears on the board, dismiss this prompt.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const from = moveTxTimeout.pendingFromIndex;
                        const to = moveTxTimeout.pendingToIndex;
                        setMoveTxTimeout(null);
                        handleMove(from, to);
                      }}
                      className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a012] text-[#1a1200] transition-all"
                    >
                      Retry Move
                    </button>
                    <button
                      onClick={() => setMoveTxTimeout(null)}
                      className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm bg-white/10 hover:bg-white/20 text-white/80 border border-white/20 transition-all"
                    >
                      Dismiss
                    </button>
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
                <TournamentBracket
                  tournamentData={viewingTournament}
                  onBack={handleBackToTournaments}
                  onEnterMatch={handlePlayMatch}
                  onForceEliminate={handleForceEliminateStalledMatch}
                  onClaimReplacement={handleClaimMatchSlotByReplacement}
                  onManualStart={handleManualStart}
                  onClaimAbandonedPool={handleClaimAbandonedPool}
                  onResetEnrollmentWindow={handleResetEnrollmentWindow}
                  onCancelTournament={handleCancelTournament}
                  onEnroll={handleEnroll}
                  onConnectWallet={connectWallet}
                  account={account}
                  loading={tournamentsLoading}
                  connectLoading={isConnecting}
                  syncDots={bracketSyncDots}
                  isEnrolled={viewingTournament?.players?.some(addr => addr.toLowerCase() === account?.toLowerCase())}
                  entryFee={viewingTournament?.entryFeeEth ?? '0'}
                  isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount}
                  instanceContract={activeInstanceContract}
                />
              </div>
            ) : (
              <div className="space-y-8 md:space-y-10">
                <V2GameLobbyIntro
                  account={account}
                  isConnecting={isConnecting}
                  onConnectWallet={connectWallet}
                  connectCtaClassName={currentTheme.connectCtaClassName}
                  theme="gold"
                />
                <div id="live-instances">
                  <form onSubmit={createInstance}>
                    <div className="bg-[#120b00]/70 border border-[#d4a012]/30 rounded-2xl p-4 md:p-5 shadow-[0_0_40px_rgba(251,191,36,0.08)]">
                        <div id="configure-lobby-panel-checkers">
                          <div className="grid gap-4 md:grid-cols-[minmax(0,0.2fr)_minmax(0,0.8fr)] md:items-stretch">
                            <div className={`rounded-2xl border p-4 md:p-5 ${createLoading ? 'border-slate-800 bg-slate-900/50' : 'border-[#d4a012]/25 bg-[#090500]/80 shadow-[0_0_30px_rgba(251,191,36,0.08)]'}`}>
                              <div className="text-sm text-[#f5e6c8] mb-3">Player Count</div>
                              <div className="grid grid-cols-2 gap-3">
                                {CHECKERS_PLAYER_COUNT_OPTIONS.map(option => {
                                  const active = Number(createForm.playerCount) === option;
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      disabled={createLoading}
                                      onClick={() => setPlayerCount(option)}
                                      className={`px-4 py-3 rounded-xl text-base font-semibold transition-all ${createLoading ? 'bg-slate-900/80 border border-slate-800 text-slate-500 cursor-not-allowed' : active ? 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#1a1200] shadow-lg' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-[#d4a012]/40 hover:text-[#fff8e7]'}`}
                                    >
                                      {option}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <EntryFeeSlider
                                factoryRules={factoryRules}
                                entryFee={createForm.entryFee}
                                playerCount={createForm.playerCount}
                                disabled={createLoading}
                                maxEntryFeeEth="0.01"
                                onChange={value => updateCreateForm('entryFee', value)}
                              />
                            </div>

                          </div>

                          <div className="mt-4 mb-4">
                            <button
                              type="button"
                              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                              className="flex items-center gap-2 text-[#d4b866] hover:text-[#fff8e7] transition-colors mb-2"
                            >
                              {showAdvancedSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              <span className="text-sm font-semibold">More Settings</span>
                            </button>

                            {showAdvancedSettings && (
                              <div className="grid gap-4 lg:grid-cols-3 bg-slate-950/50 border border-[#d4a012]/10 rounded-xl p-4">
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
                              className={`inline-flex w-full md:w-auto min-w-[220px] items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-base md:text-lg shadow-2xl transition-all disabled:cursor-not-allowed ${account ? 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a012] transform hover:scale-105 text-[#1a1200] border border-[#fbbf24]/40 shadow-[0_0_30px_rgba(251,191,36,0.35)]' : 'bg-slate-800/90 border border-slate-700 text-slate-500'}`}
                            >
                              {createLoading ? <Loader size={20} className="animate-spin" /> : null}
                              {createLoading ? 'Creating Lobby...' : 'Create Lobby'}
                            </button>
                          </div>
                        </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-[#d4a012]/20 px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="text-center md:text-left">
              <p className="text-[#d4b866] text-sm mb-2">
                Powered by <span className="font-semibold bg-clip-text text-transparent" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text' }}>ETour Protocol</span>
              </p>
              <p className="text-[#8f7742] text-xs">Open-source perpetual tournament infrastructure on Arbitrum</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setContractsExpanded(!contractsExpanded)}
                className="text-[#8f7742] hover:text-[#fff8e7] transition-colors text-sm flex items-center gap-1"
              >
                Contracts {contractsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <Link to="/" className="text-[#8f7742] hover:text-[#fff8e7] transition-colors text-sm">Back Home</Link>
            </div>
          </div>

          {contractsExpanded && <V2ContractsTable scope="checkers" />}

          <div className="text-center pt-8 border-t border-[#d4a012]/15">
            <p className="text-[#8f7742] text-xs">No company needed. No trust required. No servers to shutdown.</p>
          </div>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @media (max-width: 768px) {
          .particle {
            font-size: 12px;
          }
        }
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
      `}</style>
    </div>
  );
}
