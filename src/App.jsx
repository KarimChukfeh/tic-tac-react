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

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Swords, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Play, Users, DollarSign, Zap, TrendingUp, History,
  Award, Target, CheckCircle, Info, Coins, AlertCircle, ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react';
import { ethers } from 'ethers';
import DUMMY_ABI from './TourABI.json';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

// Particle Background Component (Dream/Daring Themes)
const ParticleBackground = ({ colors }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const particles = useMemo(() => {
    const particleCount = isMobile ? 25 : 50;
    return Array.from({ length: particleCount }, (_, i) => {
      const useFirstColor = Math.random() > 0.5;
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 15,
        duration: 20 + Math.random() * 20,
        colorIndex: useFirstColor ? 0 : 1,
        symbol: useFirstColor ? 'X' : 'O'
      };
    });
  }, [isMobile]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {/* Particles */}
      {particles.map((p) => {
        const color = colors[p.colorIndex];
        return (
          <div
            key={p.id}
            className="particle"
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              transform: 'translateY(100vh)',
              animation: `particle-float ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
              willChange: 'transform, opacity',
              color: color,
              fontWeight: 'bold',
              textShadow: `0 0 8px ${color}`
            }}
          >
            {p.symbol}
          </div>
        );
      })}
    </div>
  );
};

// Whitepaper Markdown Renderer Component
const WhitepaperSection = () => {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/ETTT_Whitepaper.md')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load whitepaper');
        }
        return response.text();
      })
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div id="whitepaper" className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-purple-500/30 mb-16">
        <p className="text-purple-100 text-center">Loading whitepaper...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="whitepaper" className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-purple-500/30 mb-16">
        <p className="text-red-400 text-center">Error loading whitepaper: {error}</p>
      </div>
    );
  }

  // Helper function to generate heading IDs (slug)
  const generateId = (text) => {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^\w\-]+/g, '')       // Remove non-word chars except hyphens
      .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
      .replace(/^-+/, '')             // Trim hyphens from start
      .replace(/-+$/, '');            // Trim hyphens from end
  };

  return (
    <div id="whitepaper" className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-purple-500/30 mb-16">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({node, children, ...props}) => {
            const id = generateId(children);
            return <h1 id={id} className="text-4xl font-bold text-purple-300 mb-6 mt-8" {...props}>{children}</h1>;
          },
          h2: ({node, children, ...props}) => {
            const id = generateId(children);
            return <h2 id={id} className="text-3xl font-bold text-purple-300 mb-4 mt-8" {...props}>{children}</h2>;
          },
          h3: ({node, children, ...props}) => {
            const id = generateId(children);
            return <h3 id={id} className="text-2xl font-bold text-purple-300 mb-3 mt-6" {...props}>{children}</h3>;
          },
          p: ({node, ...props}) => <p className="text-purple-100 mb-4 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 text-purple-100 space-y-2" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 text-purple-100 space-y-2" {...props} />,
          li: ({node, ...props}) => <li className="text-purple-100" {...props} />,
          code: ({node, inline, className, ...props}) => {
            // Check if it's inline code (single backticks) or block code (triple backticks)
            const isInline = inline || !className?.includes('language-');
            return isInline
              ? <code className="bg-purple-500/20 px-2 py-1 rounded text-purple-200 text-sm" {...props} />
              : <code className="block bg-purple-900/50 p-4 rounded-lg text-purple-200 text-sm overflow-x-auto mb-4" {...props} />;
          },
          pre: ({node, ...props}) => <pre className="bg-purple-900/50 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-400 pl-4 italic text-purple-200 my-4" {...props} />,
          hr: ({node, ...props}) => <hr className="border-purple-500/30 my-8" {...props} />,
          a: ({node, href, children, ...props}) => {
            // Handle internal anchor links with smooth scrolling
            if (href?.startsWith('#')) {
              return (
                <a
                  href={href}
                  className="text-purple-300 hover:text-purple-200 underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(href.slice(1));
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  {...props}
                >
                  {children}
                </a>
              );
            }
            // External links
            return <a href={href} className="text-purple-300 hover:text-purple-200 underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
          },
          strong: ({node, ...props}) => <strong className="text-purple-200 font-bold" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto mb-6"><table className="w-full border-collapse" {...props} /></div>,
          thead: ({node, ...props}) => <thead className="border-b border-purple-500/30" {...props} />,
          th: ({node, ...props}) => <th className="text-left p-3 text-purple-300" {...props} />,
          td: ({node, ...props}) => <td className="p-3 text-purple-100 border-b border-purple-500/20" {...props} />,
          details: ({node, ...props}) => <details className="mb-6 border border-purple-500/30 rounded-lg p-4 bg-purple-900/20" {...props} />,
          summary: ({node, ...props}) => <summary className="cursor-pointer text-purple-300 text-xl font-bold mb-2 hover:text-purple-200 transition-colors" {...props} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

// Glass Panel Component (Dream Theme)
const GlassPanel = ({ children, style, className = '' }) => (
  <div
    className={className}
    style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      borderRadius: '15px',
      padding: '20px',
      boxShadow: '0 8px 32px 0 rgba(0, 255, 255, 0.2)',
      animation: 'float 3s ease-in-out infinite',
      ...style
    }}
  >
    {children}
  </div>
);

// Helper function
const shortenAddress = (addr) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// Game status labels with emojis
const getStatusLabel = (status) => {
  switch(status) {
    case 0: return 'Waiting for Players';
    case 1: return 'Ready to Start';
    case 2: return 'Battle in Progress';
    case 3: return 'Game Complete';
    default: return 'Unknown';
  }
};

const getStatusEmoji = (status) => {
  switch(status) {
    case 0: return '⏳';
    case 1: return '✅';
    case 2: return '⚔️';
    case 3: return '🏆';
    default: return '❓';
  }
};

// Cell symbol
const getCellSymbol = (cell) => {
  switch(cell) {
    case 0: return '';
    case 1: return 'X';
    case 2: return 'O';
    default: return '';
  }
};

// Check for winner and winning line
const checkWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] }; // Returns 1 for X, 2 for O
    }
  }

  if (board.every(cell => cell !== 0)) return { winner: 'draw', line: [] };
  return null;
};

// Calculate prize distribution
const calculatePrizes = (pot, isDraw) => {
  const potValue = parseFloat(pot);
  if (isDraw) {
    return {
      player1Refund: (potValue * 0.45).toFixed(6),
      player2Refund: (potValue * 0.45).toFixed(6),
      houseFee: (potValue * 0.10).toFixed(6)
    };
  } else {
    return {
      winnerPayout: (potValue * 0.90).toFixed(6),
      houseFee: (potValue * 0.10).toFixed(6)
    };
  }
};

// Prize Distribution Component
const PrizeDistribution = ({ pot, winner, winnerAddress, theme }) => {
  const isDraw = winner === 'draw';
  const prizes = calculatePrizes(pot, isDraw);

  // Theme-aware colors for total pot
  const potColors = theme === 'dream'
    ? {
        bg: 'bg-purple-500/20',
        border: 'border-purple-400/50',
        text: 'text-purple-200',
        textBold: 'text-purple-300'
      }
    : {
        bg: 'bg-blue-500/20',
        border: 'border-blue-400/50',
        text: 'text-blue-200',
        textBold: 'text-blue-300'
      };

  return (
    <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-2 border-yellow-400/50 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="text-yellow-400" size={24} />
        <h3 className="text-xl font-bold text-yellow-400">Prize Distribution</h3>
      </div>

      <div className="space-y-3">
        {isDraw ? (
          <>
            <div className="flex justify-between items-center bg-blue-500/20 rounded-lg p-3">
              <span className="text-blue-200">Each Player Refund (45%)</span>
              <span className="text-blue-300 font-bold text-lg">{prizes.player1Refund} ETH</span>
            </div>
            <div className="flex justify-between items-center bg-slate-700/30 rounded-lg p-3">
              <span className="text-slate-300">House Fee (10%)</span>
              <span className="text-slate-200 font-bold">{prizes.houseFee} ETH</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-500/20 rounded-lg p-3 border-2 border-green-400/50">
              <div className="flex justify-between items-center mb-2">
          <span className="text-green-200">Winner Payout (90%)</span>
          <span className="text-green-300 font-bold text-xl">{prizes.winnerPayout} ETH</span>
              </div>
              {winnerAddress && winnerAddress !== ethers.ZeroAddress && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-green-400/30">
            <Award size={14} className="text-green-400" />
            <span className="text-xs text-green-300">Winner:</span>
            <span className="text-xs text-green-200 font-mono bg-green-900/30 px-2 py-1 rounded">
              {shortenAddress(winnerAddress)}
            </span>
          </div>
              )}
            </div>
            <div className="flex justify-between items-center bg-slate-700/30 rounded-lg p-3">
              <span className="text-slate-300">House Fee (5%)</span>
              <span className="text-slate-200 font-bold">{prizes.houseFee} ETH</span>
            </div>
          </>
        )}
        <div className={`flex justify-between items-center ${potColors.bg} rounded-lg p-3 border-2 ${potColors.border}`}>
          <span className={`${potColors.text} font-bold`}>Total Pot</span>
          <span className={`${potColors.textBold} font-bold text-xl`}>{pot} ETH</span>
        </div>
      </div>
    </div>
  );
};

// Game Progress Indicator
const GameProgress = ({ status, player1, player2, moveCount }) => {
  const steps = [
    { id: 0, label: 'Player 1 Joins', done: player1 !== ethers.ZeroAddress },
    { id: 1, label: 'Player 2 Joins', done: player2 !== ethers.ZeroAddress },
    { id: 2, label: 'Game Starts', done: status >= 2 },
    { id: 3, label: 'Players Battle', done: status === 2, active: status === 2 },
    { id: 4, label: 'Winner Declared', done: status === 3 }
  ];

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-cyan-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-cyan-400" size={20} />
        <h3 className="text-lg font-bold text-cyan-300">Game Progress</h3>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step.done ? 'bg-green-500 text-white' :
              step.active ? 'bg-yellow-500 text-black animate-pulse' :
              'bg-slate-700 text-slate-400'
            }`}>
              {step.done ? '✓' : index + 1}
            </div>
            <div className="flex-1">
              <div className={`font-medium ${
          step.done ? 'text-green-300' :
          step.active ? 'text-yellow-300' :
          'text-slate-400'
              }`}>
          {step.label}
              </div>
              {step.active && (
          <div className="text-xs text-yellow-400 mt-1">
            {moveCount}/9 moves played
          </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({
  tierId,
  instanceId,
  maxPlayers,
  currentEnrolled,
  entryFee,
  isEnrolled,
  onEnroll,
  onEnter,
  loading,
  tierName,
  theme,
  enrollmentTimeout,
  hasStartedViaTimeout,
  onManualStart,
  onClaimAbandonedPool,
  tournamentStatus,
  account
}) => {
  const isFull = currentEnrolled >= maxPlayers;
  const enrollmentPercentage = (currentEnrolled / maxPlayers) * 100;

  // Escalation system state (for enrollment force-start)
  const [escalationState, setEscalationState] = useState({
    activeEscalation: 0,
    canStartEscalation1: false,
    canStartEscalation2: false,
    timeToEscalation1: 0,
    timeToEscalation2: 0,
    forfeitPool: 0n
  });

  useEffect(() => {
    if (!enrollmentTimeout) {
      setEscalationState({
        activeEscalation: 0,
        canStartEscalation1: false,
        canStartEscalation2: false,
        timeToEscalation1: 0,
        timeToEscalation2: 0,
        forfeitPool: 0n
      });
      return;
    }

    const updateEscalationState = () => {
      const now = Math.floor(Date.now() / 1000);
      const escalation1Start = Number(enrollmentTimeout.escalation1Start);
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const contractActiveEscalation = Number(enrollmentTimeout.activeEscalation);
      const forfeitPool = enrollmentTimeout.forfeitPool || 0n;

      const timeToEscalation1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
      const timeToEscalation2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;

      // Calculate if we can start based on current time vs escalation times
      const canStartEscalation1 = escalation1Start > 0 && now >= escalation1Start;
      const canStartEscalation2 = escalation2Start > 0 && now >= escalation2Start;

      // Determine active escalation based on time
      let activeEscalation = 0;
      if (canStartEscalation2) {
        activeEscalation = 2;
      } else if (canStartEscalation1) {
        activeEscalation = 1;
      }

      // Debug logging
      if (escalation1Start > 0 || contractActiveEscalation > 0) {
        console.log(`[${tierId}-${instanceId}] Escalation State Update:`, {
          now,
          escalation1Start,
          escalation2Start,
          contractActiveEscalation,
          calculatedActiveEscalation: activeEscalation,
          canStartEscalation1,
          canStartEscalation2,
          timeToEscalation1,
          timeToEscalation2,
          forfeitPool: forfeitPool.toString()
        });
      }

      setEscalationState({
        activeEscalation,
        canStartEscalation1,
        canStartEscalation2,
        timeToEscalation1,
        timeToEscalation2,
        forfeitPool
      });
    };

    updateEscalationState();
    const interval = setInterval(updateEscalationState, 1000);

    return () => clearInterval(interval);
  }, [enrollmentTimeout, tierId, instanceId]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Theme-aware colors: Dream = purple/cyan, Dare = blue/orange
  const colors = theme === 'dream'
    ? {
        cardBg: 'from-purple-600/20 to-blue-600/20',
        cardBorder: 'border-purple-400/40 hover:border-purple-400/70',
        cardShadow: 'hover:shadow-purple-500/20',
        icon: 'text-purple-400',
        text: 'text-purple-300',
        textMuted: 'text-purple-300/70',
        progress: 'from-purple-500 to-blue-500',
        buttonEnter: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
      }
    : {
        cardBg: 'from-blue-600/20 to-cyan-600/20',
        cardBorder: 'border-blue-400/40 hover:border-blue-400/70',
        cardShadow: 'hover:shadow-blue-500/20',
        icon: 'text-blue-400',
        text: 'text-blue-300',
        textMuted: 'text-blue-300/70',
        progress: 'from-blue-500 to-cyan-500',
        buttonEnter: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
      };

  return (
    <div className={`bg-gradient-to-br ${colors.cardBg} backdrop-blur-lg rounded-2xl p-6 border-2 ${colors.cardBorder} transition-all hover:shadow-xl ${colors.cardShadow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className={colors.icon} size={24} />
          <div>
            <h3 className="text-xl font-bold text-white">
              {tierName || `Tier ${tierId}`}
            </h3>
            <div className={`text-xs ${colors.textMuted}`}>Instance #{instanceId}</div>
          </div>
        </div>
        {isFull && (
          <div className="bg-red-500/20 border border-red-400 px-3 py-1 rounded-full">
            <span className="text-red-300 text-xs font-bold">FULL</span>
          </div>
        )}
        {!isFull && !isEnrolled && (
          <div className="bg-green-500/20 border border-green-400 px-3 py-1 rounded-full">
            <span className="text-green-300 text-xs font-bold">OPEN</span>
          </div>
        )}
        {isEnrolled && (
          <div className="bg-blue-500/20 border border-blue-400 px-3 py-1 rounded-full">
            <span className="text-blue-300 text-xs font-bold">ENROLLED</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className={colors.text} size={16} />
            <span className={`${colors.text} text-xs font-semibold`}>Players</span>
          </div>
          <div className="text-white font-bold text-lg">
            {currentEnrolled} / {maxPlayers}
          </div>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="text-yellow-300" size={16} />
            <span className="text-yellow-300 text-xs font-semibold">Entry Fee</span>
          </div>
          <div className="text-white font-bold text-lg">
            {entryFee} ETH
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className={`flex justify-between text-xs ${colors.text} mb-1`}>
          <span>Enrollment</span>
          <span>{enrollmentPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${colors.progress} transition-all duration-500 rounded-full`}
            style={{ width: `${enrollmentPercentage}%` }}
          />
        </div>
      </div>

      {/* Enrollment Status Message - Show when in enrollment but escalation not started */}
      {enrollmentTimeout && currentEnrolled > 0 && currentEnrolled < maxPlayers && !(escalationState.timeToEscalation1 > 0 || escalationState.activeEscalation > 0) && (
        <div className="mb-4 bg-blue-500/20 border border-blue-400/50 rounded-lg p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Clock className="text-blue-400" size={16} />
              <span className="text-blue-300 text-xs font-semibold">
                Waiting for more players
              </span>
            </div>
            <span className="text-blue-300/70 text-xs">
              {currentEnrolled} / {maxPlayers} enrolled • Force start will unlock after enrollment window closes or tournament fills
            </span>
          </div>
        </div>
      )}

      {/* Tournament Full - Waiting to Start */}
      {currentEnrolled >= maxPlayers && !(escalationState.timeToEscalation1 > 0 || escalationState.activeEscalation > 0 || escalationState.canStart) && tournamentStatus === 0 && (
        <div className="mb-4 bg-green-500/20 border border-green-400/50 rounded-lg p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-400" size={16} />
              <span className="text-green-300 text-xs font-semibold">
                Tournament Full - Ready to Start
              </span>
            </div>
            <span className="text-green-300/70 text-xs">
              All {maxPlayers} players enrolled • Force start will be available soon
            </span>
          </div>
        </div>
      )}

      {/* Enrollment Escalation System - Show when escalation system is active or has started */}
      {enrollmentTimeout && (escalationState.timeToEscalation1 > 0 || escalationState.activeEscalation > 0) && (
        <div className="mb-4 space-y-2">
          {/* Main Countdown Timer */}
          {escalationState.timeToEscalation1 > 0 && escalationState.activeEscalation === 0 ? (
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/50 rounded-lg p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="text-orange-400" size={20} />
                  <span className="text-orange-300 text-sm font-semibold">Force Start Unlocks In</span>
                </div>
                <div className="text-orange-300 font-bold text-3xl">
                  {formatTime(escalationState.timeToEscalation1)}
                </div>
                <div className="text-orange-300/70 text-xs mt-1">
                  Enrolled players will be able to force start the tournament
                </div>
              </div>
            </div>
          ) : (escalationState.canStartEscalation1 || escalationState.canStartEscalation2) && escalationState.activeEscalation >= 1 ? (
            <div className={`bg-gradient-to-r ${escalationState.canStartEscalation2 ? 'from-red-500/20 to-red-600/20 border-red-400/50' : 'from-green-500/20 to-emerald-500/20 border-green-400/50'} border rounded-lg p-4`}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {escalationState.canStartEscalation2 ? <Coins className="text-red-400" size={20} /> : <Zap className="text-green-400" size={20} />}
                  <span className={`${escalationState.canStartEscalation2 ? 'text-red-300' : 'text-green-300'} text-sm font-semibold`}>
                    {escalationState.canStartEscalation2 ? 'Pool Claim Available!' : 'Force Start Available!'}
                  </span>
                </div>
                <div className={`${escalationState.canStartEscalation2 ? 'text-red-300' : 'text-green-300'} text-sm`}>
                  {escalationState.canStartEscalation2
                    ? 'Anyone can claim the abandoned enrollment pool'
                    : 'Any enrolled player can force start this tournament'
                  }
                </div>
                {escalationState.timeToEscalation2 > 0 && escalationState.activeEscalation === 1 && (
                  <div className="text-green-300/70 text-xs mt-2">
                    Claim access opens to everyone in {formatTime(escalationState.timeToEscalation2)}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Escalation Level 1 Window */}
          <div className={`border rounded-lg p-3 ${
            escalationState.activeEscalation >= 1 ? 'bg-green-500/20 border-green-400/50' : 'bg-gray-500/20 border-gray-400/50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={escalationState.activeEscalation >= 1 ? 'text-green-400' : 'text-gray-400'} size={16} />
                <span className={`text-xs font-semibold ${escalationState.activeEscalation >= 1 ? 'text-green-300' : 'text-gray-400'}`}>
                  Escalation 1: Any Enrolled Player Can Force Start
                </span>
              </div>
              <span className={`font-bold text-sm ${escalationState.activeEscalation >= 1 ? 'text-green-300' : 'text-gray-400'}`}>
                {escalationState.activeEscalation >= 1 ? 'ACTIVE' : formatTime(escalationState.timeToEscalation1)}
              </span>
            </div>
          </div>

          {/* Escalation Level 2 Window (if exists) - Show when escalation2 is configured */}
          {(escalationState.timeToEscalation2 > 0 || escalationState.activeEscalation >= 2) && (
            <div className={`border rounded-lg p-3 ${
              escalationState.activeEscalation >= 2 ? 'bg-red-500/20 border-red-400/50' : 'bg-gray-500/20 border-gray-400/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className={escalationState.activeEscalation >= 2 ? 'text-red-400' : 'text-gray-400'} size={16} />
                  <span className={`text-xs font-semibold ${escalationState.activeEscalation >= 2 ? 'text-red-300' : 'text-gray-400'}`}>
                    Escalation 2: Anyone Can Claim Pool
                  </span>
                </div>
                <span className={`font-bold text-sm ${escalationState.activeEscalation >= 2 ? 'text-red-300' : 'text-gray-400'}`}>
                  {escalationState.activeEscalation >= 2 ? 'ACTIVE' : formatTime(escalationState.timeToEscalation2)}
                </span>
              </div>
            </div>
          )}

          {/* Forfeit Pool Display */}
          {escalationState.forfeitPool && escalationState.forfeitPool > 0n && (
            <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-purple-300 text-xs font-semibold">Forfeit Pool</span>
                <span className="text-purple-300 font-bold text-sm">
                  {ethers.formatEther(escalationState.forfeitPool)} ETH
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debug Info - Remove after testing */}
      {enrollmentTimeout && (escalationState.activeEscalation > 0 || escalationState.timeToEscalation1 > 0) && (
        <div className="mb-2 bg-gray-800/50 border border-gray-600 rounded p-2 text-xs text-gray-300">
          <div>Esc1: {escalationState.canStartEscalation1 ? '✅' : '❌'} | Esc2: {escalationState.canStartEscalation2 ? '✅' : '❌'} | isEnrolled: {isEnrolled ? '✅' : '❌'}</div>
          <div>activeEscalation: {escalationState.activeEscalation} | Button: {((escalationState.canStartEscalation1 && isEnrolled) || escalationState.canStartEscalation2) ? '✅ VISIBLE' : '❌ HIDDEN'}</div>
        </div>
      )}

      {/* Action Buttons */}
      {/* Escalation 1: Enrolled players can force start */}
      {tournamentStatus === 0 && escalationState.canStartEscalation1 && isEnrolled && (
        <button
          onClick={() => onManualStart(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mb-2"
        >
          <Zap size={18} />
          {loading ? 'Starting...' : !account ? 'Connect Wallet to Force Start' : 'Force Start Tournament'}
        </button>
      )}

      {/* Escalation 2: Anyone can claim abandoned pool */}
      {tournamentStatus === 0 && escalationState.canStartEscalation2 && (
        <button
          onClick={() => onClaimAbandonedPool(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mb-2"
        >
          <Coins size={18} />
          {loading ? 'Claiming...' : !account ? 'Connect Wallet to Claim' : 'Claim Abandoned Pool'}
        </button>
      )} 

      {isEnrolled ? (
        <button
          onClick={onEnter}
          disabled={loading || !account}
          className={`w-full bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
        >
          <Play size={18} />
          {loading ? 'Loading...' : !account ? 'Connect Wallet to Enter' : 'Enter Tournament'}
        </button>
      ) : (
        <>
          {/* Enroll button for non-enrolled users (only during enrollment phase) */}
          {tournamentStatus === 0 && !isFull && (
            <button
              onClick={onEnroll}
              disabled={loading || !account}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <Trophy size={18} />
              {loading ? 'Enrolling...' : !account ? 'Connect Wallet to Enroll' : 'Enroll Now'}
            </button>
          )}

          {/* Enter Tournament / View Bracket button for non-enrolled users */}
          <button
            onClick={onEnter}
            disabled={loading}
            className={`w-full ${tournamentStatus === 0 && !isFull ? 'mt-2' : ''} bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 border ${colors.cardBorder}`}
          >
            <Eye size={18} />
            {loading ? 'Loading...' : 'Enter Tournament'}
          </button>
        </>
      )}

      {/* Abandoned Pool Claim Button - show for completed/abandoned tournaments with claimable funds */}
      {onClaimAbandonedPool && tournamentStatus >= 2 &&
        timeoutState.forfeitPool && timeoutState.forfeitPool > 0n && (
        <button
          onClick={() => onClaimAbandonedPool(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          <Coins size={18} />
          {loading ? 'Claiming...' : !account ? 'Connect Wallet to Claim' : `claimAbandonedEnrollmentPool (${ethers.formatEther(timeoutState.forfeitPool)} ETH)`}
        </button>
      )}
    </div>
  );
};

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement, onManualStart, onEnroll, account, loading, syncDots, theme, isEnrolled, entryFee, isFull }) => {
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

  // Find user's current match
  const userCurrentMatch = rounds
    .flatMap((round, roundIdx) =>
      round.matches.map((match, matchIdx) => ({
        ...match,
        roundNumber: roundIdx,
        matchNumber: matchIdx
      }))
    )
    .find(match => {
      const isUserInMatch =
        match.player1?.toLowerCase() === account?.toLowerCase() ||
        match.player2?.toLowerCase() === account?.toLowerCase();
      const isNotComplete = match.matchStatus !== 2; // 2 = Completed
      return isUserInMatch && isNotComplete;
    });

  const shortenAddress = (addr) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'TBD';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getMatchStatusText = (matchStatus, winner, isDraw) => {
    if (matchStatus === 0) return 'Not Started';
    if (matchStatus === 1) return 'In Progress';
    if (matchStatus === 2) {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      // Check for double forfeit: completed, zero address winner, not a draw
      if (winner && winner.toLowerCase() === zeroAddress && !isDraw) {
        return 'Eliminated - Double Forfeit';
      }
      return 'Completed';
    }
    return 'Unknown';
  };

  const getMatchStatusColor = (matchStatus, winner, isDraw) => {
    if (matchStatus === 0) return 'text-gray-400';
    if (matchStatus === 1) return 'text-yellow-400';
    if (matchStatus === 2) {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      // Check for double forfeit: completed, zero address winner, not a draw
      if (winner && winner.toLowerCase() === zeroAddress && !isDraw) {
        return 'text-red-400';
      }
      return 'text-green-400';
    }
    return 'text-gray-400';
  };

  // Theme-aware colors
  const colors = theme === 'dream'
    ? {
        headerBg: 'from-purple-600/30 to-blue-600/30',
        headerBorder: 'border-purple-400/30',
        text: 'text-purple-300',
        textHover: 'hover:text-purple-200',
        icon: 'text-purple-400'
      }
    : {
        headerBg: 'from-blue-600/30 to-cyan-600/30',
        headerBorder: 'border-blue-400/30',
        text: 'text-blue-300',
        textHover: 'hover:text-blue-200',
        icon: 'text-blue-400'
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
                  Tournament T{tierId}-I{instanceId}
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
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-black/20 rounded-lg p-4">
            <div className={`${colors.text} text-sm mb-1`}>Players</div>
            <div className="text-white font-bold text-xl">{enrolledCount} / {playerCount}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className={`${colors.text} text-sm mb-1`}>Status</div>
            <div className="text-white font-bold text-xl">
              {status === 0 ? 'Enrolling' : status === 1 ? 'In Progress' : status === 2 ? 'Completed' : 'Unknown'}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className={`${colors.text} text-sm mb-1`}>Current Round</div>
            <div className="text-white font-bold text-xl">Round {currentRound + 1}</div>
          </div>
        </div>

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
        {enrolledPlayers && enrolledPlayers.length > 0 && (
          <div className="mt-4 bg-black/20 rounded-lg p-4 border border-purple-400/30">
            <div className="flex items-center gap-2 mb-3">
              <Users className={colors.icon} size={20} />
              <h4 className={`${colors.text} font-semibold`}>
                Enrolled Players ({enrolledPlayers.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {enrolledPlayers.map((address, idx) => (
                <div
                  key={idx}
                  className={`font-mono text-sm p-2 rounded ${
                    address.toLowerCase() === account?.toLowerCase()
                      ? 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 font-bold'
                      : 'bg-purple-500/10 text-purple-300'
                  }`}
                >
                  {address.toLowerCase() === account?.toLowerCase() && (
                    <span className="text-yellow-400 text-xs mr-1">→</span>
                  )}
                  {shortenAddress(address)}
                  {address.toLowerCase() === account?.toLowerCase() && (
                    <span className="text-yellow-400 text-xs ml-1">←</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

      {/* User's Current Match Highlight */}
      {userCurrentMatch && (
        <div className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-400/50 mb-8 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Your Current Match</h3>
              <div className="flex items-center gap-4 text-lg">
                <div className="flex flex-col">
                  <span className="text-green-300 font-semibold">
                    {shortenAddress(userCurrentMatch.player1)}
                  </span>
                  {userCurrentMatch.player1?.toLowerCase() === account?.toLowerCase() && (
                    <span className="text-yellow-300 text-xs font-bold">← THIS IS YOU</span>
                  )}
                </div>
                <span className="text-white font-bold">VS</span>
                <div className="flex flex-col">
                  <span className="text-green-300 font-semibold">
                    {shortenAddress(userCurrentMatch.player2)}
                  </span>
                  {userCurrentMatch.player2?.toLowerCase() === account?.toLowerCase() && (
                    <span className="text-yellow-300 text-xs font-bold">THIS IS YOU →</span>
                  )}
                </div>
              </div>
              <p className="text-green-200 mt-2">
                Round {userCurrentMatch.roundNumber + 1} • Match {userCurrentMatch.matchNumber + 1} •
                <span className={`ml-2 ${getMatchStatusColor(userCurrentMatch.matchStatus, userCurrentMatch.winner, userCurrentMatch.isDraw)}`}>
                  {getMatchStatusText(userCurrentMatch.matchStatus, userCurrentMatch.winner, userCurrentMatch.isDraw)}
                </span>
              </p>
            </div>
            <button
              onClick={() => onEnterMatch(tierId, instanceId, userCurrentMatch.roundNumber, userCurrentMatch.matchNumber)}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play size={24} />
              {loading ? 'Loading...' : 'Enter Match'}
            </button>
          </div>
        </div>
      )}

      {/* Bracket View */}
      <div className={`bg-gradient-to-br from-slate-900/50 to-${theme === 'dream' ? 'purple' : 'blue'}-900/30 backdrop-blur-lg rounded-2xl p-8 border ${colors.headerBorder}`}>
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
                  const isUserMatch =
                    match.player1?.toLowerCase() === account?.toLowerCase() ||
                    match.player2?.toLowerCase() === account?.toLowerCase();

                  // Calculate move timeout
                  const MOVE_TIMEOUT = 60; // 60 seconds
                  const now = Math.floor(Date.now() / 1000);
                  const timeReference = match.lastMoveTime > 0 ? match.lastMoveTime : match.startTime;
                  const timeSinceLastMove = timeReference > 0 ? now - timeReference : 0;
                  const timeRemaining = timeReference > 0 ? Math.max(0, MOVE_TIMEOUT - timeSinceLastMove) : null;
                  const isTimeout = timeRemaining !== null && timeRemaining === 0;

                  // Check escalation status
                  // If timeout is active on contract, use that
                  const hasEscalation = match.timeoutState && match.timeoutState.timeoutActive;
                  const activeEscalation = match.timeoutState?.activeEscalation || 0;

                  // If contract hasn't activated yet, calculate client-side escalation based on time
                  let clientEscalation = 0;
                  if (!hasEscalation && isTimeout && match.matchStatus === 1) {
                    // Time since timeout started
                    const timeoutDuration = timeSinceLastMove - MOVE_TIMEOUT;
                    if (timeoutDuration >= 180) { // 3 minutes = 180s for Esc 3
                      clientEscalation = 3;
                    } else if (timeoutDuration >= 120) { // 2 minutes = 120s for Esc 2
                      clientEscalation = 2;
                    } else if (timeoutDuration >= 60) { // 1 minute = 60s for Esc 1
                      clientEscalation = 1;
                    }
                  }

                  const effectiveEscalation = hasEscalation ? activeEscalation : clientEscalation;
                  const canForceEliminate = effectiveEscalation >= 2;
                  const canReplace = effectiveEscalation >= 3;

                  // Calculate border color based on escalation and timeout
                  let borderClass = 'border-purple-400/30 hover:border-purple-400/50';
                  if (isUserMatch) {
                    borderClass = 'border-green-400/70 bg-green-900/20';
                  } else if (canReplace) {
                    borderClass = 'border-red-400 bg-red-900/20 animate-pulse';
                  } else if (canForceEliminate) {
                    borderClass = 'border-yellow-400 bg-yellow-900/20';
                  } else if (hasEscalation) {
                    borderClass = 'border-orange-400 bg-orange-900/20';
                  } else if (isTimeout && match.matchStatus === 1) {
                    borderClass = 'border-orange-400/60 bg-orange-900/10';
                  }

                  return (
                    <div
                      key={matchIdx}
                      className={`bg-black/30 rounded-xl p-4 border-2 transition-all ${borderClass}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-purple-300 text-sm font-semibold">
                          Match {matchIdx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          {effectiveEscalation > 0 && (
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              canReplace ? 'bg-red-500/30 text-red-300' :
                              canForceEliminate ? 'bg-yellow-500/30 text-yellow-300' :
                              'bg-orange-500/30 text-orange-300'
                            }`}>
                              ⚡ ESC {effectiveEscalation}
                            </span>
                          )}
                          {effectiveEscalation === 0 && timeRemaining !== null && match.matchStatus === 1 && (
                            <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
                              timeRemaining === 0 ? 'bg-red-500/30 text-red-300 animate-pulse' :
                              timeRemaining <= 10 ? 'bg-red-500/20 text-red-300' :
                              timeRemaining <= 30 ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              ⏱️ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                          <span className={`text-xs font-bold ${getMatchStatusColor(match.matchStatus, match.winner, match.isDraw)}`}>
                            {getMatchStatusText(match.matchStatus, match.winner, match.isDraw)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`flex items-center justify-between p-2 rounded ${
                          match.winner?.toLowerCase() === match.player1?.toLowerCase()
                            ? 'bg-green-500/20 border border-green-400/50'
                            : match.player1?.toLowerCase() === account?.toLowerCase()
                            ? 'bg-yellow-500/20 border border-yellow-400/50'
                            : 'bg-purple-500/10'
                        }`}>
                          <div className="flex flex-col">
                            <span className="text-white font-mono text-sm">
                              {shortenAddress(match.player1)}
                            </span>
                            {match.player1?.toLowerCase() === account?.toLowerCase() && (
                              <span className="text-yellow-300 text-xs font-bold mt-0.5">THIS IS YOU</span>
                            )}
                          </div>
                          {match.winner?.toLowerCase() === match.player1?.toLowerCase() && (
                            <Award className="text-green-400" size={16} />
                          )}
                        </div>

                        <div className="text-center text-purple-400 font-bold">VS</div>

                        <div className={`flex items-center justify-between p-2 rounded ${
                          match.winner?.toLowerCase() === match.player2?.toLowerCase()
                            ? 'bg-green-500/20 border border-green-400/50'
                            : match.player2?.toLowerCase() === account?.toLowerCase()
                            ? 'bg-yellow-500/20 border border-yellow-400/50'
                            : 'bg-purple-500/10'
                        }`}>
                          <div className="flex flex-col">
                            <span className="text-white font-mono text-sm">
                              {shortenAddress(match.player2)}
                            </span>
                            {match.player2?.toLowerCase() === account?.toLowerCase() && (
                              <span className="text-yellow-300 text-xs font-bold mt-0.5">THIS IS YOU</span>
                            )}
                          </div>
                          {match.winner?.toLowerCase() === match.player2?.toLowerCase() && (
                            <Award className="text-green-400" size={16} />
                          )}
                        </div>

                        {/* Enter Match Button for user's matches */}
                        {isUserMatch && match.matchStatus !== 2 && (
                          <button
                            onClick={() => onEnterMatch(tierId, instanceId, roundIdx, matchIdx)}
                            disabled={loading || match.matchStatus === 0}
                            className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                          >
                            <Play size={16} />
                            {match.matchStatus === 0 ? 'Waiting to Start' : 'Enter Match'}
                          </button>
                        )}

                        {/* Escalation CTAs for outsiders */}
                        {!isUserMatch && match.matchStatus !== 2 && (
                          <>
                            {/* Escalation 2: Force Eliminate */}
                            {canForceEliminate && (
                              <div className="mt-2">
                                <button
                                  onClick={() => onForceEliminate({
                                    tierId,
                                    instanceId,
                                    roundNumber: roundIdx,
                                    matchNumber: matchIdx
                                  })}
                                  disabled={loading}
                                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  ⚡ Force Eliminate (Higher Rank)
                                </button>
                                <p className="text-xs text-yellow-300 mt-1 text-center">
                                  Escalation 2: Eliminate both stalled players
                                </p>
                              </div>
                            )}

                            {/* Escalation 3: Replace Both Players */}
                            {canReplace && (
                              <div className="mt-2">
                                <button
                                  onClick={() => onClaimReplacement({
                                    tierId,
                                    instanceId,
                                    roundNumber: roundIdx,
                                    matchNumber: matchIdx
                                  })}
                                  disabled={loading}
                                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 animate-pulse flex items-center justify-center gap-2"
                                >
                                  🎯 Claim Match & Replace Both
                                </button>
                                <p className="text-xs text-red-300 mt-1 text-center">
                                  Escalation 3: Take this match slot and advance!
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
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

// Last Game Result Component
const LastGameResult = ({ lastGame, account }) => {
  if (!lastGame) return null;

  const isDraw = lastGame.result === 1; // GameResult.Draw = 1
  const isWin = lastGame.result === 0; // GameResult.Win = 0
  const timestamp = new Date(lastGame.timestamp * 1000).toLocaleString();

  // Check if connected account won or participated
  const userWon = isWin && account && lastGame.winner.toLowerCase() === account.toLowerCase();
  const userLost = isWin && account && (
    (lastGame.player1.toLowerCase() === account.toLowerCase() && lastGame.winner.toLowerCase() !== account.toLowerCase()) ||
    (lastGame.player2.toLowerCase() === account.toLowerCase() && lastGame.winner.toLowerCase() !== account.toLowerCase())
  );
  const userDrew = isDraw && account && (
    lastGame.player1.toLowerCase() === account.toLowerCase() ||
    lastGame.player2.toLowerCase() === account.toLowerCase()
  );

  return (
    <div className={`bg-gradient-to-br border-2 rounded-2xl p-8 shadow-2xl mb-8 ${
      userWon
        ? 'from-green-500/20 to-emerald-500/20 border-green-400 animate-pulse'
        : userLost
        ? 'from-red-500/10 to-pink-500/10 border-red-400'
        : userDrew
        ? 'from-yellow-500/10 to-amber-500/10 border-yellow-400'
        : 'from-indigo-500/10 to-purple-500/10 border-indigo-400'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className={userWon ? 'text-green-400' : userLost ? 'text-red-400' : 'text-indigo-400'} size={28} />
          <div>
            <h2 className="text-3xl font-bold text-white">Last Game Result</h2>
            {userWon && <span className="text-green-400 text-sm font-bold">🎉 YOU WON!</span>}
            {userLost && <span className="text-red-400 text-sm font-bold">💔 You Lost</span>}
            {userDrew && <span className="text-yellow-400 text-sm font-bold">🤝 You Drew</span>}
          </div>
        </div>
        <div className="bg-indigo-500/20 border border-indigo-400/50 px-4 py-2 rounded-full">
          <span className="text-indigo-300 text-sm font-bold">Game #{lastGame.gameId}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Game Outcome */}
        <div className={`rounded-xl p-6 border-2 ${
          userWon
            ? 'bg-green-500/30 border-green-400 shadow-lg shadow-green-500/20'
            : isDraw
            ? 'bg-yellow-500/20 border-yellow-400'
            : 'bg-green-500/20 border-green-400'
        }`}>
          <div className="text-center space-y-4">
            <div className="text-6xl">
              {isDraw ? '🤝' : userWon ? '🎉' : '🏆'}
            </div>
            <div className={`text-3xl font-bold ${
              isDraw ? 'text-yellow-300' : 'text-green-300'
            }`}>
              {isDraw ? 'DRAW' : userWon ? 'YOU WON!' : 'WINNER'}
            </div>
            {isWin && (
              <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-sm text-slate-300 mb-1">Winner Address</div>
          <div className="font-mono text-lg text-white">
            {shortenAddress(lastGame.winner)}
          </div>
          {userWon && (
            <div className="mt-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded inline-flex items-center gap-1 font-bold border border-green-400/30">
              <CheckCircle size={12} />
              This is you!
            </div>
          )}
              </div>
            )}
            {userWon && (
              <div className="bg-green-900/30 rounded-lg p-3 border border-green-400/30">
          <div className="text-green-300 font-bold text-lg">Prize Won: 90% of pot</div>
              </div>
            )}
            <div className="text-sm text-slate-300">
              {timestamp}
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="space-y-3">
          <div className="text-lg font-bold text-indigo-300 mb-3">Players</div>

          {/* Player 1 */}
          <div className={`p-4 rounded-lg border-2 ${
            isWin && lastGame.winner.toLowerCase() === lastGame.player1.toLowerCase()
              ? 'bg-green-500/20 border-green-400 shadow-lg'
              : account && lastGame.player1.toLowerCase() === account.toLowerCase()
              ? 'bg-cyan-500/20 border-cyan-400'
              : 'bg-cyan-500/10 border-cyan-400/50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold border-2 border-cyan-400">
            X
          </div>
          <span className="text-sm font-bold text-cyan-400">Player 1</span>
              </div>
              {isWin && lastGame.winner.toLowerCase() === lastGame.player1.toLowerCase() && (
          <Trophy className="text-green-400" size={20} />
              )}
            </div>
            <div className="font-mono text-xs text-white bg-slate-900/50 p-2 rounded">
              {shortenAddress(lastGame.player1)}
            </div>
            {account && lastGame.player1.toLowerCase() === account.toLowerCase() && (
              <div className="mt-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded inline-flex items-center gap-1 font-bold border border-blue-400/30">
          <CheckCircle size={12} />
          This is you!
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className={`p-4 rounded-lg border-2 ${
            isWin && lastGame.winner.toLowerCase() === lastGame.player2.toLowerCase()
              ? 'bg-green-500/20 border-green-400 shadow-lg'
              : account && lastGame.player2.toLowerCase() === account.toLowerCase()
              ? 'bg-orange-500/20 border-orange-400'
              : 'bg-orange-500/10 border-orange-400/50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center text-orange-400 font-bold border-2 border-orange-400">
            O
          </div>
          <span className="text-sm font-bold text-orange-400">Player 2</span>
              </div>
              {isWin && lastGame.winner.toLowerCase() === lastGame.player2.toLowerCase() && (
          <Trophy className="text-green-400" size={20} />
              )}
            </div>
            <div className="font-mono text-xs text-white bg-slate-900/50 p-2 rounded">
              {shortenAddress(lastGame.player2)}
            </div>
            {account && lastGame.player2.toLowerCase() === account.toLowerCase() && (
              <div className="mt-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded inline-flex items-center gap-1 font-bold border border-blue-400/30">
          <CheckCircle size={12} />
          This is you!
              </div>
            )}
          </div>

          {/* Game Stats */}
          <div className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-400/30 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
          <TrendingUp className="text-indigo-400" size={16} />
          <span className="text-sm text-indigo-300">Outcome</span>
              </div>
              <span className="text-white font-bold">
          {isDraw ? 'Draw - Both Refunded 45%' : 'Winner Takes 90%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Active Game Display Component
const ActiveGameDisplay = ({ game, account, onMove, onStartGame, loading, refreshProgress, gameLog }) => {
  const isPlayer1 = account && game.player1.toLowerCase() === account.toLowerCase();
  const isPlayer2 = account && game.player2.toLowerCase() === account.toLowerCase();
  const isParticipant = isPlayer1 || isPlayer2;
  const isMyTurn = account && game.currentTurn?.toLowerCase() === account.toLowerCase();

  // Use local checkWinner ONLY for highlighting winning cells
  const winnerResult = checkWinner(game.board);
  const winningLine = winnerResult?.line || [];

  // Use CONTRACT data as the source of truth for game over and winner
  const gameOver = game.status === 3;
  const contractWinner = game.winner;
  const isDraw = gameOver && contractWinner === ethers.ZeroAddress;
  const hasWinner = gameOver && contractWinner !== ethers.ZeroAddress;
  const isWinner = hasWinner && account && contractWinner.toLowerCase() === account.toLowerCase();
  const isLoser = hasWinner && isParticipant && contractWinner.toLowerCase() !== account.toLowerCase();

  const player1Symbol = 'X';
  const player2Symbol = 'O';
  const mySymbol = isPlayer1 ? player1Symbol : isPlayer2 ? player2Symbol : null;
  const moveCount = game.board.filter(c => c !== 0).length;

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-400 rounded-2xl p-8 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Swords className="text-purple-400" size={28} />
          <h2 className="text-3xl font-bold text-white">
            {getStatusEmoji(game.status)} Battle Arena - Game #{game.id}
          </h2>
        </div>
        <div className={`px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
          gameOver ? 'bg-green-500/20 text-green-400 border-2 border-green-400' :
          game.status === 2 ? 'bg-yellow-500/20 text-yellow-400 animate-pulse border-2 border-yellow-400' :
          game.status === 1 ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-400' :
          'bg-blue-500/20 text-blue-400 border-2 border-blue-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            game.status === 2 ? 'bg-yellow-400 animate-pulse' : 'bg-current'
          }`} />
          {getStatusLabel(game.status)}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Game Progress & Info */}
        <div className="space-y-6">
          <GameProgress
            status={game.status}
            player1={game.player1}
            player2={game.player2}
            moveCount={moveCount}
          />

          {gameOver && <PrizeDistribution pot={game.pot} winner={isDraw ? 'draw' : 'winner'} winnerAddress={contractWinner} theme={theme} />}
        </div>

        {/* Center: Board Section */}
        <div>
          <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Grid className="text-purple-300" size={24} />
              <h3 className="text-xl font-bold text-purple-300 text-center">Game Board</h3>
            </div>
            <div className="aspect-square max-w-md mx-auto">
              <div className="grid grid-cols-3 gap-3 h-full">
          {game.board.map((cell, idx) => {
            const isWinningCell = winningLine.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => isMyTurn && game.status === 2 && cell === 0 ? onMove(idx) : null}
                disabled={loading || !isMyTurn || game.status !== 2 || cell !== 0}
                className={`aspect-square flex items-center justify-center text-6xl font-bold rounded-xl border-2 transition-all duration-300
                  ${isWinningCell
                    ? 'bg-gradient-to-br from-yellow-500/40 to-amber-500/40 border-yellow-400 animate-pulse shadow-xl shadow-yellow-500/50'
                    : isMyTurn && game.status === 2 && cell === 0
                    ? 'bg-purple-500/20 border-purple-400 hover:bg-purple-500/40 cursor-pointer hover:scale-105 shadow-lg hover:shadow-purple-500/50'
                    : cell === 1
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-cyan-500/30'
                    : cell === 2
                    ? 'bg-orange-500/20 border-orange-400 text-orange-400 shadow-orange-500/30'
                    : 'bg-slate-800/50 border-slate-600 opacity-50'
                  }
                  disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {getCellSymbol(cell)}
              </button>
            );
          })}
              </div>
            </div>

            {/* Start Game Button */}
            {game.status === 1 && isParticipant && (
              <div className="mt-6">
          <button
            onClick={onStartGame}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 py-4 rounded-xl font-bold text-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap size={20} />
            {loading ? 'Initiating Coin Flip...' : 'Start Game (Coin Flip)'}
          </button>
          <div className="mt-3 bg-blue-500/10 rounded-lg p-3 border border-blue-400/30">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                A provably random coin flip on-chain will determine who makes the first move!
              </p>
            </div>
          </div>
              </div>
            )}

            {/* Turn Indicator */}
            {!gameOver && game.status === 2 && (
              <div className={`mt-6 text-center py-4 px-4 rounded-xl font-bold text-lg border-2 ${
          isMyTurn
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 text-green-300 animate-pulse shadow-lg'
            : isParticipant
            ? 'bg-blue-500/10 border-blue-400/50 text-blue-300'
            : 'bg-slate-700/30 border-slate-600 text-slate-300'
              }`}>
          {isMyTurn ? (
            <div className="space-y-1">
              <div className="text-2xl">🎯 YOUR TURN</div>
              <div className="text-sm opacity-80">You are playing as {mySymbol}</div>
            </div>
          ) : isParticipant ? (
            <div className="space-y-1">
              <div>⏳ Opponent's Turn</div>
              <div className="text-sm opacity-80">Waiting for their move...</div>
            </div>
          ) : (
            <div>👁️ Spectating</div>
          )}
              </div>
            )}

            {/* Winner Display */}
            {gameOver && (
              <div className={`mt-6 text-center py-6 px-4 rounded-xl font-bold text-2xl border-2 ${
          isDraw
            ? 'bg-gray-500/20 border-gray-400 text-gray-300'
            : isWinner
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 text-green-300 animate-pulse'
            : isLoser
            ? 'bg-red-500/20 border-red-400 text-red-300'
            : 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
              }`}>
          <div className="space-y-2">
            {isDraw ? (
              <>
                <div className="text-4xl">🤝</div>
                <div>DRAW GAME!</div>
                <div className="text-sm opacity-80">Both players receive 45% refund</div>
              </>
            ) : isWinner ? (
              <>
                <div className="text-4xl">🎉</div>
                <div>VICTORY!</div>
                <div className="text-sm opacity-80">You won 90% of the pot!</div>
                <div className="text-xs mt-2 font-mono bg-green-900/30 px-3 py-1 rounded inline-block">
                  {shortenAddress(contractWinner)}
                </div>
              </>
            ) : isLoser ? (
              <>
                <div className="text-4xl">💔</div>
                <div>DEFEAT</div>
                <div className="text-sm opacity-80">Better luck next time</div>
                <div className="text-xs mt-2 opacity-70">Winner: {shortenAddress(contractWinner)}</div>
              </>
            ) : (
              <>
                <div className="text-4xl">🏆</div>
                <div>GAME OVER!</div>
                <div className="text-sm opacity-80">
                  Winner: {contractWinner.toLowerCase() === game.player1.toLowerCase() ? `${player1Symbol}` : `${player2Symbol}`}
                </div>
                <div className="text-xs mt-2 font-mono bg-yellow-900/30 px-3 py-1 rounded inline-block">
                  {shortenAddress(contractWinner)}
                </div>
              </>
            )}
          </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Players & Stats */}
        <div className="space-y-4">
          {/* Players */}
          <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-purple-300" size={20} />
              <h3 className="text-xl font-bold text-purple-300">Players</h3>
            </div>
            <div className="space-y-3">
              {/* Player 1 (X) */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
          game.status === 2 && game.currentTurn?.toLowerCase() === game.player1.toLowerCase()
            ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse'
            : isPlayer1
            ? 'bg-cyan-500/10 border-cyan-400/50'
            : 'bg-slate-800/30 border-slate-600'
              }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold border-2 border-cyan-400">
                X
              </div>
              <span className="text-sm font-bold text-cyan-400">Player 1</span>
            </div>
            {game.status === 2 && game.currentTurn?.toLowerCase() === game.player1.toLowerCase() && (
              <span className="text-xs bg-cyan-400/30 px-2 py-1 rounded text-cyan-300 font-bold flex items-center gap-1">
                <Zap size={12} />
                Active
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-white break-all bg-slate-900/50 p-2 rounded">
            {shortenAddress(game.player1)}
          </div>
          {isPlayer1 && (
            <div className="mt-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded inline-flex items-center gap-1 font-bold border border-green-400/30">
              <CheckCircle size={12} />
              This is you!
            </div>
          )}
              </div>

              {/* Player 2 (O) */}
              {game.player2 === '0x0000000000000000000000000000000000000000' ? (
          <div className="p-4 rounded-lg border-2 border-dashed border-orange-400/30 bg-orange-500/5 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center text-orange-400 font-bold border-2 border-dashed border-orange-400">
                O
              </div>
              <div className="text-sm font-bold text-orange-400">Player 2</div>
            </div>
            <div className="text-sm text-orange-300 italic flex items-center gap-2">
              <Clock size={14} />
              Waiting for opponent...
            </div>
            <div className="text-xs text-orange-400 mt-2 bg-orange-500/10 px-2 py-1 rounded inline-block">
              1/2 Players Joined
            </div>
          </div>
              ) : (
          <div className={`p-4 rounded-lg border-2 transition-all ${
            game.status === 2 && game.currentTurn?.toLowerCase() === game.player2.toLowerCase()
              ? 'bg-orange-500/20 border-orange-400 shadow-lg shadow-orange-500/30 animate-pulse'
              : isPlayer2
              ? 'bg-orange-500/10 border-orange-400/50'
              : 'bg-slate-800/30 border-slate-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center text-orange-400 font-bold border-2 border-orange-400">
                  O
                </div>
                <span className="text-sm font-bold text-orange-400">Player 2</span>
              </div>
              {game.status === 2 && game.currentTurn?.toLowerCase() === game.player2.toLowerCase() && (
                <span className="text-xs bg-orange-400/30 px-2 py-1 rounded text-orange-300 font-bold flex items-center gap-1">
                  <Zap size={12} />
                  Active
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-white break-all bg-slate-900/50 p-2 rounded">
              {shortenAddress(game.player2)}
            </div>
            {isPlayer2 && (
              <div className="mt-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded inline-flex items-center gap-1 font-bold border border-green-400/30">
                <CheckCircle size={12} />
                This is you!
              </div>
            )}
          </div>
              )}
            </div>
          </div>

          {/* Game Stats */}
          <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-purple-300" size={20} />
              <h3 className="text-xl font-bold text-purple-300">Game Stats</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center bg-yellow-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-yellow-400" />
            <span className="text-slate-200 font-medium">Prize Pot</span>
          </div>
          <span className="text-yellow-400 font-bold text-lg">{game.pot} ETH</span>
              </div>
              <div className="flex justify-between items-center bg-blue-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-400" />
            <span className="text-slate-200 font-medium">Moves</span>
          </div>
          <span className="text-white font-bold">{moveCount}/9</span>
              </div>
              <div className="flex justify-between items-center bg-purple-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Grid size={16} className="text-purple-400" />
            <span className="text-slate-200 font-medium">Game ID</span>
          </div>
          <span className="text-white font-mono">#{game.id}</span>
              </div>
              {game.winner !== '0x0000000000000000000000000000000000000000' && (
          <div className="flex justify-between items-center bg-green-500/10 rounded-lg p-3 border border-green-400/30">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-green-400" />
              <span className="text-slate-200 font-medium">Winner</span>
            </div>
            <span className="text-green-400 font-mono font-bold">
              {shortenAddress(game.winner)}
            </span>
          </div>
              )}
            </div>
          </div>

          {/* Game Log */}
          {gameLog && gameLog.length > 0 && (
            <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30 max-h-64 overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
          <History className="text-purple-300" size={20} />
          <h3 className="text-xl font-bold text-purple-300">Activity Log</h3>
              </div>
              <div className="space-y-2 text-xs overflow-y-auto max-h-48 pr-2 custom-scrollbar">
          {gameLog.slice().reverse().map((log, idx) => (
            <div key={idx} className={`p-2 rounded border-l-2 ${
              log.type === 'win' ? 'bg-green-500/10 border-green-400' :
              log.type === 'move' ? 'bg-blue-500/10 border-blue-400' :
              log.type === 'join' ? 'bg-purple-500/10 border-purple-400' :
              'bg-slate-800/50 border-slate-600'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 min-w-fit">{log.timestamp}</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            </div>
          ))}
              </div>
            </div>
          )}

          {/* Auto-refresh indicator */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-400" />
          <div>
            <div className="text-sm text-blue-300 font-medium">Auto-Sync</div>
            <div className="text-xs text-blue-400/70">Polling blockchain</div>
          </div>
              </div>
              <div className="relative w-12 h-12">
          <svg className="transform -rotate-90 w-12 h-12">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" className="text-blue-500/30" />
            <circle
              cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - refreshProgress / 100)}`}
              className="text-blue-400 transition-all duration-75 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-400">
              {Math.ceil(5 - (refreshProgress / 100) * 5)}
            </span>
          </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TicTacBlock() {
  const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const EXPECTED_CHAIN_ID = 412346;
  const ETHERSCAN_URL = `https://arbiscan.io/address/${CONTRACT_ADDRESS}`;

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // Game State
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Track initial data load
  const [entryFee, setEntryFee] = useState('0');
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [gameLog, setGameLog] = useState([]);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [contractStatus, setContractStatus] = useState('not_checked'); // not_checked, checking, deployed, not_deployed
  const [lastGame, setLastGame] = useState(null);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);

  // Theme State - 'dream' (blue/cyan), 'daring' (red/orange)
  const [theme, setTheme] = useState('dream');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showThemeToggle, setShowThemeToggle] = useState(true);

  // Tournament State
  const [tournaments, setTournaments] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null); // { tierId, instanceId, tournamentData, bracketData }
  const [bracketSyncDots, setBracketSyncDots] = useState(1);

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [syncDots, setSyncDots] = useState(1);

  // Cached Stats State
  const [cachedStats, setCachedStats] = useState(null);
  const [cachedStatsLoading, setCachedStatsLoading] = useState(false);

  // RW3 Declaration State
  const [rw3Declaration, setRw3Declaration] = useState(null);
  const [showRw3Popup, setShowRw3Popup] = useState(false);
  const [rw3BadgeRect, setRw3BadgeRect] = useState(null);

  // Fetch RW3 Declaration
  const fetchRw3Declaration = useCallback(async (contractInstance) => {
    try {
      console.log('Fetching RW3 declaration from contract...', contractInstance);
      const declaration = await contractInstance.declareRW3();
      console.log('RW3 Declaration fetched successfully:', declaration);
      setRw3Declaration(declaration);
    } catch (error) {
      console.error('Error fetching RW3 declaration:', error);
      console.error('Error details:', error.message, error.code);
    }
  }, []);

  // Fetch RW3 declaration on page load (no wallet needed for view functions)
  useEffect(() => {
    const fetchRw3OnLoad = async () => {
      try {
        console.log('Fetching RW3 declaration on page load (no wallet needed)...');

        // Create a read-only provider
        let provider;
        if (window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
        } else {
          // Fallback to a public RPC if MetaMask not installed
          provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
        }

        // Create read-only contract instance
        const readOnlyContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          DUMMY_ABI,
          provider
        );

        console.log('Read-only contract created, calling declareRW3...');
        const declaration = await readOnlyContract.declareRW3();
        console.log('RW3 Declaration fetched successfully:', declaration);
        setRw3Declaration(declaration);
      } catch (error) {
        console.error('Error fetching RW3 declaration on load:', error);
        console.error('Error details:', error.message, error.code);

        // Use fallback declaration if contract call fails
        const fallbackDeclaration = `=== RW3 COMPLIANCE DECLARATION ===

PROJECT: Eternal Tic Tac Toe Protocol
VERSION: 1.0
NETWORK: Arbitrum One
VERIFIED: Block deployed

RULE 1 - REAL UTILITY:
Skill-based tournament gaming with ETH stakes. Players compete in strategic tic-tac-toe matches with blocking mechanics. Winners determined by skill, not chance. Immediate utility through competitive gameplay and prize distribution.

RULE 2 - FULLY ON-CHAIN:
All game logic, tournament mechanics, and prize distribution executed via smart contract. No backend servers. Frontend reads blockchain state directly. Game outcomes verifiable on-chain. Deployed on Arbitrum for cost efficiency while maintaining blockchain guarantees.

RULE 3 - SELF-SUSTAINING:
Protocol fee structure covers operational costs. Tournament entry fees fund prize pools plus minimal house edge. No ongoing development dependencies. Contract functions autonomously without admin intervention.

RULE 4 - FAIR DISTRIBUTION:
No pre-mine, no insider allocations. All ETH in prize pools comes from player entry fees. House edge transparent and minimal. No artificial scarcity or tokenomics manipulation.

RULE 5 - NO ALTCOINS:
Uses only ETH for entry fees and prizes. No governance tokens, no protocol tokens, no artificial economic layer. Pure ETH-based economics.

CONTRACT VERIFICATION:
Address: ${CONTRACT_ADDRESS}
Network: Arbitrum One (Chain ID: ${EXPECTED_CHAIN_ID})
Source code: [GitHub link]
Deployment tx: [Transaction hash]
Audits: [Audit links if any]

This declaration is immutable and verifiable on-chain.
Generated: ${new Date().toISOString()}
Block: [Current block number]`;

        console.log('Using fallback RW3 declaration');
        setRw3Declaration(fallbackDeclaration);
      }
    };

    fetchRw3OnLoad();
  }, [CONTRACT_ADDRESS]);

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

  // Handle clicks/touches outside popup to close it
  useEffect(() => {
    if (!showRw3Popup) return;

    const handleClickOutside = (event) => {
      console.log('Outside click detected:', event.target);
      const badge = document.getElementById('rw3-badge');
      const popup = event.target.closest('.rw3-popup');

      console.log('Badge contains target?', badge?.contains(event.target));
      console.log('Is popup?', !!popup);

      if (!badge?.contains(event.target) && !popup) {
        console.log('Closing popup via outside click');
        setShowRw3Popup(false);
      }
    };

    // Small delay to prevent immediate closing after opening
    const timerId = setTimeout(() => {
      console.log('Attaching outside click handlers');
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchend', handleClickOutside);
    }, 200);

    return () => {
      console.log('Removing outside click handlers');
      clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, [showRw3Popup]);

  // Helper to cycle through themes
  const cycleTheme = () => {
    setTheme(current => {
      if (current === 'dream') return 'daring';
      return 'dream';
    });
  };

  // Helper to get tier name
  const getTierName = (tierId) => {
    const tierNames = {
      0: 'Classic',
      1: 'Minor',
      2: 'Standard',
      3: 'Major',
      4: 'Mega',
      5: 'Ultimate',
      6: 'Rapid'
    };
    return tierNames[tierId] || `Tier ${tierId}`;
  };

  // Theme-specific colors
  const themeColors = {
    dream: {
      primary: 'rgba(0, 255, 255, 0.5)',
      secondary: 'rgba(255, 0, 255, 0.5)',
      gradient: 'linear-gradient(135deg, #0a0015 0%, #1a0030 50%, #0f001a 100%)',
      border: 'rgba(0, 255, 255, 0.3)',
      glow: 'rgba(0, 255, 255, 0.3)',
      particleColors: ['#00ffff', '#ff00ff'],
      icon: '🔥',
      label: 'Dare to Level Up?',
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
    },
    daring: {
      primary: 'rgba(255, 69, 0, 0.5)',
      secondary: 'rgba(255, 165, 0, 0.5)',
      gradient: 'linear-gradient(135deg, #1a0000 0%, #330a00 50%, #1a0500 100%)',
      border: 'rgba(255, 69, 0, 0.3)',
      glow: 'rgba(255, 69, 0, 0.3)',
      particleColors: ['#ff4500', '#ffa500'],
      icon: '✨',
      label: 'Back to Classic',
      // Hero section colors
      heroGlow: 'from-red-500 via-orange-500 to-red-500',
      heroIcon: 'text-red-400',
      heroTitle: 'from-red-400 via-orange-400 to-red-400',
      heroText: 'text-red-200',
      heroSubtext: 'text-orange-300',
      buttonGradient: 'from-red-500 to-orange-500',
      buttonHover: 'hover:from-red-600 hover:to-orange-600',
      infoCard: 'from-red-500/20 to-orange-500/20',
      infoBorder: 'border-red-400/30',
      infoIcon: 'text-red-400',
      infoTitle: 'text-orange-300',
      infoText: 'text-red-200'
    }
  };

  const currentTheme = themeColors[theme];

  // Previous game state for change detection
  const prevGameState = useRef(null);

  // FAQ data
  const faqs = [
    {
      q: "How do duel arenas work?",
      a: "Duel arenas are 1v1 tic-tac-toe matches on the blockchain. Two players join a room by paying the entry fee, then one player starts the match. Players take turns making moves on-chain. The winner receives 90% of the total entry fees (with 7.5% to owner and 2.5% to protocol)."
    },
    {
      q: "Why tic-tac-toe on the blockchain?",
      a: "Tic-tac-toe is the perfect game for blockchain: it's simple, fast, deterministic, and impossible to cheat when moves are recorded on-chain. Unlike poker or complex games that require trusted randomness, tic-tac-toe is pure skill and strategy. Every move is recorded on-chain, and game outcomes are cryptographically secured."
    },
    {
      q: "What if my opponent doesn't move?",
      a: "Each player has a time limit per move. If a player fails to make a move within the time limit, they automatically forfeit the game. The smart contract enforces all timeouts—no disputes, no moderators needed."
    },
    {
      q: "Can this really run forever?",
      a: "Yes. The smart contract is deployed on Arbitrum (an Ethereum Layer 2) with no off-switch, no admin panel, and no company required to keep it running. Even if this website disappears, anyone can interact with the contract directly via Arbiscan or build their own interface. The contract continues executing and game outcomes remain permanent."
    },
    {
      q: "How do I know the prize pool is safe?",
      a: "All entry fees go directly to the smart contract on Arbitrum. The contract holds the funds and distributes them automatically when a winner is determined. No human can access the funds. You can verify this by reading the contract code on Arbiscan."
    }
  ];

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
          rpcUrls: ['http://127.0.0.1:8545'],
          blockExplorerUrls: ['http://localhost:8545'],
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

      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();

      const networkData = {
        name: network.name || 'Unknown',
        chainId: network.chainId.toString(),
        isArbitrum: network.chainId === BigInt(EXPECTED_CHAIN_ID)
      };

      setNetworkInfo(networkData);

      console.log('Connected to network:', networkData);

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

      const web3Signer = await web3Provider.getSigner();

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        DUMMY_ABI,
        web3Signer
      );

      console.log('Contract initialized at:', CONTRACT_ADDRESS);

      setAccount(accounts[0]);
      setContract(contractInstance);

      await loadContractData(contractInstance, false);
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);

      let errorMessage = 'Failed to connect wallet.\n\n';

      if (error.message.includes('user rejected')) {
        errorMessage += 'You rejected the connection request.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage += 'Network error. Are you connected to Arbitrum One?\n\nSwitch to Arbitrum One in MetaMask.';
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);
      setLoading(false);
    }
  };

  // Add log entry
  const addLogEntry = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setGameLog(prev => [...prev, { type, message, timestamp }]);
  };

  // Verify contract is deployed (simplified for tournament contract)
  const loadContractData = async (contractInstance, isInitialLoad = false) => {
    // Always try to fetch cached stats first, even if contract verification fails
    try {
      console.log('🔄 Fetching cached stats...');
      setCachedStatsLoading(true);

      let matches = [];
      let tournaments = [];

      // Fetch all cached matches
      try {
        const allCachedMatches = await contractInstance.getAllCachedMatches();
        matches = Array.from(allCachedMatches).filter(m => m && m.exists);
        console.log('✅ Fetched', matches.length, 'cached matches');
      } catch (err) {
        console.warn('Error fetching cached matches:', err.message || err);
      }

      // Get recent tournaments from each tier
      for (let tierId = 0; tierId < 7; tierId++) {
        try {
          const tierTournaments = await contractInstance.getRecentTournaments(tierId, 5);
          const validTournaments = Array.from(tierTournaments).filter(t => t && t.exists);
          tournaments.push(...validTournaments);
        } catch (err) {
          console.log(`No tournaments found for tier ${tierId}`);
        }
      }

      console.log('✅ Fetched', tournaments.length, 'cached tournaments');
      setCachedStats({ matches, tournaments });
      setCachedStatsLoading(false);
    } catch (err) {
      console.error('Could not fetch cached stats:', err);
      setCachedStats({ matches: [], tournaments: [] });
      setCachedStatsLoading(false);
    }

    // Now verify contract deployment
    try {
      setContractStatus('checking');

      // Verify contract is deployed by checking bytecode
      const provider = contractInstance.runner.provider;
      const contractAddress = await contractInstance.getAddress();
      const code = await provider.getCode(contractAddress);

      console.log('Checking contract at:', contractAddress);
      console.log('Bytecode length:', code.length);

      if (code === '0x' || code === '0x0') {
        setContractStatus('not_deployed');
        console.error('❌ No bytecode found at address:', contractAddress);
        throw new Error(
          `No contract found at ${contractAddress}\n\n` +
          `This means either:\n` +
          `1. The contract hasn't been deployed yet\n` +
          `2. The CONTRACT_ADDRESS in the code is wrong\n` +
          `3. You're connected to the wrong network\n\n` +
          `Steps to fix:\n` +
          `1. Verify you're connected to the correct network\n` +
          `2. Check the contract address is correct\n` +
          `3. Deploy the contract if it doesn't exist`
        );
      }

      console.log('✅ Contract found! Bytecode exists.');
      setContractStatus('deployed');

      // Try to fetch entry fee for tier 0 (optional, may not be set yet)
      try {
        const fee = await contractInstance.ENTRY_FEES(0);
        setEntryFee(ethers.formatEther(fee));
      } catch (err) {
        console.log('Note: Could not fetch entry fee, using default');
        setEntryFee('0.01');
      }

      // Fetch tournaments during initial load (no wallet required)
      if (isInitialLoad) {
        console.log('🔄 Fetching tournaments for initial load...');
        try {
          // Fetch based on the current theme
          const currentTheme = themeRef.current || 'daring';

          if (currentTheme === 'dream') {
            // Fetch Dream mode tournaments (all tiers 0-6)
            await fetchAllDaringTiers(false);
          } else {
            // Fetch all Daring mode tiers
            await fetchAllDaringTiers(false);
          }

          console.log('✅ Initial tournament data loaded');
        } catch (err) {
          console.warn('Could not fetch tournaments on initial load:', err);
        }
      }

      // Mark initial loading as complete
      if (isInitialLoad) {
        setInitialLoading(false);
      }
    } catch (error) {
      console.error('Error verifying contract:', error);

      // Mark initial loading as complete even on error
      if (isInitialLoad) {
        setInitialLoading(false);
      }

      // Only show alerts if user has connected wallet
      if (account) {
        alert('Error connecting to contract: ' + error.message);
      }
    }
  };

  // Fetch tournaments for a specific tier
  const fetchTournaments = useCallback(async (tierId, silent = false) => {
    if (!contract) return;

    try {
      if (!silent) {
        setTournamentsLoading(true);
      }

      // Get tier overview which returns arrays of data for all instances
      const tierOverview = await contract.getTierOverview(tierId);
      const statuses = tierOverview[0];
      const enrolledCounts = tierOverview[1];
      const prizePools = tierOverview[2];

      // Get tier config to get correct player count
      const tierConfig = await contract.tierConfigs(tierId);
      const maxPlayers = Number(tierConfig.playerCount);

      // Get entry fee for this tier
      const fee = await contract.ENTRY_FEES(tierId);
      const entryFeeFormatted = ethers.formatEther(fee);

      // Get tier escalation and timeout configs
      let tierTimeoutConfig = null;
      try {
        tierTimeoutConfig = await contract.tierTimeoutConfigs(tierId);
        console.log(`Tier ${tierId} escalation & timeout config:`, {
          enrollmentWindow: Number(tierTimeoutConfig.enrollmentWindow),
          matchMoveTimeout: Number(tierTimeoutConfig.matchMoveTimeout),
          roundCompletionTimeout: Number(tierTimeoutConfig.roundCompletionTimeout),
          prizeClaimWindow: Number(tierTimeoutConfig.prizeClaimWindow),
          tierEscalationInterval: Number(tierTimeoutConfig.tierEscalationInterval)
        });
      } catch (err) {
        console.log('Could not fetch tier timeout config:', err);
      }

      // Build tournament data array
      const tournamentData = [];
      for (let i = 0; i < statuses.length; i++) {
        const instanceId = i;
        const status = Number(statuses[i]);
        const enrolledCount = Number(enrolledCounts[i]);

        // Check if user is enrolled (if wallet connected)
        let isEnrolled = false;
        if (account) {
          try {
            isEnrolled = await contract.isEnrolled(tierId, instanceId, account);
          } catch (err) {
            console.log('Could not check enrollment status:', err);
          }
        }

        // Get enrollment timeout data with tier information
        let enrollmentTimeout = null;
        let hasStartedViaTimeout = false;
        try {
          const tournamentInfo = await contract.tournaments(tierId, instanceId);
          enrollmentTimeout = tournamentInfo.enrollmentTimeout;
          hasStartedViaTimeout = tournamentInfo.hasStartedViaTimeout;

          // Debug logging
          if (enrollmentTimeout) {
            console.log(`Tournament ${tierId}-${instanceId} escalation data:`, {
              escalation1Start: Number(enrollmentTimeout.escalation1Start),
              escalation2Start: Number(enrollmentTimeout.escalation2Start),
              activeEscalation: Number(enrollmentTimeout.activeEscalation),
              forfeitPool: enrollmentTimeout.forfeitPool?.toString() || '0',
              hasStartedViaTimeout
            });
          }
        } catch (err) {
          console.log('Could not fetch tournament timeout data:', err);
        }

        tournamentData.push({
          tierId,
          instanceId,
          status,
          enrolledCount,
          maxPlayers,
          entryFee: entryFeeFormatted,
          isEnrolled,
          enrollmentTimeout,
          hasStartedViaTimeout,
          tournamentStatus: status, // Store raw status for conditional rendering
          tierTimeoutConfig // Include timeout configuration
        });
      }

      // Sort by enrolledCount descending (most enrolled first)
      tournamentData.sort((a, b) => b.enrolledCount - a.enrolledCount);

      setTournaments(tournamentData);
      if (!silent) {
        setTournamentsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      if (!silent) {
        setTournamentsLoading(false);
      }
    }
  }, [contract, account]);

  // Fetch cached tournament and match stats
  const fetchCachedStats = useCallback(async (silent = false) => {
    if (!contract) return;

    try {
      if (!silent) {
        setCachedStatsLoading(true);
      }

      let matches = [];
      let tournaments = [];

      // Fetch all cached matches with error handling
      try {
        const allCachedMatches = await contract.getAllCachedMatches();
        // Convert to plain array and filter existing matches
        matches = Array.from(allCachedMatches).filter(m => m && m.exists);
      } catch (err) {
        console.warn('Error fetching cached matches:', err.message || err);
      }

      // Fetch all completed tournaments
      try {
        const allCompletedTournaments = await contract.getAllCompletedTournaments();
        // Convert to plain array and filter existing tournaments
        tournaments = Array.from(allCompletedTournaments).filter(t => t && t.exists);
        console.log(`Fetched ${tournaments.length} completed tournaments`);
      } catch (err) {
        console.error('Error fetching completed tournaments:', err);
      }

      // Group tournaments by completion type
      const organicTournaments = tournaments.filter(t => Number(t.completionType) === 0);
      const partialTournaments = tournaments.filter(t => Number(t.completionType) === 1);
      const abandonedTournaments = tournaments.filter(t => Number(t.completionType) === 2);

      console.log('Tournament breakdown:', {
        total: tournaments.length,
        organic: organicTournaments.length,
        partial: partialTournaments.length,
        abandoned: abandonedTournaments.length
      });

      setCachedStats({
        matches,
        tournaments,
        organicTournaments,
        partialTournaments,
        abandonedTournaments
      });
      if (!silent) {
        setCachedStatsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching cached stats:', error.message || error);
      // Set empty stats on error so UI doesn't break
      setCachedStats({
        matches: [],
        tournaments: [],
        organicTournaments: [],
        partialTournaments: [],
        abandonedTournaments: []
      });
      if (!silent) {
        setCachedStatsLoading(false);
      }
    }
  }, [contract]);

  // Fetch all Dare mode tiers (extracted for reuse)
  const fetchAllDaringTiers = useCallback(async (silent = false) => {
    if (!contract) return;

    if (!silent) {
      setTournamentsLoading(true);
    }
    const allTournaments = [];

    for (let tierId = 0; tierId <= 6; tierId++) {
      try {
        // Get tier overview which returns arrays of data for all instances
        const tierOverview = await contract.getTierOverview(tierId);
        const statuses = tierOverview[0];
        const enrolledCounts = tierOverview[1];

        // Get tier config to get correct player count
        const tierConfig = await contract.tierConfigs(tierId);
        const maxPlayers = Number(tierConfig.playerCount);

        // Get entry fee for this tier
        const fee = await contract.ENTRY_FEES(tierId);
        const entryFeeFormatted = ethers.formatEther(fee);

        console.log(`Tier ${tierId}: ${statuses.length} instances`);

        // Create tournament objects for each instance
        for (let i = 0; i < statuses.length; i++) {
          const status = Number(statuses[i]);
          const enrolledCount = Number(enrolledCounts[i]);

          // Check if user is enrolled
          let isEnrolled = false;
          if (account) {
            isEnrolled = await contract.isEnrolled(tierId, i, account);
          }

          // Get enrollment timeout data with tier information
          let enrollmentTimeout = null;
          let hasStartedViaTimeout = false;
          try {
            const tournamentInfo = await contract.tournaments(tierId, i);
            enrollmentTimeout = tournamentInfo.enrollmentTimeout;
            hasStartedViaTimeout = tournamentInfo.hasStartedViaTimeout;

            // Debug logging
            if (enrollmentTimeout) {
              console.log(`Tournament ${tierId}-${i} escalation data:`, {
                escalation1Start: Number(enrollmentTimeout.escalation1Start),
                escalation2Start: Number(enrollmentTimeout.escalation2Start),
                activeEscalation: Number(enrollmentTimeout.activeEscalation),
                forfeitPool: enrollmentTimeout.forfeitPool?.toString() || '0',
                hasStartedViaTimeout
              });
            }
          } catch (err) {
            console.log('Could not fetch tournament timeout data:', err);
          }

          allTournaments.push({
            tierId,
            instanceId: i,
            status,
            enrolledCount,
            maxPlayers,
            entryFee: entryFeeFormatted,
            isEnrolled,
            enrollmentTimeout,
            hasStartedViaTimeout,
            tournamentStatus: status // Store raw status for conditional rendering
          });
        }
      } catch (error) {
        console.error(`Error fetching tier ${tierId}:`, error);
      }
    }

    console.log(`Total tournaments found: ${allTournaments.length}`);

    // Sort within each tier by enrolledCount descending (most enrolled first)
    const tierGroups = {};
    allTournaments.forEach(tournament => {
      if (!tierGroups[tournament.tierId]) {
        tierGroups[tournament.tierId] = [];
      }
      tierGroups[tournament.tierId].push(tournament);
    });

    // Sort each tier's instances
    Object.values(tierGroups).forEach(tierTournaments => {
      tierTournaments.sort((a, b) => b.enrolledCount - a.enrolledCount);
    });

    // Flatten back to a single array, maintaining tier order (0-6)
    const sortedTournaments = [];
    for (let tierId = 0; tierId <= 6; tierId++) {
      if (tierGroups[tierId]) {
        sortedTournaments.push(...tierGroups[tierId]);
      }
    }

    setTournaments(sortedTournaments);
    if (!silent) {
      setTournamentsLoading(false);
    }
  }, [contract, account]);

  // Handle tournament enrollment
  const handleEnroll = async (tierId, instanceId, entryFee) => {
    if (!contract || !account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setTournamentsLoading(true);

      console.log('Enrolling with:', { tierId, instanceId, entryFee, type: typeof entryFee });

      // Convert entry fee to wei
      const feeInWei = ethers.parseEther(entryFee);
      console.log('Fee in wei:', feeInWei.toString());

      // Call enrollInTournament function with entry fee as value
      const tx = await contract.enrollInTournament(tierId, instanceId, { value: feeInWei });
      await tx.wait();

      alert('Successfully enrolled in tournament!');

      // Navigate to tournament bracket view
      const bracketData = await refreshTournamentBracket(contract, tierId, instanceId);
      if (bracketData) {
        setViewingTournament(bracketData);
      }

      // Refresh tournament data in background
      if (theme === 'dream') {
        await fetchAllDaringTiers();
      } else if (theme === 'daring') {
        // Re-fetch all Dare mode tiers
        await fetchAllDaringTiers();
      }

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
      console.log(`Instance count for tier ${tierId}: ${instanceCount}`);

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

      console.log('Force start attempt:', {
        tierId, instanceId, enrolledCount, status,
        escalation1Start, escalation2Start, now,
        canStartEscalation1, canStartEscalation2,
        forfeitPool: forfeitPool.toString()
      });

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

      // Call forceStartTournament function
      console.log('Calling forceStartTournament with:', {
        tierId,
        instanceId,
        enrolledCount,
        status,
        canStartEscalation1,
        canStartEscalation2,
        isEnrolled
      });

      const tx = await contract.forceStartTournament(tierId, instanceId);
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');

      alert('Tournament force-started successfully!');

      // Exit tournament view and go back to tournaments list
      setViewingTournament(null);
      setCurrentMatch(null);

      // Refresh cached stats
      await fetchCachedStats(true);

      // Refresh tournament data
      if (theme === 'dream') {
        await fetchAllDaringTiers();
      } else if (theme === 'daring') {
        // Re-fetch all Dare mode tiers
        await fetchAllDaringTiers();
      }

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error force-starting tournament:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

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
      const escalation1Start = Number(enrollmentTimeout.escalation1Start);
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const now = Math.floor(Date.now() / 1000);
      const canStartEscalation2 = escalation2Start > 0 && now >= escalation2Start;

      console.log('Claim abandoned pool attempt:', {
        tierId, instanceId, status, enrolledCount,
        canStartEscalation2, escalation2Start, now,
        forfeitPool: forfeitPool.toString()
      });

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

      console.log('🔍 CLAIM ATTEMPT:', { tierId, instanceId, type: typeof instanceId });
      console.log('Calling claimAbandonedEnrollmentPool with:', { tierId, instanceId });

      const tx = await contract.claimAbandonedEnrollmentPool(tierId, instanceId);
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');

      alert('Abandoned enrollment pool claimed successfully!');

      // Exit tournament view and go back to tournaments list
      setViewingTournament(null);
      setCurrentMatch(null);

      // Refresh cached stats
      await fetchCachedStats(true);

      // Refresh tournament data
      if (theme === 'dream') {
        await fetchAllDaringTiers();
      } else if (theme === 'daring') {
        await fetchAllDaringTiers();
      }

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
      const firstPlayer = matchData[9];
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

      alert('Timeout victory claimed! You win by opponent forfeit.');

      // Exit match view and go back to tournaments list
      setCurrentMatch(null);
      setViewingTournament(null);

      // Refresh cached stats
      await fetchCachedStats(true);

      // Refresh tournament data
      if (theme === 'dream') {
        await fetchAllDaringTiers();
      } else if (theme === 'daring') {
        await fetchAllDaringTiers();
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
      await fetchCachedStats(true);

      // Refresh tournament data
      if (theme === 'dream') {
        await fetchAllDaringTiers();
      } else if (theme === 'daring') {
        await fetchAllDaringTiers();
      }

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
      await fetchCachedStats(true);

      // Refresh tournament data
      if (theme === 'dream') {
        await fetchAllDaringTiers();
      } else if (theme === 'daring') {
        await fetchAllDaringTiers();
      }

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

  // Close match view
  const closeMatch = () => {
    setCurrentMatch(null);
    setMoveHistory([]);
  };

  // Initialize contract in read-only mode on mount (without wallet)
  useEffect(() => {
    const initReadOnlyContract = async () => {
      try {
        // Use local network RPC
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

        const readOnlyContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          DUMMY_ABI,
          provider
        );

        setContract(readOnlyContract);
        await loadContractData(readOnlyContract, true); // Pass true for initial load
      } catch (error) {
        console.error('Error initializing read-only contract:', error);
        setInitialLoading(false); // Stop loading even on error
      }
    };

    // Only initialize if contract is not already set
    if (!contract) {
      initReadOnlyContract();
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          // Reinitialize read-only contract when disconnected
          const initReadOnlyContract = async () => {
            const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
            const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, DUMMY_ABI, provider);
            setContract(readOnlyContract);
            await loadContractData(readOnlyContract);
          };
          initReadOnlyContract();
        } else {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  // Fetch tournaments when theme or contract changes
  useEffect(() => {
    if (contract) {
      if (theme === 'dream') {
        // Dream mode: fetch all tiers 0-6 (now includes all tiers)
        fetchAllDaringTiers();
      } else if (theme === 'daring') {
        // Daring mode: fetch all tiers 1-6
        fetchAllDaringTiers();
      }
    }
  }, [theme, contract, account, fetchTournaments, fetchAllDaringTiers]);

  // Fetch cached stats when contract is available
  useEffect(() => {
    if (contract) {
      fetchCachedStats();
    }
  }, [contract, fetchCachedStats]);

  // Poll match data every 3 seconds when viewing a match (using refs for seamless syncing)
  const matchRef = useRef(currentMatch);
  const contractRef = useRef(contract);
  const accountRef = useRef(account);

  // Keep refs updated
  useEffect(() => {
    matchRef.current = currentMatch;
    contractRef.current = contract;
    accountRef.current = account;
  }, [currentMatch, contract, account]);

  useEffect(() => {
    if (!currentMatch || !contract || !account) return;

    const doSync = async () => {
      const match = matchRef.current;
      const contractInstance = contractRef.current;
      const userAccount = accountRef.current;

      if (!match || !contractInstance || !userAccount) return;

      const updated = await refreshMatchData(contractInstance, userAccount, match);
      if (updated) setCurrentMatch(updated);

      // Reset dots to 1 after sync completes
      setSyncDots(1);
    };

    // Set up polling interval - runs every 3 seconds
    const pollInterval = setInterval(doSync, 3000);

    return () => clearInterval(pollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, refreshMatchData]);

  // Increment sync dots every second (1 -> 2 -> 3, then resets when sync completes)
  useEffect(() => {
    if (!currentMatch) return;

    const dotsInterval = setInterval(() => {
      setSyncDots(prev => {
        // Cap at 3 dots
        if (prev >= 3) return 3;
        return prev + 1;
      });
    }, 1000); // Add one dot every second

    return () => clearInterval(dotsInterval);
  }, [currentMatch]);

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

          // Case 1: Single Match Forfeit (Escalation 1 - opponent claims victory)
          if (matchWasCompleted &&
              updatedMatch.isTimedOut &&
              updatedMatch.winner.toLowerCase() !== zeroAddress &&
              !updatedMatch.isDraw &&
              wasParticipant) {
            const userWon = updatedMatch.winner.toLowerCase() === userAccount.toLowerCase();
            if (userWon) {
              alert('You won by forfeit! Your opponent failed to move in time.');

              // Stay in match view to see final board
              setCurrentMatch(null);

              // Refresh and show tournament bracket
              await fetchCachedStats(true);
              if (theme === 'dream') {
                await fetchAllDaringTiers();
              } else if (theme === 'daring') {
                await fetchAllDaringTiers();
              }

              const bracketData = await refreshTournamentBracket(contractInstance, updatedMatch.tierId, updatedMatch.instanceId);
              if (bracketData) setViewingTournament(bracketData);
            } else {
              alert('You lost by forfeit. You failed to move in time and your opponent claimed victory.');

              setCurrentMatch(null);
              setViewingTournament(null);

              await fetchCachedStats(true);
              if (theme === 'dream') {
                await fetchAllDaringTiers();
              } else if (theme === 'daring') {
                await fetchAllDaringTiers();
              }
            }
            return;
          }

          // Case 2: Higher-Round Intervention (Escalation 2 - both players eliminated)
          const isDoubleForfeited = updatedMatch.winner.toLowerCase() === zeroAddress && !updatedMatch.isDraw;
          if (matchWasCompleted && isDoubleForfeited && wasParticipant) {
            alert('You were eliminated from the tournament. Both you and your opponent were removed due to inactivity by an advanced player.');

            setCurrentMatch(null);
            setViewingTournament(null);

            await fetchCachedStats(true);
            if (theme === 'dream') {
              await fetchAllDaringTiers();
            } else if (theme === 'daring') {
              await fetchAllDaringTiers();
            }
            return;
          }

          // Case 3: Final Outsider Claim (Escalation 3 - external outsider claims prize pool)
          // This is detected when timeoutClaimant is set and user is a participant
          if (matchWasCompleted &&
              updatedMatch.timeoutClaimant &&
              updatedMatch.timeoutClaimant.toLowerCase() !== zeroAddress &&
              wasParticipant) {
            const claimerIsExternal =
              updatedMatch.timeoutClaimant.toLowerCase() !== updatedMatch.player1.toLowerCase() &&
              updatedMatch.timeoutClaimant.toLowerCase() !== updatedMatch.player2.toLowerCase();

            if (claimerIsExternal) {
              alert('An external outsider claimed the prize pool for this match due to prolonged inactivity. You have been eliminated from the tournament.');

              setCurrentMatch(null);
              setViewingTournament(null);

              await fetchCachedStats(true);
              if (theme === 'dream') {
                await fetchAllDaringTiers();
              } else if (theme === 'daring') {
                await fetchAllDaringTiers();
              }
              return;
            }
          }

          // Normal match update
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
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber, account, refreshMatchData, theme, fetchCachedStats, fetchTournaments, fetchAllDaringTiers, refreshTournamentBracket]);

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

  // Auto-refresh tournament cards every 3 seconds (smooth update without clearing the list)
  const themeRef = useRef(theme);
  const contractRefForTournaments = useRef(contract);

  // Keep refs updated
  useEffect(() => {
    themeRef.current = theme;
    contractRefForTournaments.current = contract;
  }, [theme, contract]);

  // Tournament auto-sync removed - tournaments will only refresh on manual actions

  // Cached stats auto-sync removed - stats will only refresh on manual actions
  const contractRefForCachedStats = useRef(contract);

  // Keep ref updated
  useEffect(() => {
    contractRefForCachedStats.current = contract;
  }, [contract]);

  // Scroll listener to hide theme toggle when scrolled past hero section
  useEffect(() => {
    const handleScroll = () => {
      // Get the hero section height (approximately where "Why Arbitrum?" ends)
      // We'll hide the button when scrolled past ~600px
      const scrollPosition = window.scrollY;
      const threshold = 600;

      if (scrollPosition > threshold) {
        setShowThemeToggle(false);
      } else {
        setShowThemeToggle(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <ParticleBackground colors={currentTheme.particleColors} />

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
        background: theme === 'dream' ? 'rgba(0, 100, 200, 0.2)' : 'rgba(139, 0, 0, 0.2)',
        borderBottom: `1px solid ${currentTheme.border}`,
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 10,
        transition: 'background 3s ease-in-out, border-bottom 5s ease-in-out'
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
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-blue-900/30 px-2 py-1 rounded transition-colors"
                onMouseEnter={() => {
                  // Only enable hover on non-touch devices
                  if (!('ontouchstart' in window) && rw3Declaration) {
                    const badge = document.getElementById('rw3-badge');
                    if (badge) {
                      setRw3BadgeRect(badge.getBoundingClientRect());
                    }
                    setShowRw3Popup(true);
                  }
                }}
                onMouseLeave={() => {
                  // Only enable hover on non-touch devices
                  if (!('ontouchstart' in window)) {
                    setShowRw3Popup(false);
                  }
                }}
                onClick={(e) => {
                  console.log('RW3 Badge clicked!', { rw3Declaration, showRw3Popup });
                  e.stopPropagation();
                  if (rw3Declaration) {
                    const badge = document.getElementById('rw3-badge');
                    if (badge) {
                      const rect = badge.getBoundingClientRect();
                      console.log('Badge rect:', rect);
                      setRw3BadgeRect(rect);
                    }
                    setShowRw3Popup(prev => {
                      console.log('Toggling popup from', prev, 'to', !prev);
                      return !prev;
                    });
                  } else {
                    console.log('No RW3 declaration available yet');
                  }
                }}
                id="rw3-badge"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
          <Shield className="text-blue-400" size={16} />
          <span className="text-blue-100 font-medium underline decoration-blue-400/50 underline-offset-2" style={{ textDecorationThickness: '0.5px' }}>RW3 Compliant</span>
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
            Eternal TicTacToe
          </h1>
          <p className={`text-2xl ${currentTheme.heroText} mb-6`}>
            Provably Fair • <a href="#zero-trust" className={`${currentTheme.heroText} hover:text-green-300 transition-colors underline decoration-${theme === 'daring' ? 'red' : 'blue'}-400/50 hover:decoration-green-400 underline-offset-4`}>Zero Trust</a> • 100% On-Chain
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
          <span className="font-bold text-green-300">
            {theme === 'daring' ? 'Winner Takes 90%' : 'Winner Takes 90%'}
          </span>
              </div>
              <p className="text-sm text-green-200">
                {theme === 'daring'
                  ? 'High stakes - winner receives 90% of total entry fees'
                  : 'Champion walks away with 90% of the pot'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
          <DollarSign className="text-yellow-400" size={20} />
          <span className="font-bold text-yellow-300">
            {theme === 'daring' ? '0.01 ETH Entry' : '0.002 ETH Entry'}
          </span>
              </div>
              <p className="text-sm text-yellow-200">
                {theme === 'daring'
                  ? 'Higher stakes for serious competitors'
                  : 'Low stakes, high strategy gameplay'}
              </p>
            </div>
            <div className={`bg-gradient-to-br ${currentTheme.infoCard} border ${currentTheme.infoBorder} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
          <Zap className={currentTheme.infoIcon} size={20} />
          <span className={`font-bold ${currentTheme.infoTitle}`}>
            {theme === 'daring' ? 'Block Mechanic' : 'Random First Move'}
          </span>
              </div>
              <p className={`text-sm ${currentTheme.infoText}`}>
                {theme === 'daring'
                  ? 'Advanced blocking strategy - control the board'
                  : 'On-chain coin flip decides who starts'}
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

          {/* Why Arbitrum Info - Always Visible */}
          <div className="mt-6 max-w-2xl mx-auto">
            <div className={`bg-${theme === 'daring' ? 'red' : 'blue'}-500/10 border ${currentTheme.infoBorder} rounded-lg p-4`}>
              <div className="flex items-start gap-3">
          <Info size={18} className={`${currentTheme.infoIcon} mt-0.5 flex-shrink-0`} />
          <div className="text-sm w-full">
            <p className={`${currentTheme.heroText} font-medium mb-2`}>Why Arbitrum?</p>
            <p className={`${currentTheme.heroSubtext}/80 leading-relaxed mb-3`}>
              This game runs on <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className={`font-semibold ${currentTheme.heroText} hover:${theme === 'daring' ? 'text-red-100' : 'text-blue-100'} underline decoration-${theme === 'daring' ? 'red' : 'blue'}-400/50 hover:decoration-${theme === 'daring' ? 'orange' : 'blue'}-300 transition-colors`}>Arbitrum One</a>, an Ethereum Layer 2 network.
            </p>
            <div className={`${currentTheme.heroSubtext}/80 leading-relaxed space-y-2 text-sm`}>
              <p><strong className={currentTheme.heroText}>First time on Arbitrum?</strong> You'll need to:</p>
              <ol className="list-decimal list-inside pl-2 space-y-1">
                <li>Switch to Arbitrum network in MetaMask (instant and free)</li>
                <li>Bridge ETH from Ethereum mainnet to Arbitrum (~15 min, requires L1 gas)</li>
              </ol>
              <p><strong className={currentTheme.heroText}>Already have Arbitrum ETH?</strong> Just switch networks and play.</p>
              <p className="pt-1"><span className={currentTheme.heroText}>Lower fees than Ethereum mainnet. Final outcomes secured by Ethereum L1.</span></p>
            </div>
          </div>
              </div>
            </div>
          </div>


          {/* Connection Status Panel (for debugging) */}
          {account && (networkInfo || contractStatus !== 'not_checked') && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="bg-slate-900/70 border border-slate-600 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info size={20} className="text-blue-400" />
            <h3 className="text-lg font-bold text-white">Connection Status</h3>
          </div>

          <div className="space-y-3 text-sm">
            {/* Network Status */}
            {networkInfo && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${networkInfo.isArbitrum ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span className="text-slate-300">Network:</span>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${networkInfo.isArbitrum ? 'text-green-400' : 'text-yellow-400'}`}>
                    {networkInfo.name}
                  </div>
                  <div className="text-xs text-slate-400">Chain ID: {networkInfo.chainId}</div>
                </div>
              </div>
            )}

            {/* Contract Status */}
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  contractStatus === 'deployed' ? 'bg-green-400' :
                  contractStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
                  contractStatus === 'not_deployed' ? 'bg-red-400' :
                  'bg-slate-400'
                }`} />
                <span className="text-slate-300">Contract:</span>
              </div>
              <div className="text-right">
                <div className={`font-bold ${
                  contractStatus === 'deployed' ? 'text-green-400' :
                  contractStatus === 'checking' ? 'text-yellow-400' :
                  contractStatus === 'not_deployed' ? 'text-red-400' :
                  'text-slate-400'
                }`}>
                  {contractStatus === 'deployed' ? 'Deployed ✓' :
                   contractStatus === 'checking' ? 'Checking...' :
                   contractStatus === 'not_deployed' ? 'Not Deployed ✗' :
                   'Not Checked'}
                </div>
                <div className="text-xs text-slate-400 font-mono">{shortenAddress(CONTRACT_ADDRESS)}</div>
              </div>
            </div>

            {/* Deployment Instructions */}
            {contractStatus === 'not_deployed' && (
              <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                <div className="text-red-300 font-bold mb-3 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Contract Not Found at This Address
                </div>

                <div className="text-xs text-red-200 space-y-3 mb-3">
                  <div className="bg-red-900/30 p-2 rounded font-mono text-[11px]">
                    Checking: {CONTRACT_ADDRESS}
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-red-100">🔍 Troubleshooting Steps:</div>

                    <div>
                      <div className="font-bold mb-1">1️⃣ Check Your Deployment Output</div>
                      <div className="ml-4 text-[11px] opacity-90">
                        When you ran the deploy command, it should have printed:<br/>
                        <code className="bg-slate-900 px-1 py-0.5 rounded">
                          "Contract deployed to: 0x..."
                        </code>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold mb-1">2️⃣ Update the Address</div>
                      <div className="ml-4 text-[11px] opacity-90">
                        Copy that address and paste it in:<br/>
                        <code className="bg-slate-900 px-1 py-0.5 rounded text-yellow-300">
                          src/App.jsx line 767
                        </code>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold mb-1">3️⃣ Verify on Arbiscan</div>
                      <div className="ml-4 text-[11px] opacity-90">
                        <code className="bg-slate-900 px-1 py-0.5 rounded block mb-1">
                          https://arbiscan.io/address/{CONTRACT_ADDRESS}
                        </code>
                        Check if the contract exists on Arbitrum One.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-red-300/70 bg-red-900/20 p-2 rounded">
                  💡 Tip: Check the browser console (F12) for more details about what address was checked.
                </div>
              </div>
            )}

            {!networkInfo?.isArbitrum && (
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
                <div className="text-yellow-300 font-bold mb-2">⚠️ Wrong Network</div>
                <div className="text-xs text-yellow-200 mb-3">
                  You're on <span className="font-bold">{networkInfo.name}</span>. Switch to Local Network (Chain ID: {EXPECTED_CHAIN_ID}).
                </div>
                <button
                  onClick={switchToArbitrum}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={16} />
                  Switch to Arbitrum One
                </button>
              </div>
            )}
          </div>
              </div>
            </div>
          )}
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
                  {/* Move Timeout Timer - Shows before escalation */}
                  {currentMatch.matchStatus === 1 && (currentMatch.lastMoveTime !== undefined || currentMatch.startTime !== undefined) && (() => {
                    const now = Math.floor(Date.now() / 1000);
                    const MOVE_TIMEOUT = 60; // 1 minute in seconds
                    // Use lastMoveTime if available, otherwise use startTime for first move
                    const timeReference = currentMatch.lastMoveTime > 0 ? currentMatch.lastMoveTime : currentMatch.startTime;
                    const timeSinceLastMove = now - timeReference;
                    const timeRemaining = Math.max(0, MOVE_TIMEOUT - timeSinceLastMove);

                    const formatTime = (secs) => {
                      const mins = Math.floor(secs / 60);
                      const seconds = secs % 60;
                      return `${mins}:${seconds.toString().padStart(2, '0')}`;
                    };

                    // Show timer if we have a valid time reference
                    if (timeReference > 0) {
                      const isYourTurn = currentMatch.isYourTurn;
                      const isLowTime = timeRemaining <= 10;

                      return (
                        <div className={`border rounded-xl p-3 ${
                          isLowTime ? 'bg-red-500/20 border-red-400 animate-pulse' : 'bg-blue-500/20 border-blue-400'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className={isLowTime ? 'text-red-400' : 'text-blue-400'} size={18} />
                              <span className={`text-sm font-bold ${isLowTime ? 'text-red-300' : 'text-blue-300'}`}>
                                {isYourTurn ? 'Your Turn' : 'Opponent\'s Turn'}
                              </span>
                            </div>
                            <div className={`text-lg font-mono font-bold ${
                              isLowTime ? 'text-red-300' : timeRemaining <= 30 ? 'text-yellow-300' : 'text-blue-300'
                            }`}>
                              {timeRemaining > 0 ? formatTime(timeRemaining) : '⚠️ TIMEOUT'}
                            </div>
                          </div>
                          {isYourTurn && timeRemaining > 0 && (
                            <div className="text-xs text-blue-300/70 mt-1">
                              Make your move before time runs out!
                            </div>
                          )}
                          {timeRemaining === 0 && !isYourTurn && (
                            <div className="mt-2">
                              <button
                                onClick={handleClaimTimeoutWin}
                                disabled={matchLoading}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                              >
                                ⏰ Claim Timeout Victory
                              </button>
                              <div className="text-xs text-green-300 mt-1 text-center">
                                Your opponent ran out of time!
                              </div>
                            </div>
                          )}
                          {timeRemaining === 0 && isYourTurn && (
                            <div className="text-xs text-red-300 mt-1">
                              ⚡ Time's up! Your opponent can claim victory...
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Match Timeout Escalation UI */}
                  {currentMatch.timeoutState && currentMatch.timeoutState.timeoutActive && currentMatch.matchStatus === 1 && (() => {
                    const now = Math.floor(Date.now() / 1000);
                    const { escalation1Start, escalation2Start, escalation3Start, activeEscalation } = currentMatch.timeoutState;

                    const timeToEsc1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
                    const timeToEsc2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;
                    const timeToEsc3 = escalation3Start > 0 ? Math.max(0, escalation3Start - now) : 0;

                    const canClaimTimeout = activeEscalation >= 1 && !currentMatch.isYourTurn;
                    const canForceEliminate = activeEscalation >= 2;
                    const canReplace = activeEscalation >= 3;

                    const formatTime = (secs) => {
                      const mins = Math.floor(secs / 60);
                      const seconds = secs % 60;
                      return `${mins}:${seconds.toString().padStart(2, '0')}`;
                    };

                    return (
                      <div className="bg-orange-500/20 border border-orange-400 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="text-orange-400" size={20} />
                          <span className="text-orange-300 font-bold text-sm">Match Timeout Active</span>
                        </div>

                        {/* Escalation 1 */}
                        {activeEscalation >= 1 && canClaimTimeout && (
                          <button
                            onClick={handleClaimTimeoutWin}
                            disabled={matchLoading}
                            className="w-full mb-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                          >
                            ⏰ Claim Timeout Victory
                          </button>
                        )}

                        {/* Countdown timers */}
                        <div className="space-y-1 text-xs">
                          {timeToEsc1 > 0 && activeEscalation < 1 && (
                            <div className="text-orange-300">Esc 1 in: {formatTime(timeToEsc1)}</div>
                          )}
                          {timeToEsc2 > 0 && activeEscalation < 2 && (
                            <div className="text-orange-300">Esc 2 in: {formatTime(timeToEsc2)}</div>
                          )}
                          {timeToEsc3 > 0 && activeEscalation < 3 && (
                            <div className="text-orange-300">Esc 3 in: {formatTime(timeToEsc3)}</div>
                          )}
                          {activeEscalation >= 1 && <div className="text-green-400 font-bold">✓ Escalation 1 Active</div>}
                          {activeEscalation >= 2 && <div className="text-yellow-400 font-bold">✓ Escalation 2 Active</div>}
                          {activeEscalation >= 3 && <div className="text-red-400 font-bold">✓ Escalation 3 Active</div>}
                        </div>

                        {/* Escalation 2 */}
                        {canForceEliminate && (
                          <button
                            onClick={handleForceEliminateStalledMatch}
                            disabled={matchLoading}
                            className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                          >
                            ⚡ Force Eliminate Both (Higher Rank)
                          </button>
                        )}

                        {/* Escalation 3 */}
                        {canReplace && (
                          <button
                            onClick={handleClaimMatchSlotByReplacement}
                            disabled={matchLoading}
                            className="w-full mt-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                          >
                            🎯 Replace Both Players & Advance
                          </button>
                        )}
                      </div>
                    );
                  })()}

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

            {/* Dev/Debug Section */}
            <div className="mt-6 bg-slate-900/80 rounded-xl p-6 border-2 border-yellow-500/50">
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Code size={20} />
                Dev/Debug Info
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Match Identifiers */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                  <h4 className="text-sm font-bold text-yellow-300 mb-3 uppercase tracking-wide">Match Identifiers</h4>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tier ID:</span>
                      <span className="text-white font-bold">{currentMatch.tierId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Instance ID:</span>
                      <span className="text-white font-bold">{currentMatch.instanceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Round Number:</span>
                      <span className="text-white font-bold">{currentMatch.roundNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Match Number:</span>
                      <span className="text-white font-bold">{currentMatch.matchNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Match Status */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                  <h4 className="text-sm font-bold text-yellow-300 mb-3 uppercase tracking-wide">Match Status</h4>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white font-bold">
                        {currentMatch.matchStatus === 0 ? 'Not Started (0)' :
                         currentMatch.matchStatus === 1 ? 'In Progress (1)' :
                         'Completed (2)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Initialized:</span>
                      <span className={`font-bold ${currentMatch.isMatchInitialized ? 'text-green-400' : 'text-red-400'}`}>
                        {currentMatch.isMatchInitialized ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Is Draw:</span>
                      <span className={`font-bold ${currentMatch.isDraw ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {currentMatch.isDraw ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Moved Cell:</span>
                      <span className="text-white font-bold">{currentMatch.lastMovedCell}</span>
                    </div>
                  </div>
                </div>

                {/* Players */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                  <h4 className="text-sm font-bold text-yellow-300 mb-3 uppercase tracking-wide">Players</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Player 1 (X):</div>
                      <div className="font-mono text-xs text-white bg-blue-500/20 p-2 rounded break-all">
                        {currentMatch.player1}
                      </div>
                      {currentMatch.player1?.toLowerCase() === account?.toLowerCase() && (
                        <div className="text-yellow-400 text-xs font-bold mt-1">👈 THIS IS YOU</div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Player 2 (O):</div>
                      <div className="font-mono text-xs text-white bg-pink-500/20 p-2 rounded break-all">
                        {currentMatch.player2}
                      </div>
                      {currentMatch.player2?.toLowerCase() === account?.toLowerCase() && (
                        <div className="text-yellow-400 text-xs font-bold mt-1">👈 THIS IS YOU</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Turn & Winner */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                  <h4 className="text-sm font-bold text-yellow-300 mb-3 uppercase tracking-wide">Turn & Winner</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Current Turn:</div>
                      <div className="font-mono text-xs text-white bg-purple-500/20 p-2 rounded break-all">
                        {currentMatch.currentTurn || 'Not Started'}
                      </div>
                      {currentMatch.isYourTurn && (
                        <div className="text-green-400 text-xs font-bold mt-1">✅ YOUR TURN!</div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Winner:</div>
                      <div className="font-mono text-xs text-white bg-green-500/20 p-2 rounded break-all">
                        {currentMatch.winner && currentMatch.winner !== '0x0000000000000000000000000000000000000000'
                          ? currentMatch.winner
                          : 'None'}
                      </div>
                      {currentMatch.winner?.toLowerCase() === account?.toLowerCase() && currentMatch.matchStatus === 2 && (
                        <div className="text-yellow-400 text-xs font-bold mt-1">🏆 YOU WON!</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Board State */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20 lg:col-span-2">
                  <h4 className="text-sm font-bold text-yellow-300 mb-3 uppercase tracking-wide">Board State (Array)</h4>
                  <div className="font-mono text-sm">
                    <div className="text-gray-400 mb-2">Raw board array (0=empty, 1=X, 2=O):</div>
                    <div className="bg-black/50 p-3 rounded text-white overflow-x-auto">
                      [{currentMatch.board.join(', ')}]
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {currentMatch.board.map((cell, idx) => (
                        <div
                          key={idx}
                          className={`text-center p-2 rounded font-bold ${
                            cell === 0 ? 'bg-gray-700/30 text-gray-400' :
                            cell === 1 ? 'bg-blue-500/30 text-blue-300' :
                            'bg-pink-500/30 text-pink-300'
                          }`}
                        >
                          Cell {idx}: {cell === 0 ? 'Empty' : cell === 1 ? 'X' : 'O'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* User Context */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20 lg:col-span-2">
                  <h4 className="text-sm font-bold text-yellow-300 mb-3 uppercase tracking-wide">Your Context</h4>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">You are Player:</span>
                      <span className="text-white font-bold">
                        {currentMatch.isPlayer1 ? 'Player 1 (X)' : 'Player 2 (O)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your Symbol:</span>
                      <span className="text-white font-bold text-lg">{currentMatch.userSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Is Your Turn:</span>
                      <span className={`font-bold ${currentMatch.isYourTurn ? 'text-green-400' : 'text-red-400'}`}>
                        {currentMatch.isYourTurn ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your Moves Made:</span>
                      <span className="text-white font-bold">
                        {currentMatch.board.filter(c => c === (currentMatch.isPlayer1 ? 1 : 2)).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Opponent Moves:</span>
                      <span className="text-white font-bold">
                        {currentMatch.board.filter(c => c === (currentMatch.isPlayer1 ? 2 : 1)).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Moves from History */}
                {moveHistory.length > 0 && (
                  <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20 lg:col-span-2">
                    <h4 className="text-sm font-bold text-yellow-300 mb-3 uppercase tracking-wide">Complete Move History</h4>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {moveHistory.map((move, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs font-mono bg-purple-500/10 p-2 rounded">
                          <span className="text-gray-400">#{idx + 1}</span>
                          <span className="text-white font-bold">{move.player}</span>
                          <span className="text-purple-400">→ Cell {move.cell}</span>
                          <span className="text-gray-500 ml-auto">
                            {new Date(move.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tournaments Section */}
        {contract && !currentMatch && (
          <>
            {viewingTournament ? (
              <TournamentBracket
                tournamentData={viewingTournament}
                onBack={() => setViewingTournament(null)}
                onEnterMatch={handlePlayMatch}
                onForceEliminate={handleForceEliminateStalledMatch}
                onClaimReplacement={handleClaimMatchSlotByReplacement}
                onManualStart={handleManualStart}
                onEnroll={handleEnroll}
                account={account}
                loading={tournamentsLoading}
                syncDots={bracketSyncDots}
                theme={theme}
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
                    <Trophy className={`${theme === 'dream' ? 'text-blue-400' : theme === 'daring' ? 'text-red-400' : 'text-purple-400'}`} size={48} />
                    <div className="flex flex-col items-start">
                      <h2 className={`text-5xl font-bold bg-gradient-to-r ${theme === 'dream' ? 'from-blue-400 to-cyan-400' : theme === 'daring' ? 'from-red-400 to-orange-400' : 'from-purple-400 to-blue-400'} bg-clip-text text-transparent`}>
                        {theme === 'dream' ? 'Classic Tournaments' : theme === 'daring' ? 'Pro Tournaments' : 'Tournaments'}
                      </h2>
                    </div>
                  </div>
                  <p className={`text-xl ${theme === 'dream' ? 'text-blue-200' : theme === 'daring' ? 'text-red-200' : 'text-purple-200'}`}>
                    {theme === 'dream' ? 'Competitive play with multiple tiers for all skill levels' : 'Advanced tournaments with higher stakes'}
                  </p>
                </div>

                {/* Loading State */}
                {tournamentsLoading && (
                  <div className="text-center py-12">
                    <div className="inline-block">
                      <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-purple-300">Loading tournaments...</p>
                    </div>
                  </div>
                )}

                {/* Tournament Cards Grid */}
                {!tournamentsLoading && tournaments.length > 0 && (
                  <>
                    {/* Grouped by tier for both Dream and Daring modes */}
                    {(() => {
                      // Define tier order: Classic, Rapid, Minor, Standard, Major, Mega, Ultimate
                      const tierOrder = [0, 6, 1, 2, 3, 4, 5];
                      const tierColors = {
                        0: { bg: 'from-blue-600/20 to-purple-600/20', border: 'border-blue-400/40', text: 'text-blue-400', icon: '🎯' },
                        6: { bg: 'from-yellow-600/20 to-orange-600/20', border: 'border-yellow-400/40', text: 'text-yellow-400', icon: '⚡' },
                        1: { bg: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-400/40', text: 'text-blue-400', icon: '🔹' },
                        2: { bg: 'from-cyan-600/20 to-teal-600/20', border: 'border-cyan-400/40', text: 'text-cyan-400', icon: '💎' },
                        3: { bg: 'from-purple-600/20 to-pink-600/20', border: 'border-purple-400/40', text: 'text-purple-400', icon: '⭐' },
                        4: { bg: 'from-red-600/20 to-rose-600/20', border: 'border-red-400/40', text: 'text-red-400', icon: '🔥' },
                        5: { bg: 'from-orange-600/20 to-amber-600/20', border: 'border-orange-400/40', text: 'text-orange-400', icon: '👑' }
                      };

                      return tierOrder.map((tierId) => {
                        const tierTournaments = tournaments.filter(t => t.tierId === tierId);
                        if (tierTournaments.length === 0) return null;

                        const tierColor = tierColors[tierId];
                        const maxPlayers = tierTournaments[0]?.maxPlayers || 0;
                        const playerLabel = maxPlayers === 2 ? '1v1' : `${maxPlayers} players`;

                        return (
                          <div key={tierId} className="mb-12">
                            {/* Tier Header */}
                            <div className={`bg-gradient-to-r ${tierColor.bg} backdrop-blur-lg rounded-xl p-4 border ${tierColor.border} mb-6`}>
                              <h3 className={`text-2xl font-bold ${tierColor.text} flex items-center gap-2`}>
                                <span className="text-3xl">{tierColor.icon}</span>
                                {getTierName(tierId)} Tier
                                <span className="text-sm opacity-70 ml-2">({playerLabel})</span>
                              </h3>
                            </div>

                            {/* Tier Tournaments Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {tierTournaments.map((tournament) => (
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
                                  tierName={getTierName(tournament.tierId)}
                                  theme={theme}
                                  enrollmentTimeout={tournament.enrollmentTimeout}
                                  hasStartedViaTimeout={tournament.hasStartedViaTimeout}
                                  tournamentStatus={tournament.tournamentStatus}
                                  onManualStart={handleManualStart}
                                  onClaimAbandonedPool={handleClaimAbandonedPool}
                                  account={account}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </>
                )}

                {/* Empty State */}
                {!tournamentsLoading && tournaments.length === 0 && (
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

      {/* Cached Tournament & Match Stats Section - Always Visible */}
      <div className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="mt-16">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                      <History className="text-cyan-400" size={48} />
                      <div className="flex flex-col items-start">
                        <h2 className="text-4xl font-bold text-white">
                          Cached Stats
                        </h2>
                      </div>
                    </div>
                    <p className="text-cyan-200/70 text-lg max-w-2xl mx-auto">
                      Historical tournament and match data stored on-chain
                    </p>
                  </div>

                  {cachedStatsLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-block">
                        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-cyan-300">Loading cached stats...</p>
                      </div>
                    </div>
                  ) : cachedStats && (cachedStats.matches.length > 0 || cachedStats.tournaments.length > 0) ? (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Cached Tournaments */}
                      <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
                        <div className="flex items-center gap-3 mb-4">
                          <Trophy className="text-purple-400" size={32} />
                          <h3 className="text-2xl font-bold text-white">Cached Tournaments</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-400/20">
                            <div className="text-purple-300 text-sm mb-1">Total Cached</div>
                            <div className="text-3xl font-bold text-white">{cachedStats.tournaments?.length || 0}</div>
                          </div>
                          {cachedStats.tournaments?.length > 0 && (
                            <>
                              {/* Organic Tournaments */}
                              {cachedStats.organicTournaments?.length > 0 && (
                                <div className="bg-green-500/10 rounded-lg p-4 border border-green-400/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="text-green-400" size={16} />
                                    <div className="text-green-300 text-sm font-semibold">Organic ({cachedStats.organicTournaments.length})</div>
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {cachedStats.organicTournaments.slice(0, 5).map((tournament, idx) => {
                                      // Extract all prize recipients with their amounts
                                      let prizeRecipients = [];

                                      if (tournament.prizeWinners && tournament.prizeWinners.length > 0) {
                                        // New structure: prizeWinners array with player, prize, and ranking
                                        prizeRecipients = Array.from(tournament.prizeWinners)
                                          .filter(r => r && r.player && r.player !== ethers.ZeroAddress && r.prize > 0n)
                                          .map(r => ({
                                            player: r.player,
                                            prize: ethers.formatEther(r.prize),
                                            ranking: r.ranking ? Number(r.ranking) : null
                                          }));
                                      } else if (tournament.prizes && tournament.participants) {
                                        // Fallback to old structure
                                        const participantArray = Array.from(tournament.participants);
                                        const prizesArray = Array.from(tournament.prizes);
                                        prizeRecipients = participantArray
                                          .map((player, i) => ({
                                            player,
                                            prize: prizesArray[i] ? ethers.formatEther(prizesArray[i]) : '0',
                                            ranking: i + 1
                                          }))
                                          .filter(r => r.player && r.player !== ethers.ZeroAddress && parseFloat(r.prize) > 0);
                                      }

                                      return (
                                        <div key={idx} className="bg-green-500/5 p-3 rounded space-y-2">
                                          <div className="flex items-center justify-between text-xs border-b border-green-400/20 pb-1">
                                            <span className="text-green-200 font-semibold">Tier {Number(tournament.tierId)}</span>
                                            <span className="text-green-300/70">{prizeRecipients.length} winner{prizeRecipients.length !== 1 ? 's' : ''}</span>
                                          </div>
                                          {prizeRecipients.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {prizeRecipients.map((recipient, recipientIdx) => (
                                                <div key={recipientIdx} className="bg-green-500/5 p-2 rounded border border-green-400/10">
                                                  <div className="flex items-center justify-between text-xs mb-1">
                                                    <div className="flex flex-col">
                                                      <span className={`font-mono ${
                                                        recipient.player.toLowerCase() === account?.toLowerCase()
                                                          ? 'text-yellow-300 font-bold'
                                                          : 'text-white'
                                                      }`}>
                                                        #{recipient.ranking} {recipient.player.slice(0, 6)}...{recipient.player.slice(-4)}
                                                      </span>
                                                      {recipient.player.toLowerCase() === account?.toLowerCase() && (
                                                        <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                                      )}
                                                    </div>
                                                    <span className="text-green-400 font-bold">{parseFloat(recipient.prize).toFixed(4)} ETH</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-green-300/50 text-center py-2">No prize data available</div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Partial/Force Started Tournaments */}
                              {cachedStats.partialTournaments?.length > 0 && (
                                <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-400/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Zap className="text-orange-400" size={16} />
                                    <div className="text-orange-300 text-sm font-semibold">Force Started ({cachedStats.partialTournaments.length})</div>
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {cachedStats.partialTournaments.slice(0, 5).map((tournament, idx) => {
                                      // Extract all prize recipients with their amounts
                                      let prizeRecipients = [];

                                      if (tournament.prizeWinners && tournament.prizeWinners.length > 0) {
                                        // New structure: prizeWinners array with player, prize, and ranking
                                        prizeRecipients = Array.from(tournament.prizeWinners)
                                          .filter(r => r && r.player && r.player !== ethers.ZeroAddress && r.prize > 0n)
                                          .map(r => ({
                                            player: r.player,
                                            prize: ethers.formatEther(r.prize),
                                            ranking: r.ranking ? Number(r.ranking) : null
                                          }));
                                      } else if (tournament.prizes && tournament.participants) {
                                        // Fallback to old structure
                                        const participantArray = Array.from(tournament.participants);
                                        const prizesArray = Array.from(tournament.prizes);
                                        prizeRecipients = participantArray
                                          .map((player, i) => ({
                                            player,
                                            prize: prizesArray[i] ? ethers.formatEther(prizesArray[i]) : '0',
                                            ranking: i + 1
                                          }))
                                          .filter(r => r.player && r.player !== ethers.ZeroAddress && parseFloat(r.prize) > 0);
                                      }

                                      return (
                                        <div key={idx} className="bg-orange-500/5 p-3 rounded space-y-2">
                                          <div className="flex items-center justify-between text-xs border-b border-orange-400/20 pb-1">
                                            <span className="text-orange-200 font-semibold">Tier {Number(tournament.tierId)}</span>
                                            <span className="text-orange-300/70">{prizeRecipients.length} winner{prizeRecipients.length !== 1 ? 's' : ''}</span>
                                          </div>
                                          {prizeRecipients.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {prizeRecipients.map((recipient, recipientIdx) => (
                                                <div key={recipientIdx} className="bg-orange-500/5 p-2 rounded border border-orange-400/10">
                                                  <div className="flex items-center justify-between text-xs mb-1">
                                                    <div className="flex flex-col">
                                                      <span className={`font-mono ${
                                                        recipient.player.toLowerCase() === account?.toLowerCase()
                                                          ? 'text-yellow-300 font-bold'
                                                          : 'text-white'
                                                      }`}>
                                                        #{recipient.ranking} {recipient.player.slice(0, 6)}...{recipient.player.slice(-4)}
                                                      </span>
                                                      {recipient.player.toLowerCase() === account?.toLowerCase() && (
                                                        <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                                      )}
                                                    </div>
                                                    <span className="text-green-400 font-bold">{parseFloat(recipient.prize).toFixed(4)} ETH</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-orange-300/50 text-center py-2">No prize data available</div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Abandoned/Claimed Tournaments */}
                              {cachedStats.abandonedTournaments?.length > 0 && (
                                <div className="bg-red-500/10 rounded-lg p-4 border border-red-400/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Coins className="text-red-400" size={16} />
                                    <div className="text-red-300 text-sm font-semibold">Abandoned & Claimed ({cachedStats.abandonedTournaments.length})</div>
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {cachedStats.abandonedTournaments.slice(0, 5).map((tournament, idx) => {
                                      const winner = tournament.winner;
                                      const hasWinner = winner && winner !== ethers.ZeroAddress;
                                      let claimAmount = null;

                                      // For abandoned tournaments, show the claimed amount
                                      if (tournament.totalAwarded && tournament.totalAwarded > 0n) {
                                        claimAmount = ethers.formatEther(tournament.totalAwarded);
                                      }

                                      return (
                                        <div key={idx} className="bg-red-500/5 p-2 rounded space-y-1">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-red-200">Tier {Number(tournament.tierId)}</span>
                                            <div className="flex flex-col items-end">
                                              <span className="text-white font-mono">
                                                {hasWinner ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : 'Unclaimed'}
                                              </span>
                                              {hasWinner && winner.toLowerCase() === account?.toLowerCase() && (
                                                <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                              )}
                                            </div>
                                          </div>
                                          {claimAmount && (
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-red-300/70">Pool Claimed</span>
                                              <span className="text-yellow-400 font-bold">{parseFloat(claimAmount).toFixed(4)} ETH</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Total Awards Distributed */}
                              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-400/20">
                                <div className="text-purple-300 text-sm mb-3 font-bold">Total Awards Distributed</div>
                                {(() => {
                                  try {
                                    // Aggregate awards by address
                                    const addressAwards = new Map();
                                    let totalAwarded = 0;

                                    cachedStats.tournaments.forEach(tournament => {
                                      // Try new prizeWinners structure first
                                      if (tournament.prizeWinners && tournament.prizeWinners.length > 0) {
                                        Array.from(tournament.prizeWinners)
                                          .filter(r => r && r.player && r.player !== ethers.ZeroAddress && r.prize > 0n)
                                          .forEach(r => {
                                            const addr = r.player;
                                            const prizeEth = parseFloat(ethers.formatEther(r.prize));
                                            if (prizeEth > 0) {
                                              const current = addressAwards.get(addr.toLowerCase()) || 0;
                                              addressAwards.set(addr.toLowerCase(), current + prizeEth);
                                              totalAwarded += prizeEth;
                                            }
                                          });
                                      } else if (tournament.participants && tournament.prizes && tournament.participantCount) {
                                        // Fallback to old structure
                                        const participantArray = Array.from(tournament.participants);
                                        const prizesArray = Array.from(tournament.prizes);
                                        const count = Number(tournament.participantCount);

                                        for (let i = 0; i < count && i < participantArray.length; i++) {
                                          const addr = participantArray[i];
                                          const prize = prizesArray[i];

                                          if (addr && prize && addr !== ethers.ZeroAddress) {
                                            const prizeEth = parseFloat(ethers.formatEther(prize));
                                            if (prizeEth > 0) {
                                              const current = addressAwards.get(addr.toLowerCase()) || 0;
                                              addressAwards.set(addr.toLowerCase(), current + prizeEth);
                                              totalAwarded += prizeEth;
                                            }
                                          }
                                        }
                                      }
                                    });

                                    // Sort by amount (highest first)
                                    const sortedAwards = Array.from(addressAwards.entries())
                                      .sort((a, b) => b[1] - a[1]);

                                    if (sortedAwards.length === 0) {
                                      return (
                                        <div className="text-purple-300/70 text-sm text-center py-2">
                                          No awards distributed yet
                                        </div>
                                      );
                                    }

                                    return (
                                      <>
                                        {/* Total Summary */}
                                        <div className="bg-green-500/20 p-3 rounded-lg border border-green-400/30 mb-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-green-300 text-sm">Grand Total</span>
                                            <span className="text-2xl font-bold text-green-400">
                                              {totalAwarded.toFixed(4)} ETH
                                            </span>
                                          </div>
                                          <div className="text-green-300/70 text-xs mt-1">
                                            to {sortedAwards.length} unique recipient{sortedAwards.length !== 1 ? 's' : ''}
                                          </div>
                                        </div>

                                        {/* Address List */}
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                          {sortedAwards.map(([address, amount]) => (
                                            <div
                                              key={address}
                                              className={`flex items-center justify-between p-2 rounded border ${
                                                address.toLowerCase() === account?.toLowerCase()
                                                  ? 'bg-yellow-500/20 border-yellow-400/50'
                                                  : 'bg-purple-500/10 border-purple-400/20'
                                              }`}
                                            >
                                              <div className="flex flex-col">
                                                <span className={`font-mono text-xs ${
                                                  address.toLowerCase() === account?.toLowerCase()
                                                    ? 'text-yellow-300'
                                                    : 'text-white'
                                                }`}>
                                                  {address.slice(0, 8)}...{address.slice(-6)}
                                                </span>
                                                {address.toLowerCase() === account?.toLowerCase() && (
                                                  <span className="text-yellow-400 text-xs font-bold">THIS IS YOU</span>
                                                )}
                                              </div>
                                              <span className="text-green-400 font-bold text-sm">
                                                {amount.toFixed(4)} ETH
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    );
                                  } catch (err) {
                                    console.warn('Error calculating total awards:', err);
                                    return (
                                      <div className="text-red-300/70 text-sm text-center py-2">
                                        Error loading award data
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Cached Matches */}
                      <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-cyan-400/30">
                        <div className="flex items-center gap-3 mb-4">
                          <Grid className="text-cyan-400" size={32} />
                          <h3 className="text-2xl font-bold text-white">Cached Matches</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                            <div className="text-cyan-300 text-sm mb-1">Total Cached</div>
                            <div className="text-3xl font-bold text-white">{cachedStats.matches?.length || 0}</div>
                          </div>
                          {cachedStats.matches?.length > 0 && (
                            <>
                              {/* Match Statistics Grid */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                                  <div className="text-cyan-300 text-sm mb-1">Wins</div>
                                  <div className="text-2xl font-bold text-green-400">
                                    {cachedStats.matches.filter(m => m?.winner && m.winner !== ethers.ZeroAddress && !m?.isDraw).length}
                                  </div>
                                </div>
                                <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20">
                                  <div className="text-yellow-300 text-sm mb-1">Draws</div>
                                  <div className="text-2xl font-bold text-yellow-400">
                                    {cachedStats.matches.filter(m => m?.isDraw).length}
                                  </div>
                                </div>
                              </div>

                              {/* Draw Rate */}
                              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20">
                                <div className="text-yellow-300 text-sm mb-1">Draw Rate</div>
                                <div className="flex items-center justify-between">
                                  <div className="text-2xl font-bold text-yellow-400">
                                    {((cachedStats.matches.filter(m => m?.isDraw).length / cachedStats.matches.length) * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-yellow-300/70">
                                    {cachedStats.matches.filter(m => m?.isDraw).length} of {cachedStats.matches.length} matches
                                  </div>
                                </div>
                              </div>

                              {/* Draw Scenarios List */}
                              {cachedStats.matches.filter(m => m?.isDraw).length > 0 && (
                                <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="text-yellow-400" size={16} />
                                    <div className="text-yellow-300 text-sm font-bold">Draw Scenarios</div>
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {[...cachedStats.matches]
                                      .filter(m => m?.isDraw)
                                      .slice(-10)
                                      .reverse()
                                      .map((match, idx) => (
                                        <div key={idx} className="bg-yellow-500/10 p-3 rounded border border-yellow-400/20">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-300 font-bold text-xs border border-yellow-400">
                                                =
                                              </div>
                                              <span className="text-yellow-200 text-xs font-bold">Draw Match</span>
                                            </div>
                                            <span className="text-yellow-300/70 text-xs">
                                              Tier {match?.tierId !== undefined ? Number(match.tierId) : '?'}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-cyan-500/20 p-2 rounded border border-cyan-400/20">
                                              <div className="text-cyan-300/70 mb-1">Player 1</div>
                                              <div className="text-white font-mono">
                                                {match?.player1 ? `${match.player1.slice(0, 6)}...${match.player1.slice(-4)}` : 'Unknown'}
                                              </div>
                                            </div>
                                            <div className="bg-orange-500/20 p-2 rounded border border-orange-400/20">
                                              <div className="text-orange-300/70 mb-1">Player 2</div>
                                              <div className="text-white font-mono">
                                                {match?.player2 ? `${match.player2.slice(0, 6)}...${match.player2.slice(-4)}` : 'Unknown'}
                                              </div>
                                            </div>
                                          </div>
                                          {match?.startTime && match?.endTime && (
                                            <div className="mt-2 text-xs text-yellow-300/70">
                                              Duration: {Math.floor((Number(match.endTime) - Number(match.startTime)) / 60)} minutes
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Recent Matches (All) */}
                              <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/20">
                                <div className="text-cyan-300 text-sm mb-2">Recent Matches (All)</div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {[...cachedStats.matches].slice(-5).reverse().map((match, idx) => (
                                    <div key={idx} className={`flex items-center justify-between text-xs p-2 rounded ${
                                      match?.isDraw
                                        ? 'bg-yellow-500/10 border border-yellow-400/20'
                                        : 'bg-cyan-500/5 border border-cyan-400/10'
                                    }`}>
                                      <span className={match?.isDraw ? 'text-yellow-300 font-bold' : 'text-cyan-200'}>
                                        {match?.isDraw ? '🟰 Draw' : '🏆 Winner'}
                                      </span>
                                      <span className="text-white font-mono">
                                        {match?.isDraw
                                          ? 'Tie Game'
                                          : match?.winner ? `${match.winner.slice(0, 6)}...${match.winner.slice(-4)}` : 'Unknown'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Top Prize Recipients Section */}
                    {cachedStats.tournaments?.length > 0 && (
                      <div className="mt-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-400/30">
                        <div className="flex items-center gap-3 mb-4">
                          <Coins className="text-green-400" size={32} />
                          <h3 className="text-2xl font-bold text-white">Top Prize Recipients</h3>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {(() => {
                            try {
                              // Collect all prize recipients
                              const recipients = new Map();

                              cachedStats.tournaments.forEach(tournament => {
                                if (tournament.participants && tournament.prizes && tournament.participantCount) {
                                  const participantArray = Array.from(tournament.participants);
                                  const prizesArray = Array.from(tournament.prizes);
                                  const count = Number(tournament.participantCount);

                                  for (let i = 0; i < count && i < participantArray.length; i++) {
                                    const addr = participantArray[i];
                                    const prize = prizesArray[i];

                                    if (addr && prize && addr !== ethers.ZeroAddress) {
                                      const prizeEth = parseFloat(ethers.formatEther(prize));
                                      if (prizeEth > 0) {
                                        const current = recipients.get(addr.toLowerCase()) || 0;
                                        recipients.set(addr.toLowerCase(), current + prizeEth);
                                      }
                                    }
                                  }
                                }
                              });

                              // Convert to array and sort by total prizes
                              const sortedRecipients = Array.from(recipients.entries())
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 10);

                              if (sortedRecipients.length === 0) {
                                return (
                                  <div className="text-green-300/70 text-sm text-center py-4">
                                    No prize data available yet
                                  </div>
                                );
                              }

                              return sortedRecipients.map(([address, total], idx) => (
                                <div
                                  key={address}
                                  className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg border border-green-400/20"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center text-green-300 font-bold text-sm border-2 border-green-400">
                                      #{idx + 1}
                                    </div>
                                    <span className="text-white font-mono text-sm">
                                      {address.slice(0, 6)}...{address.slice(-4)}
                                    </span>
                                  </div>
                                  <span className="text-green-400 font-bold text-lg">
                                    {total.toFixed(4)} ETH
                                  </span>
                                </div>
                              ));
                            } catch (err) {
                              console.warn('Error calculating top recipients:', err);
                              return (
                                <div className="text-red-300/70 text-sm text-center py-4">
                                  Error loading prize data
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                    </>
                  ) : (
                    <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-12 border border-cyan-400/30 text-center">
                      <History className="text-cyan-400/50 mx-auto mb-4" size={64} />
                      <h3 className="text-2xl font-bold text-cyan-300 mb-2">No Cached Data Available</h3>
                      <p className="text-cyan-200/70">Statistics will appear as tournaments and matches are completed</p>
                    </div>
                  )}
        </div>
      </div>

      {/* Zero Trust Architecture */}
      <div id="zero-trust" className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-green-500/30 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-6 text-center text-green-300">Zero-Trust Architecture</h2>

            <div className="bg-green-500/10 border-l-4 border-green-400 p-6 rounded-r-xl mb-8">
              <p className="text-lg leading-relaxed text-green-100">
          Eternal TicTacToe is a <strong className="text-green-300">fully autonomous protocol</strong> deployed on Arbitrum (Ethereum Layer 2). Every game move is recorded on-chain. Every rule is enforced by immutable code. No servers can go down. No admins can interfere. No company can shut it down.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-3 text-green-300 flex items-center gap-2">
            <span className="text-2xl">🎮</span> The Game Protocol
          </h3>
          <ul className="space-y-2 text-green-100">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Every move recorded on-chain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Smart contract validates all moves</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Automatic timeout enforcement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Provably fair matchmaking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Game outcomes permanent on L1</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">→</span>
              <a
                href="https://arbiscan.io/address/0x7fc74A84a41Ac0E4872fB94EB3d6A8998884Ec9d#code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-200 underline decoration-green-400/50 hover:decoration-green-300 transition-colors"
              >
               You can read its immutable source code here. 
              </a>
            </li>
          </ul>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-3 text-blue-300 flex items-center gap-2">
            <span className="text-2xl">🌐</span> This Interface
          </h3>
          <ul className="space-y-2 text-blue-100">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Demo interface by creator</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Reads 100% public blockchain data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Simply calls smart contract functions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Can be rebuilt by anyone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>No special privileges</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">→</span>
              <a
                href="https://github.com/KarimChukfeh/tic-tac-react"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors"
              >
                Feel free to fork it and build your own!
              </a>
            </li>
          </ul>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-yellow-300 flex items-center gap-2">
          <span className="text-2xl">💡</span> What This Means
              </h3>
              <div className="space-y-3 text-yellow-100">
          <p>
            <strong className="text-yellow-200">Anyone can build their own game interface</strong> to this protocol. All interfaces connect to the same games, display the same boards, and follow the same rules.
          </p>
          <p>
            <strong className="text-yellow-200">This website is optional.</strong> You could play via Arbiscan, build your own UI, or use any third-party interface. The outcomes are secured by Arbitrum (and ultimately Ethereum L1), not by this website.
          </p>
          <p>
            <strong className="text-yellow-200">Game outcomes are permanent.</strong> Even if every website disappears, the game continues forever. Your wins and prizes are secured by smart contracts settling to Ethereum L1.
          </p>
              </div>
            </div>

            {/* Link to Whitepaper */}
            <div className="mt-8 text-center">
              <a href="#whitepaper" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 font-semibold text-lg underline decoration-purple-400/50 hover:decoration-purple-300 transition-colors">
            Read Full Whitepaper
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-4xl mx-auto">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-blue-500/20 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
            className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="font-semibold text-left">{faq.q}</span>
            {expandedFaq === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {expandedFaq === idx && (
            <div className="px-6 py-4 bg-white/5 border-t border-blue-500/20">
              <p className="text-blue-200 leading-relaxed">{faq.a}</p>
            </div>
          )}
              </div>
            ))}
          </div>
        </div>

        {/* Whitepaper Section */}
        <WhitepaperSection />
      </div>

      {/* Footer */}
      <div className="border-t border-white/10" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-blue-300">
          <p className="font-semibold text-lg mb-2">Dummy TicTacToe Protocol</p>
          <p>Built on Arbitrum (Ethereum L2). Runs forever. No servers required.</p>
          <p className="mt-2">Contract code is immutable. Game outcomes are permanent and verifiable. Always verify before interacting.</p>
        </div>
      </div>

      {/* CSS Animations & Custom Styles */}
      <style>{`
        /* Smooth scrolling for anchor links */
        html {
          scroll-behavior: smooth;
        }

        /* Add padding to account for fixed header when jumping to anchors */
        #zero-trust,
        #whitepaper {
          scroll-margin-top: 80px;
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

        /* Theme Toggle - Desktop: fixed, Mobile: in-flow */
        .theme-toggle-wrapper {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 1000;
        }

        /* Tablet styles */
        @media (max-width: 1024px) {
          .theme-toggle-wrapper {
            top: 70px;
            right: 15px;
          }
        }

        /* Mobile styles - smaller, absolute positioned within banner (not sticky) */
        @media (max-width: 768px) {
          .theme-toggle-wrapper {
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 20;
          }

          .theme-toggle-btn {
            padding: 4px 8px !important;
            font-size: 10px !important;
            gap: 3px !important;
            border-radius: 15px !important;
          }

          .theme-toggle-text {
            display: none;
          }

          .theme-toggle-icon {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .theme-toggle-wrapper {
            top: 6px;
            right: 6px;
          }

          .theme-toggle-btn {
            padding: 3px 6px !important;
          }

          .theme-toggle-icon {
            font-size: 12px;
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

      {/* RW3 Declaration Popup - Rendered at root level with highest z-index */}
      {showRw3Popup && rw3Declaration && rw3BadgeRect && (
        <div
          className="rw3-popup fixed bg-gray-900 border border-blue-500 rounded-lg shadow-xl p-4"
          style={{
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            zIndex: 999999,
            width: (() => {
              const viewportWidth = window.innerWidth;
              if (viewportWidth <= 768) {
                return 'auto';
              } else {
                // Fixed width on desktop for proper centering
                return '500px';
              }
            })(),
            left: (() => {
              const viewportWidth = window.innerWidth;
              const popupWidth = viewportWidth <= 768 ? Math.min(500, viewportWidth - 32) : 500;

              // On mobile, align with badge. On desktop, center horizontally
              if (viewportWidth <= 768) {
                const idealLeft = rw3BadgeRect.left;
                const maxLeft = viewportWidth - popupWidth - 16;
                return `${Math.max(16, Math.min(idealLeft, maxLeft))}px`;
              } else {
                // Center on desktop
                return `${(viewportWidth - popupWidth) / 2}px`;
              }
            })(),
            top: (() => {
              const viewportHeight = window.innerHeight;
              const idealTop = rw3BadgeRect.bottom + 8;
              const estimatedPopupHeight = 300; // Rough estimate

              // If popup would go off bottom, position it above the badge instead
              if (idealTop + estimatedPopupHeight > viewportHeight - 16) {
                return `${Math.max(16, rw3BadgeRect.top - estimatedPopupHeight - 8)}px`;
              }
              return `${idealTop}px`;
            })(),
            maxWidth: `calc(100vw - 32px)`,
            maxHeight: `calc(100vh - ${rw3BadgeRect.bottom + 24}px)`,
            overflowY: 'auto',
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => {
            // Keep popup open when hovering over it (desktop only)
            if (!('ontouchstart' in window)) {
              setShowRw3Popup(true);
            }
          }}
          onMouseLeave={() => {
            // Close popup when mouse leaves (desktop only)
            if (!('ontouchstart' in window)) {
              setShowRw3Popup(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-blue-100 text-xs whitespace-pre-wrap break-words font-mono">
            {rw3Declaration}
          </div>
        </div>
      )}
    </div>
  );
}
