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
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Coins, Zap, History,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, HelpCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import TicTacChainABIData from './TTTABI-modular.json';
import ChessABIData from './ChessOnChain-ABI-modular.json';
import ConnectFourABIData from './ConnectFourABI-modular.json';

const TICTACCHAIN_ABI = TicTacChainABIData.abi;
const CONTRACT_ADDRESS = TicTacChainABIData.address;
const MODULE_ADDRESSES = TicTacChainABIData.modules;

import { CURRENT_NETWORK, getAddressUrl, getExplorerHomeUrl } from './config/networks';
import { shortenAddress, formatTime as formatTimeHMS, getTierName, getTournamentTypeLabel, getCellPositionName } from './utils/formatters';
import { parseTournamentParams } from './utils/urlHelpers';
import { parseTicTacToeMatch } from './utils/matchDataParser';
import { determineMatchResult } from './utils/matchCompletionHandler';
import { fetchTierTimeoutConfig } from './utils/timeCalculations';
import { getCompletionReasonText, getCompletionReasonDescription, isDraw } from './utils/completionReasons';
import { batchFetchTournaments, batchFetchIsEnrolled, checkInstanceEscalations } from './utils/multicall';
import ParticleBackground from './components/shared/ParticleBackground';
import MatchCard from './components/shared/MatchCard';
import TournamentCard from './components/shared/TournamentCard';
import WinnersLeaderboard from './components/shared/WinnersLeaderboard';
import UserManual from './components/shared/UserManual';
import MatchEndModal from './components/shared/MatchEndModal';
import ActiveMatchAlertModal from './components/shared/ActiveMatchAlertModal';
import WhyArbitrum from './components/shared/WhyArbitrum';
import GameMatchLayout from './components/shared/GameMatchLayout';
import TournamentHeader from './components/shared/TournamentHeader';
import PlayerActivity from './components/shared/PlayerActivity';
import RecentMatchesCard from './components/shared/RecentMatchesCard';
import CommunityRaffleCard from './components/shared/CommunityRaffleCard';
import GamesCard from './components/shared/GamesCard';
import BracketScrollHint from './components/shared/BracketScrollHint';
import RecentInstanceCard from './components/shared/RecentInstanceCard';
import InviteModal from './components/shared/InviteModal';
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
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, /* onSpectateMatch, */ onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onResetEnrollmentWindow, onEnroll, account, loading, syncDots, isEnrolled, entryFee, isFull, contract }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers, firstEnrollmentTime, countdownActive, enrollmentTimeout } = tournamentData;

  // Ref for scroll hint component
  const bracketViewRef = useRef(null);

  // Track previous status for auto-scroll detection
  const prevStatusRef = useRef(status);

  // Calculate total rounds based on player count
  const totalRounds = Math.ceil(Math.log2(playerCount));

  // Determine tournament type label (Duel vs Tournament)
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);

  // Countdown timer logic for enrollment
  const ENROLLMENT_DURATION = 1 * 60; // 1 minute in seconds (matches contract)
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownExpired, setCountdownExpired] = useState(false);

  // Auto-scroll to brackets when tournament starts after enrollment
  useEffect(() => {
    // Check if status changed from 0 (enrolling) to 1 (in progress)
    // AND the user is enrolled in this tournament
    if (prevStatusRef.current === 0 && status === 1 && isEnrolled && bracketViewRef.current) {
      // Small delay to ensure DOM has updated with bracket data
      const scrollTimer = setTimeout(() => {
        bracketViewRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 300);

      return () => clearTimeout(scrollTimer);
    }

    // Update the previous status reference
    prevStatusRef.current = status;
  }, [status, isEnrolled]);

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

  // Check if rounds exist but contain no real match data
  const hasValidRounds = rounds && rounds.length > 0 && rounds.some(round =>
    round.matches && round.matches.length > 0 && round.matches.some(match =>
      match.player1 && match.player1 !== '0x0000000000000000000000000000000000000000'
    )
  );

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
      <div ref={bracketViewRef} className={`bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder}`}>
        <h3 className={`text-2xl font-bold ${colors.text} mb-3 flex items-center gap-2`}>
          <Grid size={24} />
          {tournamentTypeLabel} Bracket
        </h3>

        {hasValidRounds ? (
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
                        // onSpectateMatch={onSpectateMatch} // COMMENTED OUT: Spectate disabled
                        onForceEliminate={onForceEliminate}
                        onClaimReplacement={onClaimReplacement}
                        matchStatusOptions={matchStatusOptions}
                        showEscalation={true}
                        showThisIsYou={true}
                        gameName="tictactoe"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status message */}
            <div className="text-left py-4">
              <div className={`${colors.text} text-lg`}>
                {status === 0
                  ? 'Brackets will be generated once the instance starts.'
                  : 'No bracket data available.'}
              </div>
            </div>

            {/* Divider */}
            {enrolledCount === 0 && (
              <hr className="border-purple-500/20" />
            )}

            {/* Recent instance history (shown when no enrolled players) */}
            {enrolledCount === 0 && (
              <div id="last-instance">
                <RecentInstanceCard
                  tierId={tierId}
                  instanceId={instanceId}
                  contract={contract}
                  tierName={tournamentTypeLabel}
                  walletAddress={account}
                />
              </div>
            )}
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

export default function TicTacChain() {
  // Use network config instead of hardcoded values
  // const EXPECTED_CHAIN_ID = CURRENT_NETWORK.chainId;
  const EXPECTED_CHAIN_ID = 42161;
  // const RPC_URL = import.meta.env.VITE_RPC_URL || CURRENT_NETWORK.rpcUrl;
  // const RPC_URL = "https://arb1.arbitrum.io/rpc";
  const RPC_URL = "https://arb-mainnet.g.alchemy.com/v2/yoftG-myZ5Iur7UklgbJR";
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
    ownerShare: 0n,
    raffleAmount: 0n,
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

  // Visibility tracking for home page polling
  const tierListRef = useRef(null);
  const [isTierListVisible, setIsTierListVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(!document.hidden);

  // URL Parameters State for shareable tournament links
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlTournamentParams, setUrlTournamentParams] = useState(null);
  const [hasProcessedUrlParams, setHasProcessedUrlParams] = useState(false);

  // Location state for navigation
  const location = useLocation();
  const navigate = useNavigate();

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
  const [nextActiveMatch, setNextActiveMatch] = useState(null); // Next active match info after winning
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

  // Card Height States (for positioning cards in vertical stack)
  const [gamesCardHeight, setGamesCardHeight] = useState(0);
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);
  const [recentMatchesCardHeight, setRecentMatchesCardHeight] = useState(0);

  // Player Activity Collapse Function Ref
  const collapseActivityPanelRef = useRef(null);

  // Raffle Syncing State
  const [raffleSyncing, setRaffleSyncing] = useState(false);

  // Mobile Panel Expansion Coordination (only one panel expanded at a time on mobile)
  const [expandedPanel, setExpandedPanel] = useState(null); // 'games' | 'playerActivity' | 'recentMatches' | 'communityRaffle' | null

  // Mobile Tooltip Coordination (only one tooltip shown at a time on mobile when wallet not connected)
  const [activeTooltip, setActiveTooltip] = useState(null); // 'playerActivity' | 'recentMatches' | 'communityRaffle' | 'eliteMatches' | null

  // Active Match Alert Modal State
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [alertMatch, setAlertMatch] = useState(null);
  // Track which matches have been shown in this tab session (not persisted)
  const shownAlertsRef = useRef(new Set());

  // Active Match Alert Modal Logic
  useEffect(() => {
    // Only show alert if:
    // 1. There's a matchAlert from the hook
    // 2. We're NOT currently viewing a match (location.state?.view !== 'match')
    // 3. This match hasn't been shown before in this tab session
    if (playerActivity.matchAlert) {
      const match = playerActivity.matchAlert;
      const matchKey = `${match.tierId}-${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;

      // Check if we're currently viewing this match
      const currentView = location.state?.view;
      const isViewingMatch = currentView === 'match' &&
        location.state?.tierId === match.tierId &&
        location.state?.instanceId === match.instanceId &&
        location.state?.roundIdx === match.roundIdx &&
        location.state?.matchIdx === match.matchIdx;

      // Check if modal has been shown for this match before in this session
      const hasBeenShown = shownAlertsRef.current.has(matchKey);

      console.log('[ActiveMatchAlert] Match alert detected:', matchKey, {
        isViewingMatch,
        hasBeenShown,
        currentView
      });

      if (!isViewingMatch && !hasBeenShown) {
        console.log('[ActiveMatchAlert] Showing alert modal for match:', matchKey);
        setAlertMatch(match);
        setShowMatchAlert(true);

        // Mark this match as shown in this session
        shownAlertsRef.current.add(matchKey);
      }

      // Clear the alert from the hook
      playerActivity.clearMatchAlert();
    }
  }, [playerActivity.matchAlert, location.state, playerActivity]);

  // Click-away handler for tooltips
  useEffect(() => {
    if (!activeTooltip) return;

    const handleClickAway = () => {
      setActiveTooltip(null);
    };

    // Add listener on next tick to avoid closing immediately from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickAway);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickAway);
    };
  }, [activeTooltip]);

  // Set page title
  useEffect(() => {
    document.title = 'ETour - TicTacToe';
  }, []);

  // Handle scroll to Live Instances when navigating from Games card
  useEffect(() => {
    if (location.state?.scrollToLiveInstances) {
      // Clear any active tournament or match view to return to home view
      setViewingTournament(null);
      setCurrentMatch(null);
      setSearchParams({}); // Clear URL params

      // Small delay to ensure the page has fully rendered
      setTimeout(() => {
        const liveInstancesSection = document.getElementById('live-instances');
        if (liveInstancesSection) {
          const elementPosition = liveInstancesSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - 100; // 100px top margin
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [location.state, setSearchParams]);

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

      const [raffleIndex, currentAccumulated, threshold, eligiblePlayerCount] =
        await readContract.getRaffleInfo();

      const rafflePot = currentAccumulated;
      const reserve = (rafflePot * 5n) / 100n;
      const ownerShare = (rafflePot * 5n) / 100n;
      const raffleAmount = rafflePot - reserve - ownerShare;
      const isReady = currentAccumulated >= threshold && eligiblePlayerCount > 0n;

      setRaffleInfo({
        raffleIndex,
        isReady,
        currentAccumulated,
        threshold,
        reserve,
        ownerShare,
        raffleAmount,
        eligiblePlayerCount
      });

      console.log('Raffle Info:', {
        raffleIndex: raffleIndex.toString(),
        currentAccumulated: ethers.formatEther(currentAccumulated),
        threshold: ethers.formatEther(threshold),
        reserve: ethers.formatEther(reserve),
        ownerShare: ethers.formatEther(ownerShare),
        raffleAmount: ethers.formatEther(raffleAmount),
        isReady,
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

      const [raffleIndex] = await readContract.getRaffleInfo();
      const raffleCount = Number(raffleIndex);

      if (raffleCount <= 0) {
        setRaffleHistory([]);
        return;
      }

      const raffleIndexes = Array.from({ length: raffleCount }, (_, i) => i);
      const results = await Promise.all(raffleIndexes.map((index) => readContract.raffleResults(index)));

      const formattedHistory = results.map((result, index) => {
        const rafflePot = result.rafflePot;
        const reserve = (rafflePot * 5n) / 100n;
        const ownerShare = (rafflePot * 5n) / 100n;
        const winnerPrize = rafflePot - reserve - ownerShare;

        return {
          raffleNumber: index,
          executor: result.executor,
          timestamp: Number(result.timestamp),
          rafflePot,
          winner: result.winner,
          winnerPrize
        };
      }).reverse();

      setRaffleHistory(formattedHistory);

      console.log('Raffle History fetched:', formattedHistory.length, 'raffles');
    } catch (error) {
      console.error('Error fetching raffle history:', error);
      setRaffleHistory([]);
    }
  }, [getReadOnlyContract]);

  // EAGER LOADING: Fetch tier metadata and all tier instances on page load
  // No longer lazy - all tier data is fetched upfront to show "currently playing" counts
  const fetchTierMetadata = useCallback(async (contractInstance = null, silentUpdate = false) => {
    if (!silentUpdate) setMetadataLoading(true);
    if (!silentUpdate) setConnectionError(null);

    const readContract = contractInstance || getReadOnlyContract();
    if (!readContract) {
      if (!silentUpdate) setMetadataLoading(false);
      return;
    }

    try {
      // Build metadata from TIER_CONFIG and fetch all instances at once
      const metadata = {};
      const allInstances = {};

      for (const [tierId, tierConfig] of Object.entries(TIER_CONFIG)) {
        const { playerCount, instanceCount, entryFee } = tierConfig;

        // OPTIMIZATION: Fetch all tournament data using multicall
        const provider = readContract.runner?.provider || readContract.provider;
        const results = await batchFetchTournaments(readContract, tierId, instanceCount, provider);

        // Process results - stop at first uninitialized instance
        const statuses = [];
        const enrolledCounts = [];
        const currentRounds = [];
        const enrollmentTimeouts = [];
        const hasStartedViaTimeouts = [];

        for (const result of results) {
          if (!result.success) break;
          statuses.push(result.status);
          enrolledCounts.push(result.enrolledCount);
          currentRounds.push(result.currentRound);
          enrollmentTimeouts.push(result.enrollmentTimeout);
          hasStartedViaTimeouts.push(result.hasStartedViaTimeout);
        }

        // Store metadata
        metadata[tierId] = {
          playerCount,
          instanceCount: statuses.length,
          entryFee,
          statuses,
          enrolledCounts,
          currentRounds,
          enrollmentTimeouts,
          hasStartedViaTimeouts
        };

        // Build instances array (without enrollment status for now)
        const instances = [];
        for (let i = 0; i < statuses.length; i++) {
          const prizePoolETH = (enrolledCounts[i] * parseFloat(entryFee) * 0.9).toFixed(4);

          instances.push({
            tierId: parseInt(tierId),
            instanceId: i,
            status: statuses[i],
            enrolledCount: enrolledCounts[i],
            currentRound: currentRounds[i],
            maxPlayers: playerCount,
            entryFee,
            prizePool: prizePoolETH,
            isEnrolled: false, // Will be updated when wallet connects
            enrollmentTimeout: enrollmentTimeouts[i],
            hasStartedViaTimeout: hasStartedViaTimeouts[i],
            tournamentStatus: statuses[i],
            hasEscalations: false, // Will be populated below
            escL2Count: 0,
            escL3Count: 0,
            firstML3Match: null
          });
        }

        // Debug: Log status of all instances
        console.log(`[TicTacChain Initial Load] Tier ${tierId} - All instance statuses:`, instances.map(inst => ({
          id: inst.instanceId,
          status: inst.tournamentStatus,
          round: inst.currentRound,
          enrolled: inst.enrolledCount
        })));

        // Check for escalations in active tournaments (any active tournament, regardless of round)
        const activeTournamentsInitial = instances.filter(inst => inst.tournamentStatus === 1);
        console.log(`[TicTacChain Initial Load] Tier ${tierId} - Total instances: ${instances.length}, Active tournaments: ${activeTournamentsInitial.length}`, activeTournamentsInitial.map(t => ({ id: t.instanceId, round: t.currentRound })));

        const escalationChecks = activeTournamentsInitial
          .map(inst =>
            checkInstanceEscalations(readContract, inst.tierId, inst.instanceId, inst.currentRound, provider)
              .then(escalationData => ({ instanceId: inst.instanceId, ...escalationData }))
              .catch(err => {
                console.debug(`Failed to check escalations for instance ${inst.instanceId}:`, err);
                return { instanceId: inst.instanceId, hasEscalations: false, escL2Count: 0, escL3Count: 0, firstML3Match: null };
              })
          );

        const escalationResults = await Promise.all(escalationChecks);
        console.log(`[TicTacChain Initial Load] Tier ${tierId} escalation results:`, escalationResults);

        // Update instances with escalation data
        for (const result of escalationResults) {
          const instance = instances.find(inst => inst.instanceId === result.instanceId);
          if (instance) {
            instance.hasEscalations = result.hasEscalations;
            instance.escL2Count = result.escL2Count;
            instance.escL3Count = result.escL3Count;
            instance.firstML3Match = result.firstML3Match;
          }
        }

        allInstances[tierId] = instances;
      }

      setTierMetadata(metadata);
      setTierInstances(allInstances);
      if (!silentUpdate) setMetadataLoading(false);
    } catch (error) {
      console.error('Error fetching tier metadata and instances:', error);

      // Fallback: Build basic metadata from TIER_CONFIG
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
    }
  }, [getReadOnlyContract]);

  // Update enrollment status for a specific tier when wallet connects
  // Since we now fetch all tier data on page load, we just need to update isEnrolled flags
  const fetchTierInstances = useCallback(async (tierId, contractInstance = null, userAccount = null, metadataOverride = null, silentUpdate = false) => {
    const readContract = contractInstance || getReadOnlyContract();
    const currentAccount = userAccount ?? account;
    if (!readContract) return;

    if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: true }));

    try {
      // Fetch new data first - using MULTICALL
      const provider = readContract.runner?.provider || readContract.provider;

      // Get existing instances to fetch updated data
      const existingInstances = tierInstancesRef.current[tierId];

      if (existingInstances && existingInstances.length > 0) {
        // Update enrollment status only - using MULTICALL
        let enrollmentStatuses = [];

        if (currentAccount) {
          enrollmentStatuses = await batchFetchIsEnrolled(readContract, tierId, existingInstances.length, currentAccount, provider);
        } else {
          enrollmentStatuses = Array(existingInstances.length).fill(false);
        }

        // Check for escalations in active tournaments - using MULTICALL
        const activeTournamentsUpdate = existingInstances.filter(inst => inst.tournamentStatus === 1);

        const escalationChecks = activeTournamentsUpdate
          .map(inst =>
            checkInstanceEscalations(readContract, inst.tierId, inst.instanceId, inst.currentRound, provider)
              .then(escalationData => ({ instanceId: inst.instanceId, ...escalationData }))
              .catch(err => {
                console.debug(`Failed to check escalations for instance ${inst.instanceId}:`, err);
                return { instanceId: inst.instanceId, hasEscalations: false, escL2Count: 0, escL3Count: 0, firstML3Match: null };
              })
          );

        const escalationResults = await Promise.all(escalationChecks);

        // Sort instances by priority
        const getSortPriority = (instance, newIsEnrolled, newEscalationData) => {
          const { tournamentStatus, enrolledCount } = instance;
          const isEnrolled = newIsEnrolled !== undefined ? newIsEnrolled : instance.isEnrolled;
          const hasEscalations = newEscalationData?.hasEscalations ?? instance.hasEscalations;
          const escL3Count = newEscalationData?.escL3Count ?? instance.escL3Count;

          // 1. Tournaments where player is enrolled and tournament is active
          if (tournamentStatus === 1 && isEnrolled) return 1;

          // 2. Tournaments where player is enrolled and tournament is not active
          if (tournamentStatus === 0 && isEnrolled) return 2;

          // 3. Tournaments waiting for players but player isn't enrolled
          if (tournamentStatus === 0 && !isEnrolled && enrolledCount > 0) return 3;

          // 4. (Skip to maintain numbering requested by user)

          // 5. Tournaments with EL2 or ML3 escalations available/active
          if (tournamentStatus === 1 && !isEnrolled && hasEscalations) return 5;

          // 6. Tournaments with no enrolled players
          if (tournamentStatus === 0 && !isEnrolled && enrolledCount === 0) return 6;

          // 7. Everything else (active tournaments without enrollment and no escalations)
          return 7;
        };

        // NOW do the atomic state update with the fetched data
        setTierInstances(prev => {
          const currentInstances = prev[tierId];
          if (!currentInstances) return prev;

          // Check if sort order would change with new data
          const currentOrder = currentInstances.map(inst => inst.instanceId);
          const newOrder = [...currentInstances]
            .sort((a, b) => {
              const aEscalation = escalationResults.find(r => r.instanceId === a.instanceId);
              const bEscalation = escalationResults.find(r => r.instanceId === b.instanceId);
              const aIdx = currentInstances.indexOf(a);
              const bIdx = currentInstances.indexOf(b);
              return getSortPriority(a, enrollmentStatuses[aIdx], aEscalation) -
                     getSortPriority(b, enrollmentStatuses[bIdx], bEscalation);
            })
            .map(inst => inst.instanceId);

          const sortOrderChanged = currentOrder.some((id, i) => id !== newOrder[i]);

          console.log(`[TicTacChain Update Path] Tier ${tierId} order check:`, {
            currentOrder,
            newOrder,
            sortOrderChanged
          });

          // Only update state if sort order actually changed
          if (!sortOrderChanged) {
            console.log(`[TicTacChain Update Path] No order change for tier ${tierId}, skipping state update`);
            return prev; // Return same reference, no update
          }

          console.log('[TicTacChain Update Path] Sort order changed, updating state');

          // Create the new array with updated data and sorted order
          const updatedInstances = currentInstances.map((instance, i) => {
            const escalationData = escalationResults.find(r => r.instanceId === instance.instanceId);
            const needsUpdate =
              instance.isEnrolled !== enrollmentStatuses[i] ||
              (escalationData && (
                instance.hasEscalations !== escalationData.hasEscalations ||
                instance.escL2Count !== escalationData.escL2Count ||
                instance.escL3Count !== escalationData.escL3Count ||
                JSON.stringify(instance.firstML3Match) !== JSON.stringify(escalationData.firstML3Match)
              ));

            if (needsUpdate) {
              return {
                ...instance,
                isEnrolled: enrollmentStatuses[i],
                ...(escalationData && {
                  hasEscalations: escalationData.hasEscalations,
                  escL2Count: escalationData.escL2Count,
                  escL3Count: escalationData.escL3Count,
                  firstML3Match: escalationData.firstML3Match
                })
              };
            }
            return instance;
          });

          updatedInstances.sort((a, b) => getSortPriority(a) - getSortPriority(b));

          console.log(`[TicTacChain Update Path] Setting new order:`, updatedInstances.map(inst => inst.instanceId));

          return { ...prev, [tierId]: updatedInstances };
        });
      } else {
        // Fallback: fetch full tier data if not already loaded
        const tierConfig = TIER_CONFIG[tierId];
        if (!tierConfig) {
          if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: false }));
          return;
        }

        const { playerCount, instanceCount, entryFee } = tierConfig;

        // Fetch all tournament data using multicall
        const provider = readContract.runner?.provider || readContract.provider;
        const results = await batchFetchTournaments(readContract, tierId, instanceCount, provider);

        const statuses = [];
        const enrolledCounts = [];
        const currentRounds = [];
        const enrollmentTimeouts = [];
        const hasStartedViaTimeouts = [];

        for (const result of results) {
          if (!result.success) break;
          statuses.push(result.status);
          enrolledCounts.push(result.enrolledCount);
          currentRounds.push(result.currentRound);
          enrollmentTimeouts.push(result.enrollmentTimeout);
          hasStartedViaTimeouts.push(result.hasStartedViaTimeout);
        }

        const metadata = {
          playerCount,
          instanceCount: statuses.length,
          entryFee,
          statuses,
          enrolledCounts,
          currentRounds,
          enrollmentTimeouts,
          hasStartedViaTimeouts
        };

        if (!metadata || metadata.instanceCount === 0) {
          if (!silentUpdate) setTierLoading(prev => ({ ...prev, [tierId]: false }));
          return;
        }

        let enrollmentStatuses = [];
        if (currentAccount) {
          enrollmentStatuses = await batchFetchIsEnrolled(readContract, tierId, metadata.instanceCount, currentAccount, provider);
        } else {
          enrollmentStatuses = Array(metadata.instanceCount).fill(false);
        }

        const instances = [];
        for (let i = 0; i < metadata.instanceCount; i++) {
          const prizePoolETH = (metadata.enrolledCounts[i] * parseFloat(metadata.entryFee) * 0.9).toFixed(4);

          instances.push({
            tierId,
            instanceId: i,
            status: metadata.statuses[i],
            enrolledCount: metadata.enrolledCounts[i],
            currentRound: metadata.currentRounds[i],
            maxPlayers: metadata.playerCount,
            entryFee: metadata.entryFee,
            prizePool: prizePoolETH,
            isEnrolled: enrollmentStatuses[i],
            enrollmentTimeout: metadata.enrollmentTimeouts[i],
            hasStartedViaTimeout: metadata.hasStartedViaTimeouts[i],
            tournamentStatus: metadata.statuses[i],
            hasEscalations: false, // Will be populated below
            escL2Count: 0,
            escL3Count: 0,
            firstML3Match: null // Will be populated below { round: X, match: Y }
          });
        }

        // Debug: Log status of all instances
        console.log(`[TicTacChain Main Path] Tier ${tierId} - All instance statuses:`, instances.map(inst => ({
          id: inst.instanceId,
          status: inst.tournamentStatus,
          round: inst.currentRound,
          enrolled: inst.enrolledCount
        })));

        // Check for escalations in active tournaments (any active tournament, regardless of round)
        const activeTournamentsMain = instances.filter(inst => inst.tournamentStatus === 1);
        console.log(`[TicTacChain Main Path] Tier ${tierId} - Total instances: ${instances.length}, Active tournaments: ${activeTournamentsMain.length}`, activeTournamentsMain.map(t => ({ id: t.instanceId, round: t.currentRound })));

        const escalationChecks = activeTournamentsMain
          .map(inst =>
            checkInstanceEscalations(readContract, inst.tierId, inst.instanceId, inst.currentRound, provider)
              .then(escalationData => ({ instanceId: inst.instanceId, ...escalationData }))
              .catch(err => {
                console.debug(`Failed to check escalations for instance ${inst.instanceId}:`, err);
                return { instanceId: inst.instanceId, hasEscalations: false, escL2Count: 0, escL3Count: 0, firstML3Match: null };
              })
          );

        const escalationResults = await Promise.all(escalationChecks);
        console.log('[TicTacChain Main Path] Escalation results:', escalationResults);

        // Update instances with escalation data
        for (const result of escalationResults) {
          const instance = instances.find(inst => inst.instanceId === result.instanceId);
          if (instance) {
            instance.hasEscalations = result.hasEscalations;
            instance.escL2Count = result.escL2Count;
            instance.escL3Count = result.escL3Count;
            instance.firstML3Match = result.firstML3Match;
            console.log(`[TicTacChain] Updated instance ${instance.instanceId} with escalations:`, {
              hasEscalations: instance.hasEscalations,
              escL2Count: instance.escL2Count,
              escL3Count: instance.escL3Count,
              firstML3Match: instance.firstML3Match
            });
          }
        }

        const getSortPriority = (instance) => {
          const { tournamentStatus, isEnrolled, enrolledCount, hasEscalations, escL3Count } = instance;

          // Debug log for each instance
          const debugInfo = {
            instanceId: instance.instanceId,
            tournamentStatus,
            isEnrolled,
            enrolledCount,
            hasEscalations,
            escL3Count
          };

          // 1. Tournaments where player is enrolled and tournament is active
          if (tournamentStatus === 1 && isEnrolled) {
            console.log('[getSortPriority Main] Priority 1:', debugInfo);
            return 1;
          }

          // 2. Tournaments where player is enrolled and tournament is not active
          if (tournamentStatus === 0 && isEnrolled) {
            console.log('[getSortPriority Main] Priority 2:', debugInfo);
            return 2;
          }

          // 3. Tournaments waiting for players but player isn't enrolled
          if (tournamentStatus === 0 && !isEnrolled && enrolledCount > 0) {
            console.log('[getSortPriority Main] Priority 3:', debugInfo);
            return 3;
          }

          // 4. (Skip to maintain numbering requested by user)

          // 5. Tournaments with EL2 or ML3 escalations available/active
          if (tournamentStatus === 1 && !isEnrolled && hasEscalations) {
            console.log('[getSortPriority Main] Priority 5 (ML3!):', debugInfo);
            return 5;
          }

          // 6. Tournaments with no enrolled players
          if (tournamentStatus === 0 && !isEnrolled && enrolledCount === 0) {
            console.log('[getSortPriority Main] Priority 6:', debugInfo);
            return 6;
          }

          // 7. Everything else (active tournaments without enrollment and no escalations)
          console.log('[getSortPriority Main] Priority 7 (default):', debugInfo);
          return 7;
        };

        instances.sort((a, b) => getSortPriority(a) - getSortPriority(b));

        // Debug log sorting
        console.log('[TicTacChain Main Path] Sorted instances:', instances.map(inst => ({
          instanceId: inst.instanceId,
          priority: getSortPriority(inst),
          tournamentStatus: inst.tournamentStatus,
          isEnrolled: inst.isEnrolled,
          hasEscalations: inst.hasEscalations,
          escL3Count: inst.escL3Count
        })));

        setTierInstances(prev => ({ ...prev, [tierId]: instances }));
      }
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

  // Toggle tier expansion (no lazy loading - data already fetched on page load)
  const toggleTier = useCallback(async (tierId) => {
    const isCurrentlyExpanded = expandedTiersRef.current[tierId];
    const alreadyLoaded = tierInstancesRef.current[tierId];

    // Toggle expansion
    setExpandedTiers(prev => ({ ...prev, [tierId]: !prev[tierId] }));

    if (!isCurrentlyExpanded) {
      // When expanding, ensure visible count is set
      setVisibleInstancesCount(prev => ({ ...prev, [tierId]: prev[tierId] || 4 }));

      // If wallet is connected and we have instances, update enrollment status
      if (account && alreadyLoaded && alreadyLoaded.length > 0) {
        // Check if we need to update enrollment status
        const needsEnrollmentUpdate = alreadyLoaded.every(inst => !inst.isEnrolled);
        if (needsEnrollmentUpdate) {
          await fetchTierInstances(tierId);
        }
      }
    }
  }, [account, fetchTierInstances]);

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

  // Comprehensive refresh for Player Activity panel
  // Fetches fresh multicall data for ALL tiers (regardless of loaded/expanded state)
  const handlePlayerActivityRefresh = useCallback(async () => {
    if (!contract || !account) return;

    console.log('[PlayerActivity Refresh] Refreshing player activity via event-based polling');

    // Trigger player activity data refetch (which now uses event-based polling)
    // This will:
    // 1. Query TournamentEnrolled events for the player
    // 2. Poll only the tier/instances from those events
    // 3. Update activity cards based on current state
    await playerActivity.refetch();
  }, [contract, account, playerActivity]);

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
            const parsedMatch = parseTicTacToeMatch(matchData, tierMatchTime);

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
              completionReason: 0,
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

  // Handle tournament enrollment
  const handleEnroll = useCallback(async (tierId, instanceId, entryFee) => {
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
  }, [contract, account, playerActivity, refreshTournamentBracket, matchTimePerPlayer, refreshAfterAction]);

  // Handle force start tournament (with timeout tier system)
  const handleManualStart = useCallback(async (tierId, instanceId) => {
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

      // Only exit tournament view if solo enroller (they win immediately)
      // Otherwise keep them on the bracket view
      if (enrolledCount === 1) {
        setViewingTournament(null);
      }
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
  }, [contract, account, fetchLeaderboard, refreshAfterAction]);

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
  const handleClaimAbandonedPool = useCallback(async (tierId, instanceId) => {
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
  }, [contract, account, fetchLeaderboard, refreshAfterAction]);

  // Handle entering tournament (fetch and display bracket)
  const handleEnterTournament = useCallback(async (tierId, instanceId, ml3Match = null) => {
    if (!contract) return;

    try {
      setTournamentsLoading(true);

      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId, matchTimePerPlayer);
      if (bracketData) {
        setViewingTournament(bracketData);

        // Push to browser history for proper back button behavior
        navigate('/tictactoe', {
          replace: false,
          state: { view: 'bracket', tierId, instanceId, from: location.state?.view || 'landing' }
        });

        // Scroll to tournament bracket after rendering
        setTimeout(() => {
          if (tournamentBracketRef.current) {
            tournamentBracketRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // Collapse activity panel after scrolling
          if (collapseActivityPanelRef.current) {
            collapseActivityPanelRef.current();
          }

          // If ML3 match specified, scroll to that match
          if (ml3Match) {
            setTimeout(() => {
              const matchElement = document.getElementById(`r${ml3Match.round}m${ml3Match.match}`);
              if (matchElement) {
                matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a brief highlight effect
                matchElement.style.transition = 'box-shadow 0.3s ease-in-out';
                matchElement.style.boxShadow = '0 0 20px 5px rgba(239, 68, 68, 0.6)';
                setTimeout(() => {
                  matchElement.style.boxShadow = '';
                }, 2000);
              }
            }, 800); // Wait for bracket scroll to complete
          }

          // Additional scroll to last instance section if it exists
          setTimeout(() => {
            const lastInstanceSection = document.getElementById('last-instance');
            if (lastInstanceSection) {
              lastInstanceSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }, 100);
      }

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error loading tournament bracket:', error);
      alert(`Error loading tournament: ${error.message}`);
      setTournamentsLoading(false);
    }
  }, [contract, refreshTournamentBracket, matchTimePerPlayer, navigate, location.state?.view, tournamentBracketRef, collapseActivityPanelRef]);

  // Fetch move history from blockchain events
  const fetchMoveHistory = useCallback(async (contractInstance, tierId, instanceId, roundNumber, matchNumber) => {
    try {
      // Get match data first
      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseTicTacToeMatch(matchData, matchTimePerPlayer);
      const player1 = parsedMatch.player1;
      const player2 = parsedMatch.player2;
      const firstPlayer = parsedMatch.firstPlayer;

      // OPTIMIZATION: Use the moves field from getMatch() instead of event queries
      // The updated ABI now includes moves in the match data
      let movesString = matchData.moves || matchData.common.moves || '';

      // Check if match data has been cleared (happens when tournament ends)
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const isMatchCleared = player1.toLowerCase() === zeroAddress;

      // FALLBACK: Fetch from getPlayerMatches() if:
      // 1. Match data is cleared (tournament ended), OR
      // 2. Match is completed (to ensure we have the final move for both players)
      const isMatchCompleted = parsedMatch.matchStatus === 2;
      if (isMatchCleared || isMatchCompleted) {
        console.log('[FetchMoveHistory] Fetching from getPlayerMatches() - cleared:', isMatchCleared, 'completed:', isMatchCompleted);

        try {
          const allMatches = await contractInstance.getPlayerMatches();

          // Find the specific match (search from end - recent matches last)
          // Also verify that player addresses are valid
          let foundMatch = null;
          for (let i = allMatches.length - 1; i >= 0; i--) {
            const m = allMatches[i];
            const tournamentMatches =
              Number(m.tierId) === tierId &&
              Number(m.instanceId) === instanceId &&
              Number(m.roundNumber) === roundNumber &&
              Number(m.matchNumber) === matchNumber;

            // Verify that the match record has valid player addresses (not zero addresses)
            const m1Lower = m.player1?.toLowerCase() || '';
            const m2Lower = m.player2?.toLowerCase() || '';
            const hasValidPlayers =
              m1Lower !== zeroAddress.toLowerCase() &&
              m2Lower !== zeroAddress.toLowerCase() &&
              m1Lower !== '' && m2Lower !== '';

            if (tournamentMatches && hasValidPlayers) {
              foundMatch = m;
              break;
            }
          }

          if (foundMatch) {
            // Use moves from getPlayerMatches() - this is the authoritative source for completed matches
            // Ensures both winner and loser see the complete final move history
            movesString = foundMatch.moves || '';
            console.log('[FetchMoveHistory] Found moves from getPlayerMatches():', movesString.length, 'chars');
          } else {
            console.warn('[FetchMoveHistory] Match not found in getPlayerMatches() with valid player addresses');
          }
        } catch (err) {
          console.warn('[FetchMoveHistory] Failed to fetch from getPlayerMatches():', err);
        }
      }

      console.log('[FetchMoveHistory] Moves string:', movesString ? `${movesString.length} chars` : 'empty');

      if (movesString && movesString.length > 0) {
        try {
          // Parse moves string for Tic-Tac-Toe: each move is 1 byte (cell index 0-8)
          const moves = [];

          for (let i = 0; i < movesString.length; i++) {
            const cellIndex = movesString.charCodeAt(i);
            // Validate that this is a valid cell index (0-8)
            if (cellIndex >= 0 && cellIndex <= 8) {
              moves.push(cellIndex);
            }
          }

          // Convert to display format
          // X always goes first (even indices 0, 2, 4...), O goes second (odd indices 1, 3, 5...)
          // firstPlayer is the one who moves first and should be X
          const history = moves.map((cellIndex, idx) => {
            const isFirstPlayerMove = idx % 2 === 0; // Even indices are first player moves
            const movePlayer = isFirstPlayerMove ? firstPlayer : (firstPlayer === player1 ? player2 : player1);
            return {
              player: isFirstPlayerMove ? 'X' : 'O',
              cell: cellIndex,
              address: movePlayer
            };
          });

          console.log('[FetchMoveHistory] Parsed moves from getMatch():', history.length);
          return history;
        } catch (parseError) {
          console.warn('[FetchMoveHistory] Failed to parse moves string:', parseError);
        }
      }

      // No moves found - return empty array
      console.log('[FetchMoveHistory] No moves available');
      return [];
    } catch (error) {
      console.error('Error fetching move history:', error);
      return [];
    }
  }, []);

  // Refresh match data from contract
  const refreshMatchData = useCallback(async (contractInstance, userAccount, matchInfo, totalMatchTime) => {
    try {
      const { tierId, instanceId, roundNumber, matchNumber } = matchInfo;

      // Fetch per-tier timeout config to get correct match time
      const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, tierId, totalMatchTime, TIER_CONFIG[tierId]);
      const tierMatchTime = timeoutConfig?.matchTimePerPlayer ?? totalMatchTime;

      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseTicTacToeMatch(matchData, tierMatchTime);

      const {
        player1, player2, firstPlayer, currentTurn, winner, loser, board, matchStatus, completionReason,
        startTime, lastMoveTime, lastMoveTimestamp
      } = parsedMatch;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const isMatchInitialized =
        player1.toLowerCase() !== zeroAddress &&
        player2.toLowerCase() !== zeroAddress;

      // OPTIMIZATION: If contract returns cleared data (zero addresses + empty board),
      // fetch from getPlayerMatches() instead of event queries
      const isBoardEmpty = board.every(cell => cell === 0);
      if (!isMatchInitialized && isBoardEmpty) {
        console.log('[refreshMatchData] Match data cleared, fetching from getPlayerMatches()');

        try {
          // Fetch all player matches (includes completed matches with full data)
          const allMatches = await contractInstance.getPlayerMatches();

          console.log('[refreshMatchData] Fetched player matches:', allMatches.length);

          // Find the match that matches our tournament context
          // Search from end since recent matches are last
          let foundMatch = null;
          for (let i = allMatches.length - 1; i >= 0; i--) {
            const m = allMatches[i];
            if (Number(m.tierId) === tierId &&
                Number(m.instanceId) === instanceId &&
                Number(m.roundNumber) === roundNumber &&
                Number(m.matchNumber) === matchNumber) {
              foundMatch = m;
              break;
            }
          }

          // Fallback: Match by player addresses and approximate timestamp
          if (!foundMatch && matchInfo.player1 && matchInfo.player2) {
            const p1Lower = matchInfo.player1.toLowerCase();
            const p2Lower = matchInfo.player2.toLowerCase();
            const matchStartTime = matchInfo.startTime;

            const candidateMatches = allMatches.filter(m => {
              const m1Lower = m.player1.toLowerCase();
              const m2Lower = m.player2.toLowerCase();
              const playersMatch = (m1Lower === p1Lower && m2Lower === p2Lower) ||
                                   (m1Lower === p2Lower && m2Lower === p1Lower);

              if (!playersMatch) return false;

              if (matchStartTime) {
                const timeDiff = Math.abs(Number(m.startTime) - matchStartTime);
                return timeDiff < 3600; // 1 hour tolerance
              }

              return true;
            });

            if (candidateMatches.length > 0) {
              foundMatch = [...candidateMatches].sort((a, b) => Number(b.startTime) - Number(a.startTime))[0];
              console.log('[refreshMatchData] Found match by player addresses and timestamp');
            }
          }

          if (foundMatch) {
            console.log('[refreshMatchData] Found matching completed match:', {
              tierId: Number(foundMatch.tierId),
              instanceId: Number(foundMatch.instanceId),
              round: Number(foundMatch.roundNumber),
              match: Number(foundMatch.matchNumber),
              winner: foundMatch.winner,
              completionReason: Number(foundMatch.completionReason),
              movesLength: foundMatch.moves?.length || 0
            });

            // Unpack the board from packedBoard (2 bits per cell, 9 cells)
            const unpackBoard = (packed) => {
              const boardArray = [];
              let p = BigInt(packed);
              for (let j = 0; j < 9; j++) {
                boardArray.push(Number(p & 3n));
                p = p >> 2n;
              }
              return boardArray;
            };
            const matchBoard = unpackBoard(foundMatch.packedBoard);

            const matchCompletionReason = Number(foundMatch.completionReason);
            const winnerLower = foundMatch.winner.toLowerCase();
            const p1Lower = foundMatch.player1.toLowerCase();
            const matchLoser = isDraw(matchCompletionReason) ? zeroAddress :
              (winnerLower === p1Lower ? foundMatch.player2 : foundMatch.player1);

            return {
              ...matchInfo,
              matchStatus: 2,
              winner: foundMatch.winner,
              loser: matchLoser,
              board: matchBoard,
              isYourTurn: false,
              completedFromEventPoll: true,
              completionReason: matchCompletionReason,
              cachedMoves: foundMatch.moves || ''
            };
          }

          console.log('[refreshMatchData] No matching completed match found in getPlayerMatches(), continuing to poll');
        } catch (err) {
          console.error('[refreshMatchData] Error fetching from getPlayerMatches():', err);
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

          // Only include events that occurred after match start with the correct players
          const currentMatchEvents = eventsWithTimestamps
            .filter(({ event, timestamp }) => {
              const eventPlayer = event.args.player.toLowerCase();
              const isCorrectPlayer = eventPlayer === player1.toLowerCase() || eventPlayer === player2.toLowerCase();
              return timestamp >= matchStartTime && isCorrectPlayer;
            })
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
        firstPlayer,
        currentTurn,
        winner,
        loser,
        board: boardState,
        matchStatus,
        completionReason,
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
      const parsedMatch = parseTicTacToeMatch(matchData, tierConfig.timeouts.matchTimePerPlayer);

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

        // Push to browser history for proper back button behavior
        navigate('/tictactoe', {
          replace: false,
          state: {
            view: 'match',
            tierId,
            instanceId,
            roundNumber,
            matchNumber,
            from: location.state?.view || 'bracket'
          }
        });

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
      const parsedMatch = parseTicTacToeMatch(matchData, tierConfig.timeouts.matchTimePerPlayer);

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

    // Use browser back navigation
    navigate(-1);

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

  // Handle closing the active match alert modal
  const handleMatchAlertClose = () => {
    setShowMatchAlert(false);
    setAlertMatch(null);
  };

  // Check if player has a next active match in the next round
  const checkForNextActiveMatch = useCallback(async () => {
    if (!contract || !account || !currentMatch) {
      setNextActiveMatch(null);
      return;
    }

    try {
      const { tierId, instanceId, roundNumber } = currentMatch;
      const nextRoundNumber = roundNumber + 1;

      // Get tournament info to determine total rounds
      const tournamentInfo = await contract.getTournamentInfo(tierId, instanceId);
      const tierConfig = TIER_CONFIG[tierId];
      const playerCount = tierConfig.playerCount;
      const totalRounds = Math.ceil(Math.log2(playerCount));

      // If we're at the final round, no next match
      if (nextRoundNumber >= totalRounds) {
        setNextActiveMatch(null);
        return;
      }

      // Check all matches in the next round for this player
      const matchesInNextRound = Math.ceil(playerCount / Math.pow(2, nextRoundNumber + 1));

      for (let matchNumber = 0; matchNumber < matchesInNextRound; matchNumber++) {
        try {
          const matchData = await contract.getMatch(tierId, instanceId, nextRoundNumber, matchNumber);
          const parsedMatch = parseTicTacToeMatch(matchData, matchTimePerPlayer);

          // Check if this match is active (status 1) and player is in it
          if (parsedMatch.matchStatus === 1) {
            const isPlayerInMatch =
              parsedMatch.player1.toLowerCase() === account.toLowerCase() ||
              parsedMatch.player2.toLowerCase() === account.toLowerCase();

            if (isPlayerInMatch) {
              setNextActiveMatch({
                tierId,
                instanceId,
                roundNumber: nextRoundNumber,
                matchNumber
              });
              return;
            }
          }
        } catch (err) {
          // Match not found or error, continue to next
          continue;
        }
      }

      // No active match found in next round
      setNextActiveMatch(null);
    } catch (error) {
      console.error('Error checking for next active match:', error);
      setNextActiveMatch(null);
    }
  }, [contract, account, currentMatch, matchTimePerPlayer]);

  // Handle entering the next active match
  const handleEnterNextMatch = useCallback(() => {
    if (nextActiveMatch) {
      handlePlayMatch(
        nextActiveMatch.tierId,
        nextActiveMatch.instanceId,
        nextActiveMatch.roundNumber,
        nextActiveMatch.matchNumber
      );
    }
  }, [nextActiveMatch]);

  // Handle returning to bracket
  const handleReturnToBracket = useCallback(() => {
    closeMatch();
  }, [closeMatch]);


  // Go back from tournament bracket to tournaments list
  const handleBackToTournaments = async () => {
    setViewingTournament(null);
    setSearchParams({}); // Clear URL params when going back

    // Use browser back navigation
    navigate(-1);

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

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleLocationChange = async () => {
      const state = location.state;

      if (!state || !state.view) {
        // No state means we're at the landing page
        if (currentMatch || viewingTournament) {
          setCurrentMatch(null);
          setViewingTournament(null);
        }
        return;
      }

      if (state.view === 'bracket' && state.tierId !== undefined && state.instanceId !== undefined) {
        // Navigate to bracket view
        const needsUpdate = !viewingTournament ||
          viewingTournament.tierId !== state.tierId ||
          viewingTournament.instanceId !== state.instanceId;

        if (needsUpdate && contract) {
          setCurrentMatch(null);
          const bracketData = await refreshTournamentBracket(contract, state.tierId, state.instanceId, matchTimePerPlayer);
          if (bracketData) {
            setViewingTournament(bracketData);
          }
        } else if (currentMatch) {
          // Just clear the match if we're already viewing the right bracket
          setCurrentMatch(null);
        }
      } else if (state.view === 'match' && state.tierId !== undefined && state.instanceId !== undefined && state.roundNumber !== undefined && state.matchNumber !== undefined) {
        // Navigate to match view - need to manually load match without pushing history again
        const needsUpdate = !currentMatch ||
          currentMatch.tierId !== state.tierId ||
          currentMatch.instanceId !== state.instanceId ||
          currentMatch.roundNumber !== state.roundNumber ||
          currentMatch.matchNumber !== state.matchNumber;

        if (needsUpdate && contract && account) {
          try {
            setMatchLoading(true);
            const tournamentInfo = await contract.getTournamentInfo(state.tierId, state.instanceId);
            const tierConfig = TIER_CONFIG[state.tierId];
            const playerCount = tierConfig.playerCount;
            const prizePool = tournamentInfo[3];

            const matchData = await contract.getMatch(state.tierId, state.instanceId, state.roundNumber, state.matchNumber);
            const parsedMatch = parseTicTacToeMatch(matchData, tierConfig.timeouts.matchTimePerPlayer);

            const updated = await refreshMatchData(contract, account, {
              tierId: state.tierId,
              instanceId: state.instanceId,
              roundNumber: state.roundNumber,
              matchNumber: state.matchNumber,
              player1: parsedMatch.player1,
              player2: parsedMatch.player2,
              playerCount,
              prizePool
            }, matchTimePerPlayer);

            if (updated) {
              setCurrentMatch(updated);
              previousBoardRef.current = [...updated.board];
              const history = await fetchMoveHistory(contract, state.tierId, state.instanceId, state.roundNumber, state.matchNumber);
              setMoveHistory(history);
            }
            setMatchLoading(false);
          } catch (error) {
            console.error('Error loading match from history:', error);
            setMatchLoading(false);
          }
        }
      } else if (state.view === 'landing') {
        // Navigate to landing page
        if (currentMatch || viewingTournament) {
          setCurrentMatch(null);
          setViewingTournament(null);
        }
      }
    };

    handleLocationChange();
  }, [location.state?.view, location.state?.tierId, location.state?.instanceId, location.state?.roundNumber, location.state?.matchNumber]);


  // Update enrollment status for all loaded tiers when account changes
  useEffect(() => {
    const updateEnrollmentStatuses = async () => {
      if (!contract || !account) return;

      const loadedTierIds = Object.keys(tierInstancesRef.current).map(Number);
      if (loadedTierIds.length === 0) return;

      console.log('Updating enrollment statuses for tiers:', loadedTierIds);

      // Update enrollment status for all loaded tiers
      for (const tierId of loadedTierIds) {
        await fetchTierInstances(tierId, contract, account, null, true);
      }
    };

    updateEnrollmentStatuses();
  }, [account, contract, fetchTierInstances]);


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

  // Track tab visibility for home page polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track tier list scroll visibility with IntersectionObserver
  useEffect(() => {
    if (!tierListRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTierListVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // Consider visible if at least 10% is in viewport
    );

    observer.observe(tierListRef.current);
    return () => observer.disconnect();
  }, []);

  // Poll tier metadata and expanded tier instances every 5 seconds on home page - only when visible
  useEffect(() => {
    // Only poll when on home page (not viewing tournament or match)
    if (currentMatch || viewingTournament || !contract) {
      console.log('[Home Page Polling] Paused - Not on home page', {
        currentMatch: !!currentMatch,
        viewingTournament: !!viewingTournament,
        contract: !!contract
      });
      return;
    }

    // Only poll if tier list is visible and tab is active
    if (!isTierListVisible || !isTabActive) {
      console.log('[Home Page Polling] Paused - User navigated away', {
        isTierListVisible,
        isTabActive
      });
      return;
    }

    console.log('[Home Page Polling] Starting - Tier list visible and tab active');

    const pollHomePageData = async () => {
      console.log('[Home Page Polling] Executing poll...');
      try {
        // Fetch tier metadata silently (no loading indicators)
        await fetchTierMetadata(null, true);

        // Re-fetch instances for expanded tiers silently
        const expandedTierIds = Object.keys(expandedTiers)
          .filter(id => expandedTiers[id])
          .map(id => parseInt(id));

        if (expandedTierIds.length > 0) {
          console.log('[Home Page Polling] Fetching instances for expanded tiers:', expandedTierIds);
        }

        for (const tierId of expandedTierIds) {
          await fetchTierInstances(tierId, null, null, null, true);
        }
        console.log('[Home Page Polling] Poll completed');
      } catch (err) {
        console.error('[Home Page Polling] Error polling home page data:', err);
      }
    };

    // Initial poll
    pollHomePageData();

    // Set up polling interval - runs every 5 seconds (changed from 10s)
    const pollInterval = setInterval(pollHomePageData, 5000);

    return () => {
      console.log('[Home Page Polling] Cleanup - Stopping polling');
      clearInterval(pollInterval);
    };
  }, [currentMatch, viewingTournament, contract, expandedTiers, fetchTierMetadata, fetchTierInstances, isTierListVisible, isTabActive]);


  // Refresh leaderboard on tab focus
  useEffect(() => {
    if (!contract) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLeaderboard(true); // Silent update when tab becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
          // If match just completed (detected via event query in refreshMatchData)
          if (updatedMatch.matchStatus === 2) {
            console.log('[Polling] Match completion detected, updating state and showing modal');

            // CRITICAL: Fetch final move history from getPlayerMatches()
            // This ensures the loser sees the opponent's final winning move
            try {
              console.log('[Polling] Fetching final move history for completed match...');
              const finalHistory = await fetchMoveHistory(
                contractInstance,
                match.tierId,
                match.instanceId,
                match.roundNumber,
                match.matchNumber
              );
              if (finalHistory && finalHistory.length > 0) {
                setMoveHistory(finalHistory);
                console.log('[Polling] Updated final move history:', finalHistory.length, 'moves');
              }
            } catch (historyErr) {
              console.warn('[Polling] Failed to fetch final move history:', historyErr);
            }

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
              const reasonNum = updatedMatch.completionReason || 0;
              const isMatchDraw = isDraw(reasonNum);
              const userWon = !isMatchDraw && updatedMatch.winner.toLowerCase() === userAccount.toLowerCase();

              let resultType = 'lose';
              if (isMatchDraw) {
                resultType = 'draw';
              } else if (userWon) {
                resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_win' : 'win';
              } else {
                resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_lose' : 'lose';
              }

              console.log('[Polling] Setting match end result:', resultType, 'with completion reason:', reasonNum);
              setMatchEndResult({ result: resultType, completionReason: reasonNum });
              setMatchEndWinner(updatedMatch.winner);
              setMatchEndLoser(updatedMatch.loser);

              // Check for next active match if user won
              if (userWon) {
                setTimeout(() => checkForNextActiveMatch(), 500);
              }
            }

            return; // Stop polling
          }

          // Check if board changed to update move history
          const boardChanged = previousBoardRef.current &&
            JSON.stringify(previousBoardRef.current) !== JSON.stringify(updatedMatch.board);

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
              // matchStatus, winner, loser, completionReason are preserved from prev (event-driven)
            };
          });

          // If board changed, refresh move history
          if (boardChanged) {
            console.log('[Polling] Board changed, refreshing move history');
            const history = await fetchMoveHistory(
              contractInstance,
              match.tierId,
              match.instanceId,
              match.roundNumber,
              match.matchNumber
            );
            setMoveHistory(history);
          }

          // Update board reference
          previousBoardRef.current = [...updatedMatch.board];
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

      {/* Tournament Invitation Modal - shown when URL params present but not connected */}
      <InviteModal
        tournamentParams={urlTournamentParams}
        onConnect={connectWallet}
        gameName="Tic-Tac-Toe"
        playerCount={urlTournamentParams ? TIER_CONFIG[urlTournamentParams.tierId]?.playerCount : 2}
      />

      {/* Bottom Navigation Bar - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto">
        {/* Solid background bar on mobile */}
        <div className="md:hidden bg-gradient-to-b from-slate-800 to-slate-900 border-t border-purple-400/30 px-4 py-2.5 flex items-center justify-between">
          {/* Games Card */}
          <GamesCard
            currentGame="tictactoe"
            onHeightChange={setGamesCardHeight}
            isExpanded={expandedPanel === 'games'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')}
          />

          {/* Player Activity Component */}
          <PlayerActivity
            activity={playerActivity.data}
            loading={playerActivity.loading}
            syncing={playerActivity.syncing}
            contract={contract}
            account={account}
            onEnterMatch={handlePlayMatch}
            onEnterTournament={handleEnterTournament}
            onRefresh={handlePlayerActivityRefresh}
            onDismissMatch={playerActivity.dismissMatch}
            gameName="tictactoe"
            gameEmoji="✖️"
            gamesCardHeight={gamesCardHeight}
            onHeightChange={setPlayerActivityHeight}
            onCollapse={(collapseFn) => { collapseActivityPanelRef.current = collapseFn; }}
            isExpanded={expandedPanel === 'playerActivity'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            tierConfig={TIER_CONFIG}
            disabled={!account}
            showTooltip={activeTooltip === 'playerActivity'}
            onShowTooltip={() => setActiveTooltip('playerActivity')}
            onHideTooltip={() => setActiveTooltip(null)}
          />

          {/* Match History Card */}
          <RecentMatchesCard
            contract={contract}
            account={account}
            gameName="tictactoe"
            gameEmoji="✖️"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={setRecentMatchesCardHeight}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={TIER_CONFIG}
            disabled={!account}
            showTooltip={activeTooltip === 'recentMatches'}
            onShowTooltip={() => setActiveTooltip('recentMatches')}
            onHideTooltip={() => setActiveTooltip(null)}
            onNavigateToTournament={handleEnterTournament}
          />

          {/* Community Raffle Card */}
          <CommunityRaffleCard
            raffleInfo={raffleInfo}
            raffleHistory={raffleHistory}
            account={account}
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            recentMatchesCardHeight={recentMatchesCardHeight}
            onRefresh={fetchRaffleInfo}
            onFetchHistory={fetchRaffleHistory}
            onTriggerRaffle={executeRaffle}
            syncing={raffleSyncing}
            isExpanded={expandedPanel === 'communityRaffle'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'communityRaffle' ? null : 'communityRaffle')}
            disabled={!account}
            showTooltip={activeTooltip === 'communityRaffle'}
            onShowTooltip={() => setActiveTooltip('communityRaffle')}
            onHideTooltip={() => setActiveTooltip(null)}
          />
        </div>

        {/* Desktop positioning (hidden on mobile, shown on desktop with original behavior) */}
        <div className="hidden md:block">
          <GamesCard
            currentGame="tictactoe"
            onHeightChange={setGamesCardHeight}
            isExpanded={expandedPanel === 'games'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'games' ? null : 'games')}
          />

          <PlayerActivity
            activity={playerActivity.data}
            loading={playerActivity.loading}
            syncing={playerActivity.syncing}
            contract={contract}
            account={account}
            onEnterMatch={handlePlayMatch}
            onEnterTournament={handleEnterTournament}
            onRefresh={handlePlayerActivityRefresh}
            onDismissMatch={playerActivity.dismissMatch}
            gameName="tictactoe"
            gameEmoji="✖️"
            gamesCardHeight={gamesCardHeight}
            onHeightChange={setPlayerActivityHeight}
            onCollapse={(collapseFn) => { collapseActivityPanelRef.current = collapseFn; }}
            isExpanded={expandedPanel === 'playerActivity'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'playerActivity' ? null : 'playerActivity')}
            tierConfig={TIER_CONFIG}
            disabled={!account}
            showTooltip={activeTooltip === 'playerActivity'}
            onShowTooltip={() => setActiveTooltip('playerActivity')}
            onHideTooltip={() => setActiveTooltip(null)}
          />

          {/* Match History Card */}
          <RecentMatchesCard
            contract={contract}
            account={account}
            gameName="tictactoe"
            gameEmoji="✖️"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={setRecentMatchesCardHeight}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={TIER_CONFIG}
            disabled={!account}
            showTooltip={activeTooltip === 'recentMatches'}
            onShowTooltip={() => setActiveTooltip('recentMatches')}
            onHideTooltip={() => setActiveTooltip(null)}
            onNavigateToTournament={handleEnterTournament}
          />

          <CommunityRaffleCard
            raffleInfo={raffleInfo}
            raffleHistory={raffleHistory}
            account={account}
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            recentMatchesCardHeight={recentMatchesCardHeight}
            onRefresh={fetchRaffleInfo}
            onFetchHistory={fetchRaffleHistory}
            onTriggerRaffle={executeRaffle}
            syncing={raffleSyncing}
            isExpanded={expandedPanel === 'communityRaffle'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'communityRaffle' ? null : 'communityRaffle')}
            disabled={!account}
            showTooltip={activeTooltip === 'communityRaffle'}
            onShowTooltip={() => setActiveTooltip('communityRaffle')}
            onHideTooltip={() => setActiveTooltip(null)}
          />
        </div>
      </div>

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
              id="connect-wallet-cta"
              onClick={connectWallet}
              disabled={loading}
              className={`inline-flex items-center gap-3 bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-10 py-5 rounded-2xl font-bold text-2xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed scroll-mt-6`}
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
            onEnterNextMatch={handleEnterNextMatch}
            onReturnToBracket={handleReturnToBracket}
            hasNextActiveMatch={!!nextActiveMatch}
            playerCount={viewingTournament?.playerCount || null}
            playerConfig={(() => {
              // Determine which player is the first player (X) and which is second (O)
              const isPlayer1First = currentMatch.firstPlayer?.toLowerCase() === currentMatch.player1?.toLowerCase();

              return {
                player1: {
                  icon: isPlayer1First ? 'X' : 'O',
                  label: isPlayer1First ? 'Player 1 (X)' : 'Player 1 (O)'
                },
                player2: {
                  icon: isPlayer1First ? 'O' : 'X',
                  label: isPlayer1First ? 'Player 2 (O)' : 'Player 2 (X)'
                }
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
                        <span className="text-purple-400"> → {getCellPositionName(move.cell)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : undefined}
          >
            {/* TicTacToe Board Grid */}
            <div className="w-full max-w-md mx-auto">
              <div className="grid grid-cols-3 gap-3">
                {(() => {
                  // Determine which cell value (1 or 2) corresponds to the firstPlayer
                  // Contract stores: cell = 1 for player1's moves, cell = 2 for player2's moves
                  // We want: X for firstPlayer's moves, O for second player's moves
                  const isPlayer1First = currentMatch.firstPlayer?.toLowerCase() === currentMatch.player1?.toLowerCase();
                  const firstPlayerCellValue = isPlayer1First ? 1 : 2;

                  return currentMatch.board.map((cell, idx) => {
                    // Determine what to display and color based on firstPlayer
                    const isFirstPlayerCell = cell === firstPlayerCellValue;
                    const cellSymbol = cell === 0 ? '' : (isFirstPlayerCell ? 'X' : 'O');
                    const cellColorClass = cell === 0
                      ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200'
                      : isFirstPlayerCell
                      ? 'bg-blue-500/40 text-blue-200'
                      : 'bg-pink-500/40 text-pink-200';

                    return (
                      <button
                        key={idx}
                        onClick={isSpectator ? null : () => handleCellClick(idx)}
                        disabled={isSpectator || matchLoading || currentMatch.matchStatus === 2 || !currentMatch.isYourTurn}
                        className={`aspect-square rounded-xl flex items-center justify-center text-4xl font-bold transition-all transform hover:scale-105 disabled:cursor-not-allowed ${cellColorClass}`}
                      >
                        {cellSymbol}
                      </button>
                    );
                  });
                })()}
              </div>
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
                  entryFee={viewingTournament?.entryFee ? ethers.formatEther(viewingTournament.entryFee) : '0'}
                  isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount}
                  contract={contract}
                />
              </div>
            ) : (
              // Show Tournament List
              <div className="mb-16" id="live-instances">
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
                    Compete on-chain with real ETH stakes
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
                  <div ref={tierListRef}>
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

                      // Count total enrolled players across all tournament instances
                      const totalEnrollments = allInstances.reduce((sum, inst) => sum + inst.enrolledCount, 0);

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
                                {totalEnrollments > 0 && (
                                  <span className="text-sm font-normal text-green-400">
                                    {totalEnrollments} current enrolment{totalEnrollments !== 1 ? 's' : ''}
                                  </span>
                                )}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ minHeight: instances.length > 0 ? 'auto' : '0' }}>
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
                                      onEnroll={handleEnroll}
                                      onEnter={handleEnterTournament}
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
                                      hasEscalations={tournament.hasEscalations}
                                      escL3Count={tournament.escL3Count}
                                      firstML3Match={tournament.firstML3Match}
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
                          href={`https://arbiscan.io/address/${ChessABIData.modules.chessRules}#code`}
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
        gameType="tictactoe"
        isVisible={!!matchEndResult}
        roundNumber={currentMatch?.roundNumber}
        totalRounds={currentMatch?.playerCount ? Math.ceil(Math.log2(currentMatch.playerCount)) : undefined}
        prizePool={currentMatch?.prizePool}
      />

      {/* Active Match Alert Modal */}
      {showMatchAlert && alertMatch && (
        <ActiveMatchAlertModal
          match={alertMatch}
          onClose={handleMatchAlertClose}
          onEnterMatch={handlePlayMatch}
        />
      )}

    </div>
  );
}
