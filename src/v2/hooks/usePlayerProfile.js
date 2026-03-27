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
 *   loading          — true during the initial fetch
 *   error            — error message string or null
 *   refetch          — manual refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { ZERO_ADDRESS, getPlayerProfileContract, getInstanceContract } from '../lib/tictactoe';

const HISTORY_LIMIT = 20;

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
      // Try factory.players(account) first, fall back to getPlayerProfile
      let addr = null;
      try {
        addr = await factoryContract.players(account);
      } catch {
        addr = null;
      }
      if (!addr || addr === ZERO_ADDRESS) {
        try {
          addr = await factoryContract.getPlayerProfile(account);
        } catch {
          addr = null;
        }
      }

      if (!addr || addr === ZERO_ADDRESS) {
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
        // Enrich with enrolledCount from each instance, then sort newest first
        const enriched = await Promise.all([...recs].map(async r => {
          let playerCount = null;
          let tournamentStatus = null;
          let tournamentWinner = ZERO_ADDRESS;
          let resolutionReason = 0;
          let resolutionCategory = 0;
          try {
            const inst = getInstanceContract(r.instance, runner);
            const [info, tournament] = await Promise.all([
              inst.getInstanceInfo(),
              inst.tournament().catch(() => null),
            ]);
            playerCount = Number(info.playerCount ?? info.enrolledCount ?? 0) || null;
            tournamentStatus = Number(info.status ?? tournament?.status ?? 0);
            tournamentWinner = info.winner ?? tournament?.winner ?? ZERO_ADDRESS;
            resolutionReason = Number(info.completionReason ?? tournament?.completionReason ?? 0);
            resolutionCategory = Number(info.completionCategory ?? tournament?.completionCategory ?? 0);
          } catch { /* ignore */ }
          return {
            instance: r.instance,
            gameType: Number(r.gameType),
            enrolledAt: Number(r.enrolledAt),
            entryFee: r.entryFee,
            concluded: r.concluded,
            won: r.won,
            prize: r.prize,
            playerCount,
            tournamentStatus,
            tournamentWinner,
            resolutionReason,
            resolutionCategory,
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

  return { profileAddress, stats, enrollments, loading, error, refetch: fetch };
}
