/**
 * MiniTicTacToeBoard Component
 *
 * Compact, interactive Tic-Tac-Toe board for the Player Activity panel
 * Allows players to make moves directly without navigating to full match view
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseTicTacToeMatch } from '../../utils/matchDataParser';
import { reconstructMatchFromEvents } from '../../utils/eventReconstruction';
import { Loader2, Clock } from 'lucide-react';
import MiniMatchEndModal from './MiniMatchEndModal';
import { formatTime, getTimeColorScheme } from '../../utils/timeCalculations';

const MiniTicTacToeBoard = ({
  contract,
  account,
  match,
  onMoveComplete,
  onMatchCompleted,
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
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  // Client-side ticking timer state
  const [player1TimeLeft, setPlayer1TimeLeft] = useState(0);
  const [player2TimeLeft, setPlayer2TimeLeft] = useState(0);
  const lastSyncRef = useRef(Date.now());
  const lastContractP1TimeRef = useRef(0);
  const lastContractP2TimeRef = useRef(0);

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

      let parsed = parseTicTacToeMatch(data);
      let alreadyReconstructed = false; // Flag to prevent double reconstruction

      // Check if contract returned invalid/cleared data (happens when tournament resets after finals)
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const isMatchInitialized =
        parsed.player1?.toLowerCase() !== zeroAddress.toLowerCase() &&
        parsed.player2?.toLowerCase() !== zeroAddress.toLowerCase();
      const isBoardEmpty = parsed.board?.every(cell => cell === 0);

      // If contract returns cleared data (zero addresses + empty board), query MatchCompleted event
      if (!isMatchInitialized && isBoardEmpty) {
        console.log('[MiniTicTacToeBoard] Match data cleared, querying MatchCompleted event');

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

            console.log('[MiniTicTacToeBoard] MatchCompleted event data:', {
              eventMatchId,
              eventPlayer1,
              eventPlayer2,
              eventWinner,
              eventIsDraw,
              eventReason: Number(eventReason),
              eventPackedBoard: eventPackedBoard.toString()
            });

            // Unpack board from event
            const unpackBoard = (packed) => {
              const boardArray = [];
              let p = BigInt(packed);
              for (let j = 0; j < 9; j++) {
                boardArray.push(Number(p & 3n));
                p = p >> 2n;
              }
              return boardArray;
            };
            const eventBoard = unpackBoard(eventPackedBoard);
            console.log('[MiniTicTacToeBoard] Unpacked board from event:', eventBoard);

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
            console.log('[MiniTicTacToeBoard] Reconstructed match from MatchCompleted event:', eventBoard);
          } else {
            // No event found - if we have existing matchData, preserve it
            if (matchData) {
              console.log('[MiniTicTacToeBoard] No event found but have existing data, preserving state');
              return; // Don't update, keep existing state
            }
            // Otherwise, use the cleared data (initial load)
          }
        } catch (err) {
          console.warn('[MiniTicTacToeBoard] Failed to query MatchCompleted event:', err);
          // If we have existing matchData, preserve it
          if (matchData) {
            console.log('[MiniTicTacToeBoard] Preserving existing state due to event query error');
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
            'tictactoe'
          );

          // Use reconstructed board if available
          if (reconstructed && reconstructed.board) {
            parsed = {
              ...parsed,
              board: reconstructed.board,
              winner: reconstructed.winner || parsed.winner,
              isDraw: reconstructed.isDraw ?? parsed.isDraw
            };
            console.log('[MiniTicTacToeBoard] Using reconstructed board from MoveMade events');
          }
        } catch (err) {
          console.warn('[MiniTicTacToeBoard] Event reconstruction failed, using cached data:', err);
          // Fall back to cached data from getMatch
        }
      }
      // Compute isPlayer1 by comparing account to player1
      parsed.isPlayer1 = parsed.player1?.toLowerCase() === account?.toLowerCase();
      // Calculate isMyTurn based on current turn
      parsed.isMyTurn = parsed.currentTurn?.toLowerCase() === account?.toLowerCase();

      // Detect match end and show modal
      if (parsed.matchStatus === 2 && !showMatchEndModal) {
        // Determine result with completion reason
        let result = null;
        const completionReason = parsed.completionReason ?? 0; // Default to 0 (normal)

        if (parsed.isDraw) {
          result = 'draw';
        } else if (parsed.winner?.toLowerCase() === account?.toLowerCase()) {
          // Check if forfeit win
          result = parsed.isForfeit ? 'forfeit_win' : 'win';
        } else {
          // Check if forfeit lose
          result = parsed.isForfeit ? 'forfeit_lose' : 'lose';
        }

        // Store result with completion reason
        setMatchEndResult({ result, completionReason });
        setShowMatchEndModal(true);

        // Notify parent that match completed so it stays visible (only once)
        if (!hasNotifiedCompletion) {
          onMatchCompleted?.();
          setHasNotifiedCompletion(true);
        }
      }

      console.log('[MiniTicTacToeBoard] Setting matchData - board:', parsed.board, 'status:', parsed.matchStatus);
      setMatchData(parsed);

      // Calculate time remaining client-side (same as main board logic)
      // Formula: current player's time = stored time - elapsed since last move
      const now = Math.floor(Date.now() / 1000);
      const elapsed = parsed.lastMoveTime > 0 ? now - parsed.lastMoveTime : 0;

      let contractP1Time = parsed.player1TimeRemaining;
      let contractP2Time = parsed.player2TimeRemaining;

      // Only subtract elapsed time from the current player's clock (if match is active)
      if (parsed.matchStatus === 1 && parsed.currentTurn && elapsed > 0) {
        const isPlayer1Turn = parsed.currentTurn.toLowerCase() === parsed.player1.toLowerCase();
        if (isPlayer1Turn) {
          contractP1Time = Math.max(0, contractP1Time - elapsed);
        } else {
          contractP2Time = Math.max(0, contractP2Time - elapsed);
        }
      }

      // Only update if contract values actually changed (real sync occurred)
      if (contractP1Time !== lastContractP1TimeRef.current || contractP2Time !== lastContractP2TimeRef.current) {
        setPlayer1TimeLeft(contractP1Time);
        setPlayer2TimeLeft(contractP2Time);
        lastSyncRef.current = Date.now();
        lastContractP1TimeRef.current = contractP1Time;
        lastContractP2TimeRef.current = contractP2Time;
      }

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

  // Client-side countdown ticker
  useEffect(() => {
    if (!matchData || matchData.matchStatus !== 1) return; // Only tick during active match

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceSync = Math.floor((now - lastSyncRef.current) / 1000);

      // Determine whose turn it is
      const isPlayer1Turn = matchData.currentTurn?.toLowerCase() === matchData.player1?.toLowerCase();
      const isPlayer2Turn = matchData.currentTurn?.toLowerCase() === matchData.player2?.toLowerCase();

      // Decrement the time for the player whose turn it is
      if (isPlayer1Turn) {
        const newP1Time = Math.max(0, lastContractP1TimeRef.current - elapsedSinceSync);
        setPlayer1TimeLeft(newP1Time);
      } else if (isPlayer2Turn) {
        const newP2Time = Math.max(0, lastContractP2TimeRef.current - elapsedSinceSync);
        setPlayer2TimeLeft(newP2Time);
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [matchData]);

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

      // Calculate time remaining client-side (same as main board logic) after move
      const now = Math.floor(Date.now() / 1000);
      const elapsed = parsed.lastMoveTime > 0 ? now - parsed.lastMoveTime : 0;

      let contractP1Time = parsed.player1TimeRemaining;
      let contractP2Time = parsed.player2TimeRemaining;

      // Only subtract elapsed time from the current player's clock (if match is active)
      if (parsed.matchStatus === 1 && parsed.currentTurn && elapsed > 0) {
        const isPlayer1Turn = parsed.currentTurn.toLowerCase() === parsed.player1.toLowerCase();
        if (isPlayer1Turn) {
          contractP1Time = Math.max(0, contractP1Time - elapsed);
        } else {
          contractP2Time = Math.max(0, contractP2Time - elapsed);
        }
      }

      // Update timer state after move
      setPlayer1TimeLeft(contractP1Time);
      setPlayer2TimeLeft(contractP2Time);
      lastSyncRef.current = Date.now();
      lastContractP1TimeRef.current = contractP1Time;
      lastContractP2TimeRef.current = contractP2Time;

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

      {/* Timer Display */}
      {matchData.matchStatus === 1 && (
        <div className="bg-black/30 rounded-lg p-3 border border-purple-400/20">
          {/* Current Player's Timer */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="text-purple-400" size={14} />
              <span className="text-xs text-slate-400">Your time</span>
            </div>
            <span className={`font-mono font-bold ${getTimeColorScheme(isPlayer1 ? player1TimeLeft : player2TimeLeft).text}`}>
              {formatTime(isPlayer1 ? player1TimeLeft : player2TimeLeft)}
            </span>
          </div>

          {/* Opponent's Timer */}
          <div className="flex items-center justify-between border-t border-slate-700/50 pt-2">
            <span className="text-xs text-slate-500">Opponent's time</span>
            <span className={`font-mono text-sm ${getTimeColorScheme(isPlayer1 ? player2TimeLeft : player1TimeLeft).text} opacity-70`}>
              {formatTime(isPlayer1 ? player2TimeLeft : player1TimeLeft)}
            </span>
          </div>
        </div>
      )}

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
