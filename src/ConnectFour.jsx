/**
 * ConnectFour - On-Chain Connect Four Tournament Frontend
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
 *    VITE_CONNECTFOUR_ADDRESS=0x...
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Zap, Coins, History,
  CheckCircle, AlertCircle, ChevronDown, ArrowLeft, HelpCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import ConnectFourABIData from './ConnectFourABI-modular.json';
const CONNECTFOUR_ABI = ConnectFourABIData.abi;
const CONTRACT_ADDRESS = ConnectFourABIData.address;
const MODULE_ADDRESSES = ConnectFourABIData.modules;
import { CURRENT_NETWORK, CONTRACT_ADDRESSES, getAddressUrl, getExplorerHomeUrl } from './config/networks';
import { shortenAddress, formatTime as formatTimeHMS, getTierName } from './utils/formatters';
import { parseTournamentParams } from './utils/urlHelpers';
import { parseConnectFourMatch } from './utils/matchDataParser';
import { determineMatchResult } from './utils/matchCompletionHandler';
import { fetchTierTimeoutConfig } from './utils/timeCalculations';
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
import { usePlayerActivity } from './hooks/usePlayerActivity';

// ConnectFour particle symbols (matching landing page style)
const CONNECTFOUR_SYMBOLS = ['🔴', '🔵'];

// Hardcoded tier configuration (matches ConnectFourOnChain.sol deployment)
// Tier 0: _registerTier0() -> 2 players, 100 instances, 0.002 ETH
// Tier 1: _registerTier1() -> 4 players, 50 instances, 0.004 ETH
// Tier 2: _registerTier2() -> 8 players, 30 instances, 0.008 ETH
const TIER_CONFIG = {
  0: {
    playerCount: 2,
    instanceCount: 100,
    entryFee: '0.002',
    timeouts: {
      matchTimePerPlayer: 300,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 120,
      matchLevel3Delay: 240,
      enrollmentWindow: 300,
      enrollmentLevel2Delay: 300
    }
  },
  1: {
    playerCount: 4,
    instanceCount: 50,
    entryFee: '0.004',
    timeouts: {
      matchTimePerPlayer: 300,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 120,
      matchLevel3Delay: 240,
      enrollmentWindow: 600,
      enrollmentLevel2Delay: 300
    }
  },
  2: {
    playerCount: 8,
    instanceCount: 30,
    entryFee: '0.008',
    timeouts: {
      matchTimePerPlayer: 300,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 120,
      matchLevel3Delay: 240,
      enrollmentWindow: 900,
      enrollmentLevel2Delay: 300
    }
  }
};

// Animated disc that fades between red and blue
// delay: initial delay in ms before starting animation (for staggered effect)
// size: 'large' for hero, 'small' for headers
const AnimatedDisc = ({ delay = 0, size = 'large' }) => {
  const [showRed, setShowRed] = useState(true);
  const [started, setStarted] = useState(delay === 0);

  useEffect(() => {
    // Initial delay for staggered animations
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

  const sizeClass = size === 'large' ? 'text-8xl' : 'text-2xl';

  return (
    <span className={`relative inline-block ${sizeClass}`}>
      <span
        className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        style={{ opacity: showRed ? 1 : 0 }}
      >
        🔴
      </span>
      <span
        className="transition-opacity duration-1000 ease-in-out"
        style={{ opacity: showRed ? 0 : 1 }}
      >
        🔵
      </span>
    </span>
  );
};

// Helper functions for Connect Four board
const boardToGrid = (flatBoard) => {
  const grid = Array(6).fill(null).map(() => Array(7).fill(0));
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const contractIdx = row * 7 + col;
      grid[row][col] = Number(flatBoard[contractIdx]);
    }
  }
  return grid;
};

const getDropRow = (grid, column) => {
  for (let row = 5; row >= 0; row--) {
    if (grid[row][column] === 0) return row;
  }
  return -1; // Column full
};

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

  const isPlayer1 = account && player1?.toLowerCase() === account.toLowerCase();
  const isPlayer2 = account && player2?.toLowerCase() === account.toLowerCase();
  const isMyTurn = account && currentTurn?.toLowerCase() === account.toLowerCase();

  const myColor = isPlayer1 ? 1 : isPlayer2 ? 2 : 0;

  const grid = boardToGrid(board);

  const winnerValue = winner && winner !== '0x0000000000000000000000000000000000000000'
    ? (winner.toLowerCase() === player1?.toLowerCase() ? 1 : 2)
    : 0;
  const winningCells = findWinningCells(grid, winnerValue);

  const previewRow = hoveredColumn >= 0 ? getDropRow(grid, hoveredColumn) : -1;

  const getTopDiscRow = (col) => {
    for (let row = 0; row < 6; row++) {
      if (grid[row][col] !== 0) return row;
    }
    return -1;
  };

  const cellSize = boardSize ? (boardSize - 32 - 24) / 7 : 60;

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      {/* Column selectors */}
      <div className="flex gap-1 mb-2" style={{ width: boardSize || 'auto' }}>
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

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onResetEnrollmentWindow, onEnroll, account, loading, syncDots, isEnrolled, entryFee, isFull, contract }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers, firstEnrollmentTime, countdownActive, enrollmentTimeout } = tournamentData;

  // Calculate total rounds based on player count
  const totalRounds = Math.ceil(Math.log2(playerCount));

  // Ref for active match scrolling
  const activeMatchRef = useRef(null);

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

    // Scroll to the active match if found (happens after every sync)
    if (userActiveMatch && activeMatchRef.current) {
      setTimeout(() => {
        activeMatchRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300); // Small delay to ensure render is complete
    }
  }, [account, rounds, status, syncDots]); // Include syncDots to trigger on every sync

  // TicTacToe-specific options for match status display
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
        gameType="connectfour"
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
                        onForceEliminate={onForceEliminate}
                        onClaimReplacement={onClaimReplacement}
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
    </div>
  );
};

