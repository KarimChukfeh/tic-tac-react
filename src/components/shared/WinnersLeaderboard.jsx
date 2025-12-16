/**
 * WinnersLeaderboard - Shared component for displaying top earning players
 *
 * Shows a ranked list of players by their cumulative earnings from tournaments.
 * Highlights the current user if they appear on the leaderboard.
 */

import { Trophy } from 'lucide-react';
import { ethers } from 'ethers';
import { shortenAddress } from '../../utils/formatters';

const getRankDisplay = (rank) => {
  if (rank === 1) return { medal: '1st', color: 'text-yellow-400' };
  if (rank === 2) return { medal: '2nd', color: 'text-gray-300' };
  if (rank === 3) return { medal: '3rd', color: 'text-amber-600' };
  return { medal: `${rank}th`, color: 'text-gray-400' };
};

const WinnersLeaderboard = ({
  leaderboard = [],
  loading = false,
  currentAccount = null,
  title = 'Winners Leaderboard'
}) => {
  // Show top 10 entries
  const displayEntries = leaderboard.slice(0, 10);

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="text-yellow-400" size={24} />
        <h3 className="text-xl font-bold text-yellow-300">{title}</h3>
        {leaderboard.length > 0 && (
          <span className="text-sm text-yellow-400/70">
            ({leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayEntries.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No winners yet
        </div>
      )}

      {/* Leaderboard List */}
      {!loading && displayEntries.length > 0 && (
        <div className="space-y-2">
          {displayEntries.map((entry, index) => {
            const rank = index + 1;
            const { medal, color } = getRankDisplay(rank);
            const isCurrentUser = currentAccount &&
              entry.player.toLowerCase() === currentAccount.toLowerCase();
            const earnings = BigInt(entry.earnings);
            const isPositive = earnings >= 0n;
            const formattedEarnings = ethers.formatEther(
              isPositive ? earnings : -earnings
            );

            return (
              <div
                key={entry.player}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser
                    ? 'bg-green-500/20 border border-green-400/50'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-10 ${color}`}>
                    {medal}
                  </span>
                  <span className="font-mono text-sm">
                    {shortenAddress(entry.player)}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                      YOU
                    </span>
                  )}
                </div>
                <span className={`font-mono font-bold ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? '+' : '-'}{formattedEarnings} ETH
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WinnersLeaderboard;
