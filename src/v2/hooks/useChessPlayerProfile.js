import { useState, useEffect, useCallback } from 'react';
import { getPlayerProfileContract, getInstanceContract, resolvePlayerProfileAddress } from '../lib/chess';

const HISTORY_LIMIT = 20;

export function useChessPlayerProfile(factoryContract, runner, account) {
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
        const enriched = await Promise.all(recs.map(async (r) => {
          let playerCount = null;
          try {
            const inst = getInstanceContract(r.instance, runner);
            const info = await inst.getInstanceInfo();
            playerCount = Number(info.playerCount ?? info.enrolledCount ?? 0) || null;
          } catch {}
          return {
            instance: r.instance,
            gameType: Number(r.gameType),
            enrolledAt: Number(r.enrolledAt),
            entryFee: r.entryFee,
            concluded: r.concluded,
            won: r.won,
            prize: r.prize,
            playerCount,
            tournamentResolutionReason: Number(r.tournamentResolutionReason ?? 0),
            tournamentResolutionCategory: Number(r.tournamentResolutionCategory ?? 0),
          };
        }));
        setEnrollments(enriched.sort((a, b) => b.enrolledAt - a.enrolledAt));
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error('[useChessPlayerProfile] Error:', err);
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
