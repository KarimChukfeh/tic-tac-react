/**
 * GameMatchLayout - Shared layout component for all game match views
 *
 * Provides a flexible match page shell that wraps around game-specific boards.
 * Handles common UI elements: header, player panels, turn timer, escalation,
 * match completion, and loading overlay.
 *
 * Usage:
 * <GameMatchLayout
 *   gameType="tictactoe"
 *   match={currentMatch}
 *   layout="three-column"
 *   playerConfig={{ player1: { icon: 'X', label: 'Player 1' }, player2: { icon: 'O', label: 'Player 2' } }}
 *   ...handlers
 * >
 *   <GameSpecificBoard />
 * </GameMatchLayout>
 */

import { useState, useEffect, useRef } from 'react';
import MatchHeader from './MatchHeader';
import PlayerPanel from './PlayerPanel';
import TurnIndicator from './TurnIndicator';
import TurnTimer from './TurnTimer';
import MatchTimeoutEscalation from './MatchTimeoutEscalation';
import MatchComplete from './MatchComplete';
import LoadingOverlay from './LoadingOverlay';

// Theme configuration derived from gameType
const GAME_THEMES = {
  tictactoe: {
    title: 'Tournament Match',
    icon: null,
    headerBg: 'from-purple-600/30 to-blue-600/30',
    headerBorder: 'border-purple-400/30',
    textMuted: 'text-purple-300',
    player1Color: 'blue',
    player2Color: 'pink',
    moveTimeout: 60, // Legacy: Now uses total match time (300s per player)
    completeText: 'Match Complete!'
  },
  chess: {
    title: 'Chess Match',
    icon: '♔',
    headerBg: 'from-purple-500/10 to-pink-500/10',
    headerBorder: 'border-purple-400',
    textMuted: 'text-purple-300',
    player1Color: 'white',
    player2Color: 'black',
    moveTimeout: 60, // Legacy: Now uses total match time (300s per player)
    completeText: 'Checkmate!'
  },
  connectfour: {
    title: 'Connect Four Match',
    icon: null,
    headerBg: 'from-slate-900/50 to-purple-900/30',
    headerBorder: 'border-purple-400/30',
    textMuted: 'text-purple-300',
    player1Color: 'neonred',
    player2Color: 'neonblue',
    moveTimeout: 60, // Legacy: Now uses total match time (300s per player)
    completeText: 'Match Complete!'
  }
};

