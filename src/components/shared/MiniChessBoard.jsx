/**
 * MiniChessBoard Component
 *
 * Compact, interactive Chess board for the Player Activity panel
 * Allows players to make moves directly without navigating to full match view
 */

import { useState, useEffect, useCallback } from 'react';
import { parseChessMatch } from '../../utils/matchDataParser';
import { Loader2 } from 'lucide-react';

// Chess piece Unicode symbols
const PIECE_SYMBOLS = {
  white: {
    pawn: '♙',
    knight: '♘',
    bishop: '♗',
    rook: '♖',
    queen: '♕',
    king: '♔'
  },
  black: {
    pawn: '♟',
    knight: '♞',
    bishop: '♝',
    rook: '♜',
    queen: '♛',
    king: '♚'
  }
};

const PIECE_TYPES = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

const MiniChessBoard = ({
  contract,
  account,
  match,
  onMoveComplete,
  onError,
  refreshTrigger,
}) => {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [makingMove, setMakingMove] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);

  // Extract fetch logic into reusable function
  const fetchMatchData = useCallback(async (isInitialLoad = false) => {
    if (!contract) return;

    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const data = await contract.getMatch(
        match.tierId,
        match.instanceId,
        match.roundIdx,
        match.matchIdx
      );

      const parsed = parseChessMatch(data);
      // Compute isPlayer1 by comparing account to player1
      parsed.isPlayer1 = parsed.player1?.toLowerCase() === account?.toLowerCase();
      setMatchData(parsed);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching match data:', err);
      setError('Failed to load board');
      setLoading(false);
    }
  }, [contract, account, match.tierId, match.instanceId, match.roundIdx, match.matchIdx]);

  // Fetch match data on mount
  useEffect(() => {
    fetchMatchData(true);
  }, [fetchMatchData]);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatchData(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchMatchData]);

  // Refresh when manual sync button is clicked
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchMatchData(false);
    }
  }, [refreshTrigger, fetchMatchData]);

  // Get piece symbol helper
  const getPieceSymbol = (piece) => {
    if (!piece || piece.pieceType === 0) return '';
    const color = piece.color === 1 ? 'white' : 'black';
    const pieceType = PIECE_TYPES[piece.pieceType];
    return PIECE_SYMBOLS[color]?.[pieceType] || '';
  };

  // Handle square click (two-click system)
  const handleSquareClick = async (squareIndex) => {
    if (!matchData || !contract || !account) return;

    // Validation
    if (!match.isMyTurn) {
      setError("It's not your turn!");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (matchData.matchStatus === 2) {
      setError('Match is already complete!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const piece = matchData.board[squareIndex];

    if (selectedSquare === null) {
      // First click: Select piece
      if (piece && piece.pieceType !== 0) {
        const isMyPiece = (piece.color === 1 && matchData.isPlayer1) ||
                         (piece.color === 2 && !matchData.isPlayer1);
        if (isMyPiece) {
          setSelectedSquare(squareIndex);
        } else {
          setError("That's not your piece!");
          setTimeout(() => setError(null), 3000);
        }
      }
    } else {
      // Second click: Move piece
      await handleMove(selectedSquare, squareIndex);
      setSelectedSquare(null);
    }
  };

  // Make move
  const handleMove = async (from, to) => {
    try {
      setMakingMove(true);
      setError(null);

      const tx = await contract.makeMove(
        match.tierId,
        match.instanceId,
        match.roundIdx,
        match.matchIdx,
        from,
        to,
        0  // promotion (0=none, could add promotion dialog later)
      );

      await tx.wait();

      // Refresh match data
      const updatedData = await contract.getMatch(
        match.tierId,
        match.instanceId,
        match.roundIdx,
        match.matchIdx
      );

      const parsed = parseChessMatch(updatedData);
      // Compute isPlayer1 by comparing account to player1
      parsed.isPlayer1 = parsed.player1?.toLowerCase() === account?.toLowerCase();
      setMatchData(parsed);

      // Notify parent
      onMoveComplete?.();
      setMakingMove(false);
    } catch (err) {
      console.error('Error making move:', err);
      setError(err.message || 'Failed to make move');
      onError?.(err);
      setMakingMove(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-2">
        <Loader2 className="animate-spin text-purple-400" size={24} />
        <p className="text-slate-400 text-xs">Loading board...</p>
      </div>
    );
  }

  // Error state (no match data)
  if (!matchData) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 text-sm">Failed to load board</p>
      </div>
    );
  }

  // Determine player color
  const isPlayer1 = matchData.isPlayer1;
  const playerColor = isPlayer1 ? 'White' : 'Black';
  const colorClass = isPlayer1 ? 'text-slate-200' : 'text-slate-400';

  return (
    <div className="space-y-3">
      {/* Board Header */}
      <div className="text-center space-y-1">
        <p className="text-slate-400 text-[10px]">
          You are playing as <span className={`${colorClass} font-bold text-sm`}>{playerColor}</span>
        </p>
        <p className="text-slate-300 text-xs">
          {match.isMyTurn ? (
            <span className="text-yellow-300 font-bold">Your turn to move</span>
          ) : (
            <span className="text-slate-400">Waiting for opponent...</span>
          )}
        </p>
        {selectedSquare !== null && (
          <p className="text-blue-300 text-xs">
            Click destination square to complete move
          </p>
        )}
      </div>

      {/* 8x8 Chess Grid */}
      <div className="grid grid-cols-8 gap-0.5 p-3 bg-black/20 rounded-lg">
        {matchData.board.map((piece, idx) => {
          const row = Math.floor(idx / 8);
          const col = idx % 8;
          const isLight = (row + col) % 2 === 1;
          const isSelected = selectedSquare === idx;

          return (
            <button
              key={idx}
              onClick={() => handleSquareClick(idx)}
              disabled={!match.isMyTurn || makingMove || matchData.matchStatus === 2}
              className={`
                aspect-square flex items-center justify-center text-xl md:text-2xl font-bold transition-all
                ${isLight ? 'bg-slate-300' : 'bg-slate-700'}
                ${isSelected ? 'ring-2 ring-yellow-400 ring-inset' : ''}
                ${!match.isMyTurn || makingMove || matchData.matchStatus === 2 ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
              `}
            >
              {makingMove && isSelected ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                getPieceSymbol(piece)
              )}
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-center">
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {/* Match Status */}
      {matchData.matchStatus === 2 && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 text-center">
          <p className="text-green-300 text-xs font-bold">
            {matchData.isDraw ? 'Match ended in a draw!' : `Winner: ${matchData.winner === account ? 'You!' : 'Opponent'}`}
          </p>
        </div>
      )}

      {/* Helper Text */}
      <div className="text-center">
        <p className="text-slate-500 text-[10px]">
          Click a piece to select, then click destination
        </p>
      </div>
    </div>
  );
};

export default MiniChessBoard;
