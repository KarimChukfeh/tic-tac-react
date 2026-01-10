/**
 * Event Reconstruction Utilities
 *
 * Queries MoveMade events from the blockchain and reconstructs board states.
 * Used for displaying completed matches without relying on on-chain cache.
 */

import { ethers } from 'ethers';

/**
 * Generate matchId for querying events
 * @param {number} tierId
 * @param {number} instanceId
 * @param {number} roundNumber
 * @param {number} matchNumber
 * @returns {string} Hex string matchId
 */
export const generateMatchId = (tierId, instanceId, roundNumber, matchNumber) => {
  return ethers.solidityPackedKeccak256(
    ['uint256', 'uint256', 'uint256', 'uint256'],
    [tierId, instanceId, roundNumber, matchNumber]
  );
};

/**
 * Query MoveMade events for a specific match
 * @param {Object} contract - Ethers contract instance
 * @param {string} matchId - Match ID (bytes32)
 * @param {number} fromBlock - Optional starting block (default: 0)
 * @returns {Array} Array of MoveMade events
 */
export const queryMoveMadeEvents = async (contract, matchId, fromBlock = 0) => {
  try {
    const filter = contract.filters.MoveMade(matchId);
    const events = await contract.queryFilter(filter, fromBlock);

    console.log(`[EventReconstruction] Found ${events.length} MoveMade events for matchId ${matchId}`);
    return events;
  } catch (error) {
    console.error('[EventReconstruction] Error querying MoveMade events:', error);
    return [];
  }
};

/**
 * Query MatchCompleted event for a specific match
 * @param {Object} contract - Ethers contract instance
 * @param {string} matchId - Match ID (bytes32)
 * @param {number} fromBlock - Optional starting block (default: 0)
 * @returns {Object|null} MatchCompleted event or null
 */
export const queryMatchCompletedEvent = async (contract, matchId, fromBlock = 0) => {
  try {
    const filter = contract.filters.MatchCompleted(matchId);
    const events = await contract.queryFilter(filter, fromBlock);

    if (events.length > 0) {
      console.log(`[EventReconstruction] Found MatchCompleted event for matchId ${matchId}`);
      return events[0];
    }
    return null;
  } catch (error) {
    console.error('[EventReconstruction] Error querying MatchCompleted event:', error);
    return null;
  }
};

/**
 * Reconstruct TicTacToe board from MoveMade events
 * @param {Array} events - Array of MoveMade events
 * @param {string} player1Address - Player 1 address
 * @param {string} _player2Address - Player 2 address (unused, kept for API consistency)
 * @returns {Array} 3x3 board array (0=empty, 1=player1, 2=player2)
 */
export const reconstructTicTacToeBoard = (events, player1Address, _player2Address) => {
  const board = Array(9).fill(0);

  events.forEach((event) => {
    const { player, cellIndex } = event.args;
    const isPlayer1 = player.toLowerCase() === player1Address.toLowerCase();
    board[cellIndex] = isPlayer1 ? 1 : 2;
  });

  console.log('[EventReconstruction] TicTacToe board reconstructed:', board);
  return board;
};

/**
 * Reconstruct Chess board from MoveMade events
 * @param {Array} events - Array of MoveMade events
 * @param {string} _player1Address - Player 1 address (unused, kept for API consistency)
 * @param {string} _player2Address - Player 2 address (unused, kept for API consistency)
 * @returns {Object} { boardArray, moveHistory }
 */
export const reconstructChessBoard = (events, _player1Address, _player2Address) => {
  // Initialize standard chess starting position
  const board = [
    4, 2, 3, 5, 6, 3, 2, 4, // Row 0: White back rank
    1, 1, 1, 1, 1, 1, 1, 1, // Row 1: White pawns
    0, 0, 0, 0, 0, 0, 0, 0, // Row 2: Empty
    0, 0, 0, 0, 0, 0, 0, 0, // Row 3: Empty
    0, 0, 0, 0, 0, 0, 0, 0, // Row 4: Empty
    0, 0, 0, 0, 0, 0, 0, 0, // Row 5: Empty
    11, 11, 11, 11, 11, 11, 11, 11, // Row 6: Black pawns
    14, 12, 13, 15, 16, 13, 12, 14  // Row 7: Black back rank
  ];

  const moveHistory = [];

  events.forEach((event) => {
    const { player, from, to } = event.args;
    const piece = board[from];
    board[to] = piece;
    board[from] = 0;

    moveHistory.push({ player, from, to, piece });
  });

  console.log('[EventReconstruction] Chess board reconstructed with', moveHistory.length, 'moves');
  return { boardArray: board, moveHistory };
};

/**
 * Reconstruct Connect4 board from MoveMade events
 * @param {Array} events - Array of MoveMade events
 * @param {string} player1Address - Player 1 address
 * @param {string} _player2Address - Player 2 address (unused, kept for API consistency)
 * @returns {Array} 6x7 board array (0=empty, 1=player1, 2=player2)
 */
export const reconstructConnect4Board = (events, player1Address, _player2Address) => {
  const board = Array(6).fill(null).map(() => Array(7).fill(0));

  events.forEach((event) => {
    const { player, column, row } = event.args;
    const isPlayer1 = player.toLowerCase() === player1Address.toLowerCase();
    board[row][column] = isPlayer1 ? 1 : 2;
  });

  console.log('[EventReconstruction] Connect4 board reconstructed:', board);
  return board;
};

/**
 * Get full match reconstruction including board and completion status
 * @param {Object} contract - Ethers contract instance
 * @param {number} tierId
 * @param {number} instanceId
 * @param {number} roundNumber
 * @param {number} matchNumber
 * @param {string} player1Address
 * @param {string} player2Address
 * @param {string} gameType - 'tictactoe', 'chess', or 'connect4'
 * @returns {Object} { board, winner, isDraw, events }
 */
export const reconstructMatchFromEvents = async (
  contract,
  tierId,
  instanceId,
  roundNumber,
  matchNumber,
  player1Address,
  player2Address,
  gameType
) => {
  try {
    const matchId = generateMatchId(tierId, instanceId, roundNumber, matchNumber);

    // Query events
    const moveEvents = await queryMoveMadeEvents(contract, matchId);
    const completedEvent = await queryMatchCompletedEvent(contract, matchId);

    // Reconstruct board based on game type
    let board;
    switch (gameType) {
      case 'tictactoe':
        board = reconstructTicTacToeBoard(moveEvents, player1Address, player2Address);
        break;
      case 'chess':
        board = reconstructChessBoard(moveEvents, player1Address, player2Address);
        break;
      case 'connect4':
        board = reconstructConnect4Board(moveEvents, player1Address, player2Address);
        break;
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }

    return {
      board,
      winner: completedEvent?.args?.winner || null,
      isDraw: completedEvent?.args?.isDraw || false,
      events: moveEvents,
      completedEvent,
    };
  } catch (error) {
    console.error('[EventReconstruction] Error reconstructing match:', error);
    throw error;
  }
};
