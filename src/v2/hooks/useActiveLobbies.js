import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { multicallContracts } from '../../utils/multicall';

const EMPTY_DATA = [];
const ZERO_ADDRESS = ethers.ZeroAddress.toLowerCase();

const TOURNAMENT_STATUS_LABELS = {
  0: 'Enrolling',
  1: 'In Progress',
  2: 'Completed',
  3: 'Cancelled',
  4: 'EL1',
  5: 'EL2',
};

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function statusLabel(status) {
  return TOURNAMENT_STATUS_LABELS[toNumber(status, -1)] || `Status ${toNumber(status, -1)}`;
}

function buildMatchKey(roundNumber, matchNumber) {
  return ethers.keccak256(
    ethers.solidityPacked(['uint8', 'uint8'], [roundNumber, matchNumber])
  );
}

function buildEnrollmentEscalation(tournament, now) {
  const timeout = tournament?.enrollmentTimeout || {};
  const el1At = toNumber(timeout.escalation1Start);
  const el2At = toNumber(timeout.escalation2Start);

  return {
    activeEscalation: toNumber(timeout.activeEscalation),
    forfeitPool: timeout.forfeitPool || 0n,
    el1At,
    el2At,
    el1Available: el1At > 0 && now >= el1At,
    el2Available: el2At > 0 && now >= el2At,
    el1Soon: el1At > now,
    el2Soon: el2At > now,
  };
}

function buildMatchEscalation(matchData, timeoutData, tierConfig, roundNumber, matchNumber, now) {
  const matchStatus = toNumber(matchData?.status, -1);
  if (matchStatus !== 1) return null;

  const player1 = matchData?.player1?.toLowerCase?.() || ZERO_ADDRESS;
  const currentTurn = matchData?.currentTurn?.toLowerCase?.() || ZERO_ADDRESS;
  const lastMoveTime = toNumber(matchData?.lastMoveTime);
  const timeouts = tierConfig?.timeouts || {};
  const fallbackMatchTime = toNumber(timeouts.matchTimePerPlayer ?? tierConfig?.matchTimePerPlayer, 0);
  const player1TimeRemaining = toNumber(matchData?.player1TimeRemaining, fallbackMatchTime);
  const player2TimeRemaining = toNumber(matchData?.player2TimeRemaining, fallbackMatchTime);

  let timeoutAt = 0;
  if (lastMoveTime > 0 && currentTurn !== ZERO_ADDRESS) {
    const activePlayerTime = currentTurn === player1 ? player1TimeRemaining : player2TimeRemaining;
    if (activePlayerTime > 0) {
      timeoutAt = lastMoveTime + activePlayerTime;
    }
  }

  const ml1Available = timeoutAt > 0 && now >= timeoutAt;
  const timeoutActive = Boolean(timeoutData?.isStalled) || ml1Available;

  let ml2At = toNumber(timeoutData?.escalation1Start);
  let ml3At = toNumber(timeoutData?.escalation2Start);

  if (ml1Available) {
    if (!ml2At) ml2At = timeoutAt + toNumber(timeouts.matchLevel2Delay ?? tierConfig?.matchLevel2Delay, 0);
    if (!ml3At) ml3At = timeoutAt + toNumber(timeouts.matchLevel3Delay ?? tierConfig?.matchLevel3Delay, 0);
  }

  const ml2Available = timeoutActive && ml2At > 0 && now >= ml2At;
  const ml3Available = timeoutActive && ml3At > 0 && now >= ml3At;
  const ml1Soon = !ml1Available && timeoutAt > now;
  const ml2Soon = !ml2Available && ml2At > now;
  const ml3Soon = !ml3Available && ml3At > now;

  if (!(ml1Available || ml2Available || ml3Available || ml1Soon || ml2Soon || ml3Soon)) {
    return null;
  }

  return {
    roundNumber,
    matchNumber,
    matchStatus,
    activeEscalation: toNumber(timeoutData?.activeEscalation),
    timeoutActive,
    timeoutAt,
    ml1Available,
    ml1Soon,
    ml2At,
    ml2Available,
    ml2Soon,
    ml3At,
    ml3Available,
    ml3Soon,
  };
}

function buildLobbySortScore(lobby) {
  if (lobby.publicOpportunityCount > 0) return 0;
  if (lobby.publicOpportunitySoonCount > 0) return 1;
  if (lobby.hasEscalationActivity) return 2;
  if (lobby.status === 0) return 3;
  if (lobby.status === 1) return 4;
  return 5;
}

function sortLobbies(a, b) {
  const scoreDiff = buildLobbySortScore(a) - buildLobbySortScore(b);
  if (scoreDiff !== 0) return scoreDiff;

  const createdDiff = toNumber(b.createdAt) - toNumber(a.createdAt);
  if (createdDiff !== 0) return createdDiff;

  return a.address.localeCompare(b.address);
}

