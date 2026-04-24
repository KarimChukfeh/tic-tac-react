import { ethers } from 'ethers';
import {
  buildV2MatchKey,
  packNumericBoard,
  ZERO_ADDRESS,
} from './gameShared';
import {
  CHESS_V2_FACTORY_ADDRESS,
  CHESS_V2_FACTORY_ADDRESS_CANDIDATES,
  CHESS_V2_IMPLEMENTATION_ADDRESS,
  decodeConnectFourMoves,
  getDefaultTimeouts as getChessDefaultTimeouts,
  getFactoryContract as getChessFactoryContract,
  getInstanceContract as getChessInstanceContract,
  getPlayerProfileContract as getChessPlayerProfileContract,
  getReadableError as getChessReadableError,
  normalizeInstanceSnapshot as normalizeChessInstanceSnapshot,
  normalizeMatch as normalizeChessMatch,
  resolvePlayerProfileAddress as resolveChessPlayerProfileAddress,
  unpackBoard,
} from './chess';
import {
  CONNECTFOUR_V2_FACTORY_ADDRESS,
  CONNECTFOUR_V2_FACTORY_ADDRESS_CANDIDATES,
  CONNECTFOUR_V2_IMPLEMENTATION_ADDRESS,
  decodeConnectFourMoves as decodeConnectFourColumns,
  getDefaultTimeouts as getConnectFourDefaultTimeouts,
  getFactoryContract as getConnectFourFactoryContract,
  getInstanceContract as getConnectFourInstanceContract,
  getPlayerProfileContract as getConnectFourPlayerProfileContract,
  getReadableError as getConnectFourReadableError,
  normalizeInstanceSnapshot as normalizeConnectFourInstanceSnapshot,
  normalizeMatch as normalizeConnectFourMatch,
  resolvePlayerProfileAddress as resolveConnectFourPlayerProfileAddress,
} from './connectfour';
import {
  TICTACTOE_V2_FACTORY_ADDRESS,
  TICTACTOE_V2_FACTORY_ADDRESS_CANDIDATES,
  TICTACTOE_V2_IMPLEMENTATION_ADDRESS,
  decodeTicTacToeMoves,
  getDefaultTimeouts as getTicTacToeDefaultTimeouts,
  getFactoryContract as getTicTacToeFactoryContract,
  getInstanceContract as getTicTacToeInstanceContract,
  getPlayerProfileContract as getTicTacToePlayerProfileContract,
  getReadableError as getTicTacToeReadableError,
  normalizeInstanceSnapshot as normalizeTicTacToeInstanceSnapshot,
  normalizeMatch as normalizeTicTacToeMatch,
  resolvePlayerProfileAddress as resolveTicTacToePlayerProfileAddress,
} from './tictactoe';
import { resolveChessBoardState, resolveFlatBoard } from './matchBoardState';

export const V2_GAME_ADAPTER = 'v2-game-adapter';

function buildTimeoutState(timeoutData) {
  if (!timeoutData) return null;

  const esc1Start = Number(timeoutData.escalation1Start);
  const esc2Start = Number(timeoutData.escalation2Start);
  if (esc1Start <= 0 && esc2Start <= 0 && !timeoutData.isStalled) {
    return null;
  }

  return {
    escalation1Start: esc1Start,
    escalation2Start: esc2Start,
    activeEscalation: Number(timeoutData.activeEscalation),
    timeoutActive: timeoutData.isStalled,
    forfeitAmount: 0,
  };
}

function inferTimeoutState({
  timeoutState,
  matchStatus,
  currentTurn,
  lastMoveTime,
  player1,
  p1TimeRaw,
  p2TimeRaw,
  elapsed,
  tierConfig,
  defaultLevel2Delay,
  defaultLevel3Delay,
}) {
  if (matchStatus !== 1 || !currentTurn || lastMoveTime <= 0) {
    return timeoutState;
  }

  const isP1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();
  const activePlayerTimeAtLastMove = isP1Turn ? p1TimeRaw : p2TimeRaw;
  const timeoutOccurredAt = lastMoveTime + activePlayerTimeAtLastMove;
  const hasClientDetectedTimeout = elapsed >= activePlayerTimeAtLastMove;
  if (!hasClientDetectedTimeout) return timeoutState;
  if (timeoutState && (!timeoutState.timeoutActive || timeoutState.escalation1Start > 0 || timeoutState.escalation2Start > 0)) {
    return timeoutState;
  }

  const matchLevel2Delay = Number(tierConfig?.timeouts?.matchLevel2Delay ?? tierConfig?.matchLevel2Delay ?? defaultLevel2Delay);
  const matchLevel3Delay = Number(tierConfig?.timeouts?.matchLevel3Delay ?? tierConfig?.matchLevel3Delay ?? defaultLevel3Delay);

  return {
    escalation1Start: timeoutOccurredAt + matchLevel2Delay,
    escalation2Start: timeoutOccurredAt + matchLevel3Delay,
    activeEscalation: timeoutState?.activeEscalation ?? 0,
    timeoutActive: true,
    forfeitAmount: timeoutState?.forfeitAmount ?? 0,
  };
}

