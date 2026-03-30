import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { getInstanceContract, getPlayerProfileContract, ZERO_ADDRESS, resolvePlayerProfileAddress } from '../lib/chess';

const VIRTUAL_TIER_ID = 0;

const EMPTY_DATA = {
  activeMatches: [],
  inProgressTournaments: [],
  unfilledTournaments: [],
  terminatedMatches: [],
  totalEarnings: 0n,
};

async function scanInstance(instanceContract, account, dismissedMatches, instanceAddress) {
  const instanceId = instanceAddress;
  const [isEnrolled, tournament, tc, bracket] = await Promise.all([
    instanceContract.isEnrolled(account).catch(() => false),
    instanceContract.tournament(),
    instanceContract.tierConfig().catch(() => null),
    instanceContract.getBracket().catch(() => null),
  ]);

  if (!isEnrolled) return null;
  const status = Number(tournament.status);
  if (status === 2) return null;

  const currentRound = Number(tournament.currentRound || 0);
  const enrolledCount = Number(tournament.enrolledCount || 0);
  const playerCount = Number(tc?.playerCount || 2);
  const matchTimePerPlayer = tc ? Number(tc.timeouts.matchTimePerPlayer) : 600;

  if (status === 0) {
    return {
      activeMatches: [],
      inProgressTournaments: [],
      unfilledTournaments: [{ tierId: VIRTUAL_TIER_ID, instanceId, enrolledCount, playerCount }],
      terminatedMatches: [],
    };
  }

  const totalRounds = Number(bracket?.totalRounds || 0);
  const matchFetches = [];
  for (let roundIdx = 0; roundIdx <= currentRound && roundIdx < totalRounds; roundIdx++) {
    const matchCount = Number(bracket.matchCounts[roundIdx] || 0);
    for (let matchIdx = 0; matchIdx < matchCount; matchIdx++) {
      matchFetches.push((async () => {
        const matchKey = ethers.solidityPackedKeccak256(['uint8', 'uint8'], [roundIdx, matchIdx]);
        const [m, full] = await Promise.all([
          instanceContract.getMatch(roundIdx, matchIdx),
          instanceContract.matches(matchKey),
        ]);
        return { roundIdx, matchIdx, m, full };
      })().catch(() => null));
    }
  }

  const matchResults = await Promise.all(matchFetches);
  const activeMatches = [];
  const terminatedMatches = [];
  let hasActiveMatch = false;
  const acc = account.toLowerCase();

  for (const result of matchResults) {
    if (!result) continue;
    const { roundIdx, matchIdx, m, full } = result;
    const p1 = m.player1?.toLowerCase();
    const p2 = m.player2?.toLowerCase();
    const isPlayer1 = p1 === acc;
    const isPlayer2 = p2 === acc;
    if (!isPlayer1 && !isPlayer2) continue;

    const matchKey = `${VIRTUAL_TIER_ID}-${instanceId}-${roundIdx}-${matchIdx}`;
    if (dismissedMatches.has(matchKey)) continue;

    const matchStatus = Number(m.status);
    if (status === 2 && matchStatus === 1) {
      terminatedMatches.push({
        tierId: VIRTUAL_TIER_ID,
        instanceId,
        roundIdx,
        matchIdx,
        opponent: isPlayer1 ? m.player2 : m.player1,
        terminationReason: 'TOURNAMENT_COMPLETED',
      });
      continue;
    }

    if (matchStatus === 1 || matchStatus === 2) {
      hasActiveMatch = true;
      const opponent = isPlayer1 ? m.player2 : m.player1;
      const now = Math.floor(Date.now() / 1000);
      const elapsed = Number(m.lastMoveTime || 0) > 0 ? now - Number(m.lastMoveTime) : 0;
      const baseTime = isPlayer1 ? Number(full.player1TimeRemaining || matchTimePerPlayer) : Number(full.player2TimeRemaining || matchTimePerPlayer);
      const isMyTurn = matchStatus === 1 ? full.currentTurn?.toLowerCase() === acc : false;
      const timeRemaining = isMyTurn ? Math.max(0, baseTime - elapsed) : baseTime;
      activeMatches.push({
        tierId: VIRTUAL_TIER_ID,
        instanceId,
        roundIdx,
        matchIdx,
        opponent,
        timeRemaining,
        isMyTurn,
        matchStatus,
        winner: matchStatus === 2 ? (m.matchWinner || null) : null,
        isDraw: matchStatus === 2 ? Boolean(m.isDraw) : false,
      });
    }
  }

  const inProgressTournaments = [];
  if (status === 1 && !hasActiveMatch) {
    inProgressTournaments.push({
      tierId: VIRTUAL_TIER_ID,
      instanceId,
      currentRound,
      playerRound: null,
    });
  }

  return { activeMatches, inProgressTournaments, unfilledTournaments: [], terminatedMatches };
}

