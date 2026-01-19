/**
 * MiniChessBoard Component
 *
 * Compact, interactive Chess board for the Player Activity panel
 * Allows players to make moves directly without navigating to full match view
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseChessMatch } from '../../utils/matchDataParser';
import { reconstructMatchFromEvents } from '../../utils/eventReconstruction';
import { Loader2 } from 'lucide-react';
import MiniMatchEndModal from './MiniMatchEndModal';
import { ethers } from 'ethers';

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
  const [lastMove, setLastMove] = useState(null); // { from, to, isMyMove } for highlighting
  const previousBoardRef = useRef(null);

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

  // Helper to flip board index (so player is always at bottom with dark square on left)
  // White view: flip vertically - a1 at bottom-left (dark), h1 at bottom-right (light)
  // Black view: flip horizontally - h8 at bottom-left (dark), a8 at bottom-right (light)
  const getDisplayIndex = (actualIndex) => {
    if (!matchData) return actualIndex;
    const actualRow = Math.floor(actualIndex / 8);
    const actualCol = actualIndex % 8;

    if (matchData.isWhite) {
      // White: flip rows (vertical flip)
      return (7 - actualRow) * 8 + actualCol;
    } else {
      // Black: flip columns (horizontal flip)
      return actualRow * 8 + (7 - actualCol);
    }
  };

  const getActualIndex = (displayIndex) => {
    if (!matchData) return displayIndex;
    const displayRow = Math.floor(displayIndex / 8);
    const displayCol = displayIndex % 8;

    if (matchData.isWhite) {
      // White: flip rows (vertical flip)
      return (7 - displayRow) * 8 + displayCol;
    } else {
      // Black: flip columns (horizontal flip)
      return displayRow * 8 + (7 - displayCol);
    }
  };

  // Fetch last move from contract events (persists after page refresh)
  const fetchLastMoveFromEvents = useCallback(async () => {
    if (!contract) return null;

    try {
      const matchKey = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [match.tierId, match.instanceId, match.roundIdx, match.matchIdx]
        )
      );

      const filter = contract.filters.MoveMade(matchKey);
      const events = await contract.queryFilter(filter);

      if (events.length > 0) {
        // Get the most recent event (last move)
        const lastEvent = events[events.length - 1];
        return {
          from: Number(lastEvent.args.from),
          to: Number(lastEvent.args.to),
          player: lastEvent.args.player
        };
      }
    } catch (err) {
      console.debug('Could not fetch move events:', err.message);
    }
    return null;
  }, [contract, match.tierId, match.instanceId, match.roundIdx, match.matchIdx]);

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

      let parsed = parseChessMatch(data);

      // If match is completed, reconstruct board from events instead of cache
      if (parsed.matchStatus === 2) {
        try {
          const reconstructed = await reconstructMatchFromEvents(
            contract,
            match.tierId,
            match.instanceId,
            match.roundIdx,
            match.matchIdx,
            parsed.player1,
            parsed.player2,
            'chess'
          );

          // Use reconstructed board if available
          if (reconstructed && reconstructed.board) {
            parsed = {
              ...parsed,
              board: reconstructed.board.boardArray || reconstructed.board,
              winner: reconstructed.winner || parsed.winner,
              isDraw: reconstructed.isDraw ?? parsed.isDraw,
              moveHistory: reconstructed.board.moveHistory || parsed.moveHistory
            };
            console.log('[MiniChessBoard] Using reconstructed board from events');
          }
        } catch (err) {
          console.warn('[MiniChessBoard] Event reconstruction failed, using cached data:', err);
          // Fall back to cached data from getMatch
        }
      }
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

      // On initial load, fetch last move from events (persists after page refresh)
      // On subsequent polls, detect moves by comparing board states (faster)
      if (isInitialLoad) {
        const eventLastMove = await fetchLastMoveFromEvents();
        if (eventLastMove) {
          const isMyMove = eventLastMove.player?.toLowerCase() === account?.toLowerCase();
          setLastMove({ from: eventLastMove.from, to: eventLastMove.to, isMyMove });
        }
      } else if (previousBoardRef.current && parsed.board) {
        // Detect opponent's move by comparing board states
        const prevBoard = previousBoardRef.current;
        const newBoard = parsed.board;

        // Find the square that became empty (from) and the square that gained a piece (to)
        let fromSquare = null;
        let toSquare = null;

        for (let i = 0; i < 64; i++) {
          const prevPiece = prevBoard[i]?.pieceType || 0;
          const newPiece = newBoard[i]?.pieceType || 0;

          // Square that had a piece but now empty (or different piece due to capture)
          if (prevPiece !== 0 && newPiece === 0) {
            fromSquare = i;
          }
          // Square that was empty (or had different piece) but now has piece that moved
          if (prevPiece === 0 && newPiece !== 0) {
            toSquare = i;
          }
          // Handle captures: square had one piece, now has different piece
          if (prevPiece !== 0 && newPiece !== 0 &&
              (prevBoard[i]?.color !== newBoard[i]?.color || prevPiece !== newPiece)) {
            // This could be a capture destination
            toSquare = i;
          }
        }

        // If we detected a move, it's opponent's move (we clear lastMove after our own moves)
        if (fromSquare !== null && toSquare !== null) {
          setLastMove({ from: fromSquare, to: toSquare, isMyMove: false });
        }
      }

      // Update the previous board ref
      previousBoardRef.current = parsed.board;

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
  }, [contract, account, match.tierId, match.instanceId, match.roundIdx, match.matchIdx, fetchLastMoveFromEvents]);

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
        // White pieces have color=1, black pieces have color=2
        const isMyPiece = (piece.color === 1 && matchData.isWhite) ||
                         (piece.color === 2 && !matchData.isWhite);
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

      // Show my move highlighting (purple->blue)
      setLastMove({ from, to, isMyMove: true });
      // Update board ref to prevent false move detection
      previousBoardRef.current = parsed.board;

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
          const isLastMoveFrom = lastMove && lastMove.from === actualIdx;
          const isLastMoveTo = lastMove && lastMove.to === actualIdx;
          const pieceColor = piece?.color ? Number(piece.color) : 0;
          const pieceColorClass = pieceColor === 1 ? 'text-white' : 'text-black drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]';
          const pieceStyle = pieceColor === 1
            ? { textShadow: '0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)' }
            : {};

          // Determine background and ring colors based on move ownership
          // My move: purple (from) -> blue (to)
          // Opponent move: yellow (from) -> red (to)
          const isMyMove = lastMove?.isMyMove;
          const getBgClass = () => {
            if (isLastMoveTo) return isMyMove ? 'bg-blue-500/60' : 'bg-red-500/60';
            if (isLastMoveFrom) return isMyMove ? 'bg-purple-500/60' : 'bg-yellow-500/60';
            return isLight ? 'bg-stone-300' : 'bg-stone-700';
          };
          const getRingClass = () => {
            if (isSelected) return 'ring-2 ring-green-400 ring-inset';
            if (isLastMoveTo) return isMyMove ? 'ring-2 ring-blue-400 ring-inset' : 'ring-2 ring-red-400 ring-inset';
            if (isLastMoveFrom) return isMyMove ? 'ring-2 ring-purple-400 ring-inset' : 'ring-2 ring-yellow-400 ring-inset';
            return '';
          };

          return (
            <button
              key={displayIdx}
              onClick={() => handleSquareClick(displayIdx)}
              disabled={!matchData.isMyTurn || makingMove || matchData.matchStatus === 2}
              className={`
                aspect-square flex items-center justify-center text-[1.375rem] md:text-[1.65rem] font-bold transition-all
                ${getBgClass()}
                ${getRingClass()}
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
