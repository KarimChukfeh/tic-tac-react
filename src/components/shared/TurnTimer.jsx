/**
 * TurnTimer - Dual clock display with client-side ticking countdown
 *
 * Shows both players' time with:
 * - Total allocation (fixed, e.g., "1:00")
 * - Time remaining (client-side countdown that syncs with contract)
 * - Progress bar visualization
 * - Timeout claim button when opponent's time expires
 */

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { formatTime, getTimeColorScheme } from '../../utils/timeCalculations';

const TurnTimer = ({
  match,
  account,
  onClaimTimeoutWin,
  loading,
  syncDots = 1
}) => {
  // Client-side ticking state
  const [player1TimeLeft, setPlayer1TimeLeft] = useState(match.player1TimeRemaining ?? match.matchTimePerPlayer ?? 300);
  const [player2TimeLeft, setPlayer2TimeLeft] = useState(match.player2TimeRemaining ?? match.matchTimePerPlayer ?? 300);
  const lastSyncRef = useRef(Date.now());
  const lastContractP1TimeRef = useRef(match.player1TimeRemaining);
  const lastContractP2TimeRef = useRef(match.player2TimeRemaining);

  // Determine which player is the current user
  const isPlayer1You = account && match.player1?.toLowerCase() === account.toLowerCase();
  const isPlayer2You = account && match.player2?.toLowerCase() === account.toLowerCase();

  // Determine whose turn it is
  const isPlayer1Turn = match.currentTurn?.toLowerCase() === match.player1?.toLowerCase();
  const isPlayer2Turn = match.currentTurn?.toLowerCase() === match.player2?.toLowerCase();

  // Update client-side time when contract data changes (on sync)
  useEffect(() => {
    const contractP1Time = match.player1TimeRemaining ?? match.matchTimePerPlayer ?? 300;
    const contractP2Time = match.player2TimeRemaining ?? match.matchTimePerPlayer ?? 300;

    // Only update if contract values actually changed (real sync occurred)
    if (contractP1Time !== lastContractP1TimeRef.current || contractP2Time !== lastContractP2TimeRef.current) {
      setPlayer1TimeLeft(contractP1Time);
      setPlayer2TimeLeft(contractP2Time);
      lastSyncRef.current = Date.now();
      lastContractP1TimeRef.current = contractP1Time;
      lastContractP2TimeRef.current = contractP2Time;
    }
  }, [match.player1TimeRemaining, match.player2TimeRemaining, match.matchTimePerPlayer]);

  // Client-side countdown ticker
  useEffect(() => {
    if (match.matchStatus !== 1) return; // Only tick during active match

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceSync = Math.floor((now - lastSyncRef.current) / 1000);

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
  }, [match.matchStatus, isPlayer1Turn, isPlayer2Turn]);

  // Determine if anyone has timed out
  const isExpired = player1TimeLeft <= 0 || player2TimeLeft <= 0;
  const expiredPlayer = player1TimeLeft <= 0 ? match.player1 : (player2TimeLeft <= 0 ? match.player2 : null);

  // Determine whose turn it is
  const isYourTurn = (isPlayer1You && match.currentTurn?.toLowerCase() === match.player1?.toLowerCase()) ||
                     (isPlayer2You && match.currentTurn?.toLowerCase() === match.player2?.toLowerCase());

  // Get your time and opponent's time (using client-side ticking values)
  const totalTime = match.matchTimePerPlayer ?? 300;
  const yourTimeLeft = isPlayer1You ? player1TimeLeft : player2TimeLeft;
  const opponentTimeLeft = isPlayer1You ? player2TimeLeft : player1TimeLeft;

  // Determine if you or opponent has timed out
  const youTimedOut = isExpired && (
    (isPlayer1You && expiredPlayer?.toLowerCase() === match.player1?.toLowerCase()) ||
    (isPlayer2You && expiredPlayer?.toLowerCase() === match.player2?.toLowerCase())
  );
  const opponentTimedOut = isExpired && !youTimedOut;

  // Get color schemes based on remaining time
  const yourColors = getTimeColorScheme(yourTimeLeft);
  const opponentColors = getTimeColorScheme(opponentTimeLeft);

  // Calculate progress percentages (how much time has been used)
  const yourProgress = ((totalTime - yourTimeLeft) / totalTime) * 100;
  const opponentProgress = ((totalTime - opponentTimeLeft) / totalTime) * 100;

  return (
    <div className="border border-purple-400/30 rounded-xl p-4 bg-gradient-to-br from-purple-600/10 to-blue-600/10 backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-purple-400" size={20} />
        <span className="text-lg font-bold text-white">Match Time</span>
        <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          Syncing{'.'.repeat(syncDots)}
        </span>
      </div>

      {/* Dual Clock Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Your Time Column */}
        <div className={`border-2 rounded-lg p-3 transition-all ${
          isYourTurn ? `${yourColors.border} ${yourColors.bg} ring-2 ring-purple-400/50` : 'border-gray-600/50 bg-gray-800/30 opacity-60'
        } ${yourColors.pulse && isYourTurn ? 'animate-pulse' : ''}`}>
          <div className="text-sm font-bold text-purple-300 mb-2">YOU</div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Total Time:</span>
              <span className="font-mono">{formatTime(totalTime)}</span>
            </div>
            <div className={`flex justify-between font-bold ${yourColors.text}`}>
              <span className="text-sm">Time Left:</span>
              <span className={`font-mono ${yourTimeLeft > 0 ? 'text-2xl' : 'text-sm'}`}>
                {yourTimeLeft > 0 ? formatTime(yourTimeLeft) : 'TIMEOUT'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${yourColors.barColor} transition-all duration-500`}
              style={{ width: `${Math.min(yourProgress, 100)}%` }}
            />
          </div>

          {isYourTurn && yourTimeLeft > 0 && (
            <div className="text-xs text-purple-300/70 mt-2 text-center">
              ⚡ Your turn
            </div>
          )}
        </div>

        {/* Opponent's Time Column */}
        <div className={`border-2 rounded-lg p-3 transition-all ${
          !isYourTurn && match.currentTurn ? `${opponentColors.border} ${opponentColors.bg} ring-2 ring-pink-400/50` : 'border-gray-600/50 bg-gray-800/30 opacity-60'
        } ${opponentColors.pulse && !isYourTurn ? 'animate-pulse' : ''}`}>
          <div className="text-sm font-bold text-pink-300 mb-2">OPPONENT</div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Total Time:</span>
              <span className="font-mono">{formatTime(totalTime)}</span>
            </div>
            <div className={`flex justify-between font-bold ${opponentColors.text}`}>
              <span className="text-sm">Time Left:</span>
              <span className={`font-mono ${opponentTimeLeft > 0 ? 'text-2xl' : 'text-sm'}`}>
                {opponentTimeLeft > 0 ? formatTime(opponentTimeLeft) : 'TIMEOUT'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${opponentColors.barColor} transition-all duration-500`}
              style={{ width: `${Math.min(opponentProgress, 100)}%` }}
            />
          </div>

          {!isYourTurn && match.currentTurn && opponentTimeLeft > 0 && (
            <div className="text-xs text-pink-300/70 mt-2 text-center">
              ⏳ Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Turn Indicator */}
      {match.matchStatus === 1 && (
        <div className="text-center mb-3">
          {isYourTurn ? (
            <div className="text-sm text-green-300 font-semibold">
              ✓ Your Turn - Make your move!
            </div>
          ) : (
            <div className="text-sm text-blue-300">
              Waiting for opponent's move...
            </div>
          )}
        </div>
      )}

      {/* Timeout Warnings */}
      {youTimedOut && (
        <div className="text-xs text-red-300 text-center p-2 bg-red-500/20 rounded border border-red-400/30 mb-3">
          Time's up! Your opponent can claim victory...
        </div>
      )}

      {/* Claim Timeout Victory Button - only show when opponent timed out while it's their turn */}
      {opponentTimedOut && !isYourTurn && (
        <div>
          <button
            onClick={onClaimTimeoutWin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 shadow-lg"
          >
            Claim Timeout Victory
          </button>
          <div className="text-xs text-green-300 mt-2 text-center">
            🎉 Your opponent ran out of time!
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnTimer;