export function useActiveLobbies(factoryContract, runner, account, getInstanceContract) {
  const [lobbies, setLobbies] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLobbies = useCallback(async (isInitialLoad = false) => {
    if (!factoryContract || !runner || !getInstanceContract) {
      setLobbies(EMPTY_DATA);
      setLoading(false);
      setSyncing(false);
      return;
    }

    try {
      if (isInitialLoad) setLoading(true);
      else setSyncing(true);
      setError(null);

      const now = Math.floor(Date.now() / 1000);
      const activeTotal = toNumber(await factoryContract.getActiveTournamentCount().catch(() => 0n));

      if (activeTotal === 0) {
        setLobbies([]);
        return;
      }

      const addressResults = await multicallContracts(
        Array.from({ length: activeTotal }, (_, index) => ({
          contract: factoryContract,
          functionName: 'activeTournaments',
          params: [index],
        })),
        runner
      );

      const activeAddresses = [
        ...new Set(
          addressResults
            .filter((result) => result.success && result.result && result.result !== ethers.ZeroAddress)
            .map((result) => result.result)
        ),
      ];

      if (activeAddresses.length === 0) {
        setLobbies([]);
        return;
      }

      const instances = activeAddresses.map((address) => ({
        address,
        contract: getInstanceContract(address, runner),
      }));

      const baseCallSpecs = instances.flatMap(({ contract }) => {
        const specs = [
          { contract, functionName: 'tournament' },
          { contract, functionName: 'getInstanceInfo' },
        ];

        if (account) {
          specs.push({ contract, functionName: 'isEnrolled', params: [account] });
        }

        return specs;
      });

      const baseResults = await multicallContracts(baseCallSpecs, runner);

      const prelim = [];
      let cursor = 0;

      for (const instance of instances) {
        const tournamentResult = baseResults[cursor++];
        const infoResult = baseResults[cursor++];
        const enrolledResult = account ? baseResults[cursor++] : { success: true, result: false };

        if (!tournamentResult?.success || !infoResult?.success) continue;

        const isUserEnrolled = Boolean(enrolledResult?.success ? enrolledResult.result : false);
        if (account && isUserEnrolled) continue;

        const tournament = tournamentResult.result;
        const info = infoResult.result;
        const status = toNumber(tournament.status ?? info.status, -1);

        if (status >= 2) continue;

        prelim.push({
          address: instance.address,
          contract: instance.contract,
          status,
          statusLabel: statusLabel(status),
          currentRound: toNumber(tournament.currentRound),
          actualTotalRounds: toNumber(tournament.actualTotalRounds),
          enrolledCount: toNumber(tournament.enrolledCount ?? info.enrolledCount),
          playerCount: toNumber(info.playerCount),
          entryFeeWei: info.entryFee || 0n,
          entryFeeEth: ethers.formatEther(info.entryFee || 0n),
          createdAt: toNumber(info.createdAt),
          startedAt: toNumber(info.startTime ?? tournament.startTime),
          isUserEnrolled,
          enrollmentEscalation: buildEnrollmentEscalation(tournament, now),
          matchHighlights: [],
          matchEscalationSummary: {
            activeMatchCount: 0,
            ml1AvailableCount: 0,
            ml2AvailableCount: 0,
            ml3AvailableCount: 0,
            ml1SoonCount: 0,
            ml2SoonCount: 0,
            ml3SoonCount: 0,
          },
        });
      }

      if (prelim.length === 0) {
        setLobbies([]);
        return;
      }

      const inProgressIndexes = prelim
        .map((lobby, index) => ({ lobby, index }))
        .filter(({ lobby }) => lobby.status === 1);

      if (inProgressIndexes.length > 0) {
        const instanceMetaResults = await multicallContracts(
          inProgressIndexes.flatMap(({ lobby }) => ([
            { contract: lobby.contract, functionName: 'getBracket' },
            { contract: lobby.contract, functionName: 'tierConfig' },
          ])),
          runner
        );

        let instanceCursor = 0;
        const matchCallSpecs = [];
        const matchDescriptors = [];

        for (const { lobby, index } of inProgressIndexes) {
          const bracketResult = instanceMetaResults[instanceCursor++];
          const tierConfigResult = instanceMetaResults[instanceCursor++];

          if (!bracketResult?.success || !tierConfigResult?.success) continue;

          const bracket = bracketResult.result;
          const tierConfig = tierConfigResult.result;
          prelim[index].actualTotalRounds = toNumber(bracket.totalRounds, prelim[index].actualTotalRounds);

          const matchCount = toNumber(bracket.matchCounts?.[lobby.currentRound]);
          if (matchCount <= 0) continue;

          for (let matchNumber = 0; matchNumber < matchCount; matchNumber++) {
            const matchKey = buildMatchKey(lobby.currentRound, matchNumber);
            matchDescriptors.push({ lobbyIndex: index, roundNumber: lobby.currentRound, matchNumber, tierConfig });
            matchCallSpecs.push(
              { contract: lobby.contract, functionName: 'matches', params: [matchKey] },
              { contract: lobby.contract, functionName: 'matchTimeouts', params: [matchKey] }
            );
          }
        }

        if (matchCallSpecs.length > 0) {
          const matchResults = await multicallContracts(matchCallSpecs, runner);
          let matchCursor = 0;

          for (const descriptor of matchDescriptors) {
            const matchResult = matchResults[matchCursor++];
            const timeoutResult = matchResults[matchCursor++];
            if (!matchResult?.success) continue;

            const escalation = buildMatchEscalation(
              matchResult.result,
              timeoutResult?.success ? timeoutResult.result : null,
              descriptor.tierConfig,
              descriptor.roundNumber,
              descriptor.matchNumber,
              now
            );

            if (!escalation) continue;

            const lobby = prelim[descriptor.lobbyIndex];
            lobby.matchEscalationSummary.activeMatchCount += 1;
            if (escalation.ml1Available) lobby.matchEscalationSummary.ml1AvailableCount += 1;
            if (escalation.ml2Available) lobby.matchEscalationSummary.ml2AvailableCount += 1;
            if (escalation.ml3Available) lobby.matchEscalationSummary.ml3AvailableCount += 1;
            if (escalation.ml1Soon) lobby.matchEscalationSummary.ml1SoonCount += 1;
            if (escalation.ml2Soon) lobby.matchEscalationSummary.ml2SoonCount += 1;
            if (escalation.ml3Soon && escalation.ml2Available) lobby.matchEscalationSummary.ml3SoonCount += 1;
            lobby.matchHighlights.push(escalation);
          }
        }
      }

      const nextLobbies = prelim
        .map((lobby) => {
          const hasEnrollmentEscalationContext = lobby.status === 0;
          const publicOpportunityCount =
            (hasEnrollmentEscalationContext && lobby.enrollmentEscalation.el2Available ? 1 : 0) +
            lobby.matchEscalationSummary.ml3AvailableCount;

          const publicOpportunitySoonCount =
            (hasEnrollmentEscalationContext && lobby.enrollmentEscalation.el2Soon ? 1 : 0) +
            lobby.matchEscalationSummary.ml3SoonCount;

          const hasEscalationActivity =
            (hasEnrollmentEscalationContext && (
              lobby.enrollmentEscalation.el1Available ||
              lobby.enrollmentEscalation.el2Available ||
              lobby.enrollmentEscalation.el1Soon ||
              lobby.enrollmentEscalation.el2Soon
            )) ||
            lobby.matchHighlights.some((match) => match.ml3Available || (match.ml3Soon && match.ml2Available));

          return {
            ...lobby,
            contract: undefined,
            matchHighlights: lobby.matchHighlights
              .sort((a, b) => {
                const aScore = a.ml3Available ? 0 : a.ml2Available ? 1 : a.ml1Available ? 2 : a.ml3Soon ? 3 : a.ml2Soon ? 4 : 5;
                const bScore = b.ml3Available ? 0 : b.ml2Available ? 1 : b.ml1Available ? 2 : b.ml3Soon ? 3 : b.ml2Soon ? 4 : 5;
                if (aScore !== bScore) return aScore - bScore;

                const aNext = a.ml3At || a.ml2At || a.timeoutAt || Number.MAX_SAFE_INTEGER;
                const bNext = b.ml3At || b.ml2At || b.timeoutAt || Number.MAX_SAFE_INTEGER;
                return aNext - bNext;
              })
              .slice(0, 5),
            publicOpportunityCount,
            publicOpportunitySoonCount,
            hasEscalationActivity,
          };
        })
        .sort(sortLobbies);

      setLobbies(nextLobbies);
    } catch (err) {
      console.error('[useActiveLobbies] Error:', err);
      setError(err.message || 'Failed to load active lobbies.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [account, factoryContract, getInstanceContract, runner]);

  useEffect(() => {
    fetchLobbies(true);
  }, [fetchLobbies]);

  useEffect(() => {
    if (!factoryContract || !runner) return undefined;

    const id = setInterval(() => {
      fetchLobbies(false);
    }, 12000);

    return () => clearInterval(id);
  }, [factoryContract, fetchLobbies, runner]);

  return {
    lobbies,
    loading,
    syncing,
    error,
    refetch: () => fetchLobbies(false),
  };
}
