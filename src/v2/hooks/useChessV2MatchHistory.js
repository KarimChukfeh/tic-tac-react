import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS, resolvePlayerProfileAddress } from '../lib/chess';

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
      const profileAddr = await resolvePlayerProfileAddress(factoryContract, runner, account);
      if (!profileAddr) {
        setMatches([]);
        return;
      }

      const profile = getPlayerProfileContract(profileAddr, runner);
      const total = Number(await profile.getMatchRecordCount().catch(() => 0n));
      if (total === 0) {
        setMatches([]);
        return;
      }

      const limit = Math.min(total, HISTORY_LIMIT);
      const offset = Math.max(0, total - limit);
      const records = await profile.getMatchRecords(offset, limit).catch(() => []);
      const acc = account.toLowerCase();

      const allMatches = (await Promise.all(records.map(async (record) => {
        try {
          const instanceAddress = record.instance;
          if (!instanceAddress || instanceAddress === ZERO_ADDRESS) return null;

          const roundNumber = Number(record.roundNumber);
          const matchNumber = Number(record.matchNumber);
          const instance = getInstanceContract(instanceAddress, runner);
          const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);

          const [m, full, boardResult, tc] = await Promise.all([
            instance.getMatch(roundNumber, matchNumber),
            instance.matches(matchKey).catch(() => null),
            instance.getBoard(roundNumber, matchNumber).catch(() => [0n, 0n]),
            instance.tierConfig().catch(() => null),
          ]);

          if (Number(m.status) !== 2) return null;

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
          const winner = m.matchWinner;
          const winnerLower = winner?.toLowerCase();
          const matchCompletionReason = Number(m.completionReason || (m.isDraw ? 2 : 0));
          const matchCompletionCategory = Number(m.completionCategory ?? 0);
          const playerOutcomeReason = Number(record.outcome ?? matchCompletionReason);
          const playerOutcomeCategory = Number(record.category ?? matchCompletionCategory);
          const playerPerspective = Boolean(m.isDraw)
            ? 'draw'
            : (winnerLower && winnerLower === acc && winnerLower !== ZERO_ADDRESS.toLowerCase())
              ? 'winner'
              : 'loser';
          const endTime = Number(m.lastMoveTime || record.recordedAt || m.startTime || 0);
          const playerCount = Number(tc?.playerCount || 2);

          return {
            matchId: `0-${instanceAddress}-${roundNumber}-${matchNumber}`,
            tierId: 0,
            instanceId: instanceAddress,
            instanceAddress,
            roundNumber,
            matchNumber,
            playerCount,
            totalRounds: playerCount > 1 ? Math.ceil(Math.log2(playerCount)) : 1,
            player1: m.player1,
            player2: m.player2,
            firstPlayer: full?.firstPlayer,
            winner,
            reason: matchCompletionReason,
            completionReason: matchCompletionReason,
            completionCategory: matchCompletionCategory,
            matchCompletionReason,
            matchCompletionCategory,
            playerOutcomeReason,
            playerOutcomeCategory,
            playerPerspective,
            isScheduledPlayer: m.player1?.toLowerCase() === acc || m.player2?.toLowerCase() === acc,
            isDraw: Boolean(m.isDraw),
            board: BigInt(packedBoard || 0),
            startTime: Number(m.startTime || 0),
            endTime,
            timestamp: endTime,
            moveHistory,
          };
        } catch {
          return null;
        }
      }))).filter(Boolean);

      allMatches.sort((a, b) => b.endTime - a.endTime);
      console.groupCollapsed(`[useChessV2MatchHistory] Loaded ${allMatches.length} completed matches for ${account}`);
      console.table(allMatches.map(match => ({
        matchId: match.matchId,
        instanceAddress: match.instanceAddress,
        roundNumber: match.roundNumber,
        matchNumber: match.matchNumber,
        winner: match.winner,
        reason: match.reason,
        completionReason: match.completionReason,
        matchCompletionReason: match.matchCompletionReason,
        playerOutcomeReason: match.playerOutcomeReason,
        playerPerspective: match.playerPerspective,
        isDraw: match.isDraw,
        startTime: match.startTime,
        endTime: match.endTime,
      })));
      console.groupEnd();
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
