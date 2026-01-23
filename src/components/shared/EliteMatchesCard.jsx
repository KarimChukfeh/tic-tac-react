/**
 * EliteMatchesCard - Collapsible component showing elite matches history
 *
 * Displays a list of elite (high-tier) matches with:
 * - When the match happened
 * - Who were the players
 * - Who won and who lost
 */

import { useState, useEffect } from 'react';
import { X, RefreshCw, Trophy, Crown, Clock, Swords, Eye } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';

const EliteMatchesCard = ({
  eliteMatches,
  playerActivityHeight,
  raffleCardHeight,
  onRefresh,
  syncing,
  account,
  onViewMatch,
  isExpanded: externalIsExpanded, // External control for mobile single-panel coordination
  onToggleExpand, // External toggle handler
  hideOnMobile = false, // Hide this panel on mobile when another panel is expanded
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  // Helper to handle expansion changes
  const handleSetExpanded = (value) => {
    if (onToggleExpand) {
      // External control: only toggle if needed
      if (value && !externalIsExpanded) {
        onToggleExpand();
      } else if (!value && externalIsExpanded) {
        onToggleExpand();
      }
    } else {
      // Internal control
      setInternalIsExpanded(value);
    }
  };

  // Track screen size for responsive positioning
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0n) return 'Unknown';
    const date = new Date(Number(timestamp) * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get the loser from a match
  const getLoser = (match) => {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    if (!match.winner || match.winner === zeroAddress) return null;
    if (match.winner.toLowerCase() === match.player1.toLowerCase()) {
      return match.player2;
    }
    return match.player1;
  };

  // Check if address is the connected user
  const isUser = (address) => {
    if (!account || !address) return false;
    return address.toLowerCase() === account.toLowerCase();
  };

  // Handle anchor link click with collapse after scroll
  const handleEliteMatchesClick = (e) => {
    e.preventDefault();
    const element = document.getElementById('elite-matches');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Collapse card after scrolling
      setTimeout(() => {
        handleSetExpanded(false);
      }, 100);
    }
  };

  // Dynamic positioning:
  // Mobile (<768px): Horizontal layout at bottom-left, positioned to the right of CommunityRaffleCard
  // Desktop (>=768px): Vertical layout at top-left, positioned below both PlayerActivity and CommunityRaffle

  // Mobile positioning (bottom-left, horizontal)
  // Button size calculation: p-2.5 (10px × 2) + icon (18px) + border-2 (2px × 2) = 42px
  const MOBILE_LEFT = 132; // 16px (left-4) + 42px (PlayerActivity) + 16px (gap) + 42px (CommunityRaffle) + 16px (gap)

  // Desktop positioning (top-left, vertical)
  const BASE_TOP_DESKTOP = 80; // md:top-20 in pixels
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64;
  const SPACING_DESKTOP = 90;

  // Position below PlayerActivity
  const activityOffset = playerActivityHeight > 0
    ? playerActivityHeight + SPACING_DESKTOP
    : COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;

  // Add offset for CommunityRaffle card (use actual height when expanded, collapsed button height otherwise)
  const raffleOffset = raffleCardHeight > 0
    ? raffleCardHeight + SPACING_DESKTOP
    : COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;

  const topPositionDesktop = BASE_TOP_DESKTOP + activityOffset + raffleOffset;

  const hasMatches = eliteMatches && eliteMatches.length > 0;

  return (
    <div
      className={`max-md:relative md:fixed max-md:flex-1 max-md:flex max-md:justify-center z-50 transition-all duration-300 md:bottom-auto md:left-16`}
      style={{
        // On desktop: use top positioning
        top: isDesktop ? `${topPositionDesktop}px` : undefined
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => handleSetExpanded(!isExpanded)}
        className="max-md:mx-auto bg-gradient-to-br from-amber-500/90 to-yellow-600/90 backdrop-blur-lg rounded-full p-2.5 md:p-4 border-2 border-amber-400/40 hover:border-amber-400/70 transition-all hover:scale-110 shadow-xl relative group"
        aria-label={isExpanded ? "Close elite matches" : "Open elite matches"}
      >
        <Crown size={18} className="text-white md:w-6 md:h-6" />

        {/* Sync Circle Animation */}
        {syncing && (
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
        )}

        {/* Match Count Badge */}
        {hasMatches && (
          <div className="absolute -top-1 -right-1 bg-amber-700 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
            <span className="text-white text-[10px] md:text-xs font-bold">{eliteMatches.length}</span>
          </div>
        )}

        {/* Tooltip */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Elite Matches
        </div>
      </button>

      {/* Expanded State */}
      {isExpanded && (
        <div className="max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:mt-3 bg-gradient-to-br from-amber-600/20 to-yellow-600/20 backdrop-blur-lg rounded-xl p-4 border-2 border-amber-400/40 shadow-2xl md:w-[464px] max-h-[calc(100vh-7rem)] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-amber-400" />
              <h3 className="text-white font-bold text-sm">Elite Matches</h3>
              {hasMatches && (
                <span className="text-amber-300 text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">
                  {eliteMatches.length} matches
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Refresh Button */}
              <button
                onClick={onRefresh}
                disabled={syncing}
                className="text-amber-300 hover:text-amber-100 transition-colors p-1 hover:bg-amber-700/30 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh"
                title="Refresh elite matches"
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              </button>
              {/* Close Button */}
              <button
                onClick={() => handleSetExpanded(false)}
                className="text-amber-300 hover:text-amber-100 transition-colors p-1 hover:bg-amber-700/30 rounded"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* What are Elite Matches? Link */}
          <a
            href="#elite-matches"
            onClick={handleEliteMatchesClick}
            className="block w-full text-center text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 text-xs mb-3 py-2 px-4 rounded-lg border border-amber-400/30 hover:border-amber-400/50 transition-all cursor-pointer"
          >
            What are Elite Matches?
          </a>

          {/* Matches List */}
          <div className="overflow-y-auto flex-1 space-y-2 pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-amber-500/60 [&::-webkit-scrollbar-thumb]:to-yellow-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">
            {!hasMatches ? (
              <div className="text-center py-8 text-amber-300/60">
                <Swords size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No elite matches yet</p>
                <p className="text-xs mt-1">High-tier tournament finals will appear here</p>
              </div>
            ) : (
              eliteMatches.map((match, idx) => {
                const loser = getLoser(match);
                const zeroAddress = '0x0000000000000000000000000000000000000000';
                const hasWinner = match.winner && match.winner !== zeroAddress;
                const matchTime = match.lastMoveTime > 0n ? match.lastMoveTime : match.startTime;

                return (
                  <div
                    key={idx}
                    className="bg-black/20 border border-amber-400/20 rounded-lg p-3 hover:border-amber-400/40 transition-colors"
                  >
                    {/* Match Header - Time */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-amber-300/60 text-xs">
                        <Clock size={12} />
                        <span>{formatDate(matchTime)}</span>
                      </div>
                      {match.isDraw && (
                        <span className="text-xs bg-gray-500/30 text-gray-300 px-2 py-0.5 rounded">
                          Draw
                        </span>
                      )}
                    </div>

                    {/* Players */}
                    <div className="space-y-1.5">
                      {/* Winner */}
                      {hasWinner && !match.isDraw && (
                        <div className="flex items-center gap-2">
                          <Trophy size={14} className="text-amber-400" />
                          <span className={`text-sm font-semibold ${isUser(match.winner) ? 'text-green-400' : 'text-amber-200'}`}>
                            {isUser(match.winner) ? 'You' : shortenAddress(match.winner)}
                          </span>
                          <span className="text-[10px] text-amber-400/60 uppercase">Winner</span>
                        </div>
                      )}

                      {/* Loser */}
                      {loser && !match.isDraw && (
                        <div className="flex items-center gap-2 ml-5">
                          <span className={`text-sm ${isUser(loser) ? 'text-red-400' : 'text-amber-300/70'}`}>
                            {isUser(loser) ? 'You' : shortenAddress(loser)}
                          </span>
                          <span className="text-[10px] text-amber-400/40 uppercase">Lost</span>
                        </div>
                      )}

                      {/* Draw case - show both players */}
                      {match.isDraw && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-amber-300/70">
                              {isUser(match.player1) ? 'You' : shortenAddress(match.player1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-amber-300/70">
                              {isUser(match.player2) ? 'You' : shortenAddress(match.player2)}
                            </span>
                          </div>
                        </>
                      )}

                      {/* In Progress - no winner yet */}
                      {!hasWinner && !match.isDraw && (
                        <>
                          <div className="flex items-center gap-2">
                            <Swords size={14} className="text-amber-400/60" />
                            <span className={`text-sm ${isUser(match.player1) ? 'text-green-400' : 'text-amber-300/70'}`}>
                              {isUser(match.player1) ? 'You' : shortenAddress(match.player1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-5">
                            <span className="text-xs text-amber-400/60">vs</span>
                            <span className={`text-sm ${isUser(match.player2) ? 'text-green-400' : 'text-amber-300/70'}`}>
                              {isUser(match.player2) ? 'You' : shortenAddress(match.player2)}
                            </span>
                          </div>
                          <div className="text-[10px] text-orange-400 mt-1">In Progress</div>
                        </>
                      )}
                    </div>

                    {/* View Match Button */}
                    <button
                      onClick={() => onViewMatch(eliteMatches.length - 1 - idx)}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 rounded-lg transition-all border border-amber-400/30 hover:border-amber-400/50 text-sm"
                    >
                      <Eye size={14} />
                      View Match
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EliteMatchesCard;
