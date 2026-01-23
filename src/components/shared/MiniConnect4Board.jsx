/**
 * MiniConnect4Board Component
 *
 * Compact, interactive Connect Four board for the Player Activity panel
 * Allows players to make moves directly without navigating to full match view
 */

import { useState, useEffect, useCallback } from 'react';
import { parseConnectFourMatch } from '../../utils/matchDataParser';
import { reconstructMatchFromEvents } from '../../utils/eventReconstruction';
import { Loader2 } from 'lucide-react';
import MiniMatchEndModal from './MiniMatchEndModal';

const MiniConnect4Board = ({
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
  const [showMatchEndModal, setShowMatchEndModal] = useState(false);
  const [matchEndResult, setMatchEndResult] = useState(null);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  // Convert flat board to 2D grid
  const boardToGrid = (flatBoard) => {
    const grid = Array(6).fill(null).map(() => Array(7).fill(0));
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const idx = row * 7 + col;
        grid[row][col] = Number(flatBoard[idx]);
      }
    }
    return grid;
  };

  // Check if column is full
  const isColumnFull = (grid, col) => {
    return grid[0][col] !== 0;
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

      let parsed = parseConnectFourMatch(data);
      let alreadyReconstructed = false; // Flag to prevent double reconstruction

      // Check if contract returned invalid/cleared data (happens when tournament resets after finals)
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const isMatchInitialized =
        parsed.player1?.toLowerCase() !== zeroAddress.toLowerCase() &&
        parsed.player2?.toLowerCase() !== zeroAddress.toLowerCase();
      const isBoardEmpty = parsed.board?.every(cell => cell === 0);

      // If contract returns cleared data (zero addresses + empty board), query MatchCompleted event
      if (!isMatchInitialized && isBoardEmpty) {
        console.log('[MiniConnect4Board] Match data cleared, querying MatchCompleted event');

        try {
          const { ethers } = await import('ethers');
          const matchId = ethers.solidityPackedKeccak256(
            ['uint8', 'uint8', 'uint8', 'uint8'],
            [match.tierId, match.instanceId, match.roundIdx, match.matchIdx]
          );

          // Query MatchCompleted events
          const filter = contract.filters.MatchCompleted(matchId);
          const events = await contract.queryFilter(filter, -10000); // Last 10k blocks

          if (events.length > 0) {
            // Use the most recent event
            const event = events[events.length - 1];
            const [eventMatchId, eventPlayer1, eventPlayer2, eventWinner, eventIsDraw, eventReason, eventPackedBoard] = event.args;

            console.log('[MiniConnect4Board] MatchCompleted event data:', {
              eventMatchId,
              eventPlayer1,
              eventPlayer2,
              eventWinner,
              eventIsDraw,
              eventReason: Number(eventReason),
              eventPackedBoard: eventPackedBoard.toString()
            });

            // Unpack board from event (Connect4: 42 cells, 2 bits per cell)
            const unpackBoard = (packed) => {
              const boardArray = [];
              let p = BigInt(packed);
              for (let i = 0; i < 42; i++) {
                boardArray.push(Number(p & 3n));
                p = p >> 2n;
              }
              return boardArray;
            };
            const eventBoard = unpackBoard(eventPackedBoard);
            console.log('[MiniConnect4Board] Unpacked board from event:', eventBoard.filter(c => c !== 0).length, 'pieces');

            const eventLoser = eventIsDraw ? zeroAddress : (
              eventWinner.toLowerCase() === eventPlayer1.toLowerCase() ? eventPlayer2 : eventPlayer1
            );

            // Reconstruct match data from event
            parsed = {
              ...parsed,
              player1: eventPlayer1,
              player2: eventPlayer2,
              matchStatus: 2,
              winner: eventWinner,
              loser: eventLoser,
              isDraw: eventIsDraw,
              board: eventBoard,
              isForfeit: Number(eventReason) === 2, // Reason 2 = forfeit
              completionReason: Number(eventReason), // Store full reason code
            };

            alreadyReconstructed = true; // Mark as reconstructed to skip second reconstruction
            console.log('[MiniConnect4Board] Reconstructed match from MatchCompleted event:', eventBoard.filter(c => c !== 0).length, 'pieces');
          } else {
            // No event found - if we have existing matchData, preserve it
            if (matchData) {
              console.log('[MiniConnect4Board] No event found but have existing data, preserving state');
              return; // Don't update, keep existing state
            }
            // Otherwise, use the cleared data (initial load)
          }
        } catch (err) {
          console.warn('[MiniConnect4Board] Failed to query MatchCompleted event:', err);
          // If we have existing matchData, preserve it
          if (matchData) {
            console.log('[MiniConnect4Board] Preserving existing state due to event query error');
            return; // Don't update, keep existing state
          }
        }
      }

      // If match is completed, reconstruct board from events (only if not already reconstructed above)
      if (parsed.matchStatus === 2 && !alreadyReconstructed) {
        try {
          const reconstructed = await reconstructMatchFromEvents(
            contract,
            match.tierId,
            match.instanceId,
            match.roundIdx,
            match.matchIdx,
            parsed.player1,
            parsed.player2,
            'connect4'
          );

          // Use reconstructed board if available
          if (reconstructed && reconstructed.board) {
            parsed = {
              ...parsed,
              board: reconstructed.board,
              winner: reconstructed.winner || parsed.winner,
              isDraw: reconstructed.isDraw ?? parsed.isDraw
            };
            console.log('[MiniConnect4Board] Using reconstructed board from events');
          }
        } catch (err) {
          console.warn('[MiniConnect4Board] Event reconstruction failed, using cached data:', err);
          // Fall back to cached data from getMatch
        }
      }
      // Compute isPlayer1 by comparing account to player1
      parsed.isPlayer1 = parsed.player1?.toLowerCase() === account?.toLowerCase();
      // Calculate isMyTurn based on current turn
      parsed.isMyTurn = parsed.currentTurn?.toLowerCase() === account?.toLowerCase();

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

  // Refresh when manual sync button is clicked
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchMatchData(false);
    }
  }, [refreshTrigger, fetchMatchData]);

  // Listen for MatchCompleted events to show modal
  useEffect(() => {
    if (!contract || !account || !match || !matchData) return;

    const handleMatchCompleted = async (eventMatchId, player1, player2, winner, isDraw, reason, packedBoard, event) => {
      try {
        // Calculate match ID for this mini board's match
        const { ethers } = await import('ethers');
        const matchId = ethers.solidityPackedKeccak256(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [match.tierId, match.instanceId, match.roundIdx, match.matchIdx]
        );

        // Filter: Only process events for this specific match
        if (eventMatchId !== matchId) {
          return;
        }

        console.log('[MiniConnect4Board] MatchCompleted event received for this match');

        // Determine result with completion reason
        let result = null;
        const completionReason = Number(reason);

        if (isDraw) {
          result = 'draw';
        } else if (winner?.toLowerCase() === account?.toLowerCase()) {
          // Check if forfeit/intervention win
          result = (completionReason === 1 || completionReason === 3 || completionReason === 4) ? 'forfeit_win' : 'win';
        } else {
          // Check if forfeit/intervention lose
          result = (completionReason === 1 || completionReason === 3 || completionReason === 4) ? 'forfeit_lose' : 'lose';
        }

        // Store result with completion reason and show modal
        setMatchEndResult({ result, completionReason });
        setShowMatchEndModal(true);

        // Notify parent that match completed so it stays visible (only once)
        if (!hasNotifiedCompletion) {
          onMatchCompleted?.();
          setHasNotifiedCompletion(true);
        }

        console.log('[MiniConnect4Board] Modal triggered by MatchCompleted event:', result);
      } catch (err) {
        console.error('[MiniConnect4Board] Error processing MatchCompleted event:', err);
      }
    };

    // Register event listener
    contract.on('MatchCompleted', handleMatchCompleted);

    // Query recent events to catch any missed while component was loading
    const checkRecentEvents = async () => {
      try {
        const { ethers } = await import('ethers');
        const matchId = ethers.solidityPackedKeccak256(
          ['uint8', 'uint8', 'uint8', 'uint8'],
          [match.tierId, match.instanceId, match.roundIdx, match.matchIdx]
        );

        const filter = contract.filters.MatchCompleted(matchId);
        const events = await contract.queryFilter(filter, -100); // Last 100 blocks

        if (events.length > 0 && !showMatchEndModal) {
          const event = events[events.length - 1];
          const { player1, player2, winner, isDraw, reason, board } = event.args;
          handleMatchCompleted(matchId, player1, player2, winner, isDraw, reason, board, event);
        }
      } catch (err) {
        console.error('[MiniConnect4Board] Error checking recent events:', err);
      }
    };

    checkRecentEvents();

    return () => {
      contract.off('MatchCompleted', handleMatchCompleted);
    };
  }, [contract, account, match, matchData, showMatchEndModal, hasNotifiedCompletion, onMatchCompleted]);

  // Handle column click
  const handleColumnClick = async (columnIndex) => {
    if (!matchData || !contract || !account) return;

    const grid = boardToGrid(matchData.board);

    // Validation
    if (!matchData.isMyTurn) {
      setError("It's not your turn!");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (isColumnFull(grid, columnIndex)) {
      setError('Column is full!');
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
        columnIndex  // Just the column index (0-6)
      );

      await tx.wait();

      // Refresh match data
      const updatedData = await contract.getMatch(
        match.tierId,
        match.instanceId,
        match.roundIdx,
        match.matchIdx
      );

      const parsed = parseConnectFourMatch(updatedData);
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
  const playerColor = isPlayer1 ? 'Red' : 'Blue';
  const colorClass = isPlayer1 ? 'text-red-400' : 'text-blue-400';

  const grid = boardToGrid(matchData.board);

  return (
    <div className="space-y-3">
      {/* Mini Match End Modal - Above Board */}
      {showMatchEndModal && matchEndResult && matchData.matchStatus === 2 && (
        <MiniMatchEndModal
          result={matchEndResult.result}
          completionReason={matchEndResult.completionReason}
          onClose={() => {
            const isDefeat = matchEndResult.result === 'lose' || matchEndResult.result === 'forfeit_lose';
            // Hide modal only - keep match card visible with final board state
            setShowMatchEndModal(false);
            // For victory/draw, trigger refresh to update activity panel
            if (!isDefeat) {
              onMoveComplete?.();
            }
          }}
          winnerAddress={matchData.winner}
          loserAddress={matchData.isDraw ? null : (matchData.winner?.toLowerCase() === matchData.player1?.toLowerCase() ? matchData.player2 : matchData.player1)}
          currentAccount={account}
          gameType="connectfour"
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
      </div>

      {/* Connect Four Board */}
      <div className="p-3 bg-slate-900/30 rounded-lg">
        {/* Column click zones */}
        <div className="flex gap-1 mb-2">
          {[0, 1, 2, 3, 4, 5, 6].map(col => (
            <button
              key={col}
              onClick={() => handleColumnClick(col)}
              disabled={!matchData.isMyTurn || makingMove || isColumnFull(grid, col) || matchData.matchStatus === 2}
              className="flex-1 h-8 bg-slate-700 hover:bg-slate-600 rounded-t transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold"
            >
              {makingMove ? <Loader2 className="animate-spin mx-auto" size={16} /> : '↓'}
            </button>
          ))}
        </div>

        {/* Board grid */}
        <div className="space-y-1">
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((cell, colIdx) => (
                <div
                  key={colIdx}
                  className="aspect-square bg-slate-700 rounded-full flex items-center justify-center w-full"
                >
                  {cell !== 0 && (
                    <div
                      className="rounded-full w-[85%] h-[85%]"
                      style={{
                        background: cell === 1
                          ? 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)'  // Red
                          : 'radial-gradient(circle at 30% 30%, #60a5fa, #2563eb)',  // Blue
                        boxShadow: cell === 1
                          ? '0 0 10px rgba(255,107,107,0.5)'
                          : '0 0 10px rgba(96,165,250,0.5)'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Column labels */}
        <div className="flex gap-1 mt-2">
          {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((label, idx) => (
            <div key={idx} className="flex-1 text-center text-xs text-slate-400 font-bold">{label}</div>
          ))}
        </div>
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
            Click a column to drop your disc
          </p>
        </div>
      )}
    </div>
  );
};

export default MiniConnect4Board;
