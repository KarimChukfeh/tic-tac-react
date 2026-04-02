/**
 * usePlayerProfile
 *
 * Resolves the connected player's PlayerProfile contract from the factory and
 * returns their on-chain stats + recent enrollment history.
 *
 * Returns:
 *   profileAddress   — address of the PlayerProfile clone (null if not yet created)
 *   stats            — { totalPlayed, totalWins, totalLosses, totalNetEarnings } or null
 *   enrollments      — array of EnrollmentRecord (newest first, up to HISTORY_LIMIT)
 *                      including payout fields from the profile record
 *   loading          — true during the initial fetch
 *   error            — error message string or null
 *   refetch          — manual refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { getPlayerProfileContract, getInstanceContract, resolvePlayerProfileAddress } from '../lib/tictactoe';

const HISTORY_LIMIT = 20;
const POLL_INTERVAL_MS = 8000;

export function usePlayerProfile(factoryContract, runner, account) {
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
        // Player hasn't enrolled in any tournament yet
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
          totalNetEarnings: rawStats.totalNetEarnings, // BigInt (signed)
        });
      }

      const total = Number(count);
      if (total > 0) {
        const offset = Math.max(0, total - HISTORY_LIMIT);
        const limit = Math.min(total, HISTORY_LIMIT);
        const recs = await profile.getEnrollments(offset, limit).catch(() => []);
        // Enrich only display metadata that is not present on the profile record itself.
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
          } catch { /* ignore */ }
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
      console.error('[usePlayerProfile] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!factoryContract || !runner || !account) return;
    const id = setInterval(() => fetch(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [account, factoryContract, fetch, runner]);

  return { profileAddress, stats, enrollments, loading, error, refetch: fetch };
}
