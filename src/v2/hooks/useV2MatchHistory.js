/**
 * useV2MatchHistory
 *
 * Fetches completed match history for the connected player across all enrolled
 * V2 tournament instances. Returns matches in the same shape expected by
 * RecentMatchesCard (the v2Matches prop path).
 */

import { useState, useEffect, useCallback } from 'react';
import { getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS } from '../lib/tictactoe';

const HISTORY_LIMIT = 30;

export function useV2MatchHistory(factoryContract, runner, account) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!factoryContract || !runner || !account) {
      setMatches([]);
      return;
    }

    setLoading(true);
    try {
      // ── 1. Resolve all enrolled instance addresses from PlayerProfile ──────
      let instanceAddresses = [];

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
          const limit = Math.min(total, HISTORY_LIMIT);
          const offset = Math.max(0, total - limit);
          const recs = await profile.getEnrollments(offset, limit).catch(() => []);
          instanceAddresses = recs
            .map(r => r.instance)
            .filter(addr => addr && addr !== ZERO_ADDRESS);
        }
      }

      if (instanceAddresses.length === 0) {
        setMatches([]);
        return;
      }

      // ── 2. Scan each instance for the player's completed matches ──────────
      const allMatches = [];

      await Promise.all(instanceAddresses.map(async (instanceAddress) => {
        try {
          const instance = getInstanceContract(instanceAddress, runner);
          const [bracket, tc] = await Promise.all([
            instance.getBracket().catch(() => null),
            instance.tierConfig().catch(() => null),
          ]);

          if (!bracket) return;

          const totalRounds = Number(bracket.totalRounds || 0);
          const playerCount = Number(tc?.playerCount || 2);

          for (let roundIdx = 0; roundIdx < totalRounds; roundIdx++) {
            const matchCount = Number(bracket.matchCounts?.[roundIdx] || 0);

            await Promise.all(
              Array.from({ length: matchCount }, async (_, matchIdx) => {
                try {
                  const m = await instance.getMatch(roundIdx, matchIdx);
                  const p1 = m.player1?.toLowerCase();
                  const p2 = m.player2?.toLowerCase();
                  const acc = account.toLowerCase();

                  // Only include matches the player participated in
                  if (p1 !== acc && p2 !== acc) return;

                  // Only completed matches (status === 2 = Complete)
                  const matchStatus = Number(m.status);
                  if (matchStatus !== 2) return;

                  const moves = m.moves || '';
                  const moveHistory = [];
                  for (let i = 0; i < moves.length; i++) {
                    const cellIndex = moves.charCodeAt(i);
                    if (cellIndex >= 0 && cellIndex <= 8) {
                      const isPlayer1Move = moveHistory.length % 2 === 0;
                      moveHistory.push({ player: isPlayer1Move ? 'X' : 'O', cell: cellIndex });
                    }
                  }

                  // Fetch board and pack uint8[9] → BigInt for RecentMatchesCard compatibility
                  // unpackBoard reads cell i from bits i*2 (little-endian, cell 0 = LSB)
                  let packedBoard = 0n;
                  try {
                    const boardArr = await instance.getBoard(roundIdx, matchIdx);
                    for (let ci = 0; ci < boardArr.length; ci++) {
                      packedBoard |= BigInt(Number(boardArr[ci]) & 3) << BigInt(ci * 2);
                    }
                  } catch { /* ignore */ }

                  // Use lastMoveTime as endTime since getMatch doesn't expose endTime
                  const endTime = Number(m.lastMoveTime || m.startTime || 0);

                  allMatches.push({
                    matchId: `0-${instanceAddress}-${roundIdx}-${matchIdx}`,
                    tierId: 0,
                    instanceId: instanceAddress,
                    instanceAddress,
                    roundNumber: roundIdx,
                    matchNumber: matchIdx,
                    playerCount,
                    totalRounds,
                    player1: m.player1,
                    player2: m.player2,
                    firstPlayer: m.player1, // V2 doesn't expose firstPlayer in getMatch
                    winner: m.matchWinner,
                    reason: m.isDraw ? 2 : 0,
                    board: packedBoard,
                    startTime: Number(m.startTime || 0),
                    endTime,
                    timestamp: endTime,
                    moveHistory,
                  });
                } catch { /* skip bad match */ }
              })
            );
          }
        } catch { /* skip bad instance */ }
      }));

      // Sort newest first
      allMatches.sort((a, b) => b.endTime - a.endTime);
      setMatches(allMatches);
    } catch (err) {
      console.error('[useV2MatchHistory] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { matches, loading, refetch: fetch };
}
