import { useState, useEffect, useCallback } from 'react';
import { getPlayerProfileContract, getInstanceContract, resolvePlayerProfileAddress } from '../lib/connectfour';
import { adjustProfileWinTotal, isProfileEnrollmentWin } from '../lib/playerProfileStats';
import { multicallContracts } from '../../utils/multicall';

const HISTORY_LIMIT = 20;
const POLL_INTERVAL_MS = 8000;

export function useConnectFourPlayerProfile(factoryContract, runner, account, options = {}) {
  const {
    enabled = true,
    pollIntervalMs = POLL_INTERVAL_MS,
  } = options;
  const [profileAddress, setProfileAddress] = useState(null);
  const [stats, setStats] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!factoryContract || !runner || !account) {
      setProfileAddress(null);
      setStats(null);
      setEnrollments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addr = await resolvePlayerProfileAddress(factoryContract, runner, account);
      if (!addr) {
        setProfileAddress(null);
        setStats(null);
        setEnrollments([]);
        return;
      }

      setProfileAddress(addr);
      const profile = getPlayerProfileContract(addr, runner);

      const profileResults = await multicallContracts([
        { contract: profile, functionName: 'getStats' },
        { contract: profile, functionName: 'getEnrollmentCount' },
      ], runner);
      const rawStats = profileResults[0]?.success ? profileResults[0].result : await profile.getStats().catch(() => null);
      const count = profileResults[1]?.success ? profileResults[1].result : await profile.getEnrollmentCount().catch(() => 0n);

      const total = Number(count);
      let recs = [];
      let enriched = [];

      if (total > 0) {
        const offset = Math.max(0, total - HISTORY_LIMIT);
        const limit = Math.min(total, HISTORY_LIMIT);
        recs = await profile.getEnrollments(offset, limit).catch(() => []);
        const instanceMap = new Map();
        for (const rec of recs) {
          const lower = rec.instance?.toLowerCase();
          if (!lower || instanceMap.has(lower)) continue;
          instanceMap.set(lower, { address: rec.instance, contract: getInstanceContract(rec.instance, runner) });
        }
        const instanceEntries = [...instanceMap.values()];
        const infoResults = instanceEntries.length > 0
          ? await multicallContracts(
            instanceEntries.map(({ contract }) => ({ contract, functionName: 'getInstanceInfo' })),
            runner
          )
          : [];
        const instanceInfoByAddress = new Map();
        instanceEntries.forEach((entry, index) => {
          instanceInfoByAddress.set(entry.address.toLowerCase(), infoResults[index]?.success ? infoResults[index].result : null);
        });

        enriched = [...recs].map((r) => {
          const info = instanceInfoByAddress.get(r.instance?.toLowerCase()) || null;
          const playerCount = Number(info?.playerCount ?? info?.enrolledCount ?? 0) || null;
          const instanceStatus = info ? Number(info.status) : null;
          const instanceResolutionReason = info ? Number(info.completionReason ?? 0) : null;
          const instanceResolutionCategory = info ? Number(info.completionCategory ?? 0) : null;
          const instanceWinner = info?.winner ?? null;
          const instancePrizeAwarded = info?.prizeAwarded ?? 0n;
          const isCancelled = instanceStatus === 3;
          const isResolvedOnChain = instanceStatus === 2 || isCancelled;
          const inferredResolutionReason = (!r.concluded && isResolvedOnChain)
            ? instanceResolutionReason
            : Number(r.tournamentResolutionReason ?? 0);
          const inferredResolutionCategory = (!r.concluded && isResolvedOnChain)
            ? instanceResolutionCategory
            : Number(r.tournamentResolutionCategory ?? 0);
          const inferredWin = (!r.concluded && isResolvedOnChain && instanceWinner)
            ? String(instanceWinner).toLowerCase() === String(account).toLowerCase()
            : Boolean(r.won);
          const inferredPayout = (!r.concluded && isResolvedOnChain && instanceWinner
            && String(instanceWinner).toLowerCase() === String(account).toLowerCase())
            ? (r.payout && r.payout > 0n ? r.payout : instancePrizeAwarded)
            : (r.payout ?? 0n);
          const normalizedWon = isProfileEnrollmentWin({
            won: inferredWin,
            instanceStatus,
            resolutionReason: inferredResolutionReason,
          });
          return {
            instance: r.instance,
            gameType: Number(r.gameType),
            enrolledAt: Number(r.enrolledAt),
            entryFee: r.entryFee,
            concluded: Boolean(r.concluded) || isResolvedOnChain,
            won: normalizedWon,
            prize: r.prize,
            prizePool: r.prize,
            payout: inferredPayout,
            payoutReason: Number(r.payoutReason ?? 0),
            playerCount,
            instanceStatus,
            tournamentResolutionReason: inferredResolutionReason,
            tournamentResolutionCategory: inferredResolutionCategory,
          };
        });
        setEnrollments(enriched.sort((a, b) => b.enrolledAt - a.enrolledAt));
      } else {
        setEnrollments([]);
      }

      if (rawStats) {
        setStats({
          totalPlayed: Number(rawStats.totalPlayed),
          totalWins: adjustProfileWinTotal(rawStats.totalWins, recs, enriched),
          totalLosses: Number(rawStats.totalLosses),
          totalNetEarnings: rawStats.totalNetEarnings,
        });
      }
    } catch (err) {
      console.error('[useConnectFourPlayerProfile] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetch();
  }, [enabled, fetch]);

  useEffect(() => {
    if (!enabled || !factoryContract || !runner || !account) return;
    const id = setInterval(() => fetch(), pollIntervalMs);
    return () => clearInterval(id);
  }, [account, enabled, factoryContract, fetch, pollIntervalMs, runner]);

  return { profileAddress, stats, enrollments, loading, error, refetch: fetch };
}
