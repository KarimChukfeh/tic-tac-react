import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { multicallContracts } from '../../utils/multicall';

const EMPTY_DATA = [];
const ZERO_ADDRESS = ethers.ZeroAddress.toLowerCase();
const RESOLVED_PAGE_SIZE = 10;

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
    player1,
    player2: matchData?.player2?.toLowerCase?.() || ZERO_ADDRESS,
    currentTurn,
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
  if (lobby.featuredEscalationAvailableCount > 0) return 0;
  if (lobby.featuredEscalationSoonCount > 0) return 1;
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

function sortResolvedLobbies(a, b) {
  const pageOrderDiff = toNumber(b.pastIndex, -1) - toNumber(a.pastIndex, -1);
  if (pageOrderDiff !== 0) return pageOrderDiff;

  const resolvedAtDiff = toNumber(b.startedAt) - toNumber(a.startedAt);
  if (resolvedAtDiff !== 0) return resolvedAtDiff;

  const createdDiff = toNumber(b.createdAt) - toNumber(a.createdAt);
  if (createdDiff !== 0) return createdDiff;

  return a.address.localeCompare(b.address);
}

export function useActiveLobbies(factoryContract, runner, account, getInstanceContract, options = {}) {
  const { enabled = false, pollIntervalMs = 3000 } = options;
  const [lobbies, setLobbies] = useState(EMPTY_DATA);
  const [resolvedLobbies, setResolvedLobbies] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [resolvedLoading, setResolvedLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resolvedSyncing, setResolvedSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [resolvedError, setResolvedError] = useState(null);
  const [resolvedLoaded, setResolvedLoaded] = useState(false);
  const [resolvedPage, setResolvedPage] = useState(0);
  const [resolvedTotalCount, setResolvedTotalCount] = useState(0);

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
          isUserAdvancedForRound: false,
          matchHighlights: [],
          matchEscalationSummary: {
            activeMatchCount: 0,
            ml1AvailableCount: 0,
            ml2AvailableCount: 0,
            ml3AvailableCount: 0,
            ml1SoonCount: 0,
            ml2SoonCount: 0,
            ml3SoonCount: 0,
            ml1RelevantAvailableCount: 0,
            ml2RelevantAvailableCount: 0,
            ml2RelevantSoonCount: 0,
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
        const advancedRoundCallSpecs = account
          ? inProgressIndexes
            .filter(({ lobby }) => lobby.isUserEnrolled)
            .map(({ lobby }) => ({
              contract: lobby.contract,
              functionName: 'isPlayerInAdvancedRound',
              params: [lobby.currentRound, account],
            }))
          : [];

        const [instanceMetaResults, advancedRoundResults] = await Promise.all([
          multicallContracts(
            inProgressIndexes.flatMap(({ lobby }) => ([
            { contract: lobby.contract, functionName: 'getBracket' },
            { contract: lobby.contract, functionName: 'tierConfig' },
          ])),
            runner
          ),
          advancedRoundCallSpecs.length > 0
            ? multicallContracts(advancedRoundCallSpecs, runner)
            : Promise.resolve([]),
        ]);

        let advancedCursor = 0;
        for (const { lobby, index } of inProgressIndexes) {
          if (!lobby.isUserEnrolled || !account) continue;
          const advancedResult = advancedRoundResults[advancedCursor++];
          prelim[index].isUserAdvancedForRound = Boolean(
            advancedResult?.success ? advancedResult.result : false
          );
        }

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

            const accountLower = account?.toLowerCase?.() || null;
            const isUserParticipant = Boolean(
              accountLower &&
              (escalation.player1 === accountLower || escalation.player2 === accountLower)
            );
            const ml1RelevantAvailable = Boolean(
              lobby.isUserEnrolled &&
              isUserParticipant &&
              escalation.ml1Available &&
              escalation.currentTurn !== ZERO_ADDRESS &&
              escalation.currentTurn !== accountLower
            );
            const ml2RelevantAvailable = Boolean(
              lobby.isUserEnrolled &&
              lobby.isUserAdvancedForRound &&
              !isUserParticipant &&
              escalation.ml2Available
            );
            const ml2RelevantSoon = Boolean(
              lobby.isUserEnrolled &&
              lobby.isUserAdvancedForRound &&
              !isUserParticipant &&
              escalation.ml2Soon
            );

            if (ml1RelevantAvailable) lobby.matchEscalationSummary.ml1RelevantAvailableCount += 1;
            if (ml2RelevantAvailable) lobby.matchEscalationSummary.ml2RelevantAvailableCount += 1;
            if (ml2RelevantSoon) lobby.matchEscalationSummary.ml2RelevantSoonCount += 1;

            lobby.matchHighlights.push({
              ...escalation,
              isUserParticipant,
              ml1RelevantAvailable,
              ml2RelevantAvailable,
              ml2RelevantSoon,
            });
          }
        }
      }

      const nextLobbies = prelim
        .map((lobby) => {
          const hasEnrollmentEscalationContext = lobby.status === 0;
          const ownRelevantAvailableCount =
            (lobby.isUserEnrolled && hasEnrollmentEscalationContext && lobby.enrollmentEscalation.el1Available ? 1 : 0) +
            lobby.matchEscalationSummary.ml1RelevantAvailableCount +
            lobby.matchEscalationSummary.ml2RelevantAvailableCount;

          const ownRelevantSoonCount =
            lobby.matchEscalationSummary.ml2RelevantSoonCount;

          const publicOpportunityCount =
            (!lobby.isUserEnrolled && hasEnrollmentEscalationContext && lobby.enrollmentEscalation.el2Available ? 1 : 0) +
            (!lobby.isUserEnrolled ? lobby.matchEscalationSummary.ml3AvailableCount : 0);

          const publicOpportunitySoonCount =
            (!lobby.isUserEnrolled && hasEnrollmentEscalationContext && lobby.enrollmentEscalation.el2Soon ? 1 : 0) +
            (!lobby.isUserEnrolled ? lobby.matchEscalationSummary.ml3SoonCount : 0);

          const featuredEscalationAvailableCount = ownRelevantAvailableCount + publicOpportunityCount;
          const featuredEscalationSoonCount = ownRelevantSoonCount + publicOpportunitySoonCount;

          const hasEscalationActivity =
            (lobby.isUserEnrolled && hasEnrollmentEscalationContext && lobby.enrollmentEscalation.el1Available) ||
            (hasEnrollmentEscalationContext && !lobby.isUserEnrolled && (
              lobby.enrollmentEscalation.el1Available ||
              lobby.enrollmentEscalation.el2Available ||
              lobby.enrollmentEscalation.el1Soon ||
              lobby.enrollmentEscalation.el2Soon
            )) ||
            lobby.matchHighlights.some((match) => (
              match.ml1RelevantAvailable ||
              match.ml2RelevantAvailable ||
              match.ml2RelevantSoon ||
              (!lobby.isUserEnrolled && (match.ml3Available || (match.ml3Soon && match.ml2Available)))
            ));

          return {
            ...lobby,
            contract: undefined,
            matchHighlights: lobby.matchHighlights
              .sort((a, b) => {
                const aScore = a.ml1RelevantAvailable ? 0 : a.ml2RelevantAvailable ? 1 : a.ml2RelevantSoon ? 2 : a.ml3Available ? 3 : a.ml3Soon ? 4 : 5;
                const bScore = b.ml1RelevantAvailable ? 0 : b.ml2RelevantAvailable ? 1 : b.ml2RelevantSoon ? 2 : b.ml3Available ? 3 : b.ml3Soon ? 4 : 5;
                if (aScore !== bScore) return aScore - bScore;

                const aNext = a.ml3At || a.ml2At || a.timeoutAt || Number.MAX_SAFE_INTEGER;
                const bNext = b.ml3At || b.ml2At || b.timeoutAt || Number.MAX_SAFE_INTEGER;
                return aNext - bNext;
              })
              .slice(0, 5),
            ownRelevantAvailableCount,
            ownRelevantSoonCount,
            publicOpportunityCount,
            publicOpportunitySoonCount,
            featuredEscalationAvailableCount,
            featuredEscalationSoonCount,
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

  const fetchResolvedLobbies = useCallback(async (pageIndex = 0, isInitialLoad = false) => {
    if (!factoryContract || !runner || !getInstanceContract) {
      setResolvedLobbies(EMPTY_DATA);
      setResolvedLoading(false);
      setResolvedSyncing(false);
      setResolvedLoaded(false);
      setResolvedPage(0);
      setResolvedTotalCount(0);
      return;
    }

    try {
      const normalizedPageIndex = Math.max(0, toNumber(pageIndex, 0));
      if (isInitialLoad) setResolvedLoading(true);
      else setResolvedSyncing(true);
      setResolvedError(null);

      const pastTotal = toNumber(await factoryContract.getPastTournamentCount().catch(() => 0n));
      setResolvedTotalCount(pastTotal);
      if (pastTotal === 0) {
        setResolvedLobbies([]);
        setResolvedLoaded(true);
        setResolvedPage(0);
        return;
      }

      const maxPageIndex = Math.max(0, Math.ceil(pastTotal / RESOLVED_PAGE_SIZE) - 1);
      const nextPageIndex = Math.min(normalizedPageIndex, maxPageIndex);
      const endExclusive = Math.max(0, pastTotal - (nextPageIndex * RESOLVED_PAGE_SIZE));
      const startIndex = Math.max(0, endExclusive - RESOLVED_PAGE_SIZE);
      const fetchCount = endExclusive - startIndex;
      setResolvedPage(nextPageIndex);

      if (fetchCount <= 0) {
        setResolvedLobbies([]);
        setResolvedLoaded(true);
        return;
      }

      const addressResults = await multicallContracts(
        Array.from({ length: fetchCount }, (_, offset) => ({
          contract: factoryContract,
          functionName: 'pastTournaments',
          params: [startIndex + offset],
        })),
        runner
      );

      const pastAddresses = addressResults
        .map((result, offset) => (
          result.success && result.result && result.result !== ethers.ZeroAddress
            ? { address: result.result, pastIndex: startIndex + offset }
            : null
        ))
        .filter(Boolean);

      if (pastAddresses.length === 0) {
        setResolvedLobbies([]);
        setResolvedLoaded(true);
        return;
      }

      const instances = pastAddresses.map(({ address, pastIndex }) => ({
        address,
        pastIndex,
        contract: getInstanceContract(address, runner),
      }));

      const callSpecs = instances.flatMap(({ contract }) => {
        const specs = [
          { contract, functionName: 'tournament' },
          { contract, functionName: 'getInstanceInfo' },
          { contract, functionName: 'getPlayers' },
        ];

        if (account) {
          specs.push({ contract, functionName: 'isEnrolled', params: [account] });
        }

        return specs;
      });

      const results = await multicallContracts(callSpecs, runner);
      const nextResolved = [];
      let cursor = 0;

      for (const instance of instances) {
        const tournamentResult = results[cursor++];
        const infoResult = results[cursor++];
        const playersResult = results[cursor++];
        const enrolledResult = account ? results[cursor++] : { success: true, result: false };

        if (!tournamentResult?.success || !infoResult?.success || !playersResult?.success) continue;

        const tournament = tournamentResult.result;
        const info = infoResult.result;
        const players = playersResult.result;
        const status = toNumber(info.status ?? tournament.status, -1);

        if (status < 2) continue;

        const entryFeeWei = info.entryFee || 0n;
        const prizePoolWei = tournament.prizePool ?? info.prizePool ?? 0n;

        nextResolved.push({
          address: instance.address,
          pastIndex: instance.pastIndex,
          status,
          statusLabel: statusLabel(status),
          currentRound: toNumber(tournament.currentRound),
          actualTotalRounds: toNumber(tournament.actualTotalRounds),
          enrolledCount: toNumber(info.enrolledCount),
          playerCount: toNumber(info.playerCount),
          entryFeeWei,
          entryFeeEth: ethers.formatEther(entryFeeWei),
          prizePoolWei,
          prizePoolEth: ethers.formatEther(prizePoolWei),
          createdAt: toNumber(info.createdAt),
          startedAt: toNumber(info.startTime ?? tournament.startTime),
          winner: info.winner || ethers.ZeroAddress,
          prizeRecipient: info.prizeRecipient ?? tournament.prizeRecipient ?? ethers.ZeroAddress,
          completionReason: toNumber(info.completionReason ?? tournament.completionReason),
          isUserEnrolled: Boolean(enrolledResult?.success ? enrolledResult.result : false),
          players: Array.isArray(players) ? players : [],
        });
      }

      setResolvedLobbies(nextResolved.sort(sortResolvedLobbies));
      setResolvedLoaded(true);
    } catch (err) {
      console.error('[useActiveLobbies] Resolved fetch error:', err);
      setResolvedError(err.message || 'Failed to load resolved tournaments.');
    } finally {
      setResolvedLoading(false);
      setResolvedSyncing(false);
    }
  }, [account, factoryContract, getInstanceContract, runner]);

  useEffect(() => {
    if (enabled) {
      fetchLobbies(true);
      return undefined;
    }

    setLoading(false);
    setSyncing(false);
    return undefined;
  }, [enabled, fetchLobbies]);

  useEffect(() => {
    setResolvedLobbies(EMPTY_DATA);
    setResolvedLoading(false);
    setResolvedSyncing(false);
    setResolvedError(null);
    setResolvedLoaded(false);
    setResolvedPage(0);
    setResolvedTotalCount(0);
  }, [account, factoryContract, getInstanceContract, runner]);

  useEffect(() => {
    if (!enabled || !factoryContract || !runner) return undefined;

    const id = setInterval(() => {
      fetchLobbies(false);
    }, pollIntervalMs);

    return () => clearInterval(id);
  }, [enabled, factoryContract, fetchLobbies, pollIntervalMs, runner]);

  const refetch = useCallback(() => fetchLobbies(false), [fetchLobbies]);
  const refetchResolved = useCallback(() => fetchResolvedLobbies(resolvedPage, resolvedLoaded === false), [fetchResolvedLobbies, resolvedLoaded, resolvedPage]);
  const goToResolvedPage = useCallback((pageIndex) => fetchResolvedLobbies(pageIndex, false), [fetchResolvedLobbies]);

  return {
    lobbies,
    resolvedLobbies,
    loading,
    resolvedLoading,
    syncing,
    resolvedSyncing,
    error,
    resolvedError,
    resolvedLoaded,
    resolvedPage,
    resolvedTotalCount,
    resolvedPageSize: RESOLVED_PAGE_SIZE,
    refetch,
    refetchResolved,
    goToResolvedPage,
  };
}
