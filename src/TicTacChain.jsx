/**
 * TicTacChain - On-Chain TicTacToe Tournament Frontend
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
 *    VITE_TICTACCHAIN_ADDRESS=0x...
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Coins, Zap, History,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, HelpCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import TicTacChainABIData from './TTTABI-modular.json';

const TICTACCHAIN_ABI = TicTacChainABIData.abi;
const CONTRACT_ADDRESS = TicTacChainABIData.address;
const MODULE_ADDRESSES = TicTacChainABIData.modules;

import { CURRENT_NETWORK, getAddressUrl, getExplorerHomeUrl } from './config/networks';
import { shortenAddress, formatTime as formatTimeHMS, getTierName, getTournamentTypeLabel } from './utils/formatters';
import { parseTournamentParams } from './utils/urlHelpers';
import { parseTicTacToeMatch } from './utils/matchDataParser';
import { determineMatchResult } from './utils/matchCompletionHandler';
import { fetchTierTimeoutConfig } from './utils/timeCalculations';
import { getCompletionReasonText, getCompletionReasonDescription } from './utils/completionReasons';
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

// TicTacToe particle symbols (matching landing page style)
const TICTACTOE_SYMBOLS = ['✕', '○'];

// Hardcoded tier configuration (matches TicTacChain.sol deployment)
// Tier 0: _registerTier0() -> 2 players, 100 instances, 0.0003 ETH
// Tier 1: _registerTier1() -> 4 players, 50 instances, 0.0007 ETH
// Tier 2: _registerTier2() -> 8 players, 25 instances, 0.00013 ETH
const TIER_CONFIG = {
  0: {
    playerCount: 2,
    instanceCount: 100,
    entryFee: '0.0003',
    timeouts: {
      matchTimePerPlayer: 120,
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
    entryFee: '0.0007',
    timeouts: {
      matchTimePerPlayer: 60,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 120,
      matchLevel3Delay: 240,
      enrollmentWindow: 300,
      enrollmentLevel2Delay: 300
    }
  },
  2: {
    playerCount: 8,
    instanceCount: 25,
    entryFee: '0.0013',
    timeouts: {
      matchTimePerPlayer: 60,
      timeIncrementPerMove: 15,
      matchLevel2Delay: 120,
      matchLevel3Delay: 240,
      enrollmentWindow: 600,
      enrollmentLevel2Delay: 300
    }
  }
};

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onSpectateMatch, onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onResetEnrollmentWindow, onEnroll, account, loading, syncDots, isEnrolled, entryFee, isFull, contract }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers, firstEnrollmentTime, countdownActive, enrollmentTimeout } = tournamentData;

  // Calculate total rounds based on player count
  const totalRounds = Math.ceil(Math.log2(playerCount));

  // Determine tournament type label (Duel vs Tournament)
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);

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
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

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
        gameType="tictactoe"
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
                {countdownExpired ? '0m 0s' : formatTime(timeRemaining)}
              </span>
            </div>
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
                  return (
                    <div
                      key={matchIdx}
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
                        onSpectateMatch={onSpectateMatch}
                        onForceEliminate={onForceEliminate}
                        onClaimReplacement={onClaimReplacement}
                        matchStatusOptions={matchStatusOptions}
                        showEscalation={true}
                        showThisIsYou={true}
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

export default function TicTacChain() {
  // Use network config instead of hardcoded values
  const EXPECTED_CHAIN_ID = CURRENT_NETWORK.chainId;
  // const EXPECTED_CHAIN_ID = 42161;
  const RPC_URL = import.meta.env.VITE_RPC_URL || CURRENT_NETWORK.rpcUrl;
  // const RPC_URL = "https://rpc.ankr.com/arbitrum/fa78359589ebb4ba1c97e306d5ad98192c1b897a76d2df05acf7ade04aa2687b";
  const EXPLORER_URL = getAddressUrl(CONTRACT_ADDRESS);

  // Helper to get read-only contract (bypasses MetaMask for read operations)
  const getReadOnlyContract = useCallback(() => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CONTRACT_ADDRESS, TICTACCHAIN_ABI, provider);
  }, [CONTRACT_ADDRESS, RPC_URL]);

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null); // This contract has signer for write ops

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

  // Time Configuration from Contract
  const [matchTimePerPlayer, setMatchTimePerPlayer] = useState(120); // Default 2 minutes for Tic-Tac-Toe
  const [timeIncrement, setTimeIncrement] = useState(0); // Default no increment
  const [escalationInterval, setEscalationInterval] = useState(60); // Default 60 seconds between escalations
  const [displayTimeoutConfig, setDisplayTimeoutConfig] = useState({ matchTimePerPlayer: 120 }); // Dynamic timeout config for display

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
  const [tournamentCompletionData, setTournamentCompletionData] = useState(null); // Tournament completion notification data
  const previousBoardRef = useRef(null); // Track previous board state for move history sync
  const tournamentBracketRef = useRef(null); // Ref for auto-scrolling to tournament after URL navigation
  const matchViewRef = useRef(null); // Ref for auto-scrolling to match view

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Connection Error State
  const [connectionError, setConnectionError] = useState(null); // null = no error, string = error message
  const [leaderboardError, setLeaderboardError] = useState(false);

  // Player Activity Hook
  const playerActivity = usePlayerActivity(contract, account, 'tictactoe', TIER_CONFIG);

  // Player Activity Height State (for positioning CommunityRaffleCard)
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);

  // Player Activity Collapse Function Ref
  const collapseActivityPanelRef = useRef(null);

  // Raffle Syncing State
  const [raffleSyncing, setRaffleSyncing] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'ETour - TicTacToe';
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


  // Theme colors (single theme - classic blue/cyan)
  const currentTheme = {
    primary: 'rgba(0, 255, 255, 0.5)',
    secondary: 'rgba(255, 0, 255, 0.5)',
    gradient: 'linear-gradient(135deg, #0f0020 0%, #1f0038 50%, #140023 100%)',
    border: 'rgba(0, 255, 255, 0.3)',
    glow: 'rgba(0, 255, 255, 0.3)',
    particleColors: ['#00ffff', '#ff00ff'],
    // Hero section colors
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
        TICTACCHAIN_ABI,
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

  // Fetch raffle information from contract
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

      console.log('Raffle History fetched:', formattedHistory.length, 'raffles');
    } catch (error) {
      console.error('Error fetching raffle history:', error);
      setRaffleHistory([]);
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
        // Get tier config from hardcoded data
        const tierConfig = TIER_CONFIG[tierId];
        if (!tierConfig) {
          if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: false }));
          return;
        }

        const { playerCount, instanceCount, entryFee } = tierConfig;

        const statuses = [];
        const enrolledCounts = [];

        // OPTIMIZATION: Fetch all tournament instances in parallel
        const tournamentPromises = Array.from({ length: instanceCount }, (_, instanceId) =>
          readContract.tournaments(tierId, instanceId)
            .then(tournament => ({
              success: true,
              status: Number(tournament.status),
              enrolledCount: Number(tournament.enrolledCount)
            }))
            .catch(error => ({ success: false, error }))
        );

        const results = await Promise.all(tournamentPromises);

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

  // Handle tournament enrollment
  const handleEnroll = async (tierId, instanceId, entryFee) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTournamentsLoading(true);

      // Convert entry fee to wei
      const feeInWei = ethers.parseEther(entryFee);

      // Call enrollInTournament function with entry fee as value
      const tx = await contract.enrollInTournament(tierId, instanceId, { value: feeInWei });
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
      let errorMessage = error.message || 'Unknown error';

      if (error.message?.includes('"TE"') || error.reason === 'TE') {
        errorMessage = 'Tournament enrollment tracking failed. This may be a contract configuration issue. Please contact support.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to cover entry fee and gas';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction rejected';
      }

      alert(`Error enrolling: ${errorMessage}`);
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
      const currentRound = Number(tournamentInfo[1]);
      const enrolledCount = Number(tournamentInfo[2]);
      const prizePool = tournamentInfo[3];

      // Get tier config from hardcoded data
      const tierConfig = TIER_CONFIG[tierId];
      const playerCount = tierConfig.playerCount;
      const entryFee = ethers.parseEther(tierConfig.entryFee);

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
            const parsedMatch = parseTicTacToeMatch(matchData);

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

            // Detect timeout client-side (contract only tracks after escalation is triggered)
            // A player is timed out if their remaining time <= 0
            const isTimedOut = player1TimeRemaining <= 0 || player2TimeRemaining <= 0;
            const isMatchActive = parsedMatch.matchStatus === 1;

            // Check escalation availability using contract functions
            // NOTE: These functions REVERT when match isn't stalled, so we only call if we detect timeout
            let escL2Available = false;
            let escL3Available = false;
            let isUserAdvancedForRound = false;

            if (isMatchActive && isTimedOut) {
              // Client detected timeout - try to check contract escalation functions
              try {
                escL2Available = await contractInstance.isMatchEscL2Available(tierId, instanceId, roundNum, matchNum);
                console.log(`[Bracket R${roundNum}M${matchNum}] escL2Available:`, escL2Available);
              } catch (escCheckErr) {
                // Contract reverted - L2 not available yet (expected if not enough time passed)
                console.debug(`[Bracket R${roundNum}M${matchNum}] L2 not available:`, escCheckErr.reason || 'reverted');
              }

              try {
                escL3Available = await contractInstance.isMatchEscL3Available(tierId, instanceId, roundNum, matchNum);
                console.log(`[Bracket R${roundNum}M${matchNum}] escL3Available:`, escL3Available);
              } catch (escCheckErr) {
                // Contract reverted - L3 not available yet
                console.debug(`[Bracket R${roundNum}M${matchNum}] L3 not available:`, escCheckErr.reason || 'reverted');
              }

              // Check if current user is an advanced player for this round
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
                  activeEscalation: 0,
                  timeoutActive: true, // We detected a timeout
                  forfeitAmount: 0,
                  clientDetected: true // Flag to indicate this was detected client-side
                };
                console.log(`[Bracket R${roundNum}M${matchNum}] Client-detected timeout state:`, timeoutState);
              }
            }

            matches.push({
              ...parsedMatch,
              timeoutState,
              // Override with contract's real-time values
              player1TimeRemaining,
              player2TimeRemaining,
              matchTimePerPlayer: tierMatchTime,
              escL2Available,
              escL3Available,
              isUserAdvancedForRound // Contract says if user is advanced for this round
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
              escL2Available: false,
              escL3Available: false,
              isUserAdvancedForRound: false
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

  // Fetch move history from blockchain events with fallback to board state reconstruction
  const fetchMoveHistory = useCallback(async (contractInstance, tierId, instanceId, roundNumber, matchNumber) => {
    try {
      // Get match data first (needed for both approaches)
      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseTicTacToeMatch(matchData);
      const player1 = parsedMatch.player1;
      const board = parsedMatch.board;
      const matchStartTime = Number(matchData.common.startTime);

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

          // Convert events to move history
          const history = currentMatchEvents.map(event => {
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
      const parsedMatch = parseTicTacToeMatch(matchData);

      // Fetch per-tier timeout config to get correct match time
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

      // If contract returns cleared data (zero addresses + empty board), query MatchCompleted event
      // Keep polling until we find an event matching this exact match instance
      const isBoardEmpty = board.every(cell => cell === 0);
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
            const [, eventWinner, eventIsDraw, eventReason, eventPackedBoard] = event.args;

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

            // Unpack the board from the event (2 bits per cell, 9 cells)
            const unpackBoard = (packed) => {
              const boardArray = [];
              let p = BigInt(packed);
              for (let j = 0; j < 9; j++) {
                boardArray.push(Number(p & 3n));
                p = p >> 2n;
              }
              return boardArray;
            };
            const eventBoard = unpackBoard(eventPackedBoard);

            console.log('[refreshMatchData] Found matching MatchCompleted event:', {
              winner: eventWinner,
              isDraw: eventIsDraw,
              reason: Number(eventReason),
              board: eventBoard,
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
              // Flag to indicate this came from MatchCompleted event polling
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

      // Check escalation availability using contract functions
      let escL2Available = false;
      let escL3Available = false;
      let isUserAdvancedForRound = false;
      try {
        escL2Available = await contractInstance.isMatchEscL2Available(tierId, instanceId, roundNumber, matchNumber);
        escL3Available = await contractInstance.isMatchEscL3Available(tierId, instanceId, roundNumber, matchNumber);
      } catch (escCheckErr) {
        console.debug('Could not check escalation availability:', escCheckErr.message);
      }

      // Check if current user is an advanced player for this round (from contract)
      if (userAccount) {
        try {
          isUserAdvancedForRound = await contractInstance.isPlayerInAdvancedRound(tierId, instanceId, roundNumber, userAccount);
        } catch (advErr) {
          console.debug('Could not check advanced player status:', advErr.message);
        }
      }

      const boardState = Array.from(board).map(cell => Number(cell));
      const isPlayer1 = actualPlayer1.toLowerCase() === userAccount.toLowerCase();
      const isYourTurn = currentTurn.toLowerCase() === userAccount.toLowerCase();

      // Determine if match was completed by timeout
      // A match is timed out if it completed with an active timeout state
      const isTimedOut = matchStatus === 2 && timeoutState?.timeoutActive === true;

      // Fetch last move from MoveMade events (persists after page refresh)
      let lastMove = null;
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
              cellIndex: Number(lastEvent.args.cellIndex),
              player: movePlayer,
              isMyMove: movePlayer?.toLowerCase() === userAccount?.toLowerCase()
            };
          }
        }
      } catch (err) {
        console.error('Error fetching MoveMade events for lastMove:', err.message);
      }

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
        timeoutConfig, // Pass timeout config to UI components
        lastMove, // Last move for highlighting (from events)
        // Escalation data from contract
        escL2Available,
        escL3Available,
        isUserAdvancedForRound
      };
    } catch (error) {
      console.error('Error refreshing match:', error);

      // Check if error is "MNF" (Match Not Found) - tournament may have completed
      if (error.message && error.message.includes('MNF')) {
        console.log('[Match Refresh] MNF error - match data unavailable (tournament may have completed)');
        // The TournamentCompleted event listener will handle showing the notification
      }

      return null;
    }
  }, [escalationInterval]);

  // Handle cell click for making moves
  const handleCellClick = async (cellIndex) => {
    if (!currentMatch || !contract || !account) return;

    if (!currentMatch.isYourTurn) {
      alert("It's not your turn!");
      return;
    }
    if (currentMatch.board[cellIndex] !== 0) {
      alert('Cell already taken!');
      return;
    }
    if (currentMatch.matchStatus === 2) {
      alert('Match is already complete!');
      return;
    }

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      const tx = await contract.makeMove(tierId, instanceId, roundNumber, matchNumber, cellIndex);
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
      } else if (errorString.includes('Cell already taken') || errorString.includes('cell already taken')) {
        errorMsg = 'Invalid Move - Cell already taken';
      } else if (errorString.includes('execution reverted')) {
        // Generic contract revert - likely an invalid move
        errorMsg = 'Invalid Move - This move is not allowed';
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
      const prizePool = tournamentInfo[3]; // prizePool is at index 3

      const matchData = await contract.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseTicTacToeMatch(matchData);

      const player1 = parsedMatch.player1;
      const player2 = parsedMatch.player2;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      let actualPlayer1 = player1;
      let actualPlayer2 = player2;

      if (player1.toLowerCase() === zeroAddress) {
        // Get enrolled players by iterating through enrolledPlayers mapping
        const enrolledCount = Number(tournamentInfo[2]);
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

  const handleSpectateMatch = async (tierId, instanceId, roundNumber, matchNumber) => {
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
      const parsedMatch = parseTicTacToeMatch(matchData);

      const player1 = parsedMatch.player1;
      const player2 = parsedMatch.player2;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      let actualPlayer1 = player1;
      let actualPlayer2 = player2;

      if (player1.toLowerCase() === zeroAddress) {
        // Get enrolled players by iterating through enrolledPlayers mapping
        const enrolledCount = Number(tournamentInfo[2]); // enrolledCount at index 2 in getTournamentInfo
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

  // Handle closing the tournament completion modal
  const handleTournamentCompletionModalClose = async () => {
    // Clear the modal state
    setTournamentCompletionData(null);

    // Refresh player activity to update terminated matches
    if (playerActivity?.refetch) {
      playerActivity.refetch();
    }

    // Refresh data
    if (contract) {
      await fetchLeaderboard(true);
      await refreshAfterAction();
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
          TICTACCHAIN_ABI,
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

  // Listen for TournamentCompleted events to notify players
  useEffect(() => {
    if (!contract || !account) return;

    console.log('[TournamentCompleted] Setting up event listener for account:', account);

    const handleTournamentCompleted = async (tierId, instanceId, winner, _prizeAmount, completionReason, enrolledPlayers, event) => {
      console.log('[TournamentCompleted Event] ===== EVENT FIRED =====');
      console.log('[TournamentCompleted Event] Tournament:', Number(tierId), 'Instance:', Number(instanceId));
      console.log('[TournamentCompleted Event] Completion reason:', Number(completionReason));
      console.log('[TournamentCompleted Event] Winner:', winner);

      // Time-gate: Only process events that occurred after current match/tournament started
      if (event && currentMatch) {
        try {
          const block = await event.getBlock();
          const eventTimestamp = block.timestamp;
          const matchStartTime = currentMatch.startTime;

          console.log('[TournamentCompleted Event] Timestamp check:', {
            eventTimestamp,
            matchStartTime,
            isValidEvent: eventTimestamp >= matchStartTime
          });

          if (eventTimestamp < matchStartTime) {
            console.log('[TournamentCompleted Event] Event is older than current match start time, ignoring');
            return;
          }
        } catch (err) {
          console.error('[TournamentCompleted Event] Error checking timestamp:', err);
          // Don't return here - if timestamp check fails, proceed with other validation
        }
      }

      // 1. Check if player is the winner - if yes, DON'T show modal (they won!)
      const playerIsWinner = winner.toLowerCase() === account.toLowerCase();
      if (playerIsWinner) {
        console.log('[TournamentCompleted Event] Player is the WINNER - no notification needed');
        return;
      }

      // 2. Check if player was enrolled
      const isEnrolled = enrolledPlayers.some(
        addr => addr.toLowerCase() === account.toLowerCase()
      );

      if (!isEnrolled) {
        console.log('[TournamentCompleted Event] Player not enrolled, ignoring');
        return;
      }

      // 3. Check if player had an active tournament at time of completion
      // (if not in playerActiveTournaments, they were already eliminated)
      try {
        const activeTournaments = await contract.getPlayerActiveTournaments(account);
        const wasActive = activeTournaments.some(
          ref => Number(ref.tierId) === Number(tierId) && Number(ref.instanceId) === Number(instanceId)
        );

        if (!wasActive) {
          console.log('[TournamentCompleted Event] Player was already eliminated before tournament ended - no notification needed');
          return;
        }

        console.log('[TournamentCompleted Event] ✓ Player had active match when tournament ended - SHOWING NOTIFICATION');

        // Show modal - player was actively playing when tournament completed
        setTournamentCompletionData({
          tierId: Number(tierId),
          instanceId: Number(instanceId),
          winner,
          completionReason: Number(completionReason)
        });

        // Clear current match view if in this tournament
        if (currentMatch &&
            currentMatch.tierId === Number(tierId) &&
            currentMatch.instanceId === Number(instanceId)) {
          console.log('[TournamentCompleted Event] Clearing current match view');
          setCurrentMatch(null);
          setMoveHistory([]);
        }
      } catch (error) {
        console.error('[TournamentCompleted Event] Error checking playerActiveTournaments:', error);
      }
    };

    // Register event listener
    contract.on('TournamentCompleted', handleTournamentCompleted);
    console.log('[TournamentCompleted] Event listener registered');

    // Query recent events to catch any missed while page was loading
    const checkRecentEvents = async () => {
      try {
        const filter = contract.filters.TournamentCompleted();
        const events = await contract.queryFilter(filter, -50);
        console.log('[TournamentCompleted] Found', events.length, 'recent events in last 50 blocks');

        // Process only the most recent event per tournament
        const processedTournaments = new Set();
        events.reverse().forEach(event => {
          const tournamentKey = `${event.args.tierId}-${event.args.instanceId}`;
          if (!processedTournaments.has(tournamentKey)) {
            processedTournaments.add(tournamentKey);
            const { tierId, instanceId, winner, completionReason, enrolledPlayers } = event.args;
            handleTournamentCompleted(tierId, instanceId, winner, 0n, completionReason, enrolledPlayers, event);
          }
        });
      } catch (err) {
        console.error('[TournamentCompleted] Error checking recent events:', err);
      }
    };

    checkRecentEvents();

    return () => {
      console.log('[TournamentCompleted] Cleaning up event listener');
      contract.off('TournamentCompleted', handleTournamentCompleted);
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

  // Poll raffle info every 10 seconds (runs globally when wallet connected)
  useEffect(() => {
    if (!account) return; // Only show when wallet connected

    // Initial fetch
    fetchRaffleInfo();
    fetchRaffleHistory(); // Fetch history once on mount

    // Set up polling interval - runs every 10 seconds (only for current raffle info)
    const pollInterval = setInterval(fetchRaffleInfo, 10000);

    return () => clearInterval(pollInterval);
  }, [account, fetchRaffleInfo, fetchRaffleHistory]);

  // Poll leaderboard every 1 minute (runs globally)
  useEffect(() => {
    if (!contract) return;

    // Set up polling interval - runs every 60 seconds
    const pollInterval = setInterval(() => {
      fetchLeaderboard(true); // Silent update (no loading indicator)
    }, 60000);

    return () => clearInterval(pollInterval);
  }, [contract, fetchLeaderboard]);

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
          // Handle match completed from MatchCompleted event polling
          if (updatedMatch.completedFromEventPoll) {
            console.log('[Polling] Match completed from event poll, updating state and showing banner');

            // Update match state with event data (including board from event)
            setCurrentMatch(prev => {
              if (!prev) return updatedMatch;
              // Don't overwrite if already completed
              if (prev.matchStatus === 2) return prev;

              return {
                ...prev,
                matchStatus: 2,
                winner: updatedMatch.winner,
                loser: updatedMatch.loser,
                isDraw: updatedMatch.isDraw,
                board: updatedMatch.board,
                isYourTurn: false,
                completionReason: updatedMatch.completionReason
              };
            });

            // Show winner/loser banner
            const player1 = updatedMatch.player1;
            const player2 = updatedMatch.player2;
            const isPlayer1 = player1?.toLowerCase() === userAccount.toLowerCase();
            const isPlayer2 = player2?.toLowerCase() === userAccount.toLowerCase();
            const isParticipant = isPlayer1 || isPlayer2;

            if (isParticipant) {
              const userWon = !updatedMatch.isDraw && updatedMatch.winner.toLowerCase() === userAccount.toLowerCase();
              const reasonNum = updatedMatch.completionReason;

              let resultType = 'lose';
              if (updatedMatch.isDraw) {
                resultType = 'draw';
              } else if (userWon) {
                resultType = (reasonNum === 1 || reasonNum === 2 || reasonNum === 3) ? 'forfeit_win' : 'win';
              } else {
                resultType = (reasonNum === 1 || reasonNum === 2 || reasonNum === 3) ? 'forfeit_lose' : 'lose';
              }

              console.log('[Polling] Setting match end result:', resultType);
              setMatchEndResult(resultType);
              setMatchEndWinner(updatedMatch.winner);
              setMatchEndLoser(updatedMatch.loser);
            }
            return;
          }

          // If match just completed (not from event poll), let events handle it
          if (updatedMatch.matchStatus === 2) {
            return;
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
        console.error('[Polling] Error syncing match:', error);
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
      {/* Particle Background */}
      <ParticleBackground colors={currentTheme.particleColors} symbols={TICTACTOE_SYMBOLS} fontSize="24px" count={38} />

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
          gameName="tictactoe"
          gameEmoji="✖️"
          onHeightChange={setPlayerActivityHeight}
          onCollapse={(collapseFn) => { collapseActivityPanelRef.current = collapseFn; }}
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
          <div className={`flex flex-col md:flex-row md:items-center ${EXPLORER_URL ? 'md:justify-between' : 'md:justify-center'} gap-3 md:gap-4 text-xs md:text-sm`}>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-6 justify-center ${EXPLORER_URL ? 'md:justify-start' : ''}`}>
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

      {/* Community Raffle Card - Below Player Activity Toggle */}
      {account && (
        <CommunityRaffleCard
          raffleInfo={raffleInfo}
          raffleHistory={raffleHistory}
          playerActivityHeight={playerActivityHeight}
          onRefresh={fetchRaffleInfo}
          onTriggerRaffle={executeRaffle}
          syncing={raffleSyncing}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`}></div>
              <Grid className={`relative ${currentTheme.heroIcon} animate-float`} size={80} />
            </div>
          </div>

          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            ETour TicTacToe
          </h1>
          <p className="text-2xl text-blue-200 mb-6">
            Provably Fair • Zero Trust • 100% On-Chain
          </p>
          <p className={`text-lg ${currentTheme.heroSubtext} max-w-3xl mx-auto mb-8`}>
            Play Tic-Tac-Toe on the blockchain. Real opponents. Real ETH on the line.
            <br/>
            No servers required. No trust needed.
            <br/>
            Every move is a transaction. Every outcome is permanently on-chain.
          </p>

          {/* Game Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-300">2 minutes per match</span>
              </div>
              <p className="text-sm text-yellow-200">
                Each player gets 2 minutes total for all their moves in the match.
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

        {/* Match View - Shows when player enters a match or spectates */}
        {contract && currentMatch && (
          <div ref={matchViewRef}>
            <GameMatchLayout
            gameType="tictactoe"
            match={currentMatch}
            account={account}
            loading={matchLoading}
            syncDots={syncDots}
            onClose={closeMatch}
            onClaimTimeoutWin={isSpectator ? null : handleClaimTimeoutWin}
            onForceEliminate={isSpectator ? null : handleForceEliminateStalledMatch}
            onClaimReplacement={isSpectator ? null : handleClaimMatchSlotByReplacement}
            playerCount={viewingTournament?.playerCount || null}
            playerConfig={{
              player1: { icon: 'X', label: 'Player 1' },
              player2: { icon: 'O', label: 'Player 2' }
            }}
            layout="three-column"
            isSpectator={isSpectator}
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
            {/* TicTacToe Board Grid */}
            <div className="grid grid-cols-3 gap-3">
              {currentMatch.board.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={isSpectator ? null : () => handleCellClick(idx)}
                  disabled={isSpectator || matchLoading || currentMatch.matchStatus === 2 || !currentMatch.isYourTurn}
                  className={`aspect-square rounded-xl flex items-center justify-center text-4xl font-bold transition-all transform hover:scale-105 disabled:cursor-not-allowed ${
                    cell === 0
                      ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200'
                      : cell === 1
                      ? 'bg-blue-500/40 text-blue-200'
                      : 'bg-pink-500/40 text-pink-200'
                  } ${
                    ''
                  }`}
                >
                  {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
                </button>
              ))}
            </div>
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
                  onSpectateMatch={handleSpectateMatch}
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

                      return (
                        <div key={tierId} className="mb-6">
                          <button
                            onClick={() => toggleTier(tierId)}
                            className="w-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-4 border border-purple-400/40 hover:border-purple-400/60 transition-all cursor-pointer"
                          >
                            <h3 className="text-2xl font-bold text-purple-400 flex items-center gap-2 flex-wrap">
                              <Grid size={24} /> {getTierName(metadata.playerCount)}s
                              <span className="text-sm font-normal text-purple-300">• {metadata.playerCount} players total</span>
                              <span className="text-sm font-normal text-purple-300">• {metadata.entryFee} ETH entry</span>
                              <span className="text-sm font-normal text-purple-300">• {totalPrizePool} ETH prize pool</span>
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
          raffleThresholds={['0.001', '0.005', '0.02', '0.05', '0.25', '0.5', '0.75', '1']}
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
                    <th className="text-left p-4 text-cyan-300 font-semibold">Game Modules</th>
                    <th className="text-left p-4 text-cyan-300 font-semibold">Game Contracts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-4 align-top">
                      <div className="space-y-2">
                        <a
                          href="https://arbiscan.io/address/0x50fA8Bc9622F7Cac110586a418F8731f17A9dbFE#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Core.sol
                        </a>
                        <a
                          href="https://arbiscan.io/address/0xF3C194d0277Ee9F2F46cd17D78D377a9f04b4a9B#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Matches.sol
                        </a>
                        <a
                          href="https://arbiscan.io/address/0x6828987b8684c5a4ec1353D38aE16D205238E46F#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Prizes.sol
                        </a>
                        <a
                          href="https://arbiscan.io/address/0x7D00c716955B32375bef412078AD2B72cE8530B8#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ETour_Raffle.sol
                        </a>
                        <a
                          href="https://arbiscan.io/address/0x8eF07467764b4B0baE5d4A481371d351c3b3c0DF#code"
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
                          href="https://arbiscan.io/address/0xE794752f489d0223a80114efA39BC520ceE38978#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ChessRules.sol
                        </a>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="space-y-2">
                        <a
                          href="https://arbiscan.io/address/0xA98e643F2EE17781f1FDE5D740CB413b6d5DbDbe#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          TicTacChain.sol
                        </a>
                        <a
                          href="https://arbiscan.io/address/0x010b8790d9597D5E7800a44Ad24f76F0C45584e7#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ChessOnChain.sol
                        </a>
                        <a
                          href="https://arbiscan.io/address/0x96855793ba805ffDEf910e77807604c33f9816Ae#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                        >
                          ConnectFourOnChain.sol
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
        result={matchEndResult}
        onClose={handleMatchEndModalClose}
        winnerLabel={matchEndWinnerLabel}
        winnerAddress={matchEndWinner}
        loserAddress={matchEndLoser}
        currentAccount={account}
        gameType="tictactoe"
        isVisible={!!matchEndResult}
        roundNumber={currentMatch?.roundNumber}
        totalRounds={currentMatch?.playerCount ? Math.ceil(Math.log2(currentMatch.playerCount)) : undefined}
        prizePool={currentMatch?.prizePool}
      />

      {/* Tournament Completion Modal */}
      {tournamentCompletionData && (
        <MatchEndModal
          result="tournament_ended"
          onClose={handleTournamentCompletionModalClose}
          completionReason={tournamentCompletionData.completionReason}
          tournamentWinner={tournamentCompletionData.winner}
          currentAccount={account}
          gameType="tictactoe"
          isVisible={true}
        />
      )}
    </div>
  );
}
