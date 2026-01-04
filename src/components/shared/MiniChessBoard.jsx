/**
 * MiniChessBoard Component
 *
 * Compact, interactive Chess board for the Player Activity panel
 * Allows players to make moves directly without navigating to full match view
 */

import { useState, useEffect, useCallback } from 'react';
import { parseChessMatch } from '../../utils/matchDataParser';
import { Loader2 } from 'lucide-react';
import MiniMatchEndModal from './MiniMatchEndModal';

// Chess piece Unicode symbols
// Use filled pieces for both colors, style them with CSS
const PIECE_SYMBOLS = {
  white: {
    pawn: '♟',    // Filled, styled light
    knight: '♞',
    bishop: '♝',
    rook: '♜',
    queen: '♛',
    king: '♚'
  },
  black: {
    pawn: '♟',    // Filled, styled dark
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
  onMatchCompleted,
  onMatchDismissed,
  onError,
  refreshTrigger,
}) => {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [makingMove, setMakingMove] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [showMatchEndModal, setShowMatchEndModal] = useState(false);
  const [matchEndResult, setMatchEndResult] = useState(null);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  // Helper to extract user-friendly error message
  const getUserFriendlyError = (err) => {
    if (err.reason) return err.reason;
    if (err.message) {
      // Extract contract revert message if present
      const match = err.message.match(/reason="([^"]+)"/);
      if (match) return match[1];
      // Fallback to simpler message
      if (err.message.includes('user rejected')) return 'Transaction cancelled';
      return 'Invalid move';
    }
    return 'Failed to make move';
  };

  // Helper to flip board index (so player is always at bottom)
  // Contract board has indices 0-7 = rank 1 (white's back rank) at TOP of rendered grid
  // We need to flip it so white player sees their pieces at bottom
  const getDisplayIndex = (actualIndex) => {
    if (!matchData) return actualIndex;
    const shouldFlip = matchData.isWhite; // Flip if player is white so white pieces are at bottom
    if (shouldFlip) {
      return 63 - actualIndex;
    }
    return actualIndex;
  };

  const getActualIndex = (displayIndex) => {
    if (!matchData) return displayIndex;
    const shouldFlip = matchData.isWhite; // Flip if player is white so white pieces are at bottom
    if (shouldFlip) {
      return 63 - displayIndex;
    }
    return displayIndex;
  };

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

      console.log('[MiniChessBoard] Raw data from getMatch:', {
        firstPlayer: data.firstPlayer,
        player1: data.common?.player1,
        player2: data.common?.player2,
        currentTurn: data.currentTurn,
        board: data.board ? `${data.board.length} pieces` : 'missing',
        boardSample: data.board ? [data.board[0], data.board[1], data.board[2]] : 'no board',
        hasCommonField: !!data.common,
        allKeys: Object.keys(data)
      });

      const parsed = parseChessMatch(data);
      console.log('[MiniChessBoard] Parsed data:', {
        firstPlayer: parsed.firstPlayer,
        player1: parsed.player1,
        player2: parsed.player2,
        currentTurn: parsed.currentTurn,
        board: parsed.board ? `${parsed.board.length} squares` : 'missing',
        boardSample: parsed.board ? [parsed.board[0], parsed.board[1], parsed.board[2]] : 'no board',
        isWhite: parsed.isWhite,
        matchStatus: parsed.matchStatus
      });
      // Compute isPlayer1 by comparing account to player1
      parsed.isPlayer1 = parsed.player1?.toLowerCase() === account?.toLowerCase();
      // Calculate isMyTurn based on current turn
      parsed.isMyTurn = parsed.currentTurn?.toLowerCase() === account?.toLowerCase();
      // Calculate isWhite using firstPlayer (fallback to player1 if not set)
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const whitePlayer = (parsed.firstPlayer && parsed.firstPlayer.toLowerCase() !== zeroAddress) ? parsed.firstPlayer : parsed.player1;
      parsed.isWhite = account && whitePlayer?.toLowerCase() === account?.toLowerCase();

      // Detect match end and show modal
      if (parsed.matchStatus === 2 && !showMatchEndModal) {
        // Determine result
        let result = null;
        if (parsed.isDraw) {
          result = 'draw';
        } else if (parsed.winner?.toLowerCase() === account?.toLowerCase()) {
          // Check if forfeit win
          result = parsed.isForfeit ? 'forfeit_win' : 'win';
        } else {
          // Check if forfeit lose
          result = parsed.isForfeit ? 'forfeit_lose' : 'lose';
        }
        setMatchEndResult(result);
        setShowMatchEndModal(true);

        // Notify parent that match completed so it stays visible (only once)
        if (!hasNotifiedCompletion) {
          onMatchCompleted?.();
          setHasNotifiedCompletion(true);
        }
      }

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
  const handleSquareClick = async (displayIndex) => {
    if (!matchData || !contract || !account) return;

    // Validation
    if (!matchData.isMyTurn) {
      setError("It's not your turn!");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (matchData.matchStatus === 2) {
      setError('Match is already complete!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const actualIndex = getActualIndex(displayIndex);
    const piece = matchData.board[actualIndex];

    if (selectedSquare === null) {
      // First click: Select piece
      if (piece && piece.pieceType !== 0) {
        const isMyPiece = (piece.color === 1 && matchData.isPlayer1) ||
                         (piece.color === 2 && !matchData.isPlayer1);
        if (isMyPiece) {
          setSelectedSquare(displayIndex);
        } else {
          setError("That's not your piece!");
          setTimeout(() => setError(null), 3000);
        }
      }
    } else {
      // Second click: Move piece
      const fromActual = getActualIndex(selectedSquare);
      const toActual = getActualIndex(displayIndex);
      await handleMove(fromActual, toActual);
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
      // Calculate isMyTurn based on current turn
      parsed.isMyTurn = parsed.currentTurn?.toLowerCase() === account?.toLowerCase();
      setMatchData(parsed);

      // Check if this move completed the match
      if (parsed.matchStatus === 2 && !hasNotifiedCompletion) {
        // Notify parent that match completed so it stays visible
        onMatchCompleted?.();
        setHasNotifiedCompletion(true);
      }

      // Notify parent
      onMoveComplete?.();
      setMakingMove(false);
    } catch (err) {
      console.error('Error making move:', err);
      const friendlyError = getUserFriendlyError(err);
      setError(friendlyError);
      setTimeout(() => setError(null), 3000);
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
  const playerColor = matchData.isWhite ? 'White' : 'Black';
  const colorClass = matchData.isWhite ? 'text-slate-200' : 'text-slate-400';

  return (
    <div className="space-y-3">
      {/* Mini Match End Modal - Above Board */}
      {showMatchEndModal && matchEndResult && matchData.matchStatus === 2 && (
        <MiniMatchEndModal
          result={matchEndResult}
          onClose={() => {
            const isDefeat = matchEndResult === 'lose' || matchEndResult === 'forfeit_lose';
            // Hide modal
            setShowMatchEndModal(false);
            // Notify parent that match was dismissed
            onMatchDismissed?.();
            // For victory/draw, also trigger refresh
            if (!isDefeat) {
              onMoveComplete?.();
            }
          }}
          winnerAddress={matchData.winner}
          loserAddress={matchData.isDraw ? null : (matchData.winner?.toLowerCase() === matchData.player1?.toLowerCase() ? matchData.player2 : matchData.player1)}
          currentAccount={account}
          gameType="chess"
          roundNumber={match.roundNumber}
          totalRounds={match.totalRounds}
          prizePool={match.prizePool}
        />
      )}

      {/* Board Header */}
      <div className="text-center space-y-1">
        <p className="text-slate-400 text-[10px]">
          You are playing as <span className={`${colorClass} font-bold text-sm`}>{playerColor}</span>
        </p>
        <p className="text-slate-300 text-xs">
          {matchData.isMyTurn ? (
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
        {Array.from({ length: 64 }).map((_, displayIdx) => {
          const actualIdx = getActualIndex(displayIdx);
          const piece = matchData.board[actualIdx];
          const row = Math.floor(actualIdx / 8);
          const col = actualIdx % 8;
          const isLight = (row + col) % 2 === 1;
          const isSelected = selectedSquare === displayIdx;
          const pieceColor = piece?.color ? Number(piece.color) : 0;
          const pieceColorClass = pieceColor === 1 ? 'text-white' : 'text-black drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]';
          const pieceStyle = pieceColor === 1
            ? { textShadow: '0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)' }
            : {};

          return (
            <button
              key={displayIdx}
              onClick={() => handleSquareClick(displayIdx)}
              disabled={!matchData.isMyTurn || makingMove || matchData.matchStatus === 2}
              className={`
                aspect-square flex items-center justify-center text-xl md:text-2xl font-bold transition-all
                ${isLight ? 'bg-stone-300' : 'bg-stone-700'}
                ${isSelected ? 'ring-2 ring-yellow-400 ring-inset' : ''}
                ${!matchData.isMyTurn || makingMove || matchData.matchStatus === 2 ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
                ${pieceColorClass}
              `}
            >
              {makingMove && isSelected ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <span style={pieceStyle}>{getPieceSymbol(piece)}</span>
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

      {/* Helper Text - only show when match is not ended */}
      {matchData.matchStatus !== 2 && (
        <div className="text-center">
          <p className="text-slate-500 text-[10px]">
            Click a piece to select, then click destination
          </p>
        </div>
      )}
    </div>
  );
};

export default MiniChessBoard;
