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
 * An "advanced" player is either:
 * 1. Playing in a round HIGHER than the stalled match round (handles bye/auto-advance), OR
 * 2. Has MORE wins than the stalled match round number
 *
 * Example: Round 0 stalled match requires player to have > 0 wins OR be in round 1+
 * Example: Round 1 stalled match requires player to have > 1 wins OR be in round 2+
 *
 * @param {Array} rounds - Tournament rounds data from bracket
 * @param {string} playerAddress - Player's wallet address
 * @param {number} stalledMatchRound - Round number of the stalled match (0-indexed)
 * @returns {boolean} True if player is advanced enough
 */
export const isAdvancedPlayer = (rounds, playerAddress, stalledMatchRound) => {
  if (!rounds || !playerAddress) return false;

  const normalizedAddress = playerAddress.toLowerCase();

  // Check 1: Is player in a round higher than the stalled round?
  // This handles byes/auto-advances where a player progresses without winning.
  // Works for ALL future rounds - if you got a bye in round 0 and are now in round 3,
  // you're still advanced relative to any stalled match in rounds 0, 1, or 2.
  for (const round of rounds) {
    if (round.roundNumber > stalledMatchRound) {
      for (const match of round.matches) {
        if (match.player1?.toLowerCase() === normalizedAddress ||
            match.player2?.toLowerCase() === normalizedAddress) {
          console.log(`[isAdvancedPlayer] ${playerAddress.slice(0,10)} is in round ${round.roundNumber} > stalled round ${stalledMatchRound} - ADVANCED (higher round)`);
          return true;
        }
      }
    }
  }

  // Check 2: Count ALL wins (including from future rounds)
  const playerWins = calculatePlayerWins(rounds, playerAddress, null);
  const requiredWins = stalledMatchRound; // Need MORE than stalled round number
  const isAdvanced = playerWins > requiredWins;

  console.log(`[isAdvancedPlayer] Checking ${playerAddress.slice(0,10)} for round ${stalledMatchRound}:`, {
    playerWins,
    requiredWins: `> ${requiredWins}`,
    isAdvanced
  });

  return isAdvanced;
};
