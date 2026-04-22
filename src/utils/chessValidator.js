/**
 * chessValidator.js
 *
 * Client-side port of ChessRulesModule.sol.
 * Uses the same packed board/state representation as the contract.
 *
 * Board encoding (4 bits per square, 64 squares = 256-bit BigInt):
 *   0  = empty
 *   1-6  = white pawn/knight/bishop/rook/queen/king
 *   7-12 = black pawn/knight/bishop/rook/queen/king
 *
 * State bit layout:
 *   bits 0-5:  en passant square (63 = none)
 *   bit  6:    white king moved
 *   bit  7:    black king moved
 *   bit  8:    white rook-a moved
 *   bit  9:    white rook-h moved
 *   bit  10:   black rook-a moved
 *   bit  11:   black rook-h moved
 *   bit  12:   white in check
 *   bit  13:   black in check
 *
 * Primary export: validateMoveWithReason(packedBoard, packedState, from, to, isWhite, promotion)
 * Returns null if the move is valid, or a human-readable error string if invalid.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const NO_EN_PASSANT = 63;

const PIECE_NONE   = 0;
const PIECE_PAWN   = 1;
const PIECE_KNIGHT = 2;
const PIECE_BISHOP = 3;
const PIECE_ROOK   = 4;
const PIECE_QUEEN  = 5;
const PIECE_KING   = 6;

const BLACK_OFFSET = 6;

const WHITE_KING = 6;
const BLACK_KING = 12;
const WHITE_ROOK = 4;
const BLACK_ROOK = 10;

const EP_MASK          = 0x3Fn;
const WHITE_KING_MOVED  = 1n << 6n;
const BLACK_KING_MOVED  = 1n << 7n;
const WHITE_ROOK_A_MOVED = 1n << 8n;
const WHITE_ROOK_H_MOVED = 1n << 9n;
const BLACK_ROOK_A_MOVED = 1n << 10n;
const BLACK_ROOK_H_MOVED = 1n << 11n;
const WHITE_IN_CHECK    = 1n << 12n;
const BLACK_IN_CHECK    = 1n << 13n;

const PIECE_NAMES = ['', 'Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

// ─── Board helpers ────────────────────────────────────────────────────────────

function getPiece(board, square) {
  return Number((board >> (BigInt(square) * 4n)) & 0xFn);
}

function setPiece(board, square, piece) {
  const shift = BigInt(square) * 4n;
  const mask = ~(0xFn << shift);
  return (board & mask) | (BigInt(piece) << shift);
}

function isWhitePiece(piece) { return piece >= 1 && piece <= 6; }
function isBlackPiece(piece) { return piece >= 7 && piece <= 12; }
function isOwnPiece(piece, white) { return white ? isWhitePiece(piece) : isBlackPiece(piece); }

function getPieceType(piece) {
  if (piece === 0) return PIECE_NONE;
  if (piece <= 6) return piece;
  return piece - BLACK_OFFSET;
}

// ─── State helpers ────────────────────────────────────────────────────────────

function getEnPassantSquare(state) { return Number(state & EP_MASK); }
function hasFlag(state, flag) { return (state & flag) !== 0n; }

// ─── Path helpers ─────────────────────────────────────────────────────────────

function isPathClear(board, from, to, fileDiff, rankDiff) {
  const fileStep = fileDiff === 0 ? 0 : (fileDiff > 0 ? 1 : -1);
  const rankStep = rankDiff === 0 ? 0 : (rankDiff > 0 ? 1 : -1);

  let currentFile = (from % 8) + fileStep;
  let currentRank = Math.floor(from / 8) + rankStep;
  const targetFile = to % 8;
  const targetRank = Math.floor(to / 8);

  while (currentFile !== targetFile || currentRank !== targetRank) {
    const sq = currentRank * 8 + currentFile;
    if (getPiece(board, sq) !== 0) return false;
    currentFile += fileStep;
    currentRank += rankStep;
  }
  return true;
}

// ─── Attack detection ─────────────────────────────────────────────────────────

function canPieceAttackSquare(board, from, to, piece) {
  const pieceType = getPieceType(piece);
  const pIsWhite = isWhitePiece(piece);

  const fromFile = from % 8;
  const fromRank = Math.floor(from / 8);
  const toFile   = to % 8;
  const toRank   = Math.floor(to / 8);
  const fileDiff = toFile - fromFile;
  const rankDiff = toRank - fromRank;
  const absFile  = Math.abs(fileDiff);
  const absRank  = Math.abs(rankDiff);

  if (pieceType === PIECE_PAWN) {
    const direction = pIsWhite ? 1 : -1;
    return (fileDiff === 1 || fileDiff === -1) && rankDiff === direction;
  } else if (pieceType === PIECE_KNIGHT) {
    return (absFile === 2 && absRank === 1) || (absFile === 1 && absRank === 2);
  } else if (pieceType === PIECE_BISHOP) {
    if (absFile !== absRank) return false;
    return isPathClear(board, from, to, fileDiff, rankDiff);
  } else if (pieceType === PIECE_ROOK) {
    if (fileDiff !== 0 && rankDiff !== 0) return false;
    return isPathClear(board, from, to, fileDiff, rankDiff);
  } else if (pieceType === PIECE_QUEEN) {
    const isDiagonal = absFile === absRank;
    const isStraight = fileDiff === 0 || rankDiff === 0;
    if (!isDiagonal && !isStraight) return false;
    return isPathClear(board, from, to, fileDiff, rankDiff);
  } else if (pieceType === PIECE_KING) {
    return absFile <= 1 && absRank <= 1;
  }
  return false;
}

function isSquareAttacked(board, square, defendingIsWhite) {
  for (let i = 0; i < 64; i++) {
    const piece = getPiece(board, i);
    if (piece === 0) continue;
    if (isOwnPiece(piece, defendingIsWhite)) continue;
    if (canPieceAttackSquare(board, i, square, piece)) return true;
  }
  return false;
}

function findKing(board, isWhite) {
  const king = isWhite ? WHITE_KING : BLACK_KING;
  for (let i = 0; i < 64; i++) {
    if (getPiece(board, i) === king) return i;
  }
  return -1;
}

function isKingInCheck(board, isWhite) {
  const kingSquare = findKing(board, isWhite);
  if (kingSquare === -1) return false;
  return isSquareAttacked(board, kingSquare, isWhite);
}

// ─── Castling ─────────────────────────────────────────────────────────────────

function canCastle(board, state, isWhite, kingSide) {
  if (isWhite && hasFlag(state, WHITE_KING_MOVED)) return false;
  if (!isWhite && hasFlag(state, BLACK_KING_MOVED)) return false;

  if (isWhite) {
    if (kingSide  && hasFlag(state, WHITE_ROOK_H_MOVED)) return false;
    if (!kingSide && hasFlag(state, WHITE_ROOK_A_MOVED)) return false;
    if (hasFlag(state, WHITE_IN_CHECK)) return false;
  } else {
    if (kingSide  && hasFlag(state, BLACK_ROOK_H_MOVED)) return false;
    if (!kingSide && hasFlag(state, BLACK_ROOK_A_MOVED)) return false;
    if (hasFlag(state, BLACK_IN_CHECK)) return false;
  }

  const kingSquare = isWhite ? 4 : 60;

  if (kingSide) {
    if (getPiece(board, kingSquare + 1) !== 0) return false;
    if (getPiece(board, kingSquare + 2) !== 0) return false;
    if (isSquareAttacked(board, kingSquare + 1, isWhite)) return false;
    if (isSquareAttacked(board, kingSquare + 2, isWhite)) return false;
  } else {
    if (getPiece(board, kingSquare - 1) !== 0) return false;
    if (getPiece(board, kingSquare - 2) !== 0) return false;
    if (getPiece(board, kingSquare - 3) !== 0) return false;
    if (isSquareAttacked(board, kingSquare - 1, isWhite)) return false;
    if (isSquareAttacked(board, kingSquare - 2, isWhite)) return false;
  }

  return true;
}

// ─── Would-leave-in-check simulation ─────────────────────────────────────────

function wouldLeaveKingInCheck(board, state, from, to, isWhite) {
  let tempBoard = board;
  const piece = getPiece(tempBoard, from);

  tempBoard = setPiece(tempBoard, to, piece);
  tempBoard = setPiece(tempBoard, from, 0);

  const pieceType = getPieceType(piece);
  const epSquare = getEnPassantSquare(state);
  if (pieceType === PIECE_PAWN && to === epSquare && epSquare !== NO_EN_PASSANT) {
    const capturedPawnSquare = isWhite ? to - 8 : to + 8;
    tempBoard = setPiece(tempBoard, capturedPawnSquare, 0);
  }

  return isKingInCheck(tempBoard, isWhite);
}

// ─── Piece-specific movement validators (return reason string or null) ────────

function validatePawnMove(board, state, from, to, isWhite, fileDiff, rankDiff) {
  const direction = isWhite ? 1 : -1;
  const startRank = isWhite ? 1 : 6;

  if (fileDiff === 0) {
    if (rankDiff === direction) {
      if (getPiece(board, to) !== 0) return 'Pawns cannot move forward into an occupied square';
      return null;
    }
    if (rankDiff === 2 * direction && Math.floor(from / 8) === startRank) {
      const intermediate = from + 8 * direction;
      if (getPiece(board, intermediate) !== 0) return 'Pawn\'s path is blocked';
      if (getPiece(board, to) !== 0) return 'Pawns cannot move forward into an occupied square';
      return null;
    }
    if (rankDiff === -direction || Math.abs(rankDiff) > 2) {
      return 'Pawns can only move forward';
    }
    return 'Pawns can only move one square forward (or two from starting position)';
  }

  if ((fileDiff === 1 || fileDiff === -1) && rankDiff === direction) {
    const targetPiece = getPiece(board, to);
    const epSquare = getEnPassantSquare(state);
    if (targetPiece !== 0 && !isOwnPiece(targetPiece, isWhite)) return null; // valid capture
    if (to === epSquare && epSquare !== NO_EN_PASSANT) return null;           // en passant
    return 'Pawns can only capture diagonally onto an occupied square';
  }

  return 'Invalid pawn move';
}

function validateKnightMove(fileDiff, rankDiff) {
  const absFile = Math.abs(fileDiff);
  const absRank = Math.abs(rankDiff);
  if ((absFile === 2 && absRank === 1) || (absFile === 1 && absRank === 2)) return null;
  return 'Knights move in an L-shape (2 squares in one direction, 1 in another)';
}

function validateBishopMove(board, from, to, fileDiff, rankDiff) {
  const absFile = Math.abs(fileDiff);
  const absRank = Math.abs(rankDiff);
  if (absFile !== absRank) return 'Bishops move diagonally';
  if (!isPathClear(board, from, to, fileDiff, rankDiff)) return 'Bishops cannot jump over pieces';
  return null;
}

function validateRookMove(board, from, to, fileDiff, rankDiff) {
  if (fileDiff !== 0 && rankDiff !== 0) return 'Rooks move in straight lines (horizontally or vertically)';
  if (!isPathClear(board, from, to, fileDiff, rankDiff)) return 'Rooks cannot jump over pieces';
  return null;
}

function validateQueenMove(board, from, to, fileDiff, rankDiff) {
  const absFile = Math.abs(fileDiff);
  const absRank = Math.abs(rankDiff);
  const isDiagonal = absFile === absRank;
  const isStraight = fileDiff === 0 || rankDiff === 0;
  if (!isDiagonal && !isStraight) return 'Queens move in straight lines or diagonally';
  if (!isPathClear(board, from, to, fileDiff, rankDiff)) return 'Queens cannot jump over pieces';
  return null;
}

function validateKingMove(board, state, isWhite, from, fileDiff, rankDiff) {
  const absFile = Math.abs(fileDiff);
  const absRank = Math.abs(rankDiff);

  if (absFile <= 1 && absRank <= 1) return null;

  if (absRank === 0 && absFile === 2) {
    const kingSide = fileDiff > 0;
    if (canCastle(board, state, isWhite, kingSide)) return null;

    // Diagnose why castling is not allowed
    const kingMovedFlag = isWhite ? WHITE_KING_MOVED : BLACK_KING_MOVED;
    if (hasFlag(state, kingMovedFlag)) return 'Cannot castle: the King has already moved';

    const rookMovedFlag = kingSide
      ? (isWhite ? WHITE_ROOK_H_MOVED : BLACK_ROOK_H_MOVED)
      : (isWhite ? WHITE_ROOK_A_MOVED : BLACK_ROOK_A_MOVED);
    if (hasFlag(state, rookMovedFlag)) return 'Cannot castle: the Rook has already moved';

    const inCheckFlag = isWhite ? WHITE_IN_CHECK : BLACK_IN_CHECK;
    if (hasFlag(state, inCheckFlag)) return 'Cannot castle while in check';

    const kingSquare = isWhite ? 4 : 60;
    if (kingSide) {
      if (isSquareAttacked(board, kingSquare + 1, isWhite) ||
          isSquareAttacked(board, kingSquare + 2, isWhite)) {
        return 'Cannot castle through or into check';
      }
    } else {
      if (isSquareAttacked(board, kingSquare - 1, isWhite) ||
          isSquareAttacked(board, kingSquare - 2, isWhite)) {
        return 'Cannot castle through or into check';
      }
    }

    return 'Castling is not available';
  }

  return 'Kings move one square at a time (or two squares to castle)';
}

function getValidationPromotion(pieceType, isWhite, toRank) {
  if (pieceType !== PIECE_PAWN) return 0;
  const reachesBackRank = (isWhite && toRank === 7) || (!isWhite && toRank === 0);
  return reachesBackRank ? PIECE_QUEEN : 0;
}

function validateMoveOnResolvedState(board, state, from, to, isWhite, promotion = 0) {
  if (from < 0 || from > 63 || to < 0 || to > 63 || from === to) {
    return 'Invalid square';
  }

  const piece = getPiece(board, from);
  const pieceType = getPieceType(piece);
  const targetPiece = getPiece(board, to);

  // Cannot capture own piece
  if (isOwnPiece(targetPiece, isWhite)) {
    return 'Cannot capture your own piece';
  }

  const fromFile = from % 8;
  const fromRank = Math.floor(from / 8);
  const toFile   = to % 8;
  const toRank   = Math.floor(to / 8);
  const fileDiff = toFile - fromFile;
  const rankDiff = toRank - fromRank;

  // Validate piece movement pattern
  let movementError = null;
  if (pieceType === PIECE_PAWN) {
    movementError = validatePawnMove(board, state, from, to, isWhite, fileDiff, rankDiff);
  } else if (pieceType === PIECE_KNIGHT) {
    movementError = validateKnightMove(fileDiff, rankDiff);
  } else if (pieceType === PIECE_BISHOP) {
    movementError = validateBishopMove(board, from, to, fileDiff, rankDiff);
  } else if (pieceType === PIECE_ROOK) {
    movementError = validateRookMove(board, from, to, fileDiff, rankDiff);
  } else if (pieceType === PIECE_QUEEN) {
    movementError = validateQueenMove(board, from, to, fileDiff, rankDiff);
  } else if (pieceType === PIECE_KING) {
    movementError = validateKingMove(board, state, isWhite, from, fileDiff, rankDiff);
  } else {
    return 'No piece on the selected square';
  }

  if (movementError) return movementError;

  // Check if the move would leave own king in check
  const currentlyInCheck = isKingInCheck(board, isWhite);
  if (wouldLeaveKingInCheck(board, state, from, to, isWhite)) {
    if (currentlyInCheck) {
      return 'You are in check — you must move out of check';
    }
    return 'That move would leave your King in check';
  }

  // Validate promotion
  if (pieceType === PIECE_PAWN) {
    const isPromotion = (isWhite && toRank === 7) || (!isWhite && toRank === 0);
    if (isPromotion && (promotion < PIECE_KNIGHT || promotion > PIECE_QUEEN)) {
      return 'Invalid promotion piece';
    }
    if (!isPromotion && promotion !== 0) {
      return 'Promotion is only valid when a pawn reaches the last rank';
    }
  }

  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Validate a move and return a human-readable error string, or null if valid.
 *
 * @param {BigInt|string|number} packedBoard  - Contract packed board (BigInt or hex string)
 * @param {BigInt|string|number} packedState  - Contract packed state (BigInt or hex string)
 * @param {number} from       - Source square index 0-63
 * @param {number} to         - Destination square index 0-63
 * @param {boolean} isWhite   - Whether the moving player is White
 * @param {number} promotion  - Promotion piece type (0 if not a promotion)
 * @returns {string|null}     - Error message or null if move is valid
 */
