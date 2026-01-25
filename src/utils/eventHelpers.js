/**
 * Event Query Helpers
 *
 * Utilities for querying blockchain events to optimize player activity polling
 */

/**
 * Query TournamentEnrolled events for a specific player
 *
 * @param {Object} contract - Contract instance (must be read-only or with signer)
 * @param {string} playerAddress - Player's wallet address
 * @param {number} hoursBack - How many hours back to query (default: 6)
 * @returns {Promise<Array>} Array of {tierId, instanceId} objects
 */
export const queryPlayerEnrollmentEvents = async (contract, playerAddress, hoursBack = 6) => {
  if (!contract || !playerAddress) {
    return [];
  }

  try {
    // Calculate block range (approximate)
    // Arbitrum produces ~4 blocks per second, so 1 hour ≈ 14,400 blocks
    const blocksPerHour = 14400;
    const blocksBack = hoursBack * blocksPerHour;

    // Get current block number
    const currentBlock = await contract.runner.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - blocksBack);

    console.log(`[EventHelpers] Querying TournamentEnrolled events for ${playerAddress}`);
    console.log(`[EventHelpers] Block range: ${fromBlock} to ${currentBlock} (${blocksBack} blocks back)`);

    // Query TournamentEnrolled events where player is indexed
    // Event signature: TournamentEnrolled(address indexed player, uint8 tierId, uint8 instanceId)
    const filter = contract.filters.TournamentEnrolled(playerAddress);
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    console.log(`[EventHelpers] Found ${events.length} TournamentEnrolled events`);

    // Extract unique tier/instance combinations
    const tierInstanceSet = new Set();
    const results = [];

    for (const event of events) {
      const tierId = Number(event.args.tierId);
      const instanceId = Number(event.args.instanceId);
      const key = `${tierId}-${instanceId}`;

      if (!tierInstanceSet.has(key)) {
        tierInstanceSet.add(key);
        results.push({ tierId, instanceId });
        console.log(`[EventHelpers] Found enrollment: Tier ${tierId}, Instance ${instanceId}`);
      }
    }

    console.log(`[EventHelpers] Unique enrollments: ${results.length}`);
    return results;
  } catch (error) {
    console.error('[EventHelpers] Error querying TournamentEnrolled events:', error);
    // Return empty array on error - caller will fall back to full multicall
    return [];
  }
};

/**
 * Query player's tournament instances and return their current states
 *
 * @param {Object} contract - Contract instance
 * @param {Array} tierInstances - Array of {tierId, instanceId} to query
 * @returns {Promise<Object>} Object mapping tierId to array of instance data
 */
export const queryTournamentStates = async (contract, tierInstances) => {
  if (!contract || !tierInstances || tierInstances.length === 0) {
    return {};
  }

  try {
    console.log(`[EventHelpers] Querying state for ${tierInstances.length} tier/instance combinations`);

    // Batch query all tournament info calls
    const tournamentInfoPromises = tierInstances.map(({ tierId, instanceId }) =>
      contract.getTournamentInfo(tierId, instanceId)
        .then(info => ({
          tierId,
          instanceId,
          status: Number(info.status),
          currentRound: Number(info.currentRound),
          enrolledCount: Number(info.enrolledCount),
          prizePool: info.prizePool,
          winner: info.winner,
        }))
        .catch(err => {
          console.warn(`[EventHelpers] Failed to query T${tierId}I${instanceId}:`, err);
          return null;
        })
    );

    const results = await Promise.all(tournamentInfoPromises);

    // Group by tierId and filter out failed queries
    const grouped = {};
    for (const result of results) {
      if (result) {
        if (!grouped[result.tierId]) {
          grouped[result.tierId] = [];
        }
        grouped[result.tierId].push(result);
      }
    }

    console.log(`[EventHelpers] Successfully queried ${Object.keys(grouped).length} tiers`);
    return grouped;
  } catch (error) {
    console.error('[EventHelpers] Error querying tournament states:', error);
    return {};
  }
};
