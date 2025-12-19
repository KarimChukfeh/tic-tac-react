/**
 * TicTacBlock - Dummy TicTacToe Protocol Frontend
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Deploy the contract to Arbitrum One:
 *    npx hardhat run scripts/deploy.js --network arbitrumOne
 *
 * 2. Update CONTRACT_ADDRESS below with the deployed address (line 767)
 *
 * 3. Make sure MetaMask is connected to Arbitrum One:
 *    Network: Arbitrum One
 *    Chain ID: 42161
 *    RPC: https://arb1.arbitrum.io/rpc
 *    Block Explorer: https://arbiscan.io
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, DollarSign, Zap, History,
  CheckCircle, AlertCircle, ChevronDown, ArrowLeft
} from 'lucide-react';
import { ethers } from 'ethers';
import DUMMY_ABI from './TourABI.json';
import { shortenAddress, formatTime as formatTimeHMS, getTierName, getEstimatedDuration, countInstancesByStatus } from './utils/formatters';
import ParticleBackground from './components/shared/ParticleBackground';
import StatsGrid from './components/shared/StatsGrid';
import EnrolledPlayersList from './components/shared/EnrolledPlayersList';
import MatchCard from './components/shared/MatchCard';
import TournamentCard from './components/shared/TournamentCard';
import TurnTimer from './components/shared/TurnTimer';
import MatchTimeoutEscalation from './components/shared/MatchTimeoutEscalation';
import WinnersLeaderboard from './components/shared/WinnersLeaderboard';
import MatchEndModal from './components/shared/MatchEndModal';
import WhyArbitrum from './components/shared/WhyArbitrum';

// TicTacToe particle symbols (matching landing page style)
const TICTACTOE_SYMBOLS = ['✕', '○'];

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement, onManualStart, onEnroll, account, loading, syncDots, isEnrolled, entryFee, isFull }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers, firstEnrollmentTime, countdownActive, enrollmentTimeout } = tournamentData;

  // Calculate total rounds based on player count
  const totalRounds = Math.ceil(Math.log2(playerCount));

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

  // TicTacToe-specific options for match status display
  const matchStatusOptions = { doubleForfeitText: 'Eliminated - Double Forfeit' };

  // Bracket colors
  const colors = {
    headerBg: 'from-purple-600/30 to-blue-600/30',
    headerBorder: 'border-purple-400/30',
    text: 'text-purple-300',
    textHover: 'hover:text-purple-200',
    icon: 'text-purple-400',
    buttonEnter: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
    textMuted: 'text-purple-300/70'
  };

  return (
    <div className="mb-16">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colors.headerBg} backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder} mb-8`}>
        <button
          onClick={onBack}
          className={`mb-4 flex items-center gap-2 ${colors.text} ${colors.textHover} transition-colors`}
        >
          <ChevronDown className="rotate-90" size={20} />
          Back to Tournaments
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Trophy className={colors.icon} size={48} />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-bold text-white">
                  Tournament T{tierId + 1}-I{instanceId + 1}
                </h2>
                <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  Syncing{'.'.repeat(syncDots)}
                </span>
              </div>
              <p className={colors.text}>
                Round {currentRound + 1} of {totalRounds}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`${colors.text} text-sm`}>Prize Pool</div>
            <div className="text-3xl font-bold text-yellow-400">
              {ethers.formatEther(prizePool)} ETH
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsGrid
          enrolledCount={enrolledCount}
          playerCount={playerCount}
          status={status}
          currentRound={currentRound}
          totalRounds={totalRounds}
          colors={colors}
        />

        {/* Enroll Button for Unenrolled Players */}
        {status === 0 && account && !isEnrolled && !isFull && (
          <div className="mt-4">
            <button
              onClick={() => onEnroll(tierId, instanceId, entryFee)}
              disabled={loading}
              className={`w-full bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
            >
              <Trophy size={20} />
              {loading ? 'Enrolling...' : `Enroll in Tournament (${entryFee} ETH)`}
            </button>
            <p className={`${colors.textMuted} text-xs text-center mt-2`}>
              Join this tournament and compete for the prize pool
            </p>
          </div>
        )}

        {/* Countdown Timer (only show during enrollment) */}
        {countdownActive && status === 0 && (
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
        )}


        {/* Enrolled Players List */}
        <EnrolledPlayersList
          enrolledPlayers={enrolledPlayers}
          account={account}
          colors={colors}
        />

        {/* Enrollment Escalation Timers */}
        {status === 0 && enrollmentTimeout && (() => {
          const now = Math.floor(Date.now() / 1000);
          const escalation1Start = Number(enrollmentTimeout.escalation1Start);
          const escalation2Start = Number(enrollmentTimeout.escalation2Start);
          const isEnrolledUser = account && enrolledPlayers?.some(addr => addr.toLowerCase() === account.toLowerCase());

          const timeToEsc1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
          const timeToEsc2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;
          const canForceStart = escalation1Start > 0 && now >= escalation1Start;
          const canAnyoneStart = escalation2Start > 0 && now >= escalation2Start;

          return (
            <>
              {/* Show escalation timers if they're active */}
              {(timeToEsc1 > 0 || timeToEsc2 > 0 || canForceStart || canAnyoneStart) && (
                <div className="mt-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="text-orange-400" size={20} />
                    <h4 className="text-orange-300 font-semibold">Enrollment Escalation Status</h4>
                  </div>

                  <div className="space-y-2">
                    {/* Escalation 1 */}
                    <div className={`p-3 rounded-lg ${canForceStart ? 'bg-orange-500/30 border border-orange-400' : 'bg-black/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${canForceStart ? 'text-orange-200' : 'text-orange-300/70'}`}>
                          Escalation 1: Enrolled Players Can Force Start
                        </span>
                        {timeToEsc1 > 0 ? (
                          <span className="text-orange-300 font-mono text-sm">{formatTime(timeToEsc1)}</span>
                        ) : (
                          <span className="text-orange-200 font-bold text-xs">ACTIVE</span>
                        )}
                      </div>
                    </div>

                    {/* Escalation 2 */}
                    <div className={`p-3 rounded-lg ${canAnyoneStart ? 'bg-red-500/30 border border-red-400' : 'bg-black/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${canAnyoneStart ? 'text-red-200' : 'text-red-300/70'}`}>
                          Escalation 2: Anyone Can Terminate & Claim Pool
                        </span>
                        {timeToEsc2 > 0 ? (
                          <span className="text-red-300 font-mono text-sm">{formatTime(timeToEsc2)}</span>
                        ) : canAnyoneStart ? (
                          <span className="text-red-200 font-bold text-xs">ACTIVE</span>
                        ) : (
                          <span className="text-red-300/50 font-mono text-xs">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Force Start Button */}
              {canForceStart && isEnrolledUser && (
                <div className="mt-4">
                  <button
                    onClick={() => onManualStart(tierId, instanceId)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    <Zap size={18} />
                    {loading ? 'Starting...' : 'Force Start Tournament'}
                  </button>
                  <p className="text-orange-300 text-xs text-center mt-2">
                    You can force start this tournament as an enrolled player
                  </p>
                </div>
              )}

              {canAnyoneStart && !isEnrolledUser && (
                <div className="mt-4">
                  <button
                    onClick={() => onManualStart(tierId, instanceId)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    <Zap size={18} />
                    {loading ? 'Terminating...' : 'Terminate & Claim Abandoned Pool'}
                  </button>
                  <p className="text-red-300 text-xs text-center mt-2">
                    Anyone can terminate this tournament and claim the abandoned pool at Escalation 2
                  </p>
                </div>
              )}
            </>
          );
        })()}
      </div>

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
                    matchStatusOptions={matchStatusOptions}
                    showEscalation={true}
                    showThisIsYou={true}
                  />
                ))}
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

