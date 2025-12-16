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
 * Format seconds into hours/minutes/seconds display
 * @param {number} seconds - Total seconds
 * @returns {string} - Formatted string like "1h 30m 45s"
 */
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

/**
 * Get tier name from tier ID
 * @param {number} tierId - The tier ID
 * @param {Object} tierNames - Optional custom tier names map
 * @returns {string} - The tier name
 */
export const getTierName = (tierId, tierNames = null) => {
  // Default tier names (used by Chess and ConnectFour)
  const defaultTierNames = {
    0: 'Classic',
    1: 'Minor',
    2: 'Standard',
    3: 'Major',
    4: 'Mega',
    5: 'Ultimate',
    6: 'Rapid'
  };

  const names = tierNames || defaultTierNames;
  return names[tierId] || `Tier ${tierId}`;
};

// TicTacToe-specific tier names (for convenience)
export const TICTACTOE_TIER_NAMES = {
  0: 'Duel',      // 2-player tournaments
  1: 'Octa'       // 8-player tournaments
};
