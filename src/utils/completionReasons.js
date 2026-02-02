/**
 * Completion Reason Utilities
 *
 * Handles CompletionReason enum from smart contracts and provides
 * user-friendly messages for match endings.
 */

// CompletionReason enum values (matches ETour_Storage.CompletionReason)
export const CompletionReason = {
  NORMAL_WIN: 0,                    // Normal gameplay win (checkmate, connect 4, etc.)
  TIMEOUT: 1,                       // Win by opponent timeout (ML1)
  DRAW: 2,                          // Match/finals ended in a draw
  FORCE_ELIMINATION: 3,             // ML2 - Advanced players force eliminated both players
  REPLACEMENT: 4,                   // ML3 - External player replaced stalled players
  ALL_DRAW_SCENARIO: 5,             // All matches in a round resulted in draws (tournament only)
  SOLO_ENROLL_FORCE_START: 6,       // Solo enroller force started tournament (EL1)
  ABANDONED_TOURNAMENT_CLAIMED: 7   // Abandoned tournament claimed by external player (EL2)
};

/**
 * Get completion reason text for display
 * @param {number} reason - CompletionReason enum value
 * @param {boolean} userWon - Whether the current user won
 * @param {boolean} isDraw - Whether it was a draw
 * @param {string} gameType - 'tictactoe', 'chess', or 'connect4'
 * @returns {string} User-friendly completion message
 */
export const getCompletionReasonText = (reason, userWon, isDraw, gameType = 'tictactoe') => {
  // Check draw first (reason might be DRAW or user's won/lost status shows draw)
  if (isDraw || reason === CompletionReason.DRAW) {
    return "It's a Draw!";
  }

  switch (reason) {
    case CompletionReason.NORMAL_WIN:
      if (userWon) {
        // Game-specific victory messages
        if (gameType === 'chess') return 'Checkmate!';
        if (gameType === 'connect4') return 'Connect Four!';
        return 'You Won!';
      } else {
        return 'Defeated';
      }

    case CompletionReason.TIMEOUT:
      if (userWon) {
        return 'Victory by Timeout!';
      } else {
        return 'Lost by Timeout';
      }

    case CompletionReason.FORCE_ELIMINATION:
      return 'Force Eliminated';

    case CompletionReason.REPLACEMENT:
      return 'Replaced by External Player';

    case CompletionReason.ALL_DRAW_SCENARIO:
      return "Tournament Draw";

    case CompletionReason.SOLO_ENROLL_FORCE_START:
      return 'Solo Force Start';

    case CompletionReason.ABANDONED_TOURNAMENT_CLAIMED:
      return 'Abandoned Pool Claimed';

    default:
      return userWon ? 'Victory!' : 'Defeated';
  }
};

/**
 * Get detailed completion reason description
 * @param {number} reason - CompletionReason enum value
 * @param {boolean} userWon - Whether the current user won
 * @param {boolean} isDraw - Whether it was a draw
 * @returns {string} Detailed description
 */
export const getCompletionReasonDescription = (reason, userWon, isDraw) => {
  // Check draw first
  if (isDraw || reason === CompletionReason.DRAW) {
    return 'The match ended in a draw';
  }

  switch (reason) {
    case CompletionReason.NORMAL_WIN:
      return userWon ? 'You won the match!' : 'Better luck next time';

    case CompletionReason.TIMEOUT:
      if (userWon) {
        return 'Your opponent ran out of time';
      } else {
        return 'You ran out of time';
      }

    case CompletionReason.FORCE_ELIMINATION:
      return 'Advanced players in the tournament eliminated this match (ML2)';

    case CompletionReason.REPLACEMENT:
      return 'An external player replaced stalled players (ML3)';

    case CompletionReason.ALL_DRAW_SCENARIO:
      return 'All matches in the round resulted in draws';

    case CompletionReason.SOLO_ENROLL_FORCE_START:
      return 'Solo enrolled player force started the tournament (EL1)';

    case CompletionReason.ABANDONED_TOURNAMENT_CLAIMED:
      return 'External player claimed the abandoned tournament pool (EL2)';

    default:
      return userWon ? 'You won!' : 'You lost';
  }
};

/**
 * Get icon name for completion reason
 * @param {number} reason - CompletionReason enum value
 * @param {boolean} userWon - Whether the current user won
 * @param {boolean} isDraw - Whether it was a draw
 * @returns {string} Icon name (for lucide-react)
 */
export const getCompletionReasonIcon = (reason, userWon, isDraw) => {
  if (isDraw || reason === CompletionReason.DRAW) {
    return 'Minus';
  }

  switch (reason) {
    case CompletionReason.TIMEOUT:
      return 'Clock';

    case CompletionReason.FORCE_ELIMINATION:
      return 'AlertTriangle';

    case CompletionReason.REPLACEMENT:
      return 'UserX';

    case CompletionReason.ALL_DRAW_SCENARIO:
      return 'Equal';

    case CompletionReason.SOLO_ENROLL_FORCE_START:
      return 'Zap';

    case CompletionReason.ABANDONED_TOURNAMENT_CLAIMED:
      return 'DollarSign';

    default:
      return userWon ? 'Trophy' : 'Frown';
  }
};

/**
 * Check if completion reason indicates opponent didn't show up / abandoned
 * @param {number} reason - CompletionReason enum value
 * @returns {boolean}
 */
export const isOpponentAbandonment = (reason) => {
  return reason === CompletionReason.TIMEOUT;
};

/**
 * Check if completion reason indicates external intervention
 * @param {number} reason - CompletionReason enum value
 * @returns {boolean}
 */
export const isExternalIntervention = (reason) => {
  return reason === CompletionReason.FORCE_ELIMINATION ||
         reason === CompletionReason.REPLACEMENT;
};
