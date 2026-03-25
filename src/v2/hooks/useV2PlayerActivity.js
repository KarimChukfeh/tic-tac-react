/**
 * useV2PlayerActivity Hook
 *
 * On wallet connect, resolves the player's PlayerProfile and fetches all
 * non-concluded tournament enrollments from it. Each tournament address is
 * then queried in parallel (Promise.all acting as a client-side multicall)
 * to build the activity dashboard.
 *
 * The currently-viewed instanceContract (if any) is always included and its
 * data takes priority so the bracket view stays in sync.
 *
 * Virtual tierId=0 / instanceId=0 are injected so V1 components route correctly.
 * When multiple instances are tracked, instanceId is set to the instance address
 * so downstream navigation can find the right contract.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS } from '../lib/tictactoe';

const VIRTUAL_TIER_ID = 0;

const EMPTY_DATA = {
  activeMatches: [],
  inProgressTournaments: [],
  unfilledTournaments: [],
  terminatedMatches: [],
  totalEarnings: 0n,
};

// ─── Per-instance activity scanner ──────────────────────────────────────────

async function scanInstance(instanceContract, account, dismissedMatches, instanceAddress) {
  const instanceId = instanceAddress; // use address as instanceId for routing

  const [isEnrolled, tournament, tc] = await Promise.all([
    instanceContract.isEnrolled(account).catch(() => false),
    instanceContract.tournament(),
    instanceContract.tierConfig().catch(() => null),
  ]);

  if (!isEnrolled) return null;

  const status = Number(tournament.status);

  // Don't show anything in the activity panel for completed tournaments
  if (status === 2) return null;
  const currentRound = Number(tournament.currentRound || 0);
  const enrolledCount = Number(tournament.enrolledCount || 0);
  const playerCount = Number(tc?.playerCount || 2);
  const matchTimePerPlayer = tc ? Number(tc.timeouts.matchTimePerPlayer) : 120;

  // Enrolling — waiting for players
  if (status === 0) {
    return {
      activeMatches: [],
      inProgressTournaments: [],
      unfilledTournaments: [{ tierId: VIRTUAL_TIER_ID, instanceId, enrolledCount, playerCount }],
      terminatedMatches: [],
    };
  }

  // Active or completed — scan matches
  const bracket = await instanceContract.getBracket();
  const totalRounds = Number(bracket.totalRounds || 0);

  // Fetch all matches for rounds 0..currentRound in parallel
  const matchFetches = [];
  for (let roundIdx = 0; roundIdx <= currentRound && roundIdx < totalRounds; roundIdx++) {
    const matchCount = Number(bracket.matchCounts[roundIdx] || 0);
    for (let matchIdx = 0; matchIdx < matchCount; matchIdx++) {
      matchFetches.push(
        instanceContract.getMatch(roundIdx, matchIdx)
          .then(m => ({ roundIdx, matchIdx, m }))
          .catch(() => null)
      );
    }
  }

  const matchResults = await Promise.all(matchFetches);

  const activeMatches = [];
  const terminatedMatches = [];
  let hasActiveMatch = false;

  for (const result of matchResults) {
    if (!result) continue;
    const { roundIdx, matchIdx, m } = result;

    const p1 = m.player1?.toLowerCase();
    const p2 = m.player2?.toLowerCase();
    const acc = account.toLowerCase();
    const isPlayer1 = p1 === acc;
    const isPlayer2 = p2 === acc;
    if (!isPlayer1 && !isPlayer2) continue;

    const matchKey = `${VIRTUAL_TIER_ID}-${instanceId}-${roundIdx}-${matchIdx}`;
    if (dismissedMatches.has(matchKey)) continue;

    const matchStatus = Number(m.status);

    if (status === 2 && matchStatus === 1) {
      terminatedMatches.push({
        tierId: VIRTUAL_TIER_ID,
        instanceId,
        roundIdx,
        matchIdx,
        opponent: isPlayer1 ? m.player2 : m.player1,
        terminationReason: 'TOURNAMENT_COMPLETED',
      });
      continue;
    }

    if (matchStatus === 1 || matchStatus === 2) {
      hasActiveMatch = true;
      const opponent = isPlayer1 ? m.player2 : m.player1;
      const now = Math.floor(Date.now() / 1000);
      const lastMove = Number(m.lastMoveTime || 0);
      const elapsed = lastMove > 0 ? now - lastMove : 0;
      const timeRemaining = Math.max(0, matchTimePerPlayer - elapsed);

      let isMyTurn = false;
      if (matchStatus === 1) {
        const moveCount = m.moves ? m.moves.split(',').filter(Boolean).length : 0;
        const isPlayer1Turn = moveCount % 2 === 0;
        isMyTurn = isPlayer1Turn ? isPlayer1 : isPlayer2;
      }

      activeMatches.push({
        tierId: VIRTUAL_TIER_ID,
        instanceId,
        roundIdx,
        matchIdx,
        opponent,
        timeRemaining,
        isMyTurn,
        matchStatus,
        // Include outcome fields for completed matches
        winner: matchStatus === 2 ? (m.matchWinner || null) : null,
        isDraw: matchStatus === 2 ? Boolean(m.isDraw) : false,
      });
    }
  }

  const inProgressTournaments = [];
  if (status === 1 && !hasActiveMatch) {
    inProgressTournaments.push({
      tierId: VIRTUAL_TIER_ID,
      instanceId,
      currentRound,
      playerRound: null,
    });
  }

  return { activeMatches, inProgressTournaments, unfilledTournaments: [], terminatedMatches };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * @param {Object|null}  instanceContract  - Currently-viewed V2 instance (read-only)
 * @param {string|null}  account           - Connected wallet address
 * @param {Object|null}  factoryContract   - Factory contract (read-only) for profile lookup
 * @param {Object|null}  runner            - ethers provider for constructing extra contracts
 */
