import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS } from '../lib/chess';

const HISTORY_LIMIT = 30;

export function useChessV2MatchHistory(factoryContract, runner, account) {
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
        const total = Number(await profile.getEnrollmentCount().catch(() => 0n));
        if (total > 0) {
          const limit = Math.min(total, HISTORY_LIMIT);
          const offset = Math.max(0, total - limit);
          const recs = await profile.getEnrollments(offset, limit).catch(() => []);
          instanceAddresses = recs.map(r => r.instance).filter(addr => addr && addr !== ZERO_ADDRESS);
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
            await Promise.all(Array.from({ length: matchCount }, async (_, matchIdx) => {
              try {
                const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundIdx, matchIdx]);
                const [m, full, boardResult] = await Promise.all([
                  instance.getMatch(roundIdx, matchIdx),
                  instance.matches(matchKey),
                  instance.getBoard(roundIdx, matchIdx).catch(() => [0n, 0n]),
                ]);
                const p1 = m.player1?.toLowerCase();
                const p2 = m.player2?.toLowerCase();
                const acc = account.toLowerCase();
                if (p1 !== acc && p2 !== acc) return;
                if (Number(m.status) !== 2) return;

                const moves = m.moves || '';
                const moveHistory = [];
                for (let i = 0; i < moves.length - 1; i += 2) {
                  const fromByte = moves.charCodeAt(i);
                  const toByte = moves.charCodeAt(i + 1);
                  if (fromByte >= 0 && fromByte < 64 && toByte >= 0 && toByte < 64) {
                    const isFirstMove = moveHistory.length % 2 === 0;
                    const fromFile = String.fromCharCode(97 + (fromByte % 8));
                    const fromRank = Math.floor(fromByte / 8) + 1;
                    const toFile = String.fromCharCode(97 + (toByte % 8));
                    const toRank = Math.floor(toByte / 8) + 1;
                    moveHistory.push({
                      player: isFirstMove ? '♔' : '♚',
                      move: `${fromFile}${fromRank}→${toFile}${toRank}`,
                      from: fromByte,
                      to: toByte,
                    });
                  }
                }

                const [packedBoard] = boardResult;
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
                  firstPlayer: full.firstPlayer,
                  winner: m.matchWinner,
                  reason: Number(m.completionReason || (m.isDraw ? 2 : 0)),
                  board: BigInt(packedBoard || 0),
                  startTime: Number(m.startTime || 0),
                  endTime,
                  timestamp: endTime,
                  moveHistory,
                });
              } catch {}
            }));
          }
        } catch {}
      }));

      allMatches.sort((a, b) => b.endTime - a.endTime);
      setMatches(allMatches);
    } catch (err) {
      console.error('[useChessV2MatchHistory] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => { fetch(); }, [fetch]);

  return { matches, loading, refetch: fetch };
}
