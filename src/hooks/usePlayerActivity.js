/**
 * usePlayerActivity Hook
 *
 * Custom hook for fetching player activity for a single game
 * Uses event-based polling to efficiently track player enrollments
 *
 * Approach:
 * - Every 5 seconds, query TournamentEnrolled events for the player (last 6 hours)
 * - Use event results to identify which tier/instance combinations to poll
 * - Only query contract state for tournaments the player has enrolled in
 * - Much more efficient than polling all tier instances
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseTicTacToeMatch, parseChessMatch, parseConnectFourMatch } from '../utils/matchDataParser';
import { queryPlayerEnrollmentEvents, queryTournamentStates } from '../utils/eventHelpers';

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
  // Track match keys that were previously active (to preserve them when contract data gets cleared)
  const previousActiveMatchesRef = useRef(new Set());
  // Track player's enrolled tier/instances from events
  const [playerEnrollments, setPlayerEnrollments] = useState([]);

  // Query player enrollment events to get tier/instance combinations
  const fetchPlayerEnrollments = useCallback(async () => {
    if (!contract || !account) return;

    try {
      console.log('[PlayerActivity] Querying TournamentEnrolled events for', account);
      const enrollments = await queryPlayerEnrollmentEvents(contract, account, 6); // Last 6 hours
      setPlayerEnrollments(enrollments);
      console.log('[PlayerActivity] Found', enrollments.length, 'unique enrollments');
    } catch (err) {
      console.error('[PlayerActivity] Error querying enrollment events:', err);
      // Don't update playerEnrollments on error - keep previous state
    }
  }, [contract, account]);

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

    // If no enrollments found yet, query them first
    if (playerEnrollments.length === 0 && !isInitialLoad) {
      console.log('[PlayerActivity] No enrollments cached, fetching first');
      await fetchPlayerEnrollments();
      // Will trigger re-render and fetchActivity will be called again with enrollments
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
      console.log('[PlayerActivity] Using', playerEnrollments.length, 'enrollments from events');

      // Step 1: Get player stats (total earnings)
      let totalEarnings = 0n;
      try {
        totalEarnings = await contract.playerEarnings(account);
      } catch (err) {
        console.warn('[PlayerActivity] Could not fetch player earnings:', err);
      }

      // Step 2: Query tournament states for player's enrollments
      // This replaces the old approach of polling ALL tier instances
      let tournamentStates = {};
      if (playerEnrollments.length > 0) {
        tournamentStates = await queryTournamentStates(contract, playerEnrollments);
      } else {
        console.log('[PlayerActivity] No enrollments to query, skipping tournament state check');
      }

      // Step 3: Categorize tournaments by status
      const unfilledTournaments = [];
      const activeTournaments = [];

      // For each enrollment, check if we need to also verify isEnrolled
      // Note: The events tell us the player enrolled, but they might have been eliminated/completed
      // We'll check the enrollment status for active tournaments
      const enrollmentCheckPromises = [];

      for (const [tierId, instances] of Object.entries(tournamentStates)) {
        for (const instance of instances) {
          // Check if player is still enrolled (for filtering)
          enrollmentCheckPromises.push(
            contract.isEnrolled(instance.tierId, instance.instanceId, account)
              .then(isEnrolled => ({ ...instance, isEnrolled }))
              .catch(() => ({ ...instance, isEnrolled: false }))
          );
        }
      }

      const instancesWithEnrollment = await Promise.all(enrollmentCheckPromises);

      // Categorize tournaments
      for (const instance of instancesWithEnrollment) {
        if (instance.status === 0 && instance.isEnrolled) {
          // Enrolling tournament
          const tierPlayerCount = tierConfig?.[instance.tierId]?.playerCount || 8;
          unfilledTournaments.push({
            tierId: instance.tierId,
            instanceId: instance.instanceId,
            enrolledCount: instance.enrolledCount,
            playerCount: tierPlayerCount,
          });
        } else if ((instance.status === 1 || instance.status === 2) && instance.isEnrolled) {
          // Active or completed tournament
          activeTournaments.push({
            tierId: instance.tierId,
            instanceId: instance.instanceId,
            tournamentStatus: instance.status,
            currentRound: instance.currentRound,
            enrolledCount: instance.enrolledCount
          });
        }
      }

      console.log('[PlayerActivity] Enrolling tournaments:', unfilledTournaments.length);
      console.log('[PlayerActivity] Active/completed tournaments:', activeTournaments.length);

      const activeMatches = [];
      const inProgressTournaments = [];
      const terminatedMatches = [];

      // Step 4: Process each active/completed tournament
      for (const { tierId, instanceId, tournamentStatus, currentRound, enrolledCount } of activeTournaments) {

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
          const matchKey = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;

          // Check if contract returned cleared data (zero addresses + empty board)
          const zeroAddress = '0x0000000000000000000000000000000000000000';
          const hasZeroAddresses =
            matchData.player1?.toLowerCase() === zeroAddress.toLowerCase() ||
            matchData.player2?.toLowerCase() === zeroAddress.toLowerCase();
          const isBoardEmpty = matchData.board?.every(cell => cell === 0);
          const isClearedData = hasZeroAddresses && isBoardEmpty;

          // If data is cleared but match was previously active, keep it (mini board will query event)
          const wasPreviouslyActive = previousActiveMatchesRef.current.has(matchKey);

          if (!isPlayer1 && !isPlayer2 && !isClearedData) {
            console.log(`[PlayerActivity] Skipping match T${tierId}I${instanceId}R${roundIdx}M${matchIdx} - player not in match (p1: ${matchData.player1}, p2: ${matchData.player2}, account: ${account})`);
            continue;
          }

          // If cleared data but not previously active, skip it
          if (isClearedData && !wasPreviouslyActive) {
            console.log(`[PlayerActivity] Skipping match ${matchKey} - cleared data and not previously active`);
            continue;
          }

          // If cleared data but WAS previously active, mark it as completed so mini board can handle it
          if (isClearedData && wasPreviouslyActive) {
            console.log(`[PlayerActivity] Including match ${matchKey} despite cleared data (was previously active)`);
            // Mark as completed status so it gets handled properly
            matchData.matchStatus = 2;
          }

          // Check if match is in progress OR recently completed
          const matchStatus = matchData.matchStatus;
          const isMyTurn = matchData.currentTurn?.toLowerCase() === account.toLowerCase();

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

          // Include in-progress matches (status === 1) AND recently completed matches (status === 2)
          // Completed matches will be shown with final board state in the activity panel
          if (matchStatus === 1 || matchStatus === 2) {
            hasActiveMatch = true;

            // Determine opponent (for cleared matches, use placeholder until mini board reconstructs)
            let opponent;
            if (isClearedData) {
              opponent = '0x0000000000000000000000000000000000000000'; // Placeholder
            } else {
              opponent = isPlayer1 ? matchData.player2 : matchData.player1;
            }

            // Collect for time remaining calculation later
            activeMatchesToFetch.push({
              tierId,
              instanceId,
              roundIdx,
              matchIdx,
              opponent,
              isMyTurn: matchStatus === 1 ? isMyTurn : false, // No turns in completed matches
              isPlayer1,
              parsedMatch: matchData,
              matchStatus, // Include status so we can handle completed matches differently
            });
          } else {
            console.log(`[PlayerActivity] Skipping match ${matchKey} - status not 1 or 2 (status: ${matchStatus})`);
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
          matchesWithTime.forEach(({ tierId, instanceId, roundIdx, matchIdx, opponent, timeRemaining, isMyTurn, matchStatus }) => {
            console.log(`[PlayerActivity] Adding match T${tierId}I${instanceId}R${roundIdx}M${matchIdx} to activeMatches`, {
              opponent,
              timeRemaining,
              isMyTurn,
              matchStatus
            });

            activeMatches.push({
              tierId,
              instanceId,
              roundIdx,
              matchIdx,
              opponent,
              timeRemaining,
              isMyTurn,
              matchStatus, // Include status so UI can show completed state
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

      // Sort active matches: in-progress first (your turn prioritized), then completed matches
      activeMatches.sort((a, b) => {
        // Completed matches go to the bottom
        if (a.matchStatus === 2 && b.matchStatus !== 2) return 1;
        if (a.matchStatus !== 2 && b.matchStatus === 2) return -1;
        // For in-progress matches, prioritize matches where it's your turn
        if (a.isMyTurn && !b.isMyTurn) return -1;
        if (!a.isMyTurn && b.isMyTurn) return 1;
        // Within same turn status, sort by time remaining (most urgent first)
        return a.timeRemaining - b.timeRemaining;
      });

      // Update tracking of active matches for next poll
      previousActiveMatchesRef.current = new Set(
        activeMatches.map(m => `${m.tierId}-${m.instanceId}-${m.roundIdx}-${m.matchIdx}`)
      );

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
  }, [contract, account, gameName, tierConfig, playerEnrollments, dismissedMatches, fetchPlayerEnrollments]);

  // Set up 5-second polling interval for enrollment events
  useEffect(() => {
    if (!contract || !account) return;

    // Initial fetch
    fetchPlayerEnrollments();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchPlayerEnrollments();
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [contract, account, fetchPlayerEnrollments]);

  // Fetch activity data whenever enrollments change
  useEffect(() => {
    if (!contract || !account) return;

    // Only fetch if we have enrollments or if this is initial load
    if (playerEnrollments.length > 0 || loading) {
      fetchActivity(loading);
    }
  }, [playerEnrollments, contract, account, fetchActivity, loading]);


  // Function to dismiss a completed match
  const dismissMatch = useCallback((tierId, instanceId, roundIdx, matchIdx) => {
    const matchKey = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;
    setDismissedMatches(prev => new Set([...prev, matchKey]));
  }, []);

  // Stable refetch function to prevent infinite re-renders
  // Also re-fetches enrollments for immediate updates
  const refetch = useCallback(async () => {
    // Fetch enrollments first to get latest event data
    await fetchPlayerEnrollments();
    // Then fetch activity based on new enrollments
    // Note: fetchActivity will be called automatically when playerEnrollments updates
  }, [fetchPlayerEnrollments]);

  // Expose enrollment fetcher for external triggers (e.g., after enrollment transaction)
  const refetchEnrollments = useCallback(async () => {
    await fetchPlayerEnrollments();
  }, [fetchPlayerEnrollments]);

  return {
    data,
    loading,
    syncing,
    error,
    refetch,
    refetchEnrollments, // New: Expose for calling after enrollment transactions
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
