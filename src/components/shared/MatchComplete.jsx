/**
 * MatchComplete - Shared component for match completion display
 *
 * Shows personalized win/lose/draw status based on the viewer:
 * - If you won: Shows victory card
 * - If you lost: Shows defeat card
 * - If spectator: Shows winner info
 */

import { Trophy, Frown, ArrowRight } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { isDraw } from '../../utils/completionReasons';
import { getV2NeutralMatchReasonLabel } from '../../v2/lib/reasonLabels';

const MatchComplete = ({
  completionReason,
  winner,
  loser,
  currentAccount,
  gameSpecificText, // Optional override for win text (e.g., "Checkmate!" for chess)
  // CTA props
  hasNextActiveMatch = false, // Whether player has an active match in next round
  onEnterNextMatch, // Callback to enter the next match
  onReturnToBracket, // Callback to return to tournament bracket
  reasonLabelMode = 'default',
}) => {
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  const isMatchDraw = isDraw(completionReason);
  const useV2ReasonLabels = reasonLabelMode === 'v2';
  const userWon = !isMatchDraw && winner && currentAccount &&
    winner.toLowerCase() === currentAccount.toLowerCase();
  const userLost = !isMatchDraw && loser && currentAccount &&
    loser.toLowerCase() === currentAccount.toLowerCase();
  const isSpectator = !userWon && !userLost;

  // Draw scenario
  if (isMatchDraw) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.15))',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)'
        }}
      >
        <p className="text-white font-bold text-xl mb-2">
          {useV2ReasonLabels ? getV2NeutralMatchReasonLabel(completionReason) : "It's a Draw!"}
        </p>
        <p className="text-blue-300 text-sm mb-3">Evenly matched</p>

        {/* CTA Button */}
        {onReturnToBracket && (
          <button
            onClick={onReturnToBracket}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all transform hover:scale-105"
          >
            Return to tournament brackets
          </button>
        )}
      </div>
    );
  }

  // User Won - Show victory card
  if (userWon) {
    return (
      <div
        className="rounded-xl p-4 text-center ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
          border: '1px solid rgba(34, 197, 94, 0.5)',
          boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)'
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="text-yellow-400" size={24} />
          <p className="text-yellow-400 font-bold text-xl">Victory!</p>
          <Trophy className="text-yellow-400" size={24} />
        </div>
        <p className="text-green-300 text-sm mb-3">
          {gameSpecificText || 'You won the match!'}
        </p>

        {/* CTA Button */}
        {hasNextActiveMatch && onEnterNextMatch ? (
          <button
            onClick={onEnterNextMatch}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>You advanced to the next round, enter match</span>
            <ArrowRight size={18} />
          </button>
        ) : onReturnToBracket ? (
          <button
            onClick={onReturnToBracket}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all transform hover:scale-105"
          >
            Return to tournament brackets
          </button>
        ) : null}
      </div>
    );
  }

  // User Lost - Show defeat card
  if (userLost) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Frown className="text-red-400" size={24} />
          <p className="text-red-400 font-bold text-xl">Defeated</p>
        </div>
        <p className="text-red-300 text-sm mb-3">Better luck next time</p>

        {/* CTA Button */}
        {onReturnToBracket && (
          <button
            onClick={onReturnToBracket}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all transform hover:scale-105"
          >
            Return to tournament brackets
          </button>
        )}
      </div>
    );
  }

  // Spectator view - Show winner info
  const hasWinner = winner && winner.toLowerCase() !== zeroAddress;

  // Determine appropriate message based on completion reason
  const getCompletionText = () => {
    if (gameSpecificText) return gameSpecificText;

    if (isMatchDraw) return useV2ReasonLabels ? getV2NeutralMatchReasonLabel(completionReason) : 'Draw';

    // ML2 (3) or ML3 (4) - no winner
    if (completionReason === 3 || completionReason === 4) {
      return useV2ReasonLabels
        ? getV2NeutralMatchReasonLabel(completionReason)
        : (completionReason === 3 ? 'Force Eliminated (ML2)' : 'Replacement Claimed (ML3)');
    }

    return hasWinner ? 'Victory!' : 'Match Complete';
  };

  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
        border: '1px solid rgba(34, 197, 94, 0.4)',
        boxShadow: '0 0 20px rgba(34, 197, 94, 0.15)'
      }}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <Trophy className="text-green-400" size={20} />
        <p className="text-green-400 font-bold text-lg">Match Complete</p>
      </div>
      <p className="text-white font-mono text-sm mb-1">
        Winner: {hasWinner ? shortenAddress(winner) : 'No winner'}
      </p>
      <p className="text-green-300 text-xs">
        {getCompletionText()}
      </p>
    </div>
  );
};

export default MatchComplete;
