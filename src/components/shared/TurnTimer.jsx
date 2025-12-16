/**
 * TurnTimer - Shared component for displaying turn timer with timeout claim
 *
 * Shows whose turn it is, countdown timer with color coding, and
 * timeout claim button when opponent's time runs out.
 */

import { Clock } from 'lucide-react';

const formatTime = (secs) => {
  const mins = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${mins}:${seconds.toString().padStart(2, '0')}`;
};

const TurnTimer = ({
  isYourTurn,
  timeRemaining,
  onClaimTimeoutWin,
  loading
}) => {
  const isLowTime = timeRemaining <= 10;

  return (
    <div className={`border rounded-xl p-3 ${
      isLowTime ? 'bg-red-500/20 border-red-400 animate-pulse' : 'bg-blue-500/20 border-blue-400'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={isLowTime ? 'text-red-400' : 'text-blue-400'} size={18} />
          <span className={`text-sm font-bold ${isLowTime ? 'text-red-300' : 'text-blue-300'}`}>
            {isYourTurn ? 'Your Turn' : "Opponent's Turn"}
          </span>
        </div>
        <div className={`text-lg font-mono font-bold ${
          isLowTime ? 'text-red-300' : timeRemaining <= 30 ? 'text-yellow-300' : 'text-blue-300'
        }`}>
          {timeRemaining > 0 ? formatTime(timeRemaining) : 'TIMEOUT'}
        </div>
      </div>
      {isYourTurn && timeRemaining > 0 && (
        <div className="text-xs text-blue-300/70 mt-1">
          Make your move before time runs out!
        </div>
      )}
      {timeRemaining === 0 && !isYourTurn && (
        <div className="mt-2">
          <button
            onClick={onClaimTimeoutWin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
          >
            Claim Timeout Victory
          </button>
          <div className="text-xs text-green-300 mt-1 text-center">
            Your opponent ran out of time!
          </div>
        </div>
      )}
      {timeRemaining === 0 && isYourTurn && (
        <div className="text-xs text-red-300 mt-1">
          Time's up! Your opponent can claim victory...
        </div>
      )}
    </div>
  );
};

export default TurnTimer;
