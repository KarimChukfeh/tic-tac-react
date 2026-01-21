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

    // Check if ML1 CTA should be shown (timeout active and not user's turn)
    const showML1CTA = timeoutState && timeoutState.timeoutActive && matchStatus === 1 && !isYourTurn;

    return (
      <div className="lg:hidden space-y-3 mb-6">
        {/* Row 1: Player cards (with addresses and assignments) */}
        <div className="grid grid-cols-2 gap-3">
          <PlayerPanel
            playerAddress={player1}
            currentAccount={account}
            isCurrentTurn={isPlayer1Turn && isPlayer1You}
            isGameOver={isGameOver}
            icon={playerConfig?.player1?.icon}
            label={playerConfig?.player1?.label || 'Player 1'}
            colorScheme={theme.player1Color}
            variant="compact"
            extraContent={renderPlayer1Extra?.()}
          />
          <PlayerPanel
            playerAddress={player2}
            currentAccount={account}
            isCurrentTurn={isPlayer2Turn && !isPlayer1You && account?.toLowerCase() === player2?.toLowerCase()}
            isGameOver={isGameOver}
            icon={playerConfig?.player2?.icon}
            label={playerConfig?.player2?.label || 'Player 2'}
            colorScheme={theme.player2Color}
            variant="compact"
            extraContent={renderPlayer2Extra?.()}
          />
        </div>

        {/* Row 2: Player timers OR ML1 CTA (aligned with player cards) */}
        {showTurnTimer && (
          <div className="grid grid-cols-2 gap-3">
            {/* Player 1 Timer or ML1 CTA */}
            {showML1CTA && !isPlayer1Turn ? (
              <button
                onClick={onClaimTimeoutWin}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50 text-sm"
              >
                Claim Timeout Victory
              </button>
            ) : (
              <div className={`border rounded-lg p-2 ${
                isPlayer1Turn ? `${player1Colors.border} ${player1Colors.bg}` : 'border-gray-600/30 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-purple-300">Time</span>
                  <span className={`font-mono text-sm font-bold ${player1Colors.text}`}>
                    {player1TimeLeft > 0 ? formatTime(player1TimeLeft) : 'OUT'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${player1Colors.bar}`} style={{ width: `${Math.min(player1Progress, 100)}%` }} />
                </div>
              </div>
            )}

            {/* Player 2 Timer or ML1 CTA */}
            {showML1CTA && !isPlayer2Turn ? (
              <button
                onClick={onClaimTimeoutWin}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50 text-sm"
              >
                Claim Timeout Victory
              </button>
            ) : (
              <div className={`border rounded-lg p-2 ${
                isPlayer2Turn ? `${player2Colors.border} ${player2Colors.bg}` : 'border-gray-600/30 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-pink-300">Time</span>
                  <span className={`font-mono text-sm font-bold ${player2Colors.text}`}>
                    {player2TimeLeft > 0 ? formatTime(player2TimeLeft) : 'OUT'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${player2Colors.bar}`} style={{ width: `${Math.min(player2Progress, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render three-column layout (TicTacToe style)
  const renderThreeColumnLayout = () => (
    <div>
      {/* Mobile: Consolidated header with player cards, timers, and turn indicator */}
      {renderMobileConsolidatedHeader()}

      {/* Desktop: Three column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Player 1 (hidden on mobile) */}
        <div className="hidden lg:block">
          <PlayerPanel
            playerAddress={player1}
            currentAccount={account}
            isCurrentTurn={isPlayer1Turn && isPlayer1You}
            isGameOver={isGameOver}
            icon={playerConfig?.player1?.icon}
            label={playerConfig?.player1?.label || 'Player 1'}
            colorScheme={theme.player1Color}
            variant="full"
            renderStats={renderPlayer1Stats}
            extraContent={renderPlayer1Extra?.()}
          />
        </div>

        {/* Center Panel - Board */}
        <div className={`bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30 lg:col-span-1`}>
          <h3 className="text-2xl font-bold text-center text-white mb-6">Game Board</h3>
          {children}

          {/* Game Controls */}
          <div className="space-y-3 mt-6">
            {/* Desktop: Show timer inside board panel */}
            {showTurnTimer && (
              <div className="hidden lg:block">
                <TurnTimer
                  match={match}
                  account={account}
                  onClaimTimeoutWin={onClaimTimeoutWin}
                  loading={loading}
                  syncDots={syncDots}
                  isSpectator={isSpectator}
                  playerConfig={playerConfig}
                />
              </div>
            )}

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
          <PlayerPanel
            playerAddress={player2}
            currentAccount={account}
            isCurrentTurn={isPlayer2Turn && !isPlayer1You && account?.toLowerCase() === player2?.toLowerCase()}
            isGameOver={isGameOver}
            icon={playerConfig?.player2?.icon}
            label={playerConfig?.player2?.label || 'Player 2'}
            colorScheme={theme.player2Color}
            variant="full"
            renderStats={renderPlayer2Stats}
            extraContent={renderPlayer2Extra?.()}
          />
        </div>
      </div>
    </div>
  );

  // Render sidebar layout (Chess style)
  const renderSidebarLayout = () => (
    <div>
      {/* Mobile: Consolidated header */}
      {renderMobileConsolidatedHeader()}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Player 1 - Left side (hidden on mobile) */}
        <div className="hidden xl:block flex-none xl:w-56">
          <PlayerPanel
            playerAddress={player1}
            currentAccount={account}
            isCurrentTurn={isPlayer1Turn && isPlayer1You}
            isGameOver={isGameOver}
            icon={playerConfig?.player1?.icon}
            label={playerConfig?.player1?.label || 'Player 1'}
            colorScheme={theme.player1Color}
            variant="full"
            extraContent={renderPlayer1Extra?.()}
          />
        </div>

        {/* Center: Board and controls */}
        <div className="flex-1 flex flex-col items-center min-w-0">
          {children}

          {/* Desktop: Timer (hidden on mobile) */}
          {showTurnTimer && (
            <div className="hidden xl:block w-full max-w-md mt-4">
              <TurnTimer
                match={match}
                account={account}
                onClaimTimeoutWin={onClaimTimeoutWin}
                loading={loading}
                syncDots={syncDots}
                isSpectator={isSpectator}
                playerConfig={playerConfig}
              />
            </div>
          )}

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
          <PlayerPanel
            playerAddress={player2}
            currentAccount={account}
            isCurrentTurn={isPlayer2Turn && account?.toLowerCase() === player2?.toLowerCase()}
            isGameOver={isGameOver}
            icon={playerConfig?.player2?.icon}
            label={playerConfig?.player2?.label || 'Player 2'}
            colorScheme={theme.player2Color}
            variant="full"
            extraContent={renderPlayer2Extra?.()}
          />
        </div>
      </div>
    </div>
  );

  // Render centered layout (ConnectFour style)
  const renderCenteredLayout = () => (
    <div className="flex flex-col items-center">
      {/* Mobile: Consolidated header */}
      {renderMobileConsolidatedHeader()}

      {/* Desktop: Turn Indicator (hidden on mobile since it's in consolidated header) */}
      <div className="hidden lg:flex justify-center mb-6">
        <TurnIndicator
          isYourTurn={isYourTurn}
          isGameOver={isGameOver}
          hasWinner={hasWinner}
          userWon={userWon}
          isDraw={isDraw}
        />
      </div>

      {/* Desktop: Player Info - Horizontal (hidden on mobile) */}
      <div className="hidden lg:flex justify-between items-center mb-6 max-w-md mx-auto w-full">
        <PlayerPanel
          playerAddress={player1}
          currentAccount={account}
          isCurrentTurn={isPlayer1Turn}
          isGameOver={isGameOver}
          icon={playerConfig?.player1?.icon}
          label={playerConfig?.player1?.label || 'Player 1'}
          colorScheme={theme.player1Color}
          variant="compact"
        />
        <div className="text-xl font-bold text-gray-500">VS</div>
        <PlayerPanel
          playerAddress={player2}
          currentAccount={account}
          isCurrentTurn={isPlayer2Turn}
          isGameOver={isGameOver}
          icon={playerConfig?.player2?.icon}
          label={playerConfig?.player2?.label || 'Player 2'}
          colorScheme={theme.player2Color}
          variant="compact"
        />
      </div>

      {/* Board */}
      {children}

      {/* Desktop: Turn Timer (hidden on mobile) */}
      {showTurnTimer && (
        <div className="hidden lg:block max-w-md mx-auto mt-6 w-full">
          <TurnTimer
            match={match}
            account={account}
            onClaimTimeoutWin={onClaimTimeoutWin}
            loading={loading}
            syncDots={syncDots}
            isSpectator={isSpectator}
            playerConfig={playerConfig}
          />
        </div>
      )}

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

  // Render players-board-history layout (Elite archive style)
  const renderPlayersBoardHistoryLayout = () => (
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

        {/* Move History - hidden on mobile by default */}
        {/* Future enhancement: Add collapsible toggle here if needed */}
      </div>

      {/* Desktop Layout (>= lg breakpoint) - Original three-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[18%_52%_30%] gap-4 items-start">
        {/* Left Column - Both Player Panels */}
        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 pt-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-pink-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
          <PlayerPanel
            playerAddress={player1}
            currentAccount={account}
            isCurrentTurn={isPlayer1Turn && isPlayer1You}
            isGameOver={isGameOver}
            icon={playerConfig?.player1?.icon}
            label={playerConfig?.player1?.label || 'Player 1'}
            colorScheme={theme.player1Color}
            variant="full"
            extraContent={renderPlayer1Extra?.()}
          />
          <PlayerPanel
            playerAddress={player2}
            currentAccount={account}
            isCurrentTurn={isPlayer2Turn && account?.toLowerCase() === player2?.toLowerCase()}
            isGameOver={isGameOver}
            icon={playerConfig?.player2?.icon}
            label={playerConfig?.player2?.label || 'Player 2'}
            colorScheme={theme.player2Color}
            variant="full"
            extraContent={renderPlayer2Extra?.()}
          />
        </div>

        {/* Center Column - Board */}
        <div className="flex flex-col items-center w-full">
          {children}

          {showTurnTimer && (
            <div className="w-full max-w-md mt-4">
              <TurnTimer
                match={match}
                account={account}
                onClaimTimeoutWin={onClaimTimeoutWin}
                loading={loading}
                syncDots={syncDots}
                isSpectator={isSpectator}
                playerConfig={playerConfig}
              />
            </div>
          )}

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
        <div className="mt-6">
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
