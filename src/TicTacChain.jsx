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
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, DollarSign, Zap, History,
  CheckCircle, AlertCircle, ChevronDown, ArrowLeft, HelpCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import DUMMY_ABI from './TicTacChainABI.json';
import { CURRENT_NETWORK, CONTRACT_ADDRESSES, getAddressUrl, getExplorerHomeUrl } from './config/networks';
import { shortenAddress, formatTime as formatTimeHMS, getTierName, getEstimatedDuration, countInstancesByStatus } from './utils/formatters';
import { parseTicTacToeMatch } from './utils/matchDataParser';
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

// TicTacToe particle symbols (matching landing page style)
const TICTACTOE_SYMBOLS = ['✕', '○'];

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement, onManualStart, onClaimAbandonedPool, onEnroll, account, loading, syncDots, isEnrolled, entryFee, isFull }) => {
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
                {countdownExpired ? '0h 0m 0s' : formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        ) : null}
        renderEscalation={status === 0 && enrollmentTimeout ? () => {
          const now = Math.floor(Date.now() / 1000);
          const escalation1Start = Number(enrollmentTimeout.escalation1Start);
          const escalation2Start = Number(enrollmentTimeout.escalation2Start);
          const isEnrolledUser = account && enrolledPlayers?.some(addr => addr.toLowerCase() === account.toLowerCase());

          const timeToEsc1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
          const timeToEsc2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;
          const canForceStart = escalation1Start > 0 && now >= escalation1Start;
          const canAnyoneStart = escalation2Start > 0 && now >= escalation2Start;

          if (!(timeToEsc1 > 0 || timeToEsc2 > 0 || canForceStart || canAnyoneStart)) return null;

          const prizePoolETH = ethers.formatEther(prizePool);

          return (
            <>
              <div className="mt-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="text-orange-400" size={22} />
                  <h4 className="text-orange-300 font-bold text-lg">Tournament Waiting Period</h4>
                </div>

                <div className="space-y-3">
                  {/* Level 1: Early Start Option */}
                  <div className={`p-4 rounded-lg ${canForceStart ? 'bg-orange-500/30 border-2 border-orange-400' : 'bg-black/30 border border-orange-400/30'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${canForceStart ? 'text-orange-200' : 'text-orange-300/70'}`}>
                        Start Tournament Early
                      </span>
                      {timeToEsc1 > 0 && (
                        <span className="text-orange-300 font-mono text-sm bg-black/30 px-2 py-1 rounded">{formatTime(timeToEsc1)}</span>
                      )}
                    </div>
                  </div>

                  {/* Level 2: Abandonment Warning */}
                  <div className={`p-4 rounded-lg ${canAnyoneStart ? 'bg-red-500/30 border-2 border-red-400' : 'bg-black/30 border border-red-400/30'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${canAnyoneStart ? 'text-red-200' : 'text-red-300/70'}`}>
                        Abandonment Risk
                      </span>
                      {timeToEsc2 > 0 && (
                        <span className="text-red-300 font-mono text-sm bg-black/30 px-2 py-1 rounded">{formatTime(timeToEsc2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {canForceStart && isEnrolledUser && (
                <div className="mt-4 relative">
                  <button
                    onClick={() => onManualStart(tierId, instanceId)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Trophy size={20} />
                    {loading ? 'Starting Tournament...' : `Start Tournament Now with ${enrolledCount} Players`}
                  </button>
                  <a
                    href="#el1"
                    className="absolute top-3 right-3 text-orange-400 hover:text-orange-300 transition-colors"
                    title="Learn more about force-starting tournaments"
                  >
                    <HelpCircle size={16} />
                  </a>
                </div>
              )}

              {canAnyoneStart && !isEnrolledUser && (
                <div className="mt-4 relative">
                  <button
                    onClick={() => onClaimAbandonedPool(tierId, instanceId)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg"
                  >
                    <DollarSign size={20} />
                    {loading ? 'Claiming Pool...' : `Claim Abandoned Pool (${prizePoolETH} ETH)`}
                  </button>
                  <a
                    href="#el2"
                    className="absolute top-3 right-3 text-red-400 hover:text-red-300 transition-colors"
                    title="Learn more about claiming abandoned pools"
                  >
                    <HelpCircle size={16} />
                  </a>
                </div>
              )}
            </>
          );
        } : null}
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

export default function TicTacChain() {
  // Use network config instead of hardcoded values
  const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.TicTacChain;
  const EXPECTED_CHAIN_ID = CURRENT_NETWORK.chainId;
  const RPC_URL = import.meta.env.VITE_RPC_URL || CURRENT_NETWORK.rpcUrl;
  const EXPLORER_URL = getAddressUrl(CONTRACT_ADDRESS);

  // Helper to get read-only contract (bypasses MetaMask for read operations)
  const getReadOnlyContract = useCallback(() => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CONTRACT_ADDRESS, DUMMY_ABI, provider);
  }, [CONTRACT_ADDRESS, RPC_URL]);

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null); // This contract has signer for write ops

  // Time Configuration from Contract
  const [matchTimePerPlayer, setMatchTimePerPlayer] = useState(300); // Default 5 minutes
  const [timeIncrement, setTimeIncrement] = useState(0); // Default no increment
  const [escalationInterval, setEscalationInterval] = useState(60); // Default 60 seconds between escalations

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

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Connection Error State
  const [connectionError, setConnectionError] = useState(null); // null = no error, string = error message
  const [leaderboardError, setLeaderboardError] = useState(false);

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


  // Theme colors (single theme - classic blue/cyan)
  const currentTheme = {
    primary: 'rgba(0, 255, 255, 0.5)',
    secondary: 'rgba(255, 0, 255, 0.5)',
    gradient: 'linear-gradient(135deg, #0a0015 0%, #1a0030 50%, #0f001a 100%)',
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
        DUMMY_ABI,
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

  // Fetch time configuration from contract
  const fetchTimeConfiguration = useCallback(async (contractInstance) => {
    try {
      const matchTime = await contractInstance.getMatchTimePerPlayer();
      const increment = await contractInstance.getTimeIncrement();
      const escalationInt = await contractInstance.DEFAULT_ESCALATION_INTERVAL();

      setMatchTimePerPlayer(Number(matchTime));
      setTimeIncrement(Number(increment));
      setEscalationInterval(Number(escalationInt));

      console.log('Time configuration fetched:', {
        matchTimePerPlayer: Number(matchTime),
        timeIncrement: Number(increment),
        escalationInterval: Number(escalationInt)
      });
    } catch (error) {
      console.error('Error fetching time configuration (using defaults):', error);
      // Use defaults if contract doesn't support these functions yet
      setMatchTimePerPlayer(300);
      setTimeIncrement(0);
      setEscalationInterval(60);
    }
  }, []);

  // Load contract data (simplified - matches ConnectFour pattern)
  // Uses lazy loading: only fetch tier metadata initially, instances load on expand
  const loadContractData = async (contractInstance, isInitialLoad = false) => {
    try {
      // Fetch tier metadata only (fast) - instances load on tier expand
      await fetchTierMetadata(contractInstance);
      await fetchTimeConfiguration(contractInstance);
      await fetchLeaderboard(false);

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

  // LAZY LOADING: Fetch tier metadata only (fast initial load)
  // This gets basic tier info without detailed instance data
  const fetchTierMetadata = useCallback(async (contractInstance = null) => {
    const readContract = contractInstance || getReadOnlyContract();
    if (!readContract) {
      setConnectionError('Unable to connect to blockchain. Please check your network connection.');
      setMetadataLoading(false);
      return;
    }

    setMetadataLoading(true);
    setConnectionError(null); // Clear any previous error
    const metadata = {};
    let successfulFetches = 0;
    let totalAttempts = 0;

    // Fetch metadata for tiers 0-6
    for (let tierId = 0; tierId <= 6; tierId++) {
      totalAttempts++;
      try {
        // Parallel fetch tier config, entry fee, and overview
        const [tierConfig, fee, tierOverview] = await Promise.all([
          readContract.tierConfigs(tierId),
          readContract.ENTRY_FEES(tierId),
          readContract.getTierOverview(tierId)
        ]);

        successfulFetches++;
        const instanceCount = tierOverview[0].length;
        if (instanceCount === 0) continue;

        metadata[tierId] = {
          playerCount: Number(tierConfig.playerCount),
          instanceCount,
          entryFee: ethers.formatEther(fee),
          statuses: tierOverview[0].map(s => Number(s)),
          enrolledCounts: tierOverview[1].map(c => Number(c)),
          prizePools: tierOverview[2]
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
  }, [getReadOnlyContract]);

  // LAZY LOADING: Fetch detailed instances for a specific tier (called on expand)
  // Note: Uses functional state updates to avoid dependency on tierInstances/tierMetadata
  const fetchTierInstances = useCallback(async (tierId, contractInstance = null, userAccount = null, metadataOverride = null) => {
    const readContract = contractInstance || getReadOnlyContract();
    const currentAccount = userAccount ?? account;
    if (!readContract) return;

    setTierLoading(prev => ({ ...prev, [tierId]: true }));

    try {
      // Get metadata from override or fetch fresh
      let metadata = metadataOverride;
      if (!metadata) {
        const [tierConfig, fee, tierOverview] = await Promise.all([
          readContract.tierConfigs(tierId),
          readContract.ENTRY_FEES(tierId),
          readContract.getTierOverview(tierId)
        ]);
        metadata = {
          playerCount: Number(tierConfig.playerCount),
          instanceCount: tierOverview[0].length,
          entryFee: ethers.formatEther(fee),
          statuses: tierOverview[0].map(s => Number(s)),
          enrolledCounts: tierOverview[1].map(c => Number(c))
        };
      }

      if (!metadata || metadata.instanceCount === 0) {
        setTierLoading(prev => ({ ...prev, [tierId]: false }));
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

          instances.push({
            tierId,
            instanceId: i,
            status: metadata.statuses[i],
            enrolledCount: metadata.enrolledCounts[i],
            maxPlayers: metadata.playerCount,
            entryFee: metadata.entryFee,
            isEnrolled: isUserEnrolled,
            enrollmentTimeout: tournamentInfo.enrollmentTimeout,
            hasStartedViaTimeout: tournamentInfo.hasStartedViaTimeout,
            tournamentStatus: metadata.statuses[i]
          });
        } catch (err) {
          console.log(`Could not fetch instance ${i} for tier ${tierId}:`, err.message);
        }
      }

      setTierInstances(prev => ({ ...prev, [tierId]: instances }));
    } catch (error) {
      console.error(`Error fetching tier ${tierId} instances:`, error);
    }

    setTierLoading(prev => ({ ...prev, [tierId]: false }));
  }, [getReadOnlyContract, account]);

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
      await fetchTierInstances(tierId);
    } else {
      setExpandedTiers(prev => ({ ...prev, [tierId]: !prev[tierId] }));
    }
  }, [fetchTierInstances]);

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

      // First check if this instance exists
      const instanceCount = Number(await contract.INSTANCE_COUNTS(tierId));
      if (instanceId >= instanceCount) {
        alert(`Invalid instance ID. Tier ${tierId} only has ${instanceCount} instances (0-${instanceCount-1})`);
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
        errorMessage = `Tournament cannot be started. This may be due to:\n- Invalid tier ID (${tierId}) or instance ID (${instanceId})\n- Tournament already started\n- Contract state issue\n\nCheck console for full error details.`;
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

      // Get tier config for player count and entry fee
      const tierConfig = await contractInstance.tierConfigs(tierId);
      const playerCount = Number(tierConfig.playerCount);
      const entryFee = tierConfig.entryFee;

      // Extract timeout config using shared utility function
      const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, tierId, totalMatchTime);

      // Get enrolled players
      const enrolledPlayers = await contractInstance.getEnrolledPlayers(tierId, instanceId);

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
            const parsedMatch = parseTicTacToeMatch(matchData);

            // Use per-tier match time from contract config
            let player1TimeRemaining = tierMatchTime;
            let player2TimeRemaining = tierMatchTime;

            try {
              const timeData = await contractInstance.getCurrentTimeRemaining(tierId, instanceId, roundNum, matchNum);
              player1TimeRemaining = Number(timeData[0]);
              player2TimeRemaining = Number(timeData[1]);
            } catch (timeErr) {
              console.warn(`Could not fetch time for match ${matchNum}:`, timeErr);
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
      const parsedMatch = parseTicTacToeMatch(matchData);

      // Fetch per-tier timeout config to get correct match time
      const timeoutConfig = await fetchTierTimeoutConfig(contractInstance, tierId, totalMatchTime);
      const tierMatchTime = timeoutConfig?.matchTimePerPlayer ?? totalMatchTime;

      const {
        player1, player2, currentTurn, winner, loser, board, matchStatus, isDraw,
        startTime, lastMoveTime, lastMovedCell, lastMoveTimestamp
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

      // Use per-tier match time from contract config
      let player1TimeRemaining = tierMatchTime;
      let player2TimeRemaining = tierMatchTime;

      try {
        const timeData = await contractInstance.getCurrentTimeRemaining(tierId, instanceId, roundNumber, matchNumber);
        player1TimeRemaining = Number(timeData[0]); // player1Time from contract
        player2TimeRemaining = Number(timeData[1]); // player2Time from contract
      } catch (timeErr) {
        // Using default values (match may not be initialized)
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
        isPlayer1,
        isYourTurn,
        userSymbol: isPlayer1 ? 'X' : 'O',
        lastMovedCell,
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
      const tierConfig = await contract.tierConfigs(tierId);
      const playerCount = Number(tierConfig.playerCount);
      const prizePool = tournamentInfo[4]; // prizePool is at index 4

      const matchData = await contract.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const parsedMatch = parseTicTacToeMatch(matchData);

      const player1 = parsedMatch.player1;
      const player2 = parsedMatch.player2;

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      let actualPlayer1 = player1;
      let actualPlayer2 = player2;

      if (player1.toLowerCase() === zeroAddress) {
        const enrolledPlayers = await contract.getEnrolledPlayers(tierId, instanceId);
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

    // Clear the modal state
    setMatchEndResult(null);
    setMatchEndWinnerLabel('');
    setCurrentMatch(null);
    setMoveHistory([]);

    // Refresh data
    if (contract) {
      await fetchLeaderboard(true);
      await refreshAfterAction(tournamentInfo?.tierId ?? null);

      // Show tournament bracket for winners, go back to list for losers
      if (tournamentInfo && (matchEndResult === 'win' || matchEndResult === 'forfeit_win')) {
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
          DUMMY_ABI,
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
            gameType: 'tictactoe'
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
      <ParticleBackground colors={currentTheme.particleColors} symbols={TICTACTOE_SYMBOLS} fontSize="24px" count={38} />

      {/* Back to ETour Button */}
      <Link
        to="/"
        style={{
          position: 'fixed',
          top: 'calc(1rem + 100px)',
          left: '1rem',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0.5rem',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        <ArrowLeft size={16} />
      </Link>

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
              <Grid className={`relative ${currentTheme.heroIcon} animate-float`} size={80} />
            </div>
          </div>

          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            ETour TicTacToe
          </h1>
          <p className="text-2xl text-blue-200 mb-6">
            Provably Fair • <a href="/#zero-trust" className="text-blue-200 hover:text-green-300 transition-colors underline decoration-blue-400/50 hover:decoration-green-400 underline-offset-4">Zero Trust</a> • 100% On-Chain
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
          <GameMatchLayout
            gameType="tictactoe"
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
              player1: { icon: 'X', label: 'Player 1' },
              player2: { icon: 'O', label: 'Player 2' }
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
            {/* TicTacToe Board Grid */}
            <div className="grid grid-cols-3 gap-3">
              {currentMatch.board.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={matchLoading || currentMatch.matchStatus === 2 || !currentMatch.isYourTurn}
                  className={`aspect-square rounded-xl flex items-center justify-center text-4xl font-bold transition-all transform hover:scale-105 disabled:cursor-not-allowed ${
                    cell === 0
                      ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200'
                      : cell === 1
                      ? 'bg-blue-500/40 text-blue-200'
                      : 'bg-pink-500/40 text-pink-200'
                  } ${
                    currentMatch.lastMovedCell === idx && currentMatch.matchStatus === 1
                      ? 'ring-2 ring-yellow-400 animate-pulse'
                      : ''
                  }`}
                >
                  {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
                </button>
              ))}
            </div>
          </GameMatchLayout>
        )}

        {/* Tournaments Section */}
        {contract && !currentMatch && (
          <>
            {viewingTournament ? (
              <TournamentBracket
                tournamentData={viewingTournament}
                onBack={handleBackToTournaments}
                onEnterMatch={handlePlayMatch}
                onForceEliminate={handleForceEliminateStalledMatch}
                onClaimReplacement={handleClaimMatchSlotByReplacement}
                onManualStart={handleManualStart}
                onClaimAbandonedPool={handleClaimAbandonedPool}
                onEnroll={handleEnroll}
                account={account}
                loading={tournamentsLoading}
                syncDots={bracketSyncDots}
                isEnrolled={viewingTournament?.enrolledPlayers?.some(addr => addr.toLowerCase() === account?.toLowerCase())}
                entryFee={viewingTournament?.entryFee ? ethers.formatEther(viewingTournament.entryFee) : '0'}
                isFull={viewingTournament?.enrolledCount >= viewingTournament?.playerCount}
              />
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

                      const instances = tierInstances[tierId] || [];
                      const isLoading = tierLoading[tierId];
                      const statusCounts = countInstancesByStatus(metadata.statuses, metadata.enrolledCounts);

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
                              <span className="text-sm font-normal text-purple-300">• <span className="font-bold text-cyan-400">{metadata.instanceCount} lobbies</span> • <span className="font-bold text-green-400">{statusCounts.enrolling} enrolling</span> • <span className="font-bold text-yellow-400">{statusCounts.inProgress} in progress</span></span>
                              <span className="text-sm font-normal text-purple-300">• {getEstimatedDuration('tictactoe', metadata.playerCount)}</span>
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

                {/* Empty State - only show when no connection error */}
                {!metadataLoading && !connectionError && Object.keys(tierMetadata).length === 0 && (
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-12 border border-purple-400/30 text-center">
                    <Trophy className="text-purple-400/50 mx-auto mb-4" size={64} />
                    <h3 className="text-2xl font-bold text-purple-300 mb-2">No Tournaments Available</h3>
                    <p className="text-purple-200/70">Check back soon for new tournaments!</p>
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
        <div className="max-w-2xl mx-auto mb-16">
          <WinnersLeaderboard
            leaderboard={leaderboard}
            loading={leaderboardLoading}
            error={leaderboardError}
            currentAccount={account}
            onRetry={() => fetchLeaderboard()}
          />
        </div>
      </div>

      {/* User Manual Section */}
      <div id="user-manual" className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-4xl mx-auto">
          <UserManual />
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
    </div>
  );
}
