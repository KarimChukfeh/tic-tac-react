import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Wallet,
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
  RefreshCw,
  Trophy,
  ChevronDown,
  ChevronUp,
  History,
  HelpCircle,
} from 'lucide-react';
import { ethers } from 'ethers';
import { CURRENT_NETWORK, getAddressUrl } from '../../config/networks';
import { shortenAddress } from '../../utils/formatters';
import { generateV2TournamentUrl, parseV2ContractParam } from '../../utils/urlHelpers';
import { isDraw } from '../../utils/completionReasons';
import ParticleBackground from '../../components/shared/ParticleBackground';
import WhyArbitrum from '../../components/shared/WhyArbitrum';
import ConnectedWalletCard from '../../components/shared/ConnectedWalletCard';
import MatchCard from '../../components/shared/MatchCard';
import WinnersLeaderboard from '../../components/shared/WinnersLeaderboard';
import UserManual from '../../components/shared/UserManual';
import MatchEndModal from '../../components/shared/MatchEndModal';
import ActiveMatchAlertModal from '../../components/shared/ActiveMatchAlertModal';
import GameMatchLayout from '../../components/shared/GameMatchLayout';
import TournamentHeader from '../../components/shared/TournamentHeader';
import PlayerActivity from '../../components/shared/PlayerActivity';
import RecentMatchesCard from '../../components/shared/RecentMatchesCard';
import GamesCard from '../../components/shared/GamesCard';
import BracketScrollHint from '../../components/shared/BracketScrollHint';
import RecentInstanceCard from '../../components/shared/RecentInstanceCard';
import WalletBrowserPrompt from '../../components/WalletBrowserPrompt';
import { useWalletBrowserPrompt } from '../../hooks/useWalletBrowserPrompt';
import { isMobileDevice, isWalletBrowser } from '../../utils/mobileDetection';
import { didMatchStateAdvance, waitForTxOrStateSync } from '../../utils/txSync';
import { useConnectFourV2PlayerActivity } from '../hooks/useConnectFourV2PlayerActivity';
import { useConnectFourActiveTournaments } from '../hooks/useConnectFourActiveTournaments';
import { useConnectFourPlayerProfile } from '../hooks/useConnectFourPlayerProfile';
import { useConnectFourV2MatchHistory } from '../hooks/useConnectFourV2MatchHistory';
import {
  PLAYER_COUNT_OPTIONS,
  TIME_PER_PLAYER_OPTIONS,
  TIME_INCREMENT_OPTIONS,
  ENROLLMENT_WINDOW_OPTIONS,
  CONNECTFOUR_V2_FACTORY_ADDRESS,
  CONNECTFOUR_V2_FACTORY_ADDRESS_CANDIDATES,
  CONNECTFOUR_V2_IMPLEMENTATION_ADDRESS,
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
} from '../lib/connectfour';

const CONNECTFOUR_SYMBOLS = ['🔴', '🔵'];
const VIRTUAL_TIER_ID = 0;
const VIRTUAL_INSTANCE_ID = 0;
const LOCAL_CHAIN_ID_HEX = `0x${CURRENT_NETWORK.chainId.toString(16)}`;

const DEFAULT_CREATE_FORM = {
  playerCount: 2,
  entryFee: '0.001',
  ...getDefaultTimeouts(2),
};

const currentTheme = {
  border: 'rgba(0, 255, 255, 0.3)',
  particleColors: ['#0066ff', '#ff0044'],
  gradient: 'linear-gradient(135deg, #0a0015 0%, #1a0030 50%, #0f001a 100%)',
  heroGlow: 'from-blue-500 via-cyan-500 to-blue-500',
  heroIcon: 'text-blue-400',
  heroTitle: 'from-blue-400 via-cyan-400 to-blue-400',
  heroText: 'text-blue-200',
  heroSubtext: 'text-blue-300',
  buttonGradient: 'from-blue-500 to-cyan-500',
  buttonHover: 'hover:from-blue-600 hover:to-cyan-600',
  primary: 'rgba(0, 255, 255, 0.5)',
  secondary: 'rgba(255, 0, 255, 0.5)',
};

function isWalletAvailable() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

function boardToGrid(flatBoard) {
  const grid = Array(6).fill(null).map(() => Array(7).fill(0));
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const idx = row * 7 + col;
      grid[row][col] = Number(flatBoard[idx] || 0);
    }
  }
  return grid;
}

function getDropRow(grid, column) {
  for (let row = 5; row >= 0; row--) {
    if (grid[row][column] === 0) return row;
  }
  return -1;
}

function findWinningCells(grid, winner) {
  if (winner === 0) return [];
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
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
}

function decodeConnectFourMoves(movesString) {
  if (!movesString) return [];
  if (movesString.includes(',')) {
    return movesString
      .split(',')
      .map(value => Number.parseInt(value.trim(), 10))
      .filter(value => Number.isInteger(value) && value >= 0 && value <= 6);
  }
  const columns = [];
  for (let i = 0; i < movesString.length; i++) {
    const value = movesString.charCodeAt(i);
    if (value >= 0 && value <= 6) columns.push(value);
  }
  return columns;
}

const AnimatedDisc = ({ delay = 0, size = 'large' }) => {
  const [showRed, setShowRed] = useState(true);
  const [started, setStarted] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timeout = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timeout);
    }
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setShowRed(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, [started]);

  const svgSize = size === 'large' ? 128 : 32;

  return (
    <span className="relative inline-block">
      <svg width={svgSize} height={svgSize} viewBox="0 0 128 128" style={{ position: 'absolute' }}>
        <circle
          cx="64"
          cy="64"
          r="58"
          fill="url(#redAnimGradientV2)"
          style={{ opacity: showRed ? 1 : 0, transition: 'opacity 1s ease-in-out' }}
        />
        <defs>
          <radialGradient id="redAnimGradientV2" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#ff0044" />
            <stop offset="100%" stopColor="#bb0033" />
          </radialGradient>
        </defs>
      </svg>
      <svg width={svgSize} height={svgSize} viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r="58"
          fill="url(#blueAnimGradientV2)"
          style={{ opacity: showRed ? 0 : 1, transition: 'opacity 1s ease-in-out' }}
        />
        <defs>
          <radialGradient id="blueAnimGradientV2" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#0077ff" />
            <stop offset="100%" stopColor="#0055aa" />
          </radialGradient>
        </defs>
      </svg>
    </span>
  );
};

