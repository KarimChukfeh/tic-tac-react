/**
 * RecentInstanceCard - Shows last completed tournament history for an instance
 *
 * Displays when a tournament instance is in an empty/inactive state
 */

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Clock, Trophy, Award, Users } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { CompletionReason } from '../../utils/completionReasons';

const RecentInstanceCard = ({ tierId, instanceId, contract, tierName = 'Tournament' }) => {
  const [recentData, setRecentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentInstance = async () => {
      if (!contract) return;

      try {
        setLoading(true);
        const data = await contract.getTournamentRecord(tierId, instanceId);

        // Check if there's valid history (endTime > 0 means completed tournament exists)
        const endTime = Number(data.endTime);
        const zeroAddress = '0x0000000000000000000000000000000000000000';

        if (endTime === 0 || data.winner === zeroAddress) {
          setRecentData(null);
        } else {
          setRecentData({
            endTime,
            prizePool: data.prizePool,
            winner: data.winner,
            completionReason: Number(data.completionReason),
            players: data.players || []
          });
        }
      } catch (error) {
        console.error('Error fetching recent instance:', error);
        setRecentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentInstance();
  }, [contract, tierId, instanceId]);

  // Format timestamp
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-slate-800/30 border border-purple-500/20 rounded-xl p-8">
        <div className="flex items-center justify-center gap-3 text-purple-300">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  // No history state
  if (!recentData) {
    return (
      <div className="bg-slate-800/30 border border-purple-500/20 rounded-xl p-8">
        <div className="text-center">
          <Clock className="mx-auto mb-3 text-purple-400/50" size={48} />
          <h3 className="text-xl font-bold text-purple-300 mb-2">No History Yet</h3>
          <p className="text-purple-400/70">
            This {tierName} instance hasn't been completed yet.
          </p>
        </div>
      </div>
    );
  }

  // Get tournament-specific completion reason text
  const getTournamentCompletionText = (reason) => {
    switch (reason) {
      case CompletionReason.NORMAL_WIN:
        return 'Normal Victory';
      case CompletionReason.TIMEOUT:
        return 'EL1 Timeout Elimination';
      case CompletionReason.DRAW:
        return 'Draw Resolution';
      case CompletionReason.FORCE_ELIMINATION:
        return 'EL2 Advanced Player Elimination';
      case CompletionReason.REPLACEMENT:
        return 'EL3 External Player Replacement';
      case CompletionReason.ALL_DRAW_SCENARIO:
        return 'All-Draw Scenario Resolution';
      default:
        return 'Tournament Completion';
    }
  };

  const reasonText = getTournamentCompletionText(recentData.completionReason);

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-yellow-400" size={28} />
        <h3 className="text-2xl font-bold text-white">Last Completed Tournament</h3>
      </div>

      <div className="space-y-4">
        {/* Completion Time */}
        <div className="flex items-start gap-3">
          <Clock className="text-blue-400 mt-1" size={20} />
          <div>
            <p className="text-sm text-purple-300 font-semibold">Completed At</p>
            <p className="text-white font-mono">{formatDate(recentData.endTime)}</p>
          </div>
        </div>

        {/* Prize Pool */}
        <div className="flex items-start gap-3">
          <Award className="text-green-400 mt-1" size={20} />
          <div>
            <p className="text-sm text-purple-300 font-semibold">Prize Pool</p>
            <p className="text-white font-mono text-lg">
              {ethers.formatEther(recentData.prizePool)} ETH
            </p>
          </div>
        </div>

        {/* Winner */}
        <div className="flex items-start gap-3">
          <Trophy className="text-yellow-400 mt-1" size={20} />
          <div>
            <p className="text-sm text-purple-300 font-semibold">Winner</p>
            <p className="text-white font-mono">{shortenAddress(recentData.winner)}</p>
          </div>
        </div>

        {/* Players */}
        {recentData.players && recentData.players.length > 0 && (
          <div className="flex items-start gap-3">
            <Users className="text-cyan-400 mt-1" size={20} />
            <div className="flex-1">
              <p className="text-sm text-purple-300 font-semibold mb-2">Players</p>
              <div className="flex flex-wrap gap-2">
                {recentData.players.map((player, index) => (
                  <span
                    key={index}
                    className="bg-slate-700/50 border border-cyan-500/30 rounded-lg px-3 py-1 text-white font-mono text-sm"
                  >
                    {shortenAddress(player)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Completion Reason */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mt-4">
          <p className="text-sm text-purple-300">
            Tournament completed via <span className="font-semibold text-white">{reasonText}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecentInstanceCard;
