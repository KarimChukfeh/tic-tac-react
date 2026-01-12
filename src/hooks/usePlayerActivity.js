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
import { parseTicTacToeMatch, parseChessMatch, parseConnectFourMatch } from '../utils/matchDataParser';

/**
 * Custom hook to fetch player activity for a single game
 *
 * @param {Object} contract - Contract instance (with signer or read-only)
 * @param {string} account - Player's wallet address
 * @param {string} gameName - Game name ('tictactoe', 'chess', 'connect4') - for logging only
 * @param {Object} tierConfig - Optional tier configuration object { 0: {playerCount, instanceCount, entryFee}, ... }
 * @returns {Object} { data, loading, syncing, error, refetch }
 */
export const usePlayerActivity = (contract, account, gameName, tierConfig = null) => {
  const [data, setData] = useState({
    activeMatches: [],
    inProgressTournaments: [],
    unfilledTournaments: [],
    terminatedMatches: [],
    totalEarnings: 0n,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedMatches, setDismissedMatches] = useState(new Set());

  const fetchActivity = useCallback(async (isInitialLoad = false) => {
    // Don't fetch if contract or account not available
    if (!contract || !account) {
      setLoading(false);
      setSyncing(false);
      setData({
        activeMatches: [],
        inProgressTournaments: [],
        unfilledTournaments: [],
        terminatedMatches: [],
        totalEarnings: 0n,
      });
      return;
    }

    // Select the appropriate match parser based on game type
    let parseMatch;
    if (gameName === 'tictactoe') {
      parseMatch = parseTicTacToeMatch;
    } else if (gameName === 'chess') {
      parseMatch = parseChessMatch;
    } else if (gameName === 'connect4') {
      parseMatch = parseConnectFourMatch;
    } else {
      parseMatch = parseTicTacToeMatch; // Default fallback
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
        totalEarnings = await contract.playerEarnings(account);
      } catch (err) {
        console.warn('[PlayerActivity] Could not fetch player earnings:', err);
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
          // getTournamentInfo returns: (status, currentRound, enrolledCount, prizePool, winner)
          const tournamentInfo = await contract.getTournamentInfo(ref.tierId, ref.instanceId);
          const enrolledCount = Number(tournamentInfo[2]); // enrolledCount at index 2

          // Get player count from tierConfig if provided, otherwise try contract
          let playerCount;
          if (tierConfig && tierConfig[ref.tierId]) {
            playerCount = tierConfig[ref.tierId].playerCount;
          } else {
            try {
              const config = await contract.getTierConfig(ref.tierId);
              playerCount = Number(config.playerCount);
            } catch (err) {
              console.warn(`[PlayerActivity] Could not fetch tier ${ref.tierId} config:`, err);
              playerCount = 2; // Default fallback
            }
          }

          return {
            tierId: Number(ref.tierId),
            instanceId: Number(ref.instanceId),
            enrolledCount,
            playerCount,
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
      const terminatedMatches = [];

      // OPTIMIZATION: Step 4 - Fetch all tournament info in parallel first
      const tournamentInfoPromises = activeTournaments.map(async (ref) => {
        const tierId = Number(ref.tierId);
        const instanceId = Number(ref.instanceId);
        const tournamentInfo = await contract.getTournamentInfo(tierId, instanceId);
        return {
          tierId,
          instanceId,
          tournamentStatus: Number(tournamentInfo[0]),
          currentRound: Number(tournamentInfo[1]),
          enrolledCount: Number(tournamentInfo[2])
        };
      });

      const tournamentsData = await Promise.all(tournamentInfoPromises);

      // Step 5: Process each tournament
      for (const { tierId, instanceId, tournamentStatus, currentRound, enrolledCount } of tournamentsData) {

        console.log(`[PlayerActivity] Processing tournament T${tierId}I${instanceId}:`, {
          status: tournamentStatus,
          currentRound,
          enrolledCount
        });

        // Check if tournament has completed (status === 2)
        if (tournamentStatus === 2) {
          console.log(`[PlayerActivity] Tournament T${tierId}I${instanceId} is COMPLETED - checking for terminated matches`);

          // OPTIMIZATION: Fetch all rounds info in parallel
          const roundInfoPromises = Array.from({ length: currentRound + 1 }, (_, roundIdx) =>
            contract.rounds(tierId, instanceId, roundIdx)
              .then(roundInfo => ({ roundIdx, totalMatches: Number(roundInfo.totalMatches) }))
          );
          const roundsInfo = await Promise.all(roundInfoPromises);

          // OPTIMIZATION: Fetch all matches for all rounds in parallel
          const allMatchPromises = roundsInfo.flatMap(({ roundIdx, totalMatches }) =>
            Array.from({ length: totalMatches }, (_, matchIdx) =>
              contract.getMatch(tierId, instanceId, roundIdx, matchIdx)
                .then(matchData => ({ roundIdx, matchIdx, matchData: parseMatch(matchData) }))
                .catch(err => ({ roundIdx, matchIdx, error: err }))
            )
          );
          const allMatches = await Promise.all(allMatchPromises);

          // Process all fetched matches
          for (const { roundIdx, matchIdx, matchData, error } of allMatches) {
            if (error) continue;

            // Check if this is the player's match (parsed match has flattened structure)
            const isPlayer1 = matchData.player1?.toLowerCase() === account.toLowerCase();
            const isPlayer2 = matchData.player2?.toLowerCase() === account.toLowerCase();

            if (!isPlayer1 && !isPlayer2) continue;

            // Check if match was in progress when tournament ended
            const matchStatus = matchData.matchStatus;
            const matchKey = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;

            // Skip dismissed matches
            if (dismissedMatches.has(matchKey)) {
              console.log(`[PlayerActivity] Skipping dismissed terminated match ${matchKey}`);
              continue;
            }

            // If match was still in progress (status === 1), it was terminated by tournament completion
            if (matchStatus === 1) {
              const opponent = isPlayer1 ? matchData.player2 : matchData.player1;

              console.log(`[PlayerActivity] Found terminated match ${matchKey}`);
              terminatedMatches.push({
                tierId,
                instanceId,
                roundIdx,
                matchIdx,
                opponent,
                terminationReason: 'TOURNAMENT_COMPLETED',
              });
            }
          }

          // Skip to next tournament since this one is completed
          continue;
        }

        let hasActiveMatch = false;
        let playerRound = null; // Track which round the player is in

        // Note: isPlayerInAdvancedRound function doesn't exist in ChessOnChain
        // We'll determine the player's round by checking matches directly

        // OPTIMIZATION: Fetch all rounds info in parallel
        const roundInfoPromises = Array.from({ length: currentRound + 1 }, (_, roundIdx) =>
          contract.rounds(tierId, instanceId, roundIdx)
            .then(roundInfo => ({ roundIdx, totalMatches: Number(roundInfo.totalMatches) }))
        );
        const roundsInfo = await Promise.all(roundInfoPromises);

        console.log(`[PlayerActivity] Rounds info for T${tierId}I${instanceId}:`, roundsInfo.map(r => `R${r.roundIdx}:${r.totalMatches}matches`));

        // OPTIMIZATION: Fetch all matches for all rounds in parallel
        const allMatchPromises = roundsInfo.flatMap(({ roundIdx, totalMatches }) =>
          Array.from({ length: totalMatches }, (_, matchIdx) =>
            contract.getMatch(tierId, instanceId, roundIdx, matchIdx)
              .then(matchData => ({ roundIdx, matchIdx, matchData: parseMatch(matchData) }))
              .catch(err => ({ roundIdx, matchIdx, error: err }))
          )
        );
        const allMatches = await Promise.all(allMatchPromises);

        console.log(`[PlayerActivity] Fetched ${allMatches.length} total matches for T${tierId}I${instanceId}`);
        console.log(`[PlayerActivity] Matches with errors: ${allMatches.filter(m => m.error).length}`);

        // Collect active matches that need time remaining calculated
        const activeMatchesToFetch = [];

        // Process all fetched matches
        for (const { roundIdx, matchIdx, matchData, error } of allMatches) {
          if (error) {
            console.log(`[PlayerActivity] Skipping match T${tierId}I${instanceId}R${roundIdx}M${matchIdx} - fetch error:`, error);
            continue;
          }

          // Check if this is the player's match (parsed match has flattened structure)
          const isPlayer1 = matchData.player1?.toLowerCase() === account.toLowerCase();
          const isPlayer2 = matchData.player2?.toLowerCase() === account.toLowerCase();

          if (!isPlayer1 && !isPlayer2) {
            console.log(`[PlayerActivity] Skipping match T${tierId}I${instanceId}R${roundIdx}M${matchIdx} - player not in match (p1: ${matchData.player1}, p2: ${matchData.player2}, account: ${account})`);
            continue;
          }

          // Check if match is in progress OR recently completed
          const matchStatus = matchData.matchStatus;
          const isMyTurn = matchData.currentTurn?.toLowerCase() === account.toLowerCase();
          const matchKey = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;

          console.log(`[PlayerActivity] Found player's match at T${tierId}I${instanceId}R${roundIdx}M${matchIdx}:`, {
            status: matchStatus,
            isMyTurn,
            isDismissed: dismissedMatches.has(matchKey),
            player1: matchData.player1,
            player2: matchData.player2,
            player1TimeRemaining: matchData.player1TimeRemaining,
            player2TimeRemaining: matchData.player2TimeRemaining,
            lastMoveTime: matchData.lastMoveTime
          });

          // Skip dismissed matches
          if (dismissedMatches.has(matchKey)) {
            console.log(`[PlayerActivity] Skipping dismissed match ${matchKey}`);
            continue;
          }

          // Only include in-progress matches (status === 1)
          // Completed matches (status === 2) should not appear as "active"
          if (matchStatus === 1) {
            hasActiveMatch = true;

            // Determine opponent
            const opponent = isPlayer1 ? matchData.player2 : matchData.player1;

            // Collect for time remaining calculation later
            activeMatchesToFetch.push({
              tierId,
              instanceId,
              roundIdx,
              matchIdx,
              opponent,
              isMyTurn,
              isPlayer1,
              parsedMatch: matchData,
            });
          } else {
            console.log(`[PlayerActivity] Skipping match ${matchKey} - status not 1 (status: ${matchStatus})`);
          }
        }

        // OPTIMIZATION: Calculate time remaining for all active matches (same method as main board)
        if (activeMatchesToFetch.length > 0) {
          // Calculate time remaining client-side (same as main board logic in TicTacChain.jsx lines 1454-1468)
          const now = Math.floor(Date.now() / 1000);

          const matchesWithTime = activeMatchesToFetch.map(match => {
            const parsedMatch = match.parsedMatch;
            const elapsed = parsedMatch.lastMoveTime > 0 ? now - parsedMatch.lastMoveTime : 0;

            // Get tier config for default match time
            const tierMatchTime = tierConfig?.[match.tierId]?.timeouts?.matchTimePerPlayer || 120;

            console.log(`[PlayerActivity] TIME CALC DEBUG for T${match.tierId}I${match.instanceId}R${match.roundIdx}M${match.matchIdx}:`, {
              now,
              lastMoveTime: parsedMatch.lastMoveTime,
              elapsed,
              tierMatchTime,
              contractPlayer1Time: parsedMatch.player1TimeRemaining,
              contractPlayer2Time: parsedMatch.player2TimeRemaining,
              currentTurn: parsedMatch.currentTurn,
              matchStatus: parsedMatch.matchStatus
            });

            let player1TimeRemaining = parsedMatch.player1TimeRemaining ?? tierMatchTime;
            let player2TimeRemaining = parsedMatch.player2TimeRemaining ?? tierMatchTime;

            console.log(`[PlayerActivity] TIME CALC - Before elapsed subtraction:`, {
              player1TimeRemaining,
              player2TimeRemaining
            });

            // Only subtract elapsed time from the current player's clock (if match is active)
            if (parsedMatch.matchStatus === 1 && parsedMatch.currentTurn && elapsed > 0) {
              const isPlayer1Turn = parsedMatch.currentTurn.toLowerCase() === parsedMatch.player1.toLowerCase();
              if (isPlayer1Turn) {
                player1TimeRemaining = Math.max(0, player1TimeRemaining - elapsed);
              } else {
                player2TimeRemaining = Math.max(0, player2TimeRemaining - elapsed);
              }
            }

            console.log(`[PlayerActivity] TIME CALC - After elapsed subtraction:`, {
              player1TimeRemaining,
              player2TimeRemaining,
              finalTimeForPlayer: match.isPlayer1 ? player1TimeRemaining : player2TimeRemaining
            });

            return {
              ...match,
              timeRemaining: match.isPlayer1 ? player1TimeRemaining : player2TimeRemaining
            };
          });

          // Add all matches to activeMatches array
          matchesWithTime.forEach(({ tierId, instanceId, roundIdx, matchIdx, opponent, timeRemaining, isMyTurn }) => {
            console.log(`[PlayerActivity] Adding match T${tierId}I${instanceId}R${roundIdx}M${matchIdx} to activeMatches`, {
              opponent,
              timeRemaining,
              isMyTurn
            });

            activeMatches.push({
              tierId,
              instanceId,
              roundIdx,
              matchIdx,
              opponent,
              timeRemaining,
              isMyTurn,
            });
          });
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
      console.log('[PlayerActivity] Terminated Matches:', terminatedMatches.map(m =>
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
        terminatedMatches,
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
  }, [contract, account, gameName, tierConfig, dismissedMatches]);

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

  // Listen for MatchCompleted events for instant updates
  useEffect(() => {
    if (!contract || !account) return;

    // Handler for any MatchCompleted event
    const handleMatchCompleted = (matchId, winner, isDraw) => {
      console.log('[PlayerActivity] MatchCompleted event received:', { matchId, winner, isDraw });

      // Trigger a refetch to update the player's active matches
      fetchActivity(false);
    };

    // Register event listener (no filter - listen to all MatchCompleted events)
    contract.on('MatchCompleted', handleMatchCompleted);
    console.log('[PlayerActivity] MatchCompleted event listener registered');

    // Cleanup
    return () => {
      console.log('[PlayerActivity] Cleaning up MatchCompleted event listener');
      contract.off('MatchCompleted', handleMatchCompleted);
    };
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
