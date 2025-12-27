/**
 * Time Calculations Utility
 *
 * Centralized logic for calculating per-player time in total match time system.
 * Each player has 5 minutes (300 seconds) total to make all their moves.
 */

const TOTAL_MATCH_TIME = 300; // 5 minutes per player

/**
 * Format time breakdown for both players using contract data
 * NO CLIENT-SIDE CALCULATIONS - uses authoritative contract values
 *
 * @param {Object} match - Match data with time fields FROM CONTRACT
 * @param {string} account - Current user's wallet address
 * @returns {Object} Time breakdown for both players
 */
export const calculatePlayerTimes = (match, account) => {
  const {
    player1,
    player2,
    player1TimeRemaining,
    player2TimeRemaining,
    currentTurn,
    matchStatus
  } = match;

  // Use contract values directly (no calculation)
  // These come from getCurrentTimeRemaining() which is called during sync
  const p1Remaining = player1TimeRemaining ?? TOTAL_MATCH_TIME;
  const p2Remaining = player2TimeRemaining ?? TOTAL_MATCH_TIME;

  // Calculate used time (simple subtraction)
  const p1Used = TOTAL_MATCH_TIME - p1Remaining;
  const p2Used = TOTAL_MATCH_TIME - p2Remaining;

  // Determine if anyone has timed out (contract says <= 0)
  const isExpired = p1Remaining <= 0 || p2Remaining <= 0;
  const expiredPlayer = p1Remaining <= 0 ? player1 : (p2Remaining <= 0 ? player2 : null);

  // Determine which player is the current user
  const isPlayer1You = account && player1?.toLowerCase() === account.toLowerCase();
  const isPlayer2You = account && player2?.toLowerCase() === account.toLowerCase();

  // Determine whose turn it is
  const isPlayer1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
  const isPlayer2Turn = currentTurn?.toLowerCase() === player2?.toLowerCase();
  const activePlayer = isPlayer1Turn ? player1 : (isPlayer2Turn ? player2 : null);

  return {
    player1: {
      total: TOTAL_MATCH_TIME,
      used: p1Used,
      remaining: Math.max(0, p1Remaining) // Ensure non-negative for display
    },
    player2: {
      total: TOTAL_MATCH_TIME,
      used: p2Used,
      remaining: Math.max(0, p2Remaining) // Ensure non-negative for display
    },
    isExpired,
    expiredPlayer,
    isPlayer1You,
    isPlayer2You,
    activePlayer
  };
};

/**
 * Format time in M:SS format
 *
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "2:45" or "0:08")
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get color scheme based on remaining time
 *
 * @param {number} remaining - Remaining seconds
 * @returns {Object} Color scheme with various states
 */
export const getTimeColorScheme = (remaining) => {
  if (remaining > 60) {
    return {
      level: 'safe',
      bg: 'bg-green-500/20',
      border: 'border-green-400',
      text: 'text-green-300',
      barColor: 'bg-green-500',
      pulse: false
    };
  } else if (remaining > 30) {
    return {
      level: 'warning',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-400',
      text: 'text-yellow-300',
      barColor: 'bg-yellow-500',
      pulse: false
    };
  } else if (remaining > 10) {
    return {
      level: 'danger',
      bg: 'bg-red-500/20',
      border: 'border-red-400',
      text: 'text-red-300',
      barColor: 'bg-red-500',
      pulse: false
    };
  } else {
    return {
      level: 'critical',
      bg: 'bg-red-500/30',
      border: 'border-red-400',
      text: 'text-red-300',
      barColor: 'bg-red-600',
      pulse: true
    };
  }
};
