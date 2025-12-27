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
 * Parse TicTacToe match data
 * @param {Object} matchData - Raw match data from TicTacToe contract
 * @returns {Object} Parsed TicTacToe match with all fields
 */
export const parseTicTacToeMatch = (matchData) => ({
  ...parseCommonMatchData(matchData),

  // Game-specific fields
  board: Array.from(matchData.board).map(cell => Number(cell)),
  currentTurn: matchData.currentTurn,
  firstPlayer: matchData.firstPlayer,
  lastMovedCell: Number(matchData.lastMovedCell),
  blockedPlayer: matchData.blockedPlayer,
  blockedCell: Number(matchData.blockedCell),
  player1UsedBlock: matchData.player1UsedBlock,
  player2UsedBlock: matchData.player2UsedBlock,

  // Total match time tracking fields (with defaults for backward compatibility)
  player1TimeRemaining: matchData.player1TimeRemaining !== undefined ? Number(matchData.player1TimeRemaining) : 300,
  player2TimeRemaining: matchData.player2TimeRemaining !== undefined ? Number(matchData.player2TimeRemaining) : 300,
  lastMoveTimestamp: matchData.lastMoveTimestamp !== undefined ? Number(matchData.lastMoveTimestamp) : 0,
});

/**
 * Parse ConnectFour match data
 * @param {Object} matchData - Raw match data from ConnectFour contract
 * @returns {Object} Parsed ConnectFour match with all fields
 */
export const parseConnectFourMatch = (matchData) => ({
  ...parseCommonMatchData(matchData),

  // Game-specific fields
  board: Array.from(matchData.board).map(cell => Number(cell)),
  currentTurn: matchData.currentTurn,
  firstPlayer: matchData.firstPlayer,
  moveCount: Number(matchData.moveCount),
  lastColumn: Number(matchData.lastColumn),
});

/**
 * Parse Chess match data
 * @param {Object} matchData - Raw match data from Chess contract
 * @returns {Object} Parsed Chess match with all fields
 */
export const parseChessMatch = (matchData) => ({
  ...parseCommonMatchData(matchData),

  // Game-specific fields
  board: Array.from(matchData.board).map(cell => Number(cell)),
  currentTurn: matchData.currentTurn,
  firstPlayer: matchData.firstPlayer,

  // Chess-specific state
  whiteInCheck: matchData.whiteInCheck,
  blackInCheck: matchData.blackInCheck,
  enPassantSquare: Number(matchData.enPassantSquare),
  halfMoveClock: Number(matchData.halfMoveClock),
  fullMoveNumber: Number(matchData.fullMoveNumber),

  // Castling rights
  whiteKingSideCastle: matchData.whiteKingSideCastle,
  whiteQueenSideCastle: matchData.whiteQueenSideCastle,
  blackKingSideCastle: matchData.blackKingSideCastle,
  blackQueenSideCastle: matchData.blackQueenSideCastle,

  // Move history
  moveHistory: matchData.moveHistory,
});

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