export const useV2PlayerActivity = (instanceContract, account, factoryContract, runner) => {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedMatches, setDismissedMatches] = useState(new Set());
  const [matchAlert, setMatchAlert] = useState(null);
  const previousActiveMatchesRef = useRef(new Set());

  const fetchActivity = useCallback(async (isInitialLoad = false) => {
    if (!account) {
      setLoading(false);
      setSyncing(false);
      setData(EMPTY_DATA);
      return;
    }

    try {
      if (isInitialLoad) setLoading(true);
      else setSyncing(true);
      setError(null);

      // ── 1. Collect instance addresses to scan ─────────────────────────────
      // Start with the currently-viewed instance (if any)
      const instanceMap = new Map(); // address → contract

      if (instanceContract) {
        const addr = (instanceContract.target || instanceContract.address)?.toLowerCase();
        if (addr) instanceMap.set(addr, instanceContract);
      }

      // Pull enrollments from PlayerProfile (when available)
      if (factoryContract && runner) {
        try {
          let profileAddr = null;
          try { profileAddr = await factoryContract.players(account); } catch { /* */ }
          if (!profileAddr || profileAddr === ZERO_ADDRESS) {
            try { profileAddr = await factoryContract.getPlayerProfile(account); } catch { /* */ }
          }

          if (profileAddr && profileAddr !== ZERO_ADDRESS) {
            const profile = getPlayerProfileContract(profileAddr, runner);
            const countRaw = await profile.getEnrollmentCount().catch(() => 0n);
            const total = Number(countRaw);

            if (total > 0) {
              const limit = Math.min(total, 50);
              const offset = Math.max(0, total - limit);
              const recs = await profile.getEnrollments(offset, limit).catch(() => []);

              for (const rec of recs) {
                if (rec.concluded) continue;
                const addr = rec.instance?.toLowerCase();
                if (!addr || addr === ZERO_ADDRESS) continue;
                if (!instanceMap.has(addr)) {
                  instanceMap.set(addr, getInstanceContract(rec.instance, runner));
                }
              }
            }
          }
        } catch (profileErr) {
          console.warn('[V2PlayerActivity] Profile lookup failed:', profileErr.message);
        }

        // Fallback: scan activeTournaments from the factory directly.
        // Covers cases where the PlayerProfile mapping isn't populated yet.
        if (instanceMap.size === 0 || (instanceContract == null)) {
          try {
            const activeCount = Number(await factoryContract.getActiveTournamentCount().catch(() => 0n));
            if (activeCount > 0) {
              const addresses = await Promise.all(
                Array.from({ length: activeCount }, (_, i) =>
                  factoryContract.activeTournaments(i).catch(() => null)
                )
              );
              // Check enrollment in parallel
              const checks = await Promise.all(
                addresses.map(async addr => {
                  if (!addr || addr === ZERO_ADDRESS) return null;
                  const lower = addr.toLowerCase();
                  if (instanceMap.has(lower)) return null;
                  const contract = getInstanceContract(addr, runner);
                  const enrolled = await contract.isEnrolled(account).catch(() => false);
                  return enrolled ? { lower, contract } : null;
                })
              );
              for (const entry of checks) {
                if (entry) instanceMap.set(entry.lower, entry.contract);
              }
            }
          } catch (factoryErr) {
            console.warn('[V2PlayerActivity] activeTournaments fallback failed:', factoryErr.message);
          }
        }
      }

      if (instanceMap.size === 0) {
        setData(EMPTY_DATA);
        setLoading(false);
        setSyncing(false);
        return;
      }

      // ── 2. Scan all instances in parallel ────────────────────────────────
      const scanResults = await Promise.all(
        [...instanceMap.entries()].map(([addr, contract]) =>
          scanInstance(contract, account, dismissedMatches, addr).catch(err => {
            console.warn(`[V2PlayerActivity] scanInstance(${addr}) failed:`, err.message);
            return null;
          })
        )
      );

      // ── 3. Merge results ─────────────────────────────────────────────────
      const merged = {
        activeMatches: [],
        inProgressTournaments: [],
        unfilledTournaments: [],
        terminatedMatches: [],
      };

      for (const result of scanResults) {
        if (!result) continue;
        merged.activeMatches.push(...result.activeMatches);
        merged.inProgressTournaments.push(...result.inProgressTournaments);
        merged.unfilledTournaments.push(...result.unfilledTournaments);
        merged.terminatedMatches.push(...result.terminatedMatches);
      }

      // Sort active matches: your-turn first, then by urgency
      merged.activeMatches.sort((a, b) => {
        if (a.matchStatus === 2 && b.matchStatus !== 2) return 1;
        if (a.matchStatus !== 2 && b.matchStatus === 2) return -1;
        if (a.isMyTurn && !b.isMyTurn) return -1;
        if (!a.isMyTurn && b.isMyTurn) return 1;
        return a.timeRemaining - b.timeRemaining;
      });

      // ── 4. Match alert ───────────────────────────────────────────────────
      const inProgressMatches = merged.activeMatches.filter(m => m.matchStatus === 1);
      if (inProgressMatches.length > 0) {
        const priority = inProgressMatches[0];
        const key = `${priority.tierId}-${priority.instanceId}-${priority.roundIdx}-${priority.matchIdx}`;
        if (isInitialLoad || !previousActiveMatchesRef.current.has(key)) {
          setMatchAlert(priority);
        }
      }

      previousActiveMatchesRef.current = new Set(
        merged.activeMatches.map(m => `${m.tierId}-${m.instanceId}-${m.roundIdx}-${m.matchIdx}`)
      );

      setData({ ...EMPTY_DATA, ...merged });
    } catch (err) {
      console.error('[V2PlayerActivity] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [instanceContract, account, factoryContract, runner, dismissedMatches]);

  // Re-fetch on account/contract change
  useEffect(() => {
    fetchActivity(true);
  }, [instanceContract, account, factoryContract, fetchActivity]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!account) return;
    const interval = setInterval(() => fetchActivity(false), 5000);
    return () => clearInterval(interval);
  }, [account, fetchActivity]);

  const refetch = useCallback(() => fetchActivity(false), [fetchActivity]);

  const dismissMatch = useCallback((tierId, instanceId, roundIdx, matchIdx) => {
    const key = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;
    setDismissedMatches(prev => new Set([...prev, key]));
  }, []);

  const clearMatchAlert = useCallback(() => setMatchAlert(null), []);

  return { data, loading, syncing, error, refetch, dismissMatch, matchAlert, clearMatchAlert };
};
