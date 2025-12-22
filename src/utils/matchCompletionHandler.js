/**
 * Match Completion Handler
 *
 * Standardized utility for handling match completion detection and determining
 * result types (win/lose/draw/forfeit) across all games.
 */

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Determine the match result from the perspective of the current user
 *
 * @param {Object} params
 * @param {Object} params.updatedMatch - The updated match data from contract
 * @param {Object} params.previousMatch - The previous match state for comparison
 * @param {string} params.userAccount - Current user's wallet address
 * @param {string} params.gameType - Game type for player labels ('tictactoe' | 'chess' | 'connectfour')
 * @returns {Object|null} Result object with type, labels, and addresses, or null if no completion
 */
export const determineMatchResult = ({
  updatedMatch,
  previousMatch,
  userAccount,
  gameType = 'game'
}) => {
  // Check if match just completed
  const matchWasCompleted =
    updatedMatch.matchStatus === 2 && previousMatch.matchStatus !== 2;

  if (!matchWasCompleted) {
    return null; // Match hasn't completed
  }

  // Check if user is a participant
  const wasParticipant =
    updatedMatch.player1.toLowerCase() === userAccount.toLowerCase() ||
    updatedMatch.player2.toLowerCase() === userAccount.toLowerCase();

  if (!wasParticipant) {
    console.warn('Match completed but user is not a participant');
    return null; // User is spectator
  }

  // Determine user status
  const userWon = updatedMatch.winner?.toLowerCase() === userAccount.toLowerCase();
  const userLost = updatedMatch.loser?.toLowerCase() === userAccount.toLowerCase();

  // Double forfeit check (both addresses are zero)
  const isDoubleForfeited =
    updatedMatch.winner?.toLowerCase() === ZERO_ADDRESS &&
    updatedMatch.loser?.toLowerCase() === ZERO_ADDRESS &&
    !updatedMatch.isDraw;

  // Determine winner/loser labels based on game type and player position
  const winnerIsPlayer1 =
    updatedMatch.winner?.toLowerCase() === updatedMatch.player1?.toLowerCase();

  const playerLabels = getPlayerLabels(gameType);
  const winnerLabel = winnerIsPlayer1 ? playerLabels.player1 : playerLabels.player2;

  // Determine result type
  let resultType = null;

  // Case 1: Draw
  if (updatedMatch.isDraw) {
    resultType = 'draw';
    return {
      type: resultType,
      winnerLabel: '',
      winnerAddress: ZERO_ADDRESS,
      loserAddress: ZERO_ADDRESS
    };
  }

  // Case 2: Double forfeit (both players eliminated)
  if (isDoubleForfeited) {
    resultType = 'double_forfeit';
    return {
      type: resultType,
      winnerLabel: '',
      winnerAddress: ZERO_ADDRESS,
      loserAddress: ZERO_ADDRESS
    };
  }

  // Case 3: Timeout/Forfeit scenarios
  if (updatedMatch.isTimedOut) {
    if (userWon) {
      resultType = 'forfeit_win';
    } else if (userLost) {
      resultType = 'forfeit_lose';
    } else {
      console.warn('Timeout match completed but user is neither winner nor loser');
      return null;
    }

    return {
      type: resultType,
      winnerLabel,
      winnerAddress: updatedMatch.winner,
      loserAddress: updatedMatch.loser
    };
  }

  // Case 4: Normal win/loss (by gameplay)
  if (userWon) {
    resultType = 'win';
  } else if (userLost) {
    resultType = 'lose';
  } else {
    console.warn('Match completed but user is neither winner nor loser');
    return null;
  }

  return {
    type: resultType,
    winnerLabel,
    winnerAddress: updatedMatch.winner,
    loserAddress: updatedMatch.loser
  };
};

/**
 * Get player labels for a specific game type
 *
 * @param {string} gameType - The game type
 * @returns {Object} Player labels
 */
const getPlayerLabels = (gameType) => {
  switch (gameType) {
    case 'tictactoe':
      return { player1: 'Player 1 (X)', player2: 'Player 2 (O)' };
    case 'chess':
      return { player1: 'White', player2: 'Black' };
    case 'connectfour':
      return { player1: 'Player 1 (Red)', player2: 'Player 2 (Yellow)' };
    default:
      return { player1: 'Player 1', player2: 'Player 2' };
  }
};

/**
 * Validate match result consistency
 *
 * @param {Object} match - Match data to validate
 * @returns {boolean} True if valid
 */
export const validateMatchCompletion = (match) => {
  const { winner, loser, player1, player2, isDraw, matchStatus } = match;

  // If match is completed and not a draw
  if (matchStatus === 2 && !isDraw) {
    // Winner must be one of the players (unless double forfeit)
    if (winner !== player1 && winner !== player2 && winner !== ZERO_ADDRESS) {
      console.error('Invalid winner: not a match participant');
      return false;
    }

    // Loser must be the other player (unless double forfeit)
    if (loser !== ZERO_ADDRESS) {
      if (winner === player1 && loser !== player2) {
        console.error('Invalid loser: should be player2');
        return false;
      }
      if (winner === player2 && loser !== player1) {
        console.error('Invalid loser: should be player1');
        return false;
      }
    }

    // Winner and loser should not be the same (unless both zero for double forfeit)
    if (winner === loser && winner !== ZERO_ADDRESS) {
      console.error('Invalid match result: winner equals loser');
      return false;
    }
  }

  // If it's a draw, neither should be a winner/loser (should be zero addresses)
  if (isDraw && matchStatus === 2) {
    if (winner !== ZERO_ADDRESS || loser !== ZERO_ADDRESS) {
      console.warn('Draw match has winner/loser addresses set');
    }
  }

  return true;
};
