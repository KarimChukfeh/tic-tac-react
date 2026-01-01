/**
 * usePlayerActivity Hook
 *
 * Custom hook for fetching player activity for a single game
 * Calls a contract function that returns active matches, in-progress tournaments,
 * and unfilled tournaments for the player
 *
 * TODO: Update to call the new contract function once it's deployed
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to fetch player activity for a single game
 *
 * @param {Object} contract - Contract instance (with signer or read-only)
 * @param {string} account - Player's wallet address
 * @param {string} gameName - Game name ('tictactoe', 'chess', 'connect4') - for logging only
 * @returns {Object} { data, loading, syncing, error, refetch }
 */
export const usePlayerActivity = (contract, account, gameName) => {
  const [data, setData] = useState({
    activeMatches: [],
    inProgressTournaments: [],
    unfilledTournaments: [],
    totalEarnings: 0n,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedMatches, setDismissedMatches] = useState(new Set());
  const [completedMatchTimestamps, setCompletedMatchTimestamps] = useState({});

  const fetchActivity = useCallback(async (isInitialLoad = false) => {
    // Don't fetch if contract or account not available
    if (!contract || !account) {
      setLoading(false);
      setSyncing(false);
      setData({
        activeMatches: [],
        inProgressTournaments: [],
        unfilledTournaments: [],
        totalEarnings: 0n,
      });
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setSyncing(true);
      }
      setError(null);

      console.log('[PlayerActivity] Fetching activity for', gameName, 'account:', account);

      // Step 1: Get player stats (total earnings)
      let totalEarnings = 0n;
      try {
        totalEarnings = await contract.getPlayerStats();
      } catch (err) {
        console.warn('[PlayerActivity] Could not fetch player stats:', err);
      }

      // Step 2: Get enrolling tournaments (unfilled)
      const enrollingTournaments = await contract.getPlayerEnrollingTournaments(account);
      console.log('[PlayerActivity] Raw enrollingTournaments from contract:',
        enrollingTournaments.map(ref => ({
          tierId: Number(ref.tierId),
          instanceId: Number(ref.instanceId)
        }))
      );

      const unfilledTournaments = await Promise.all(
        enrollingTournaments.map(async (ref) => {
          const tournamentInfo = await contract.getTournamentInfo(ref.tierId, ref.instanceId);
          const tierConfig = await contract.tierConfigs(ref.tierId);

          return {
            tierId: Number(ref.tierId),
            instanceId: Number(ref.instanceId),
            enrolledCount: Number(tournamentInfo.enrolledCount),
            playerCount: Number(tierConfig.playerCount),
          };
        })
      );

      // Step 3: Get active tournaments
      const activeTournaments = await contract.getPlayerActiveTournaments(account);
      console.log('[PlayerActivity] Raw activeTournaments from contract:',
        activeTournaments.map(ref => ({
          tierId: Number(ref.tierId),
          instanceId: Number(ref.instanceId)
        }))
      );

      const activeMatches = [];
      const inProgressTournaments = [];

      // Step 4: For each active tournament, find matches where it's player's turn
      for (const ref of activeTournaments) {
        const tierId = Number(ref.tierId);
        const instanceId = Number(ref.instanceId);

        const tournamentInfo = await contract.getTournamentInfo(tierId, instanceId);
        const currentRound = Number(tournamentInfo.currentRound);
        const tournamentStatus = Number(tournamentInfo.status);

        console.log(`[PlayerActivity] Processing tournament T${tierId}I${instanceId}:`, {
          status: tournamentStatus,
          currentRound,
          enrolledCount: Number(tournamentInfo.enrolledCount)
        });

        let hasActiveMatch = false;
        let playerRound = null; // Track which round the player is in

        // Get player's round from contract using isPlayerInAdvancedRound
        // Check up to currentRound + 1 to catch players who have advanced but round hasn't started yet
        // Start from highest possible round and check backwards to find the highest round the player is in
        const tierConfig = await contract.tierConfigs(tierId);
        const totalRounds = Number(tierConfig.totalRounds);
        const maxRoundToCheck = Math.min(currentRound + 1, totalRounds - 1);

        for (let roundIdx = maxRoundToCheck; roundIdx >= 0; roundIdx--) {
          try {
            const isInRound = await contract.isPlayerInAdvancedRound(account, tierId, instanceId, roundIdx);
            if (isInRound) {
              playerRound = roundIdx;
              break; // Found the player's round
            }
          } catch (err) {
            console.warn(`[PlayerActivity] Error checking round ${roundIdx}:`, err);
          }
        }

        // Check all rounds up to current for active matches
        for (let roundIdx = 0; roundIdx <= currentRound; roundIdx++) {
          const roundInfo = await contract.getRoundInfo(tierId, instanceId, roundIdx);
          const totalMatches = Number(roundInfo.totalMatches);

          // Check each match in the round
          for (let matchIdx = 0; matchIdx < totalMatches; matchIdx++) {
            const matchData = await contract.getMatch(tierId, instanceId, roundIdx, matchIdx);

            // Check if this is the player's match
            const isPlayer1 = matchData.common.player1?.toLowerCase() === account.toLowerCase();
            const isPlayer2 = matchData.common.player2?.toLowerCase() === account.toLowerCase();

            if (!isPlayer1 && !isPlayer2) continue;

            // Check if match is in progress OR recently completed
            const matchStatus = Number(matchData.common.status);
            const isMyTurn = matchData.currentTurn?.toLowerCase() === account.toLowerCase();
            const matchKey = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;

            console.log(`[PlayerActivity] Found player's match at T${tierId}I${instanceId}R${roundIdx}M${matchIdx}:`, {
              status: matchStatus,
              isMyTurn,
              isDismissed: dismissedMatches.has(matchKey),
              player1: matchData.common.player1,
              player2: matchData.common.player2
            });

            // Skip dismissed matches
            if (dismissedMatches.has(matchKey)) {
              console.log(`[PlayerActivity] Skipping dismissed match ${matchKey}`);
              continue;
            }

            // Include in-progress matches (status === 1) or recently completed matches (status === 2)
            if (matchStatus === 1 || matchStatus === 2) {
              // If match just completed, record timestamp
              if (matchStatus === 2 && !completedMatchTimestamps[matchKey]) {
                setCompletedMatchTimestamps(prev => ({
                  ...prev,
                  [matchKey]: Date.now()
                }));
              }

              // Filter out completed matches older than 10 seconds
              if (matchStatus === 2 && completedMatchTimestamps[matchKey]) {
                const elapsed = Date.now() - completedMatchTimestamps[matchKey];
                if (elapsed > 10000) {
                  console.log(`[PlayerActivity] Skipping completed match ${matchKey} (elapsed: ${elapsed}ms)`);
                  continue; // Skip this match, it's been completed for more than 10 seconds
                }
              }

              hasActiveMatch = true;

              // Determine opponent
              const opponent = isPlayer1 ? matchData.common.player2 : matchData.common.player1;

              // Get time remaining
              let timeRemaining = 300; // Default 5 minutes
              try {
                const timeData = await contract.getCurrentTimeRemaining(
                  tierId, instanceId, roundIdx, matchIdx
                );
                timeRemaining = isPlayer1 ? Number(timeData[0]) : Number(timeData[1]);
              } catch {
                // Fallback to match data
                timeRemaining = isPlayer1
                  ? Number(matchData.player1TimeRemaining)
                  : Number(matchData.player2TimeRemaining);
              }

              console.log(`[PlayerActivity] Adding match ${matchKey} to activeMatches`, {
                opponent,
                timeRemaining,
                isMyTurn,
                isCompleted: matchStatus === 2
              });

              activeMatches.push({
                tierId,
                instanceId,
                roundIdx,
                matchIdx,
                opponent,
                timeRemaining,
                isMyTurn, // Add flag to indicate if it's player's turn
                isCompleted: matchStatus === 2, // Add flag to indicate if match is completed
              });
            } else {
              console.log(`[PlayerActivity] Skipping match ${matchKey} - status not 1 or 2 (status: ${matchStatus})`);
            }
          }
        }

        // If no active match but player is in tournament, add to waiting list
        if (!hasActiveMatch) {
          console.log(`[PlayerActivity] No active match found for T${tierId}I${instanceId}, adding to inProgressTournaments with playerRound:`, playerRound);
          inProgressTournaments.push({
            tierId,
            instanceId,
            currentRound,
            playerRound, // Add the round the player is in (last completed or waiting for)
          });
        } else {
          console.log(`[PlayerActivity] Active match found for T${tierId}I${instanceId}, not adding to inProgressTournaments`);
        }
      }

      // Sort active matches: your turn first (by time remaining), then waiting matches
      activeMatches.sort((a, b) => {
        // Prioritize matches where it's your turn
        if (a.isMyTurn && !b.isMyTurn) return -1;
        if (!a.isMyTurn && b.isMyTurn) return 1;
        // Within same turn status, sort by time remaining (most urgent first)
        return a.timeRemaining - b.timeRemaining;
      });

      console.log('[PlayerActivity] ===== FINAL RESULTS =====');
      console.log('[PlayerActivity] Active Matches:', activeMatches.map(m =>
        `T${m.tierId}I${m.instanceId}R${m.roundIdx}M${m.matchIdx}`
      ));
      console.log('[PlayerActivity] In Progress Tournaments:', inProgressTournaments.map(t =>
        `T${t.tierId}I${t.instanceId} (Round ${t.currentRound})`
      ));
      console.log('[PlayerActivity] Unfilled Tournaments:', unfilledTournaments.map(t =>
        `T${t.tierId}I${t.instanceId} (${t.enrolledCount}/${t.playerCount})`
      ));
      console.log('[PlayerActivity] Total Earnings:', totalEarnings.toString());
      console.log('[PlayerActivity] ===========================');

      setData({
        activeMatches,
        inProgressTournaments,
        unfilledTournaments,
        totalEarnings,
      });
      setLoading(false);
      setSyncing(false);
    } catch (err) {
      console.error('Error fetching player activity:', err);
      setError(err.message);
      setLoading(false);
      setSyncing(false);
    }
  }, [contract, account, gameName, dismissedMatches, completedMatchTimestamps]);

  // Initial fetch
  useEffect(() => {
    fetchActivity(true);
  }, [fetchActivity]);

  // Set up 30-second polling interval
  useEffect(() => {
    if (!contract || !account) return;

    const interval = setInterval(() => {
      fetchActivity(false);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [contract, account, fetchActivity]);

  // Function to dismiss a completed match
  const dismissMatch = useCallback((tierId, instanceId, roundIdx, matchIdx) => {
    const matchKey = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;
    setDismissedMatches(prev => new Set([...prev, matchKey]));
  }, []);

  return {
    data,
    loading,
    syncing,
    error,
    refetch: () => fetchActivity(false),
    dismissMatch
  };
};

/**
 * Expected Contract Function Signature
 *
 * When you implement the new contract function, it should return data in this format:
 *
 * struct PlayerActivity {
 *   ActiveMatch[] activeMatches;      // Matches where it's player's turn
 *   InProgressTournament[] inProgressTournaments;  // Player's tournaments in progress (waiting)
 *   UnfilledTournament[] unfilledTournaments;      // Player's tournaments in enrollment
 * }
 *
 * struct ActiveMatch {
 *   uint256 tierId;
 *   uint256 instanceId;
 *   uint256 roundIdx;
 *   uint256 matchIdx;
 *   address opponent;
 *   uint256 timeRemaining;
 * }
 *
 * struct InProgressTournament {
 *   uint256 tierId;
 *   uint256 instanceId;
 *   uint256 currentRound;
 * }
 *
 * struct UnfilledTournament {
 *   uint256 tierId;
 *   uint256 instanceId;
 *   uint256 enrolledCount;
 *   uint256 playerCount;
 * }
 *
 * Solidity function example:
 * function getPlayerActivity(address player) external view returns (PlayerActivity memory);
 */
