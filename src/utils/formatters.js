/**
 * Shared utility functions for formatting display values
 */

/**
 * Shorten an Ethereum address for display
 * @param {string} addr - The full address
 * @returns {string} - Shortened address like "0x1234...5678" or "TBD" if invalid
 */
export const shortenAddress = (addr) => {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'TBD';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

/**
 * Format seconds into minutes/seconds display
 * @param {number} seconds - Total seconds
 * @returns {string} - Formatted string like "5m 30s"
 */
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

/**
 * Get tier name based on player count and tier ID
 * @param {number} playerCount - Number of players in the tournament tier
 * @param {number} tierId - The tier ID (0-7 for chess)
 * @returns {string} - The tier name
 */
export const getTierName = (playerCount, tierId = null) => {
  // Chess-specific 8-tier labeling
  if (tierId !== null) {
    const tierLabels = {
      0: 'Casual Duels',
      1: 'Beginner Duels',
      2: 'Advanced Duels',
      3: 'Elite Duels',
      4: 'Casual Tournaments',
      5: 'Beginner Tournaments',
      6: 'Advanced Tournaments',
      7: 'Elite Tournaments'
    };
    if (tierLabels[tierId]) return tierLabels[tierId];
  }

  // Fallback for other games or unknown tiers
  if (playerCount === 2) return '1v1 Duel';
  if (playerCount === 4) return 'Small Tournament';
  if (playerCount === 8) return 'Medium Tournament';
  if (playerCount === 16) return 'Large Tournament';
  if (playerCount > 16) return 'Mega Tournament';
  return `${playerCount}-Player Tournament`;
};

/**
 * Get estimated duration for a tournament based on game type and player count
 * @param {string} gameType - 'tictactoe', 'chess', or 'connectfour'
 * @param {number} playerCount - Number of players in the tournament
 * @returns {string} - Human-readable duration estimate
 */
export const getEstimatedDuration = (gameType, playerCount) => {
  // Base time per match in minutes for each game
  const baseMatchTime = {
    tictactoe: 2,    // Very fast - simple game
    chess: 15,       // Slower - complex strategy
    connectfour: 5   // Medium - tactical but quicker
  };

  const base = baseMatchTime[gameType] || 5;
  const rounds = Math.ceil(Math.log2(playerCount));
  const estimatedMinutes = base * rounds;

  if (estimatedMinutes < 5) return '~2-5 min';
  if (estimatedMinutes < 15) return '~5-15 min';
  if (estimatedMinutes < 30) return '~15-30 min';
  if (estimatedMinutes < 60) return '~30-60 min';
  if (estimatedMinutes < 120) return '~1-2 hours';
  return '~2+ hours';
};

/**
 * Count instances by status from status array
 * @param {number[]} statuses - Array of status values for each instance
 * @param {number[]} enrolledCounts - Array of enrolled player counts for each instance
 * @returns {Object} - { enrolling: number, inProgress: number, completed: number }
 */
export const countInstancesByStatus = (statuses, enrolledCounts = []) => {
  if (!statuses || !Array.isArray(statuses)) {
    return { enrolling: 0, inProgress: 0, completed: 0 };
  }

  return statuses.reduce((acc, status, index) => {
    const enrolled = enrolledCounts[index] || 0;
    // Only count as "enrolling" if status is 0 AND has at least 1 enrolled player
    if (status === 0 && enrolled > 0) acc.enrolling++;
    else if (status === 1) acc.inProgress++;
    else if (status >= 2) acc.completed++;
    return acc;
  }, { enrolling: 0, inProgress: 0, completed: 0 });
};

/**
 * Get tournament type label based on player count
 * Returns "Duel" for 2-player tournaments, "Tournament" otherwise
 * @param {number} playerCount - Number of players in the tournament
 * @returns {string} - "Duel" or "Tournament"
 */
export const getTournamentTypeLabel = (playerCount) => {
  return playerCount === 2 ? 'Duel' : 'Tournament';
};
