/**
 * MiniTicTacToeBoard Component
 *
 * Compact, interactive Tic-Tac-Toe board for the Player Activity panel
 * Allows players to make moves directly without navigating to full match view
 */

import { useState, useEffect, useCallback } from 'react';
import { parseTicTacToeMatch } from '../../utils/matchDataParser';
import { Loader2 } from 'lucide-react';
import MiniMatchEndModal from './MiniMatchEndModal';

const MiniTicTacToeBoard = ({
  contract,
  account,
  match,
  onMoveComplete,
  onMatchDismissed,
  onError,
  refreshTrigger, // New prop: changes when manual refresh is triggered
}) => {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [makingMove, setMakingMove] = useState(false);
  const [error, setError] = useState(null);
  const [showMatchEndModal, setShowMatchEndModal] = useState(false);
  const [matchEndResult, setMatchEndResult] = useState(null);

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

      const parsed = parseTicTacToeMatch(data);
      // Compute isPlayer1 by comparing account to player1
      parsed.isPlayer1 = parsed.player1?.toLowerCase() === account?.toLowerCase();
      // Calculate isMyTurn based on current turn
      parsed.isMyTurn = parsed.currentTurn?.toLowerCase() === account?.toLowerCase();

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

  // Handle cell click
  const handleCellClick = async (cellIndex) => {
    if (!matchData || !contract || !account) return;

    // Validation
    if (!matchData.isMyTurn) {
      setError("It's not your turn!");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (matchData.board[cellIndex] !== 0) {
      setError('Cell already taken!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (matchData.matchStatus === 2) {
      setError('Match is already complete!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setMakingMove(true);
      setError(null);

      const tx = await contract.makeMove(
        match.tierId,
        match.instanceId,
        match.roundIdx,
        match.matchIdx,
        cellIndex
      );

      await tx.wait();

      // Refresh match data
      const updatedData = await contract.getMatch(
        match.tierId,
        match.instanceId,
        match.roundIdx,
        match.matchIdx
      );

      const parsed = parseTicTacToeMatch(updatedData);
      // Compute isPlayer1 by comparing account to player1
      parsed.isPlayer1 = parsed.player1?.toLowerCase() === account?.toLowerCase();
      // Calculate isMyTurn based on current turn
      parsed.isMyTurn = parsed.currentTurn?.toLowerCase() === account?.toLowerCase();
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

  // Get cell styling based on value
  const getCellStyle = (cell) => {
    if (cell === 0) {
      return 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200';
    } else if (cell === 1) {
      return 'bg-blue-500/40 text-blue-200';
    } else {
      return 'bg-pink-500/40 text-pink-200';
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

  // Determine player symbol
  const isPlayer1 = matchData.isPlayer1;
  const playerSymbol = isPlayer1 ? 'X' : 'O';
  const symbolColor = isPlayer1 ? 'text-blue-300' : 'text-pink-300';

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
          gameType="tictactoe"
          roundNumber={match.roundNumber}
          totalRounds={match.totalRounds}
          prizePool={match.prizePool}
        />
      )}

      {/* Board Header */}
      <div className="text-center space-y-1">
        <p className="text-slate-400 text-[10px]">
          You are playing as <span className={`${symbolColor} font-bold text-sm`}>{playerSymbol}</span>
        </p>
        <p className="text-slate-300 text-xs">
          {matchData.isMyTurn ? (
            <span className="text-yellow-300 font-bold">Your turn to move</span>
          ) : (
            <span className="text-slate-400">Waiting for opponent...</span>
          )}
        </p>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-black/20 rounded-lg">
        {matchData.board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleCellClick(idx)}
            disabled={!matchData.isMyTurn || makingMove || cell !== 0 || matchData.matchStatus === 2}
            className={`
              aspect-square rounded-lg flex items-center justify-center
              text-2xl md:text-3xl font-bold transition-all transform
              hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100
              ${getCellStyle(cell)}
            `}
          >
            {makingMove ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              cell === 1 ? 'X' : cell === 2 ? 'O' : ''
            )}
          </button>
        ))}
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
            Click an empty cell to make your move
          </p>
        </div>
      )}
    </div>
  );
};

export default MiniTicTacToeBoard;
