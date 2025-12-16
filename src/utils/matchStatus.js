/**
 * Match status utility functions
 */

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Get display text for match status
 * @param {number} matchStatus - 0: Not Started, 1: In Progress, 2: Completed
 * @param {string} winner - Winner address
 * @param {boolean} isDraw - Whether the match ended in a draw
 * @param {Object} options - Optional customization
 * @param {string} options.doubleForfeitText - Custom text for double forfeit (default: 'Double Forfeit')
 * @returns {string} - Status text
 */
export const getMatchStatusText = (matchStatus, winner, isDraw, options = {}) => {
  const { doubleForfeitText = 'Double Forfeit' } = options;

  if (matchStatus === 0) return 'Not Started';
  if (matchStatus === 1) return 'In Progress';
  if (matchStatus === 2) {
    // Check for double forfeit: completed, zero address winner, not a draw
    if (winner && winner.toLowerCase() === ZERO_ADDRESS && !isDraw) {
      return doubleForfeitText;
    }
    return 'Completed';
  }
  return 'Unknown';
};

/**
 * Get Tailwind color class for match status
 * @param {number} matchStatus - 0: Not Started, 1: In Progress, 2: Completed
 * @param {string} winner - Winner address
 * @param {boolean} isDraw - Whether the match ended in a draw
 * @param {Object} options - Optional customization
 * @param {string} options.doubleForfeitColor - Custom color class for double forfeit (default: 'text-red-400')
 * @returns {string} - Tailwind color class
 */
export const getMatchStatusColor = (matchStatus, winner, isDraw, options = {}) => {
  const { doubleForfeitColor = 'text-red-400' } = options;

  if (matchStatus === 0) return 'text-gray-400';
  if (matchStatus === 1) return 'text-yellow-400';
  if (matchStatus === 2) {
    // Check for double forfeit: completed, zero address winner, not a draw
    if (winner && winner.toLowerCase() === ZERO_ADDRESS && !isDraw) {
      return doubleForfeitColor;
    }
    return 'text-green-400';
  }
  return 'text-gray-400';
};
