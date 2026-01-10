/**
 * MatchComplete - Shared component for match completion display
 *
 * Shows personalized win/lose/draw status based on the viewer:
 * - If you won: Shows victory card
 * - If you lost: Shows defeat card
 * - If spectator: Shows winner info
 */

import { Trophy, Frown } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';

const MatchComplete = ({
  isDraw,
  winner,
  loser,
  currentAccount,
  gameSpecificText // Optional override for win text (e.g., "Checkmate!" for chess)
}) => {
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  const userWon = winner && currentAccount &&
    winner.toLowerCase() === currentAccount.toLowerCase();
  const userLost = loser && currentAccount &&
    loser.toLowerCase() === currentAccount.toLowerCase();
  const isSpectator = !userWon && !userLost;

  // Draw scenario
  if (isDraw) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.15))',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)'
        }}
      >
        <p className="text-white font-bold text-xl mb-2">It's a Draw!</p>
        <p className="text-blue-300 text-sm">Evenly matched</p>
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
        <p className="text-green-300 text-sm">
          {gameSpecificText || 'You won the match!'}
        </p>
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
        <p className="text-red-300 text-sm">Better luck next time</p>
      </div>
    );
  }

  // Spectator view - Show winner info
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
        Winner: {shortenAddress(winner)}
      </p>
      <p className="text-green-300 text-xs">
        {gameSpecificText || 'Victory!'}
      </p>
    </div>
  );
};

export default MatchComplete;
