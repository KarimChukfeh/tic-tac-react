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

import { useState, useEffect, useRef } from 'react';
import {
  Wallet, Grid, Swords, Clock, Shield, Lock, Eye, Code, ExternalLink,
  Trophy, Play, Users, DollarSign, Zap, TrendingUp, History,
  Award, Target, CheckCircle, Info, Coins, AlertCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import DUMMY_ABI from './dummyABI.json';

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
  const CONTRACT_ADDRESS = "0x7fc74A84a41Ac0E4872fB94EB3d6A8998884Ec9d";
  const ETHERSCAN_URL = `https://arbiscan.io/address/${CONTRACT_ADDRESS}`;

  // Wallet & Contract State
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // Game State
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [entryFee, setEntryFee] = useState('0');
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [gameLog, setGameLog] = useState([]);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [contractStatus, setContractStatus] = useState('not_checked'); // not_checked, checking, deployed, not_deployed
  const [lastGame, setLastGame] = useState(null);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);

  // Previous game state for change detection
  const prevGameState = useRef(null);

  // Switch to Arbitrum One Network
  const switchToArbitrum = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xa4b1' }], // 42161 in hex
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xa4b1', // 42161 in hex
                chainName: 'Arbitrum One',
                nativeCurrency: {
                  name: 'Ethereum',
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
          console.error('Error adding Arbitrum One network:', addError);
          alert('Failed to add Arbitrum One network. Please add it manually in MetaMask.');
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
        isArbitrum: network.chainId === 42161n
      };

      setNetworkInfo(networkData);

      console.log('Connected to network:', networkData);

      // Check if connected to Arbitrum One (chain ID 42161)
      if (network.chainId !== 42161n) {
        const shouldSwitch = window.confirm(
          `⚠️ Wrong Network Detected\n\n` +
          `You're connected to: ${network.name || 'Unknown'} (Chain ID: ${network.chainId})\n` +
          `Expected: Arbitrum One (Chain ID: 42161)\n\n` +
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

      await loadContractData(contractInstance);
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

  // Load contract data
  const loadContractData = async (contractInstance) => {
    try {
      setContractStatus('checking');

      // Verify contract is deployed by checking bytecode
      const provider = contractInstance.runner.provider;
      const contractAddress = await contractInstance.getAddress();
      const code = await provider.getCode(contractAddress);

      console.log('Checking contract at:', contractAddress);
      console.log('Bytecode length:', code.length);
      console.log('Bytecode preview:', code.substring(0, 66));

      if (code === '0x' || code === '0x0') {
        setContractStatus('not_deployed');
        console.error('❌ No bytecode found at address:', contractAddress);
        throw new Error(
          `No contract found at ${contractAddress}\n\n` +
          `This means either:\n` +
          `1. The contract hasn't been deployed to Arbitrum One yet\n` +
          `2. The CONTRACT_ADDRESS in the code is wrong\n` +
          `3. You're connected to the wrong network\n\n` +
          `Steps to fix:\n` +
          `1. Verify you're connected to Arbitrum One in MetaMask\n` +
          `2. Check the contract exists on Arbiscan: https://arbiscan.io/address/${contractAddress}\n` +
          `3. If wrong address, update CONTRACT_ADDRESS in App.jsx line 767`
        );
      }

      console.log('✅ Contract found! Bytecode exists.');
      setContractStatus('deployed');

      const fee = await contractInstance.ENTRY_FEE();
      setEntryFee(ethers.formatEther(fee));

      // Fetch individual state variables since there's no getGameState() or getBoard()
      const player1 = await contractInstance.player1();
      const player2 = await contractInstance.player2();
      const currentTurn = await contractInstance.currentTurn();
      const winner = await contractInstance.winner();
      const pot = await contractInstance.pot();
      const status = await contractInstance.status();

      // Fetch board cells individually
      const board = [];
      for (let i = 0; i < 9; i++) {
        const cell = await contractInstance.board(i);
        board.push(Number(cell));
      }

      const gameData = {
        id: '1', // Simplified contract only supports one game at a time
        player1,
        player2,
        winner,
        pot: ethers.formatEther(pot),
        status: Number(status),
        board,
        currentTurn
      };

      // Detect changes and add logs
      if (prevGameState.current) {
        const prev = prevGameState.current;

        // Player joined
        if (prev.player1 === ethers.ZeroAddress && gameData.player1 !== ethers.ZeroAddress) {
          addLogEntry('join', `Player 1 (${shortenAddress(gameData.player1)}) joined the game`);
        }
        if (prev.player2 === ethers.ZeroAddress && gameData.player2 !== ethers.ZeroAddress) {
          addLogEntry('join', `Player 2 (${shortenAddress(gameData.player2)}) joined the game`);
        }

        // Game started
        if (prev.status === 1 && gameData.status === 2) {
          const firstPlayer = gameData.currentTurn === gameData.player1 ? 'Player 1 (X)' : 'Player 2 (O)';
          addLogEntry('start', `Game started! ${firstPlayer} goes first`);
        }

        // Move made
        const prevMoveCount = prev.board.filter(c => c !== 0).length;
        const newMoveCount = gameData.board.filter(c => c !== 0).length;
        if (newMoveCount > prevMoveCount) {
          const cellIndex = gameData.board.findIndex((cell, idx) => cell !== prev.board[idx] && cell !== 0);
          const symbol = gameData.board[cellIndex] === 1 ? 'X' : 'O';
          addLogEntry('move', `${symbol} played at cell ${cellIndex}`);
        }

        // Game ended
        if (prev.status === 2 && gameData.status === 3) {
          if (gameData.winner === ethers.ZeroAddress) {
            addLogEntry('draw', `Game ended in a draw!`);
          } else {
            addLogEntry('win', `${shortenAddress(gameData.winner)} won the game!`);
          }
        }
      }

      prevGameState.current = gameData;
      setGame(gameData);

      // Load game history data
      try {
        const totalGames = await contractInstance.getTotalGamesPlayed();
        setTotalGamesPlayed(Number(totalGames));

        if (Number(totalGames) > 0) {
          const latestGame = await contractInstance.getLatestGame();
          setLastGame({
            gameId: Number(latestGame.gameId),
            player1: latestGame.player1,
            player2: latestGame.player2,
            result: Number(latestGame.result), // 0 = Win, 1 = Draw
            winner: latestGame.winner,
            timestamp: Number(latestGame.timestamp)
          });
        }
      } catch (historyError) {
        console.error('Error loading game history:', historyError);
        // Don't fail the entire load if history fails
      }
    } catch (error) {
      console.error('Error loading contract data:', error);

      // Show user-friendly error message
      if (error.message.includes('No contract deployed')) {
        alert('⚠️ Contract Not Deployed\n\n' + error.message);
      } else if (error.code === 'BAD_DATA') {
        alert('⚠️ Contract Connection Error\n\nThe contract at this address is not responding correctly. Please check:\n\n1. Are you connected to Arbitrum One?\n2. Is the contract address correct?\n3. Does the contract exist on Arbiscan?\n\nCurrent address: ' + CONTRACT_ADDRESS + '\nView on Arbiscan: https://arbiscan.io/address/' + CONTRACT_ADDRESS);
      } else {
        alert('Error loading game data: ' + error.message);
      }
    }
  };

  // Join the game
  const joinGame = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.joinGame({
        value: ethers.parseEther(entryFee)
      });
      await tx.wait();

      await loadContractData(contract);
      alert('Joined game successfully!');
      setLoading(false);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game. ' + error.message);
      setLoading(false);
    }
  };

  // Start the game (after both players joined)
  const startGame = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.startGame();
      await tx.wait();

      await loadContractData(contract);
      alert('Game started! A coin flip determined who goes first.');
      setLoading(false);
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game. ' + error.message);
      setLoading(false);
    }
  };

  // Make a move in the game
  const makeMove = async (cellIndex) => {
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.makeMove(cellIndex);
      await tx.wait();

      await loadContractData(contract);
      setLoading(false);
    } catch (error) {
      console.error('Error making move:', error);
      alert('Failed to make move. ' + error.message);
      setLoading(false);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setContract(null);
        } else {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  // Set up event listeners and auto-refresh
  useEffect(() => {
    if (!contract) return;

    const onPlayerJoined = () => {
      console.log('Player joined event');
      loadContractData(contract);
    };

    const onGameStarted = () => {
      console.log('Game started event');
      loadContractData(contract);
    };

    const onMoveMade = () => {
      console.log('Move made event');
      loadContractData(contract);
    };

    const onGameEnded = () => {
      console.log('Game ended event');
      loadContractData(contract);
    };

    const onGameRecordSaved = () => {
      console.log('Game record saved event');
      loadContractData(contract);
    };

    const onResidueClaimed = () => {
      console.log('Residue claimed event');
      loadContractData(contract);
    };

    contract.on('PlayerJoined', onPlayerJoined);
    contract.on('GameStarted', onGameStarted);
    contract.on('MoveMade', onMoveMade);
    contract.on('GameEnded', onGameEnded);
    contract.on('GameRecordSaved', onGameRecordSaved);
    contract.on('ResidueClaimed', onResidueClaimed);

    // Auto-refresh every 5 seconds
    const refreshInterval = setInterval(() => {
      loadContractData(contract);
      setRefreshProgress(0);
    }, 5000);

    const progressInterval = setInterval(() => {
      setRefreshProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (100 / (5000 / 30));
      });
    }, 30);

    return () => {
      contract.off('PlayerJoined', onPlayerJoined);
      contract.off('GameStarted', onGameStarted);
      contract.off('MoveMade', onMoveMade);
      contract.off('GameEnded', onGameEnded);
      contract.off('GameRecordSaved', onGameRecordSaved);
      contract.off('ResidueClaimed', onResidueClaimed);
      clearInterval(refreshInterval);
      clearInterval(progressInterval);
    };
  }, [contract]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Trust Banner */}
      <div className="bg-blue-600/20 border-b border-blue-500/30 backdrop-blur-sm">
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

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Grid className="relative text-blue-400 animate-float" size={80} />
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400">
            Dummy TicTacToe Protocol
          </h1>
          <p className="text-2xl text-blue-200 mb-6">
            Provably Fair • Zero Trust • 100% On-Chain
          </p>
          <p className="text-lg text-blue-300 max-w-3xl mx-auto mb-8">
            Play Tic-Tac-Toe on Ethereum with real stakes. No servers. No operators. No trust required.
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
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-blue-400" size={20} />
                <span className="font-bold text-blue-300">Random First Move</span>
              </div>
              <p className="text-sm text-blue-200">On-chain coin flip decides who starts</p>
            </div>
          </div>


          {/* Connect Wallet CTA */}
          {!account ? (
            <button
              onClick={connectWallet}
              disabled={loading}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-10 py-5 rounded-2xl font-bold text-2xl shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        You're on <span className="font-bold">{networkInfo.name}</span>. Switch to Arbitrum One network (Chain ID: 42161).
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

        {/* Last Game Result Section */}
        {account && lastGame && (
          <LastGameResult lastGame={lastGame} account={account} />
        )}

        {/* Total Games Counter */}
        {account && totalGamesPlayed > 0 && (
          <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-400/30 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="text-purple-400" size={24} />
              <span className="text-xl font-bold text-white">
                Total Games Played: {totalGamesPlayed}
              </span>
            </div>
          </div>
        )}

        {/* Active Game Section */}
        {account && game && (
          <div className="mb-16">
            <ActiveGameDisplay
              game={game}
              account={account}
              onMove={makeMove}
              onStartGame={startGame}
              loading={loading}
              refreshProgress={refreshProgress}
              gameLog={gameLog}
            />
          </div>
        )}

        {/* Join Game Section */}
        {account && contract && game && (
          <div className="bg-gradient-to-r from-red-600/30 to-pink-600/30 backdrop-blur-lg rounded-2xl p-8 border border-red-400/30 mb-16">
            <h2 className="text-4xl font-bold mb-6 flex items-center gap-3">
              <Play className="text-red-400" />
              Game Actions
            </h2>

            {(game.status === 0 || game.status === 1) && game.player1 === '0x0000000000000000000000000000000000000000' && (
              <div className="mb-6">
                <button
                  onClick={joinGame}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-8 py-4 rounded-xl font-bold text-xl shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : `Join as Player 1 (${entryFee} ETH)`}
                </button>
                <p className="text-blue-200 mt-4">Be the first player to join the arena!</p>
              </div>
            )}

            {(game.status === 0 || game.status === 1) && game.player1 !== '0x0000000000000000000000000000000000000000' && game.player2 === '0x0000000000000000000000000000000000000000' && game.player1.toLowerCase() !== account.toLowerCase() && (
              <div className="mb-6">
                <button
                  onClick={joinGame}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-4 rounded-xl font-bold text-xl shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : `Join as Player 2 (${entryFee} ETH)`}
                </button>
                <p className="text-blue-200 mt-4">Challenge the waiting player!</p>
              </div>
            )}

            {(game.status === 0 || game.status === 1) && game.player1.toLowerCase() === account.toLowerCase() && game.player2 === '0x0000000000000000000000000000000000000000' && (
              <div className="text-center py-6 bg-blue-500/10 rounded-xl border border-blue-400/30">
                <p className="text-blue-200">You're in the arena! Waiting for opponent to join...</p>
              </div>
            )}

            {game.status === 1 && (
              <div className="text-center py-6 bg-cyan-500/10 rounded-xl border border-cyan-400/30">
                <p className="text-cyan-200">Both players are ready! Either player can start the game.</p>
              </div>
            )}

            {(game.status === 2 || game.status === 3) && (
              <div className="text-center py-6 bg-yellow-500/10 rounded-xl border border-yellow-400/30">
                <p className="text-yellow-200">Game is currently {game.status === 2 ? 'in progress' : 'completed'}. Wait for it to finish!</p>
              </div>
            )}
          </div>
        )}

        {/* Not Connected State */}
        {!account && (
          <div className="bg-gradient-to-r from-red-600/30 to-pink-600/30 backdrop-blur-lg rounded-2xl p-8 border border-red-400/30">
            <h2 className="text-4xl font-bold mb-6 flex items-center gap-3">
              <Swords className="text-red-400" />
              The Arena
            </h2>
            <div className="text-center py-12 bg-red-500/10 rounded-xl border border-red-400/30">
              <p className="text-xl text-red-200 mb-4">Connect your wallet to enter the arena</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-blue-300">
          <p className="font-semibold text-lg mb-2">Dummy TicTacToe Protocol</p>
          <p>Built on Ethereum. Runs forever. No servers required.</p>
          <p className="mt-2">Smart contracts are immutable and transparent. Always verify before interacting.</p>
        </div>
      </div>

      {/* CSS Animations & Custom Styles */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
}
