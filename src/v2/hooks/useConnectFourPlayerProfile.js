import { useState, useEffect, useCallback } from 'react';
import { getPlayerProfileContract, getInstanceContract, resolvePlayerProfileAddress } from '../lib/connectfour';

const HISTORY_LIMIT = 20;

export function useConnectFourPlayerProfile(factoryContract, runner, account) {
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

      const [rawStats, count] = await Promise.all([
        profile.getStats().catch(() => null),
        profile.getEnrollmentCount().catch(() => 0n),
      ]);

      if (rawStats) {
        setStats({
          totalPlayed: Number(rawStats.totalPlayed),
          totalWins: Number(rawStats.totalWins),
          totalLosses: Number(rawStats.totalLosses),
          totalNetEarnings: rawStats.totalNetEarnings,
        });
      }

      const total = Number(count);
      if (total > 0) {
        const offset = Math.max(0, total - HISTORY_LIMIT);
        const limit = Math.min(total, HISTORY_LIMIT);
        const recs = await profile.getEnrollments(offset, limit).catch(() => []);
        const enriched = await Promise.all([...recs].map(async r => {
          let playerCount = null;
          let instanceStatus = null;
          let instanceResolutionReason = null;
          let instanceResolutionCategory = null;
          let instanceWinner = null;
          let instancePrizeAwarded = 0n;
          try {
            const inst = getInstanceContract(r.instance, runner);
            const info = await inst.getInstanceInfo();
            playerCount = Number(info.playerCount ?? info.enrolledCount ?? 0) || null;
            instanceStatus = Number(info.status);
            instanceResolutionReason = Number(info.completionReason ?? 0);
            instanceResolutionCategory = Number(info.completionCategory ?? 0);
            instanceWinner = info.winner ?? null;
            instancePrizeAwarded = info.prizeAwarded ?? 0n;
          } catch {
            playerCount = null;
          }
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
          return {
            instance: r.instance,
            gameType: Number(r.gameType),
            enrolledAt: Number(r.enrolledAt),
            entryFee: r.entryFee,
            concluded: Boolean(r.concluded) || isResolvedOnChain,
            won: inferredResolutionReason === 6 ? false : (isCancelled ? false : inferredWin),
            prize: r.prize,
            prizePool: r.prize,
            payout: inferredPayout,
            payoutReason: Number(r.payoutReason ?? 0),
            rafflePool: r.rafflePool ?? 0n,
            wonRaffle: Boolean(r.wonRaffle ?? false),
            playerCount,
            instanceStatus,
            tournamentResolutionReason: inferredResolutionReason,
            tournamentResolutionCategory: inferredResolutionCategory,
          };
        }));
        setEnrollments(enriched.sort((a, b) => b.enrolledAt - a.enrolledAt));
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error('[useConnectFourPlayerProfile] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { profileAddress, stats, enrollments, loading, error, refetch: fetch };
}
