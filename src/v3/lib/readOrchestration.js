import { ethers } from 'ethers';
import { multicallContracts } from '../../utils/multicall';

export function buildV3MatchKey(roundNumber, matchNumber) {
  return ethers.solidityPackedKeccak256(
    ['uint8', 'uint8'],
    [roundNumber, matchNumber],
  );
}

export async function readV3FactoryDashboard(resolveFactoryContract) {
  const factory = await resolveFactoryContract();
  const [minEntryFee, feeIncrement, implementation] = await Promise.all([
    factory.MIN_ENTRY_FEE(),
    factory.FEE_INCREMENT(),
    factory.implementation(),
  ]);

  return {
    factory,
    minEntryFee,
    feeIncrement,
    implementation,
  };
}

export async function readV3TournamentState({
  address,
  instance,
  runner,
  account,
  mapTournamentSnapshot,
  mapPrizeDistribution,
  mapBracketMatch,
  getRoundLabel,
  virtualTierId = 0,
  virtualInstanceId = 0,
  multicall = multicallContracts,
}) {
  const baseCallSpecs = [
    { contract: instance, functionName: 'getInstanceInfo' },
    { contract: instance, functionName: 'tournament' },
    { contract: instance, functionName: 'getPlayers' },
    { contract: instance, functionName: 'getPrizeDistribution' },
    { contract: instance, functionName: 'getBracket' },
    { contract: instance, functionName: 'tierConfig' },
  ];
  if (account) {
    baseCallSpecs.push({
      contract: instance,
      functionName: 'isEnrolled',
      params: [account],
    });
  }

  const baseResults = await multicall(baseCallSpecs, runner);
  const info = baseResults[0]?.success
    ? baseResults[0].result
    : await instance.getInstanceInfo();
  const tournament = baseResults[1]?.success
    ? baseResults[1].result
    : await instance.tournament();
  const players = baseResults[2]?.success
    ? baseResults[2].result
    : await instance.getPlayers();
  const prizeDistribution = baseResults[3]?.success
    ? baseResults[3].result
    : await instance.getPrizeDistribution();
  const bracket = baseResults[4]?.success
    ? baseResults[4].result
    : await instance.getBracket();
  const tierConfig = baseResults[5]?.success
    ? baseResults[5].result
    : await instance.tierConfig();
  const enrolled = account
    ? (baseResults[6]?.success
      ? baseResults[6].result
      : await instance.isEnrolled(account))
    : false;

  const totalRounds = Number(bracket.totalRounds);
  const roundDescriptors = Array.from({ length: totalRounds }, (_, roundIndex) => ({
    roundIndex,
    matchCount: Number(bracket.matchCounts[roundIndex] || 0),
    completedCount: Number(bracket.completedCounts[roundIndex] || 0),
  }));

  const advancedRoundCallSpecs = account
    ? roundDescriptors
      .filter(({ matchCount }) => matchCount > 0)
      .map(({ roundIndex }) => ({
        contract: instance,
        functionName: 'isPlayerInAdvancedRound',
        params: [roundIndex, account],
      }))
    : [];

  const matchDescriptors = [];
  const matchCallSpecs = [];
  for (const { roundIndex, matchCount } of roundDescriptors) {
    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      const matchKey = buildV3MatchKey(roundIndex, matchIndex);
      matchDescriptors.push({ roundIndex, matchIndex });
      matchCallSpecs.push(
        { contract: instance, functionName: 'getMatch', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instance, functionName: 'isMatchEscL2Available', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'isMatchEscL3Available', params: [roundIndex, matchIndex] },
      );
    }
  }

  const activityCallSpecs = [...advancedRoundCallSpecs, ...matchCallSpecs];
  const activityResults = activityCallSpecs.length > 0
    ? await multicall(activityCallSpecs, runner)
    : [];
  const advancedRoundResults = activityResults.slice(0, advancedRoundCallSpecs.length);
  const matchResults = activityResults.slice(advancedRoundCallSpecs.length);

  const advancedByRound = new Map();
  let advancedCursor = 0;
  for (const { roundIndex, matchCount } of roundDescriptors) {
    if (!account || matchCount === 0) continue;
    const result = advancedRoundResults[advancedCursor];
    advancedCursor += 1;
    advancedByRound.set(
      roundIndex,
      Boolean(result?.success ? result.result : false),
    );
  }

  const matchesByRound = new Map();
  let matchCursor = 0;
  for (const { roundIndex, matchIndex } of matchDescriptors) {
    const matchResult = matchResults[matchCursor];
    const fullMatchResult = matchResults[matchCursor + 1];
    const boardResult = matchResults[matchCursor + 2];
    const timeoutResult = matchResults[matchCursor + 3];
    const escL2Result = matchResults[matchCursor + 4];
    const escL3Result = matchResults[matchCursor + 5];
    matchCursor += 6;

    if (!matchResult?.success) continue;

    const hydrated = mapBracketMatch({
      roundNumber: roundIndex,
      matchNumber: matchIndex,
      matchData: matchResult.result,
      fullMatch: fullMatchResult?.success ? fullMatchResult.result : null,
      boardResult: boardResult?.success ? boardResult.result : null,
      tierConfig,
      timeoutData: timeoutResult?.success ? timeoutResult.result : null,
      escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
      escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
      isUserAdvancedForRound: advancedByRound.get(roundIndex) || false,
      account,
    });

    const roundMatches = matchesByRound.get(roundIndex) || [];
    roundMatches.push({
      ...hydrated,
      tierId: virtualTierId,
      instanceId: virtualInstanceId,
    });
    matchesByRound.set(roundIndex, roundMatches);
  }

  const rounds = roundDescriptors.map(({
    roundIndex,
    matchCount,
    completedCount,
  }) => ({
    roundIndex,
    matchCount,
    completedCount,
    label: getRoundLabel(roundIndex, totalRounds),
    matches: matchesByRound.get(roundIndex) || [],
  }));

  return {
    ...mapTournamentSnapshot({
      address,
      info,
      tournament,
      players,
      enrolled,
    }),
    payoutEntries: mapPrizeDistribution(prizeDistribution),
    rounds,
    tierId: virtualTierId,
    instanceId: virtualInstanceId,
  };
}

