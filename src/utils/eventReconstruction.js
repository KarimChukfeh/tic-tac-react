/**
 * Event Reconstruction Utilities
 *
 * Queries MoveMade events from the blockchain and reconstructs board states.
 * Used for displaying completed matches without relying on on-chain cache.
 */

import { ethers } from 'ethers';

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
  // Initialize standard chess starting position with {pieceType, color} objects
  // White pieces: color=1, Black pieces: color=2
  // PieceTypes: 1=pawn, 2=knight, 3=bishop, 4=rook, 5=queen, 6=king
  const board = [
    { pieceType: 4, color: 1 }, { pieceType: 2, color: 1 }, { pieceType: 3, color: 1 }, { pieceType: 5, color: 1 },
    { pieceType: 6, color: 1 }, { pieceType: 3, color: 1 }, { pieceType: 2, color: 1 }, { pieceType: 4, color: 1 }, // Row 0: White back rank
    { pieceType: 1, color: 1 }, { pieceType: 1, color: 1 }, { pieceType: 1, color: 1 }, { pieceType: 1, color: 1 },
    { pieceType: 1, color: 1 }, { pieceType: 1, color: 1 }, { pieceType: 1, color: 1 }, { pieceType: 1, color: 1 }, // Row 1: White pawns
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 },
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, // Row 2: Empty
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 },
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, // Row 3: Empty
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 },
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, // Row 4: Empty
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 },
    { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, { pieceType: 0, color: 0 }, // Row 5: Empty
    { pieceType: 1, color: 2 }, { pieceType: 1, color: 2 }, { pieceType: 1, color: 2 }, { pieceType: 1, color: 2 },
    { pieceType: 1, color: 2 }, { pieceType: 1, color: 2 }, { pieceType: 1, color: 2 }, { pieceType: 1, color: 2 }, // Row 6: Black pawns
    { pieceType: 4, color: 2 }, { pieceType: 2, color: 2 }, { pieceType: 3, color: 2 }, { pieceType: 5, color: 2 },
    { pieceType: 6, color: 2 }, { pieceType: 3, color: 2 }, { pieceType: 2, color: 2 }, { pieceType: 4, color: 2 }  // Row 7: Black back rank
  ];

  const moveHistory = [];

  events.forEach((event) => {
    const { player, from, to } = event.args;
    const piece = board[from];
    board[to] = piece;
    board[from] = { pieceType: 0, color: 0 };

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
        // For chess, prefer using the board from MatchCompleted event
        // This contains the final board state as a packed uint256
        if (completedEvent?.args?.board) {
          console.log('[EventReconstruction] Using board from MatchCompleted event');
          board = { boardArray: unpackChessBoard(completedEvent.args.board), moveHistory: [] };
        } else {
          // Fallback to move-by-move reconstruction
          console.log('[EventReconstruction] Falling back to move-by-move reconstruction');
          board = reconstructChessBoard(moveEvents, player1Address, player2Address);
        }
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
      completionReason: completedEvent?.args?.reason ? Number(completedEvent.args.reason) : 0,
      events: moveEvents,
      completedEvent,
    };
  } catch (error) {
    console.error('[EventReconstruction] Error reconstructing match:', error);
    throw error;
  }
};
