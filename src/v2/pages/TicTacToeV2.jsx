/**
 * TicTacToeV2 - On-Chain TicTacToe V2 (Factory-based)
 *
 * Differs from V1 only in the instance listing/creation flow.
 * Once an instance is selected, the UI mirrors V1 exactly:
 * - Tournament bracket view with TournamentBracket component
 * - Match board view with GameMatchLayout
 * - Player dashboard (PlayerActivity, RecentMatchesCard, GamesCard)
 * - Winners leaderboard
 * - User manual
 * - Match end modal, active match alert modal
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
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
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { ethers } from 'ethers';
import { CURRENT_NETWORK, TARGET_CHAIN_ID_HEX, getAddressUrl, getWalletAddChainParams } from '../../config/networks';
import { shortenAddress, getCellPositionName } from '../../utils/formatters';
import { generateV2TournamentUrl, parseV2ContractParam } from '../../utils/urlHelpers';
import { shouldResetOnInitialDocumentLoad } from '../../utils/navigation';
import { isDraw, getCompletionReasonText, getCompletionReasonDescription } from '../../utils/completionReasons';
import ParticleBackground from '../../components/shared/ParticleBackground';
import MatchCard from '../../components/shared/MatchCard';
import UserManualV2 from '../components/UserManualV2';
import MatchEndModal from '../../components/shared/MatchEndModal';
import ActiveMatchAlertModal from '../../components/shared/ActiveMatchAlertModal';
import GameMatchLayout from '../../components/shared/GameMatchLayout';
import TournamentHeader from '../../components/shared/TournamentHeader';
import PlayerActivity from '../../components/shared/PlayerActivity';
import ActiveLobbiesCard from '../../components/shared/ActiveLobbiesCard';
import { useV2PlayerActivity } from '../hooks/useV2PlayerActivity';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useV2MatchHistory } from '../hooks/useV2MatchHistory';
import { useActiveLobbies } from '../hooks/useActiveLobbies';
import RecentMatchesCard from '../../components/shared/RecentMatchesCard';
import GamesCard from '../../components/shared/GamesCard';
import BracketScrollHint from '../../components/shared/BracketScrollHint';
import RecentInstanceCard from '../../components/shared/RecentInstanceCard';
import V2GameLobbyIntro from '../../components/shared/V2GameLobbyIntro';
import UserManualAnchorIcon from '../../components/shared/UserManualAnchorIcon';
import WalletBrowserPrompt from '../../components/WalletBrowserPrompt';
import EntryFeeSlider, { DEFAULT_MIN_ENTRY_FEE } from '../components/EntryFeeSlider';
import { useInitialDocumentScrollTop } from '../../hooks/useInitialDocumentScrollTop';
import { useWalletBrowserPrompt } from '../../hooks/useWalletBrowserPrompt';
import { isMobileDevice, isWalletBrowser } from '../../utils/mobileDetection';
import { didMatchStateAdvance, waitForTxOrStateSync } from '../../utils/txSync';
import {
  PLAYER_COUNT_OPTIONS,
  TIME_PER_PLAYER_OPTIONS,
  TIME_INCREMENT_OPTIONS,
  ENROLLMENT_WINDOW_OPTIONS,
  TICTACTOE_V2_FACTORY_ADDRESS,
  TICTACTOE_V2_FACTORY_ADDRESS_CANDIDATES,
  TICTACTOE_V2_IMPLEMENTATION_ADDRESS,
  formatEth,
  getDefaultTimeouts,
  getFactoryContract,
  getReadableError,
  getInstanceContract,
  getRoundLabel,
  getTournamentTypeLabel,
  decodeTicTacToeMoves,
  normalizeInstanceSnapshot,
  normalizeMatch,
  resolveCreatedInstanceAddress,
  unpackBoard,
} from '../lib/tictactoe';

const TICTACTOE_SYMBOLS = ['✕', '○'];

// Virtual tier/instance IDs used when adapting V2 instance contracts to V1 component API
const VIRTUAL_TIER_ID = 0;
const VIRTUAL_INSTANCE_ID = 0;
const DEFAULT_CREATE_FORM = {
  playerCount: 2,
  entryFee: DEFAULT_MIN_ENTRY_FEE,
  ...getDefaultTimeouts(2),
};

const currentTheme = {
  border: 'rgba(0, 255, 255, 0.3)',
  particleColors: ['#00ffff', '#ff00ff'],
  gradient: 'linear-gradient(135deg, #0f0020 0%, #1f0038 50%, #140023 100%)',
  heroGlow: 'from-blue-500 via-cyan-500 to-blue-500',
  heroIcon: 'text-blue-400',
  heroTitle: 'from-blue-400 via-cyan-400 to-blue-400',
  heroSubtext: 'text-blue-300',
  buttonGradient: 'from-purple-600 to-fuchsia-600',
  buttonHover: 'hover:from-purple-700 hover:to-fuchsia-700',
  connectButtonGradient: 'from-purple-600 to-fuchsia-600',
  connectButtonHover: 'hover:from-purple-700 hover:to-fuchsia-700',
  connectCtaClassName: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl shadow-2xl border-2 border-purple-400/60 hover:scale-105 hover:from-purple-700 hover:to-fuchsia-700',
  primary: 'rgba(0, 255, 255, 0.5)',
  secondary: 'rgba(255, 0, 255, 0.5)',
};

function isWalletAvailable() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
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

function MetricBox({ label, value, subtext, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30 text-blue-300',
    green: 'from-green-500/20 to-emerald-500/20 border-green-400/30 text-green-300',
    purple: 'from-purple-500/20 to-violet-500/20 border-purple-400/30 text-purple-300',
  };
  return (
    <div className={`bg-gradient-to-br ${tones[tone] || tones.blue} border rounded-xl p-4`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {subtext ? <p className="mt-2 text-sm text-white/80">{subtext}</p> : null}
    </div>
  );
}

/**
 * TournamentBracket - adapted for V2 instance contracts.
 * Re-implements the V1 TournamentBracket component but using V2 normalizeMatch data shape.
 */
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

  const ENROLLMENT_DURATION = 1 * 60;
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownExpired, setCountdownExpired] = useState(false);

  const firstEnrollmentTime = tournamentData.firstEnrollmentTime || 0;
  const countdownActive = tournamentData.countdownActive || false;

  useEffect(() => {
    if (prevStatusRef.current === 0 && status === 1 && isEnrolled && bracketViewRef.current) {
      const scrollTimer = setTimeout(() => {
        bracketViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }, 300);
      return () => clearTimeout(scrollTimer);
    }
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

  const matchStatusOptions = { doubleForfeitText: 'Eliminated - Double Forfeit' };

  const colors = {
    headerBorder: 'border-purple-400/30',
    text: 'text-purple-300',
    icon: 'text-purple-400',
  };

  const hasValidRounds = rounds && rounds.length > 0 && rounds.some(round =>
    round.matches && round.matches.length > 0 && round.matches.some(match =>
      match.player1 && match.player1 !== '0x0000000000000000000000000000000000000000'
    )
  );

  // Adapt to V1 TournamentHeader props
  const tierId = VIRTUAL_TIER_ID;
  const instanceId = VIRTUAL_INSTANCE_ID;
  const enrolledPlayers = players || [];
  const prizePool = tournamentData.prizePoolWei || 0n;

  return (
    <div className="mb-16">
      <TournamentHeader
        gameType="tictactoe"
        reasonLabelMode="v2"
        tierId={tierId}
        instanceId={instanceId}
        instanceAddress={tournamentData.address}
        shareUrlOverride={tournamentData.address ? generateV2TournamentUrl('tictactoe', tournamentData.address) : undefined}
        status={status}
        currentRound={currentRound}
        playerCount={playerCount}
        enrolledCount={enrolledCount}
        prizePool={prizePool}
        enrolledPlayers={enrolledPlayers}
        winner={tournamentData.winner}
        completionReason={tournamentData.completionReason}
        totalEntryFeesAccrued={tournamentData.totalEntryFeesAccrued}
        prizeAwarded={tournamentData.prizeAwarded}
        prizeRecipient={tournamentData.prizeRecipient}
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
        onManualStart={onManualStart ? () => onManualStart(tierId, instanceId) : null}
        onClaimAbandonedPool={onClaimAbandonedPool ? () => onClaimAbandonedPool(tierId, instanceId) : null}
        onResetEnrollmentWindow={onResetEnrollmentWindow ? () => onResetEnrollmentWindow(tierId, instanceId) : null}
        onCancelTournament={onCancelTournament ? () => onCancelTournament(tierId, instanceId) : null}
        contract={instanceContract}
      />

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
                  {round.matches.map((match, matchIdx) => (
                    <div key={matchIdx}>
                      <MatchCard
                        match={match}
                        reasonLabelMode="v2"
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
                        gameName="tictactoe"
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
              <div className={`${colors.text} text-lg`}>
                {status === 0
                  ? 'Brackets will be generated once the instance starts.'
                  : 'No bracket data available.'}
              </div>
            </div>
            {enrolledCount === 0 && <hr className="border-purple-500/20" />}
            {enrolledCount === 0 && (
              <div id="last-instance">
                <RecentInstanceCard
                  tierId={tierId}
                  instanceId={instanceId}
                  contract={instanceContract}
                  tierName={tournamentTypeLabel}
                  walletAddress={account}
                  reasonLabelMode="v2"
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

const DEFAULT_MATCH_LOADING_MESSAGE = 'Loading match...';

export default function TicTacToeV2() {
  useInitialDocumentScrollTop('/v2/tictactoe');

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const rpcProviderRef = useRef(null);
  const pendingScrollAddressRef = useRef(null);
  const tournamentBracketRef = useRef(null);
  const matchViewRef = useRef(null);
  const collapseActivityPanelRef = useRef(null);
  const recentMatchesScrollRef = useRef(null);

  // --- Wallet & connection ---
  const [factoryAddress, setFactoryAddress] = useState(TICTACTOE_V2_FACTORY_ADDRESS);
  const [browserProvider, setBrowserProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [rpcReady, setRpcReady] = useState(false);
  const [rpcProvider, setRpcProvider] = useState(null);
  const [, setWalletBootDone] = useState(!isWalletAvailable());
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractsExpanded, setContractsExpanded] = useState(false);

  // --- Dashboard / factory ---
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [factoryRules, setFactoryRules] = useState(null);
  const [implementationAddress, setImplementationAddress] = useState(TICTACTOE_V2_IMPLEMENTATION_ADDRESS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolvedFactoryContract, setResolvedFactoryContract] = useState(null);

  // --- Create instance ---
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [actionState, setActionState] = useState({ type: 'info', message: '' });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // --- Instance selection (URL param ?instance=0x...) ---
  const selectedAddress = searchParams.get('instance');
  const explorerUrl = getAddressUrl(factoryAddress);

  // --- Invite link: ?c=0x... (V2 contract address) ---
  const [hasProcessedInviteParam, setHasProcessedInviteParam] = useState(false);
  const [allowInitialUrlHydration, setAllowInitialUrlHydration] = useState(() => !shouldResetOnInitialDocumentLoad('/v2/tictactoe', { allowInviteParam: true }));

  // --- Viewing tournament bracket (V1-style) ---
  const [viewingTournament, setViewingTournament] = useState(null); // normalizedInstanceSnapshot + rounds
  const [bracketSyncDots, setBracketSyncDots] = useState(1);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);

  // Active instance contract (the one being viewed)
  const [activeInstanceContract, setActiveInstanceContract] = useState(null);

  // --- Match state (mirrors V1) ---
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchLoadingMessage, setMatchLoadingMessage] = useState(DEFAULT_MATCH_LOADING_MESSAGE);
  const [moveHistory, setMoveHistory] = useState([]);

  // Debug logging for moveHistory changes
  useEffect(() => {
    console.log('[V2] moveHistory state changed:', moveHistory, 'length:', moveHistory.length);
  }, [moveHistory]);
  const [syncDots, setSyncDots] = useState(1);
  const [isSpectator, setIsSpectator] = useState(false);
  const [matchEndResult, setMatchEndResult] = useState(null);
  const [matchEndWinnerLabel, setMatchEndWinnerLabel] = useState('');
  const [matchEndWinner, setMatchEndWinner] = useState(null);
  const [matchEndLoser, setMatchEndLoser] = useState(null);
  const [nextActiveMatch, setNextActiveMatch] = useState(null);
  const previousBoardRef = useRef(null);
  const moveTxInProgressRef = useRef(false);
  const [moveTxTimeout, setMoveTxTimeout] = useState(null);
  const matchEndModalShownRef = useRef(false);
  const [ghostMove, setGhostMove] = useState(null);

  // --- Leaderboard / history ---
  const [leaderboard] = useState([]);

  // --- Mobile panel coordination ---
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // --- Player activity (profile-sourced + instance-scoped) ---
  const v2PlayerActivity = useV2PlayerActivity(activeInstanceContract, account, resolvedFactoryContract, rpcProvider);

  const playerProfile = usePlayerProfile(resolvedFactoryContract, rpcProvider, account);
  const v2MatchHistory = useV2MatchHistory(resolvedFactoryContract, rpcProvider, account);
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

  // --- Active match alert ---
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [alertMatch, setAlertMatch] = useState(null);

  // --- Mobile wallet prompt ---
  const { showPrompt, handleWalletChoice, handleContinueChoice, triggerWalletPrompt } = useWalletBrowserPrompt();

  // Card heights for stacking
  const [gamesCardHeight, setGamesCardHeight] = useState(0);
  const [playerActivityHeight, setPlayerActivityHeight] = useState(0);
  const [recentMatchesCardHeight, setRecentMatchesCardHeight] = useState(0);

  // Polling refs
  const currentMatchRef = useRef(currentMatch);
  const accountRefForMatch = useRef(account);
  const skipNextPollRef = useRef(false);
  const doMatchSyncRef = useRef(null);
  const tournamentRef = useRef(viewingTournament);
  const activeInstanceContractRef = useRef(null);
  // Set to true before programmatic navigate() so handleNav skips the re-fetch
  const skipNavEffectRef = useRef(false);
  // True on the very first handleNav run — skip stale session state on direct page load
  const isInitialNavRef = useRef(true);

  const getReadRunner = () => rpcProviderRef.current;

  // ─── RPC setup ──────────────────────────────────────────────────────────────

  const resolveFactoryContract = async () => {
    const runner = rpcProviderRef.current;
    if (!runner) throw new Error('RPC provider is not ready.');
    for (const candidateAddress of TICTACTOE_V2_FACTORY_ADDRESS_CANDIDATES) {
      const code = await runner.getCode(candidateAddress);
      if (!code || code === '0x') continue;
      const contract = getFactoryContract(runner, candidateAddress);
      setFactoryAddress(candidateAddress);
      return contract;
    }
    throw new Error(`No TicTacToe V2 factory found at ${TICTACTOE_V2_FACTORY_ADDRESS_CANDIDATES.join(' or ')} on ${CURRENT_NETWORK.name}.`);
  };

  useEffect(() => {
    const provider = new ethers.JsonRpcProvider(CURRENT_NETWORK.rpcUrl);
    rpcProviderRef.current = provider;
    setRpcProvider(provider);
    // Set factory contract immediately so hooks don't wait for loadDashboard
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
        setCreateForm(prev => ({ ...prev, entryFee: ethers.formatEther(minEntryFee) }));
        setLastUpdated(Date.now());
      } catch (error) {
        if (cancelled) return;
        setDashboardError(getReadableError(error, 'Failed to load TicTacToe v2.'));
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, [rpcReady]);

  // ─── Build tournament bracket data from a V2 instance ───────────────────────

  async function hydrateBracketMatch(instanceCont, userAccount, matchInfo) {
    const { roundNumber, matchNumber } = matchInfo;
    const matchKey = ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));

    const [matchData, fullMatch, boardRaw, tierConfig] = await Promise.all([
      instanceCont.getMatch(roundNumber, matchNumber),
      instanceCont.matches(matchKey),
      instanceCont.getBoard(roundNumber, matchNumber).catch(() => null),
      instanceCont.tierConfig(),
    ]);

    const tierMatchTime = Number(tierConfig.timeouts?.matchTimePerPlayer ?? tierConfig.matchTimePerPlayer ?? 120);
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
    const board = boardRaw ? Array.from({ length: 9 }, (_, i) => Number(boardRaw[i] ?? 0)) : Array(9).fill(0);

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
            const nm = normalizeMatch(roundIndex, matchIndex, matchData, board);
            const hydrated = await hydrateBracketMatch(instance, account, nm);
            // Inject virtual tierId/instanceId so V1 components route correctly
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

    // Extract countdown data
    let firstEnrollmentTime = 0;
    let countdownActive = false;
    try {
      const tournamentData = await instance.tournament();
      firstEnrollmentTime = Number(tournamentData.firstEnrollmentTime || 0);
      countdownActive = Boolean(tournamentData.countdownActive);
    } catch { /* ignore */ }

    return {
      ...snapshot,
      rounds,
      firstEnrollmentTime,
      countdownActive,
      // Match the shape TournamentHeader / bracket expects
      tierId: VIRTUAL_TIER_ID,
      instanceId: VIRTUAL_INSTANCE_ID,
    };
  };

  // ─── Refresh bracket (mirrors V1 refreshTournamentBracket) ──────────────────

  const refreshTournamentBracket = useCallback(async (address) => {
    try {
      const runner = getReadRunner();
      const instance = getInstanceContract(address, runner);
      return await buildBracketData(address, instance);
    } catch (error) {
      console.error('[V2] Error refreshing tournament bracket:', error);
      return null;
    }
  }, [account]);

  // ─── Wallet connection ───────────────────────────────────────────────────────

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
      setActionState({ type: 'error', message: getReadableError(error, 'Wallet connection failed.') });
    } finally {
      setIsConnecting(false);
    }
  };

  // ─── Create instance ─────────────────────────────────────────────────────────

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
        BigInt(createForm.enrollmentWindow),
        BigInt(createForm.matchTimePerPlayer),
        BigInt(createForm.timeIncrementPerMove),
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
      // Navigate directly to bracket view after creation
      await enterInstanceBracket(address);
    } catch (error) {
      console.error('[V2 createInstance] raw error:', error);
      setActionState({ type: 'error', message: getReadableError(error, 'Could not create instance.') });
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Enter bracket view for a V2 instance ───────────────────────────────────

  const enterInstanceBracket = useCallback(async (address) => {
    if (!address) return;
    try {
      setTournamentsLoading(true);
      const bracketData = await refreshTournamentBracket(address);
      if (bracketData) {
        pendingScrollAddressRef.current = address;
        const runner = getReadRunner();
        const instance = getInstanceContract(address, runner);
        setActiveInstanceContract(instance);
        activeInstanceContractRef.current = instance;
        setViewingTournament(bracketData);
        skipNavEffectRef.current = true;
        navigate('/v2/tictactoe', {
          replace: false,
          state: { view: 'bracket', instanceAddress: address, from: location.state?.view || 'landing' },
        });
      }
      setTournamentsLoading(false);
    } catch (error) {
      console.error('[V2] Error entering instance bracket:', error);
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

  // When ?instance= param changes, load that instance
  useEffect(() => {
    if (!allowInitialUrlHydration) return;
    if (!selectedAddress) return;
    enterInstanceBracket(selectedAddress);
  }, [allowInitialUrlHydration, selectedAddress, enterInstanceBracket]);

  // ─── Handle ?c= invite link ──────────────────────────────────────────────────

  useEffect(() => {
    if (!allowInitialUrlHydration) return;
    if (hasProcessedInviteParam || !rpcReady) return;
    const contractAddress = parseV2ContractParam(searchParams);
    if (!contractAddress) { setHasProcessedInviteParam(true); return; }

    setHasProcessedInviteParam(true);
    // Clear the param from the URL immediately
    const next = new URLSearchParams(searchParams);
    next.delete('c');
    setSearchParams(next, { replace: true });

    // Auto-navigate to the instance bracket
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
    navigate('/v2/tictactoe', { replace: true, state: null });
  }, [allowInitialUrlHydration, navigate]);

  useEffect(() => {
    if (allowInitialUrlHydration) return;
    if (location.pathname !== '/v2/tictactoe' || location.search || location.state) return;
    setAllowInitialUrlHydration(true);
  }, [allowInitialUrlHydration, location.pathname, location.search, location.state]);

  // ─── Enrollment actions ──────────────────────────────────────────────────────

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
      console.error('[V2] Enroll error:', error);
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
      if (status !== 0) { alert('Tournament has already started or completed.'); setTournamentsLoading(false); return; }
      if (!canStart1 && !canStart2) {
        const timeUntil = escalation1Start > 0 ? escalation1Start - now : 0;
        if (timeUntil > 0) {
          const m = Math.floor(timeUntil / 60); const s = timeUntil % 60;
          alert(`Tournament cannot be force-started yet. Wait ${m}m ${s}s.`);
        } else { alert('Tournament cannot be force-started at this time.'); }
        setTournamentsLoading(false); return;
      }
      if (enrolledCount < 1) { alert('No enrolled players.'); setTournamentsLoading(false); return; }
      if (enrolledCount < 2) {
        alert('Solo-enrolled tournaments can no longer be force-started. Cancel the tournament or reset the enrollment window instead.');
        setTournamentsLoading(false);
        return;
      }
      const isEnrolled = await activeInstanceContract.isEnrolled(account);
      if (!isEnrolled) { alert('You must be enrolled to force-start.'); setTournamentsLoading(false); return; }
      const msg = `Force-starting with ${enrolledCount} players.${forfeitPool > 0n ? ` Forfeit pool of ${ethers.formatEther(forfeitPool)} ETH will be distributed.` : ''} Continue?`;
      if (!window.confirm(msg)) { setTournamentsLoading(false); return; }
      setActionState({ type: 'info', message: 'Confirm the force-start transaction in MetaMask...' });
      const tx = await writableInstance.forceStartTournament();
      setActionState({ type: 'info', message: 'Force-start submitted. Waiting for block confirmation...' });
      await tx.wait();
      setActionState({ type: 'info', message: 'Force-start confirmed. Refreshing tournament state...' });
      alert('Tournament force-started successfully!');
      const updated = await refreshTournamentBracket(viewingTournament.address);
      if (updated) setViewingTournament(updated);
      setActionState({ type: 'success', message: 'Tournament state refreshed after the force-start transaction.' });
      setTournamentsLoading(false);
    } catch (error) {
      console.error('[V2] Force start error:', error);
      alert(`Error force-starting: ${getReadableError(error, 'Unknown error')}`);
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
      if (status !== 0) { alert('Tournament has already started, completed, or been cancelled.'); setTournamentsLoading(false); return; }
      if (!isEnrolled || enrolledCount !== 1) {
        alert('Only the sole enrolled player can cancel this tournament.');
        setTournamentsLoading(false);
        return;
      }
      const entryFee = tournamentData.entryFee ?? viewingTournament.entryFeeWei ?? 0n;
      if (!window.confirm(`Cancel this tournament and refund your ${ethers.formatEther(entryFee)} ETH entry fee?\n\nThis will be recorded as an EL0 cancellation.`)) {
        setTournamentsLoading(false);
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
      setTournamentsLoading(false);
    } catch (error) {
      console.error('[V2] Cancel tournament error:', error);
      alert(`Error cancelling tournament: ${getReadableError(error, 'Unknown error')}`);
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account]);

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
      setTournamentsLoading(false);
    } catch (error) {
      console.error('[V2] Reset enrollment window error:', error);
      alert(`Failed: ${getReadableError(error, 'Unknown error')}`);
      setTournamentsLoading(false);
    }
  }, [viewingTournament, activeInstanceContract, account, refreshTournamentBracket]);

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
        if (!canClaim) { alert('Escalation 2 has not opened yet.'); setTournamentsLoading(false); return; }
        if (!window.confirm(`Claim abandoned pool? ${enrolledCount} enrolled player(s).${forfeitPool > 0n ? ` Plus ${ethers.formatEther(forfeitPool)} ETH.` : ''} The tournament will be terminated.`)) { setTournamentsLoading(false); return; }
      } else {
        if (forfeitPool <= 0n) { alert('No forfeited funds to claim.'); setTournamentsLoading(false); return; }
        if (!window.confirm(`Claim ${ethers.formatEther(forfeitPool)} ETH from abandoned pool?`)) { setTournamentsLoading(false); return; }
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
      setTournamentsLoading(false);
    } catch (error) {
      console.error('[V2] Claim abandoned pool error:', error);
      alert(`Error: ${getReadableError(error, 'Unknown error')}`);
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

  // ─── Match data helpers ──────────────────────────────────────────────────────

  const fetchMoveHistory = useCallback(async (instanceCont, roundNumber, matchNumber) => {
    try {
      // V2: getMatchMoves(roundNumber, matchNumber) returns a moves string
      let movesString = '';
      try {
        movesString = await instanceCont.getMatchMoves(roundNumber, matchNumber);
      } catch {
        const matchData = await instanceCont.getMatch(roundNumber, matchNumber);
        movesString = matchData.moves || '';
      }

      console.log('[V2] fetchMoveHistory - movesString:', movesString, 'length:', movesString.length);

      if (!movesString || movesString.length === 0) {
        console.log('[V2] fetchMoveHistory - No moves found, returning empty array');
        return [];
      }

      // Get match data and firstPlayer from matches mapping
      const matchKey = ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));
      const [matchData, fullMatch] = await Promise.all([
        instanceCont.getMatch(roundNumber, matchNumber),
        instanceCont.matches(matchKey),
      ]);

      const firstPlayer = fullMatch.firstPlayer;
      const player1 = matchData.player1;
      const player2 = matchData.player2;

      console.log('[V2] fetchMoveHistory - firstPlayer:', firstPlayer, 'player1:', player1, 'player2:', player2);

      const moves = decodeTicTacToeMoves(movesString);
      console.log('[V2] fetchMoveHistory - parsed moves:', moves);

      const history = moves.map((cellIndex, idx) => {
        const isFirstPlayerMove = idx % 2 === 0;
        const movePlayer = isFirstPlayerMove ? firstPlayer : (firstPlayer === player1 ? player2 : player1);
        return { player: isFirstPlayerMove ? 'X' : 'O', cell: cellIndex, address: movePlayer };
      });

      console.log('[V2] fetchMoveHistory - returning history:', history);
      return history;
    } catch (error) {
      console.error('[V2] Error fetching move history:', error);
      return [];
    }
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

      // Compute the matchKey — contract uses encodePacked(roundNumber, matchNumber)
      const matchKey = ethers.keccak256(ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber]));

      const [matchData, fullMatch, boardRaw, tierConfig] = await Promise.all([
        instanceCont.getMatch(roundNumber, matchNumber),
        instanceCont.matches(matchKey),
        instanceCont.getBoard(roundNumber, matchNumber).catch(() => null),
        instanceCont.tierConfig(),
      ]);
      // tierConfig.timeouts.matchTimePerPlayer (nested struct)
      const tierMatchTime = Number(tierConfig.timeouts?.matchTimePerPlayer ?? tierConfig.matchTimePerPlayer ?? 120);

      // getMatch: player1, player2, matchWinner, isDraw, status, startTime, lastMoveTime, moves
      // matches(key): adds currentTurn, firstPlayer, player1TimeRemaining, player2TimeRemaining
      // getBoard: returns uint8[9] directly (not packed)
      const player1 = matchData.player1 || matchInfo.player1;
      const player2 = matchData.player2 || matchInfo.player2;
      const matchStatus = Number(matchData.status);
      const lastMoveTime = Number(matchData.lastMoveTime);
      const startTime = Number(matchData.startTime);
      const winner = matchData.matchWinner || matchData.winner;
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      // Calculate loser: if there's a winner and match is complete, loser is the other player
      let loser = zeroAddress;
      if (matchStatus === 2 && winner && winner.toLowerCase() !== zeroAddress.toLowerCase()) {
        loser = winner.toLowerCase() === player1.toLowerCase() ? player2 : player1;
      }
      const completionReason = Number(matchData.completionReason ?? 0);
      const currentTurn = fullMatch.currentTurn;
      const firstPlayer = fullMatch.firstPlayer;
      const p1TimeRaw = fullMatch.player1TimeRemaining !== undefined ? Number(fullMatch.player1TimeRemaining) : tierMatchTime;
      const p2TimeRaw = fullMatch.player2TimeRemaining !== undefined ? Number(fullMatch.player2TimeRemaining) : tierMatchTime;
      // getBoard returns uint8[9] — convert directly, no bit-unpacking needed
      const board = boardRaw ? Array.from({ length: 9 }, (_, i) => Number(boardRaw[i] ?? 0)) : Array(9).fill(0);

      // Calculate time remaining client-side
      const now = Math.floor(Date.now() / 1000);
      const elapsed = lastMoveTime > 0 ? now - lastMoveTime : 0;
      let p1Time = p1TimeRaw;
      let p2Time = p2TimeRaw;
      const isP1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
      if (matchStatus === 1 && currentTurn && elapsed > 0) {
        if (isP1Turn) p1Time = Math.max(0, p1Time - elapsed);
        else p2Time = Math.max(0, p2Time - elapsed);
      }

      // Inline parsed object matching expected shape
      const parsed = {
        player1, player2, matchStatus, lastMoveTime, currentTurn, firstPlayer,
        winner, loser, completionReason, startTime, board,
        player1TimeRemaining: p1TimeRaw, player2TimeRemaining: p2TimeRaw,
      };

      // Fetch escalation timeout state (reuse matchKey computed above)
      let timeoutState = null;
      try {
        const timeoutData = await instanceCont.matchTimeouts(matchKey);
        const esc1Start = Number(timeoutData.escalation1Start);
        const esc2Start = Number(timeoutData.escalation2Start);
        if (esc1Start > 0 || esc2Start > 0 || timeoutData.isStalled) {
          timeoutState = {
            escalation1Start: esc1Start, escalation2Start: esc2Start,
            activeEscalation: Number(timeoutData.activeEscalation),
            timeoutActive: timeoutData.isStalled, forfeitAmount: 0,
          };
        }
      } catch { /* normal for active matches */ }

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
      } catch { /* not available */ }
      if (userAccount) {
        try {
          isUserAdvancedForRound = await instanceCont.isPlayerInAdvancedRound(roundNumber, userAccount);
        } catch { /* ignore */ }
      }

      const isPlayer1 = player1.toLowerCase() === userAccount?.toLowerCase();
      const isYourTurn = parsed.currentTurn?.toLowerCase() === userAccount?.toLowerCase();
      const isTimedOut = parsed.matchStatus === 2 && timeoutState?.timeoutActive === true;

      const result = {
        ...matchInfo,
        player1, player2,
        firstPlayer: parsed.firstPlayer,
        currentTurn: parsed.currentTurn,
        winner: parsed.winner,
        loser: parsed.loser,
        board: parsed.board,
        matchStatus: parsed.matchStatus,
        completionReason: parsed.completionReason,
        startTime: parsed.startTime,
        lastMoveTime: parsed.lastMoveTime,
        isTimedOut, isPlayer1, isYourTurn,
        userSymbol: isPlayer1 ? 'X' : 'O',
        player1TimeRemaining: p1Time,
        player2TimeRemaining: p2Time,
        matchTimePerPlayer: tierMatchTime,
        timeoutState,
        escL2Available, escL3Available, isUserAdvancedForRound,
        tierId: VIRTUAL_TIER_ID,
        instanceId: VIRTUAL_INSTANCE_ID,
      };
      return result;
    } catch (error) {
      console.error('[V2] Error refreshing match data:', error);
      return null;
    }
  }, []);

  // ─── Match actions ───────────────────────────────────────────────────────────

  const handlePlayMatch = useCallback(async (_tierId, _instanceId, roundNumber, matchNumber) => {
    if (!account) {
      alert('Please connect your wallet first.');
      return;
    }
    // _instanceId is the instance address when coming from the activity panel (profile-sourced).
    // Fall back to the currently-viewed instance contract if _instanceId is a virtual 0.
    const instanceAddress = (typeof _instanceId === 'string' && _instanceId.startsWith('0x'))
      ? _instanceId
      : (viewingTournament?.address || '');
    let instanceCont = activeInstanceContractRef.current;
    if (!instanceCont || (instanceAddress && (instanceCont.target || instanceCont.address)?.toLowerCase() !== instanceAddress.toLowerCase())) {
      if (!instanceAddress) { alert('Please connect your wallet first.'); return; }
      instanceCont = getInstanceContract(instanceAddress, getReadRunner());
      setActiveInstanceContract(instanceCont);
      activeInstanceContractRef.current = instanceCont;
    }
    try {
      setMatchLoadingMessage(DEFAULT_MATCH_LOADING_MESSAGE);
      setMatchLoading(true);

      const updated = await refreshMatchData(instanceCont, account, {
        tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID,
        roundNumber, matchNumber,
        playerCount: viewingTournament?.playerCount || 2,
        prizePool: viewingTournament?.prizePoolWei || 0n,
        instanceAddress,
      });

      if (updated) {
        setCurrentMatch(updated);
        previousBoardRef.current = [...updated.board];
        setMatchEndResult(null);
        setMatchEndWinner(null);
        setMatchEndLoser(null);
        setMatchEndWinnerLabel('');
        matchEndModalShownRef.current = updated.matchStatus === 2;
        const history = await fetchMoveHistory(instanceCont, roundNumber, matchNumber);
        console.log('[V2] handleLoadMatch - Setting moveHistory:', history);
        setMoveHistory(history);
        skipNavEffectRef.current = true;
        navigate('/v2/tictactoe', {
          replace: false,
          state: { view: 'match', instanceAddress, roundNumber, matchNumber, from: location.state?.view || 'bracket' },
        });
        setTimeout(() => {
          if (matchViewRef.current) matchViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (collapseActivityPanelRef.current) collapseActivityPanelRef.current();
        }, 100);
      }
      setMatchLoading(false);
    } catch (error) {
      console.error('[V2] Error loading match:', error);
      alert(`Error loading match: ${error.message}`);
      setMatchLoading(false);
    }
  }, [account, viewingTournament, refreshMatchData, fetchMoveHistory, navigate, location.state?.view, rpcProvider]);

  const handleCellClick = async (cellIndex) => {
    if (!currentMatch || !activeInstanceContractRef.current || !account) return;
    if (!currentMatch.isYourTurn) { alert("It's not your turn!"); return; }
    if (currentMatch.board[cellIndex] !== 0) { alert('Cell already taken!'); return; }
    if (currentMatch.matchStatus === 2) { alert('Match is already complete!'); return; }
    setMoveTxTimeout(null);
    try {
      setActionState({ type: 'info', message: 'Confirm your move in MetaMask...' });
      setMatchLoadingMessage('Confirm your move in MetaMask...');
      setMatchLoading(true);
      moveTxInProgressRef.current = true;
      const { roundNumber, matchNumber } = currentMatch;
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(
        activeInstanceContractRef.current.target || activeInstanceContractRef.current.address,
        signer
      );
      const tx = await writableInstance.makeMove(roundNumber, matchNumber, cellIndex);
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
          const history = await fetchMoveHistory(activeInstanceContractRef.current, roundNumber, matchNumber);
          console.log('[V2] handleCellClick - Setting moveHistory after move:', history);
          applyMoveHistoryUpdate(history);
        } catch (historyError) {
          console.error('[V2] Error refreshing move history after move:', historyError);
        }
      }
    } catch (error) {
      const errorString = error.message || error.toString();
      if (errorString.includes('TX_TIMEOUT')) {
        setActionState({ type: 'error', message: 'Move confirmation is taking longer than expected. If it confirms, the board will update automatically.' });
        setMoveTxTimeout({ type: 'congestion', pendingCellIndex: cellIndex });
        return;
      }
      let msg = 'Invalid Move';
      if (errorString.includes('user rejected') || errorString.includes('User denied')) msg = 'Transaction cancelled';
      else if (errorString.includes('insufficient funds')) msg = 'Insufficient funds for gas';
      else if (errorString.includes('Not your turn')) msg = 'Not your turn';
      else if (errorString.includes('Match not active')) msg = 'Match is not active';
      else if (errorString.includes('Cell already taken')) msg = 'Invalid Move - Cell already taken';
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
      const { roundNumber, matchNumber } = currentMatch;
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(
        activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer
      );
      const tx = await writableInstance.claimTimeoutWin(roundNumber, matchNumber);
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
      console.error('[V2] Claim timeout win error:', error);
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
      const { roundNumber, matchNumber } = match;
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(
        activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer
      );
      const tx = await writableInstance.forceEliminateStalledMatch(roundNumber, matchNumber);
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
      console.error('[V2] Force eliminate error:', error);
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
      const { roundNumber, matchNumber } = match;
      const signer = await browserProvider.getSigner();
      const writableInstance = getInstanceContract(
        activeInstanceContractRef.current.target || activeInstanceContractRef.current.address, signer
      );
      const tx = await writableInstance.claimMatchSlotByReplacement(roundNumber, matchNumber);
      setActionState({ type: 'info', message: 'Replacement claim submitted. Waiting for block confirmation...' });
      setMatchLoadingMessage('Replacement claim submitted. Waiting for block confirmation...');
      await tx.wait();
      setActionState({ type: 'info', message: 'Replacement claim confirmed. Refreshing tournament state...' });
      alert('Match slot claimed! You have replaced both players and advanced.');
      setCurrentMatch(null);
      setViewingTournament(null);
      setActionState({ type: 'success', message: 'Replacement claim confirmed on-chain.' });
    } catch (error) {
      console.error('[V2] Claim slot by replacement error:', error);
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

  // Sync match alert from player activity hook
  useEffect(() => {
    if (v2PlayerActivity.matchAlert) {
      setAlertMatch(v2PlayerActivity.matchAlert);
      setShowMatchAlert(true);
    }
  }, [v2PlayerActivity.matchAlert]);

  const checkForNextActiveMatch = useCallback(async () => {
    if (!activeInstanceContractRef.current || !account || !currentMatch) { setNextActiveMatch(null); return; }
    try {
      const { roundNumber } = currentMatch;
      const nextRoundNumber = roundNumber + 1;
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
            const isInMatch = p1.toLowerCase() === account.toLowerCase() ||
              p2.toLowerCase() === account.toLowerCase();
            if (isInMatch) { setNextActiveMatch({ tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID, roundNumber: nextRoundNumber, matchNumber }); return; }
          }
        } catch { continue; }
      }
      setNextActiveMatch(null);
    } catch (error) {
      console.error('[V2] Check next match error:', error);
      setNextActiveMatch(null);
    }
  }, [account, currentMatch]);

  const handleEnterNextMatch = useCallback(() => {
    if (nextActiveMatch) handlePlayMatch(nextActiveMatch.tierId, nextActiveMatch.instanceId, nextActiveMatch.roundNumber, nextActiveMatch.matchNumber);
  }, [nextActiveMatch, handlePlayMatch]);

  const handleReturnToBracket = useCallback(() => closeMatch(), [closeMatch]);

  // ─── Polling (mirrors V1) ────────────────────────────────────────────────────

  useEffect(() => { currentMatchRef.current = currentMatch; }, [currentMatch]);
  useEffect(() => { accountRefForMatch.current = account; }, [account]);
  useEffect(() => { tournamentRef.current = viewingTournament; }, [viewingTournament]);
  useEffect(() => { activeInstanceContractRef.current = activeInstanceContract; }, [activeInstanceContract]);

  // Bracket polling - every 3 seconds
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

  // Match polling - every 1.5 seconds
  useEffect(() => {
    if (!currentMatch || !activeInstanceContractRef.current || !account) return;

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
            const finalHistory = await fetchMoveHistory(instanceCont, match.roundNumber, match.matchNumber);
            console.log('[V2] Match completion polling - Setting moveHistory:', finalHistory);
            if (finalHistory && finalHistory.length > 0) setMoveHistory(finalHistory);
          } catch { /* ignore */ }

          setCurrentMatch(prev => { if (!prev || prev.matchStatus === 2) return prev; return updatedMatch; });

          const isP1 = match.player1?.toLowerCase() === userAccount.toLowerCase();
          const isP2 = match.player2?.toLowerCase() === userAccount.toLowerCase();
          if (!isP1 && !isP2) return;
          if (matchEndModalShownRef.current) return;

          const reasonNum = updatedMatch.completionReason || 0;
          const isMatchDraw = isDraw(reasonNum);
          const winnerAddress = updatedMatch.winner?.toLowerCase();
          const loserAddress = updatedMatch.loser?.toLowerCase();
          const zeroAddress = '0x0000000000000000000000000000000000000000';

          if (!isMatchDraw && (!winnerAddress || !loserAddress || winnerAddress === zeroAddress || loserAddress === zeroAddress)) return;
          const userIsWinner = !isMatchDraw && winnerAddress === userAccount.toLowerCase();
          const userWon = !isMatchDraw && userIsWinner;

          let resultType = 'lose';
          if (isMatchDraw) resultType = 'draw';
          else if (userWon) resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_win' : 'win';
          else resultType = (reasonNum === 1 || reasonNum === 3 || reasonNum === 4) ? 'forfeit_lose' : 'lose';

          matchEndModalShownRef.current = true;
          setMatchEndResult({ result: resultType, completionReason: reasonNum });
          setMatchEndWinner(updatedMatch.winner);
          setMatchEndLoser(updatedMatch.loser);

          if (userWon) setTimeout(() => checkForNextActiveMatch(), 500);
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
          };
        });

        if (boardChanged) {
          const history = await fetchMoveHistory(instanceCont, match.roundNumber, match.matchNumber);
          applyMoveHistoryUpdate(history);
        }
        previousBoardRef.current = [...updatedMatch.board];
      } catch (error) {
        console.error('[V2 Polling] Error syncing match:', error);
      }
      setSyncDots(1);
    };

    doMatchSyncRef.current = doMatchSync;
    const matchPollInterval = setInterval(doMatchSync, 1500);
    return () => clearInterval(matchPollInterval);
  }, [currentMatch?.instanceAddress, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, fetchMoveHistory]);

  // MoveMade event listener (V2 instance emits same event)
  useEffect(() => {
    if (!currentMatch || !activeInstanceContract || !account) return;
    const match = currentMatchRef.current;
    if (!match?.player1 || !match?.player2) return;

    const matchId = ethers.solidityPackedKeccak256(
      ['uint8', 'uint8'],
      [match.roundNumber, match.matchNumber]
    );
    const opponentAddress = match.player1.toLowerCase() === account.toLowerCase() ? match.player2 : match.player1;

    const handleOpponentMove = (_matchId, _player, cellIndex) => {
      setGhostMove({ cellIndex: Number(cellIndex) });
      skipNextPollRef.current = true;
      doMatchSyncRef.current?.().then(() => setGhostMove(null)).catch(() => setGhostMove(null));
    };

    try {
      const filter = activeInstanceContract.filters.MoveMade(matchId, opponentAddress);
      activeInstanceContract.on(filter, handleOpponentMove);
      return () => { activeInstanceContract.off(filter, handleOpponentMove); };
    } catch { /* instance may not support filters yet */ }
  }, [currentMatch?.roundNumber, currentMatch?.matchNumber, activeInstanceContract, account]);

  // Sync dots
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

  // ─── Browser back/forward navigation ────────────────────────────────────────

  useEffect(() => {
    const handleNav = async () => {
      // Skip when we programmatically navigated (state already set)
      if (skipNavEffectRef.current) {
        skipNavEffectRef.current = false;
        return;
      }
      // On initial page load, clear any stale history state and show landing
      if (isInitialNavRef.current) {
        isInitialNavRef.current = false;
        navigate('/v2/tictactoe', { replace: true, state: null });
        return;
      }
      const state = location.state;
      if (!state || !state.view) {
        if (currentMatch || viewingTournament) { setCurrentMatch(null); setViewingTournament(null); }
        return;
      }
      if (state.view === 'bracket' && state.instanceAddress) {
        const needsUpdate = !viewingTournament || viewingTournament.address !== state.instanceAddress;
        if (needsUpdate) {
          setCurrentMatch(null);
          const bracketData = await refreshTournamentBracket(state.instanceAddress);
          if (bracketData) {
            setViewingTournament(bracketData);
            const runner = getReadRunner();
            const instance = getInstanceContract(state.instanceAddress, runner);
            setActiveInstanceContract(instance);
            activeInstanceContractRef.current = instance;
          }
        } else if (currentMatch) { setCurrentMatch(null); }
      } else if (state.view === 'match' && state.instanceAddress && state.roundNumber !== undefined && state.matchNumber !== undefined) {
        const needsUpdate = !currentMatch || currentMatch.roundNumber !== state.roundNumber || currentMatch.matchNumber !== state.matchNumber;
        if (needsUpdate && activeInstanceContractRef.current && account) {
          try {
            setMatchLoading(true);
            const instanceCont = activeInstanceContractRef.current;
            const updated = await refreshMatchData(instanceCont, account, {
              tierId: VIRTUAL_TIER_ID, instanceId: VIRTUAL_INSTANCE_ID,
              roundNumber: state.roundNumber, matchNumber: state.matchNumber,
              instanceAddress: state.instanceAddress,
            });
            if (updated) {
              setCurrentMatch(updated);
              previousBoardRef.current = [...updated.board];
              setMatchEndResult(null);
              setMatchEndWinner(null);
              setMatchEndLoser(null);
              setMatchEndWinnerLabel('');
              matchEndModalShownRef.current = updated.matchStatus === 2;
              const history = await fetchMoveHistory(instanceCont, state.roundNumber, state.matchNumber);
              setMoveHistory(history);
            }
            setMatchLoading(false);
          } catch (error) {
            console.error('[V2] Error loading match from history:', error);
            setMatchLoading(false);
          }
        }
      } else if (state.view === 'landing') {
        if (currentMatch || viewingTournament) { setCurrentMatch(null); setViewingTournament(null); }
      }
    };
    handleNav();
  }, [location.state?.view, location.state?.instanceAddress, location.state?.roundNumber, location.state?.matchNumber]);

  // ─── Click-away handler for tooltips ────────────────────────────────────────
  useEffect(() => {
    if (!activeTooltip) return;
    const handleClickAway = () => setActiveTooltip(null);
    const timer = setTimeout(() => document.addEventListener('click', handleClickAway), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClickAway); };
  }, [activeTooltip]);

  // Set page title
  useEffect(() => { document.title = 'ETour - TicTacToe V2'; }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

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
      <ParticleBackground colors={currentTheme.particleColors} symbols={TICTACTOE_SYMBOLS} fontSize="24px" count={38} />

      {/* Wallet Browser Prompt */}
      {showPrompt && (
        <WalletBrowserPrompt onWalletChoice={handleWalletChoice} onContinueChoice={handleContinueChoice} />
      )}

      {/* Match End Modal */}
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
          gameType="tictactoe"
          roundNumber={currentMatch?.roundNumber}
          totalRounds={viewingTournament?.totalRounds}
          prizePool={viewingTournament?.prizePoolWei}
          reasonLabelMode="v2"
        />
      )}

      {/* Active Match Alert Modal */}
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

      {/* Bottom Nav Bar (mobile + desktop — mirrors V1) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:static md:z-auto">
        {/* Mobile */}
        <div className="md:hidden bg-gradient-to-b from-slate-800 to-slate-900 border-t border-purple-400/30 px-4 py-2.5 flex items-center justify-between">
          <GamesCard
            currentGame="tictactoe"
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
            gameName="tictactoe"
            gameEmoji="✖️"
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
            connectCtaClassName={currentTheme.connectCtaClassName}
            reasonLabelMode="v2"
          />
          <RecentMatchesCard
            contract={null}
            account={account}
            gameName="tictactoe"
            gameEmoji="✖️"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={setRecentMatchesCardHeight}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={{}}
            disabled={!account}
            showTooltip={activeTooltip === 'recentMatches'}
            onShowTooltip={() => setActiveTooltip('recentMatches')}
            onHideTooltip={() => setActiveTooltip(null)}
            connectCtaClassName={currentTheme.connectCtaClassName}
            onNavigateToTournament={() => {}}
            leaderboard={leaderboard}
            onMatchesLoad={() => {}}
            onScrollToMatch={(fn) => { recentMatchesScrollRef.current = fn; }}
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
        {/* Desktop */}
        <div className="hidden md:block">
          <GamesCard
            currentGame="tictactoe"
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
            gameName="tictactoe"
            gameEmoji="✖️"
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
            connectCtaClassName={currentTheme.connectCtaClassName}
            reasonLabelMode="v2"
          />
          <RecentMatchesCard
            contract={null}
            account={account}
            gameName="tictactoe"
            gameEmoji="✖️"
            gamesCardHeight={gamesCardHeight}
            playerActivityHeight={playerActivityHeight}
            onHeightChange={setRecentMatchesCardHeight}
            isExpanded={expandedPanel === 'recentMatches'}
            onToggleExpand={() => setExpandedPanel(expandedPanel === 'recentMatches' ? null : 'recentMatches')}
            tierConfig={{}}
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

      {/* Trust Banner */}
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

      <div className="max-w-7xl mx-auto px-6 pt-12" style={{ position: 'relative', zIndex: 10 }}>
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${currentTheme.heroGlow} rounded-full blur-xl opacity-50 animate-pulse`}></div>
              <Grid className={`relative ${currentTheme.heroIcon} animate-float`} size={80} />
            </div>
          </div>
          <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.heroTitle}`}>
            ETour TicTacToe
          </h1>
          <p className="text-2xl text-blue-200 mb-6">Provably Fair • Zero Trust • 100% On-Chain</p>
          <p className={`text-lg ${currentTheme.heroSubtext} max-w-3xl mx-auto`}>
            Play Tic-Tac-Toe on the blockchain. Real opponents. Real ETH on the line.
            <UserManualAnchorIcon className={`ml-2 ${currentTheme.heroSubtext}`} />
            <br />
            No servers required. No trust needed.
            <br />
            Every move is a transaction. Every outcome is permanently on-chain.
          </p>
        </div>

        {/* Action messages */}
        {(actionState.message || dashboardError) ? (
          <div className="mb-8 space-y-4">
            <ActionMessage type={actionState.type} message={actionState.message} />
            <ActionMessage type="error" message={dashboardError} />
          </div>
        ) : null}

        {/* Match View */}
        {currentMatch && (
          <div ref={matchViewRef}>
            <GameMatchLayout
              gameType="tictactoe"
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
              playerConfig={(() => {
                const isPlayer1First = currentMatch.firstPlayer?.toLowerCase() === currentMatch.player1?.toLowerCase();
                return {
                  player1: { icon: isPlayer1First ? 'X' : 'O', label: isPlayer1First ? 'Player 1 (X)' : 'Player 1 (O)' },
                  player2: { icon: isPlayer1First ? 'O' : 'X', label: isPlayer1First ? 'Player 2 (O)' : 'Player 2 (X)' },
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
              {/* TicTacToe Board */}
              <div className="w-full max-w-md mx-auto">
                <div className="grid grid-cols-3 gap-3">
                  {(() => {
                    const isPlayer1First = currentMatch.firstPlayer?.toLowerCase() === currentMatch.player1?.toLowerCase();
                    const firstPlayerCellValue = isPlayer1First ? 1 : 2;
                    return currentMatch.board.map((cell, idx) => {
                      const isGhost = cell === 0 && ghostMove?.cellIndex === idx;
                      const isFirstPlayerCell = cell === firstPlayerCellValue;
                      const isOpponentFirst = currentMatch.firstPlayer?.toLowerCase() !== account?.toLowerCase();
                      const ghostSymbol = isOpponentFirst ? 'X' : 'O';
                      const cellSymbol = cell === 0 ? (isGhost ? ghostSymbol : '') : (isFirstPlayerCell ? 'X' : 'O');
                      const cellColorClass = isGhost
                        ? 'bg-purple-500/20 text-white/30 animate-pulse cursor-not-allowed'
                        : cell === 0
                        ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200'
                        : isFirstPlayerCell
                        ? 'bg-blue-500/40 text-blue-200'
                        : 'bg-pink-500/40 text-pink-200';
                      return (
                        <button
                          key={idx}
                          onClick={isSpectator ? null : () => handleCellClick(idx)}
                          disabled={isSpectator || matchLoading || currentMatch.matchStatus === 2 || !currentMatch.isYourTurn || isGhost}
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

            {/* Move Transaction Timeout */}
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
                      onClick={() => { const c = moveTxTimeout.pendingCellIndex; setMoveTxTimeout(null); handleCellClick(c); }}
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

        {/* Tournament / Create Section */}
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
              // Landing — lobby + create form
              <div className="space-y-8 md:space-y-10">
                <V2GameLobbyIntro
                  account={account}
                  isConnecting={isConnecting}
                  onConnectWallet={connectWallet}
                  connectCtaClassName={currentTheme.connectCtaClassName}
                />
                {/* Create Tournament section */}
                <div id="live-instances">
                  <form onSubmit={createInstance}>
                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-4 md:p-5">
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-white">New Lobby</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,0.2fr)_minmax(0,0.8fr)] md:items-stretch">
                      {/* Player Count */}
                      <div className={`rounded-2xl border p-4 md:p-5 ${createLoading ? 'border-slate-800 bg-slate-900/50' : 'border-cyan-400/20 bg-slate-950/60 shadow-[0_0_30px_rgba(56,189,248,0.08)]'}`}>
                        <div className="text-sm text-purple-200 mb-3">Player Count</div>
                        <div className="grid grid-cols-3 gap-3 md:grid-cols-2">
                          {PLAYER_COUNT_OPTIONS.map(option => {
                            const active = Number(createForm.playerCount) === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                disabled={createLoading}
                                onClick={() => setPlayerCount(option)}
                                className={`px-4 py-3 rounded-xl text-base font-semibold transition-all ${option === 32 ? 'md:col-span-2' : ''} ${createLoading
                                  ? 'bg-slate-900/80 border border-slate-800 text-slate-500 cursor-not-allowed'
                                  : active
                                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                                    : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-cyan-400/40'}`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Entry Fee */}
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

                    {/* More Settings (Collapsible) */}
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
                          {/* Enrollment Window */}
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
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active
                                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                                      : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Time Per Player */}
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
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active
                                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                                      : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Increment Time */}
                          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                            <div className="text-sm text-purple-200 mb-2">Increment Time</div>
                            <div className="grid grid-cols-2 gap-2">
                              {TIME_INCREMENT_OPTIONS.map(seconds => {
                                const active = Number(createForm.timeIncrementPerMove) === seconds;
                                const label = `${seconds}s`;
                                return (
                                  <button
                                    key={seconds}
                                    type="button"
                                    onClick={() => updateCreateForm('timeIncrementPerMove', seconds)}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active
                                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                                      : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/40'}`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
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
                </form>
              </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Manual */}
      <div id="user-manual" className="max-w-7xl mx-auto px-6 pt-8 md:pt-10 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <UserManualV2 />
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="text-center md:text-left">
              <p className="text-slate-500 text-sm mb-2">
                Powered by{' '}
                <span className="font-semibold bg-clip-text text-transparent" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text' }}>
                  ETour Protocol
                </span>
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
                    <td className="p-4 text-slate-300">TicTacToe v2 Factory</td>
                    <td className="p-4 font-mono text-slate-400 break-all">{factoryAddress}</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-slate-300">TicTacToe v2 Instance Implementation</td>
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
        @keyframes particle-float {
          0% { transform: translateY(100vh) translateX(0); opacity: 0.3; }
          10% { opacity: 0.5; }
          90% { opacity: 1; }
          100% { transform: translateY(calc(-100vh - 100px)) translateX(100px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