async function optionalRead(read, fallback) {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

export async function readV3ActiveMatchState({
  instance,
  runner,
  account,
  matchInfo,
  multicall = multicallContracts,
}) {
  const { roundNumber, matchNumber } = matchInfo;
  const matchKey = buildV3MatchKey(roundNumber, matchNumber);
  const callSpecs = [
    { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
    { contract: instance, functionName: 'matches', params: [matchKey] },
    { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
    { contract: instance, functionName: 'tierConfig' },
    { contract: instance, functionName: 'getInstanceInfo' },
    { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
    { contract: instance, functionName: 'isMatchEscL2Available', params: [roundNumber, matchNumber] },
    { contract: instance, functionName: 'isMatchEscL3Available', params: [roundNumber, matchNumber] },
  ];
  if (account) {
    callSpecs.push({
      contract: instance,
      functionName: 'isPlayerInAdvancedRound',
      params: [roundNumber, account],
    });
  }

  const results = runner ? await multicall(callSpecs, runner) : [];
  const matchData = results[0]?.success
    ? results[0].result
    : await instance.getMatch(roundNumber, matchNumber);
  const fullMatch = results[1]?.success
    ? results[1].result
    : await instance.matches(matchKey);
  const boardResult = results[2]?.success
    ? results[2].result
    : await optionalRead(() => instance.getBoard(roundNumber, matchNumber), null);
  const tierConfig = results[3]?.success
    ? results[3].result
    : await instance.tierConfig();
  const instanceInfo = results[4]?.success
    ? results[4].result
    : await optionalRead(() => instance.getInstanceInfo(), null);
  const timeoutData = results[5]?.success
    ? results[5].result
    : await optionalRead(() => instance.matchTimeouts(matchKey), null);
  const escL2Available = results[6]?.success
    ? Boolean(results[6].result)
    : Boolean(await optionalRead(
      () => instance.isMatchEscL2Available(roundNumber, matchNumber),
      false,
    ));
  const escL3Available = results[7]?.success
    ? Boolean(results[7].result)
    : Boolean(await optionalRead(
      () => instance.isMatchEscL3Available(roundNumber, matchNumber),
      false,
    ));
  const isUserAdvancedForRound = account
    ? (results[8]?.success
      ? Boolean(results[8].result)
      : Boolean(await optionalRead(
        () => instance.isPlayerInAdvancedRound(roundNumber, account),
        false,
      )))
    : false;

  return {
    matchKey,
    matchData,
    fullMatch,
    boardResult,
    tierConfig,
    instanceInfo,
    timeoutData,
    escL2Available,
    escL3Available,
    isUserAdvancedForRound,
  };
}