export default function ConnectFour() {
  // Use modular ABI configuration (CONTRACT_ADDRESS from import, not network config)
  const EXPECTED_CHAIN_ID = CURRENT_NETWORK.chainId;
  const RPC_URL = import.meta.env.VITE_RPC_URL || CURRENT_NETWORK.rpcUrl;
  const EXPLORER_URL = getAddressUrl(CONTRACT_ADDRESS);

  // Helper to get read-only contract (bypasses MetaMask for read operations)
  const getReadOnlyContract = useCallback(() => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CONTRACT_ADDRESS, CONNECTFOUR_ABI, provider);
  }, [RPC_URL]); // CONTRACT_ADDRESS now const from import

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null); // This contract has signer for write ops

  // Time Configuration from Contract
  const [matchTimePerPlayer, setMatchTimePerPlayer] = useState(300); // Default 5 minutes
  const [timeIncrement, setTimeIncrement] = useState(0); // Default no increment
  const [escalationInterval, setEscalationInterval] = useState(60); // Default 60 seconds between escalations
  const [displayTimeoutConfig, setDisplayTimeoutConfig] = useState({ matchTimePerPlayer: 300 }); // Dynamic timeout config for display

  // Loading State
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [networkInfo, setNetworkInfo] = useState(null);

  // Tournament State - Lazy Loading Architecture
  // tierMetadata: Basic tier info loaded on initial page load (fast)
  // tierInstances: Detailed tournament instances loaded on tier expand (lazy)
  const [tierMetadata, setTierMetadata] = useState({}); // { [tierId]: { playerCount, instanceCount, entryFee, statuses, enrolledCounts } }
  const [tierInstances, setTierInstances] = useState({}); // { [tierId]: [tournament instances] }
  const [tierLoading, setTierLoading] = useState({}); // { [tierId]: boolean }
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null); // { tierId, instanceId, tournamentData, bracketData }
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [expandedTiers, setExpandedTiers] = useState({});
  const [visibleInstancesCount, setVisibleInstancesCount] = useState({}); // { [tierId]: number } - tracks how many instances to show per tier
  const [allInstancesInitialized, setAllInstancesInitialized] = useState(false); // Track if contract initialized
  const [initializingInstances, setInitializingInstances] = useState(false); // Loading state for initialization

  // URL Parameters State for shareable tournament links
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlTournamentParams, setUrlTournamentParams] = useState(null);
  const [hasProcessedUrlParams, setHasProcessedUrlParams] = useState(false);

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [syncDots, setSyncDots] = useState(1);
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
  const [raffleSyncing, setRaffleSyncing] = useState(false);

  // Player Activity Hook
  const playerActivity = usePlayerActivity(contract, account, 'connect4');
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);

  // Player Activity Collapse Function Ref
  const collapseActivityPanelRef = useRef(null);

  // Set page title
  useEffect(() => {
    document.title = 'ETour - Connect Four';
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
        // Fetch timeout config for the viewing tournament's tier (using hardcoded TIER_CONFIG)
        try {
          const timeoutConfig = await fetchTierTimeoutConfig(contract, viewingTournament.tierId, 300, TIER_CONFIG[viewingTournament.tierId]);
          if (timeoutConfig?.matchTimePerPlayer) {
            setDisplayTimeoutConfig(timeoutConfig);
          }
        } catch (err) {
          console.warn(`Could not fetch timeout config for tier ${viewingTournament.tierId}:`, err);
        }
      } else {
        // No tournament viewing, reset to tier 0 (default) using hardcoded TIER_CONFIG
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


  // Theme colors (Connect Four - matches ConnectFour.jsx)
  const currentTheme = {
    gradient: 'linear-gradient(135deg, #0a0020 0%, #1a0050 50%, #0a0030 100%)',
    particleColors: ['#00ffff', '#8a2be2'],  // cyan + purple
    heroGlow: 'from-blue-500 via-cyan-500 to-blue-500',
    heroTitle: 'from-blue-400 via-cyan-400 to-blue-400',
    heroText: 'text-blue-200',
    buttonGradient: 'from-blue-500 to-cyan-500',
    buttonHover: 'hover:from-blue-600 hover:to-cyan-600',
    infoCard: 'from-blue-500/20 to-cyan-500/20',
    infoBorder: 'border-blue-400/30',
    infoIcon: 'text-blue-400',
    infoTitle: 'text-blue-300',
    infoText: 'text-blue-200'
  };

  // Switch to Local Network (Chain ID 412346)
  const switchToArbitrum = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x64aba' }], // 412346 in hex
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
          chainId: '0x64aba', // 412346 in hex
          chainName: 'Local Network',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: [RPC_URL],
          blockExplorerUrls: [],
              },
            ],
          });
          alert('✅ Local network added! Please connect your wallet again.');
        } catch (addError) {
          console.error('Error adding local network:', addError);
          alert('Failed to add local network. Please add it manually in MetaMask.');
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

      // Check if connected to expected network (chain ID 412346)
      if (network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
        const shouldSwitch = window.confirm(
          `⚠️ Wrong Network Detected\n\n` +
          `You're connected to: ${network.name || 'Unknown'} (Chain ID: ${network.chainId})\n` +
          `Expected: Local Network (Chain ID: ${EXPECTED_CHAIN_ID})\n\n` +
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
        CONNECTFOUR_ABI,
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


  // Load contract data (simplified - matches ConnectFour pattern)
  // Uses lazy loading: only fetch tier metadata initially, instances load on expand
  const loadContractData = async (contractInstance, isInitialLoad = false) => {
    try {
      // Fetch allInstancesInitialized status using tierCount (matches TicTacChain)
      try {
        const tierCount = await contractInstance.tierCount();
        const initialized = tierCount > 0;
        console.log('[loadContractData] tierCount:', tierCount.toString(), '- allInstancesInitialized (tierCount > 0):', initialized);
        setAllInstancesInitialized(initialized);
      } catch (err) {
        console.warn('[loadContractData] Could not fetch tierCount:', err);
        // If we can't read it, assume false (not initialized)
        setAllInstancesInitialized(false);
      }

      // Fetch tier metadata only (fast) - instances load on tier expand
      await fetchTierMetadata(contractInstance);
      await fetchLeaderboard(false);

      // Fetch match time from first tier for display in Game Info Cards (using hardcoded TIER_CONFIG)
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

      // Use read-only contract to avoid MetaMask rate limiting
      const readContract = getReadOnlyContract();

      const leaderboardData = await readContract.getLeaderboard();
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
      const readContract = getReadOnlyContract();

      const [raffleIndex, isReady, currentAccumulated, threshold, reserve, raffleAmount, ownerShare, winnerShare, eligiblePlayerCount] =
        await readContract.getRaffleInfo();

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
      // Get metadata from override or fetch fresh
      let metadata = metadataOverride;
      if (!metadata) {
        // Get tier config from hardcoded data (matches TicTacChain)
        const tierConfig = TIER_CONFIG[tierId];
        if (!tierConfig) {
          if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: false }));
          return;
        }

        const { playerCount, instanceCount, entryFee } = tierConfig;

        // Fetch tournament data for each instance individually (matches TicTacChain)
        const statuses = [];
        const enrolledCounts = [];

        for (let instanceId = 0; instanceId < instanceCount; instanceId++) {
          try {
            const tournament = await readContract.tournaments(tierId, instanceId);
            statuses.push(Number(tournament.status));
            enrolledCounts.push(Number(tournament.enrolledCount));
          } catch (error) {
            // Instance not initialized yet, stop checking further instances
            break;
          }
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
      // 1. In progress (status 1) + enrolled
      // 2. Enrolling (status 0) + enrolled
      // 3. Enrolling (status 0) + not enrolled + has players
      // 4. Enrolling (status 0) + not enrolled + empty
      // 5. In progress (status 1) + not enrolled
      // 6. Everything else (completed, etc.)
      const getSortPriority = (instance) => {
        const { tournamentStatus, isEnrolled, enrolledCount } = instance;

        if (tournamentStatus === 1 && isEnrolled) return 1;
        if (tournamentStatus === 0 && isEnrolled) return 2;
        if (tournamentStatus === 0 && !isEnrolled && enrolledCount > 0) return 3;
        if (tournamentStatus === 0 && !isEnrolled && enrolledCount === 0) return 4;
        if (tournamentStatus === 1 && !isEnrolled) return 5;
        return 6; // Completed tournaments and others
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

      const tx = await contract.executeProtocolRaffle();
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
          const parsedLog = contract.interface.parseLog({
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

  // Handle initializing all instances (owner/deployer only)
  const handleInitializeAllInstances = async () => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setInitializingInstances(true);

      console.log('Initializing all tournament instances...');
      const tx = await contract.initializeAllInstances();
      console.log('Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      console.log('All instances initialized successfully!');

      alert('All tournament instances initialized successfully!');
      setAllInstancesInitialized(true);

      // Refresh tier data
      await fetchTierMetadata(contract, false);

      setInitializingInstances(false);
    } catch (error) {
      console.error('Error initializing instances:', error);
      alert(`Error: ${error.message}`);
      setInitializingInstances(false);
    }
  };

  // Handle tournament enrollment
  const handleEnroll = async (tierId, instanceId, entryFee) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTournamentsLoading(true);

      // Use hardcoded tier config (tierConfigs removed from contract ABI)
      const tierConfig = TIER_CONFIG[tierId];
      if (!tierConfig) {
        alert(`Invalid tier ID: ${tierId}`);
        setTournamentsLoading(false);
        return;
      }
      const feeInWei = ethers.parseEther(tierConfig.entryFee);
      console.log('[handleEnroll] Using hardcoded entry fee:', tierConfig.entryFee, 'ETH');
      console.log('[handleEnroll] Passed entry fee (ignored):', entryFee, 'ETH');
      console.log('[handleEnroll] Enrolling in tier', tierId, 'instance', instanceId, 'with fee:', tierConfig.entryFee, 'ETH');

      // Call enrollInTournament function with entry fee as value
      const tx = await contract.enrollInTournament(tierId, instanceId, { value: feeInWei });
      await tx.wait();

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

      // First check if this instance exists using hardcoded config
      const tierConfig = TIER_CONFIG[tierId];
      if (!tierConfig) {
        alert(`Invalid tier ID: ${tierId}`);
        setTournamentsLoading(false);
        return;
      }
      const instanceCount = tierConfig.instanceCount;
      if (instanceId >= instanceCount) {
        alert(`Invalid instance ID. Tier ${tierId + 1} only has ${instanceCount} instances (0-${instanceCount - 1})`);
        setTournamentsLoading(false);
        return;
      }

      // Get tournament info to validate
      const tournamentInfo = await contract.tournaments(tierId, instanceId);
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
      const isEnrolled = await contract.isEnrolled(tierId, instanceId, account);

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

      const tx = await contract.forceStartTournament(tierId, instanceId);
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

      // Call contract function
      const tx = await contract.resetEnrollmentWindow(tierId, instanceId);
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

      const tx = await contract.claimAbandonedEnrollmentPool(tierId, instanceId);
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
      // Get tournament info
      const tournamentInfo = await contractInstance.getTournamentInfo(tierId, instanceId);
      const status = Number(tournamentInfo[0]);
      const currentRound = Number(tournamentInfo[2]);
      const enrolledCount = Number(tournamentInfo[3]);
      const prizePool = tournamentInfo[4];

      // Get tier config from hardcoded values (tierConfigs removed from contract ABI)
      const tierConfig = TIER_CONFIG[tierId];
      const playerCount = tierConfig.playerCount;
      const entryFee = ethers.parseEther(tierConfig.entryFee);

      // Extract timeout config using shared utility function (with hardcoded TIER_CONFIG fallback)
      const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, tierId, totalMatchTime, tierConfig);

      // Get enrolled players by iterating through enrolledPlayers mapping (matches TicTacChain)
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

        const matches = [];
        for (let matchNum = 0; matchNum < totalMatches; matchNum++) {
          try {
            const matchData = await contractInstance.getMatch(tierId, instanceId, roundNum, matchNum);
            const parsedMatch = parseConnectFourMatch(matchData);

            // Calculate time remaining client-side (contract stores time at last move)
            // Formula: current player's time = stored time - elapsed since last move
            const now = Math.floor(Date.now() / 1000);
            const elapsed = parsedMatch.lastMoveTime > 0 ? now - parsedMatch.lastMoveTime : 0;

            let player1TimeRemaining = parsedMatch.player1TimeRemaining ?? tierMatchTime;
            let player2TimeRemaining = parsedMatch.player2TimeRemaining ?? tierMatchTime;

            // Only subtract elapsed time from the current player's clock (if match is active)
            if (parsedMatch.matchStatus === 1 && parsedMatch.currentTurn && elapsed > 0) {
              const isPlayer1Turn = parsedMatch.currentTurn.toLowerCase() === parsedMatch.player1.toLowerCase();
              if (isPlayer1Turn) {
                player1TimeRemaining = Math.max(0, player1TimeRemaining - elapsed);
              } else {
                player2TimeRemaining = Math.max(0, player2TimeRemaining - elapsed);
              }
            }

            // Fetch escalation state using matchTimeouts function
            let timeoutState = null;
            try {
              const matchKey = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
                ['uint8', 'uint8', 'uint8', 'uint8'],
                [tierId, instanceId, roundNum, matchNum]
              ));
              const timeoutData = await contractInstance.matchTimeouts(matchKey);

              // Only set timeoutState if there's actual escalation data
              // (contract returns all 0s for matches without timeouts)
              const esc1Start = Number(timeoutData.escalation1Start);
              const esc2Start = Number(timeoutData.escalation2Start);
              const hasTimeoutData = esc1Start > 0 || esc2Start > 0 || timeoutData.isStalled;

              if (hasTimeoutData) {
                timeoutState = {
                  escalation1Start: esc1Start,
                  escalation2Start: esc2Start,
                  activeEscalation: Number(timeoutData.activeEscalation),
                  timeoutActive: timeoutData.isStalled,
                  forfeitAmount: 0 // Not provided by matchTimeouts
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

            matches.push({
              ...parsedMatch,
              timeoutState,
              // Override with contract's real-time values
              player1TimeRemaining,
              player2TimeRemaining,
              matchTimePerPlayer: tierMatchTime, // Pass through per-tier value for UI
              timeoutConfig, // Add tier timeout config for escalation calculations
              escL2Available, // Contract says Level 2 is available
              escL3Available  // Contract says Level 3 is available
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
        entryFee,
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
  }, [escalationInterval]);

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

  // Fetch move history from blockchain events with fallback to board state reconstruction
  const fetchMoveHistory = useCallback(async (contractInstance, tierId, instanceId, roundNumber, matchNumber) => {
    try {
      // Get match data first (needed for both approaches)
      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseConnectFourMatch(matchData);
      const player1 = parsedMatch.player1;
      const board = parsedMatch.board;

      // Try to query MoveMade events for this match
      try {
        const matchKey = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['uint8', 'uint8', 'uint8', 'uint8'],
            [tierId, instanceId, roundNumber, matchNumber]
          )
        );

        const filter = contractInstance.filters.MoveMade(matchKey);
        const events = await contractInstance.queryFilter(filter);

        if (events.length > 0) {
          // Convert events to move history
          const history = events.map(event => {
            const player = event.args.player;
            const cellIndex = Number(event.args.cellIndex);
            const isPlayer1 = player.toLowerCase() === player1.toLowerCase();
            return {
              player: isPlayer1 ? 'X' : 'O',
              cell: cellIndex,
              address: player,
              blockNumber: event.blockNumber
            };
          });

          // Sort by block number to ensure correct order
          history.sort((a, b) => a.blockNumber - b.blockNumber);
          return history;
        }
      } catch (eventError) {
        console.warn('Event query failed, falling back to board reconstruction:', eventError);
      }

      // Fallback: Reconstruct from board state (loses move order but shows current state)
      const history = [];
      const boardArray = Array.from(board);
      for (let i = 0; i < boardArray.length; i++) {
        const cell = Number(boardArray[i]);
        if (cell !== 0) {
          history.push({
            player: cell === 1 ? 'X' : 'O',
            cell: i
          });
        }
      }
      return history;
    } catch (error) {
      console.error('Error fetching move history:', error);
      return [];
    }
  }, []);

  // Refresh match data from contract
  const refreshMatchData = useCallback(async (contractInstance, userAccount, matchInfo, totalMatchTime) => {
    try {
      const { tierId, instanceId, roundNumber, matchNumber } = matchInfo;
      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseConnectFourMatch(matchData);

      // Fetch per-tier timeout config to get correct match time (with hardcoded TIER_CONFIG fallback)
      const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, tierId, totalMatchTime, TIER_CONFIG[tierId]);
      const tierMatchTime = timeoutConfig?.matchTimePerPlayer ?? totalMatchTime;

      const {
        player1, player2, currentTurn, winner, loser, board, matchStatus, isDraw,
        startTime, lastMoveTime, lastMoveTimestamp
      } = parsedMatch;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const isMatchInitialized =
        player1.toLowerCase() !== zeroAddress &&
        player2.toLowerCase() !== zeroAddress;

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

      let player1TimeRemaining = parsedMatch.player1TimeRemaining ?? tierMatchTime;
      let player2TimeRemaining = parsedMatch.player2TimeRemaining ?? tierMatchTime;

      // Only subtract elapsed time from the current player's clock (if match is active)
      if (matchStatus === 1 && currentTurn && elapsed > 0) {
        const isPlayer1Turn = currentTurn.toLowerCase() === player1.toLowerCase();
        if (isPlayer1Turn) {
          player1TimeRemaining = Math.max(0, player1TimeRemaining - elapsed);
        } else {
          player2TimeRemaining = Math.max(0, player2TimeRemaining - elapsed);
        }
      }

      // Fetch escalation state using matchTimeouts function
      let timeoutState = null;

      try {
        const matchKey = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [tierId, instanceId, roundNumber, matchNumber]
        ));
        const timeoutData = await contractInstance.matchTimeouts(matchKey);

        // Only set timeoutState if there's actual escalation data
        // (contract returns all 0s for matches without timeouts)
        const esc1Start = Number(timeoutData.escalation1Start);
        const esc2Start = Number(timeoutData.escalation2Start);
        const hasTimeoutData = esc1Start > 0 || esc2Start > 0 || timeoutData.isStalled;

        if (hasTimeoutData) {
          timeoutState = {
            escalation1Start: esc1Start,
            escalation2Start: esc2Start,
            activeEscalation: Number(timeoutData.activeEscalation),
            timeoutActive: timeoutData.isStalled,
            forfeitAmount: 0 // Not provided by matchTimeouts
          };
        }
      } catch (escalationErr) {
        // Match may not have timeout state yet - this is normal for active matches
        console.debug('No escalation state for match (normal for non-stalled matches):', escalationErr.message);
      }

      const boardState = Array.from(board).map(cell => Number(cell));
      const isPlayer1 = actualPlayer1.toLowerCase() === userAccount.toLowerCase();
      const isYourTurn = currentTurn.toLowerCase() === userAccount.toLowerCase();

      // Determine if match was completed by timeout
      // A match is timed out if it completed with an active timeout state
      const isTimedOut = matchStatus === 2 && timeoutState?.timeoutActive === true;

      return {
        ...matchInfo,
        player1: actualPlayer1,
        player2: actualPlayer2,
        currentTurn,
        winner,
        loser,
        board: boardState,
        matchStatus,
        isDraw,
        isTimedOut,
        isPlayer1,
        isYourTurn,
        userSymbol: isPlayer1 ? 'X' : 'O',
        isMatchInitialized,
        timeoutState,
        lastMoveTime,
        startTime,
        // New total match time fields
        player1TimeRemaining,
        player2TimeRemaining,
        lastMoveTimestamp,
        matchTimePerPlayer: tierMatchTime, // Pass through per-tier value for UI components
        timeoutConfig // Pass timeout config to UI components
      };
    } catch (error) {
      console.error('Error refreshing match:', error);
      return null;
    }
  }, [escalationInterval]);

  // Handle column click for making moves (Connect Four)
  const handleColumnClick = async (columnIndex) => {
    if (!currentMatch || !contract || !account) return;

    if (!currentMatch.isYourTurn) {
      alert("It's not your turn!");
      return;
    }

    // For Connect Four, check if column is full
    const grid = boardToGrid(currentMatch.board);
    if (getDropRow(grid, columnIndex) === -1) {
      alert('Column is full!');
      return;
    }

    if (currentMatch.matchStatus === 2) {
      alert('Match is already complete!');
      return;
    }

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      const tx = await contract.makeMove(tierId, instanceId, roundNumber, matchNumber, columnIndex);
      await tx.wait();

      const updated = await refreshMatchData(contract, account, currentMatch, matchTimePerPlayer);
      if (updated) {
        setCurrentMatch(updated);
        // Update board ref to prevent sync from detecting this move again
        previousBoardRef.current = [...updated.board];
        // Refresh move history from blockchain
        const history = await fetchMoveHistory(contract, currentMatch.tierId, currentMatch.instanceId, currentMatch.roundNumber, currentMatch.matchNumber);
        setMoveHistory(history);
      }
      setMatchLoading(false);
    } catch (error) {
      console.error('Error making move:', error);
      alert(`Error making move: ${error.message}`);
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

        // Show victory modal with proper winner/loser info
        setMatchEndResult('forfeit_win');
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

      const tx = await contract.forceEliminateStalledMatch(tierId, instanceId, roundNumber, matchNumber);
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

      const tx = await contract.claimMatchSlotByReplacement(tierId, instanceId, roundNumber, matchNumber);
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

      // Fetch tournament info to get playerCount and prizePool
      const tournamentInfo = await contract.getTournamentInfo(tierId, instanceId);
      const tierConfig = TIER_CONFIG[tierId];
      const playerCount = tierConfig.playerCount;
      const prizePool = tournamentInfo[4]; // prizePool is at index 4

      const matchData = await contract.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseConnectFourMatch(matchData);

      const player1 = parsedMatch.player1;
      const player2 = parsedMatch.player2;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      let actualPlayer1 = player1;
      let actualPlayer2 = player2;

      if (player1.toLowerCase() === zeroAddress) {
        // Get enrolled players by iterating through enrolledPlayers mapping (matches TicTacChain)
        const enrolledCount = Number(tournamentInfo[3]);
        const enrolledPlayers = [];
        for (let i = 0; i < Math.min(2, enrolledCount); i++) {
          try {
            const player = await contract.enrolledPlayers(tierId, instanceId, i);
            enrolledPlayers.push(player);
          } catch (err) {
            console.warn(`Could not fetch enrolled player ${i}:`, err);
            break;
          }
        }
        if (enrolledPlayers.length >= 2) {
          actualPlayer1 = enrolledPlayers[0];
          actualPlayer2 = enrolledPlayers[1];
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
  const handleMatchEndModalClose = async () => {
    const tournamentInfo = currentMatch ? {
      tierId: currentMatch.tierId,
      instanceId: currentMatch.instanceId
    } : null;

    // Check if this was the finals match
    const totalRounds = currentMatch?.playerCount ? Math.ceil(Math.log2(currentMatch.playerCount)) : 0;
    const isFinals = currentMatch?.roundNumber === totalRounds - 1;

    // Check if player lost (defeat or forfeit_lose)
    const isDefeat = matchEndResult === 'lose' || matchEndResult === 'forfeit_lose';

    // Clear the modal state
    setMatchEndResult(null);
    setMatchEndWinnerLabel('');

    // For defeat: keep match state so player can view final board position
    // For victory: clear match state and navigate
    if (!isDefeat) {
      setCurrentMatch(null);
      setMoveHistory([]);
    }

    // Refresh data
    if (contract) {
      await fetchLeaderboard(true);
      await refreshAfterAction(tournamentInfo?.tierId ?? null);

      // For defeat: don't navigate, let player view the board
      if (isDefeat) {
        // Stay on board - no navigation
      }
      // If finals, always return to instances list
      else if (isFinals) {
        setViewingTournament(null);
      }
      // If not finals and player won, show tournament bracket
      else if (tournamentInfo && (matchEndResult === 'win' || matchEndResult === 'forfeit_win')) {
        const bracketData = await refreshTournamentBracket(contract, tournamentInfo.tierId, tournamentInfo.instanceId, matchTimePerPlayer);
        if (bracketData) {
          setViewingTournament(bracketData);
        }
      } else {
        setViewingTournament(null);
      }
    }
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
          CONNECTFOUR_ABI,
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
    const pollInterval = setInterval(fetchRaffleInfo, 10000);
    return () => clearInterval(pollInterval);
  }, [account, fetchRaffleInfo]);

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

  useEffect(() => {
    if (!currentMatch || !contract || !account) return;

    const doMatchSync = async () => {
      const match = currentMatchRef.current;
      const contractInstance = contractRefForMatch.current;
      const userAccount = accountRefForMatch.current;

      if (!match || !contractInstance || !userAccount) return;

      try {
        const updatedMatch = await refreshMatchData(
          contractInstance,
          userAccount,
          match,
          matchTimePerPlayer
        );
        if (updatedMatch) {
          // Use standardized match completion handler
          const matchResult = determineMatchResult({
            updatedMatch,
            previousMatch: match,
            userAccount,
            gameType: 'connectfour'
          });

          if (matchResult) {
            // Match just completed - set result state for modal
            setMatchEndResult(matchResult.type);
            setMatchEndWinnerLabel(matchResult.winnerLabel);
            setMatchEndWinner(matchResult.winnerAddress);
            setMatchEndLoser(matchResult.loserAddress);

            // Update match to show final state, modal will handle the rest
            setCurrentMatch(updatedMatch);
            return;
          }

          // Detect new moves by comparing board states
          const prevBoard = previousBoardRef.current;
          let moveDetected = false;
          if (prevBoard && updatedMatch.board) {
            for (let i = 0; i < updatedMatch.board.length; i++) {
              if (prevBoard[i] === 0 && updatedMatch.board[i] !== 0) {
                moveDetected = true;
                break;
              }
            }
          }

          // If a new move was detected, refresh history from blockchain
          if (moveDetected) {
            const history = await fetchMoveHistory(contractInstance, match.tierId, match.instanceId, match.roundNumber, match.matchNumber);
            setMoveHistory(history);
          }

          // Update board ref for next comparison
          previousBoardRef.current = [...updatedMatch.board];

          // Normal match update (game still in progress)
          setCurrentMatch(updatedMatch);
        }
      } catch (error) {
        console.error('Error syncing match:', error);
      }

      // Reset sync dots to 1 after sync completes
      setSyncDots(1);
    };

    // Set up polling interval - runs every 2 seconds for responsive timers
    const matchPollInterval = setInterval(doMatchSync, 2000);

    return () => clearInterval(matchPollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, fetchMoveHistory]);

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
      {/* Particle Background */}
      <ParticleBackground colors={currentTheme.particleColors} symbols={CONNECTFOUR_SYMBOLS} fontSize="24px" count={38} />

      {/* Tournament Invitation Banner - shown when URL params present but not connected */}
      {urlTournamentParams && !account && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl mx-4 w-full">
          <div className="bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-lg rounded-xl p-4 border border-purple-400/50 shadow-2xl">
            <div className="flex items-start gap-3">
              <Trophy className="text-yellow-400 shrink-0 mt-1" size={24} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold mb-1">
                  Tournament Invitation
                </p>
                <p className="text-purple-100 text-sm mb-3">
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

      {/* Player Activity Component - Available in all views */}
      {account && (
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
          gameName="connect4"
          gameEmoji="🔴"
          onHeightChange={setPlayerActivityHeight}
          onCollapse={(collapseFn) => { collapseActivityPanelRef.current = collapseFn; }}
        />
      )}

      {/* Community Raffle Card - Below Player Activity Toggle */}
      {account && (
        <CommunityRaffleCard
          raffleInfo={raffleInfo}
          playerActivityHeight={playerActivityHeight}
          onRefresh={fetchRaffleInfo}
          onTriggerRaffle={executeRaffle}
          syncing={raffleSyncing}
        />
      )}

      {/* Trust Banner */}
      <div style={{
        background: 'rgba(0, 100, 200, 0.2)',
        borderBottom: `1px solid ${currentTheme.border}`,
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 text-xs md:text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-6 justify-center md:justify-start">
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
              <div className="flex items-center gap-2">
                <CheckCircle className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">Zero Trackers</span>
              </div>
            </div>
            {EXPLORER_URL && (
              <a
                href={EXPLORER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors justify-center md:justify-end"
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
              <div className="relative">
                <AnimatedDisc />
              </div>
            </div>
          </div>

          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            ETour Connect Four
          </h1>
          <p className={`text-2xl ${currentTheme.heroText} mb-6`}>
            Drop • Connect • Win
          </p>
          <p className={`text-lg ${currentTheme.heroText} max-w-3xl mx-auto mb-8`}>
            Drop your discs, connect four in a row, win real ETH.
            <br/>
            Every move is verified on-chain. No cheating possible.
          </p>

          {/* Game Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-300">5 minutes per match</span>
              </div>
              <p className="text-sm text-yellow-200">
                Each player gets 5 minutes total for all their moves in the match.
              </p>
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
              <p className="text-sm text-green-200">
                Winners paid automatically on-chain. No delays, no middlemen.
              </p>
            </div>
            <div className="relative bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-purple-400" size={20} />
                <span className="font-bold text-purple-300">Impossible to grief</span>
              </div>
              <a
                href="#user-manual"
                className="absolute top-3 right-3 text-purple-400 hover:text-purple-300 transition-colors"
                title="Learn more about anti-griefing"
              >
                <HelpCircle size={16} />
              </a>
              <p className="text-sm text-purple-200">
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
            <div className="inline-flex items-center gap-4 bg-green-500/20 border border-green-400/50 px-8 py-4 rounded-2xl">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-mono text-lg">{shortenAddress(account)}</span>
            </div>
          )}

          {/* Why Arbitrum Info */}
          <WhyArbitrum variant="blue" />
        </div>

        {/* Match View - Shows when player enters a match */}
        {account && contract && currentMatch && (
          <div ref={matchViewRef}>
            <GameMatchLayout
            gameType="connectfour"
            match={currentMatch}
            account={account}
            loading={matchLoading}
            syncDots={syncDots}
            onClose={closeMatch}
            onClaimTimeoutWin={handleClaimTimeoutWin}
            onForceEliminate={handleForceEliminateStalledMatch}
            onClaimReplacement={handleClaimMatchSlotByReplacement}
            tournamentRounds={viewingTournament?.rounds || null}
            currentRoundNumber={currentMatch.roundNumber}
            playerConfig={{
              player1: { icon: '🔴', label: 'Red' },
              player2: { icon: '🔵', label: 'Blue' }
            }}
            layout="three-column"
            renderPlayer1Stats={() => (
              <>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-blue-300 text-sm mb-1">Symbol</div>
                  <div className="text-white font-bold text-2xl">X</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-blue-300 text-sm mb-1">Moves Made</div>
                  <div className="text-white font-bold text-xl">
                    {currentMatch.board.filter(c => c === 1).length}
                  </div>
                </div>
              </>
            )}
            renderPlayer2Stats={() => (
              <>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-pink-300 text-sm mb-1">Symbol</div>
                  <div className="text-white font-bold text-2xl">O</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-pink-300 text-sm mb-1">Moves Made</div>
                  <div className="text-white font-bold text-xl">
                    {currentMatch.board.filter(c => c === 2).length}
                  </div>
                </div>
              </>
            )}
            renderMoveHistory={moveHistory.length > 0 ? () => (
              <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                  <History size={20} />
                  Move History
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {moveHistory.map((move, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm bg-purple-500/10 p-2 rounded">
                      <span className="text-purple-300">Move {idx + 1}:</span>
                      <span className="text-white font-bold">{move.player}</span>
                      <span className="text-purple-400">→ Cell {move.cell}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : undefined}
          >
            {/* Connect Four Board */}
            <ConnectFourBoard
              board={currentMatch.board}
              onColumnClick={handleColumnClick}
              currentTurn={currentMatch.currentTurn}
              account={account}
              player1={currentMatch.player1}
              player2={currentMatch.player2}
              matchStatus={currentMatch.matchStatus}
              loading={matchLoading}
              winner={currentMatch.winner}
              lastColumn={currentMatch.lastColumn}
            />
          </GameMatchLayout>
          </div>
        )}

        {/* Tournaments Section */}
        {contract && !currentMatch && (
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
                  isEnrolled={viewingTournament?.enrolledPlayers?.some(addr => addr.toLowerCase() === account?.toLowerCase())}
                  entryFee={viewingTournament?.entryFee ? ethers.formatEther(viewingTournament.entryFee) : '0'}
                  isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount}
                  contract={contract}
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
                  <p className="text-xl text-blue-200">
                    Compete in on-chain with real ETH stakes
                  </p>
                </div>

                {/* Loading State */}
                {metadataLoading && (
                  <div className="text-center py-12">
                    <div className="inline-block">
                      <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-purple-300">Loading tournaments...</p>
                    </div>
                  </div>
                )}

                {/* Tournament Cards Grid - Grouped by Tier (Lazy Loading) */}
                {!metadataLoading && Object.keys(tierMetadata).length > 0 && (
                  <>
                    {[0, 6, 1, 2, 3, 4, 5].map((tierId) => {
                      const metadata = tierMetadata[tierId];
                      if (!metadata) return null;

                      const allInstances = tierInstances[tierId] || [];
                      const visibleCount = visibleInstancesCount[tierId] || 4;
                      const instances = allInstances.slice(0, visibleCount);
                      const hasMore = allInstances.length > visibleCount;
                      const isLoading = tierLoading[tierId];

                      // Calculate prize pool per tournament
                      const totalPrizePool = (parseFloat(metadata.entryFee) * metadata.playerCount * 0.9).toFixed(4);

                      // Calculate currently active players from tierInstances (enrolling + in progress)
                      const activePlayersCount = allInstances.reduce((sum, instance) => {
                        if (instance.status === 0 || instance.status === 1) {
                          return sum + instance.enrolledCount;
                        }
                        return sum;
                      }, 0);

                      return (
                        <div key={tierId} className="mb-6">
                          <button
                            onClick={() => toggleTier(tierId)}
                            className="w-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-4 border border-purple-400/40 hover:border-purple-400/60 transition-all cursor-pointer"
                          >
                            <h3 className="text-2xl font-bold text-purple-400 flex items-center gap-2 flex-wrap">
                              <AnimatedDisc delay={tierId * 500} size="small" /> {getTierName(metadata.playerCount)}s
                              <span className="text-sm font-normal text-purple-300">• {metadata.playerCount} players total</span>
                              <span className="text-sm font-normal text-purple-300">• {metadata.entryFee} ETH entry</span>
                              <span className="text-sm font-normal text-purple-300">• {totalPrizePool} ETH prize pool</span>
                              <span className="ml-auto flex items-center gap-2">
                                {allInstances.length > 0 && <span className="text-sm font-normal text-purple-300">{activePlayersCount} active enrollments</span>}
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
                                      prizePool={tournament.prizePool}
                                      isEnrolled={tournament.isEnrolled}
                                      onEnroll={() => handleEnroll(tournament.tierId, tournament.instanceId, tournament.entryFee)}
                                      onEnter={() => handleEnterTournament(tournament.tierId, tournament.instanceId)}
                                      loading={tournamentsLoading}
                                      tierName={getTierName(tournament.maxPlayers)}
                                      enrollmentTimeout={tournament.enrollmentTimeout}
                                      hasStartedViaTimeout={tournament.hasStartedViaTimeout}
                                      tournamentStatus={tournament.tournamentStatus}
                                      onManualStart={handleManualStart}
                                      onClaimAbandonedPool={handleClaimAbandonedPool}
                                      onResetEnrollmentWindow={handleResetEnrollmentWindow}
                                      account={account}
                                      contract={contract}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Show More Button */}
                              {!isLoading && hasMore && (
                                <div className="mt-6 text-center">
                                  <button
                                    onClick={() => showMoreInstances(tierId)}
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
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
                  </>
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

                {/* Empty State - show when contract not initialized */}
                {!metadataLoading && !connectionError && !allInstancesInitialized && (
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-12 border border-purple-400/30 text-center">
                    <Trophy className="text-purple-400/50 mx-auto mb-4" size={64} />
                    <h3 className="text-2xl font-bold text-purple-300 mb-2">No Tournaments Available</h3>
                    <p className="text-purple-200/70 mb-6">Check back soon for new tournaments!</p>

                    {/* Initialize button for owner */}
                    {account && !allInstancesInitialized && (
                      <button
                        onClick={handleInitializeAllInstances}
                        disabled={initializingInstances}
                        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                      >
                        {initializingInstances ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Initializing Tournaments...
                          </span>
                        ) : (
                          'Initialize Tournaments'
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* User Info Footer - Only show when wallet is connected */}
                {account && (
                  <>
                    <div className="mt-8 flex justify-center gap-4 flex-wrap">
                      <div className="bg-purple-500/20 border border-purple-400/50 rounded-xl p-4">
                        <div className="text-purple-300 text-sm mb-1">Your Address</div>
                        <div className="font-mono text-purple-100 font-bold">{account.slice(0, 6)}...{account.slice(-4)}</div>
                      </div>
                      <div className="bg-blue-500/20 border border-blue-400/50 rounded-xl p-4">
                        <div className="text-blue-300 text-sm mb-1">Network</div>
                        <div className="font-bold text-blue-100">{networkInfo?.name || 'Connected'}</div>
                      </div>
                      <div className="bg-green-500/20 border border-green-400/50 rounded-xl p-4">
                        <div className="text-green-300 text-sm mb-1">Main Contract</div>
                        <div className="font-mono text-green-100 font-bold">{shortenAddress(CONTRACT_ADDRESS)}</div>
                      </div>
                    </div>

                    {/* Module Addresses Display */}
                    <div className="mt-4 bg-slate-800/50 border border-slate-600/50 rounded-xl p-4 max-w-3xl mx-auto">
                      <h3 className="font-bold text-purple-300 mb-3 text-center">Modular Contracts</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-slate-400">Core</div>
                          <div className="font-mono text-slate-200">{shortenAddress(MODULE_ADDRESSES.core)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Matches</div>
                          <div className="font-mono text-slate-200">{shortenAddress(MODULE_ADDRESSES.matches)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Prizes</div>
                          <div className="font-mono text-slate-200">{shortenAddress(MODULE_ADDRESSES.prizes)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Escalation</div>
                          <div className="font-mono text-slate-200">{shortenAddress(MODULE_ADDRESSES.escalation)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Raffle</div>
                          <div className="font-mono text-slate-200">{shortenAddress(MODULE_ADDRESSES.raffle)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">GameCache</div>
                          <div className="font-mono text-slate-200">{shortenAddress(MODULE_ADDRESSES.gameCache)}</div>
                        </div>
                      </div>
                    </div>
                  </>
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
          raffleThresholds={['0.4', '0.75', '1']}
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
              <a
                href="https://github.com/aspect-building/etour"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-white transition-colors text-sm"
              >
                GitHub
              </a>
              {getExplorerHomeUrl() && (
                <a
                  href={getExplorerHomeUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-white transition-colors text-sm"
                >
                  Contracts
                </a>
              )}
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
        result={matchEndResult}
        onClose={handleMatchEndModalClose}
        winnerLabel={matchEndWinnerLabel}
        winnerAddress={matchEndWinner}
        loserAddress={matchEndLoser}
        currentAccount={account}
        gameType="connectfour"
        isVisible={!!matchEndResult}
        roundNumber={currentMatch?.roundNumber}
        totalRounds={currentMatch?.playerCount ? Math.ceil(Math.log2(currentMatch.playerCount)) : undefined}
        prizePool={currentMatch?.prizePool}
      />
    </div>
  );
}
