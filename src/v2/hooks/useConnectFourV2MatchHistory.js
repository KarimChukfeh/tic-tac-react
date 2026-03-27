import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS } from '../lib/connectfour';

const HISTORY_LIMIT = 30;

export function useConnectFourV2MatchHistory(factoryContract, runner, account) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!factoryContract || !runner || !account) {
      setMatches([]);
      return;
    }

    setLoading(true);
    try {
      let instanceAddresses = [];
      let profileAddr = null;

      try { profileAddr = await factoryContract.players(account); } catch {}
      if (!profileAddr || profileAddr === ZERO_ADDRESS) {
        try { profileAddr = await factoryContract.getPlayerProfile(account); } catch {}
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
                  const [m, fullMatch, boardArr] = await Promise.all([
                    instance.getMatch(roundIdx, matchIdx),
                    instance.matches(ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundIdx, matchIdx])),
                    instance.getBoard(roundIdx, matchIdx).catch(() => []),
                  ]);

                  const p1 = m.player1?.toLowerCase();
                  const p2 = m.player2?.toLowerCase();
                  const acc = account.toLowerCase();
                  if (p1 !== acc && p2 !== acc) return;

                  const matchStatus = Number(m.status);
                  if (matchStatus !== 2) return;

                  const moves = m.moves || '';
                  const moveHistory = [];
                  for (let i = 0; i < moves.length; i++) {
                    const columnIndex = moves.charCodeAt(i);
                    if (columnIndex >= 0 && columnIndex <= 6) {
                      const isPlayer1Move = moveHistory.length % 2 === 0;
                      moveHistory.push({
                        player: isPlayer1Move ? 'Red' : 'Blue',
                        column: columnIndex + 1,
                        cellIndex: columnIndex,
                      });
                    }
                  }

                  let packedBoard = 0n;
                  for (let ci = 0; ci < boardArr.length; ci++) {
                    packedBoard |= BigInt(Number(boardArr[ci]) & 3) << BigInt(ci * 2);
                  }

                  const endTime = Number(m.lastMoveTime || m.startTime || 0);

                  const completionReason = Number(m.completionReason || (m.isDraw ? 2 : 0));

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
                    firstPlayer: fullMatch.firstPlayer,
                    winner: m.matchWinner,
                    reason: completionReason,
                    completionReason,
                    isDraw: Boolean(m.isDraw),
                    board: packedBoard,
                    startTime: Number(m.startTime || 0),
                    endTime,
                    timestamp: endTime,
                    moveHistory,
                  });
                } catch {}
              })
            );
          }
        } catch {}
      }));

      allMatches.sort((a, b) => b.endTime - a.endTime);
      console.groupCollapsed(`[useConnectFourV2MatchHistory] Loaded ${allMatches.length} completed matches for ${account}`);
      console.table(allMatches.map(match => ({
        matchId: match.matchId,
        instanceAddress: match.instanceAddress,
        roundNumber: match.roundNumber,
        matchNumber: match.matchNumber,
        winner: match.winner,
        reason: match.reason,
        completionReason: match.completionReason,
        isDraw: match.isDraw,
        startTime: match.startTime,
        endTime: match.endTime,
      })));
      console.groupEnd();
      setMatches(allMatches);
    } catch (err) {
      console.error('[useConnectFourV2MatchHistory] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { matches, loading, refetch: fetch };
}
