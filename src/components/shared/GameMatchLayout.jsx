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
              syncDots={syncDots}
              isSpectator={isSpectator}
              playerConfig={playerConfig}
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
              escL2Available={match.escL2Available}
              escL3Available={match.escL3Available}
              isUserAdvancedForRound={match.isUserAdvancedForRound}
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
      {/* Player 1 - Left side */}
      <div className="flex-none xl:w-56">
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

      {/* Player 2 - Right side */}
      <div className="flex-none xl:w-56">
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
            tournamentRounds={tournamentRounds}
            currentAccount={account}
            currentRoundNumber={currentRoundNumber}
          />
        </div>
      )}

      {renderGameControls?.()}
    </div>
  );

  // Render players-board-history layout (Elite archive style)
  const renderPlayersBoardHistoryLayout = () => (
    <div className="grid grid-cols-1 xl:grid-cols-[20%_60%_20%] gap-4 items-start">
      {/* Left Column - Both Player Panels */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-pink-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
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
      <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/30 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/60 [&::-webkit-scrollbar-thumb]:to-pink-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
        {renderMoveHistory ? (
          renderMoveHistory()
        ) : (
          <div className="text-center py-8 text-purple-300/60">
            <p className="text-sm">No move history available</p>
          </div>
        )}
      </div>
    </div>
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