function ActionMessage({ type = 'info', message }) {
  if (!message) return null;
  const styles = {
    info: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    error: 'bg-red-500/15 border-red-400/30 text-red-200',
    success: 'bg-green-500/15 border-green-400/30 text-green-200',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[type] || styles.info}`}>
      {message}
    </div>
  );
}

function SectionShell({ title, children, right = null, id = null }) {
  return (
    <div id={id} className="mb-10">
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-3xl font-bold text-purple-300 flex items-center gap-3">
            <Grid size={28} />
            {title}
          </h2>
          {right}
        </div>
        {children}
      </div>
    </div>
  );
}

const ConnectFourBoard = ({
  board,
  onColumnClick,
  currentTurn,
  account,
  player1,
  player2,
  firstPlayer,
  matchStatus,
  loading,
  winner,
  lastColumn,
  ghostMove,
}) => {
  const [hoveredColumn, setHoveredColumn] = useState(-1);
  const [boardSize, setBoardSize] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const updateSize = () => {
      const vh55 = window.innerHeight * 0.55;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth * 0.9;
      setBoardSize(Math.min(vh55, containerWidth, 500));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const isMyTurn = account && currentTurn?.toLowerCase() === account.toLowerCase();
  const isPlayer1First = firstPlayer?.toLowerCase() === player1?.toLowerCase();
  const firstPlayerCellValue = isPlayer1First ? 1 : 2;
  const isFirstPlayer = account && firstPlayer?.toLowerCase() === account.toLowerCase();
  const myColor = isFirstPlayer ? 1 : account && (player1 || player2) ? 2 : 0;
  const opponentColor = myColor === 1 ? 2 : 1;
  const grid = boardToGrid(board);
  const previewRow = hoveredColumn >= 0 ? getDropRow(grid, hoveredColumn) : -1;

  const winnerValue = winner && winner !== ethers.ZeroAddress
    ? (winner.toLowerCase() === firstPlayer?.toLowerCase() ? firstPlayerCellValue : (firstPlayerCellValue === 1 ? 2 : 1))
    : 0;

  const winningCells = findWinningCells(grid, winnerValue);

  const getTopDiscRow = (col) => {
    for (let row = 0; row < 6; row++) {
      if (grid[row][col] !== 0) return row;
    }
    return -1;
  };

  const cellSize = boardSize ? (boardSize - 32 - 24) / 7 : 60;

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      <div className="flex gap-1 mb-2" style={{ width: boardSize || 'auto' }}>
        {[0, 1, 2, 3, 4, 5, 6].map(col => {
          const isColumnFull = getDropRow(grid, col) === -1;
          return (
            <div
              key={col}
              className={`flex-1 h-8 rounded-t-lg transition-all flex items-center justify-center ${isMyTurn && !isColumnFull && matchStatus === 1 ? 'hover:bg-white/20 cursor-pointer' : 'cursor-not-allowed opacity-50'} ${hoveredColumn === col && isMyTurn && !isColumnFull ? 'bg-white/20' : ''}`}
              onMouseEnter={() => !isColumnFull && setHoveredColumn(col)}
              onMouseLeave={() => setHoveredColumn(-1)}
              onClick={() => {
                if (isMyTurn && !isColumnFull && matchStatus === 1 && !loading) {
                  onColumnClick?.(col);
                }
              }}
            >
              {hoveredColumn === col && isMyTurn && !isColumnFull && (
                <div className="animate-bounce">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill={myColor === 1 ? '#ef4444' : '#3b82f6'} />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-4 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1b4b91 0%, #0d294b 100%)',
          width: boardSize || 'auto',
        }}
      >
        <div className="grid gap-1" style={{ gridTemplateRows: `repeat(6, ${cellSize}px)` }}>
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((cell, colIdx) => {
                const isWinning = winningCells.some(([r, c]) => r === rowIdx && c === colIdx);
                const topDiscRow = getTopDiscRow(colIdx);
                const isLastMove = lastColumn === colIdx && topDiscRow === rowIdx;
                const isPreview = rowIdx === previewRow && colIdx === hoveredColumn && isMyTurn && matchStatus === 1;
                const isGhost = cell === 0 && ghostMove?.column === colIdx && ghostMove?.row === rowIdx;

                return (
                  <div
                    key={colIdx}
                    className={`rounded-full flex items-center justify-center transition-all ${isWinning ? 'ring-4 ring-yellow-400 animate-pulse' : ''} ${isLastMove && !isWinning ? 'ring-2 ring-white/70' : ''}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: '#09192d',
                      boxShadow: isLastMove && !isWinning
                        ? 'inset 0 4px 8px rgba(0,0,0,0.5), 0 0 15px 2px rgba(255,255,255,0.3)'
                        : 'inset 0 4px 8px rgba(0,0,0,0.5)',
                    }}
                    onMouseEnter={() => setHoveredColumn(colIdx)}
                    onMouseLeave={() => setHoveredColumn(-1)}
                    onClick={() => {
                      if (isMyTurn && getDropRow(grid, colIdx) !== -1 && matchStatus === 1 && !loading) {
                        onColumnClick?.(colIdx);
                      }
                    }}
                  >
                    {cell !== 0 ? (
                      <div
                        className={`rounded-full transition-all ${isWinning ? 'scale-110' : ''} ${isLastMove && !isWinning ? 'animate-pulse' : ''}`}
                        style={{
                          width: cellSize - 8,
                          height: cellSize - 8,
                          background: cell === firstPlayerCellValue
                            ? 'radial-gradient(circle at 30% 30%, #ef4444, #b91c1c)'
                            : 'radial-gradient(circle at 30% 30%, #3b82f6, #1d4ed8)',
                          boxShadow: isLastMove && !isWinning
                            ? cell === firstPlayerCellValue
                              ? '0 0 20px 4px rgba(239,68,68,0.8), 0 0 40px 8px rgba(239,68,68,0.4), inset 0 -4px 8px rgba(0,0,0,0.3)'
                              : '0 0 20px 4px rgba(59,130,246,0.8), 0 0 40px 8px rgba(59,130,246,0.4), inset 0 -4px 8px rgba(0,0,0,0.3)'
                            : 'inset 0 -4px 8px rgba(0,0,0,0.3)',
                        }}
                      />
                    ) : isGhost ? (
                      <div
                        className="rounded-full animate-pulse"
                        style={{
                          width: cellSize - 8,
                          height: cellSize - 8,
                          opacity: 0.35,
                          background: opponentColor === 1
                            ? 'radial-gradient(circle at 30% 30%, #ef4444, #b91c1c)'
                            : 'radial-gradient(circle at 30% 30%, #3b82f6, #1d4ed8)',
                        }}
                      />
                    ) : isPreview ? (
                      <div
                        className="rounded-full opacity-40"
                        style={{
                          width: cellSize - 8,
                          height: cellSize - 8,
                          background: myColor === 1
                            ? 'radial-gradient(circle at 30% 30%, #ef4444, #b91c1c)'
                            : 'radial-gradient(circle at 30% 30%, #3b82f6, #1d4ed8)',
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

      <div className="flex gap-1 mt-2" style={{ width: boardSize || 'auto', paddingLeft: 16, paddingRight: 16 }}>
        {[1, 2, 3, 4, 5, 6, 7].map(label => (
          <div key={label} className="flex-1 text-center text-slate-500 text-sm font-medium">
            {label}
          </div>
        ))}
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
  onEnroll,
  account,
  loading,
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
  const ENROLLMENT_DURATION = 60;
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownExpired, setCountdownExpired] = useState(false);
  const firstEnrollmentTime = tournamentData.firstEnrollmentTime || 0;
  const countdownActive = tournamentData.countdownActive || false;

  useEffect(() => {
    if (prevStatusRef.current === 0 && status === 1 && isEnrolled && bracketViewRef.current) {
      const timer = setTimeout(() => {
        bracketViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }, 300);
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

  const hasValidRounds = rounds && rounds.length > 0 && rounds.some(round =>
    round.matches && round.matches.length > 0 && round.matches.some(match =>
      match.player1 && match.player1 !== ethers.ZeroAddress
    )
  );

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const prizePool = tournamentData.prizePoolWei || 0n;

  return (
    <div className="mb-16">
      <TournamentHeader
        gameType="connectfour"
        tierId={VIRTUAL_TIER_ID}
        instanceId={VIRTUAL_INSTANCE_ID}
        shareUrlOverride={tournamentData.address ? generateV2TournamentUrl(tournamentData.address) : undefined}
        status={status}
        currentRound={currentRound}
        playerCount={playerCount}
        enrolledCount={enrolledCount}
        prizePool={prizePool}
        enrolledPlayers={players || []}
        syncDots={syncDots}
        account={account}
        onBack={onBack}
        isEnrolled={isEnrolled}
        isFull={isFull}
        entryFee={entryFee}
        onEnroll={onEnroll}
        loading={loading}
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
                {countdownExpired ? '0m 0s' : formatTime(timeRemaining)}
              </span>
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
        <h3 className="text-2xl font-bold text-purple-300 mb-3 flex items-center gap-2">
          <Grid size={24} />
          {tournamentTypeLabel} Bracket
        </h3>

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
                        gameName="connect4"
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
              <div className="text-purple-300 text-lg">
                {status === 0 ? 'Brackets will be generated once the instance starts.' : 'No bracket data available.'}
              </div>
            </div>
            {enrolledCount === 0 && <hr className="border-purple-500/20" />}
            {enrolledCount === 0 && (
              <div id="last-instance">
                <RecentInstanceCard
                  tierId={VIRTUAL_TIER_ID}
                  instanceId={VIRTUAL_INSTANCE_ID}
                  contract={instanceContract}
                  tierName={tournamentTypeLabel}
                  walletAddress={account}
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

export default function ConnectFourV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const rpcProviderRef = useRef(null);
  const tournamentBracketRef = useRef(null);
  const matchViewRef = useRef(null);
  const collapseActivityPanelRef = useRef(null);

  const [factoryAddress, setFactoryAddress] = useState(CONNECTFOUR_V2_FACTORY_ADDRESS);
  const [browserProvider, setBrowserProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [rpcReady, setRpcReady] = useState(false);
  const [rpcProvider, setRpcProvider] = useState(null);
  const [walletBootDone, setWalletBootDone] = useState(!isWalletAvailable());
  const [balance, setBalance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWhyArbitrumExpanded, setIsWhyArbitrumExpanded] = useState(true);
  const [contractsExpanded, setContractsExpanded] = useState(false);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [factoryRules, setFactoryRules] = useState(null);
  const [implementationAddress, setImplementationAddress] = useState(CONNECTFOUR_V2_IMPLEMENTATION_ADDRESS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolvedFactoryContract, setResolvedFactoryContract] = useState(null);

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [actionState, setActionState] = useState({ type: 'info', message: '' });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const selectedAddress = searchParams.get('instance');
  const explorerUrl = getAddressUrl(factoryAddress);

  const [hasProcessedInviteParam, setHasProcessedInviteParam] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [activeInstanceContract, setActiveInstanceContract] = useState(null);

  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
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
  const [leaderboardLoading] = useState(false);
  const [leaderboardError] = useState(false);

  const [expandedPanel, setExpandedPanel] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [alertMatch, setAlertMatch] = useState(null);
  const [gamesCardHeight, setGamesCardHeight] = useState(0);
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);

  const { showPrompt, handleWalletChoice, handleContinueChoice, triggerWalletPrompt } = useWalletBrowserPrompt();

  const v2PlayerActivity = useConnectFourV2PlayerActivity(activeInstanceContract, account, resolvedFactoryContract, rpcProvider);
  const lobby = useConnectFourActiveTournaments(resolvedFactoryContract, rpcProvider, account);
  const playerProfile = useConnectFourPlayerProfile(resolvedFactoryContract, rpcProvider, account);
  const v2MatchHistory = useConnectFourV2MatchHistory(resolvedFactoryContract, rpcProvider, account);

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
    if (!runner) throw new Error('Local RPC provider is not ready.');
    for (const candidateAddress of CONNECTFOUR_V2_FACTORY_ADDRESS_CANDIDATES) {
      const code = await runner.getCode(candidateAddress);
      if (!code || code === '0x') continue;
      const contract = getFactoryContract(runner, candidateAddress);
      setFactoryAddress(candidateAddress);
      return contract;
    }
    throw new Error(`No Connect Four V2 factory found at ${CONNECTFOUR_V2_FACTORY_ADDRESS_CANDIDATES.join(' or ')} on ${CURRENT_NETWORK.name}.`);
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

  const ensureWalletOnLocalRpc = async (provider) => {
    const network = await provider.getNetwork();
    const currentChainId = `0x${BigInt(network.chainId).toString(16)}`;
    if (currentChainId === LOCAL_CHAIN_ID_HEX) return;
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: LOCAL_CHAIN_ID_HEX }] });
    } catch (switchError) {
      if (switchError?.code !== 4902) throw switchError;
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: LOCAL_CHAIN_ID_HEX,
          chainName: CURRENT_NETWORK.name,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: [CURRENT_NETWORK.rpcUrl],
        }],
      });
    }
  };

  useEffect(() => {
    const loadBalance = async () => {
      const runner = rpcProviderRef.current;
      if (!account || !runner) {
        setBalance(null);
        return;
      }
      try {
        const wei = await runner.getBalance(account);
        setBalance(ethers.formatEther(wei));
      } catch {
        setBalance(null);
      }
    };
    loadBalance();
  }, [account, lastUpdated]);

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
        setDashboardError(getReadableError(error, 'Failed to load Connect Four v2.'));
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, [rpcReady]);

  async function hydrateBracketMatch(instanceCont, userAccount, matchInfo) {
    const { roundNumber, matchNumber } = matchInfo;
    const matchKey = ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));

    const [matchData, fullMatch, boardRaw, tierConfig] = await Promise.all([
      instanceCont.getMatch(roundNumber, matchNumber),
      instanceCont.matches(matchKey),
      instanceCont.getBoard(roundNumber, matchNumber).catch(() => null),
      instanceCont.tierConfig(),
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
    const board = boardRaw ? Array.from({ length: 42 }, (_, i) => Number(boardRaw[i] ?? 0)) : Array(42).fill(0);

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

    const moves = matchData.moves || matchInfo.moves || '';
    const decodedMoves = decodeConnectFourMoves(moves);

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
      lastColumn: decodedMoves.length > 0 ? decodedMoves[decodedMoves.length - 1] : null,
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
    const rounds = await Promise.all(
      Array.from({ length: totalRounds }, async (_, roundIndex) => {
        const matchCount = Number(bracket.matchCounts[roundIndex] || 0);
        const matches = await Promise.all(
          Array.from({ length: matchCount }, async (_, matchIndex) => {
            const [matchData, board] = await Promise.all([
              instance.getMatch(roundIndex, matchIndex),
              instance.getBoard(roundIndex, matchIndex),
            ]);
            const normalized = normalizeMatch(roundIndex, matchIndex, matchData, board);
            const hydrated = await hydrateBracketMatch(instance, account, normalized);
            return { ...hydrated, tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID };
          })
        );
        return {
          roundIndex,
          matchCount,
          completedCount: Number(bracket.completedCounts[roundIndex] || 0),
          label: getRoundLabel(roundIndex, totalRounds),
          matches,
        };
      })
    );

    const snapshot = normalizeInstanceSnapshot(address, info, tournament, players, enrolled);

    let firstEnrollmentTime = 0;
    let countdownActive = false;
    try {
      const tournamentData = await instance.tournament();
      firstEnrollmentTime = Number(tournamentData.firstEnrollmentTime || 0);
      countdownActive = Boolean(tournamentData.countdownActive);
    } catch {}

    return {
      ...snapshot,
      rounds,
      firstEnrollmentTime,
      countdownActive,
      tierId: VIRTUAL_TIER_ID,
      instanceId: VIRTUAL_INSTANCE_ID,
    };
  };

  const refreshTournamentBracket = useCallback(async (address) => {
    try {
      const instance = getInstanceContract(address, getReadRunner());
      return await buildBracketData(address, instance);
    } catch (error) {
      console.error('[ConnectFourV2] Error refreshing tournament bracket:', error);
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
      await ensureWalletOnLocalRpc(provider);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      setBrowserProvider(provider);
      setAccount(await signer.getAddress());
      setIsWhyArbitrumExpanded(false);
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
        navigate('/v2/connect4', {
          replace: false,
          state: { view: 'bracket', instanceAddress: address, from: location.state?.view || 'landing' },
        });
        setTimeout(() => {
          tournamentBracketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          collapseActivityPanelRef.current?.();
        }, 100);
      }
    } catch (error) {
      console.error('[ConnectFourV2] Error entering bracket:', error);
    } finally {
      setTournamentsLoading(false);
    }
  }, [refreshTournamentBracket, navigate, location.state?.view]);

  useEffect(() => {
    if (!selectedAddress) return;
    enterInstanceBracket(selectedAddress);
  }, [selectedAddress, enterInstanceBracket]);

  useEffect(() => {
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
  }, [rpcReady, hasProcessedInviteParam, searchParams, setSearchParams, enterInstanceBracket]);

  const createInstance = async (event) => {
    event.preventDefault();
    if (!browserProvider || !account) {
      setActionState({ type: 'error', message: 'Connect a wallet before creating an instance.' });
      return;
    }
    setCreateLoading(true);
    setActionState({ type: 'info', message: 'Submitting createInstance transaction...' });
    try {
      const signer = await browserProvider.getSigner();
      const creator = await signer.getAddress();
      const readFactory = await resolveFactoryContract();
      const writableFactory = getFactoryContract(signer, factoryAddress);
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
        BigInt(createForm.enrollmentWindow),
        BigInt(createForm.matchTimePerPlayer),
        BigInt(createForm.timeIncrementPerMove),
        { value: entryFeeWei }
      );
      setActionState({ type: 'info', message: 'Waiting for confirmation...' });
      const receipt = await tx.wait();
      const address = await resolveCreatedInstanceAddress({
        factory: await resolveFactoryContract(),
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
      console.error('[ConnectFourV2 createInstance] raw error:', error);
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
      const tx = await writableInstance.enrollInTournament({ value: viewingTournament.entryFeeWei });
      await tx.wait();
      const updated = await refreshTournamentBracket(viewingTournament.address);
      if (updated) setViewingTournament(updated);
    } catch (error) {
      console.error('[ConnectFourV2] Enroll error:', error);
      setActionState({ type: 'error', message: getReadableError(error, 'Enrollment failed.') });
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

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
      const isEnrolled = await activeInstanceContract.isEnrolled(account);
      if (!isEnrolled) {
        alert('You must be enrolled to force-start.');
        return;
      }
      const msg = enrolledCount === 1
        ? `You are the only enrolled player. Force-starting will declare you the winner.${forfeitPool > 0n ? ` Plus ${ethers.formatEther(forfeitPool)} ETH forfeited fees.` : ''} Continue?`
        : `Force-starting with ${enrolledCount} players.${forfeitPool > 0n ? ` Forfeit pool of ${ethers.formatEther(forfeitPool)} ETH will be distributed.` : ''} Continue?`;
      if (!window.confirm(msg)) return;
      const tx = await writableInstance.forceStartTournament();
      await tx.wait();
      alert('Tournament force-started successfully!');
      if (enrolledCount === 1) {
        setViewingTournament(null);
        setCurrentMatch(null);
      } else {
        const updated = await refreshTournamentBracket(viewingTournament.address);
        if (updated) setViewingTournament(updated);
      }
    } catch (error) {
      console.error('[ConnectFourV2] Force start error:', error);
      alert(`Error force-starting: ${getReadableError(error, 'Unknown error')}`);
    } finally {
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

  const handleResetEnrollmentWindow = useCallback(async () => {
    if (!viewingTournament || !activeInstanceContract || !account) {
      alert('Please connect your wallet first.');
      return;
    }
    if (!window.confirm('Reset Enrollment Window\n\nThis will restart the enrollment period. Continue?')) return;
    try {
      setTournamentsLoading(true);
      const writableInstance = await withInstanceSigner(activeInstanceContract);
      const tx = await writableInstance.resetEnrollmentWindow();
      await tx.wait();
      alert('Enrollment window reset successfully!');
      const updated = await refreshTournamentBracket(viewingTournament.address);
      if (updated) setViewingTournament(updated);
    } catch (error) {
      console.error('[ConnectFourV2] Reset enrollment window error:', error);
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
      const tx = await writableInstance.claimAbandonedPool();
      await tx.wait();
      alert('Abandoned pool claimed successfully!');
      setViewingTournament(null);
      setCurrentMatch(null);
    } catch (error) {
      console.error('[ConnectFourV2] Claim abandoned pool error:', error);
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
      try {
        movesString = await instanceCont.getMatchMoves(roundNumber, matchNumber);
      } catch {
        const matchData = await instanceCont.getMatch(roundNumber, matchNumber);
        movesString = matchData.moves || '';
      }

      if (!movesString) return [];

      const columns = decodeConnectFourMoves(movesString);
      const matchKey = ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));
      const [matchData, fullMatch] = await Promise.all([
        instanceCont.getMatch(roundNumber, matchNumber),
        instanceCont.matches(matchKey),
      ]);

      const firstPlayer = fullMatch.firstPlayer;
      const player1 = matchData.player1;
      const player2 = matchData.player2;

      return columns.map((column, idx) => {
        const isFirstPlayerMove = idx % 2 === 0;
        const movePlayer = isFirstPlayerMove ? firstPlayer : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
        return {
          player: isFirstPlayerMove ? 'Red' : 'Blue',
          column: column + 1,
          address: movePlayer,
        };
      });
    } catch (error) {
      console.error('[ConnectFourV2] Error fetching move history:', error);
      return [];
    }
  }, []);

  const refreshMatchData = useCallback(async (instanceCont, userAccount, matchInfo) => {
    try {
      const { roundNumber, matchNumber } = matchInfo;
      const matchKey = ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));
      const [matchData, fullMatch, boardRaw, tierConfig] = await Promise.all([
        instanceCont.getMatch(roundNumber, matchNumber),
        instanceCont.matches(matchKey),
        instanceCont.getBoard(roundNumber, matchNumber).catch(() => null),
        instanceCont.tierConfig(),
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
      const board = boardRaw ? Array.from({ length: 42 }, (_, i) => Number(boardRaw[i] ?? 0)) : Array(42).fill(0);

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
      const decodedMoves = decodeConnectFourMoves(moves);
      const lastColumn = decodedMoves.length > 0 ? decodedMoves[decodedMoves.length - 1] : null;

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
        userSymbol: isPlayer1 ? 'Red' : 'Blue',
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
        lastColumn,
      };
    } catch (error) {
      console.error('[ConnectFourV2] Error refreshing match data:', error);
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
        const history = await fetchMoveHistory(instanceCont, roundNumber, matchNumber);
        setMoveHistory(history);
        skipNavEffectRef.current = true;
        navigate('/v2/connect4', {
          replace: false,
          state: { view: 'match', instanceAddress, roundNumber, matchNumber, from: location.state?.view || 'bracket' },
        });
        setTimeout(() => {
          matchViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          collapseActivityPanelRef.current?.();
        }, 100);
      }
    } catch (error) {
      console.error('[ConnectFourV2] Error loading match:', error);
      alert(`Error loading match: ${error.message}`);
    } finally {
      setMatchLoading(false);
    }
  }, [account, viewingTournament, refreshMatchData, fetchMoveHistory, navigate, location.state?.view]);

  const handleColumnClick = async (columnIndex) => {
    if (!currentMatch || !activeInstanceContractRef.current || !account) return;
    if (!currentMatch.isYourTurn) {
      alert("It's not your turn!");
      return;
    }
    const grid = boardToGrid(currentMatch.board);
    if (getDropRow(grid, columnIndex) === -1) {
      alert('Column is full!');
      return;
    }
    if (currentMatch.matchStatus === 2) {
      alert('Match is already complete!');
      return;
    }
    setMoveTxTimeout(null);
    try {
      setMatchLoading(true);
      moveTxInProgressRef.current = true;
      const { roundNumber, matchNumber } = currentMatch;
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.makeMove(roundNumber, matchNumber, columnIndex);
      const syncResult = await waitForTxOrStateSync({
        tx,
        timeoutMs: 90_000,
        sync: async () => {
          const latestMatch = currentMatchRef.current || currentMatch;
          if (!latestMatch || !activeInstanceContractRef.current) return null;
          return refreshMatchData(activeInstanceContractRef.current, account, latestMatch);
        },
        isSynced: (updatedMatch) => didMatchStateAdvance(currentMatchRef.current || currentMatch, updatedMatch),
      });

      const latestMatch = currentMatchRef.current || currentMatch;
      const updated = syncResult.updated || ((latestMatch && activeInstanceContractRef.current)
        ? await refreshMatchData(activeInstanceContractRef.current, account, latestMatch)
        : null);
      if (updated) {
        setCurrentMatch(updated);
        previousBoardRef.current = [...updated.board];
      }

      moveTxInProgressRef.current = false;
      setMatchLoading(false);

      if (updated) {
        try {
          const history = await fetchMoveHistory(activeInstanceContractRef.current, roundNumber, matchNumber);
          setMoveHistory(history);
        } catch (historyError) {
          console.error('[ConnectFourV2] Error refreshing move history after move:', historyError);
        }
      }
    } catch (error) {
      const errorString = error.message || error.toString();
      if (errorString.includes('TX_TIMEOUT')) {
        setMoveTxTimeout({ type: 'congestion', pendingColumnIndex: columnIndex });
        return;
      }
      let msg = 'Invalid Move';
      if (errorString.includes('user rejected') || errorString.includes('User denied')) msg = 'Transaction cancelled';
      else if (errorString.includes('insufficient funds')) msg = 'Insufficient funds for gas';
      else if (errorString.includes('Not your turn')) msg = 'Not your turn';
      else if (errorString.includes('Match not active')) msg = 'Match is not active';
      else if (errorString.includes('execution reverted')) msg = 'Invalid Move - This move is not allowed';
      alert(msg);
    } finally {
      moveTxInProgressRef.current = false;
      setMatchLoading(false);
    }
  };

  const handleClaimTimeoutWin = async () => {
    if (!currentMatch || !activeInstanceContractRef.current) return;
    try {
      setMatchLoading(true);
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.claimTimeoutWin(currentMatch.roundNumber, currentMatch.matchNumber);
      await tx.wait();
      const updatedMatch = await refreshMatchData(activeInstanceContractRef.current, account, currentMatch);
      if (updatedMatch) {
        setCurrentMatch(updatedMatch);
        setMatchEndResult({ result: 'forfeit_win', completionReason: 1 });
        setMatchEndWinnerLabel('You');
        setMatchEndWinner(updatedMatch.winner);
        setMatchEndLoser(updatedMatch.loser);
      }
    } catch (error) {
      console.error('[ConnectFourV2] Claim timeout win error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setMatchLoading(false);
    }
  };

  const handleForceEliminateStalledMatch = async (matchData = null) => {
    const match = matchData || currentMatch;
    if (!match || !activeInstanceContractRef.current) return;
    try {
      setMatchLoading(true);
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.forceEliminateStalledMatch(match.roundNumber, match.matchNumber);
      await tx.wait();
      alert('Stalled match eliminated! Tournament can now continue.');
      setCurrentMatch(null);
      const address = viewingTournament?.address;
      if (address) {
        const updated = await refreshTournamentBracket(address);
        if (updated) setViewingTournament(updated);
      }
    } catch (error) {
      console.error('[ConnectFourV2] Force eliminate error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setMatchLoading(false);
    }
  };

  const handleClaimMatchSlotByReplacement = async (matchData = null) => {
    const match = matchData || currentMatch;
    if (!match || !activeInstanceContractRef.current) return;
    try {
      setMatchLoading(true);
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer);
      const tx = await writableInstance.claimMatchSlotByReplacement(match.roundNumber, match.matchNumber);
      await tx.wait();
      alert('Match slot claimed! You have replaced both players and advanced.');
      setCurrentMatch(null);
      setViewingTournament(null);
    } catch (error) {
      console.error('[ConnectFourV2] Claim slot by replacement error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setMatchLoading(false);
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
      console.error('[ConnectFourV2] Check next match error:', error);
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
    const doSync = async () => {
      const tournament = tournamentRef.current;
      const instanceCont = activeInstanceContractRef.current;
      if (!tournament || !instanceCont) return;
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
            const finalHistory = await fetchMoveHistory(instanceCont, match.roundNumber, match.matchNumber);
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
            lastColumn: updatedMatch.lastColumn,
          };
        });

        if (boardChanged) {
          const history = await fetchMoveHistory(instanceCont, match.roundNumber, match.matchNumber);
          setMoveHistory(history);
        }
        previousBoardRef.current = [...updatedMatch.board];
      } catch (error) {
        console.error('[ConnectFourV2 Polling] Error syncing match:', error);
      }
      setSyncDots(1);
    };

    doMatchSyncRef.current = doMatchSync;
    const interval = setInterval(doMatchSync, 1500);
    return () => clearInterval(interval);
  }, [currentMatch?.instanceAddress, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, fetchMoveHistory, checkForNextActiveMatch]);

  useEffect(() => {
    if (!currentMatch || !activeInstanceContract || !account) return;
    const match = currentMatchRef.current;
    if (!match?.player1 || !match?.player2) return;

    const matchId = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [match.roundNumber, match.matchNumber]);
    const opponentAddress = match.player1.toLowerCase() === account.toLowerCase() ? match.player2 : match.player1;

    const handleOpponentMove = (_matchId, _player, column, row) => {
      setGhostMove({ column: Number(column), row: Number(row) });
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
        navigate('/v2/connect4', { replace: true, state: null });
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
              const history = await fetchMoveHistory(instanceCont, state.roundNumber, state.matchNumber);
              setMoveHistory(history);
            }
          } catch (error) {
            console.error('[ConnectFourV2] Error loading match from history:', error);
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
    document.title = 'ETour - Connect Four V2';
  }, []);

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
      <ParticleBackground colors={currentTheme.particleColors} symbols={CONNECTFOUR_SYMBOLS} fontSize="24px" count={38} />

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
          gameType="connectfour"
          roundNumber={currentMatch?.roundNumber}
          totalRounds={viewingTournament?.totalRounds}
          prizePool={viewingTournament?.prizePoolWei}
        />
      )}

      {showMatchAlert && alertMatch && (
        <ActiveMatchAlertModal
          match={alertMatch}
          onEnterMatch={() => {
            handleMatchAlertClose();
            handlePlayMatch(alertMatch.tierId, alertMatch.instanceId, alertMatch.roundIdx, alertMatch.matchIdx);
          }}
          onDismiss={handleMatchAlertClose}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto">
      <div className="md:hidden bg-gradient-to-b from-slate-800 to-slate-900 border-t border-purple-400/30 px-4 py-2.5 flex items-center justify-between">
          <GamesCard
            currentGame="connect4"
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
            onEnterTournament={() => { if (viewingTournament) enterInstanceBracket(viewingTournament.address); }}
            onRefresh={v2PlayerActivity.refetch}
            onDismissMatch={v2PlayerActivity.dismissMatch}
            gameName="connect4"
            gameEmoji="🔴"
            gamesCardHeight={gamesCardHeight}
            onHeightChange={setPlayerActivityHeight}
            onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }}
            isExpanded={expandedPanel === 'playerActivity'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            tierConfig={{}}
            disabled={!account}
            showTooltip={activeTooltip === 'playerActivity'}
            onShowTooltip={() => setActiveTooltip('playerActivity')}
            onHideTooltip={() => setActiveTooltip(null)}
          />
          <RecentMatchesCard
            contract={null}
            account={account}
            gameName="connect4"
            gameEmoji="🔴"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={() => {}}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={{}}
            disabled={!account}
            showTooltip={activeTooltip === 'recentMatches'}
            onShowTooltip={() => setActiveTooltip('recentMatches')}
            onHideTooltip={() => setActiveTooltip(null)}
            onNavigateToTournament={() => {}}
            leaderboard={leaderboard}
            playerProfile={playerProfile}
            onViewTournament={enterInstanceBracket}
            getTournamentTypeLabel={getTournamentTypeLabel}
            v2Matches={v2MatchHistory.matches}
            v2MatchesLoading={v2MatchHistory.loading}
          />
        </div>

        <div className="hidden md:block">
          <GamesCard
            currentGame="connect4"
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
            onEnterTournament={() => { if (viewingTournament) enterInstanceBracket(viewingTournament.address); }}
            onRefresh={v2PlayerActivity.refetch}
            onDismissMatch={v2PlayerActivity.dismissMatch}
            gameName="connect4"
            gameEmoji="🔴"
            gamesCardHeight={gamesCardHeight}
            onHeightChange={setPlayerActivityHeight}
            onCollapse={(fn) => { collapseActivityPanelRef.current = fn; }}
            isExpanded={expandedPanel === 'playerActivity'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            tierConfig={{}}
            disabled={!account}
            showTooltip={activeTooltip === 'playerActivity'}
            onShowTooltip={() => setActiveTooltip('playerActivity')}
            onHideTooltip={() => setActiveTooltip(null)}
          />
          <RecentMatchesCard
            contract={null}
            account={account}
            gameName="connect4"
            gameEmoji="🔴"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={() => {}}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={{}}
            disabled={!account}
            showTooltip={activeTooltip === 'recentMatches'}
            onShowTooltip={() => setActiveTooltip('recentMatches')}
            onHideTooltip={() => setActiveTooltip(null)}
            onNavigateToTournament={() => {}}
            leaderboard={leaderboard}
            playerProfile={playerProfile}
            onViewTournament={enterInstanceBracket}
            getTournamentTypeLabel={getTournamentTypeLabel}
            v2Matches={v2MatchHistory.matches}
            v2MatchesLoading={v2MatchHistory.loading}
          />
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
            {explorerUrl ? (
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors justify-center md:justify-end">
                <Code size={16} />
                <span className="font-mono text-xs">{shortenAddress(factoryAddress)}</span>
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`} />
              <div className="relative">
                <AnimatedDisc />
              </div>
            </div>
          </div>
          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            ETour Connect Four
          </h1>
          <p className={`text-2xl ${currentTheme.heroText} mb-6`}>Provably Fair • Zero Trust • 100% On-Chain</p>
          <p className={`text-lg ${currentTheme.heroSubtext} max-w-3xl mx-auto mb-8`}>
            Play Connect Four on the blockchain. Real opponents. Real ETH on the line.
            <br />No servers required. No trust needed.
            <br />Every move is a transaction. Every outcome is permanently on-chain.
          </p>
          <p className="text-base text-cyan-300 max-w-3xl mx-auto mb-8">
            V2 keeps the same Connect Four look and feel while replacing fixed tiers with on-demand tournament instances.
          </p>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Clock className="text-yellow-400" size={20} /><span className="font-bold text-yellow-300">5 minutes per match</span></div>
              <p className="text-sm text-yellow-200">Each player gets 5 minutes total for all their moves in the match.</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="20" height="20" viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg" className="text-green-400" fill="currentColor">
                  <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity="0.6"/>
                  <path d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
                  <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity="0.6"/>
                  <path d="M127.962 416.905v-104.72L0 236.585z"/>
                  <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity="0.2"/>
                  <path d="M0 212.32l127.96 75.638v-133.8z" fillOpacity="0.6"/>
                </svg>
                <span className="font-bold text-green-300">Instant ETH Payouts</span>
              </div>
              <p className="text-sm text-green-200">Winners paid automatically on-chain. No delays, no middlemen.</p>
            </div>
            <div className="relative bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Shield className="text-purple-400" size={20} /><span className="font-bold text-purple-300">Impossible to grief</span></div>
              <a href="#user-manual" className="absolute top-3 right-3 text-purple-400 hover:text-purple-300 transition-colors" title="Learn more about anti-griefing">
                <HelpCircle size={16} />
              </a>
              <p className="text-sm text-purple-200">Anti-stalling mechanisms ensure every match completes. No admin required.</p>
            </div>
          </div>

          {walletBootDone && !account ? (
            <div className="w-full max-w-lg mx-auto">
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-10 py-5 rounded-2xl font-bold text-2xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isConnecting ? <Loader size={28} className="animate-spin" /> : <Wallet size={28} />}
                {isConnecting ? 'Connecting...' : 'Connect Wallet to Enter'}
              </button>
            </div>
          ) : (
            <ConnectedWalletCard
              account={account}
              balance={balance}
              contractAddress={factoryAddress}
              contractName="Connect Four v2 Factory"
              shortenAddress={shortenAddress}
              payout={null}
              lastWin={null}
            />
          )}

          <WhyArbitrum
            variant="blue"
            isExpanded={isWhyArbitrumExpanded}
            onToggle={() => setIsWhyArbitrumExpanded(!isWhyArbitrumExpanded)}
          />
        </div>

        <div className="mb-8 space-y-4">
          <ActionMessage type={actionState.type} message={actionState.message} />
          <ActionMessage type="error" message={dashboardError} />
        </div>

        {currentMatch && (
          <div ref={matchViewRef}>
            <GameMatchLayout
              gameType="connectfour"
              match={currentMatch}
              account={account}
              loading={matchLoading}
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
              playerConfig={(() => {
                const isPlayer1First = currentMatch.firstPlayer?.toLowerCase() === currentMatch.player1?.toLowerCase();
                return {
                  player1: { icon: isPlayer1First ? '🔴' : '🔵', label: isPlayer1First ? 'Player 1 (Red)' : 'Player 1 (Blue)' },
                  player2: { icon: isPlayer1First ? '🔵' : '🔴', label: isPlayer1First ? 'Player 2 (Blue)' : 'Player 2 (Red)' },
                };
              })()}
              layout="players-board-history"
              isSpectator={isSpectator}
              renderMoveHistory={moveHistory.length > 0 ? () => (
                <div>
                  <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <History size={20} />
                    Move History
                  </h3>
                  <div className="space-y-2">
                    {moveHistory.map((move, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm bg-purple-500/10 p-2 rounded">
                        <span className="text-purple-300">Move {idx + 1}:</span>
                        <span className="text-white">
                          <span className="font-bold">{move.player}</span>
                          <span className="text-purple-400"> → Column {move.column}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : undefined}
            >
              <ConnectFourBoard
                board={currentMatch.board}
                onColumnClick={isSpectator ? null : handleColumnClick}
                currentTurn={currentMatch.currentTurn}
                account={account}
                player1={currentMatch.player1}
                player2={currentMatch.player2}
                firstPlayer={currentMatch.firstPlayer}
                matchStatus={currentMatch.matchStatus}
                loading={matchLoading}
                winner={currentMatch.winner}
                lastColumn={currentMatch.lastColumn}
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
                        const column = moveTxTimeout.pendingColumnIndex;
                        setMoveTxTimeout(null);
                        handleColumnClick(column);
                      }}
                      className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-900 transition-all"
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
                  onEnroll={handleEnroll}
                  account={account}
                  loading={tournamentsLoading}
                  syncDots={bracketSyncDots}
                  isEnrolled={viewingTournament?.players?.some(addr => addr.toLowerCase() === account?.toLowerCase())}
                  entryFee={viewingTournament?.entryFeeWei ?? '0'}
                  isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount}
                  instanceContract={activeInstanceContract}
                />
              </div>
            ) : (
              <>
                <SectionShell
                  id="live-instances"
                  title="Start Tournament"
                  right={(
                    <button
                      type="button"
                      onClick={refreshDashboard}
                      className="flex items-center gap-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-200 px-4 py-2 rounded-xl transition-colors"
                    >
                      <RefreshCw size={16} className={dashboardLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  )}
                >
                  <form onSubmit={createInstance}>
                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-4 md:p-5">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
                        <div>
                          <div className="text-sm text-purple-200 mb-2">Player Count (up to 32)</div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {PLAYER_COUNT_OPTIONS.map(option => {
                              const active = Number(createForm.playerCount) === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setPlayerCount(option)}
                                  className={`px-3 py-2.5 rounded-xl font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-cyan-400/40'}`}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block">
                            <div className="text-sm text-purple-200 mb-2">Entry Fee ({factoryRules ? `${formatEth(factoryRules.minEntryFee)}+ ETH` : '0.001 - 1 ETH'})</div>
                            <input
                              type="number"
                              min="0.001"
                              max="1"
                              step="0.001"
                              value={createForm.entryFee}
                              onChange={event => updateCreateForm('entryFee', event.target.value)}
                              className="w-full bg-slate-950/80 border border-purple-400/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="mt-4 mb-4">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                          className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors mb-2"
                        >
                          {showAdvancedSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          <span className="text-sm font-semibold">More Settings</span>
                        </button>

                        {showAdvancedSettings && (
                          <div className="grid gap-4 lg:grid-cols-3 bg-slate-950/50 border border-purple-400/10 rounded-xl p-4">
                            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                              <div className="text-sm text-purple-200 mb-2">Enrollment Window</div>
                              <div className="grid grid-cols-2 gap-2">
                                {ENROLLMENT_WINDOW_OPTIONS.map(seconds => {
                                  const active = Number(createForm.enrollmentWindow) === seconds;
                                  const label = seconds < 60 ? `${seconds}s` : `${seconds / 60}min`;
                                  return (
                                    <button
                                      key={seconds}
                                      type="button"
                                      onClick={() => updateCreateForm('enrollmentWindow', seconds)}
                                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                              <div className="text-sm text-purple-200 mb-2">Time Per Player</div>
                              <div className="grid grid-cols-2 gap-2">
                                {TIME_PER_PLAYER_OPTIONS.map(seconds => {
                                  const active = Number(createForm.matchTimePerPlayer) === seconds;
                                  const label = `${seconds / 60}min`;
                                  return (
                                    <button
                                      key={seconds}
                                      type="button"
                                      onClick={() => updateCreateForm('matchTimePerPlayer', seconds)}
                                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                              <div className="text-sm text-purple-200 mb-2">Increment Time</div>
                              <div className="grid grid-cols-2 gap-2">
                                {TIME_INCREMENT_OPTIONS.map(seconds => {
                                  const active = Number(createForm.timeIncrementPerMove) === seconds;
                                  return (
                                    <button
                                      key={seconds}
                                      type="button"
                                      onClick={() => updateCreateForm('timeIncrementPerMove', seconds)}
                                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}
                                    >
                                      {seconds}s
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        {walletBootDone && !account ? (
                          <button
                            type="button"
                            onClick={connectWallet}
                            disabled={isConnecting}
                            className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isConnecting ? <Loader size={22} className="animate-spin" /> : <Wallet size={22} />}
                            {isConnecting ? 'Connecting...' : 'Connect to Create'}
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={createLoading}
                            className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {createLoading ? <Loader size={22} className="animate-spin" /> : <Plus size={22} />}
                            {createLoading ? 'Creating Tournament...' : 'Create and Enrol'}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </SectionShell>

                <SectionShell
                  id="open-tournaments"
                  title="Open Tournaments"
                  right={(
                    <button
                      type="button"
                      onClick={() => { lobby.refetch(); playerProfile.refetch(); }}
                      className="flex items-center gap-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-100 px-4 py-2 rounded-xl transition-colors"
                    >
                      <RefreshCw size={16} className={lobby.loading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  )}
                >
                  {lobby.error ? (
                  <p className="text-red-300 text-sm">{lobby.error}</p>
                ) : lobby.loading ? (
                  <div className="flex items-center gap-3 text-purple-300 py-4">
                    <Loader size={20} className="animate-spin" />
                    <span>Loading tournaments...</span>
                  </div>
                ) : lobby.active.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4">No open tournaments right now. Create one above to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {lobby.active.map(t => {
                        const spotsLeft = t.playerCount - t.enrolledCount;
                        const statusLabel = t.status === 0 ? 'Enrolling' : 'In Progress';
                        const statusColor = t.status === 0 ? 'text-green-300' : 'text-yellow-300';
                        return (
                          <div key={t.address} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/50 border border-purple-400/20 rounded-xl px-4 py-3 hover:border-purple-400/50 transition-colors">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
                              <span className="text-white font-mono">{getTournamentTypeLabel(t.playerCount)} · {t.playerCount}p</span>
                              <span className="text-slate-300">{t.entryFeeEth} ETH entry</span>
                              <span className="text-slate-400">{t.enrolledCount}/{t.playerCount} enrolled{spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : ''}</span>
                              {t.isEnrolled && <span className="text-cyan-300 font-semibold">✓ Enrolled</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => enterInstanceBracket(t.address)}
                              className="shrink-0 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-4 py-2 rounded-xl transition-all"
                            >
                              {t.isEnrolled ? 'View Bracket' : t.status === 0 ? 'Join' : 'Spectate'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionShell>
              </>
            )}
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <WinnersLeaderboard
          leaderboard={leaderboard}
          loading={leaderboardLoading}
          error={leaderboardError}
          currentAccount={account}
          onRetry={() => {}}
          onRefresh={() => {}}
        />
      </div>

      <div id="user-manual" className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <UserManual
          contractInstance={null}
          tierConfigurations={[]}
          raffleThresholds={['0.001', '0.005', '0.02', '0.05', '0.25', '0.5', '0.75', '1']}
        />
      </div>

      <footer className="border-t border-slate-800/50 px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="text-center md:text-left">
              <p className="text-slate-500 text-sm mb-2">
                Powered by <span className="font-semibold bg-clip-text text-transparent" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text' }}>ETour Protocol</span>
              </p>
              <p className="text-slate-600 text-xs">Open-source perpetual tournament infrastructure on Arbitrum</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setContractsExpanded(!contractsExpanded)}
                className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                Contracts {contractsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <Link to="/" className="text-slate-500 hover:text-white transition-colors text-sm">Back Home</Link>
            </div>
          </div>

          {contractsExpanded && (
            <div className="mb-8 overflow-x-auto">
              <table className="w-full border-collapse bg-slate-900/60 rounded-lg">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-cyan-300 font-semibold">Deployment</th>
                    <th className="text-left p-4 text-cyan-300 font-semibold">Address</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/30">
                    <td className="p-4 text-slate-300">Connect Four v2 Factory</td>
                    <td className="p-4 font-mono text-slate-400 break-all">{factoryAddress}</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-slate-300">Connect Four v2 Instance Implementation</td>
                    <td className="p-4 font-mono text-slate-400 break-all">{implementationAddress}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="text-center pt-8 border-t border-slate-800/30">
            <p className="text-slate-600 text-xs">No company needed. No trust required. No servers to shutdown.</p>
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
