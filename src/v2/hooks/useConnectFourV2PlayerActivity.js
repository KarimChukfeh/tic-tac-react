import { useState, useEffect, useCallback, useRef } from 'react';
import { decodeConnectFourMoves, getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS, resolvePlayerProfileAddress } from '../lib/connectfour';
import { multicallContracts } from '../../utils/multicall';

const VIRTUAL_TIER_ID = 0;

const EMPTY_DATA = {
  activeMatches: [],
  inProgressTournaments: [],
  unfilledTournaments: [],
  terminatedMatches: [],
  totalEarnings: 0n,
};

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
        const moveCount = decodeConnectFourMoves(m.moves || '').length;
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

export const useConnectFourV2PlayerActivity = (instanceContract, account, factoryContract, runner) => {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedMatches, setDismissedMatches] = useState(new Set());
  const [matchAlert, setMatchAlert] = useState(null);
  const alertedMatchKeysRef = useRef(new Set());

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

      const instanceMap = new Map();

      if (instanceContract) {
        const addr = (instanceContract.target || instanceContract.address)?.toLowerCase();
        if (addr) instanceMap.set(addr, instanceContract);
      }

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
          console.warn('[ConnectFourV2PlayerActivity] Profile lookup failed:', profileErr.message);
        }

        if (instanceMap.size === 0 || instanceContract == null) {
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
            console.warn('[ConnectFourV2PlayerActivity] activeTournaments fallback failed:', factoryErr.message);
          }
        }
      }

      const instanceEntries = [...instanceMap.entries()].map(([address, contract]) => ({ address, contract }));

      const baseCallSpecs = instanceEntries.flatMap(({ contract }) => ([
        { contract, functionName: 'isEnrolled', params: [account] },
        { contract, functionName: 'tournament' },
        { contract, functionName: 'tierConfig' },
        { contract, functionName: 'getBracket' },
      ]));

      const baseResults = await multicallContracts(baseCallSpecs, runner);

      const next = {
        activeMatches: [],
        inProgressTournaments: [],
        unfilledTournaments: [],
        terminatedMatches: [],
        totalEarnings: 0n,
      };

      const trackedInstances = [];
      const matchCallSpecs = [];
      const matchDescriptors = [];

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
          matchTimePerPlayer: tc ? Number(tc.timeouts.matchTimePerPlayer) : 300,
        };

        if (status === 0) {
          next.unfilledTournaments.push({
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

      for (const instance of trackedInstances) {
        const scan = buildInstanceActivity(
          instance,
          account,
          dismissedMatches,
          matchResultsByInstance.get(instance.address) || []
        );
        if (!scan) continue;
        next.activeMatches.push(...scan.activeMatches);
        next.inProgressTournaments.push(...scan.inProgressTournaments);
        next.unfilledTournaments.push(...scan.unfilledTournaments);
        next.terminatedMatches.push(...scan.terminatedMatches);
      }

      for (const match of next.activeMatches) {
        const key = `${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;
        if (match.matchStatus === 1 && match.isMyTurn && !alertedMatchKeysRef.current.has(key)) {
          alertedMatchKeysRef.current.add(key);
          setMatchAlert(match);
          break;
        }
      }

      setData(next);
    } catch (err) {
      console.error('[useConnectFourV2PlayerActivity] Error:', err);
      setError(err.message || 'Failed to load player activity.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [account, instanceContract, factoryContract, runner, dismissedMatches]);

  useEffect(() => {
    fetchActivity(true);
  }, [fetchActivity]);

  useEffect(() => {
    if (!account) return;
    const id = setInterval(() => fetchActivity(false), 5000);
    return () => clearInterval(id);
  }, [account, fetchActivity]);

  useEffect(() => {
    alertedMatchKeysRef.current = new Set();
  }, [account]);

  const refetch = useCallback(() => fetchActivity(false), [fetchActivity]);

  const dismissMatch = useCallback((tierId, instanceId, roundIdx, matchIdx) => {
    const key = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;
    setDismissedMatches(prev => new Set(prev).add(key));
  }, []);

  const clearMatchAlert = useCallback(() => setMatchAlert(null), []);

  return {
    data,
    loading,
    syncing,
    error,
    matchAlert,
    refetch,
    dismissMatch,
    clearMatchAlert,
  };
};
