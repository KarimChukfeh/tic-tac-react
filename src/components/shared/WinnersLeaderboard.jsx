/**
 * WinnersLeaderboard - Shared component for displaying top earning players
 *
 * Shows a ranked list of players by their cumulative earnings from tournaments.
 * Highlights the current user if they appear on the leaderboard.
 */

import { useState, useEffect } from 'react';
import { Trophy, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
  error = false,
  currentAccount = null,
  title = 'Top Earners',
  onRetry = null,
  onRefresh = null
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Calculate pagination
  const totalPages = Math.ceil(leaderboard.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayEntries = leaderboard.slice(startIndex, endIndex);

  // Reset to page 1 when leaderboard data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [leaderboard.length]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="text-yellow-400" size={24} />
        <h3 className="text-xl font-bold text-yellow-300">{title}</h3>
        {/* Manual Refresh Button */}
        {onRefresh && !error && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="ml-auto p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh leaderboard"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center py-6">
          <p className="text-red-400 mb-3">Unable to load leaderboard</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Empty State - only show when no error */}
      {!loading && !error && displayEntries.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No winners yet
        </div>
      )}

      {/* Leaderboard List */}
      {!loading && !error && displayEntries.length > 0 && (
        <>
          <div className="space-y-2">
            {displayEntries.map((entry, index) => {
              const rank = startIndex + index + 1;
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-yellow-500/20">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-yellow-500/20"
                title="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-yellow-400/70 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-yellow-500/20"
                title="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WinnersLeaderboard;
