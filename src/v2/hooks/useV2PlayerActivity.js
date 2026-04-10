/**
 * useV2PlayerActivity Hook
 *
 * On wallet connect, resolves the player's PlayerProfile and fetches all
 * non-concluded tournament enrollments from it. The hook batches instance
 * and match reads through Multicall3 whenever available to avoid per-match
 * RPC bursts during polling.
 *
 * The currently-viewed instanceContract (if any) is always included and its
 * data takes priority so the bracket view stays in sync.
 *
 * Virtual tierId=0 / instanceId=0 are injected so V1 components route correctly.
 * When multiple instances are tracked, instanceId is set to the instance address
 * so downstream navigation can find the right contract.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { decodeTicTacToeMoves, getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS, resolvePlayerProfileAddress } from '../lib/tictactoe';
import { multicallContracts } from '../../utils/multicall';

const VIRTUAL_TIER_ID = 0;

const EMPTY_DATA = {
  activeMatches: [],
  inProgressTournaments: [],
  unfilledTournaments: [],
  terminatedMatches: [],
  totalEarnings: 0n,
};

const isEmptyActivityData = (value) => (
  (value?.activeMatches?.length || 0) === 0 &&
  (value?.inProgressTournaments?.length || 0) === 0 &&
  (value?.unfilledTournaments?.length || 0) === 0 &&
  (value?.terminatedMatches?.length || 0) === 0
);

function buildInstanceActivity(instance, account, dismissedMatches, matchResults) {
  const { instanceId, status, currentRound, enrolledCount, playerCount, matchTimePerPlayer } = instance;

  if (status === 0) {
    return {
      activeMatches: [],
      inProgressTournaments: [],
      unfilledTournaments: [{ tierId: VIRTUAL_TIER_ID, instanceId, enrolledCount, playerCount }],
      terminatedMatches: [],
    };
  }

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
        const moveCount = decodeTicTacToeMoves(m.moves || '').length;
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
export const useV2PlayerActivity = (instanceContract, account, factoryContract, runner, options = {}) => {
  const {
    enabled = true,
    pollIntervalMs = 5000,
    scanFactoryFallback = true,
    hasActiveContext = false,
    pollWhenEmpty = true,
  } = options;
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedMatches, setDismissedMatches] = useState(new Set());
  const [matchAlert, setMatchAlert] = useState(null);
  const alertedMatchKeysRef = useRef(new Set());
  const latestDataRef = useRef(EMPTY_DATA);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const fetchActivity = useCallback(async ({
    isInitialLoad = false,
    isBackgroundPoll = false,
    forceScan = false,
  } = {}) => {
    if (!enabled) {
      setLoading(false);
      setSyncing(false);
      return;
    }

    if (!account) {
      setLoading(false);
      setSyncing(false);
      setData(EMPTY_DATA);
      return;
    }

    if (isBackgroundPoll && !hasActiveContext && !pollWhenEmpty && isEmptyActivityData(latestDataRef.current)) {
      setSyncing(false);
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
          const profileAddr = await resolvePlayerProfileAddress(factoryContract, runner, account);

          if (profileAddr) {
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
        if ((scanFactoryFallback || forceScan) && instanceMap.size === 0) {
          try {
            const activeCount = Number(await factoryContract.getActiveTournamentCount().catch(() => 0n));
            if (activeCount > 0) {
              const addressResults = await multicallContracts(
                Array.from({ length: activeCount }, (_, index) => ({
                  contract: factoryContract,
                  functionName: 'activeTournaments',
                  params: [index],
                })),
                runner
              );
              const addresses = addressResults
                .filter((result) => result.success && result.result && result.result !== ZERO_ADDRESS)
                .map((result) => result.result);

              const contractsToCheck = addresses
                .map((addr) => ({ addr, lower: addr.toLowerCase() }))
                .filter(({ lower }) => !instanceMap.has(lower))
                .map(({ addr, lower }) => ({ lower, contract: getInstanceContract(addr, runner) }));

              const enrollmentResults = contractsToCheck.length > 0
                ? await multicallContracts(
                  contractsToCheck.map(({ contract }) => ({
                    contract,
                    functionName: 'isEnrolled',
                    params: [account],
                  })),
                  runner
                )
                : [];

              const checks = contractsToCheck.map((entry, index) => (
                enrollmentResults[index]?.success && enrollmentResults[index].result ? entry : null
              ));
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

      const instanceEntries = [...instanceMap.entries()].map(([address, contract]) => ({ address, contract }));

      const baseCallSpecs = instanceEntries.flatMap(({ contract }) => ([
        { contract, functionName: 'isEnrolled', params: [account] },
        { contract, functionName: 'tournament' },
        { contract, functionName: 'tierConfig' },
        { contract, functionName: 'getBracket' },
      ]));

      const baseResults = await multicallContracts(baseCallSpecs, runner);

      const trackedInstances = [];
      const matchCallSpecs = [];
      const matchDescriptors = [];
      const merged = {
        activeMatches: [],
        inProgressTournaments: [],
        unfilledTournaments: [],
        terminatedMatches: [],
      };

      let cursor = 0;
      for (const { address, contract } of instanceEntries) {
        const enrolledResult = baseResults[cursor++];
        const tournamentResult = baseResults[cursor++];
        const tierConfigResult = baseResults[cursor++];
        const bracketResult = baseResults[cursor++];

        if (!enrolledResult?.success || !enrolledResult.result || !tournamentResult?.success) continue;

        const tournament = tournamentResult.result;
        const tc = tierConfigResult?.success ? tierConfigResult.result : null;
        const bracket = bracketResult?.success ? bracketResult.result : null;
        const status = Number(tournament.status);

        if (status === 2) continue;

        const instance = {
          address,
          instanceId: address,
          status,
          currentRound: Number(tournament.currentRound || 0),
          enrolledCount: Number(tournament.enrolledCount || 0),
          playerCount: Number(tc?.playerCount || 2),
          matchTimePerPlayer: tc ? Number(tc.timeouts.matchTimePerPlayer) : 120,
        };

        if (status === 0) {
          merged.unfilledTournaments.push({
            tierId: VIRTUAL_TIER_ID,
            instanceId: address,
            enrolledCount: instance.enrolledCount,
            playerCount: instance.playerCount,
          });
          continue;
        }

        trackedInstances.push(instance);

        const totalRounds = Number(bracket?.totalRounds || 0);
        for (let roundIdx = 0; roundIdx <= instance.currentRound && roundIdx < totalRounds; roundIdx++) {
          const matchCount = Number(bracket?.matchCounts?.[roundIdx] || 0);
          for (let matchIdx = 0; matchIdx < matchCount; matchIdx++) {
            matchDescriptors.push({ address, roundIdx, matchIdx });
            matchCallSpecs.push({
              contract,
              functionName: 'getMatch',
              params: [roundIdx, matchIdx],
            });
          }
        }
      }

      const matchResultCalls = matchCallSpecs.length > 0
        ? await multicallContracts(matchCallSpecs, runner)
        : [];

      const matchResultsByInstance = new Map();
      for (let index = 0; index < matchDescriptors.length; index++) {
        const descriptor = matchDescriptors[index];
        const callResult = matchResultCalls[index];
        if (!callResult?.success) continue;

        const entries = matchResultsByInstance.get(descriptor.address) || [];
        entries.push({
          roundIdx: descriptor.roundIdx,
          matchIdx: descriptor.matchIdx,
          m: callResult.result,
        });
        matchResultsByInstance.set(descriptor.address, entries);
      }

      // ── 3. Merge results ─────────────────────────────────────────────────
      for (const instance of trackedInstances) {
        const result = buildInstanceActivity(
          instance,
          account,
          dismissedMatches,
          matchResultsByInstance.get(instance.address) || []
        );
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
        if (!alertedMatchKeysRef.current.has(key)) {
          alertedMatchKeysRef.current.add(key);
          setMatchAlert(priority);
        }
      }

      setData({ ...EMPTY_DATA, ...merged });
    } catch (err) {
      console.error('[V2PlayerActivity] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [enabled, instanceContract, account, factoryContract, runner, dismissedMatches, scanFactoryFallback, hasActiveContext, pollWhenEmpty]);

  // Re-fetch on account/contract change
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setSyncing(false);
      return;
    }
    fetchActivity({ isInitialLoad: true });
  }, [enabled, instanceContract, account, factoryContract, fetchActivity]);

  // Poll at the configured interval
  useEffect(() => {
    if (!enabled || !account) return;
    const interval = setInterval(() => fetchActivity({ isBackgroundPoll: true }), pollIntervalMs);
    return () => clearInterval(interval);
  }, [account, enabled, fetchActivity, pollIntervalMs]);

  useEffect(() => {
    alertedMatchKeysRef.current = new Set();
  }, [account]);

  const refetch = useCallback(() => fetchActivity({ forceScan: true }), [fetchActivity]);

  const dismissMatch = useCallback((tierId, instanceId, roundIdx, matchIdx) => {
    const key = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;
    setDismissedMatches(prev => new Set([...prev, key]));
  }, []);

  const clearMatchAlert = useCallback(() => setMatchAlert(null), []);

  return { data, loading, syncing, error, refetch, dismissMatch, matchAlert, clearMatchAlert };
};
