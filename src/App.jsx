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
import {
  Wallet, Grid, Swords, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Play, Users, DollarSign, Zap, TrendingUp, History,
  Award, Target, CheckCircle, Info, Coins, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { ethers } from 'ethers';
import DUMMY_ABI from './TourABI.json';

// Particle Background Component (Dream/Daring Themes)
const ParticleBackground = ({ colors }) => {
  const particles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => {
      const useFirstColor = Math.random() > 0.5;
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 15,
        duration: 20 + Math.random() * 20,
        colorIndex: useFirstColor ? 0 : 1,
        symbol: useFirstColor ? 'X' : 'O'
      };
    }), []
  );

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {particles.map(p => {
        const color = colors[p.colorIndex];
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              animation: `particle-float ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
              willChange: 'transform, opacity',
              color: color,
              fontSize: '12px',
              fontWeight: 'bold',
              opacity: 0.4,
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
      winnerPayout: (potValue * 0.95).toFixed(6),
      houseFee: (potValue * 0.05).toFixed(6)
    };
  }
};

// Prize Distribution Component
const PrizeDistribution = ({ pot, winner, winnerAddress }) => {
  const isDraw = winner === 'draw';
  const prizes = calculatePrizes(pot, isDraw);

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
          <span className="text-green-200">Winner Payout (95%)</span>
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
        <div className="flex justify-between items-center bg-purple-500/20 rounded-lg p-3 border-2 border-purple-400/50">
          <span className="text-purple-200 font-bold">Total Pot</span>
          <span className="text-purple-300 font-bold text-xl">{pot} ETH</span>
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
  loading
}) => {
  const isFull = currentEnrolled >= maxPlayers;
  const enrollmentPercentage = (currentEnrolled / maxPlayers) * 100;

  return (
    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-purple-400/40 hover:border-purple-400/70 transition-all hover:shadow-xl hover:shadow-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="text-purple-400" size={24} />
          <h3 className="text-xl font-bold text-white">
            Tier {tierId} • #{instanceId}
          </h3>
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
            <Users className="text-purple-300" size={16} />
            <span className="text-purple-300 text-xs font-semibold">Players</span>
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
        <div className="flex justify-between text-xs text-purple-300 mb-1">
          <span>Enrollment</span>
          <span>{enrollmentPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${enrollmentPercentage}%` }}
          />
        </div>
      </div>

      {/* Action Button */}
      {isEnrolled ? (
        <button
          onClick={onEnter}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          <Play size={18} />
          {loading ? 'Loading...' : 'Enter Tournament'}
        </button>
      ) : (
        <button
          onClick={onEnroll}
          disabled={loading || isFull}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          <Trophy size={18} />
          {loading ? 'Enrolling...' : isFull ? 'Tournament Full' : 'Enroll Now'}
        </button>
      )}
    </div>
  );
};