function computePlayerTimes({
  currentTurn,
  player1,
  matchStatus,
  lastMoveTime,
  p1TimeRaw,
  p2TimeRaw,
}) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = lastMoveTime > 0 ? now - lastMoveTime : 0;
  let player1TimeRemaining = p1TimeRaw;
  let player2TimeRemaining = p2TimeRaw;
  const isP1Turn = currentTurn?.toLowerCase() === player1?.toLowerCase();

  if (matchStatus === 1 && currentTurn && elapsed > 0) {
    if (isP1Turn) player1TimeRemaining = Math.max(0, player1TimeRemaining - elapsed);
    else player2TimeRemaining = Math.max(0, player2TimeRemaining - elapsed);
  }

  return {
    elapsed,
    isP1Turn,
    player1TimeRemaining,
    player2TimeRemaining,
  };
}

function getLoser(matchStatus, winner, player1, player2) {
  if (matchStatus !== 2 || !winner || winner.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return ZERO_ADDRESS;
  }
  return winner.toLowerCase() === player1.toLowerCase() ? player2 : player1;
}

function buildTurnBasedBracketMatch({
  normalizedMatch,
  matchInfo,
  matchData,
  fullMatch,
  boardResult,
  boardLength,
  defaultMatchTimePerPlayer,
  defaultLevel2Delay,
  defaultLevel3Delay,
  tierConfig,
  timeoutData,
  escL2Available = false,
  escL3Available = false,
  isUserAdvancedForRound = false,
  extra = null,
}) {
  const tierMatchTime = Number(tierConfig?.timeouts?.matchTimePerPlayer ?? tierConfig?.matchTimePerPlayer ?? defaultMatchTimePerPlayer);
  const player1 = matchData.player1 || matchInfo.player1;
  const player2 = matchData.player2 || matchInfo.player2;
  const matchStatus = Number(matchData.status);
  const lastMoveTime = Number(matchData.lastMoveTime);
  const startTime = Number(matchData.startTime);
  const winner = matchData.matchWinner || matchData.winner;
  const completionReason = Number(matchData.completionReason ?? 0);
  const currentTurn = fullMatch?.currentTurn;
  const firstPlayer = fullMatch?.firstPlayer || player1;
  const p1TimeRaw = fullMatch?.player1TimeRemaining !== undefined ? Number(fullMatch.player1TimeRemaining) : tierMatchTime;
  const p2TimeRaw = fullMatch?.player2TimeRemaining !== undefined ? Number(fullMatch.player2TimeRemaining) : tierMatchTime;
  const board = resolveFlatBoard(boardResult, matchInfo.board, boardLength);

  const playerTimes = computePlayerTimes({
    currentTurn,
    player1,
    matchStatus,
    lastMoveTime,
    p1TimeRaw,
    p2TimeRaw,
  });

  let timeoutState = buildTimeoutState(timeoutData);
  timeoutState = inferTimeoutState({
    timeoutState,
    matchStatus,
    currentTurn,
    lastMoveTime,
    player1,
    p1TimeRaw,
    p2TimeRaw,
    elapsed: playerTimes.elapsed,
    tierConfig,
    defaultLevel2Delay,
    defaultLevel3Delay,
  });

  return {
    ...normalizedMatch,
    player1,
    player2,
    firstPlayer,
    currentTurn,
    winner,
    loser: getLoser(matchStatus, winner, player1, player2),
    board,
    matchStatus,
    status: matchStatus,
    completionReason,
    startTime,
    lastMoveTime,
    player1TimeRemaining: playerTimes.player1TimeRemaining,
    player2TimeRemaining: playerTimes.player2TimeRemaining,
    matchTimePerPlayer: tierMatchTime,
    timeoutState,
    escL2Available,
    escL3Available,
    isUserAdvancedForRound,
    ...(typeof extra === 'function' ? extra({ matchData, matchInfo, fullMatch, board, firstPlayer, player1, player2 }) : {}),
  };
}

