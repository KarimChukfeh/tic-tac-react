/**
 * Time Calculations Utility
 *
 * Centralized logic for calculating per-player time in total match time system.
 * Total match time per player is fetched from the contract.
 */

/**
 * Fetch per-tier timeout configuration from contract
 * This ensures each tier uses its own configured match time, not a hardcoded default
 *
 * @param {Object} contractInstance - Ethers contract instance
 * @param {number} tierId - Tournament tier ID
 * @param {number} fallbackMatchTime - Default match time if config unavailable (default 300s)
 * @param {Object} hardcodedTierConfig - Optional hardcoded tier config (for contracts that removed tierConfigs)
 * @returns {Promise<Object>} Timeout configuration with matchTimePerPlayer and escalation delays
 */
export const fetchTierTimeoutConfig = async (contractInstance, tierId, fallbackMatchTime = 300, hardcodedTierConfig = null) => {
  try {
    // Try ConnectFour approach first: getTierTimeouts(tierId)
    if (contractInstance.getTierTimeouts) {
      const rawTimeoutConfig = await contractInstance.getTierTimeouts(tierId);
      const config = {
        matchTimePerPlayer: Number(rawTimeoutConfig.matchTimePerPlayer),
        timeIncrementPerMove: Number(rawTimeoutConfig.timeIncrementPerMove),
        matchLevel2Delay: Number(rawTimeoutConfig.matchLevel2Delay),
        matchLevel3Delay: Number(rawTimeoutConfig.matchLevel3Delay),
        enrollmentWindow: Number(rawTimeoutConfig.enrollmentWindow),
        enrollmentLevel2Delay: Number(rawTimeoutConfig.enrollmentLevel2Delay)
      };
      console.log(`Loaded timeout config for tier ${tierId}:`, config);
      return config;
    }
  } catch (error) {
    console.warn('getTierTimeouts() failed, trying tierConfigs:', error.message);
  }

  try {
    // Try TicTacChain/Chess approach: tierConfigs(tierId).timeouts
    if (contractInstance.tierConfigs) {
      const tierConfig = await contractInstance.tierConfigs(tierId);
      const timeouts = tierConfig.timeouts;
      const config = {
        matchTimePerPlayer: Number(timeouts.matchTimePerPlayer),
        timeIncrementPerMove: Number(timeouts.timeIncrementPerMove),
        matchLevel2Delay: Number(timeouts.matchLevel2Delay),
        matchLevel3Delay: Number(timeouts.matchLevel3Delay),
        enrollmentWindow: Number(timeouts.enrollmentWindow),
        enrollmentLevel2Delay: Number(timeouts.enrollmentLevel2Delay)
      };
      console.log(`Loaded timeout config for tier ${tierId}:`, config);
      return config;
    }
  } catch (error) {
    console.warn('tierConfigs() failed, checking hardcoded config:', error.message);
  }

  // Use hardcoded tier config if provided (for modular contracts that removed tierConfigs)
  if (hardcodedTierConfig && hardcodedTierConfig.timeouts) {
    const timeouts = hardcodedTierConfig.timeouts;
    console.log(`Using hardcoded timeout config for tier ${tierId}:`, timeouts);
    return {
      matchTimePerPlayer: timeouts.matchTimePerPlayer,
      timeIncrementPerMove: timeouts.timeIncrementPerMove,
      matchLevel2Delay: timeouts.matchLevel2Delay,
      matchLevel3Delay: timeouts.matchLevel3Delay,
      enrollmentWindow: timeouts.enrollmentWindow,
      enrollmentLevel2Delay: timeouts.enrollmentLevel2Delay
    };
  }

  // Fallback if all methods fail
  console.warn('No timeout config available, using fallback values');
  return {
    matchTimePerPlayer: fallbackMatchTime,
    timeIncrementPerMove: 0,
    matchLevel2Delay: 60,
    matchLevel3Delay: 120,
    enrollmentWindow: 60,
    enrollmentLevel2Delay: 60
  };
};

/**
 * Format time breakdown for both players using contract data
 * NO CLIENT-SIDE CALCULATIONS - uses authoritative contract values
 *
 * @param {Object} match - Match data with time fields FROM CONTRACT
 * @param {string} account - Current user's wallet address
 * @param {number} totalMatchTime - Total time per player from contract (default 300)
 * @returns {Object} Time breakdown for both players
 */
export const calculatePlayerTimes = (match, account, totalMatchTime = 300) => {
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
  const p1Remaining = player1TimeRemaining ?? totalMatchTime;
  const p2Remaining = player2TimeRemaining ?? totalMatchTime;

  // Calculate used time (simple subtraction)
  const p1Used = totalMatchTime - p1Remaining;
  const p2Used = totalMatchTime - p2Remaining;

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
      total: totalMatchTime,
      used: p1Used,
      remaining: Math.max(0, p1Remaining) // Ensure non-negative for display
    },
    player2: {
      total: totalMatchTime,
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
