/**
 * Match Data Parsers
 *
 * Utilities for parsing match data from the standardized smart contract ABIs.
 * All three game contracts (TicTacToe, Chess, ConnectFour) now return a nested
 * structure with CommonMatchData that includes explicit winner and loser addresses.
 */

/**
 * Parse common match data fields that are standardized across all games
 * @param {Object} matchData - Raw match data from contract's getMatch function
 * @returns {Object} Parsed common match fields
 */
export const parseCommonMatchData = (matchData) => {
  return {
    // Player addresses
    player1: matchData.common.player1,
    player2: matchData.common.player2,

    // Match result
    winner: matchData.common.winner,
    loser: matchData.common.loser,

    // Match status
    matchStatus: Number(matchData.common.status),
    isDraw: matchData.common.isDraw,

    // Completion reason (ML1/ML2/ML3/etc)
    completionReason: Number(matchData.completionReason || 0),

    // Timestamps (convert BigInt to number)
    startTime: Number(matchData.common.startTime),
    lastMoveTime: Number(matchData.common.lastMoveTime),
    endTime: Number(matchData.common.endTime),

    // Tournament context (convert to numbers)
    tierId: Number(matchData.common.tierId),
    instanceId: Number(matchData.common.instanceId),
    roundNumber: Number(matchData.common.roundNumber),
    matchNumber: Number(matchData.common.matchNumber),

    // Cache status
    isCached: matchData.common.isCached,
  };
};

/**
 * Unpack TicTacToe board from packed uint256
 * Board is packed as 2 bits per cell (0=empty, 1=player1, 2=player2)
 * 9 cells = 18 bits total
 * @param {BigInt|number} packedBoard - Packed board data
 * @returns {Array<number>} Array of 9 cell values (0, 1, or 2)
 */
const unpackTicTacToeBoard = (packedBoard) => {
  const board = [];
  let packed = BigInt(packedBoard);
  for (let i = 0; i < 9; i++) {
    board.push(Number(packed & 3n)); // Extract 2 bits
    packed = packed >> 2n; // Shift right by 2 bits
  }
  return board;
};

/**
 * Parse TicTacToe match data
 * @param {Object} matchData - Raw match data from TicTacToe contract
 * @returns {Object} Parsed TicTacToe match with all fields
 */
export const parseTicTacToeMatch = (matchData) => ({
  ...parseCommonMatchData(matchData),

  // Game-specific fields
  board: unpackTicTacToeBoard(matchData.packedBoard),
  currentTurn: matchData.currentTurn,
  firstPlayer: matchData.firstPlayer,

  // Total match time tracking fields
  player1TimeRemaining: matchData.player1TimeRemaining !== undefined ? Number(matchData.player1TimeRemaining) : 300,
  player2TimeRemaining: matchData.player2TimeRemaining !== undefined ? Number(matchData.player2TimeRemaining) : 300,
  lastMoveTimestamp: matchData.lastMoveTimestamp !== undefined ? Number(matchData.lastMoveTimestamp) : 0,
});

/**
 * Unpack ConnectFour board from packed uint256
 * Board is packed as 2 bits per cell (0=empty, 1=player1, 2=player2)
 * 42 cells (6 rows x 7 columns) = 84 bits total
 * @param {BigInt|number} packedBoard - Packed board data
 * @returns {Array<number>} Array of 42 cell values (0, 1, or 2)
 */
const unpackConnectFourBoard = (packedBoard) => {
  const board = [];
  let packed = BigInt(packedBoard);
  for (let i = 0; i < 42; i++) {
    board.push(Number(packed & 3n)); // Extract 2 bits
    packed = packed >> 2n; // Shift right by 2 bits
  }
  return board;
};

/**
 * Parse ConnectFour match data
 * @param {Object} matchData - Raw match data from ConnectFour contract
 * @returns {Object} Parsed ConnectFour match with all fields
 */
export const parseConnectFourMatch = (matchData) => ({
  ...parseCommonMatchData(matchData),

  // Game-specific fields
  board: unpackConnectFourBoard(matchData.packedBoard),
  currentTurn: matchData.currentTurn,
  firstPlayer: matchData.firstPlayer,
  moveCount: Number(matchData.moveCount),
  lastColumn: Number(matchData.lastColumn),

  // Total match time tracking fields
  player1TimeRemaining: matchData.player1TimeRemaining !== undefined ? Number(matchData.player1TimeRemaining) : 300,
  player2TimeRemaining: matchData.player2TimeRemaining !== undefined ? Number(matchData.player2TimeRemaining) : 300,
  lastMoveTimestamp: matchData.lastMoveTimestamp !== undefined ? Number(matchData.lastMoveTimestamp) : 0,
});

/**
 * Unpack Chess board from packedBoard (4 bits per square, 64 squares)
 * Encoding: 0=empty, 1-6=white pieces (pawn..king), 7-12=black pieces (pawn..king)
 * @param {BigInt|number} packedBoard - Packed board data
 * @returns {Array<{pieceType: number, color: number}>} Array of 64 piece objects
 */
