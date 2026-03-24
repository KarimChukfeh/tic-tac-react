import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ethers } from 'ethers';
import { CURRENT_NETWORK, getAddressUrl } from '../../config/networks';
import { shortenAddress } from '../../utils/formatters';
import { getCompletionReasonText } from '../../utils/completionReasons';
import ParticleBackground from '../../components/shared/ParticleBackground';
import WhyArbitrum from '../../components/shared/WhyArbitrum';
import ConnectedWalletCard from '../../components/shared/ConnectedWalletCard';
import TicTacToeBoard from '../components/TicTacToeBoard';
import {
  PLAYER_COUNT_OPTIONS,
  TICTACTOE_V2_FACTORY_ADDRESS,
  TICTACTOE_V2_IMPLEMENTATION_ADDRESS,
  buildTimeoutConfig,
  formatEth,
  formatRelativeTime,
  formatTimestamp,
  getDefaultTimeouts,
  getFactoryContract,
  getInstanceContract,
  getRoundLabel,
  getTournamentTypeLabel,
  isZeroAddress,
  normalizeInstanceSnapshot,
  normalizeMatch,
  normalizeTierConfig,
  resolveCreatedInstanceAddress,
} from '../lib/tictactoe';

const TICTACTOE_SYMBOLS = ['✕', '○'];