// Tournament Bracket Component
const TournamentBracket = ({ tournamentData, onBack, onEnterMatch, account, loading, syncDots }) => {
  const { tierId, instanceId, status, currentRound, enrolledCount, prizePool, rounds, playerCount, enrolledPlayers } = tournamentData;

  // Calculate total rounds based on player count
  const totalRounds = Math.ceil(Math.log2(playerCount));

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

  const getMatchStatusText = (matchStatus) => {
    if (matchStatus === 0) return 'Not Started';
    if (matchStatus === 1) return 'In Progress';
    if (matchStatus === 2) return 'Completed';
    return 'Unknown';
  };

  const getMatchStatusColor = (matchStatus) => {
    if (matchStatus === 0) return 'text-gray-400';
    if (matchStatus === 1) return 'text-yellow-400';
    if (matchStatus === 2) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <div className="mb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30 mb-8">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
        >
          <ChevronDown className="rotate-90" size={20} />
          Back to Tournaments
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Trophy className="text-purple-400" size={48} />
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
              <p className="text-purple-300">
                Round {currentRound + 1} of {totalRounds}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-purple-300 text-sm">Prize Pool</div>
            <div className="text-3xl font-bold text-yellow-400">
              {ethers.formatEther(prizePool)} ETH
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-purple-300 text-sm mb-1">Players</div>
            <div className="text-white font-bold text-xl">{enrolledCount} / {playerCount}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-purple-300 text-sm mb-1">Status</div>
            <div className="text-white font-bold text-xl">
              {status === 0 ? 'Enrolling' : status === 1 ? 'In Progress' : status === 2 ? 'Completed' : 'Unknown'}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-purple-300 text-sm mb-1">Current Round</div>
            <div className="text-white font-bold text-xl">Round {currentRound + 1}</div>
          </div>
        </div>
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
                <span className={`ml-2 ${getMatchStatusColor(userCurrentMatch.matchStatus)}`}>
                  {getMatchStatusText(userCurrentMatch.matchStatus)}
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
      <div className="bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30">
        <h3 className="text-2xl font-bold text-purple-300 mb-6 flex items-center gap-2">
          <Grid size={24} />
          Tournament Bracket
        </h3>

        <div className="space-y-8">
          {rounds.map((round, roundIdx) => (
            <div key={roundIdx}>
              <h4 className="text-xl font-bold text-purple-400 mb-4">
                Round {roundIdx + 1}
                {roundIdx === totalRounds - 1 && ' - Finals'}
                {roundIdx === totalRounds - 2 && rounds.length > 1 && ' - Semi-Finals'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {round.matches.map((match, matchIdx) => {
                  const isUserMatch =
                    match.player1?.toLowerCase() === account?.toLowerCase() ||
                    match.player2?.toLowerCase() === account?.toLowerCase();

                  return (
                    <div
                      key={matchIdx}
                      className={`bg-black/30 rounded-xl p-4 border-2 transition-all ${
                        isUserMatch
                          ? 'border-green-400/70 bg-green-900/20'
                          : 'border-purple-400/30 hover:border-purple-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-purple-300 text-sm font-semibold">
                          Match {matchIdx + 1}
                        </span>
                        <span className={`text-xs font-bold ${getMatchStatusColor(match.matchStatus)}`}>
                          {getMatchStatusText(match.matchStatus)}
                        </span>
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
          <div className="text-green-300 font-bold text-lg">Prize Won: 95% of pot</div>
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
          {isDraw ? 'Draw - Both Refunded 45%' : 'Winner Takes 95%'}
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

          {gameOver && <PrizeDistribution pot={game.pot} winner={isDraw ? 'draw' : 'winner'} winnerAddress={contractWinner} />}
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
                <div className="text-sm opacity-80">You won 95% of the pot!</div>
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

  // Theme State - 'dream' (blue/cyan), 'daring' (red/orange), 'classic' (traditional)
  const [theme, setTheme] = useState('dream');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Tournament State
  const [tournaments, setTournaments] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(null); // { tierId, instanceId, tournamentData, bracketData }
  const [bracketSyncDots, setBracketSyncDots] = useState(1);

  // Match State
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [blockMode, setBlockMode] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [syncDots, setSyncDots] = useState(1);

  // Helper to cycle through themes
  const cycleTheme = () => {
    setTheme(current => {
      if (current === 'dream') return 'daring';
      if (current === 'daring') return 'classic';
      return 'dream';
    });
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
      icon: '✨',
      label: 'Dream',
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
      icon: '🔥',
      label: 'Dare',
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
    },
    classic: {
      gradient: 'linear-gradient(to bottom right, rgb(15, 23, 42), rgb(30, 58, 138), rgb(15, 23, 42))',
      icon: '🎮',
      label: 'Classic',
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
    }
  };

  const currentTheme = themeColors[theme];

  // Previous game state for change detection
  const prevGameState = useRef(null);

  // FAQ data
  const faqs = [
    {
      q: "How do duel arenas work?",
      a: "Duel arenas are 1v1 tic-tac-toe matches on the blockchain. Two players join a room by paying the entry fee, then one player starts the match. Players take turns making moves on-chain. The winner takes the prize pool, minus a small platform fee."
    },
    {
      q: "Why tic-tac-toe on the blockchain?",
      a: "Tic-tac-toe is the perfect game for blockchain: it's simple, fast, deterministic, and impossible to cheat when moves are recorded on-chain. Unlike poker or complex games that require trusted randomness, tic-tac-toe is pure skill and strategy. Every move is public, verifiable, and immutable."
    },
    {
      q: "What if my opponent doesn't move?",
      a: "Each player has a time limit per move. If a player fails to make a move within the time limit, they automatically forfeit the game. The smart contract enforces all timeouts—no disputes, no moderators needed."
    },
    {
      q: "Can this really run forever?",
      a: "Yes. Once deployed, the smart contract lives on Ethereum permanently. There's no off-switch, no admin panel, no company required. Even if this website disappears, anyone can interact with the contract directly via Etherscan or build their own interface."
    },
    {
      q: "How do I know the prize pool is safe?",
      a: "All entry fees go directly to the smart contract. The contract holds the funds and distributes them automatically when a winner is determined. No human can access the funds. You can verify this by reading the contract code on Etherscan."
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
  const fetchTournaments = useCallback(async (tierId) => {
    if (!contract) return;

    try {
      setTournamentsLoading(true);

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

        tournamentData.push({
          tierId,
          instanceId,
          status,
          enrolledCount,
          maxPlayers,
          entryFee: entryFeeFormatted,
          isEnrolled
        });
      }

      setTournaments(tournamentData);
      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
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

      // Convert entry fee to wei
      const feeInWei = ethers.parseEther(entryFee);

      // Call enrollInTournament function with entry fee as value
      const tx = await contract.enrollInTournament(tierId, instanceId, { value: feeInWei });
      await tx.wait();

      alert('Successfully enrolled in tournament!');

      // Refresh tournament data
      const currentTierId = theme === 'dream' ? 0 : 1;
      await fetchTournaments(currentTierId);

      setTournamentsLoading(false);
    } catch (error) {
      console.error('Error enrolling:', error);
      alert(`Error enrolling: ${error.message}`);
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

      // Get tier config for player count
      const tierConfig = await contractInstance.tierConfigs(tierId);
      const playerCount = Number(tierConfig.playerCount);

      // Get enrolled players
      const enrolledPlayers = await contractInstance.getEnrolledPlayers(tierId, instanceId);

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
            matches.push({
              player1: matchData[0],
              player2: matchData[1],
              currentTurn: matchData[2],
              winner: matchData[3],
              board: matchData[4],
              matchStatus: Number(matchData[5]),
              isDraw: matchData[6]
            });
          } catch (err) {
            // Match might not exist yet
            matches.push({
              player1: '0x0000000000000000000000000000000000000000',
              player2: '0x0000000000000000000000000000000000000000',
              matchStatus: 0
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
        enrolledPlayers,
        rounds
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
      const firstPlayer = matchData[8];
      const lastMovedCell = Number(matchData[9]);

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
        isMatchInitialized
      };
    } catch (error) {
      console.error('Error refreshing match:', error);
      return null;
    }
  }, []); // No dependencies - pure function

  // Handle cell click for making moves
  const handleCellClick = async (cellIndex) => {
    if (!currentMatch || !contract || !account) return;

    if (blockMode) {
      await handleBlockMove(cellIndex);
      return;
    }

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

  // Handle block move
  const handleBlockMove = async (cellIndex) => {
    if (!currentMatch || !contract) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      const tx = await contract.blockLastMove(tierId, instanceId, roundNumber, matchNumber);
      await tx.wait();

      const updated = await refreshMatchData(contract, account, currentMatch);
      if (updated) setCurrentMatch(updated);

      setBlockMode(false);
      setMatchLoading(false);
      alert('Block successful!');
    } catch (error) {
      console.error('Error blocking:', error);
      alert(`Error blocking: ${error.message}`);
      setMatchLoading(false);
      setBlockMode(false);
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
        setBlockMode(false);
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
    setBlockMode(false);
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
      // Determine tier based on theme: dream = tier 0 (Classic), daring = tier 1 (Pro)
      const tierId = theme === 'dream' ? 0 : 1;
      fetchTournaments(tierId);
    }
  }, [theme, contract, account, fetchTournaments]);

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
    <div className={theme === 'classic' ? "min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white" : ""} style={theme !== 'classic' ? {
      minHeight: '100vh',
      background: currentTheme.gradient,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    } : {}}>
      {/* Particle Background (Dream/Daring Themes Only) */}
      {theme !== 'classic' && <ParticleBackground colors={currentTheme.particleColors} />}

      {/* Trust Banner */}
      <div className={theme === 'classic' ? "bg-blue-600/20 border-b border-blue-500/30 backdrop-blur-sm" : ""} style={theme !== 'classic' ? {
        background: theme === 'dream' ? 'rgba(0, 100, 200, 0.2)' : 'rgba(139, 0, 0, 0.2)',
        borderBottom: `1px solid ${currentTheme.border}`,
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 10
      } : { position: 'relative', zIndex: 10 }}>
        {/* Theme Toggle Switch - Desktop: fixed top-right, Mobile: in banner */}
        <div className="theme-toggle-wrapper">
          <button
            onClick={cycleTheme}
            className="theme-toggle-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: theme === 'classic' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: theme === 'classic' ? '2px solid rgba(59, 130, 246, 0.5)' : `2px solid ${currentTheme.border}`,
              borderRadius: '20px',
              padding: '6px 12px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: theme === 'classic' ? '0 0 15px rgba(59, 130, 246, 0.3)' : `0 0 15px ${currentTheme.glow}`
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = theme === 'classic' ? '0 0 25px rgba(59, 130, 246, 0.5)' : `0 0 25px ${currentTheme.glow}`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = theme === 'classic' ? '0 0 15px rgba(59, 130, 246, 0.3)' : `0 0 15px ${currentTheme.glow}`;
            }}
          >
            <span className="theme-toggle-icon">{currentTheme.icon}</span>
            <span className="theme-toggle-text">{currentTheme.label}</span>
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
          <Shield className="text-blue-400" size={16} />
          <span className="text-blue-100 font-medium">100% On-Chain Games</span>
              </div>
              <div className="flex items-center gap-2">
          <Lock className="text-blue-400" size={16} />
          <span className="text-blue-100 font-medium">Immutable Rules</span>
              </div>
              <div className="flex items-center gap-2">
          <Eye className="text-blue-400" size={16} />
          <span className="text-blue-100 font-medium">Every Move Verifiable</span>
              </div>
            </div>
            <a
              href={ETHERSCAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors"
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
            Play Tic-Tac-Toe on Ethereum. Real opponents. Real ETH on the line.
            <br/>
            No servers. No trust.
            <br/>
            Every move is a transaction. Every game is provably fair. Forever.
          </p>

          {/* Game Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
          <Trophy className="text-green-400" size={20} />
          <span className="font-bold text-green-300">Winner Takes 95%</span>
              </div>
              <p className="text-sm text-green-200">Champion walks away with almost the entire pot</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
          <DollarSign className="text-yellow-400" size={20} />
          <span className="font-bold text-yellow-300">0.002 ETH Entry</span>
              </div>
              <p className="text-sm text-yellow-200">Low stakes, high strategy gameplay</p>
            </div>
            <div className={`bg-gradient-to-br ${currentTheme.infoCard} border ${currentTheme.infoBorder} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
          <Zap className={currentTheme.infoIcon} size={20} />
          <span className={`font-bold ${currentTheme.infoTitle}`}>Random First Move</span>
              </div>
              <p className={`text-sm ${currentTheme.infoText}`}>On-chain coin flip decides who starts</p>
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
            <p className={`${currentTheme.heroText} font-medium mb-1`}>Why Arbitrum?</p>
            <p className={`${currentTheme.heroSubtext}/80 leading-relaxed`}>
              This game runs on <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className={`font-semibold ${currentTheme.heroText} hover:${theme === 'daring' ? 'text-red-100' : 'text-blue-100'} underline decoration-${theme === 'daring' ? 'red' : 'blue'}-400/50 hover:decoration-${theme === 'daring' ? 'orange' : 'blue'}-300 transition-colors`}>Arbitrum One</a>, an Ethereum Layer 2 network.
              If prompted, simply click to switch networks in MetaMask — it's instant, free, and uses the same ETH you already have.
              No bridging required. <span className={currentTheme.heroText}>Lower fees, same security.</span>
            </p>
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
                      {cell === 1 ? 'X' : cell === 2 ? 'O' : blockMode ? '🚫' : ''}
                    </button>
                  ))}
                </div>

                {/* Game Controls */}
                <div className="space-y-3">
                  {currentMatch.matchStatus === 1 && currentMatch.isYourTurn && (
                    <button
                      onClick={() => setBlockMode(!blockMode)}
                      disabled={matchLoading}
                      className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${
                        blockMode
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-400'
                      }`}
                    >
                      {blockMode ? 'Cancel Block' : '🛡️ Block Last Move'}
                    </button>
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
        {account && contract && !currentMatch && (
          <>
            {viewingTournament ? (
              // Show Tournament Bracket View
              <TournamentBracket
                tournamentData={viewingTournament}
                onBack={() => setViewingTournament(null)}
                onEnterMatch={handlePlayMatch}
                account={account}
                loading={tournamentsLoading}
                syncDots={bracketSyncDots}
              />
            ) : (
              // Show Tournament List
              <div className="mb-16">
                {/* Section Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <Trophy className={`${theme === 'dream' ? 'text-blue-400' : theme === 'daring' ? 'text-red-400' : 'text-purple-400'}`} size={48} />
                    <h2 className={`text-5xl font-bold bg-gradient-to-r ${theme === 'dream' ? 'from-blue-400 to-cyan-400' : theme === 'daring' ? 'from-red-400 to-orange-400' : 'from-purple-400 to-blue-400'} bg-clip-text text-transparent`}>
                      {theme === 'dream' ? 'Classic Tournaments' : theme === 'daring' ? 'Pro Tournaments' : 'Tournaments'}
                    </h2>
                  </div>
                  <p className={`text-xl ${theme === 'dream' ? 'text-blue-200' : theme === 'daring' ? 'text-red-200' : 'text-purple-200'}`}>
                    {theme === 'dream' ? 'Standard competitive play for all skill levels' : 'Advanced tournaments with block mechanics and higher stakes'}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tournaments.map((tournament) => (
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
                      />
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!tournamentsLoading && tournaments.length === 0 && (
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-12 border border-purple-400/30 text-center">
                    <Trophy className="text-purple-400/50 mx-auto mb-4" size={64} />
                    <h3 className="text-2xl font-bold text-purple-300 mb-2">No Tournaments Available</h3>
                    <p className="text-purple-200/70">Check back soon for new tournaments!</p>
                  </div>
                )}

                {/* User Info Footer */}
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
              </div>
            )}
          </>
        )}

        {/* Not Connected State - Call to Action */}
        {!account && (
          <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30 mb-16">
            <h2 className="text-4xl font-bold mb-6 flex items-center gap-3 justify-center">
              <Wallet className="text-purple-400" />
              Ready to Compete?
            </h2>
            <div className="text-center py-8 bg-purple-500/10 rounded-xl border border-purple-400/30">
              <p className="text-2xl text-purple-200 mb-4 font-bold">Connect Your Wallet</p>
              <p className="text-lg text-purple-300 mb-6">Get ready for tournaments with real ETH prizes!</p>
              <button
          onClick={connectWallet}
          disabled={loading}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-10 py-5 rounded-2xl font-bold text-2xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
          <Wallet size={28} />
          {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zero Trust Architecture */}
      <div id="zero-trust" className="max-w-7xl mx-auto px-6 pb-12" style={{ position: 'relative', zIndex: 10 }}>
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-green-500/30 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-6 text-center text-green-300">Zero-Trust Architecture</h2>

            <div className="bg-green-500/10 border-l-4 border-green-400 p-6 rounded-r-xl mb-8">
              <p className="text-lg leading-relaxed text-green-100">
          Eternal TicTacToe is a <strong className="text-green-300">fully autonomous protocol</strong> deployed on Ethereum. Every game move is recorded on-chain. Every rule is enforced by immutable code. No servers can go down. No admins can interfere. No company can shut it down.
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
              <span>Every move recorded on-chain permanently</span>
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
              <span>Instant winner determination</span>
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
            <strong className="text-yellow-200">This website is optional.</strong> You could play via Etherscan, build your own UI, or use any third-party interface. The trust-free guarantee comes from Ethereum, not from this website.
          </p>
          <p>
            <strong className="text-yellow-200">True digital permanence.</strong> Even if every website disappears, the game continues forever. Your games, your wins, and your prizes are secured by Ethereum's immutable ledger.
          </p>
              </div>
            </div>

            {/* Link to Whitepaper */}
            <div className="mt-8 text-center">
              <a
          href="#whitepaper"
          className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 font-semibold text-lg underline decoration-purple-400/50 hover:decoration-purple-300 transition-colors"
              >
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
        <div id="whitepaper" className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-purple-500/30 mb-16">
          <h2 className="text-4xl font-bold text-purple-300 mb-6">What's the point?</h2>
          <p className="text-purple-100 mb-4">Most people have heard of crypto, but not <em>why it matters.</em></p>

          <h2 className="text-2xl font-bold mb-3 text-purple-300">Beyond Buzzwords</h2>

          <p className="text-purple-100 mb-2">You may know:</p>
          <ul className="list-disc pl-6 mb-6 text-purple-100 space-y-1">
            <li>Bitcoin goes up and down.</li>
            <li>Ethereum is cool too.</li>
            <li>Some people get rich. Some people get wrecked.</li>
            <li>There are coins with dogs on them.</li>
          </ul>

          <p className="text-purple-100 mb-8">This article explains <strong className="text-purple-200">what crypto was really meant to be.</strong></p>

          <hr className="border-purple-500/30 my-8" />

          <h2 className="text-2xl font-bold mb-3 text-purple-300">What Even <em>is</em> a Blockchain?</h2>

          <p className="text-purple-100 mb-4">Forget influencers and dollar signs for a moment.</p>

          <div className="bg-purple-500/10 border-l-4 border-purple-400 p-4 rounded-r-xl mb-6">
            <p className="text-lg text-purple-100 mb-2"><strong>Blockchain is about bookkeeping.</strong></p>
            <p className="text-purple-200 italic">If everyone has the same book, you don't need to trust a bookkeeper.</p>
          </div>

          <p className="text-purple-100 mb-2">There is <strong className="text-purple-200">no server</strong>.</p>
          <p className="text-purple-100 mb-2">There is <strong className="text-purple-200">no admin account</strong>.</p>
          <p className="text-purple-100 mb-2">There is <strong className="text-purple-200">no need to trust a person or a company.</strong></p>
          <p className="text-purple-100 mb-8 text-xl font-bold">Everyone sees the same truth.</p>

          <hr className="border-purple-500/30 my-8" />

          <h3 className="text-xl font-bold mb-3 text-purple-300">The Fruit Ledger Analogy</h3>

          <p className="text-purple-100 mb-3">Imagine a bowl of apples.</p>
          <ul className="list-disc pl-6 mb-4 text-purple-100 space-y-1">
            <li>If one person keeps track of the bowl, you must trust them.</li>
            <li>They could lie, steal, or miscount.</li>
          </ul>

          <p className="text-purple-100 mb-4">But if <strong className="text-purple-200">100 people</strong> all keep <strong className="text-purple-200">identical notebooks</strong>, and every apple in or out is recorded by <strong className="text-purple-200">everyone</strong>, no single person can cheat.</p>

          <p className="text-purple-100 mb-4">If someone tries to falsify their notebook, everyone else rejects it.</p>

          <p className="text-purple-100 mb-6 text-xl font-bold">That's blockchain.</p>

          <div className="bg-purple-500/10 border-l-4 border-purple-400 p-4 rounded-r-xl mb-8">
            <p className="text-purple-200 italic">The truth comes from <strong>consensus</strong>, not <strong>authority</strong>.</p>
          </div>

          <hr className="border-purple-500/30 my-8" />

          <h2 className="text-2xl font-bold mb-3 text-purple-300">Why Do Scams Still Happen in Crypto?</h2>

          <p className="text-purple-100 mb-4">Because <strong className="text-purple-200">most "crypto" projects are not actually decentralized.</strong></p>

          <p className="text-purple-100 mb-3">They <em>claim</em> to be blockchain-based, but:</p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-purple-500/30">
                  <th className="text-left p-3 text-purple-300">Feature</th>
                  <th className="text-left p-3 text-purple-300">Many Crypto Projects</th>
                  <th className="text-left p-3 text-purple-300">Actual Blockchain</th>
                </tr>
              </thead>
              <tbody className="text-purple-100">
                <tr className="border-b border-purple-500/20">
                  <td className="p-3">NFT images</td>
                  <td className="p-3">Stored on a private server</td>
                  <td className="p-3">Stored on decentralized data networks</td>
                </tr>
                <tr className="border-b border-purple-500/20">
                  <td className="p-3">Altcoins</td>
                  <td className="p-3">Controlled by creators</td>
                  <td className="p-3">Controlled only by immutable code</td>
                </tr>
                <tr className="border-b border-purple-500/20">
                  <td className="p-3">Games</td>
                  <td className="p-3">Run on private servers</td>
                  <td className="p-3">Run fully on-chain, publicly</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-purple-100 mb-4">These projects <strong className="text-purple-200">use the blockchain as marketing</strong>, while <strong className="text-purple-200">real control remains centralized.</strong></p>

          <p className="text-purple-100 mb-6 text-xl font-bold">That is NOT really blockchain!</p>

          <hr className="border-purple-500/30 my-8" />

          <h2 className="text-2xl font-bold mb-3 text-purple-300">How Is This Any Different?</h2>

          <h3 className="text-xl font-bold mb-3 text-purple-300">Because the Eternal Tic Tac Toe Protocol (ETTTP)</h3>

          <p className="text-purple-100 mb-3"><strong className="text-purple-200">Is Not:</strong></p>
          <ul className="list-disc pl-6 mb-6 text-purple-100 space-y-1">
            <li>A new token to trade</li>
            <li>A marketing stunt with no utility</li>
          </ul>

          <p className="text-purple-100 mb-3"><strong className="text-purple-200">Is strictly:</strong></p>
          <p className="text-purple-100 mb-6">A <strong className="text-purple-200">self-running</strong>, <strong className="text-purple-200">immutable</strong>, <strong className="text-purple-200">on-chain game and reward system</strong> that cannot be altered, paused, or manipulated — not even by its creator.</p>


          <p className="text-purple-100 mb-6 text-xl font-bold">It runs itself. Forever. On-chain.</p>

          <ul className="list-disc pl-6 mb-6 text-purple-100 space-y-1">
            <li>No servers</li>
            <li>No databases</li>
            <li>No moderators</li>
            <li>No owner keys</li>
            <li>No cookies</li>
            <li>No "trust me bro"</li>
          </ul>

          <p className="text-purple-100 mb-8 text-xl font-bold">Just math, consensus, and Ethereum.</p>

          <hr className="border-purple-500/30 my-8" />

          <h2 className="text-2xl font-bold mb-3 text-purple-300">Verify It Yourself</h2>

          <p className="text-purple-100 mb-3">No trust needed.</p>

          <ul className="list-disc pl-6 mb-6 text-purple-100 space-y-1">
            <li>View the contract</li>
            <li>Read the code</li>
            <li>Confirm the game logic</li>
            <li>Watch every move</li>
            <li>Verify every payout</li>
          </ul>

          <p className="text-purple-100 mb-6 text-xl font-bold">The truth is on-chain.</p>

          <h3 className="text-xl font-bold mb-3 text-purple-300">Contract Address:</h3>
          <a
            href={ETHERSCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-purple-200 underline decoration-purple-400/50 hover:decoration-purple-300 transition-colors inline-flex items-center gap-2"
          >
            View on Arbiscan <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-blue-300">
          <p className="font-semibold text-lg mb-2">Dummy TicTacToe Protocol</p>
          <p>Built on Ethereum. Runs forever. No servers required.</p>
          <p className="mt-2">Smart contracts are immutable and transparent. Always verify before interacting.</p>
        </div>
      </div>

      {/* CSS Animations & Custom Styles */}
      <style jsx>{`
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

        /* Particle animation for Dream theme */
        @keyframes particle-float {
          0% {
            transform: translateY(100vh) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(100px);
            opacity: 0;
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
      `}</style>
    </div>
  );
}
