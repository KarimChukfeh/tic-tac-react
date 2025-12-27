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
    player1Color: 'red',
    player2Color: 'blue',
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

  // Player configuration
  playerConfig, // { player1: { icon, label }, player2: { icon, label } }

  // Layout
  layout = 'three-column', // 'three-column' | 'sidebar' | 'centered'

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

  // Render three-column layout (TicTacToe style)
  const renderThreeColumnLayout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Player 1 */}
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

      {/* Center Panel - Board */}
      <div className={`bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30`}>
        <h3 className="text-2xl font-bold text-center text-white mb-6">Game Board</h3>
        {children}

        {/* Game Controls */}
        <div className="space-y-3 mt-6">
          {showTurnTimer && (
            <TurnTimer
              match={match}
              account={account}
              onClaimTimeoutWin={onClaimTimeoutWin}
              loading={loading}
            />
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

      {/* Right Panel - Player 2 */}
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
  );

  // Render sidebar layout (Chess style)
  const renderSidebarLayout = () => (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Player Cards - Side by side on mobile/tablet, stacked on left for desktop */}
      <div className="flex flex-row xl:flex-col gap-4 xl:w-56 shrink-0">
        <PlayerPanel
          playerAddress={player1}
          currentAccount={account}
          isCurrentTurn={isPlayer1Turn}
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
          isCurrentTurn={isPlayer2Turn}
          isGameOver={isGameOver}
          icon={playerConfig?.player2?.icon}
          label={playerConfig?.player2?.label || 'Player 2'}
          colorScheme={theme.player2Color}
          variant="full"
          extraContent={renderPlayer2Extra?.()}
        />
      </div>

      {/* Center: Board and controls */}
      <div className="flex-1 flex flex-col items-center min-w-0">
        {children}

        {showTurnTimer && (
          <div className="w-full max-w-md mt-4">
            <TurnTimer
              match={match}
              account={account}
              onClaimTimeoutWin={onClaimTimeoutWin}
              loading={loading}
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
    </div>
  );

  // Render centered layout (ConnectFour style)
  const renderCenteredLayout = () => (
    <div className="flex flex-col items-center">
      {/* Turn Indicator */}
      <div className="flex justify-center mb-6">
        <TurnIndicator
          isYourTurn={isYourTurn}
          isGameOver={isGameOver}
          hasWinner={hasWinner}
          userWon={userWon}
          isDraw={isDraw}
        />
      </div>

      {/* Player Info - Horizontal */}
      <div className="flex justify-between items-center mb-6 max-w-md mx-auto w-full">
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

      {/* Turn Timer */}
      {showTurnTimer && (
        <div className="max-w-md mx-auto mt-6 w-full">
          <TurnTimer
            match={match}
            account={account}
            onClaimTimeoutWin={onClaimTimeoutWin}
            loading={loading}
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
          />
        </div>
      )}

      {renderGameControls?.()}
    </div>
  );

  // Select layout renderer
  const renderLayout = () => {
    switch (layout) {
      case 'sidebar':
        return renderSidebarLayout();
      case 'centered':
        return renderCenteredLayout();
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
        syncDots={syncDots}
        matchStatus={matchStatus}
        isDraw={isDraw}
        onClose={onClose}
        tournamentInfo={{
          tierId: match.tierId,
          instanceId: match.instanceId,
          roundNumber: match.roundNumber,
          matchNumber: match.matchNumber
        }}
        theme={theme}
      />

      {/* Main Layout */}
      {renderLayout()}

      {/* Move History (optional) */}
      {renderMoveHistory && (
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