export default function TicTacBlock() {
  const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const EXPECTED_CHAIN_ID = 412346;
  const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
  const ETHERSCAN_URL = `https://arbiscan.io/address/${CONTRACT_ADDRESS}`;

  // Helper to get read-only contract (bypasses MetaMask for read operations)
  const getReadOnlyContract = useCallback(() => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CONTRACT_ADDRESS, DUMMY_ABI, provider);
  }, []);

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null); // This contract has signer for write ops

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

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

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

  // Load contract data (simplified - matches ConnectFour pattern)
  // Uses lazy loading: only fetch tier metadata initially, instances load on expand
  const loadContractData = async (contractInstance, isInitialLoad = false) => {
    try {
      // Fetch tier metadata only (fast) - instances load on tier expand
      await fetchTierMetadata(contractInstance);
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
      if (!silent) {
        setLeaderboardLoading(false);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error.message || error);
      setLeaderboard([]);
      if (!silent) {
        setLeaderboardLoading(false);
      }
    }
  }, [getReadOnlyContract]);

  // LAZY LOADING: Fetch tier metadata only (fast initial load)
  // This gets basic tier info without detailed instance data
  const fetchTierMetadata = useCallback(async (contractInstance = null) => {
    const readContract = contractInstance || getReadOnlyContract();
    if (!readContract) return;

    setMetadataLoading(true);
    const metadata = {};

    // Fetch metadata for tiers 0-6
    for (let tierId = 0; tierId <= 6; tierId++) {
      try {
        // Parallel fetch tier config, entry fee, and overview
        const [tierConfig, fee, tierOverview] = await Promise.all([
          readContract.tierConfigs(tierId),
          readContract.ENTRY_FEES(tierId),
          readContract.getTierOverview(tierId)
        ]);

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
      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId);
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
          `Claim the entire tournament pool (Escalation 2 - Abandoned Tournament)?\n\n` +
          `This tournament has ${enrolledCount} enrolled player${enrolledCount !== 1 ? 's' : ''} but failed to start in time.\n` +
          `You will receive the entire enrollment pool${forfeitPool > 0n ? ` plus ${ethers.formatEther(forfeitPool)} ETH in forfeited fees` : ''}.\n\n` +
          `The tournament will be reset after claiming.`
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
  const refreshTournamentBracket = useCallback(async (contractInstance, tierId, instanceId) => {
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

            // Fetch escalation state from matches mapping
            const matchKey = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
              ['uint8', 'uint8', 'uint8', 'uint8'],
              [tierId, instanceId, roundNum, matchNum]
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

            matches.push({
              player1: matchData[0],
              player2: matchData[1],
              currentTurn: matchData[2],
              winner: matchData[3],
              board: matchData[4],
              matchStatus: Number(matchData[5]),
              isDraw: matchData[6],
              startTime: Number(matchData[7]),
              lastMoveTime: Number(matchData[8]),
              timeoutState
            });
          } catch (err) {
            // Match might not exist yet
            matches.push({
              player1: '0x0000000000000000000000000000000000000000',
              player2: '0x0000000000000000000000000000000000000000',
              matchStatus: 0,
              timeoutState: null
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
        enrollmentTimeout
      };
    } catch (error) {
      console.error('Error refreshing tournament bracket:', error);
      return null;
    }
  }, []);

  // Handle entering tournament (fetch and display bracket)
  const handleEnterTournament = async (tierId, instanceId) => {
    if (!contract) return;

    try {
      setTournamentsLoading(true);

      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId);
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

  // Refresh match data from contract
  const refreshMatchData = useCallback(async (contractInstance, userAccount, matchInfo) => {
    try {
      const { tierId, instanceId, roundNumber, matchNumber } = matchInfo;
      const matchData = await contractInstance.getMatch(tierId, instanceId, roundNumber, matchNumber);

      const player1 = matchData[0];
      const player2 = matchData[1];
      const currentTurn = matchData[2];
      const winner = matchData[3];
      const board = matchData[4];
      const matchStatus = Number(matchData[5]);
      const isDraw = matchData[6];
      const startTime = Number(matchData[7]);
      const lastMoveTime = Number(matchData[8]);
      const lastMovedCell = Number(matchData[10]);

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

      const boardState = Array.from(board).map(cell => Number(cell));
      const isPlayer1 = actualPlayer1.toLowerCase() === userAccount.toLowerCase();
      const isYourTurn = currentTurn.toLowerCase() === userAccount.toLowerCase();

      return {
        ...matchInfo,
        player1: actualPlayer1,
        player2: actualPlayer2,
        currentTurn,
        winner,
        board: boardState,
        matchStatus,
        isDraw,
        isPlayer1,
        isYourTurn,
        userSymbol: isPlayer1 ? 'X' : 'O',
        lastMovedCell,
        isMatchInitialized,
        timeoutState,
        isTimedOut,
        timeoutClaimant,
        timeoutClaimReward,
        lastMoveTime,
        startTime
      };
    } catch (error) {
      console.error('Error refreshing match:', error);
      return null;
    }
  }, []); // No dependencies - pure function

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

      const updated = await refreshMatchData(contract, account, currentMatch);
      if (updated) {
        setCurrentMatch(updated);
        setMoveHistory(prev => [...prev, { player: currentMatch.userSymbol, cell: cellIndex, timestamp: Date.now() }]);
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
      await fetchLeaderboard(true);

      // Refresh tier data (lazy loading)
      await refreshAfterAction(tierId);

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

      const matchData = await contract.getMatch(tierId, instanceId, roundNumber, matchNumber);
      const player1 = matchData[0];
      const player2 = matchData[1];

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
        player2: actualPlayer2
      });

      if (updated) {
        setCurrentMatch(updated);
        setMoveHistory([]);
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

    // Refresh tournament bracket and cached stats (with loading indicator)
    if (tournamentInfo && contract) {
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(contract, tournamentInfo.tierId, tournamentInfo.instanceId);
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
        const bracketData = await refreshTournamentBracket(contract, tournamentInfo.tierId, tournamentInfo.instanceId);
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

      const updated = await refreshTournamentBracket(contractInstance, tournament.tierId, tournament.instanceId);
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
          match
        );
        if (updatedMatch) {
          const zeroAddress = '0x0000000000000000000000000000000000000000';
          const matchWasCompleted = updatedMatch.matchStatus === 2 && match.matchStatus !== 2;
          const wasParticipant =
            updatedMatch.player1.toLowerCase() === userAccount.toLowerCase() ||
            updatedMatch.player2.toLowerCase() === userAccount.toLowerCase();

          if (matchWasCompleted && wasParticipant) {
            // Determine the result type for the modal
            const userWon = updatedMatch.winner?.toLowerCase() === userAccount.toLowerCase();
            const isDoubleForfeited = updatedMatch.winner?.toLowerCase() === zeroAddress && !updatedMatch.isDraw;
            const winnerIsPlayer1 = updatedMatch.winner?.toLowerCase() === updatedMatch.player1?.toLowerCase();

            // Case 1: Draw
            if (updatedMatch.isDraw) {
              setMatchEndResult('draw');
              setMatchEndWinnerLabel('');
            }
            // Case 2: Double forfeit (both players eliminated)
            else if (isDoubleForfeited) {
              setMatchEndResult('double_forfeit');
              setMatchEndWinnerLabel('');
            }
            // Case 3: Timeout/Forfeit scenarios
            else if (updatedMatch.isTimedOut) {
              if (userWon) {
                setMatchEndResult('forfeit_win');
              } else {
                setMatchEndResult('forfeit_lose');
              }
              setMatchEndWinnerLabel(winnerIsPlayer1 ? 'Player 1 (X)' : 'Player 2 (O)');
            }
            // Case 4: Normal win/loss (by gameplay)
            else {
              if (userWon) {
                setMatchEndResult('win');
              } else {
                setMatchEndResult('lose');
              }
              setMatchEndWinnerLabel(winnerIsPlayer1 ? 'Player 1 (X)' : 'Player 2 (O)');
            }

            // Update match to show final state, modal will handle the rest
            setCurrentMatch(updatedMatch);
            return;
          }

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
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, fetchLeaderboard, refreshTournamentBracket]);

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
            <a
              href={ETHERSCAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors justify-center md:justify-start"
            >
              <Code size={16} />
              <span className="font-mono text-xs">{shortenAddress(CONTRACT_ADDRESS)}</span>
              <ExternalLink size={14} />
            </a>
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
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-green-400" size={20} />
                <span className="font-bold text-green-300">Prize Distribution</span>
              </div>
              <p className="text-sm text-green-200">
                Winner takes the ETH prizepool.<br/>Draws share the prize 50/50.
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-300">1min Moves</span>
              </div>
              <p className="text-sm text-yellow-200">
                Players have 1 minute per move before their opponent can claim victory.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-blue-400" size={20} />
                <span className="font-bold text-blue-300">On-Chain Randomness</span>
              </div>
              <p className="text-sm text-blue-200">
                First move determined by verifiable on-chain randomness. Fair play.
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
          <div className="mb-16">
            {/* Match Header */}
            <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30 mb-8">
              <button
                onClick={closeMatch}
                className="mb-4 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
              >
                <ChevronDown className="rotate-90" size={20} />
                Back to Tournament
              </button>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-white">
                      Tournament Match
                    </h2>
                    <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      Syncing{'.'.repeat(syncDots)}
                    </span>
                  </div>
                  <p className="text-purple-300 mt-2">
                    T{currentMatch.tierId}-I{currentMatch.instanceId} • Round {currentMatch.roundNumber + 1} • Match {currentMatch.matchNumber + 1}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl font-bold ${
                  currentMatch.matchStatus === 0 ? 'bg-gray-500/20 text-gray-300' :
                  currentMatch.matchStatus === 1 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {currentMatch.matchStatus === 0 ? 'Not Started' :
                   currentMatch.matchStatus === 1 ? 'In Progress' :
                   currentMatch.isDraw ? 'Draw' : 'Complete'}
                </div>
              </div>

              {!currentMatch.isMatchInitialized && (
                <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-xl p-4 mb-4">
                  <p className="text-yellow-200 text-sm">
                    ⚠️ Match not started yet. Waiting for a player to make the first move...
                  </p>
                </div>
              )}
            </div>

            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Player 1 Info */}
              <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-400/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl font-bold">
                    X
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Player 1</h3>
                    <p className="text-blue-300 font-mono text-sm">
                      {currentMatch.player1.slice(0, 6)}...{currentMatch.player1.slice(-4)}
                    </p>
                    {currentMatch.player1?.toLowerCase() === account?.toLowerCase() && (
                      <span className="text-yellow-300 text-xs font-bold">THIS IS YOU</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
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
                  {currentMatch.isPlayer1 && currentMatch.isYourTurn && (
                    <div className="bg-green-500/20 border border-green-400 rounded-lg p-3 text-center">
                      <span className="text-green-300 font-bold">Your Turn!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Panel - Game Board */}
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
                <h3 className="text-2xl font-bold text-center text-white mb-6">Game Board</h3>

                {/* Tic Tac Toe Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
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

                {/* Game Controls */}
                <div className="space-y-3">
                  {/* Turn Timer */}
                  {currentMatch.matchStatus === 1 && (currentMatch.lastMoveTime !== undefined || currentMatch.startTime !== undefined) && (() => {
                    const MOVE_TIMEOUT = 60; // 1 minute in seconds
                    const now = Math.floor(Date.now() / 1000);
                    const timeReference = currentMatch.lastMoveTime > 0 ? currentMatch.lastMoveTime : currentMatch.startTime;
                    const timeSinceLastMove = now - timeReference;
                    const timeRemaining = Math.max(0, MOVE_TIMEOUT - timeSinceLastMove);

                    if (timeReference > 0) {
                      return (
                        <TurnTimer
                          isYourTurn={currentMatch.isYourTurn}
                          timeRemaining={timeRemaining}
                          onClaimTimeoutWin={handleClaimTimeoutWin}
                          loading={matchLoading}
                        />
                      );
                    }
                    return null;
                  })()}

                  {/* Match Timeout Escalation UI */}
                  {currentMatch.timeoutState && (
                    <MatchTimeoutEscalation
                      timeoutState={currentMatch.timeoutState}
                      matchStatus={currentMatch.matchStatus}
                      isYourTurn={currentMatch.isYourTurn}
                      onClaimTimeoutWin={handleClaimTimeoutWin}
                      onForceEliminate={handleForceEliminateStalledMatch}
                      onClaimReplacement={handleClaimMatchSlotByReplacement}
                      loading={matchLoading}
                    />
                  )}

                  {currentMatch.matchStatus === 2 && (
                    <div className="bg-green-500/20 border border-green-400 rounded-xl p-4 text-center">
                      <p className="text-white font-bold text-xl mb-2">
                        {currentMatch.isDraw ? "It's a Draw!" : 'Match Complete!'}
                      </p>
                      {!currentMatch.isDraw && (
                        <p className="text-green-300">
                          Winner: {currentMatch.winner.slice(0, 6)}...{currentMatch.winner.slice(-4)}
                          {currentMatch.winner?.toLowerCase() === account?.toLowerCase() && ' (YOU!)'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Player 2 Info */}
              <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-pink-400/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-2xl font-bold">
                    O
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Player 2</h3>
                    <p className="text-pink-300 font-mono text-sm">
                      {currentMatch.player2.slice(0, 6)}...{currentMatch.player2.slice(-4)}
                    </p>
                    {currentMatch.player2?.toLowerCase() === account?.toLowerCase() && (
                      <span className="text-yellow-300 text-xs font-bold">THIS IS YOU</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
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
                  {!currentMatch.isPlayer1 && currentMatch.isYourTurn && (
                    <div className="bg-green-500/20 border border-green-400 rounded-lg p-3 text-center">
                      <span className="text-green-300 font-bold">Your Turn!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Move History */}
            {moveHistory.length > 0 && (
              <div className="mt-6 bg-slate-900/50 rounded-xl p-6 border border-purple-500/30">
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
            )}

          </div>
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

                {/* Empty State */}
                {!metadataLoading && Object.keys(tierMetadata).length === 0 && (
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
            currentAccount={account}
          />
        </div>
      </div>

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
        gameType="tictactoe"
        isVisible={!!matchEndResult}
      />
    </div>
  );
}
