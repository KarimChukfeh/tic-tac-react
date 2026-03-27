/**
 * RecentInstanceCard - Shows last completed tournament history for an instance
 *
 * Displays when a tournament instance is in an empty/inactive state
 */

import { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import { Clock, Trophy, Award, Users } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { getTournamentCompletionText, getTournamentResolutionReasonValue } from '../../utils/completionReasons';

const RecentInstanceCard = ({ tierId, instanceId, contract, tierName = 'Tournament', walletAddress }) => {
  const [recentData, setRecentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const fetchRecentInstance = async () => {
      if (!contract) return;

      try {
        setLoading(true);
        const data = await contract.getTournamentRecord(tierId, instanceId);

        // Check if there's valid history (endTime > 0 means completed tournament exists)
        const endTime = Number(data.endTime);
        const zeroAddress = '0x0000000000000000000000000000000000000000';

        // Only check endTime - winner can be zero address for draws/all-draw scenarios
        if (endTime === 0) {
          setRecentData(null);
        } else {
          setRecentData({
            endTime,
            prizePool: data.prizePool,
            winner: data.winner,
            completionReason: Number(data.completionReason),
            completionCategory: Number(data.completionCategory ?? 0),
            resolutionReason: Number(data.resolutionReason ?? data.completionReason ?? 0),
            resolutionCategory: Number(data.resolutionCategory ?? data.completionCategory ?? 0),
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (timestamp) => {
    const now = Date.now();
    const then = timestamp * 1000;
    const diffMs = now - then;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="py-8">
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
      <div className="py-8">
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

  const resolutionReason = getTournamentResolutionReasonValue(recentData);
  const reasonData = getTournamentCompletionText(resolutionReason);

  return (
    <div className="py-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="text-yellow-400" size={28} />
          <h3 className="text-2xl font-bold text-white">
            Last Instance{' '}
            <span className="relative text-lg font-normal text-purple-300">
              <span
                ref={tooltipRef}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="cursor-help border-b border-dotted border-purple-400/50"
              >
                {formatRelativeTime(recentData.endTime)}
              </span>
              {showTooltip && (
                <div className="absolute left-0 bottom-full mb-1 z-10 bg-slate-800 border border-purple-500/50 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                  <p className="text-sm text-purple-200">{formatDate(recentData.endTime)}</p>
                </div>
              )}
            </span>
          </h3>
        </div>
        <p className="text-sm text-purple-300 ml-10">
          Resolved via{' '}
          {reasonData.link ? (
            <a
              href={reasonData.link}
              className="font-semibold text-white hover:text-cyan-300 underline transition-colors"
            >
              {reasonData.text}
            </a>
          ) : (
            <span className="font-semibold text-white">{reasonData.text}</span>
          )}
        </p>
      </div>

      <div className="space-y-4">

        {/* Prize Pool and Winner */}
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Prize Pool */}
          <div className="flex items-start gap-3">
            <Award className="text-green-400 mt-1 flex-shrink-0" size={20} />
            <div className="min-w-0">
              <p className="text-sm text-purple-300 font-semibold whitespace-nowrap">Prize Pool</p>
              <p className="text-white font-mono text-lg whitespace-nowrap">
                {ethers.formatEther(recentData.prizePool)} ETH
              </p>
            </div>
          </div>

          {/* Winner */}
          <div className="flex items-start gap-3">
            <Trophy className="text-yellow-400 mt-1 flex-shrink-0" size={20} />
            <div className="min-w-0">
              <p className="text-sm text-purple-300 font-semibold whitespace-nowrap">Winner</p>
              <p className={`font-mono whitespace-nowrap ${
                recentData.winner === '0x0000000000000000000000000000000000000000'
                  ? 'text-white'
                  : walletAddress && recentData.winner.toLowerCase() === walletAddress.toLowerCase()
                  ? 'text-yellow-400 font-bold'
                  : 'text-white'
              }`}>
                {recentData.winner === '0x0000000000000000000000000000000000000000'
                  ? 'No Winner (Draw)'
                  : (
                    <>
                      {shortenAddress(recentData.winner)}
                      {walletAddress && recentData.winner.toLowerCase() === walletAddress.toLowerCase() && (
                        <span className="ml-2 text-xs bg-yellow-400 text-black px-2 py-0.5 rounded font-bold">YOU</span>
                      )}
                    </>
                  )}
              </p>
            </div>
          </div>
        </div>

        {/* Players */}
        {recentData.players && recentData.players.length > 0 && (
          <div className="flex items-start gap-3">
            <Users className="text-cyan-400 mt-1" size={20} />
            <div className="flex-1">
              <p className="text-sm text-purple-300 font-semibold mb-2">Players</p>
              <div className="flex flex-wrap gap-2">
                {recentData.players.map((player, index) => {
                  const isConnectedWallet = walletAddress && player.toLowerCase() === walletAddress.toLowerCase();
                  return (
                    <span
                      key={index}
                      className={`rounded-lg px-3 py-1 font-mono text-sm inline-flex items-center gap-2 ${
                        isConnectedWallet
                          ? 'bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400 font-bold'
                          : 'bg-slate-700/50 border border-cyan-500/30 text-white'
                      }`}
                    >
                      {shortenAddress(player)}
                      {isConnectedWallet && (
                        <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded font-bold">YOU</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentInstanceCard;
