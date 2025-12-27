/**
 * Tournament Helper Functions
 * Utilities for calculating player statistics and tournament state
 */

/**
 * Calculate how many matches a player has won in a tournament
 * @param {Array} rounds - Tournament rounds data from bracket
 * @param {string} playerAddress - Player's wallet address
 * @param {number} upToRound - Only count wins up to this round (exclusive)
 * @returns {number} Number of matches won
 */
export const calculatePlayerWins = (rounds, playerAddress, upToRound = null) => {
  if (!rounds || !playerAddress) return 0;

  const normalizedAddress = playerAddress.toLowerCase();
  let wins = 0;

  for (const round of rounds) {
    // If upToRound specified, stop counting at that round
    if (upToRound !== null && round.roundNumber >= upToRound) break;

    for (const match of round.matches) {
      // Only count completed matches with a winner
      if (match.matchStatus === 2 && match.winner) {
        if (match.winner.toLowerCase() === normalizedAddress) {
          wins++;
        }
      }
    }
  }

  return wins;
};

/**
 * Check if a player is "advanced" enough to force eliminate a stalled match
 * An "advanced" player has won matches >= (stalled_match_round + 1)
 *
 * Example: Round 2 stalled match requires player to have 3 wins (advanced to round 3 or beyond)
 *
 * @param {Array} rounds - Tournament rounds data from bracket
 * @param {string} playerAddress - Player's wallet address
 * @param {number} stalledMatchRound - Round number of the stalled match
 * @returns {boolean} True if player is advanced enough
 */
export const isAdvancedPlayer = (rounds, playerAddress, stalledMatchRound) => {
  if (!playerAddress) return false;

  const playerWins = calculatePlayerWins(rounds, playerAddress, null);
  const requiredWins = stalledMatchRound + 1;

  return playerWins >= requiredWins;
};