const GameMatchLayout = ({
  // Required props
  gameType, // 'tictactoe' | 'chess' | 'connectfour'
  match,
  account,
  loading,
  syncDots,

  // Handlers
  onClose,
  onClaimTimeoutWin,
  onForceEliminate,
  onClaimReplacement,

  // Tournament metadata
  playerCount = null, // Optional: player count for tournament type label

  // Player configuration
  playerConfig, // { player1: { icon, label }, player2: { icon, label } }

  // Layout
  layout = 'three-column', // 'three-column' | 'sidebar' | 'centered' | 'players-board-history'

  // Spectator mode
  isSpectator = false,

  // Optional render props for game-specific content
  renderMoveHistory, // () => <MoveHistory />
  renderMatchInfo, // () => <MatchInfoGrid />
  renderGameControls, // () => <ResignButton /> etc.
  renderPlayer1Stats, // () => <StatsContent /> for full layout
  renderPlayer2Stats, // () => <StatsContent /> for full layout
  renderPlayer1Extra, // Extra content like check indicator
  renderPlayer2Extra, // Extra content like check indicator

  // Children = the game board component
  children
}) => {
  const theme = GAME_THEMES[gameType] || GAME_THEMES.tictactoe;

  const {
    player1,
    player2,
    currentTurn,
    matchStatus,
    isDraw,
    winner,
    loser,
    lastMoveTime,
    startTime,
    isYourTurn,
    timeoutState
  } = match;

  const isGameOver = matchStatus === 2;
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const hasWinner = winner && winner !== zeroAddress;
  const userWon = hasWinner && account && winner.toLowerCase() === account.toLowerCase();

  // Show turn timer when match is in progress
  const showTurnTimer = matchStatus === 1;

  // Determine if players are current user
  const isPlayer1You = account && player1?.toLowerCase() === account.toLowerCase();
  const isPlayer1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
  const isPlayer2Turn = currentTurn?.toLowerCase() === player2?.toLowerCase();

  // Client-side timer state for mobile consolidated header
  const [player1TimeLeft, setPlayer1TimeLeft] = useState(match.player1TimeRemaining ?? match.matchTimePerPlayer ?? 300);
  const [player2TimeLeft, setPlayer2TimeLeft] = useState(match.player2TimeRemaining ?? match.matchTimePerPlayer ?? 300);
  const lastSyncRef = useRef(Date.now());
  const lastContractP1TimeRef = useRef(match.player1TimeRemaining);
  const lastContractP2TimeRef = useRef(match.player2TimeRemaining);

  // Update client-side time when contract data changes (on sync)
  useEffect(() => {
    const contractP1Time = match.player1TimeRemaining ?? match.matchTimePerPlayer ?? 300;
    const contractP2Time = match.player2TimeRemaining ?? match.matchTimePerPlayer ?? 300;

    // Only update if contract values actually changed (real sync occurred)
    if (contractP1Time !== lastContractP1TimeRef.current || contractP2Time !== lastContractP2TimeRef.current) {
      setPlayer1TimeLeft(contractP1Time);
      setPlayer2TimeLeft(contractP2Time);
      lastSyncRef.current = Date.now();
      lastContractP1TimeRef.current = contractP1Time;
      lastContractP2TimeRef.current = contractP2Time;
    }
  }, [match.player1TimeRemaining, match.player2TimeRemaining, match.matchTimePerPlayer]);

  // Client-side countdown ticker
  useEffect(() => {
    if (match.matchStatus !== 1) return; // Only tick during active match

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceSync = Math.floor((now - lastSyncRef.current) / 1000);

      // Decrement the time for the player whose turn it is
      if (isPlayer1Turn) {
        const newP1Time = Math.max(0, lastContractP1TimeRef.current - elapsedSinceSync);
        setPlayer1TimeLeft(newP1Time);
      } else if (isPlayer2Turn) {
        const newP2Time = Math.max(0, lastContractP2TimeRef.current - elapsedSinceSync);
        setPlayer2TimeLeft(newP2Time);
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [match.matchStatus, isPlayer1Turn, isPlayer2Turn]);

  // Render mobile consolidated header (used across all layouts)
  const renderMobileConsolidatedHeader = () => {
    // Timer values come from state (client-side ticking)
    const totalTime = match.matchTimePerPlayer ?? 300;

    // Calculate progress percentages
    const player1Progress = ((totalTime - player1TimeLeft) / totalTime) * 100;
    const player2Progress = ((totalTime - player2TimeLeft) / totalTime) * 100;

    // Format time display
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get color scheme based on remaining time
    const getTimeColors = (timeLeft) => {
      if (timeLeft <= 0) return { text: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500/20', bar: 'bg-red-500' };
      if (timeLeft <= 30) return { text: 'text-red-400', border: 'border-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' };
      if (timeLeft <= 60) return { text: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' };
      return { text: 'text-green-400', border: 'border-green-400', bg: 'bg-green-500/10', bar: 'bg-green-500' };
    };

    const player1Colors = getTimeColors(player1TimeLeft);
    const player2Colors = getTimeColors(player2TimeLeft);

    // Determine if user is player 2
    const isPlayer2You = account && player2?.toLowerCase() === account.toLowerCase();

    // Check if ML1 CTA should be shown
    // Player 1 timed out: show button to player 2 (in player 1's timer position)
    // Player 2 timed out: show button to player 1 (in player 2's timer position)
    const player1TimedOut = player1TimeLeft <= 0 && isPlayer1Turn && isPlayer2You;
    const player2TimedOut = player2TimeLeft <= 0 && isPlayer2Turn && isPlayer1You;
    const showML1CTAFromTimeout = timeoutState && timeoutState.timeoutActive && matchStatus === 1 && !isYourTurn;
    const showML1CTAFromTimer = matchStatus === 1 && (player1TimedOut || player2TimedOut);
    const showML1CTA = showML1CTAFromTimeout || showML1CTAFromTimer;

    // Helper to render a combined player card with timer
    const renderPlayerCard = (playerNum) => {
      const isPlayer1 = playerNum === 1;
      const playerAddress = isPlayer1 ? player1 : player2;
      const isYou = account && playerAddress?.toLowerCase() === account.toLowerCase();
      const isTurn = isPlayer1 ? isPlayer1Turn : isPlayer2Turn;
      const timeLeft = isPlayer1 ? player1TimeLeft : player2TimeLeft;
      const progress = isPlayer1 ? player1Progress : player2Progress;
      const colors = isPlayer1 ? player1Colors : player2Colors;
      const icon = isPlayer1 ? playerConfig?.player1?.icon : playerConfig?.player2?.icon;
      const label = isPlayer1 ? (playerConfig?.player1?.label || 'Player 1') : (playerConfig?.player2?.label || 'Player 2');
      const colorScheme = isPlayer1 ? theme.player1Color : theme.player2Color;
      const extraContent = isPlayer1 ? renderPlayer1Extra?.() : renderPlayer2Extra?.();
      const showCTA = showML1CTA && isTurn;

      // Get color config for player
      const COLOR_CONFIGS = {
        blue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' },
        pink: { border: 'border-pink-400/30', bg: 'bg-gradient-to-br from-pink-600/20 to-purple-600/20', iconBg: 'bg-pink-500', text: 'text-pink-300' },
        white: { border: 'border-blue-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-white text-black', text: 'text-blue-300' },
        black: { border: 'border-pink-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-gray-900 text-white', text: 'text-pink-300' },
        neonred: { border: 'border-red-400/30', bg: 'bg-gradient-to-br from-red-600/20 to-rose-600/20', iconBg: 'bg-red-500', text: 'text-red-300' },
        neonblue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' }
      };
      const cardColors = COLOR_CONFIGS[colorScheme] || COLOR_CONFIGS.blue;

      return (
        <div className={`relative rounded-lg border-2 ${
          isTurn && isYou && !isGameOver
            ? 'border-green-400 bg-green-500/10 ring-2 ring-green-400/30'
            : `${cardColors.border} ${cardColors.bg}`
        } p-3 space-y-2`}>
          {/* Turn Indicator Badge */}
          {isTurn && !isGameOver && (
            isYou ? (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg animate-bounce z-10">
                YOUR TURN!
              </div>
            ) : (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg animate-bounce z-10">
                THEIR TURN
              </div>
            )
          )}

          {/* Player Info Section */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 ${cardColors.iconBg} rounded-full flex items-center justify-center text-xl font-bold border ${
              isTurn && !isGameOver ? 'border-green-400' : cardColors.border
            }`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400">{label}</div>
              <div className="font-mono text-xs truncate">{playerAddress ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}` : ''}</div>
              {isYou && <span className="text-yellow-300 text-[11px] font-bold">YOU</span>}
            </div>
            {extraContent && <div className="flex-shrink-0">{extraContent}</div>}
          </div>

          {/* Timer Section or ML1 CTA */}
          {showTurnTimer && (
            showCTA ? (
              <button
                onClick={onClaimTimeoutWin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-3 rounded-lg transition-all disabled:opacity-50 text-xs"
              >
                Claim Timeout Victory
              </button>
            ) : (
              <div className={`border rounded-lg p-2 ${
                isTurn ? `${colors.border} ${colors.bg}` : 'border-gray-600/30 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-300">Time Remaining</span>
                  <span className={`font-mono text-sm font-bold ${colors.text}`}>
                    {timeLeft > 0 ? formatTime(timeLeft) : 'OUT'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colors.bar}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            )
          )}
        </div>
      );
    };

    return (
      <div className="lg:hidden mb-6">
        {/* Single row: Combined player cards with timers */}
        <div className="grid grid-cols-2 gap-3">
          {renderPlayerCard(1)}
          {renderPlayerCard(2)}
        </div>
      </div>
    );
  };

  // Render three-column layout (TicTacToe style)
  const renderThreeColumnLayout = () => {
    // Helper to render desktop player card with timer
    const renderDesktopPlayerCard = (playerNum) => {
      const isPlayer1 = playerNum === 1;
      const playerAddress = isPlayer1 ? player1 : player2;
      const isYou = account && playerAddress?.toLowerCase() === account.toLowerCase();
      const isTurn = isPlayer1 ? isPlayer1Turn : isPlayer2Turn;
      const timeLeft = isPlayer1 ? player1TimeLeft : player2TimeLeft;
      const totalTime = match.matchTimePerPlayer ?? 300;
      const progress = ((totalTime - timeLeft) / totalTime) * 100;
      const icon = isPlayer1 ? playerConfig?.player1?.icon : playerConfig?.player2?.icon;
      const label = isPlayer1 ? (playerConfig?.player1?.label || 'Player 1') : (playerConfig?.player2?.label || 'Player 2');
      const colorScheme = isPlayer1 ? theme.player1Color : theme.player2Color;
      const extraContent = isPlayer1 ? renderPlayer1Extra?.() : renderPlayer2Extra?.();
      const renderStats = isPlayer1 ? renderPlayer1Stats : renderPlayer2Stats;

      // Get color scheme based on remaining time
      const getTimeColors = (timeLeft) => {
        if (timeLeft <= 0) return { text: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500/20', bar: 'bg-red-500' };
        if (timeLeft <= 30) return { text: 'text-red-400', border: 'border-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' };
        if (timeLeft <= 60) return { text: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' };
        return { text: 'text-green-400', border: 'border-green-400', bg: 'bg-green-500/10', bar: 'bg-green-500' };
      };

      const colors = getTimeColors(timeLeft);

      // Format time display
      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Check if ML1 CTA should be shown
      const player1TimedOut = player1TimeLeft <= 0 && isPlayer1Turn && !isPlayer1You;
      const player2TimedOut = player2TimeLeft <= 0 && isPlayer2Turn && !isPlayer2You;
      const showML1CTAFromTimeout = timeoutState && timeoutState.timeoutActive && matchStatus === 1 && !isYourTurn;
      const showML1CTAFromTimer = matchStatus === 1 && (player1TimedOut || player2TimedOut);
      const showML1CTA = (showML1CTAFromTimeout || showML1CTAFromTimer) && isTurn;

      // Get color config for player card
      const COLOR_CONFIGS = {
        blue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' },
        pink: { border: 'border-pink-400/30', bg: 'bg-gradient-to-br from-pink-600/20 to-purple-600/20', iconBg: 'bg-pink-500', text: 'text-pink-300' },
        white: { border: 'border-blue-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-white text-black', text: 'text-blue-300' },
        black: { border: 'border-pink-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-gray-900 text-white', text: 'text-pink-300' },
        neonred: { border: 'border-red-400/30', bg: 'bg-gradient-to-br from-red-600/20 to-rose-600/20', iconBg: 'bg-red-500', text: 'text-red-300' },
        neonblue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' }
      };
      const cardColors = COLOR_CONFIGS[colorScheme] || COLOR_CONFIGS.blue;

      return (
        <div className={`relative ${cardColors.bg} backdrop-blur-lg rounded-2xl p-6 border-2 ${cardColors.border}`}>
          {/* Turn Indicator Badge - show for both your turn and their turn */}
          {isTurn && !isGameOver && (
            isYou ? (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg animate-bounce z-50">
                YOUR TURN!
              </div>
            ) : (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg z-50">
                THEIR TURN
              </div>
            )
          )}

          {/* Player Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 ${cardColors.iconBg} rounded-full flex items-center justify-center text-2xl font-bold border-2 ${cardColors.border}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{label}</h3>
              <p className={`${cardColors.text} font-mono text-sm`}>
                {playerAddress ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}` : ''}
              </p>
              {isYou && <span className="text-yellow-400 text-sm font-bold">YOU</span>}
            </div>
          </div>

          {/* Stats */}
          {renderStats && (
            <div className="space-y-2 mb-4">
              {renderStats()}
            </div>
          )}

          {/* Extra Content */}
          {extraContent && <div className="mb-4">{extraContent}</div>}

          {/* Timer Section or ML1 CTA */}
          {showTurnTimer && (
            showML1CTA ? (
              <button
                onClick={onClaimTimeoutWin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 shadow-lg"
              >
                Claim Timeout Victory
              </button>
            ) : (
              <div className={`border-2 rounded-lg p-3 ${
                isTurn ? `${colors.border} ${colors.bg}` : 'border-gray-600/30 bg-gray-800/20 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-300">Time Remaining</span>
                  <span className={`font-mono text-xl font-bold ${colors.text}`}>
                    {timeLeft > 0 ? formatTime(timeLeft) : 'OUT'}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colors.bar} transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            )
          )}
        </div>
      );
    };

    return (
      <div>
        {/* Mobile: Consolidated header with player cards, timers, and turn indicator */}
        {renderMobileConsolidatedHeader()}

        {/* Desktop: Three column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Player 1 (hidden on mobile) */}
          <div className="hidden lg:block">
            {renderDesktopPlayerCard(1)}
          </div>

          {/* Center Panel - Board */}
          <div className={`bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30 lg:col-span-1`}>
            <h3 className="text-2xl font-bold text-center text-white mb-6">Game Board</h3>
            {children}

            {/* Game Controls */}
            <div className="space-y-3 mt-6">
              {timeoutState && (
                <MatchTimeoutEscalation
                  timeoutState={timeoutState}
                  matchStatus={matchStatus}
                  isYourTurn={isYourTurn}
                  onClaimTimeoutWin={onClaimTimeoutWin}
                  onForceEliminate={onForceEliminate}
                  onClaimReplacement={onClaimReplacement}
                  loading={loading}
                  escL2Available={match.escL2Available}
                  escL3Available={match.escL3Available}
                  isUserAdvancedForRound={match.isUserAdvancedForRound}
                  hideML1OnMobile={true}
                />
              )}

              {renderGameControls?.()}

              {isGameOver && (
                <MatchComplete
                  isDraw={isDraw}
                  winner={winner}
                  loser={loser}
                  currentAccount={account}
                  gameSpecificText={!isDraw ? theme.completeText : undefined}
                />
              )}
            </div>
          </div>

          {/* Right Panel - Player 2 (hidden on mobile) */}
          <div className="hidden lg:block">
            {renderDesktopPlayerCard(2)}
          </div>
        </div>
      </div>
    );
  };

  // Render sidebar layout (Chess style)
  const renderSidebarLayout = () => {
    // Helper to render desktop player card with timer for sidebar layout
    const renderSidebarPlayerCard = (playerNum) => {
      const isPlayer1 = playerNum === 1;
      const playerAddress = isPlayer1 ? player1 : player2;
      const isYou = account && playerAddress?.toLowerCase() === account.toLowerCase();
      const isTurn = isPlayer1 ? isPlayer1Turn : isPlayer2Turn;
      const timeLeft = isPlayer1 ? player1TimeLeft : player2TimeLeft;
      const totalTime = match.matchTimePerPlayer ?? 300;
      const progress = ((totalTime - timeLeft) / totalTime) * 100;
      const icon = isPlayer1 ? playerConfig?.player1?.icon : playerConfig?.player2?.icon;
      const label = isPlayer1 ? (playerConfig?.player1?.label || 'Player 1') : (playerConfig?.player2?.label || 'Player 2');
      const colorScheme = isPlayer1 ? theme.player1Color : theme.player2Color;
      const extraContent = isPlayer1 ? renderPlayer1Extra?.() : renderPlayer2Extra?.();

      // Get color scheme based on remaining time
      const getTimeColors = (timeLeft) => {
        if (timeLeft <= 0) return { text: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500/20', bar: 'bg-red-500' };
        if (timeLeft <= 30) return { text: 'text-red-400', border: 'border-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' };
        if (timeLeft <= 60) return { text: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' };
        return { text: 'text-green-400', border: 'border-green-400', bg: 'bg-green-500/10', bar: 'bg-green-500' };
      };

      const colors = getTimeColors(timeLeft);

      // Format time display
      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Check if ML1 CTA should be shown
      const isPlayer2You = account && player2?.toLowerCase() === account.toLowerCase();
      const player1TimedOut = player1TimeLeft <= 0 && isPlayer1Turn && !isPlayer1You;
      const player2TimedOut = player2TimeLeft <= 0 && isPlayer2Turn && !isPlayer2You;
      const showML1CTAFromTimeout = timeoutState && timeoutState.timeoutActive && matchStatus === 1 && !isYourTurn;
      const showML1CTAFromTimer = matchStatus === 1 && (player1TimedOut || player2TimedOut);
      const showML1CTA = (showML1CTAFromTimeout || showML1CTAFromTimer) && isTurn;

      // Get color config for player card
      const COLOR_CONFIGS = {
        blue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' },
        pink: { border: 'border-pink-400/30', bg: 'bg-gradient-to-br from-pink-600/20 to-purple-600/20', iconBg: 'bg-pink-500', text: 'text-pink-300' },
        white: { border: 'border-blue-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-white text-black', text: 'text-blue-300' },
        black: { border: 'border-pink-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-gray-900 text-white', text: 'text-pink-300' },
        neonred: { border: 'border-red-400/30', bg: 'bg-gradient-to-br from-red-600/20 to-rose-600/20', iconBg: 'bg-red-500', text: 'text-red-300' },
        neonblue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' }
      };
      const cardColors = COLOR_CONFIGS[colorScheme] || COLOR_CONFIGS.blue;

      return (
        <div className={`relative ${cardColors.bg} backdrop-blur-lg rounded-2xl p-6 border-2 ${cardColors.border}`}>
          {/* Turn Indicator Badge */}
          {isTurn && !isGameOver && (
            isYou ? (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg animate-bounce z-50">
                YOUR TURN!
              </div>
            ) : (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg z-50">
                THEIR TURN
              </div>
            )
          )}

          {/* Player Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 ${cardColors.iconBg} rounded-full flex items-center justify-center text-2xl font-bold border-2 ${cardColors.border}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{label}</h3>
              <p className={`${cardColors.text} font-mono text-sm`}>
                {playerAddress ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}` : ''}
              </p>
              {isYou && <span className="text-yellow-400 text-sm font-bold">YOU</span>}
            </div>
          </div>

          {/* Extra Content */}
          {extraContent && <div className="mb-4">{extraContent}</div>}

          {/* Timer Section or ML1 CTA */}
          {showTurnTimer && (
            showML1CTA ? (
              <button
                onClick={onClaimTimeoutWin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-3 rounded-lg transition-all disabled:opacity-50 shadow-lg text-sm"
              >
                Claim Timeout Victory
              </button>
            ) : (
              <div className={`border-2 rounded-lg p-3 ${
                isTurn ? `${colors.border} ${colors.bg}` : 'border-gray-600/30 bg-gray-800/20 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-300">Time Remaining</span>
                  <span className={`font-mono text-lg font-bold ${colors.text}`}>
                    {timeLeft > 0 ? formatTime(timeLeft) : 'OUT'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colors.bar} transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            )
          )}
        </div>
      );
    };

    return (
      <div>
        {/* Mobile: Consolidated header */}
        {renderMobileConsolidatedHeader()}

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Player 1 - Left side (hidden on mobile) */}
          <div className="hidden xl:block flex-none xl:w-56">
            {renderSidebarPlayerCard(1)}
          </div>

          {/* Center: Board and controls */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            {children}

            {timeoutState && (
              <div className="w-full max-w-md mt-4">
                <MatchTimeoutEscalation
                  timeoutState={timeoutState}
                  matchStatus={matchStatus}
                  isYourTurn={isYourTurn}
                  onClaimTimeoutWin={onClaimTimeoutWin}
                  onForceEliminate={onForceEliminate}
                  onClaimReplacement={onClaimReplacement}
                  loading={loading}
                  escL2Available={match.escL2Available}
                  escL3Available={match.escL3Available}
                  isUserAdvancedForRound={match.isUserAdvancedForRound}
                  hideML1OnMobile={true}
                />
              </div>
            )}

            {renderGameControls?.()}

            {isGameOver && (
              <div className="w-full max-w-md mt-4">
                <MatchComplete
                  isDraw={isDraw}
                  winner={winner}
                  loser={loser}
                  currentAccount={account}
                  gameSpecificText={!isDraw ? theme.completeText : undefined}
                />
              </div>
            )}
          </div>

          {/* Player 2 - Right side (hidden on mobile) */}
          <div className="hidden xl:block flex-none xl:w-56">
            {renderSidebarPlayerCard(2)}
          </div>
        </div>
      </div>
    );
  };

  // Render centered layout (ConnectFour style)
  const renderCenteredLayout = () => {
    // Helper to render desktop player card with timer for centered layout
    const renderCenteredPlayerCard = (playerNum) => {
      const isPlayer1 = playerNum === 1;
      const playerAddress = isPlayer1 ? player1 : player2;
      const isYou = account && playerAddress?.toLowerCase() === account.toLowerCase();
      const isTurn = isPlayer1 ? isPlayer1Turn : isPlayer2Turn;
      const timeLeft = isPlayer1 ? player1TimeLeft : player2TimeLeft;
      const totalTime = match.matchTimePerPlayer ?? 300;
      const progress = ((totalTime - timeLeft) / totalTime) * 100;
      const icon = isPlayer1 ? playerConfig?.player1?.icon : playerConfig?.player2?.icon;
      const label = isPlayer1 ? (playerConfig?.player1?.label || 'Player 1') : (playerConfig?.player2?.label || 'Player 2');
      const colorScheme = isPlayer1 ? theme.player1Color : theme.player2Color;

      // Get color scheme based on remaining time
      const getTimeColors = (timeLeft) => {
        if (timeLeft <= 0) return { text: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500/20', bar: 'bg-red-500' };
        if (timeLeft <= 30) return { text: 'text-red-400', border: 'border-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' };
        if (timeLeft <= 60) return { text: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' };
        return { text: 'text-green-400', border: 'border-green-400', bg: 'bg-green-500/10', bar: 'bg-green-500' };
      };

      const colors = getTimeColors(timeLeft);

      // Format time display
      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Check if ML1 CTA should be shown
      const isPlayer2You = account && player2?.toLowerCase() === account.toLowerCase();
      const player1TimedOut = player1TimeLeft <= 0 && isPlayer1Turn && !isPlayer1You;
      const player2TimedOut = player2TimeLeft <= 0 && isPlayer2Turn && !isPlayer2You;
      const showML1CTAFromTimeout = timeoutState && timeoutState.timeoutActive && matchStatus === 1 && !isYourTurn;
      const showML1CTAFromTimer = matchStatus === 1 && (player1TimedOut || player2TimedOut);
      const showML1CTA = (showML1CTAFromTimeout || showML1CTAFromTimer) && isTurn;

      // Get color config for player card
      const COLOR_CONFIGS = {
        blue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300', activeHighlight: 'bg-cyan-500/30 border-cyan-400' },
        pink: { border: 'border-pink-400/30', bg: 'bg-gradient-to-br from-pink-600/20 to-purple-600/20', iconBg: 'bg-pink-500', text: 'text-pink-300', activeHighlight: 'bg-pink-500/30 border-pink-400' },
        white: { border: 'border-blue-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-white text-black', text: 'text-blue-300', activeHighlight: 'bg-blue-500/30 border-blue-400' },
        black: { border: 'border-pink-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-gray-900 text-white', text: 'text-pink-300', activeHighlight: 'bg-pink-500/30 border-pink-400' },
        neonred: { border: 'border-red-400/30', bg: 'bg-gradient-to-br from-red-600/20 to-rose-600/20', iconBg: 'bg-red-500', text: 'text-red-300', activeHighlight: 'bg-red-500/30 border-red-400' },
        neonblue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300', activeHighlight: 'bg-blue-500/30 border-blue-400' }
      };
      const cardColors = COLOR_CONFIGS[colorScheme] || COLOR_CONFIGS.blue;

      return (
        <div className={`flex-1 relative flex flex-col gap-2 p-3 rounded-lg bg-black/30`}>
          {/* Turn Indicator Badge */}
          {isTurn && !isGameOver && (
            isYou ? (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg animate-bounce z-50">
                YOUR TURN!
              </div>
            ) : (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg z-50">
                THEIR TURN
              </div>
            )
          )}

          {/* Player Info */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
              <div className="text-xs text-gray-400">{label}</div>
              <div className="font-mono text-xs">{playerAddress ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}` : ''}</div>
              {isYou && <span className="text-yellow-400 text-sm font-bold">YOU</span>}
            </div>
          </div>

          {/* Timer Section or ML1 CTA */}
          {showTurnTimer && (
            showML1CTA ? (
              <button
                onClick={onClaimTimeoutWin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg transition-all disabled:opacity-50 shadow-lg text-xs"
              >
                Claim Timeout Victory
              </button>
            ) : (
              <div className={`border-2 rounded-lg p-2 ${
                isTurn ? `${colors.border} ${colors.bg}` : 'border-gray-600/30 bg-gray-800/20 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-300">Time</span>
                  <span className={`font-mono text-sm font-bold ${colors.text}`}>
                    {timeLeft > 0 ? formatTime(timeLeft) : 'OUT'}
                  </span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colors.bar} transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            )
          )}
        </div>
      );
    };

    return (
      <div className="flex flex-col items-center">
        {/* Mobile: Consolidated header */}
        {renderMobileConsolidatedHeader()}

        {/* Desktop: Player Info with Timers - Horizontal (hidden on mobile) */}
        <div className="hidden lg:flex justify-between items-start gap-7 mb-6 max-w-2xl mx-auto w-full">
          {renderCenteredPlayerCard(1)}
          <div className="text-xl font-bold text-gray-500 self-center mt-8">VS</div>
          {renderCenteredPlayerCard(2)}
        </div>

        {/* Board */}
        {children}

        {/* Escalation */}
        {timeoutState && (
          <div className="max-w-md mx-auto mt-6 w-full">
            <MatchTimeoutEscalation
              timeoutState={timeoutState}
              matchStatus={matchStatus}
              isYourTurn={isYourTurn}
              onClaimTimeoutWin={onClaimTimeoutWin}
              onForceEliminate={onForceEliminate}
              onClaimReplacement={onClaimReplacement}
              loading={loading}
              escL2Available={match.escL2Available}
              escL3Available={match.escL3Available}
              isUserAdvancedForRound={match.isUserAdvancedForRound}
              hideML1OnMobile={true}
            />
          </div>
        )}

        {renderGameControls?.()}
      </div>
    );
  };

  // Render players-board-history layout (Elite archive style)
  const renderPlayersBoardHistoryLayout = () => {
    // Helper to render desktop player card with timer for history layout
    const renderHistoryPlayerCard = (playerNum) => {
      const isPlayer1 = playerNum === 1;
      const playerAddress = isPlayer1 ? player1 : player2;
      const isYou = account && playerAddress?.toLowerCase() === account.toLowerCase();
      const isTurn = isPlayer1 ? isPlayer1Turn : isPlayer2Turn;
      const timeLeft = isPlayer1 ? player1TimeLeft : player2TimeLeft;
      const totalTime = match.matchTimePerPlayer ?? 300;
      const progress = ((totalTime - timeLeft) / totalTime) * 100;
      const icon = isPlayer1 ? playerConfig?.player1?.icon : playerConfig?.player2?.icon;
      const label = isPlayer1 ? (playerConfig?.player1?.label || 'Player 1') : (playerConfig?.player2?.label || 'Player 2');
      const colorScheme = isPlayer1 ? theme.player1Color : theme.player2Color;
      const extraContent = isPlayer1 ? renderPlayer1Extra?.() : renderPlayer2Extra?.();

      // Get color scheme based on remaining time
      const getTimeColors = (timeLeft) => {
        if (timeLeft <= 0) return { text: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500/20', bar: 'bg-red-500' };
        if (timeLeft <= 30) return { text: 'text-red-400', border: 'border-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' };
        if (timeLeft <= 60) return { text: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' };
        return { text: 'text-green-400', border: 'border-green-400', bg: 'bg-green-500/10', bar: 'bg-green-500' };
      };

      const colors = getTimeColors(timeLeft);

      // Format time display
      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Check if ML1 CTA should be shown
      const isPlayer2You = account && player2?.toLowerCase() === account.toLowerCase();
      const player1TimedOut = player1TimeLeft <= 0 && isPlayer1Turn && !isPlayer1You;
      const player2TimedOut = player2TimeLeft <= 0 && isPlayer2Turn && !isPlayer2You;
      const showML1CTAFromTimeout = timeoutState && timeoutState.timeoutActive && matchStatus === 1 && !isYourTurn;
      const showML1CTAFromTimer = matchStatus === 1 && (player1TimedOut || player2TimedOut);
      const showML1CTA = (showML1CTAFromTimeout || showML1CTAFromTimer) && isTurn;

      // Get color config for player card
      const COLOR_CONFIGS = {
        blue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' },
        pink: { border: 'border-pink-400/30', bg: 'bg-gradient-to-br from-pink-600/20 to-purple-600/20', iconBg: 'bg-pink-500', text: 'text-pink-300' },
        white: { border: 'border-blue-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-white text-black', text: 'text-blue-300' },
        black: { border: 'border-pink-500/30', bg: 'bg-slate-900/50', iconBg: 'bg-gray-900 text-white', text: 'text-pink-300' },
        neonred: { border: 'border-red-400/30', bg: 'bg-gradient-to-br from-red-600/20 to-rose-600/20', iconBg: 'bg-red-500', text: 'text-red-300' },
        neonblue: { border: 'border-blue-400/30', bg: 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20', iconBg: 'bg-blue-500', text: 'text-blue-300' }
      };
      const cardColors = COLOR_CONFIGS[colorScheme] || COLOR_CONFIGS.blue;

      return (
        <div className={`relative ${cardColors.bg} backdrop-blur-lg rounded-2xl p-6 border-2 ${cardColors.border}`}>
          {/* Turn Indicator Badge */}
          {isTurn && !isGameOver && (
            isYou ? (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg animate-bounce z-50">
                YOUR TURN!
              </div>
            ) : (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg z-50">
                THEIR TURN
              </div>
            )
          )}

          {/* Player Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 ${cardColors.iconBg} rounded-full flex items-center justify-center text-2xl font-bold border-2 ${cardColors.border}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{label}</h3>
              <p className={`${cardColors.text} font-mono text-sm`}>
                {playerAddress ? `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}` : ''}
              </p>
              {isYou && <span className="text-yellow-400 text-sm font-bold">YOU</span>}
            </div>
          </div>

          {/* Extra Content */}
          {extraContent && <div className="mb-4">{extraContent}</div>}

          {/* Timer Section or ML1 CTA */}
          {showTurnTimer && (
            showML1CTA ? (
              <button
                onClick={onClaimTimeoutWin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-3 rounded-lg transition-all disabled:opacity-50 shadow-lg text-sm"
              >
                Claim Timeout Victory
              </button>
            ) : (
              <div className={`border-2 rounded-lg p-2.5 ${
                isTurn ? `${colors.border} ${colors.bg}` : 'border-gray-600/30 bg-gray-800/20 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-300">Time Remaining</span>
                  <span className={`font-mono text-base font-bold ${colors.text}`}>
                    {timeLeft > 0 ? formatTime(timeLeft) : 'OUT'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colors.bar} transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            )
          )}
        </div>
      );
    };

    return (
      <>
        {/* Mobile Layout (< lg breakpoint) */}
        <div className="lg:hidden space-y-3">
          {/* Mobile: Consolidated header */}
          {renderMobileConsolidatedHeader()}

          {/* Board */}
          <div className="flex justify-center">
            {children}
          </div>

          {/* Other controls */}
          {timeoutState && (
            <MatchTimeoutEscalation
              timeoutState={timeoutState}
              matchStatus={matchStatus}
              isYourTurn={isYourTurn}
              onClaimTimeoutWin={onClaimTimeoutWin}
              onForceEliminate={onForceEliminate}
              onClaimReplacement={onClaimReplacement}
              loading={loading}
              escL2Available={match.escL2Available}
              escL3Available={match.escL3Available}
              isUserAdvancedForRound={match.isUserAdvancedForRound}
              hideML1OnMobile={true}
            />
          )}

          {renderGameControls?.()}

          {isGameOver && (
            <MatchComplete
              isDraw={isDraw}
              winner={winner}
              loser={loser}
              currentAccount={account}
              gameSpecificText={!isDraw ? theme.completeText : undefined}
            />
          )}

          {/* Move History - Mobile Section */}
          {renderMoveHistory && (
            <div style={{ marginTop: '24px' }} className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/30">
              {renderMoveHistory()}
            </div>
          )}
        </div>

        {/* Desktop Layout (>= lg breakpoint) - Three-column layout with timers */}
        <div className="hidden lg:grid lg:grid-cols-[18%_52%_30%] gap-4 items-start">
          {/* Left Column - Both Player Panels with Timers */}
          <div className="space-y-7 max-h-[800px] overflow-y-auto pr-2 pt-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-pink-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
            {renderHistoryPlayerCard(1)}
            {renderHistoryPlayerCard(2)}
          </div>

          {/* Center Column - Board */}
          <div className="flex flex-col items-center w-full">
            {children}

            {timeoutState && (
              <div className="w-full max-w-md mt-4">
                <MatchTimeoutEscalation
                  timeoutState={timeoutState}
                  matchStatus={matchStatus}
                  isYourTurn={isYourTurn}
                  onClaimTimeoutWin={onClaimTimeoutWin}
                  onForceEliminate={onForceEliminate}
                  onClaimReplacement={onClaimReplacement}
                  loading={loading}
                  escL2Available={match.escL2Available}
                  escL3Available={match.escL3Available}
                  isUserAdvancedForRound={match.isUserAdvancedForRound}
                  hideML1OnMobile={true}
                />
              </div>
            )}

            {renderGameControls?.()}

            {isGameOver && (
              <div className="w-full max-w-md mt-4">
                <MatchComplete
                  isDraw={isDraw}
                  winner={winner}
                  loser={loser}
                  currentAccount={account}
                  gameSpecificText={!isDraw ? theme.completeText : undefined}
                />
              </div>
            )}
          </div>

          {/* Right Column - Move History or Match Info */}
          <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30 max-h-[800px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-pink-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
            {renderMoveHistory ? (
              renderMoveHistory()
            ) : (
              <div className="text-center py-8 text-purple-300/60">
                <p className="text-sm">No move history available</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Select layout renderer
  const renderLayout = () => {
    switch (layout) {
      case 'sidebar':
        return renderSidebarLayout();
      case 'centered':
        return renderCenteredLayout();
      case 'players-board-history':
        return renderPlayersBoardHistoryLayout();
      case 'three-column':
      default:
        return renderThreeColumnLayout();
    }
  };

  return (
    <div className="mb-16">
      {/* Header */}
      <MatchHeader
        gameType={gameType}
        title={theme.title}
        icon={theme.icon}
        matchStatus={matchStatus}
        isDraw={isDraw}
        onClose={onClose}
        tournamentInfo={{
          tierId: match.tierId,
          instanceId: match.instanceId,
          roundNumber: match.roundNumber,
          matchNumber: match.matchNumber,
          playerCount: playerCount
        }}
        theme={theme}
      />

      {/* Main Layout */}
      {renderLayout()}

      {/* Move History (optional) - Only show if NOT using players-board-history layout */}
      {renderMoveHistory && layout !== 'players-board-history' && (
        <div style={{ marginTop: '24px' }} className="bg-slate-900/50 rounded-xl p-4 lg:p-6 border border-purple-500/30">
          {renderMoveHistory()}
        </div>
      )}

      {/* Match Info Grid (optional) */}
      {renderMatchInfo && (
        <div className="mt-6">
          {renderMatchInfo()}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && <LoadingOverlay />}
    </div>
  );
};

export default GameMatchLayout;