export const useChessV2PlayerActivity = (instanceContract, account, factoryContract, runner) => {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedMatches, setDismissedMatches] = useState(new Set());
  const [matchAlert, setMatchAlert] = useState(null);
  const alertedMatchKeysRef = useRef(new Set());

  const fetchActivity = useCallback(async (isInitialLoad = false) => {
    if (!account) {
      setLoading(false);
      setSyncing(false);
      setData(EMPTY_DATA);
      return;
    }
    try {
      if (isInitialLoad) setLoading(true);
      else setSyncing(true);
      setError(null);

      const instanceMap = new Map();
      if (instanceContract) {
        const addr = (instanceContract.target || instanceContract.address)?.toLowerCase();
        if (addr) instanceMap.set(addr, instanceContract);
      }

      if (factoryContract && runner) {
        try {
          const profileAddr = await resolvePlayerProfileAddress(factoryContract, runner, account);
          if (profileAddr) {
            const profile = getPlayerProfileContract(profileAddr, runner);
            const total = Number(await profile.getEnrollmentCount().catch(() => 0n));
            if (total > 0) {
              const limit = Math.min(total, 50);
              const offset = Math.max(0, total - limit);
              const recs = await profile.getEnrollments(offset, limit).catch(() => []);
              for (const rec of recs) {
                if (rec.concluded) continue;
                const addr = rec.instance?.toLowerCase();
                if (!addr || addr === ZERO_ADDRESS) continue;
                if (!instanceMap.has(addr)) instanceMap.set(addr, getInstanceContract(rec.instance, runner));
              }
            }
          }
        } catch (profileErr) {
          console.warn('[useChessV2PlayerActivity] Profile lookup failed:', profileErr.message);
        }

        if (instanceMap.size === 0 || instanceContract == null) {
          try {
            const activeCount = Number(await factoryContract.getActiveTournamentCount().catch(() => 0n));
            if (activeCount > 0) {
              const addresses = await Promise.all(Array.from({ length: activeCount }, (_, i) => factoryContract.activeTournaments(i).catch(() => null)));
              const checks = await Promise.all(addresses.map(async (addr) => {
                if (!addr || addr === ZERO_ADDRESS) return null;
                const lower = addr.toLowerCase();
                if (instanceMap.has(lower)) return null;
                const contract = getInstanceContract(addr, runner);
                const enrolled = await contract.isEnrolled(account).catch(() => false);
                return enrolled ? { lower, contract } : null;
              }));
              for (const entry of checks) if (entry) instanceMap.set(entry.lower, entry.contract);
            }
          } catch (factoryErr) {
            console.warn('[useChessV2PlayerActivity] activeTournaments fallback failed:', factoryErr.message);
          }
        }
      }

      const scans = await Promise.all(
        [...instanceMap.entries()].map(([address, contract]) => scanInstance(contract, account, dismissedMatches, address).catch(() => null))
      );

      const next = { activeMatches: [], inProgressTournaments: [], unfilledTournaments: [], terminatedMatches: [], totalEarnings: 0n };
      for (const scan of scans) {
        if (!scan) continue;
        next.activeMatches.push(...scan.activeMatches);
        next.inProgressTournaments.push(...scan.inProgressTournaments);
        next.unfilledTournaments.push(...scan.unfilledTournaments);
        next.terminatedMatches.push(...scan.terminatedMatches);
      }

      for (const match of next.activeMatches) {
        const key = `${match.instanceId}-${match.roundIdx}-${match.matchIdx}`;
        if (match.matchStatus === 1 && match.isMyTurn && !alertedMatchKeysRef.current.has(key)) {
          alertedMatchKeysRef.current.add(key);
          setMatchAlert(match);
          break;
        }
      }
      setData(next);
    } catch (err) {
      console.error('[useChessV2PlayerActivity] Error:', err);
      setError(err.message || 'Failed to load player activity.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [account, instanceContract, factoryContract, runner, dismissedMatches]);

  useEffect(() => { fetchActivity(true); }, [fetchActivity]);
  useEffect(() => {
    if (!account) return;
    const id = setInterval(() => fetchActivity(false), 5000);
    return () => clearInterval(id);
  }, [account, fetchActivity]);

  useEffect(() => {
    alertedMatchKeysRef.current = new Set();
  }, [account]);

  const dismissMatch = useCallback((tierId, instanceId, roundIdx, matchIdx) => {
    const key = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;
    setDismissedMatches(prev => new Set(prev).add(key));
  }, []);

  const clearMatchAlert = useCallback(() => setMatchAlert(null), []);

  return { data, loading, syncing, error, matchAlert, refetch: () => fetchActivity(false), dismissMatch, clearMatchAlert };
};