function buildTurnBasedInstanceActivity({
  instance,
  account,
  dismissedMatches,
  matchResults,
  decodeMoves,
  defaultMatchTimePerPlayer,
}) {
  const { instanceId, status, currentRound, enrolledCount, playerCount } = instance;

  if (status === 0) {
    return {
      activeMatches: [],
      inProgressTournaments: [],
      unfilledTournaments: [{ tierId: 0, instanceId, enrolledCount, playerCount }],
      terminatedMatches: [],
    };
  }

  const activeMatches = [];
  const terminatedMatches = [];
  const acc = account.toLowerCase();
  let hasActiveMatch = false;

  for (const result of matchResults) {
    if (!result) continue;

    const { roundIdx, matchIdx, m } = result;
    const p1 = m.player1?.toLowerCase();
    const p2 = m.player2?.toLowerCase();
    const isPlayer1 = p1 === acc;
    const isPlayer2 = p2 === acc;
    if (!isPlayer1 && !isPlayer2) continue;

    const matchKey = `0-${instanceId}-${roundIdx}-${matchIdx}`;
    if (dismissedMatches.has(matchKey)) continue;

    const matchStatus = Number(m.status);
    if (status === 2 && matchStatus === 1) {
      terminatedMatches.push({
        tierId: 0,
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
      const lastMoveTime = Number(m.lastMoveTime || 0);
      const elapsed = lastMoveTime > 0 ? now - lastMoveTime : 0;
      const matchTimePerPlayer = Number(instance.matchTimePerPlayer || defaultMatchTimePerPlayer);
      const timeRemaining = Math.max(0, matchTimePerPlayer - elapsed);
      let isMyTurn = false;
      if (matchStatus === 1) {
        const moveCount = decodeMoves(m.moves || '').length;
        const isPlayer1Turn = moveCount % 2 === 0;
        isMyTurn = isPlayer1Turn ? isPlayer1 : isPlayer2;
      }

      activeMatches.push({
        tierId: 0,
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
      tierId: 0,
      instanceId,
      currentRound,
      playerRound: null,
    });
  }

  return { activeMatches, inProgressTournaments, unfilledTournaments: [], terminatedMatches };
}

function buildHistoryBase({
  account,
  record,
  instanceAddress,
  tierConfig,
  matchData,
  fullMatch,
  moveHistory,
  board,
}) {
  const acc = account.toLowerCase();
  const winner = matchData.matchWinner;
  const winnerLower = winner?.toLowerCase();
  const matchCompletionReason = Number(matchData.completionReason || (matchData.isDraw ? 2 : 0));
  const matchCompletionCategory = Number(matchData.completionCategory ?? 0);
  const playerOutcomeReason = Number(record.outcome ?? matchCompletionReason);
  const playerOutcomeCategory = Number(record.category ?? matchCompletionCategory);
  const playerPerspective = Boolean(matchData.isDraw)
    ? 'draw'
    : (winnerLower && winnerLower === acc && winnerLower !== ZERO_ADDRESS.toLowerCase())
      ? 'winner'
      : 'loser';
  const endTime = Number(matchData.lastMoveTime || record.recordedAt || matchData.startTime || 0);
  const playerCount = Number(tierConfig?.playerCount || 2);

  return {
    matchId: `0-${instanceAddress}-${Number(record.roundNumber)}-${Number(record.matchNumber)}`,
    tierId: 0,
    instanceId: instanceAddress,
    instanceAddress,
    roundNumber: Number(record.roundNumber),
    matchNumber: Number(record.matchNumber),
    playerCount,
    totalRounds: playerCount > 1 ? Math.ceil(Math.log2(playerCount)) : 1,
    player1: matchData.player1,
    player2: matchData.player2,
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
    isScheduledPlayer: matchData.player1?.toLowerCase() === acc || matchData.player2?.toLowerCase() === acc,
    isDraw: Boolean(matchData.isDraw),
    board,
    startTime: Number(matchData.startTime || 0),
    endTime,
    timestamp: endTime,
    moveHistory,
  };
}

function buildTurnBasedCurrentMatch({
  matchInfo,
  instanceAddress,
  matchData,
  fullMatch,
  boardResult,
  tierConfig,
  instanceInfo,
  timeoutData,
  escL2Available,
  escL3Available,
  isUserAdvancedForRound,
  userAccount,
  boardLength,
  defaultMatchTimePerPlayer,
  defaultLevel2Delay,
  defaultLevel3Delay,
  userLabels,
  extra = null,
}) {
  const playerCount = Number(instanceInfo?.playerCount ?? matchInfo.playerCount ?? 0) || null;
  const normalized = buildTurnBasedBracketMatch({
    normalizedMatch: matchInfo,
    matchInfo,
    matchData,
    fullMatch,
    boardResult,
    boardLength,
    defaultMatchTimePerPlayer,
    defaultLevel2Delay,
    defaultLevel3Delay,
    tierConfig,
    timeoutData,
    escL2Available,
    escL3Available,
    isUserAdvancedForRound,
    extra,
  });
  const isPlayer1 = normalized.player1?.toLowerCase() === userAccount?.toLowerCase();
  const isYourTurn = normalized.currentTurn?.toLowerCase() === userAccount?.toLowerCase();
  const isTimedOut = normalized.matchStatus === 2 && normalized.timeoutState?.timeoutActive === true;

  return {
    ...normalized,
    playerCount,
    isTimedOut,
    isPlayer1,
    isYourTurn,
    userSymbol: isPlayer1 ? userLabels.player1 : userLabels.player2,
    tierId: 0,
    instanceId: 0,
    instanceAddress,
    movesString: matchData.moves || '',
  };
}

function movesToPairs(movesString) {
  const moves = [];
  if (!movesString) return moves;

  for (let index = 0; index < movesString.length - 1; index += 2) {
    const from = movesString.charCodeAt(index);
    const to = movesString.charCodeAt(index + 1);
    if (from >= 0 && from < 64 && to >= 0 && to < 64) {
      moves.push({ from, to });
    }
  }

  return moves;
}

function indexToChessNotation(index) {
  const file = String.fromCharCode(97 + (index % 8));
  const rank = Math.floor(index / 8) + 1;
  return `${file}${rank}`;
}

function buildCommonAdapter({
  key,
  routePath,
  scope,
  defaultFactoryAddress,
  factoryAddressCandidates,
  implementationAddress,
  displayName,
  getFactoryContract,
  getInstanceContract,
  getPlayerProfileContract,
  resolvePlayerProfileAddress,
  getReadableError,
  getDefaultTimeouts,
  normalizeInstanceSnapshot,
}) {
  return {
    __type: V2_GAME_ADAPTER,
    key,
    routePath,
    scope,
    defaultFactoryAddress,
    factoryAddressCandidates,
    implementationAddress,
    displayName,
    getFactoryContract,
    getInstanceContract,
    getPlayerProfileContract,
    resolvePlayerProfileAddress,
    getReadableError,
    getDefaultTimeouts,
    normalizeInstanceSnapshot,
  };
}

export const ticTacToeAdapter = {
  ...buildCommonAdapter({
    key: 'tictactoe',
    routePath: '/tictactoe',
    scope: 'tictactoe',
    defaultFactoryAddress: TICTACTOE_V2_FACTORY_ADDRESS,
    factoryAddressCandidates: TICTACTOE_V2_FACTORY_ADDRESS_CANDIDATES,
    implementationAddress: TICTACTOE_V2_IMPLEMENTATION_ADDRESS,
    displayName: 'TicTacToe',
    getFactoryContract: getTicTacToeFactoryContract,
    getInstanceContract: getTicTacToeInstanceContract,
    getPlayerProfileContract: getTicTacToePlayerProfileContract,
    resolvePlayerProfileAddress: resolveTicTacToePlayerProfileAddress,
    getReadableError: getTicTacToeReadableError,
    getDefaultTimeouts: getTicTacToeDefaultTimeouts,
    normalizeInstanceSnapshot: normalizeTicTacToeInstanceSnapshot,
  }),
  buildMoveHistory(movesString, firstPlayer, player1, player2) {
    if (!movesString) return [];
    return decodeTicTacToeMoves(movesString).map((cellIndex, idx) => {
      const isFirstPlayerMove = idx % 2 === 0;
      const movePlayer = isFirstPlayerMove ? firstPlayer : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
      return { player: isFirstPlayerMove ? 'X' : 'O', cell: cellIndex, address: movePlayer };
    });
  },
  bracket: {
    getMatchCallSpecs(instance, roundIndex, matchIndex) {
      const matchKey = buildV2MatchKey(roundIndex, matchIndex);
      return [
        { contract: instance, functionName: 'getMatch', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instance, functionName: 'isMatchEscL2Available', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'isMatchEscL3Available', params: [roundIndex, matchIndex] },
      ];
    },
    buildMatch(account, roundIndex, matchIndex, matchInfo, tierConfig, callResults, isUserAdvancedForRound) {
      const [matchResult, fullMatchResult, boardResult, timeoutResult, escL2Result, escL3Result] = callResults;
      if (!matchResult?.success) return null;
      const matchData = matchResult.result;
      const normalized = normalizeTicTacToeMatch(roundIndex, matchIndex, matchData, boardResult?.success ? boardResult.result : []);
      return buildTurnBasedBracketMatch({
        normalizedMatch: normalized,
        matchInfo,
        matchData,
        fullMatch: fullMatchResult?.success ? fullMatchResult.result : null,
        boardResult: boardResult?.success ? boardResult.result : [],
        boardLength: 9,
        defaultMatchTimePerPlayer: 120,
        defaultLevel2Delay: 120,
        defaultLevel3Delay: 240,
        tierConfig,
        timeoutData: timeoutResult?.success ? timeoutResult.result : null,
        escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
        escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
        isUserAdvancedForRound,
      });
    },
  },
  history: {
    getCallSpecs(instance, roundNumber, matchNumber) {
      const matchKey = buildV2MatchKey(roundNumber, matchNumber);
      return [
        { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
      ];
    },
    buildRecord(account, record, instanceAddress, tierConfig, callResults) {
      const [matchResult, fullMatchResult, boardResult] = callResults;
      if (!matchResult?.success) return null;
      const matchData = matchResult.result;
      if (Number(matchData.status) !== 2) return null;
      const fullMatch = fullMatchResult?.success ? fullMatchResult.result : null;
      const moveHistory = decodeTicTacToeMoves(matchData.moves || '').map((cellIndex, index) => ({
        player: index % 2 === 0 ? 'X' : 'O',
        cell: cellIndex,
      }));
      const board = packNumericBoard(boardResult?.success ? boardResult.result : []);
      return buildHistoryBase({
        account,
        record,
        instanceAddress,
        tierConfig,
        matchData,
        fullMatch: fullMatch || { firstPlayer: matchData.player1 },
        moveHistory,
        board,
      });
    },
  },
  activity: {
    getMatchCallSpecs(instance, roundIdx, matchIdx) {
      return [{ contract: instance, functionName: 'getMatch', params: [roundIdx, matchIdx] }];
    },
    buildMatchResult(roundIdx, matchIdx, callResults) {
      const [matchResult] = callResults;
      if (!matchResult?.success) return null;
      return { roundIdx, matchIdx, m: matchResult.result };
    },
    buildInstanceActivity(instance, account, dismissedMatches, matchResults) {
      return buildTurnBasedInstanceActivity({
        instance,
        account,
        dismissedMatches,
        matchResults,
        decodeMoves: decodeTicTacToeMoves,
        defaultMatchTimePerPlayer: 120,
      });
    },
  },
  currentMatch: {
    getCallSpecs(instance, roundNumber, matchNumber, userAccount) {
      const matchKey = buildV2MatchKey(roundNumber, matchNumber);
      const specs = [
        { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'tierConfig' },
        { contract: instance, functionName: 'getInstanceInfo' },
        { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instance, functionName: 'isMatchEscL2Available', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'isMatchEscL3Available', params: [roundNumber, matchNumber] },
      ];
      if (userAccount) {
        specs.push({ contract: instance, functionName: 'isPlayerInAdvancedRound', params: [roundNumber, userAccount] });
      }
      return specs;
    },
    buildMatch(matchInfo, instanceAddress, userAccount, callResults) {
      const [matchResult, fullMatchResult, boardResult, tierConfigResult, instanceInfoResult, timeoutResult, escL2Result, escL3Result, advancedRoundResult] = callResults;
      const matchData = matchResult?.success ? matchResult.result : null;
      if (!matchData) return null;
      return buildTurnBasedCurrentMatch({
        matchInfo,
        instanceAddress,
        matchData,
        fullMatch: fullMatchResult?.success ? fullMatchResult.result : null,
        boardResult: boardResult?.success ? boardResult.result : [],
        tierConfig: tierConfigResult?.success ? tierConfigResult.result : null,
        instanceInfo: instanceInfoResult?.success ? instanceInfoResult.result : null,
        timeoutData: timeoutResult?.success ? timeoutResult.result : null,
        escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
        escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
        isUserAdvancedForRound: Boolean(advancedRoundResult?.success ? advancedRoundResult.result : false),
        userAccount,
        boardLength: 9,
        defaultMatchTimePerPlayer: 120,
        defaultLevel2Delay: 120,
        defaultLevel3Delay: 240,
        userLabels: { player1: 'X', player2: 'O' },
      });
    },
  },
};

export const connectFourAdapter = {
  ...buildCommonAdapter({
    key: 'connectfour',
    routePath: '/connect4',
    scope: 'connectfour',
    defaultFactoryAddress: CONNECTFOUR_V2_FACTORY_ADDRESS,
    factoryAddressCandidates: CONNECTFOUR_V2_FACTORY_ADDRESS_CANDIDATES,
    implementationAddress: CONNECTFOUR_V2_IMPLEMENTATION_ADDRESS,
    displayName: 'Connect Four',
    getFactoryContract: getConnectFourFactoryContract,
    getInstanceContract: getConnectFourInstanceContract,
    getPlayerProfileContract: getConnectFourPlayerProfileContract,
    resolvePlayerProfileAddress: resolveConnectFourPlayerProfileAddress,
    getReadableError: getConnectFourReadableError,
    getDefaultTimeouts: getConnectFourDefaultTimeouts,
    normalizeInstanceSnapshot: normalizeConnectFourInstanceSnapshot,
  }),
  buildMoveHistory(movesString, firstPlayer, player1, player2) {
    if (!movesString) return [];
    return decodeConnectFourColumns(movesString).map((column, idx) => {
      const isFirstPlayerMove = idx % 2 === 0;
      const movePlayer = isFirstPlayerMove ? firstPlayer : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
      return {
        player: isFirstPlayerMove ? 'Red' : 'Blue',
        column: column + 1,
        address: movePlayer,
      };
    });
  },
  bracket: {
    getMatchCallSpecs(instance, roundIndex, matchIndex) {
      const matchKey = buildV2MatchKey(roundIndex, matchIndex);
      return [
        { contract: instance, functionName: 'getMatch', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instance, functionName: 'isMatchEscL2Available', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'isMatchEscL3Available', params: [roundIndex, matchIndex] },
      ];
    },
    buildMatch(account, roundIndex, matchIndex, matchInfo, tierConfig, callResults, isUserAdvancedForRound) {
      const [matchResult, fullMatchResult, boardResult, timeoutResult, escL2Result, escL3Result] = callResults;
      if (!matchResult?.success) return null;
      const matchData = matchResult.result;
      const normalized = normalizeConnectFourMatch(roundIndex, matchIndex, matchData, boardResult?.success ? boardResult.result : []);
      return buildTurnBasedBracketMatch({
        normalizedMatch: normalized,
        matchInfo,
        matchData,
        fullMatch: fullMatchResult?.success ? fullMatchResult.result : null,
        boardResult: boardResult?.success ? boardResult.result : [],
        boardLength: 42,
        defaultMatchTimePerPlayer: 300,
        defaultLevel2Delay: 120,
        defaultLevel3Delay: 240,
        tierConfig,
        timeoutData: timeoutResult?.success ? timeoutResult.result : null,
        escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
        escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
        isUserAdvancedForRound,
        extra: ({ matchData }) => {
          const moves = matchData.moves || '';
          const decodedMoves = decodeConnectFourColumns(moves);
          return {
            lastColumn: decodedMoves.length > 0 ? decodedMoves[decodedMoves.length - 1] : null,
          };
        },
      });
    },
  },
  history: {
    getCallSpecs(instance, roundNumber, matchNumber) {
      const matchKey = buildV2MatchKey(roundNumber, matchNumber);
      return [
        { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
      ];
    },
    buildRecord(account, record, instanceAddress, tierConfig, callResults) {
      const [matchResult, fullMatchResult, boardResult] = callResults;
      if (!matchResult?.success) return null;
      const matchData = matchResult.result;
      if (Number(matchData.status) !== 2) return null;
      const fullMatch = fullMatchResult?.success ? fullMatchResult.result : null;
      const moveHistory = decodeConnectFourColumns(matchData.moves || '').map((columnIndex, index) => ({
        player: index % 2 === 0 ? 'Red' : 'Blue',
        column: columnIndex + 1,
        cellIndex: columnIndex,
      }));
      const board = packNumericBoard(boardResult?.success ? boardResult.result : []);
      return buildHistoryBase({
        account,
        record,
        instanceAddress,
        tierConfig,
        matchData,
        fullMatch,
        moveHistory,
        board,
      });
    },
  },
  activity: {
    getMatchCallSpecs(instance, roundIdx, matchIdx) {
      return [{ contract: instance, functionName: 'getMatch', params: [roundIdx, matchIdx] }];
    },
    buildMatchResult(roundIdx, matchIdx, callResults) {
      const [matchResult] = callResults;
      if (!matchResult?.success) return null;
      return { roundIdx, matchIdx, m: matchResult.result };
    },
    buildInstanceActivity(instance, account, dismissedMatches, matchResults) {
      return buildTurnBasedInstanceActivity({
        instance,
        account,
        dismissedMatches,
        matchResults,
        decodeMoves: decodeConnectFourColumns,
        defaultMatchTimePerPlayer: 300,
      });
    },
  },
  currentMatch: {
    getCallSpecs(instance, roundNumber, matchNumber, userAccount) {
      const matchKey = buildV2MatchKey(roundNumber, matchNumber);
      const specs = [
        { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'tierConfig' },
        { contract: instance, functionName: 'getInstanceInfo' },
        { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instance, functionName: 'isMatchEscL2Available', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'isMatchEscL3Available', params: [roundNumber, matchNumber] },
      ];
      if (userAccount) {
        specs.push({ contract: instance, functionName: 'isPlayerInAdvancedRound', params: [roundNumber, userAccount] });
      }
      return specs;
    },
    buildMatch(matchInfo, instanceAddress, userAccount, callResults) {
      const [matchResult, fullMatchResult, boardResult, tierConfigResult, instanceInfoResult, timeoutResult, escL2Result, escL3Result, advancedRoundResult] = callResults;
      const matchData = matchResult?.success ? matchResult.result : null;
      if (!matchData) return null;
      return buildTurnBasedCurrentMatch({
        matchInfo,
        instanceAddress,
        matchData,
        fullMatch: fullMatchResult?.success ? fullMatchResult.result : null,
        boardResult: boardResult?.success ? boardResult.result : [],
        tierConfig: tierConfigResult?.success ? tierConfigResult.result : null,
        instanceInfo: instanceInfoResult?.success ? instanceInfoResult.result : null,
        timeoutData: timeoutResult?.success ? timeoutResult.result : null,
        escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
        escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
        isUserAdvancedForRound: Boolean(advancedRoundResult?.success ? advancedRoundResult.result : false),
        userAccount,
        boardLength: 42,
        defaultMatchTimePerPlayer: 300,
        defaultLevel2Delay: 120,
        defaultLevel3Delay: 240,
        userLabels: { player1: 'Red', player2: 'Blue' },
        extra: ({ matchData }) => {
          const moves = matchData.moves || '';
          const decodedMoves = decodeConnectFourColumns(moves);
          return {
            lastColumn: decodedMoves.length > 0 ? decodedMoves[decodedMoves.length - 1] : null,
          };
        },
      });
    },
  },
};

export const chessAdapter = {
  ...buildCommonAdapter({
    key: 'chess',
    routePath: '/chess',
    scope: 'chess',
    defaultFactoryAddress: CHESS_V2_FACTORY_ADDRESS,
    factoryAddressCandidates: CHESS_V2_FACTORY_ADDRESS_CANDIDATES,
    implementationAddress: CHESS_V2_IMPLEMENTATION_ADDRESS,
    displayName: 'Chess',
    getFactoryContract: getChessFactoryContract,
    getInstanceContract: getChessInstanceContract,
    getPlayerProfileContract: getChessPlayerProfileContract,
    resolvePlayerProfileAddress: resolveChessPlayerProfileAddress,
    getReadableError: getChessReadableError,
    getDefaultTimeouts: getChessDefaultTimeouts,
    normalizeInstanceSnapshot: normalizeChessInstanceSnapshot,
  }),
  buildMoveHistory(movesString, firstPlayer, player1, player2) {
    if (!movesString) return [];
    return movesToPairs(movesString).map((move, idx) => {
      const isFirstMove = idx % 2 === 0;
      const movePlayer = isFirstMove ? firstPlayer : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
      return {
        player: isFirstMove ? '♔' : '♚',
        move: `${indexToChessNotation(move.from)}→${indexToChessNotation(move.to)}`,
        from: move.from,
        to: move.to,
        promotion: 0,
        address: movePlayer,
      };
    });
  },
  bracket: {
    getMatchCallSpecs(instance, roundIndex, matchIndex) {
      const matchKey = buildV2MatchKey(roundIndex, matchIndex);
      return [
        { contract: instance, functionName: 'getMatch', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instance, functionName: 'isMatchEscL2Available', params: [roundIndex, matchIndex] },
        { contract: instance, functionName: 'isMatchEscL3Available', params: [roundIndex, matchIndex] },
      ];
    },
    buildMatch(account, roundIndex, matchIndex, matchInfo, tierConfig, callResults, isUserAdvancedForRound) {
      const [matchResult, fullMatchResult, boardResult, timeoutResult, escL2Result, escL3Result] = callResults;
      if (!matchResult?.success) return null;
      const matchData = matchResult.result;
      const boardValue = boardResult?.success ? boardResult.result : [0n, 0n];
      const { packedBoard, packedState } = resolveChessBoardState(boardValue, matchInfo);
      const normalized = normalizeChessMatch(roundIndex, matchIndex, matchData, packedBoard, packedState);
      const tierMatchTime = Number(tierConfig?.timeouts?.matchTimePerPlayer ?? tierConfig?.matchTimePerPlayer ?? 600);
      const player1 = matchData.player1 || matchInfo.player1;
      const player2 = matchData.player2 || matchInfo.player2;
      const matchStatus = Number(matchData.status);
      const lastMoveTime = Number(matchData.lastMoveTime);
      const startTime = Number(matchData.startTime);
      const winner = matchData.matchWinner || matchData.winner;
      const completionReason = Number(matchData.completionReason ?? 0);
      const fullMatch = fullMatchResult?.success ? fullMatchResult.result : null;
      const currentTurn = fullMatch?.currentTurn;
      const firstPlayer = fullMatch?.firstPlayer || player1;
      const p1TimeRaw = Number(fullMatch?.player1TimeRemaining ?? tierMatchTime);
      const p2TimeRaw = Number(fullMatch?.player2TimeRemaining ?? tierMatchTime);
      const playerTimes = computePlayerTimes({
        currentTurn,
        player1,
        matchStatus,
        lastMoveTime,
        p1TimeRaw,
        p2TimeRaw,
      });
      let timeoutState = buildTimeoutState(timeoutResult?.success ? timeoutResult.result : null);
      timeoutState = inferTimeoutState({
        timeoutState,
        matchStatus,
        currentTurn,
        lastMoveTime,
        player1,
        p1TimeRaw,
        p2TimeRaw,
        elapsed: playerTimes.elapsed,
        tierConfig,
        defaultLevel2Delay: 180,
        defaultLevel3Delay: 360,
      });
      const packedStateBig = BigInt(packedState || 0);
      const moves = movesToPairs(matchData.moves || fullMatch?.moves || '');
      const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

      return {
        ...normalized,
        player1,
        player2,
        firstPlayer,
        currentTurn,
        winner,
        loser: getLoser(matchStatus, winner, player1, player2),
        board: unpackBoard(packedBoard),
        packedBoard: BigInt(packedBoard || 0),
        packedState: BigInt(packedState || 0),
        matchStatus,
        status: matchStatus,
        completionReason,
        startTime,
        lastMoveTime,
        player1TimeRemaining: playerTimes.player1TimeRemaining,
        player2TimeRemaining: playerTimes.player2TimeRemaining,
        matchTimePerPlayer: tierMatchTime,
        timeoutState,
        escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
        escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
        isUserAdvancedForRound,
        whiteInCheck: ((packedStateBig >> 12n) & 1n) === 1n,
        blackInCheck: ((packedStateBig >> 13n) & 1n) === 1n,
        lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : null,
      };
    },
  },
  history: {
    getCallSpecs(instance, roundNumber, matchNumber) {
      const matchKey = buildV2MatchKey(roundNumber, matchNumber);
      return [
        { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
      ];
    },
    buildRecord(account, record, instanceAddress, tierConfig, callResults) {
      const [matchResult, fullResult, boardResult] = callResults;
      if (!matchResult?.success) return null;
      const matchData = matchResult.result;
      if (Number(matchData.status) !== 2) return null;
      const fullMatch = fullResult?.success ? fullResult.result : null;
      const moveHistory = (matchData.moves || '').length > 0
        ? movesToPairs(matchData.moves || '').map((move, index) => ({
            player: index % 2 === 0 ? '♔' : '♚',
            move: `${indexToChessNotation(move.from)}→${indexToChessNotation(move.to)}`,
            from: move.from,
            to: move.to,
          }))
        : [];
      const [packedBoard] = boardResult?.success ? boardResult.result : [0n, 0n];
      return buildHistoryBase({
        account,
        record,
        instanceAddress,
        tierConfig,
        matchData,
        fullMatch,
        moveHistory,
        board: BigInt(packedBoard || 0),
      });
    },
  },
  activity: {
    getMatchCallSpecs(instance, roundIdx, matchIdx) {
      const matchKey = buildV2MatchKey(roundIdx, matchIdx);
      return [
        { contract: instance, functionName: 'getMatch', params: [roundIdx, matchIdx] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
      ];
    },
    buildMatchResult(roundIdx, matchIdx, callResults) {
      const [matchResult, fullResult] = callResults;
      if (!matchResult?.success) return null;
      return {
        roundIdx,
        matchIdx,
        m: matchResult.result,
        full: fullResult?.success ? fullResult.result : null,
      };
    },
    buildInstanceActivity(instance, account, dismissedMatches, matchResults) {
      const { instanceId, status, currentRound, enrolledCount, playerCount } = instance;
      if (status === 0) {
        return {
          activeMatches: [],
          inProgressTournaments: [],
          unfilledTournaments: [{ tierId: 0, instanceId, enrolledCount, playerCount }],
          terminatedMatches: [],
        };
      }

      const activeMatches = [];
      const terminatedMatches = [];
      const acc = account.toLowerCase();
      let hasActiveMatch = false;

      for (const result of matchResults) {
        if (!result) continue;
        const { roundIdx, matchIdx, m, full } = result;
        const p1 = m.player1?.toLowerCase();
        const p2 = m.player2?.toLowerCase();
        const isPlayer1 = p1 === acc;
        const isPlayer2 = p2 === acc;
        if (!isPlayer1 && !isPlayer2) continue;

        const matchKey = `0-${instanceId}-${roundIdx}-${matchIdx}`;
        if (dismissedMatches.has(matchKey)) continue;

        const matchStatus = Number(m.status);
        if (status === 2 && matchStatus === 1) {
          terminatedMatches.push({
            tierId: 0,
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
          const baseTime = isPlayer1
            ? Number(full?.player1TimeRemaining || instance.matchTimePerPlayer || 600)
            : Number(full?.player2TimeRemaining || instance.matchTimePerPlayer || 600);
          const isMyTurn = matchStatus === 1 ? full?.currentTurn?.toLowerCase() === acc : false;
          const timeRemaining = isMyTurn ? Math.max(0, baseTime - elapsed) : baseTime;

          activeMatches.push({
            tierId: 0,
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
          tierId: 0,
          instanceId,
          currentRound,
          playerRound: null,
        });
      }

      return { activeMatches, inProgressTournaments, unfilledTournaments: [], terminatedMatches };
    },
  },
  currentMatch: {
    getCallSpecs(instance, roundNumber, matchNumber, userAccount) {
      const matchKey = buildV2MatchKey(roundNumber, matchNumber);
      const specs = [
        { contract: instance, functionName: 'getMatch', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'matches', params: [matchKey] },
        { contract: instance, functionName: 'getBoard', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'tierConfig' },
        { contract: instance, functionName: 'getInstanceInfo' },
        { contract: instance, functionName: 'matchTimeouts', params: [matchKey] },
        { contract: instance, functionName: 'isMatchEscL2Available', params: [roundNumber, matchNumber] },
        { contract: instance, functionName: 'isMatchEscL3Available', params: [roundNumber, matchNumber] },
      ];
      if (userAccount) {
        specs.push({ contract: instance, functionName: 'isPlayerInAdvancedRound', params: [roundNumber, userAccount] });
      }
      return specs;
    },
    buildMatch(matchInfo, instanceAddress, userAccount, callResults) {
      const [matchResult, fullMatchResult, boardResult, tierConfigResult, instanceInfoResult, timeoutResult, escL2Result, escL3Result, advancedRoundResult] = callResults;
      const matchData = matchResult?.success ? matchResult.result : null;
      if (!matchData) return null;
      const fullMatch = fullMatchResult?.success ? fullMatchResult.result : null;
      const boardValue = boardResult?.success ? boardResult.result : null;
      const tierConfig = tierConfigResult?.success ? tierConfigResult.result : null;
      const instanceInfo = instanceInfoResult?.success ? instanceInfoResult.result : null;
      const timeoutData = timeoutResult?.success ? timeoutResult.result : null;
      const playerCount = Number(instanceInfo?.playerCount ?? matchInfo.playerCount ?? 0) || null;
      const { packedBoard, packedState } = resolveChessBoardState(boardValue, matchInfo);
      const board = unpackBoard(packedBoard);
      const tierMatchTime = Number(tierConfig?.timeouts?.matchTimePerPlayer ?? tierConfig?.matchTimePerPlayer ?? 600);
      const player1 = matchData.player1 || matchInfo.player1;
      const player2 = matchData.player2 || matchInfo.player2;
      const matchStatus = Number(matchData.status);
      const lastMoveTime = Number(matchData.lastMoveTime);
      const startTime = Number(matchData.startTime);
      const winner = matchData.matchWinner || matchData.winner;
      const completionReason = Number(matchData.completionReason ?? 0);
      const currentTurn = fullMatch?.currentTurn;
      const firstPlayer = fullMatch?.firstPlayer;
      const p1TimeRaw = Number(fullMatch?.player1TimeRemaining ?? tierMatchTime);
      const p2TimeRaw = Number(fullMatch?.player2TimeRemaining ?? tierMatchTime);
      const playerTimes = computePlayerTimes({
        currentTurn,
        player1,
        matchStatus,
        lastMoveTime,
        p1TimeRaw,
        p2TimeRaw,
      });
      let timeoutState = buildTimeoutState(timeoutData);
      timeoutState = inferTimeoutState({
        timeoutState,
        matchStatus,
        currentTurn,
        lastMoveTime,
        player1,
        p1TimeRaw,
        p2TimeRaw,
        elapsed: playerTimes.elapsed,
        tierConfig,
        defaultLevel2Delay: 180,
        defaultLevel3Delay: 360,
      });
      const packedStateBig = BigInt(packedState || 0);
      const isPlayer1 = player1.toLowerCase() === userAccount?.toLowerCase();
      const isYourTurn = currentTurn?.toLowerCase() === userAccount?.toLowerCase();
      const isTimedOut = matchStatus === 2 && timeoutState?.timeoutActive === true;
      const moves = movesToPairs(matchData.moves || fullMatch?.moves || '');
      let lastMove = null;
      if (moves.length > 0) {
        const move = moves[moves.length - 1];
        const moveAddress = (moves.length - 1) % 2 === 0
          ? firstPlayer
          : (firstPlayer?.toLowerCase() === player1?.toLowerCase() ? player2 : player1);
        lastMove = {
          from: move.from,
          to: move.to,
          isMyMove: moveAddress?.toLowerCase() === userAccount?.toLowerCase(),
        };
      }

      return {
        ...matchInfo,
        playerCount,
        player1,
        player2,
        firstPlayer,
        currentTurn,
        winner,
        loser: getLoser(matchStatus, winner, player1, player2),
        board,
        packedBoard: BigInt(packedBoard || 0),
        packedState: BigInt(packedState || 0),
        matchStatus,
        completionReason,
        startTime,
        lastMoveTime,
        isTimedOut,
        isPlayer1,
        isYourTurn,
        userSymbol: isPlayer1 ? 'White' : 'Black',
        player1TimeRemaining: playerTimes.player1TimeRemaining,
        player2TimeRemaining: playerTimes.player2TimeRemaining,
        matchTimePerPlayer: tierMatchTime,
        timeoutState,
        escL2Available: Boolean(escL2Result?.success ? escL2Result.result : false),
        escL3Available: Boolean(escL3Result?.success ? escL3Result.result : false),
        isUserAdvancedForRound: Boolean(advancedRoundResult?.success ? advancedRoundResult.result : false),
        tierId: 0,
        instanceId: 0,
        instanceAddress,
        whiteInCheck: ((packedStateBig >> 12n) & 1n) === 1n,
        blackInCheck: ((packedStateBig >> 13n) & 1n) === 1n,
        lastMove,
        movesString: matchData.moves || fullMatch?.moves || '',
      };
    },
  },
};