const unpackChessBoard = (packedBoard) => {
  const board = [];
  let packed = BigInt(packedBoard);
  for (let i = 0; i < 64; i++) {
    const value = Number(packed & 0xFn);
    let pieceType = 0;
    let color = 0;
    if (value >= 1 && value <= 6) {
      pieceType = value;  // white: 1-6
      color = 1;
    } else if (value >= 7 && value <= 12) {
      pieceType = value - 6;  // black: 7-12 → pieceType 1-6
      color = 2;
    }
    board.push({ pieceType, color });
    packed = packed >> 4n;
  }
  return board;
};

/**
 * Parse Chess match data
 * @param {Object} matchData - Raw match data from Chess contract
 * @returns {Object} Parsed Chess match with all fields
 *
 * Note: Chess contract can return either:
 * - NESTED structure with 'common' field (from getMatch())
 * - FLAT structure without 'common' field (legacy or from chessMatches mapping)
 */
export const parseChessMatch = (matchData) => {
  // Check if data has nested 'common' structure
  const hasCommon = matchData.common !== undefined;

  // Extract common fields based on structure type
  const commonData = hasCommon ? {
    player1: matchData.common.player1,
    player2: matchData.common.player2,
    winner: matchData.common.winner,
    loser: matchData.common.loser || '0x0000000000000000000000000000000000000000',
    matchStatus: Number(matchData.common.status),
    isDraw: matchData.common.isDraw,
    startTime: Number(matchData.common.startTime),
    lastMoveTime: Number(matchData.common.lastMoveTime),
    endTime: matchData.common.endTime ? Number(matchData.common.endTime) : 0,
    tierId: Number(matchData.common.tierId),
    instanceId: Number(matchData.common.instanceId),
    roundNumber: Number(matchData.common.roundNumber),
    matchNumber: Number(matchData.common.matchNumber),
    isCached: matchData.common.isCached || false,
  } : {
    player1: matchData.player1,
    player2: matchData.player2,
    winner: matchData.winner,
    loser: matchData.loser || '0x0000000000000000000000000000000000000000',
    matchStatus: Number(matchData.status),
    isDraw: matchData.isDraw,
    startTime: Number(matchData.startTime),
    lastMoveTime: Number(matchData.lastMoveTime),
    endTime: matchData.endTime ? Number(matchData.endTime) : 0,
    tierId: matchData.tierId !== undefined ? Number(matchData.tierId) : 0,
    instanceId: matchData.instanceId !== undefined ? Number(matchData.instanceId) : 0,
    roundNumber: matchData.roundNumber !== undefined ? Number(matchData.roundNumber) : 0,
    matchNumber: matchData.matchNumber !== undefined ? Number(matchData.matchNumber) : 0,
    isCached: matchData.isCached || false,
  };

  return {
    ...commonData,

    // Game-specific fields
    currentTurn: matchData.currentTurn,
    firstPlayer: matchData.firstPlayer,

    // Chess-specific state
    whiteInCheck: matchData.whiteInCheck,
    blackInCheck: matchData.blackInCheck,
    fullMoveNumber: Number(matchData.fullMoveNumber),

    // Board - unpack from packedBoard (4 bits per square)
    board: matchData.packedBoard ? unpackChessBoard(matchData.packedBoard) : [],
    enPassantSquare: matchData.enPassantSquare !== undefined ? Number(matchData.enPassantSquare) : 0,
    halfMoveClock: matchData.halfMoveClock !== undefined ? Number(matchData.halfMoveClock) : 0,
    whiteKingSideCastle: matchData.whiteKingSideCastle || false,
    whiteQueenSideCastle: matchData.whiteQueenSideCastle || false,
    blackKingSideCastle: matchData.blackKingSideCastle || false,
    blackQueenSideCastle: matchData.blackQueenSideCastle || false,
    moveHistory: matchData.moveHistory || [],

    // Time tracking fields
    player1TimeRemaining: matchData.player1TimeRemaining !== undefined ? Number(matchData.player1TimeRemaining) : 300,
    player2TimeRemaining: matchData.player2TimeRemaining !== undefined ? Number(matchData.player2TimeRemaining) : 300,
    lastMoveTimestamp: matchData.lastMoveTimestamp !== undefined ? Number(matchData.lastMoveTimestamp) : 0,
  };
};

/**
 * Validate match result consistency
 * @param {Object} match - Parsed match data
 * @returns {boolean} True if valid, false otherwise
 */
export const validateMatchResult = (match) => {
  const { winner, loser, player1, player2, isDraw, matchStatus } = match;
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  // If match is completed and not a draw
  if (matchStatus === 2 && !isDraw) {
    // Winner must be one of the players (unless double forfeit)
    if (winner !== player1 && winner !== player2 && winner !== zeroAddress) {
      console.error('Invalid winner: not a match participant');
      return false;
    }

    // Loser must be the other player (unless double forfeit)
    if (loser !== zeroAddress) {
      if (winner === player1 && loser !== player2) {
        console.error('Invalid loser: should be player2');
        return false;
      }
      if (winner === player2 && loser !== player1) {
        console.error('Invalid loser: should be player1');
        return false;
      }
    }

    // Winner and loser should not be the same (unless both zero for double forfeit)
    if (winner === loser && winner !== zeroAddress) {
      console.error('Invalid match result: winner equals loser');
      return false;
    }
  }

  // If it's a draw, neither should be a winner/loser (should be zero addresses)
  if (isDraw && matchStatus === 2) {
    if (winner !== zeroAddress || loser !== zeroAddress) {
      console.warn('Draw match has winner/loser addresses set');
    }
  }

  return true;
};