export function validateMoveWithReason(packedBoard, packedState, from, to, isWhite, promotion = 0) {
  try {
    const board = BigInt(packedBoard);
    const state = BigInt(packedState);
    return validateMoveOnResolvedState(board, state, from, to, isWhite, promotion);
  } catch {
    // If the validator itself throws (e.g. malformed board data), fail open
    // so the tx still goes to the contract rather than blocking the user.
    return null;
  }
}

export function getLegalMovesForSquare(packedBoard, packedState, from, isWhite) {
  try {
    const board = BigInt(packedBoard);
    const state = BigInt(packedState);
    const piece = getPiece(board, from);
    const pieceType = getPieceType(piece);

    if (!pieceType || !isOwnPiece(piece, isWhite)) return [];

    const legalMoves = [];
    for (let to = 0; to < 64; to++) {
      if (to === from) continue;
      const promotion = getValidationPromotion(pieceType, isWhite, Math.floor(to / 8));
      if (validateMoveOnResolvedState(board, state, from, to, isWhite, promotion) === null) {
        legalMoves.push(to);
      }
    }

    return legalMoves;
  } catch {
    return [];
  }
}

/**
 * Build the packedBoard BigInt from the board array used in currentMatch.
 * board is an array of 64 { pieceType, color } objects
 * (same format produced by refreshMatchData).
 */
export function boardArrayToPackedBoard(board) {
  let packed = 0n;
  for (let i = 0; i < 64; i++) {
    const { pieceType, color } = board[i];
    let value = 0;
    if (pieceType > 0) {
      value = color === 1 ? pieceType : pieceType + BLACK_OFFSET;
    }
    packed |= BigInt(value) << (BigInt(i) * 4n);
  }
  return packed;
}

export function getCheckStatusFromPackedBoard(packedBoard) {
  try {
    const board = BigInt(packedBoard);
    return {
      whiteInCheck: isKingInCheck(board, true),
      blackInCheck: isKingInCheck(board, false),
    };
  } catch {
    return {
      whiteInCheck: false,
      blackInCheck: false,
    };
  }
}
