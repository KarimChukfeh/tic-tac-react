/**
 * TurnTimer - Dual clock display for total match time system
 *
 * Shows both players' time with full breakdown:
 * - Total allocation (5:00)
 * - Time used
 * - Time remaining
 * - Progress bar visualization
 * - Timeout claim button when opponent's time expires
 */

import { Clock } from 'lucide-react';
import { calculatePlayerTimes, formatTime, getTimeColorScheme } from '../../utils/timeCalculations';

const TurnTimer = ({
  match,
  account,
  onClaimTimeoutWin,
  loading
}) => {
  // Calculate time breakdown for both players
  const times = calculatePlayerTimes(match, account);

  const {
    player1,
    player2,
    isExpired,
    expiredPlayer,
    isPlayer1You,
    isPlayer2You,
    activePlayer
  } = times;

  // Determine whose turn it is
  const isYourTurn = (isPlayer1You && match.currentTurn?.toLowerCase() === match.player1?.toLowerCase()) ||
                     (isPlayer2You && match.currentTurn?.toLowerCase() === match.player2?.toLowerCase());

  // Get your time and opponent's time
  const yourTime = isPlayer1You ? player1 : player2;
  const opponentTime = isPlayer1You ? player2 : player1;

  // Determine if you or opponent has timed out
  const youTimedOut = isExpired && (
    (isPlayer1You && expiredPlayer?.toLowerCase() === match.player1?.toLowerCase()) ||
    (isPlayer2You && expiredPlayer?.toLowerCase() === match.player2?.toLowerCase())
  );
  const opponentTimedOut = isExpired && !youTimedOut;

  // Get color schemes based on remaining time
  const yourColors = getTimeColorScheme(yourTime.remaining);
  const opponentColors = getTimeColorScheme(opponentTime.remaining);

  // Calculate progress percentages (how much time has been used)
  const yourProgress = (yourTime.used / yourTime.total) * 100;
  const opponentProgress = (opponentTime.used / opponentTime.total) * 100;

  return (
    <div className="border border-purple-400/30 rounded-xl p-4 bg-gradient-to-br from-purple-600/10 to-blue-600/10 backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-purple-400" size={20} />
        <span className="text-lg font-bold text-white">Match Time</span>
      </div>

      {/* Dual Clock Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Your Time Column */}
        <div className={`border-2 rounded-lg p-3 transition-all ${
          isYourTurn ? `${yourColors.border} ${yourColors.bg} ring-2 ring-purple-400/50` : 'border-gray-600/50 bg-gray-800/30 opacity-60'
        } ${yourColors.pulse && isYourTurn ? 'animate-pulse' : ''}`}>
          <div className="text-sm font-bold text-purple-300 mb-2">YOU</div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Total:</span>
              <span className="font-mono">{formatTime(yourTime.total)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Used:</span>
              <span className="font-mono">{formatTime(yourTime.used)}</span>
            </div>
            <div className={`flex justify-between font-bold ${yourColors.text}`}>
              <span>Left:</span>
              <span className="font-mono text-lg">
                {yourTime.remaining > 0 ? formatTime(yourTime.remaining) : 'TIMEOUT'}
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

          {isYourTurn && yourTime.remaining > 0 && (
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

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Total:</span>
              <span className="font-mono">{formatTime(opponentTime.total)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Used:</span>
              <span className="font-mono">{formatTime(opponentTime.used)}</span>
            </div>
            <div className={`flex justify-between font-bold ${opponentColors.text}`}>
              <span>Left:</span>
              <span className="font-mono text-lg">
                {opponentTime.remaining > 0 ? formatTime(opponentTime.remaining) : 'TIMEOUT'}
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

          {!isYourTurn && match.currentTurn && opponentTime.remaining > 0 && (
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

      {/* Claim Timeout Victory Button */}
      {opponentTimedOut && (
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
