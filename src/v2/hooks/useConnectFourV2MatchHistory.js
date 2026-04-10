import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { decodeConnectFourMoves, getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS, resolvePlayerProfileAddress } from '../lib/connectfour';
import { multicallContracts } from '../../utils/multicall';

const HISTORY_LIMIT = 30;
const POLL_INTERVAL_MS = 8000;

export function useConnectFourV2MatchHistory(factoryContract, runner, account, options = {}) {
  const { enabled = false, pollIntervalMs = POLL_INTERVAL_MS } = options;
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

      const instanceMap = new Map();
      for (const record of records) {
        const instanceAddress = record.instance;
        if (!instanceAddress || instanceAddress === ZERO_ADDRESS) continue;
        const lower = instanceAddress.toLowerCase();
        if (!instanceMap.has(lower)) {
          instanceMap.set(lower, {
            address: instanceAddress,
            contract: getInstanceContract(instanceAddress, runner),
          });
        }
      }

      const tierEntries = [...instanceMap.values()];
      const tierResults = tierEntries.length > 0
        ? await multicallContracts(
          tierEntries.map(({ contract }) => ({ contract, functionName: 'tierConfig' })),
          runner
        )
        : [];
      const tierConfigByInstance = new Map();
      tierEntries.forEach((entry, index) => {
        tierConfigByInstance.set(entry.address.toLowerCase(), tierResults[index]?.success ? tierResults[index].result : null);
      });

      const descriptors = [];
      const callSpecs = [];
      for (const record of records) {
        const instanceAddress = record.instance;
        if (!instanceAddress || instanceAddress === ZERO_ADDRESS) continue;
        const roundNumber = Number(record.roundNumber);
        const matchNumber = Number(record.matchNumber);
        const instance = instanceMap.get(instanceAddress.toLowerCase())?.contract;
        if (!instance) continue;
        const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundNumber, matchNumber]);
        descriptors.push({ record, instanceAddress, roundNumber, matchNumber });
        callSpecs.push(
          { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
          { contract: instance, functionName: 'matches', params: [matchKey] },
          { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
        );
      }

      const hydratedResults = callSpecs.length > 0 ? await multicallContracts(callSpecs, runner) : [];
      const allMatches = [];
      let cursor = 0;
      for (const { record, instanceAddress, roundNumber, matchNumber } of descriptors) {
        const matchResult = hydratedResults[cursor++];
        const fullMatchResult = hydratedResults[cursor++];
        const boardResult = hydratedResults[cursor++];
        if (!matchResult?.success) continue;

        try {
          const m = matchResult.result;
          if (Number(m.status) !== 2) continue;

          const fullMatch = fullMatchResult?.success ? fullMatchResult.result : null;
          const boardArr = boardResult?.success ? boardResult.result : [];
          const tc = tierConfigByInstance.get(instanceAddress.toLowerCase());

          const moveHistory = decodeConnectFourMoves(m.moves || '').map((columnIndex, index) => ({
            player: index % 2 === 0 ? 'Red' : 'Blue',
            column: columnIndex + 1,
            cellIndex: columnIndex,
          }));

          let packedBoard = 0n;
          for (let ci = 0; ci < boardArr.length; ci++) {
            packedBoard |= BigInt(Number(boardArr[ci]) & 3) << BigInt(ci * 2);
          }

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

          allMatches.push({
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
            firstPlayer: fullMatch?.firstPlayer,
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
            board: packedBoard,
            startTime: Number(m.startTime || 0),
            endTime,
            timestamp: endTime,
            moveHistory,
          });
        } catch {
          continue;
        }
      }

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
      console.error('[useConnectFourV2MatchHistory] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => {
    if (!factoryContract || !runner || !account) {
      setMatches([]);
      setLoading(false);
    }
  }, [account, factoryContract, runner]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    fetch();
    return undefined;
  }, [enabled, fetch]);

  useEffect(() => {
    if (!enabled || !factoryContract || !runner || !account) return undefined;
    const id = setInterval(() => fetch(), pollIntervalMs);
    return () => clearInterval(id);
  }, [account, enabled, factoryContract, fetch, pollIntervalMs, runner]);

  return { matches, loading, refetch: fetch };
}
