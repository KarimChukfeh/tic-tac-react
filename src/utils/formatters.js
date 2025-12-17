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
 * Get tier name based on player count
 * @param {number} playerCount - Number of players in the tournament tier
 * @returns {string} - The tier name (without "Tier" suffix)
 */
export const getTierName = (playerCount) => {
  if (playerCount === 2) return '1v1 Duel';
  if (playerCount === 4) return 'Small Tournament';
  if (playerCount === 8) return 'Medium Tournament';
  if (playerCount === 16) return 'Large Tournament';
  if (playerCount > 16) return 'Mega Tournament';
  return `${playerCount}-Player Tournament`;
};
