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

const toReasonNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getMatchCompletionReasonValue = (record) => toReasonNumber(
  record?.matchCompletionReason
  ?? record?.reason
  ?? record?.completionReason
  ?? record?.matchReason
  ?? 0
);

export const getMatchCompletionCategoryValue = (record) => toReasonNumber(
  record?.matchCompletionCategory
  ?? record?.completionCategory
  ?? record?.matchCategory
  ?? record?.category
  ?? 0
);

export const getTournamentResolutionReasonValue = (record) => toReasonNumber(
  record?.tournamentResolutionReason
  ?? record?.resolutionReason
  ?? record?.completionReason
  ?? 0
);

export const getTournamentResolutionCategoryValue = (record) => toReasonNumber(
  record?.tournamentResolutionCategory
  ?? record?.resolutionCategory
  ?? record?.completionCategory
  ?? 0
);

export const getTournamentCompletionText = (reason) => {
  switch (reason) {
    case CompletionReason.NORMAL_WIN:
      return { text: 'Normal Victory', link: null, summary: 'normal victory' };
    case CompletionReason.TIMEOUT:
      return { text: 'ML1 Timeout Elimination', link: '#ml1', summary: 'timeout (ML1)' };
    case CompletionReason.DRAW:
      return { text: 'Draw Resolution', link: '#draws', summary: 'draw resolution' };
    case CompletionReason.FORCE_ELIMINATION:
      return { text: 'ML2 Advanced Player Elimination', link: '#ml2', summary: 'ML2 elimination' };
    case CompletionReason.REPLACEMENT:
      return { text: 'ML3 External Player Replacement', link: '#ml3', summary: 'ML3 replacement' };
    case CompletionReason.ALL_DRAW_SCENARIO:
      return { text: 'All-Draw Scenario Resolution', link: '#draws', summary: 'all-draw resolution' };
    case CompletionReason.SOLO_ENROLL_FORCE_START:
      return { text: 'EL1 Solo Force Start', link: '#el1', summary: 'solo force start (EL1)' };
    case CompletionReason.ABANDONED_TOURNAMENT_CLAIMED:
      return { text: 'EL2 Abandoned Pool Claim', link: '#el2', summary: 'abandoned pool claim (EL2)' };
    default:
      return { text: 'Tournament Completion', link: null, summary: 'tournament completion' };
  }
};

export const getPlayerMatchOutcomeReasonValue = (record) => toReasonNumber(
  record?.playerOutcomeReason
  ?? record?.outcomeReason
  ?? record?.reason
  ?? record?.playerMatchOutcomeReason
  ?? record?.matchOutcomeReason
  ?? record?.matchCompletionReason
  ?? record?.completionReason
  ?? 0
);

export const getPlayerMatchOutcomeCategoryValue = (record) => toReasonNumber(
  record?.playerOutcomeCategory
  ?? record?.outcomeCategory
  ?? record?.playerMatchOutcomeCategory
  ?? record?.matchOutcomeCategory
  ?? record?.matchCompletionCategory
  ?? record?.completionCategory
  ?? record?.category
  ?? 0
);

/**
 * Get completion reason text for display
 * @param {number} reason - CompletionReason enum value
 * @param {boolean} userWon - Whether the current user won
 * @param {string} gameType - 'tictactoe', 'chess', or 'connect4'
 * @returns {string} User-friendly completion message
 */
export const getCompletionReasonText = (reason, userWon, gameType = 'tictactoe') => {
  // Check draw first
  if (reason === CompletionReason.DRAW || reason === CompletionReason.ALL_DRAW_SCENARIO) {
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
        return 'Defeat';
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
      return userWon ? 'Victory!' : 'Defeat';
  }
};

/**
 * Get the user-facing outcome label for history/bracket completed matches.
 * This intentionally uses unified labels instead of game-specific win text.
 * @param {number} reason - CompletionReason enum value
 * @param {boolean} userWon - Whether the current user won
 * @param {string} gameType - 'tictactoe', 'chess', or 'connect4'
 * @returns {string} Unified outcome label
 */
export const getCompletedMatchOutcomeLabel = (reason, userWon, gameType = 'tictactoe') => {
  if (reason === CompletionReason.DRAW || reason === CompletionReason.ALL_DRAW_SCENARIO) {
    return 'Draw';
  }

  if (userWon) {
    if (reason === CompletionReason.TIMEOUT) return 'Victory by Timeout (ML1)';
    if (reason === CompletionReason.FORCE_ELIMINATION) return 'Victory via ML2';
    if (reason === CompletionReason.REPLACEMENT) return 'Victory via ML3';
    return 'Victory';
  }

  if (reason === CompletionReason.TIMEOUT) return 'Defeat by Timeout (ML1)';
  if (reason === CompletionReason.FORCE_ELIMINATION) return 'Defeat via ML2';
  if (reason === CompletionReason.REPLACEMENT) return 'Defeat via ML3';
  return 'Defeat';
};

/**
 * Get the user manual anchor href for a completion reason, if applicable.
 * @param {number} reason - CompletionReason enum value
 * @returns {string|null} Anchor href
 */
export const getCompletionReasonHref = (reason) => {
  switch (reason) {
    case CompletionReason.TIMEOUT:
      return '#ml1';
    case CompletionReason.DRAW:
    case CompletionReason.ALL_DRAW_SCENARIO:
      return '#draws';
    case CompletionReason.FORCE_ELIMINATION:
      return '#ml2';
    case CompletionReason.REPLACEMENT:
      return '#ml3';
    default:
      return null;
  }
};

/**
 * Get the user manual section label for a completion reason.
 * @param {number} reason - CompletionReason enum value
 * @returns {string} Manual section label
 */
export const getCompletionReasonManualLabel = (reason) => {
  switch (reason) {
    case CompletionReason.TIMEOUT:
      return 'ML1';
    case CompletionReason.DRAW:
      return 'Draws';
    case CompletionReason.FORCE_ELIMINATION:
      return 'ML2';
    case CompletionReason.REPLACEMENT:
      return 'ML3';
    case CompletionReason.ALL_DRAW_SCENARIO:
      return 'All-Draw Resolution';
    default:
      return '';
  }
};

/**
 * Get detailed completion reason description
 * @param {number} reason - CompletionReason enum value
 * @param {boolean} userWon - Whether the current user won
 * @returns {string} Detailed description
 */
export const getCompletionReasonDescription = (reason, userWon) => {
  // Check draw first
  if (reason === CompletionReason.DRAW || reason === CompletionReason.ALL_DRAW_SCENARIO) {
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
 * @returns {string} Icon name (for lucide-react)
 */
export const getCompletionReasonIcon = (reason, userWon) => {
  if (reason === CompletionReason.DRAW || reason === CompletionReason.ALL_DRAW_SCENARIO) {
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

/**
 * Check if completion reason indicates a draw
 * @param {number} reason - CompletionReason enum value
 * @returns {boolean}
 */
export const isDraw = (reason) => {
  return reason === CompletionReason.DRAW || reason === CompletionReason.ALL_DRAW_SCENARIO;
};
