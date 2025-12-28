/**
 * Connect Four On-Chain - Blockchain-Based Connect Four
 *
 * Drop discs, connect four in a row to win. Real ETH stakes.
 * Uses the same design language as the Chess and TicTacToe frontends
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, ChevronDown, ArrowLeft, AlertCircle, CheckCircle, History
} from 'lucide-react';
import { ethers } from 'ethers';
import C4_ABI from './CFOCABI.json';
import { CURRENT_NETWORK, CONTRACT_ADDRESSES, getAddressUrl, getExplorerHomeUrl } from './config/networks';
import { shortenAddress, getTierName, getEstimatedDuration, countInstancesByStatus } from './utils/formatters';
import ParticleBackground from './components/shared/ParticleBackground';
import MatchCard from './components/shared/MatchCard';
import TournamentCard from './components/shared/TournamentCard';
import WinnersLeaderboard from './components/shared/WinnersLeaderboard';
import MatchEndModal from './components/shared/MatchEndModal';
import WhyArbitrum from './components/shared/WhyArbitrum';
import GameMatchLayout from './components/shared/GameMatchLayout';
import TournamentHeader from './components/shared/TournamentHeader';

// Connect Four disc particles for background
const C4_PARTICLES = ['🔴', '🔵'];

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
// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement, account, loading, syncDots }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers } = tournamentData;

  const totalRounds = Math.ceil(Math.log2(playerCount));

  // ConnectFour-specific options for match status display (purple for double forfeit)
  const matchStatusOptions = { doubleForfeitColor: 'text-purple-400' };

  // Colors for bracket section
  const colors = { headerBorder: 'border-purple-400/30', text: 'text-purple-300', icon: 'text-purple-400' };

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
        loading={loading}
      />

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
                      onForceEliminate={onForceEliminate}
                      onClaimReplacement={onClaimReplacement}
                      playerIcons={{ player1: '🔴', player2: '🔵' }}
                      matchStatusOptions={matchStatusOptions}
                      showEscalation={true}
                      showThisIsYou={false}
                      colors={{
                        player1CurrentUser: 'bg-cyan-500/20 border border-cyan-400/50',
                        player2CurrentUser: 'bg-blue-500/20 border border-blue-400/50',
                        player2Default: 'bg-blue-500/10',
                      }}
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

// Main Connect Four Component
export default function ConnectFour() {
  // Use network config instead of hardcoded values
  const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.ConnectFourOnChain;
  const EXPECTED_CHAIN_ID = CURRENT_NETWORK.chainId;
  const RPC_URL = import.meta.env.VITE_RPC_URL || CURRENT_NETWORK.rpcUrl;
  const EXPLORER_URL = getAddressUrl(CONTRACT_ADDRESS);

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Tournament State - Lazy Loading
  const [tierMetadata, setTierMetadata] = useState({}); // Quick metadata for all tiers
  const [tierInstances, setTierInstances] = useState({}); // Detailed instances per tier (lazy loaded)
  const [tierLoading, setTierLoading] = useState({}); // Loading state per tier
  const [metadataLoading, setMetadataLoading] = useState(true); // Initial metadata loading
  const [viewingTournament, setViewingTournament] = useState(null);
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [expandedTiers, setExpandedTiers] = useState({});

  // Refs to avoid infinite loops in useCallback dependencies
  const expandedTiersRef = useRef(expandedTiers);
  const tierInstancesRef = useRef(tierInstances);

  // Sync refs with state
  useEffect(() => { expandedTiersRef.current = expandedTiers; }, [expandedTiers]);
  useEffect(() => { tierInstancesRef.current = tierInstances; }, [tierInstances]);

  // Set page title
  useEffect(() => {
    document.title = 'ETour - Connect Four';
  }, []);

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [syncDots, setSyncDots] = useState(1);
  const [matchEndResult, setMatchEndResult] = useState(null); // 'win' | 'lose' | 'draw' | 'forfeit_win' | 'forfeit_lose' | 'double_forfeit'
  const [matchEndWinnerLabel, setMatchEndWinnerLabel] = useState('');
  const [moveHistory, setMoveHistory] = useState([]);
  const previousBoardRef = useRef(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Connection Error State
  const [connectionError, setConnectionError] = useState(null); // null = no error, string = error message
  const [leaderboardError, setLeaderboardError] = useState(false);

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
              rpcUrls: [RPC_URL],
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
      await refreshAfterAction(contractInstance, accounts[0]);
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect: ' + error.message);
      setLoading(false);
    }
  };

  // Fetch tier metadata (fast - for initial load)
  const fetchTierMetadata = useCallback(async (contractInstance) => {
    if (!contractInstance) {
      setConnectionError('Unable to connect to blockchain. Please check your network connection.');
      setMetadataLoading(false);
      return;
    }

    setMetadataLoading(true);
    setConnectionError(null); // Clear any previous error
    const metadata = {};
    let successfulFetches = 0;
    let totalAttempts = 0;

    for (let tierId = 0; tierId <= 3; tierId++) {
      totalAttempts++;
      try {
        const tierOverview = await contractInstance.getTierOverview(tierId);
        const statuses = tierOverview[0];
        const enrolledCounts = tierOverview[1];

        const tierConfig = await contractInstance.tierConfigs(tierId);
        const maxPlayers = Number(tierConfig.playerCount);

        const fee = await contractInstance.ENTRY_FEES(tierId);
        const entryFeeFormatted = ethers.formatEther(fee);

        successfulFetches++;
        metadata[tierId] = {
          tierId,
          instanceCount: statuses.length,
          maxPlayers,
          entryFee: entryFeeFormatted,
          statuses: statuses.map(s => Number(s)),
          enrolledCounts: enrolledCounts.map(c => Number(c)),
        };
      } catch (error) {
        console.log(`Could not fetch tier ${tierId} metadata:`, error.message);
      }
    }

    // If no fetches succeeded, we have a connection problem
    if (successfulFetches === 0 && totalAttempts > 0) {
      setConnectionError('Unable to load tournament data. Please check your connection and try again.');
    }

    setTierMetadata(metadata);
    setMetadataLoading(false);
  }, []);

  // Fetch detailed instances for a specific tier (lazy - on expand)
  const fetchTierInstances = useCallback(async (contractInstance, tierId, userAccount) => {
    if (!contractInstance) return;

    setTierLoading(prev => ({ ...prev, [tierId]: true }));

    const instances = [];
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

        instances.push({
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
      console.log(`Could not fetch tier ${tierId} instances:`, error.message);
    }

    setTierInstances(prev => ({ ...prev, [tierId]: instances }));
    setTierLoading(prev => ({ ...prev, [tierId]: false }));
  }, []);

  // Toggle tier expansion (with lazy loading)
  const toggleTier = useCallback((tierId, contractInstance, userAccount) => {
    setExpandedTiers(prev => {
      const newExpanded = { ...prev, [tierId]: !prev[tierId] };

      // If expanding and no instances loaded yet, fetch them
      if (newExpanded[tierId] && !tierInstancesRef.current[tierId]) {
        fetchTierInstances(contractInstance, tierId, userAccount);
      }

      return newExpanded;
    });
  }, [fetchTierInstances]);

  // Refresh data after user actions (enroll, etc.)
  const refreshAfterAction = useCallback(async (contractInstance, userAccount) => {
    // Refresh metadata
    await fetchTierMetadata(contractInstance);

    // Refresh instances for all expanded tiers
    const currentExpanded = expandedTiersRef.current;
    for (const tierId of Object.keys(currentExpanded)) {
      if (currentExpanded[tierId]) {
        await fetchTierInstances(contractInstance, Number(tierId), userAccount);
      }
    }
  }, [fetchTierMetadata, fetchTierInstances]);

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

              // Fetch timeout state for this match
              let timeoutState = null;
              try {
                const matchKey = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
                  ['uint8', 'uint8', 'uint8', 'uint8'],
                  [tierId, instanceId, roundNum, matchNum]
                ));
                const matchesData = await contractInstance.matches(matchKey);
                timeoutState = {
                  escalation1Start: Number(matchesData.timeoutState.escalation1Start),
                  escalation2Start: Number(matchesData.timeoutState.escalation2Start),
                  escalation3Start: Number(matchesData.timeoutState.escalation3Start),
                  activeEscalation: Number(matchesData.timeoutState.activeEscalation),
                  timeoutActive: matchesData.timeoutState.timeoutActive,
                  forfeitAmount: matchesData.timeoutState.forfeitAmount
                };
              } catch (err) {
                // Timeout state not available
              }

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
                lastColumn: Number(matchData[11]),
                timeoutState
              });
            } catch (err) {
              matches.push({ player1: ethers.ZeroAddress, player2: ethers.ZeroAddress, matchStatus: 0, timeoutState: null });
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
      const { tierId, instanceId, roundNumber, matchNumber } = match;
      const matchData = await contractInstance.getMatch(
        tierId, instanceId, roundNumber, matchNumber
      );

      const isPlayer1 = matchData[0].toLowerCase() === userAccount.toLowerCase();

      // Fetch timeout state from matches mapping
      const matchKey = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8', 'uint8', 'uint8', 'uint8'],
        [tierId, instanceId, roundNumber, matchNumber]
      ));
      const matchesData = await contractInstance.matches(matchKey);

      const timeoutState = {
        escalation1Start: Number(matchesData.timeoutState.escalation1Start),
        escalation2Start: Number(matchesData.timeoutState.escalation2Start),
        escalation3Start: Number(matchesData.timeoutState.escalation3Start),
        activeEscalation: Number(matchesData.timeoutState.activeEscalation),
        timeoutActive: matchesData.timeoutState.timeoutActive,
        forfeitAmount: matchesData.timeoutState.forfeitAmount
      };

      const isTimedOut = matchesData.isTimedOut;
      const timeoutClaimant = matchesData.timeoutClaimant;
      const timeoutClaimReward = matchesData.timeoutClaimReward;

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
        isYourTurn: matchData[2].toLowerCase() === userAccount.toLowerCase(),
        timeoutState,
        isTimedOut,
        timeoutClaimant,
        timeoutClaimReward
      };
    } catch (error) {
      console.error('Error refreshing match:', error);
      return null;
    }
  }, []);

  // Fetch move history from blockchain events with fallback to board state reconstruction
  const fetchMoveHistory = useCallback(async (contractInstance, tierId, instanceId, roundNumber, matchNumber) => {
    try {
      // Get match data first (needed for both approaches)
      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const player1 = matchData[0];
      const board = matchData[4];

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
            const column = Number(event.args.column);
            const row = Number(event.args.row);
            const isPlayer1 = player.toLowerCase() === player1.toLowerCase();
            return {
              player: isPlayer1 ? '🔴' : '🔵',
              column,
              row,
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

      // Fallback: Reconstruct from board state (less accurate - no order info)
      // Connect Four board: row-major, index = row * 7 + col
      // We scan column by column, bottom-up, to infer move order per column
      const boardArray = Array.from(board);
      const history = [];

      // For each column, find filled cells from bottom to top
      for (let col = 0; col < 7; col++) {
        for (let row = 5; row >= 0; row--) {
          const idx = row * 7 + col;
          const cell = Number(boardArray[idx]);
          if (cell !== 0) {
            history.push({
              player: cell === 1 ? '🔴' : '🔵',
              column: col,
              row
            });
          }
        }
      }

      return history;
    } catch (error) {
      console.error('Error fetching move history:', error);
      return [];
    }
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (contractInstance, silent = false) => {
    if (!contractInstance) return;

    try {
      if (!silent) {
        setLeaderboardLoading(true);
        setLeaderboardError(false);
      }

      const leaderboardData = await contractInstance.getLeaderboard();
      // Sort by earnings descending (highest to lowest)
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
      await refreshAfterAction(contract, account);
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
      setLoading(true);
      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId);
      if (bracketData) setViewingTournament(bracketData);
      setLoading(false);
    } catch (error) {
      console.error('Error entering tournament:', error);
      setLoading(false);
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
      const board = Array.from(matchData[4]);

      setCurrentMatch({
        tierId,
        instanceId,
        roundNumber,
        matchNumber,
        player1: matchData[0],
        player2: matchData[1],
        currentTurn: matchData[2],
        winner: matchData[3],
        board,
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

      // Initialize board ref for move detection
      previousBoardRef.current = [...board];

      // Fetch move history from blockchain events
      const history = await fetchMoveHistory(contract, tierId, instanceId, roundNumber, matchNumber);
      setMoveHistory(history);

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
      await refreshAfterAction(contract, account);
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

      // Refresh tournaments
      await refreshAfterAction(contract, account);
    } catch (error) {
      console.error('Claim abandoned pool error:', error);
      alert('Claim failed: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Close match
  const closeMatch = () => {
    setCurrentMatch(null);
    setMoveHistory([]);
    previousBoardRef.current = null;
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

    // Refresh data
    if (contract) {
      await refreshAfterAction(contract, account);
      await fetchLeaderboard(contract, true);

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

  // Handle Escalation 1: Opponent claims timeout win
  const handleClaimTimeoutWin = async () => {
    if (!currentMatch || !contract) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      const tx = await contract.claimTimeoutWin(tierId, instanceId, roundNumber, matchNumber);
      await tx.wait();

      // Show victory modal
      setMatchEndResult('forfeit_win');
      setMatchEndWinnerLabel('You');
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
      await fetchLeaderboard(contract, true);

      // Refresh tournament data
      await refreshAfterAction(contract, account);

      // Refresh and show tournament bracket
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

      // Exit match view and go back to tournaments list
      setCurrentMatch(null);
      setViewingTournament(null);

      // Refresh cached stats
      await fetchLeaderboard(contract, true);

      // Refresh tournament data
      await refreshAfterAction(contract, account);

      setMatchLoading(false);
    } catch (error) {
      console.error('Error claiming match slot:', error);
      alert(`Error claiming match slot: ${error.message}`);
      setMatchLoading(false);
    }
  };

  // Initialize read-only contract (only if no wallet connected)
  useEffect(() => {
    // Skip if wallet is already connected (we have a signer contract)
    if (account) return;

    const initReadOnlyContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, C4_ABI, provider);

        setContract(readOnlyContract);
        await fetchTierMetadata(readOnlyContract);
        await fetchLeaderboard(readOnlyContract, false);
        setInitialLoading(false);
      } catch (error) {
        console.error('Error initializing contract:', error);
        setInitialLoading(false);
      }
    };

    initReadOnlyContract();
  }, [fetchTierMetadata, fetchLeaderboard, account]);

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
      if (updated) {
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        const matchWasCompleted = updated.matchStatus === 2 && currentMatch.matchStatus !== 2;
        const wasParticipant =
          updated.player1?.toLowerCase() === account.toLowerCase() ||
          updated.player2?.toLowerCase() === account.toLowerCase();

        // Detect match completion and show modal
        if (matchWasCompleted && wasParticipant) {
          const userWon = updated.winner?.toLowerCase() === account.toLowerCase();
          const isDoubleForfeited = updated.winner?.toLowerCase() === zeroAddress && !updated.isDraw;
          const winnerIsPlayer1 = updated.winner?.toLowerCase() === updated.player1?.toLowerCase();

          if (updated.isDraw) {
            setMatchEndResult('draw');
            setMatchEndWinnerLabel('');
          } else if (isDoubleForfeited) {
            setMatchEndResult('double_forfeit');
            setMatchEndWinnerLabel('');
          } else if (updated.isTimedOut) {
            setMatchEndResult(userWon ? 'forfeit_win' : 'forfeit_lose');
            setMatchEndWinnerLabel(winnerIsPlayer1 ? 'Red' : 'Blue');
          } else {
            setMatchEndResult(userWon ? 'win' : 'lose');
            setMatchEndWinnerLabel(winnerIsPlayer1 ? 'Red' : 'Blue');
          }

          setCurrentMatch(updated);
          setSyncDots(1);
          return;
        }

        // Detect new moves by comparing board states
        const prevBoard = previousBoardRef.current;
        let moveDetected = false;
        if (prevBoard && updated.board) {
          for (let i = 0; i < updated.board.length; i++) {
            if (prevBoard[i] === 0 && updated.board[i] !== 0) {
              moveDetected = true;
              break;
            }
          }
        }

        // If a new move was detected, refresh history from blockchain
        if (moveDetected) {
          const history = await fetchMoveHistory(contract, currentMatch.tierId, currentMatch.instanceId, currentMatch.roundNumber, currentMatch.matchNumber);
          setMoveHistory(history);
        }

        // Update board ref for next comparison
        previousBoardRef.current = [...updated.board];

        setCurrentMatch(updated);
      }
      setSyncDots(1);
    };

    const pollInterval = setInterval(doSync, 3000);
    return () => clearInterval(pollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, contract, account, refreshMatchData, fetchMoveHistory]);

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
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.gradient, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <ParticleBackground colors={currentTheme.particleColors} symbols={C4_PARTICLES} fontSize="24px" />

        <div className="max-w-4xl mx-auto px-6 py-8" style={{ position: 'relative', zIndex: 10 }}>
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
            playerConfig={{
              player1: { icon: '🔴', label: 'Red' },
              player2: { icon: '🔵', label: 'Blue' }
            }}
            layout="centered"
            renderMoveHistory={moveHistory.length > 0 ? () => (
              <div className="bg-slate-900/50 rounded-xl p-6 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                  <History size={20} />
                  Move History
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {moveHistory.map((move, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        move.player === '🔴'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      <span className="mr-1">{idx + 1}.</span>
                      {move.player} → {String.fromCharCode(65 + move.column)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          >
            {/* Connect Four Board */}
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
          </GameMatchLayout>
        </div>
      </div>
    );
  }

  // Tournament bracket view
  if (viewingTournament) {
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.gradient, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <ParticleBackground colors={currentTheme.particleColors} symbols={C4_PARTICLES} fontSize="24px" />

        <div className="max-w-7xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
          <TournamentBracket
            tournamentData={viewingTournament}
            onBack={() => setViewingTournament(null)}
            onEnterMatch={handlePlayMatch}
            onForceEliminate={handleForceEliminateStalledMatch}
            onClaimReplacement={handleClaimMatchSlotByReplacement}
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
      <ParticleBackground colors={currentTheme.particleColors} symbols={C4_PARTICLES} fontSize="24px" />

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
                <span className="font-mono">{shortenAddress(CONTRACT_ADDRESS)}</span>
                <ExternalLink size={14} />
              </a>
            )}
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

          {/* Game Info */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-300">5 minutes per match</span>
              </div>
              <p className="text-sm text-yellow-200">
                Each player gets five minutes total for all their moves in the match.
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
            <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-purple-400" size={20} />
                <span className="font-bold text-purple-300">Impossible to Grief</span>
              </div>
              <p className="text-sm text-purple-200">
                Anti-stalling mechanisms ensure every match completes. No admin required.
              </p>
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

          {/* Why Arbitrum Info */}
          <WhyArbitrum variant="purple" />
        </div>

        {/* Tournament Cards - Lazy Loading */}
        <div className="mb-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <Trophy className="text-blue-400" size={48} />
              <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Live Instances
              </h2>
            </div>
            <p className="text-xl text-blue-200">
              Compete in on-chain with real ETH stakes
            </p>
          </div>

          {metadataLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-cyan-300">Loading tournaments...</p>
            </div>
          ) : connectionError ? (
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-lg rounded-2xl p-12 border border-red-400/30 text-center">
              <AlertCircle className="text-red-400 mx-auto mb-4" size={64} />
              <h3 className="text-2xl font-bold text-red-300 mb-2">Connection Error</h3>
              <p className="text-red-200/70 mb-4">{connectionError}</p>
              <button
                onClick={() => {
                  setMetadataLoading(true);
                  setConnectionError(null);
                  fetchTierMetadata(contract);
                  fetchLeaderboard(contract);
                }}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-2 px-6 rounded-xl transition-all"
              >
                Retry Connection
              </button>
            </div>
          ) : Object.keys(tierMetadata).length === 0 ? (
            <div className="text-center py-12 text-purple-300">
              <p>No tournaments available yet.</p>
            </div>
          ) : (
            <>
              {[0, 1, 2, 3].map((tierId) => {
                const metadata = tierMetadata[tierId];
                if (!metadata) return null;

                const instances = tierInstances[tierId] || [];
                const isLoading = tierLoading[tierId];
                const statusCounts = countInstancesByStatus(metadata.statuses, metadata.enrolledCounts);

                return (
                  <div key={tierId} className="mb-6">
                    <button
                      onClick={() => toggleTier(tierId, contract, account)}
                      className="w-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-4 border border-purple-400/40 hover:border-purple-400/60 transition-all cursor-pointer"
                    >
                      <h3 className="text-2xl font-bold text-purple-400 flex items-center gap-2 flex-wrap">
                        <AnimatedDisc delay={tierId * 500} size="small" /> {getTierName(metadata.maxPlayers)}s
                        <span className="text-sm font-normal text-purple-300">• {metadata.maxPlayers} players total</span>
                        <span className="text-sm font-normal text-purple-300">• {metadata.entryFee} ETH entry</span>
                        <span className="text-sm font-normal text-purple-300">• <span className="text-cyan-400 font-bold">{metadata.instanceCount} lobbies</span> • <span className="font-bold text-yellow-400">{statusCounts.enrolling} enrolling</span> • <span className="font-bold text-green-400">{statusCounts.inProgress} in progress</span></span>
                        <span className="text-sm font-normal text-purple-300">• {getEstimatedDuration('connectfour', metadata.maxPlayers)}</span>
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
                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-purple-300 text-sm">Loading instances...</p>
                          </div>
                        ) : (
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {instances.map((t) => (
                              <TournamentCard
                                key={`${t.tierId}-${t.instanceId}`}
                                {...t}
                                tierName={getTierName(t.maxPlayers)}
                                onEnroll={() => handleEnroll(t.tierId, t.instanceId, t.entryFee)}
                                onEnter={() => handleEnterTournament(t.tierId, t.instanceId)}
                                onManualStart={handleManualStart}
                                onClaimAbandonedPool={handleClaimAbandonedPool}
                                loading={loading}
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
        </div>

      </div>

      {/* Winners Leaderboard Section */}
      <div className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-2xl mx-auto mb-16">
          <WinnersLeaderboard
            leaderboard={leaderboard}
            loading={leaderboardLoading}
            error={leaderboardError}
            currentAccount={account}
            onRetry={() => fetchLeaderboard(contract)}
          />
        </div>
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

      {/* Match End Modal */}
      <MatchEndModal
        result={matchEndResult}
        onClose={handleMatchEndModalClose}
        winnerLabel={matchEndWinnerLabel}
        gameType="connectfour"
        isVisible={!!matchEndResult}
      />
    </div>
  );
}
