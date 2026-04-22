/**
 * URL helper functions for tournament sharing
 */

/**
 * Generate shareable tournament URL
 * @param {string} gameType - 'tictactoe', 'chess', or 'connectfour'
 * @param {number} tierId - Tournament tier ID (0-indexed)
 * @param {number} instanceId - Tournament instance ID (0-indexed)
 * @returns {string} - Full shareable URL with 1-indexed params
 */
export const generateTournamentUrl = (gameType, tierId, instanceId) => {
  const gamePathMap = {
    tictactoe: 'tictactoe',
    chess: 'chess',
    connectfour: 'connect4'
  };

  const gamePath = gamePathMap[gameType] || gameType;
  // Convert 0-indexed to 1-indexed for user-friendly URLs
  return `${window.location.origin}/v1/${gamePath}?t=${tierId + 1}&i=${instanceId + 1}`;
};

/**
 * Parse tournament parameters from URL search params
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {Object|null} - { tierId, instanceId } (0-indexed) or null if invalid
 */
export const parseTournamentParams = (searchParams) => {
  const tierParam = searchParams.get('t');
  const instanceParam = searchParams.get('i');

  if (tierParam === null || instanceParam === null) return null;

  const tierNum = parseInt(tierParam, 10);
  const instanceNum = parseInt(instanceParam, 10);

  // Validate positive integers (1-indexed in URL)
  if (isNaN(tierNum) || isNaN(instanceNum) || tierNum < 1 || instanceNum < 1) {
    return null;
  }

  // Convert 1-indexed to 0-indexed for code
  return {
    tierId: tierNum - 1,
    instanceId: instanceNum - 1
  };
};

/**
 * Generate shareable V2 instance URL (uses contract address)
 * @param {string} gameType - 'tictactoe', 'chess', or 'connectfour'
 * @param {string} contractAddress - Instance contract address
 * @returns {string} - Full shareable URL with ?c=0x...
 */
export const generateV2TournamentUrl = (gameType, contractAddress) => {
  const gamePathMap = {
    tictactoe: 'tictactoe',
    chess: 'chess',
    connectfour: 'connect4'
  };

  const gamePath = gamePathMap[gameType] || 'tictactoe';
  return `${window.location.origin}/${gamePath}?c=${contractAddress}`;
};

/**
 * Parse V2 contract address from URL search params
 * @param {URLSearchParams} searchParams
 * @returns {string|null} - contract address or null
 */
export const parseV2ContractParam = (searchParams) => {
  const c = searchParams.get('c');
  if (!c || !/^0x[0-9a-fA-F]{40}$/.test(c)) return null;
  return c;
};

/**
 * Copy text to clipboard with error handling
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-HTTPS
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
};
