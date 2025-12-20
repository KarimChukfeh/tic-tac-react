/**
 * TurnIndicator - Shared component for displaying turn status
 *
 * Shows "Your Turn!", "Opponent's Turn", or game over states
 * with appropriate styling and animations.
 */

const TurnIndicator = ({
  isYourTurn,
  isGameOver,
  hasWinner,
  userWon,
  isDraw
}) => {
  if (isGameOver) {
    if (isDraw) {
      return (
        <div className="px-6 py-3 rounded-xl font-bold text-lg bg-yellow-500/20 border-2 border-yellow-400 text-yellow-300">
          It's a Draw!
        </div>
      );
    }
    if (hasWinner) {
      return (
        <div className={`px-6 py-3 rounded-xl font-bold text-lg ${
          userWon
            ? 'bg-green-500/20 border-2 border-green-400 text-green-300'
            : 'bg-purple-500/20 border-2 border-purple-400 text-purple-300'
        }`}>
          {userWon ? 'You Won!' : 'You Lost'}
        </div>
      );
    }
  }

  return (
    <div className={`px-6 py-3 rounded-xl font-bold text-lg ${
      isYourTurn
        ? 'bg-green-500/20 border-2 border-green-400 text-green-300 animate-pulse'
        : 'bg-gray-500/20 border-2 border-gray-400 text-gray-300'
    }`}>
      {isYourTurn ? "Your Turn!" : "Opponent's Turn"}
    </div>
  );
};

export default TurnIndicator;
