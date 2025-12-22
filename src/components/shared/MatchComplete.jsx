/**
 * MatchComplete - Shared component for match completion display
 *
 * Shows win/lose/draw status and winner information with separate banners.
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

  // Winner and Loser Banners
  return (
    <div className="space-y-3">
      {/* Winner Banner */}
      <div
        className={`rounded-xl p-4 text-center transition-all duration-300 ${
          userWon ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900' : ''
        }`}
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          boxShadow: userWon ? '0 0 30px rgba(34, 197, 94, 0.3)' : '0 0 20px rgba(34, 197, 94, 0.15)'
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="text-green-400" size={20} />
          <p className="text-green-400 font-bold text-lg">Winner</p>
        </div>
        <p className="text-white font-mono text-sm mb-1">
          {shortenAddress(winner)}
          {userWon && <span className="ml-2 text-yellow-400 font-bold">(YOU!)</span>}
        </p>
        <p className="text-green-300 text-xs">
          {gameSpecificText || 'Victory!'}
        </p>
      </div>

      {/* Loser Banner */}
      {loser && loser !== zeroAddress && (
        <div
          className={`rounded-xl p-4 text-center transition-all duration-300 ${
            userLost ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-gray-900' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: userLost ? '0 0 30px rgba(239, 68, 68, 0.3)' : '0 0 20px rgba(239, 68, 68, 0.15)'
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Frown className="text-red-400" size={20} />
            <p className="text-red-400 font-bold text-lg">Defeated</p>
          </div>
          <p className="text-white/80 font-mono text-sm mb-1">
            {shortenAddress(loser)}
            {userLost && <span className="ml-2 text-red-400 font-bold">(YOU)</span>}
          </p>
          <p className="text-red-300 text-xs">
            Better luck next time
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchComplete;