const DEFAULT_CREATE_FORM = {
  playerCount: 2,
  entryFee: '0.001',
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
  buttonGradient: 'from-blue-500 to-cyan-500',
  buttonHover: 'hover:from-blue-600 hover:to-cyan-600',
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

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[type] || styles.info}`}>
      {message}
    </div>
  );
}

function MetricBox({ label, value, subtext, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30 text-blue-300',
    green: 'from-green-500/20 to-emerald-500/20 border-green-400/30 text-green-300',
    purple: 'from-purple-500/20 to-violet-500/20 border-purple-400/30 text-purple-300',
  };

  const toneClasses = tones[tone] || tones.blue;

  return (
    <div className={`bg-gradient-to-br ${toneClasses} border rounded-xl p-4`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {subtext ? <p className="mt-2 text-sm text-white/80">{subtext}</p> : null}
    </div>
  );
}

function timeoutFieldId(key) {
  return `timeout-${key}`;
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

export default function TicTacToeV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rpcProviderRef = useRef(null);
  const instanceSectionRef = useRef(null);
  const pendingScrollAddressRef = useRef(null);

  const [factory, setFactory] = useState(null);
  const [browserProvider, setBrowserProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWhyArbitrumExpanded, setIsWhyArbitrumExpanded] = useState(true);
  const [contractsExpanded, setContractsExpanded] = useState(false);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [tiers, setTiers] = useState([]);
  const [instances, setInstances] = useState([]);
  const [factoryRules, setFactoryRules] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [selectedInstance, setSelectedInstance] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState('');

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [actionState, setActionState] = useState({ type: 'info', message: '' });

  const selectedAddress = searchParams.get('instance');
  const explorerUrl = getAddressUrl(TICTACTOE_V2_FACTORY_ADDRESS);

  useEffect(() => {
    const provider = new ethers.JsonRpcProvider(CURRENT_NETWORK.rpcUrl);
    rpcProviderRef.current = provider;
    setFactory(getFactoryContract(provider));
  }, []);

  useEffect(() => {
    if (!isWalletAvailable()) return undefined;

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0] || '');
    };

    const handleChainChanged = async () => {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      setBrowserProvider(provider);
      const signer = await provider.getSigner().catch(() => null);
      setAccount(signer ? await signer.getAddress() : '');
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
      const accounts = await provider.send('eth_accounts', []);
      setBrowserProvider(provider);
      setAccount(accounts[0] || '');
    };

    bootWallet().catch(() => {});
  }, []);

  useEffect(() => {
    const loadBalance = async () => {
      if (!account || !rpcProviderRef.current) {
        setBalance(null);
        return;
      }

      try {
        const wei = await rpcProviderRef.current.getBalance(account);
        setBalance(ethers.formatEther(wei));
      } catch {
        setBalance(null);
      }
    };

    loadBalance();
  }, [account, lastUpdated]);

  useEffect(() => {
    if (!factory) return;

    let cancelled = false;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError('');

      try {
        const [minEntryFee, feeIncrement, activeTierData, rawCount] = await Promise.all([
          factory.MIN_ENTRY_FEE(),
          factory.FEE_INCREMENT(),
          factory.getActiveTierConfigs(),
          factory.getInstanceCount(),
        ]);

        const count = Number(rawCount);
        const addresses = count > 0 ? await factory.getInstances(0, count) : [];

        const snapshots = await Promise.all(
          [...addresses].reverse().map(async (address) => {
            const instance = getInstanceContract(address, rpcProviderRef.current);
            const [info, tournament, players, enrolled] = await Promise.all([
              instance.getInstanceInfo(),
              instance.tournament(),
              instance.getPlayers(),
              account ? instance.isEnrolled(account) : Promise.resolve(false),
            ]);

            return normalizeInstanceSnapshot(address, info, tournament, players, enrolled);
          })
        );

        if (cancelled) return;

        const normalizedTiers = activeTierData.configs
          .map(config => normalizeTierConfig(config))
          .sort((a, b) => a.playerCount - b.playerCount || Number(a.entryFeeWei - b.entryFeeWei));

        setFactoryRules({
          minEntryFee,
          feeIncrement,
        });
        setTiers(normalizedTiers);
        setInstances(snapshots);
        setLastUpdated(Date.now());
      } catch (error) {
        if (cancelled) return;
        setDashboardError(error.shortMessage || error.message || 'Failed to load TicTacToe v2.');
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [factory, account]);

  useEffect(() => {
    if (!selectedAddress) {
      setSelectedInstance(null);
      setSelectedError('');
      return;
    }

    let cancelled = false;

    const loadSelectedInstance = async () => {
      setSelectedLoading(true);
      setSelectedError('');

      try {
        const instance = getInstanceContract(selectedAddress, rpcProviderRef.current);
        const [info, tournament, tierConfig, players, prizeDistribution, bracket, enrolled, playerResult] = await Promise.all([
          instance.getInstanceInfo(),
          instance.tournament(),
          instance.tierConfig(),
          instance.getPlayers(),
          instance.getPrizeDistribution(),
          instance.getBracket(),
          account ? instance.isEnrolled(account) : Promise.resolve(false),
          account ? instance.getPlayerResult(account) : Promise.resolve(null),
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
                return normalizeMatch(roundIndex, matchIndex, matchData, board);
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

        if (cancelled) return;

        setSelectedInstance({
          ...normalizeInstanceSnapshot(selectedAddress, info, tournament, players, enrolled),
          tierConfig: normalizeTierConfig(tierConfig),
          rounds,
          playerResult: playerResult
            ? {
                participated: Boolean(playerResult.participated),
                prizeWonWei: playerResult.prizeWon,
                prizeWonEth: formatEth(playerResult.prizeWon),
                isWinner: Boolean(playerResult.isWinner),
              }
            : null,
          prizeDistribution: {
            players: prizeDistribution.players,
            amounts: prizeDistribution.amounts.map(amount => ({
              wei: amount,
              eth: formatEth(amount),
            })),
          },
        });
      } catch (error) {
        if (cancelled) return;
        setSelectedError(error.shortMessage || error.message || 'Failed to load instance.');
      } finally {
        if (!cancelled) {
          setSelectedLoading(false);
        }
      }
    };

    loadSelectedInstance();

    return () => {
      cancelled = true;
    };
  }, [selectedAddress, account]);

  useEffect(() => {
    if (!selectedInstance) return;
    if (pendingScrollAddressRef.current !== selectedInstance.address) return;

    instanceSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    pendingScrollAddressRef.current = null;
  }, [selectedInstance]);

  const connectWallet = async () => {
    if (!isWalletAvailable()) {
      setActionState({
        type: 'error',
        message: 'No injected wallet detected. Open this page in a wallet browser or install MetaMask.',
      });
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      setBrowserProvider(provider);
      setAccount(await signer.getAddress());
    } catch (error) {
      setActionState({
        type: 'error',
        message: error.shortMessage || error.message || 'Wallet connection failed.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const refreshDashboard = async () => {
    if (!factory) return;
    setDashboardLoading(true);
    try {
      const [activeTierData, rawCount] = await Promise.all([
        factory.getActiveTierConfigs(),
        factory.getInstanceCount(),
      ]);
      const count = Number(rawCount);
      const addresses = count > 0 ? await factory.getInstances(0, count) : [];
      const snapshots = await Promise.all(
        [...addresses].reverse().map(async (address) => {
          const instance = getInstanceContract(address, rpcProviderRef.current);
          const [info, tournament, players, enrolled] = await Promise.all([
            instance.getInstanceInfo(),
            instance.tournament(),
            instance.getPlayers(),
            account ? instance.isEnrolled(account) : Promise.resolve(false),
          ]);

          return normalizeInstanceSnapshot(address, info, tournament, players, enrolled);
        })
      );
      setTiers(activeTierData.configs.map(config => normalizeTierConfig(config)));
      setInstances(snapshots);
      setLastUpdated(Date.now());
    } catch (error) {
      setDashboardError(error.shortMessage || error.message || 'Refresh failed.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const selectInstance = (address) => {
    const next = new URLSearchParams(searchParams);
    next.set('instance', address);
    setSearchParams(next);
  };

  const clearSelectedInstance = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('instance');
    setSearchParams(next);
  };

  const updateCreateForm = (field, value) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  const setPlayerCount = (playerCount) => {
    setCreateForm(prev => ({
      ...prev,
      playerCount,
      ...getDefaultTimeouts(playerCount),
    }));
  };

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
      const writableFactory = getFactoryContract(signer);
      const countBefore = Number(await writableFactory.getInstanceCount());
      const entryFeeWei = ethers.parseEther(createForm.entryFee);
      const tx = await writableFactory.createInstance(
        Number(createForm.playerCount),
        entryFeeWei,
        buildTimeoutConfig(createForm)
      );
      const receipt = await tx.wait();
      const address = await resolveCreatedInstanceAddress({
        factory: getFactoryContract(rpcProviderRef.current),
        provider: rpcProviderRef.current,
        creator,
        playerCount: Number(createForm.playerCount),
        entryFeeWei,
        countBefore,
        receipt,
      });
      if (!address) {
        throw new Error('Transaction mined, but the frontend could not locate the created instance from on-chain state.');
      }

      const readInstance = getInstanceContract(address, rpcProviderRef.current);
      const [info, tournament] = await Promise.all([
        readInstance.getInstanceInfo(),
        readInstance.tournament(),
      ]);

      const createdAt = Number(info.createdAt || 0);
      const instanceCreator = info.instanceCreator;

      if (!createdAt || isZeroAddress(instanceCreator)) {
        throw new Error('On-chain verification failed for the new instance.');
      }

      setActionState({
        type: 'success',
        message: `Instance created on-chain at ${address} and opened below.`,
      });

      await refreshDashboard();
      pendingScrollAddressRef.current = address;
      selectInstance(address);
    } catch (error) {
      setActionState({
        type: 'error',
        message: error.shortMessage || error.message || 'Could not create instance.',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const withInstanceSigner = async (address) => {
    if (!browserProvider || !account) {
      throw new Error('Connect a wallet first.');
    }
    const signer = await browserProvider.getSigner();
    return getInstanceContract(address, signer);
  };

  const enrollInSelected = async () => {
    if (!selectedInstance) return;

    setActionState({ type: 'info', message: 'Submitting enrollment transaction...' });
    try {
      const instance = await withInstanceSigner(selectedInstance.address);
      const tx = await instance.enrollInTournament({
        value: selectedInstance.entryFeeWei,
      });
      await tx.wait();
      setActionState({ type: 'success', message: 'Enrollment confirmed.' });
      await refreshDashboard();
    } catch (error) {
      setActionState({
        type: 'error',
        message: error.shortMessage || error.message || 'Enrollment failed.',
      });
    }
  };

  const forceStartSelected = async () => {
    if (!selectedInstance) return;

    setActionState({ type: 'info', message: 'Submitting forceStartTournament transaction...' });
    try {
      const instance = await withInstanceSigner(selectedInstance.address);
      const tx = await instance.forceStartTournament();
      await tx.wait();
      setActionState({ type: 'success', message: 'Tournament start submitted.' });
      await refreshDashboard();
    } catch (error) {
      setActionState({
        type: 'error',
        message: error.shortMessage || error.message || 'Could not force start the tournament.',
      });
    }
  };

  const claimAbandonedPool = async () => {
    if (!selectedInstance) return;

    setActionState({ type: 'info', message: 'Submitting abandoned pool claim...' });
    try {
      const instance = await withInstanceSigner(selectedInstance.address);
      const tx = await instance.claimAbandonedPool();
      await tx.wait();
      setActionState({ type: 'success', message: 'Abandoned pool claimed.' });
      await refreshDashboard();
    } catch (error) {
      setActionState({
        type: 'error',
        message: error.shortMessage || error.message || 'Could not claim abandoned pool.',
      });
    }
  };

  const makeMove = async (roundNumber, matchNumber, cellIndex) => {
    if (!selectedInstance) return;

    setActionState({ type: 'info', message: `Submitting move to cell ${cellIndex + 1}...` });
    try {
      const instance = await withInstanceSigner(selectedInstance.address);
      const tx = await instance.makeMove(roundNumber, matchNumber, cellIndex);
      await tx.wait();
      setActionState({ type: 'success', message: 'Move confirmed.' });
      await refreshDashboard();
    } catch (error) {
      setActionState({
        type: 'error',
        message: error.shortMessage || error.message || 'Move failed.',
      });
    }
  };

  const activeMatchesForUser = selectedInstance
    ? selectedInstance.rounds.flatMap(round =>
        round.matches.filter(match =>
          match.status === 1 &&
          account &&
          [match.player1?.toLowerCase(), match.player2?.toLowerCase()].includes(account.toLowerCase())
        )
      )
    : [];

  const currentInstances = instances.filter(instance => instance.status === 0 || instance.status === 1);

  if (dashboardLoading && !lastUpdated) {
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
          <p className="text-blue-400/70">Connecting to TicTacToe v2 on-chain state...</p>
        </div>
      </div>
    );
  }

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
      <ParticleBackground colors={currentTheme.particleColors} symbols={TICTACTOE_SYMBOLS} fontSize="24px" />

      <div
        style={{
          background: 'rgba(0, 100, 200, 0.2)',
          borderBottom: `1px solid ${currentTheme.border}`,
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className={`flex flex-col md:flex-row md:items-center ${explorerUrl ? 'md:justify-between' : 'md:justify-center'} gap-3 md:gap-4 text-xs md:text-sm`}>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-6 justify-center ${explorerUrl ? 'md:justify-start' : ''}`}>
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
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors justify-center md:justify-end"
              >
                <Code size={16} />
                <span className="font-mono text-xs">{shortenAddress(TICTACTOE_V2_FACTORY_ADDRESS)}</span>
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
          <p className={`text-lg ${currentTheme.heroSubtext} max-w-3xl mx-auto mb-2`}>
            Play Tic-Tac-Toe on the blockchain. Real opponents. Real ETH on the line.
            <br />
            No servers required. No trust needed.
            <br />
            Every move is a transaction. Every outcome is permanently on-chain.
          </p>
          <p className="text-base text-cyan-300 max-w-3xl mx-auto mb-8">
            V2 replaces fixed tiers and preallocated slots with on-demand tournament instance creation.
          </p>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-300">Custom match timing</span>
              </div>
              <p className="text-sm text-yellow-200">
                Choose player count, entry fee, and timeout profile when you create an instance.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-green-400" size={20} />
                <span className="font-bold text-green-300">Permanent on-chain records</span>
              </div>
              <p className="text-sm text-green-200">
                Every instance is its own immutable tournament record with roster, bracket, and result history.
              </p>
            </div>
            <div className="relative bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-purple-400" size={20} />
                <span className="font-bold text-purple-300">Factory-driven instances</span>
              </div>
              <p className="text-sm text-purple-200">
                No browsing fixed tiers. Create the exact duel or bracket you want and share the resulting instance.
              </p>
            </div>
          </div>

          {!account ? (
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
              contractAddress={TICTACTOE_V2_FACTORY_ADDRESS}
              contractName="TicTacToe v2 Factory"
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
          <ActionMessage type="error" message={selectedError} />
        </div>

        <SectionShell
          id="live-instances"
          title="Create New Instance"
          right={
            <button
              type="button"
              onClick={refreshDashboard}
              className="flex items-center gap-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-200 px-4 py-2 rounded-xl transition-colors"
            >
              <RefreshCw size={16} className={dashboardLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          }
        >
          <form onSubmit={createInstance}>
            <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-5">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <div className="text-sm text-purple-200 mb-3">Player Count</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {PLAYER_COUNT_OPTIONS.map(option => {
                      const active = Number(createForm.playerCount) === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setPlayerCount(option)}
                          className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                            active
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                              : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-cyan-400/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block">
                    <div className="text-sm text-purple-200 mb-3">Entry Fee (ETH)</div>
                    <input
                      type="number"
                      min={factoryRules ? formatEth(factoryRules.minEntryFee, 3) : '0.001'}
                      step={factoryRules ? formatEth(factoryRules.feeIncrement, 3) : '0.001'}
                      value={createForm.entryFee}
                      onChange={event => updateCreateForm('entryFee', event.target.value)}
                      className="w-full bg-slate-950/80 border border-purple-400/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-slate-400">
                  {getTournamentTypeLabel(createForm.playerCount)} format. Timeouts and escalation values use the built-in defaults for this player count.
                </div>
                <button
                  type="submit"
                  disabled={createLoading}
                  className={`w-full md:w-auto flex items-center justify-center gap-3 bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {createLoading ? <Loader size={22} className="animate-spin" /> : <Plus size={22} />}
                  {createLoading ? 'Creating Instance...' : 'Create V2 Instance'}
                </button>
              </div>
            </div>
          </form>
        </SectionShell>

        {(selectedLoading || selectedInstance) && (
          <div ref={instanceSectionRef}>
          <SectionShell
            title={selectedInstance ? 'Current Instance' : 'Loading Instance'}
            right={selectedAddress ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelectedInstance}
                  className="text-sm bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 px-4 py-2 rounded-xl transition-colors"
                >
                  Clear
                </button>
                {selectedAddress ? (
                  <a
                    href={getAddressUrl(selectedAddress) || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-200 px-4 py-2 rounded-xl transition-colors"
                  >
                    Explorer
                  </a>
                ) : null}
              </div>
            ) : null}
          >
            {selectedLoading ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-purple-300">Loading instance...</p>
                </div>
              </div>
            ) : null}

            {selectedInstance ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricBox label="Status" value={selectedInstance.statusLabel} subtext={`Created ${formatRelativeTime(selectedInstance.createdAt)}`} tone="purple" />
                  <MetricBox label="Entry Fee" value={`${selectedInstance.entryFeeEth} ETH`} subtext={`${selectedInstance.playerCount} players`} tone="blue" />
                  <MetricBox label="Prize Pool" value={`${selectedInstance.prizePoolEth} ETH`} subtext={`${selectedInstance.enrolledCount} enrolled`} tone="green" />
                  <MetricBox label="Instance" value={shortenAddress(selectedInstance.address)} subtext={CURRENT_NETWORK.name} tone="blue" />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={enrollInSelected}
                    disabled={!account || selectedInstance.isEnrolled}
                    className={`bg-gradient-to-r ${currentTheme.buttonGradient} ${currentTheme.buttonHover} px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {selectedInstance.isEnrolled ? 'Already Enrolled' : `Enroll for ${selectedInstance.entryFeeEth} ETH`}
                  </button>
                  <button
                    type="button"
                    onClick={forceStartSelected}
                    disabled={!account}
                    className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Force Start
                  </button>
                  <button
                    type="button"
                    onClick={claimAbandonedPool}
                    disabled={!account}
                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Claim Abandoned Pool
                  </button>
                </div>

                <div className="grid xl:grid-cols-[0.72fr_1.28fr] gap-6">
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-5">
                      <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                        <Users size={22} />
                        Enrolled Players
                      </h3>
                      <div className="space-y-2">
                        {selectedInstance.players.length === 0 ? (
                          <div className="text-purple-200/70">Nobody enrolled yet.</div>
                        ) : (
                          selectedInstance.players.map((player, index) => (
                            <div key={`${player}-${index}`} className="bg-purple-500/10 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-purple-300">Seat {index + 1}</span>
                              <span className="font-mono text-white">{shortenAddress(player)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-5">
                      <h3 className="text-2xl font-bold text-purple-300 mb-4">Your Position</h3>
                      <div className="space-y-2 text-sm text-purple-100">
                        <div>Enrolled: <strong>{selectedInstance.isEnrolled ? 'Yes' : 'No'}</strong></div>
                        {selectedInstance.playerResult ? (
                          <>
                            <div>Participated: <strong>{selectedInstance.playerResult.participated ? 'Yes' : 'No'}</strong></div>
                            <div>Prize won: <strong>{selectedInstance.playerResult.prizeWonEth} ETH</strong></div>
                            <div>Winner: <strong>{selectedInstance.playerResult.isWinner ? 'Yes' : 'No'}</strong></div>
                          </>
                        ) : (
                          <div>Connect a wallet to view player-specific results.</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-5">
                      <h3 className="text-2xl font-bold text-purple-300 mb-4">Prize Distribution</h3>
                      <div className="space-y-2">
                        {selectedInstance.prizeDistribution.players.length === 0 ? (
                          <div className="text-purple-200/70">No payouts recorded yet.</div>
                        ) : (
                          selectedInstance.prizeDistribution.players.map((player, index) => (
                            <div key={`${player}-payout-${index}`} className="bg-purple-500/10 rounded-xl p-3 flex items-center justify-between">
                              <span className="font-mono text-white">{shortenAddress(player)}</span>
                              <span className="text-green-300">{selectedInstance.prizeDistribution.amounts[index]?.eth} ETH</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {activeMatchesForUser.length > 0 ? (
                      activeMatchesForUser.map(match => (
                        <div key={`active-${match.roundNumber}-${match.matchNumber}`} className="bg-gradient-to-br from-slate-900/60 to-purple-900/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
                          <h3 className="text-2xl font-bold text-purple-300 mb-3 flex items-center gap-2">
                            <Grid size={24} />
                            Active Match
                          </h3>
                          <p className="text-purple-200 mb-4">
                            Round {match.roundNumber + 1} • Match {match.matchNumber + 1}
                          </p>
                          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4 items-start">
                            <TicTacToeBoard
                              board={match.board}
                              disabled={match.status !== 1}
                              onSelectCell={cellIndex => makeMove(match.roundNumber, match.matchNumber, cellIndex)}
                            />
                            <div className="space-y-2 text-sm text-purple-100">
                              <div>Player 1: {shortenAddress(match.player1)}</div>
                              <div>Player 2: {shortenAddress(match.player2)}</div>
                              <div>Status: {match.statusLabel}</div>
                              <div>Started: {formatTimestamp(match.startTime)}</div>
                              <div>Last move: {formatTimestamp(match.lastMoveTime)}</div>
                              <div>Moves logged: {match.moveCount}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-6 text-purple-200/80">
                        No active match for the connected wallet in this instance right now.
                      </div>
                    )}

                    <div className="space-y-4">
                      {selectedInstance.rounds.map(round => (
                        <div key={`round-${round.roundIndex}`} className="bg-gradient-to-br from-slate-900/60 to-purple-900/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
                          <h4 className="text-xl font-bold text-purple-400 mb-2">{round.label}</h4>
                          <p className="text-sm text-purple-200/80 mb-4">
                            {round.completedCount}/{round.matchCount} matches complete
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {round.matches.map(match => {
                              const completionText = isZeroAddress(match.winner)
                                ? null
                                : getCompletionReasonText(
                                    selectedInstance.completionReason,
                                    account && match.winner.toLowerCase() === account.toLowerCase(),
                                    'tictactoe'
                                  );

                              return (
                                <div key={`match-${match.roundNumber}-${match.matchNumber}`} className="bg-purple-500/10 rounded-xl p-4 border border-purple-400/10">
                                  <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                      <div className="font-bold text-white">Match {match.matchNumber + 1}</div>
                                      <div className="text-sm text-purple-200/80">
                                        {shortenAddress(match.player1)} vs {shortenAddress(match.player2)}
                                      </div>
                                    </div>
                                    <div className="text-xs uppercase tracking-[0.18em] text-purple-300">{match.statusLabel}</div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-4 items-start">
                                    <TicTacToeBoard board={match.board} disabled onSelectCell={() => {}} />
                                    <div className="space-y-2 text-sm text-purple-100">
                                      <div>Winner: {isZeroAddress(match.winner) ? 'TBD' : shortenAddress(match.winner)}</div>
                                      <div>Moves logged: {match.moveCount}</div>
                                      <div>Started: {formatTimestamp(match.startTime)}</div>
                                      <div>Last move: {formatTimestamp(match.lastMoveTime)}</div>
                                      {completionText ? <div className="text-cyan-200">{completionText}</div> : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </SectionShell>
          </div>
        )}

        <SectionShell title="Current Instances">
          {currentInstances.length === 0 ? (
            <div className="bg-slate-900/50 border border-purple-400/20 rounded-2xl p-6 text-purple-200/80">
              No uncompleted instances right now. Create a new one to open the queue.
            </div>
          ) : (
            <div className="space-y-4">
              {currentInstances.map(instance => {
                const isSelected = selectedAddress === instance.address;
                return (
                  <button
                    key={instance.address}
                    type="button"
                    onClick={() => selectInstance(instance.address)}
                    className={`w-full text-left rounded-2xl border p-5 transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10'
                        : 'border-purple-400/20 bg-slate-900/50 hover:border-cyan-400/40 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xl font-bold text-white">
                            {instance.playerCount}-player {getTournamentTypeLabel(instance.playerCount).toLowerCase()}
                          </div>
                          <div className="text-xs uppercase tracking-[0.18em] text-purple-300">
                            {instance.statusLabel}
                          </div>
                          {instance.isEnrolled ? (
                            <div className="text-xs uppercase tracking-[0.18em] text-green-300">
                              You&apos;re in
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm text-slate-300">
                          {instance.entryFeeEth} ETH • {instance.enrolledCount}/{instance.playerCount} players • created {formatRelativeTime(instance.createdAt)}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-purple-200">Prize Pool</div>
                        <div className="text-white font-bold">{instance.prizePoolEth} ETH</div>
                      </div>
                    </div>
                    <div className="mt-3 font-mono text-sm text-slate-400">
                      {instance.address}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionShell>
      </div>

      <footer className="border-t border-slate-800/50 px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
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

            <div className="flex items-center gap-6">
              <button
                onClick={() => setContractsExpanded(!contractsExpanded)}
                className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                Contracts {contractsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <Link
                to="/"
                className="text-slate-500 hover:text-white transition-colors text-sm"
              >
                Back Home
              </Link>
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
                    <td className="p-4 font-mono text-slate-400 break-all">{TICTACTOE_V2_FACTORY_ADDRESS}</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-slate-300">TicTacToe v2 Instance Implementation</td>
                    <td className="p-4 font-mono text-slate-400 break-all">{TICTACTOE_V2_IMPLEMENTATION_ADDRESS}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="text-center pt-8 border-t border-slate-800/30">
            <p className="text-slate-600 text-xs">
              No company needed. No trust required. No servers to shutdown.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
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
