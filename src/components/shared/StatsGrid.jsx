/**
 * Shared StatsGrid Component
 *
 * Displays a 3-column grid with tournament stats: Players, Status, Current Round.
 * Used in tournament bracket headers.
 */

import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CompletionReason } from '../../utils/completionReasons';
import { shortenAddress } from '../../utils/formatters';

const getCompactMobileAddress = (address) => {
  if (!address || address === '0x0000000000000000000000000000000000000000') return 'TBD';
  return `${address.slice(0, 5)}..`;
};

/**
 * Get status display text and styling from status code
 * @param {number} status - 0: Enrolling, 1: In Progress, 2: Completed, 3: Cancelled
 * @param {number|null} resolutionReason - Tournament completion reason
 * @returns {Object} { text, color, bgColor, borderColor }
 */
const getStatusDisplay = (status, resolutionReason = null) => {
  if (status >= 2 && Number(resolutionReason) === CompletionReason.ABANDONED_TOURNAMENT_CLAIMED) {
    return {
      text: 'Abandoned',
      color: 'text-red-300',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-400',
      dotColor: 'bg-red-400'
    };
  }
  if (status >= 2 && Number(resolutionReason) === CompletionReason.SOLO_ENROLL_CANCELLED) {
    return {
      text: 'Cancelled',
      color: 'text-slate-300',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-400',
      dotColor: 'bg-slate-400'
    };
  }
  switch (status) {
    case 0:
      return {
        text: 'Enrolment',
        color: 'text-yellow-300',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-400',
        dotColor: 'bg-yellow-400'
      };
    case 1:
      return {
        text: 'In Progress',
        color: 'text-green-300',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-400',
        dotColor: 'bg-green-400'
      };
    case 2:
      return {
        text: 'Completed',
        color: 'text-green-300',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-400',
        dotColor: 'bg-green-400'
      };
    case 3:
      return {
        text: 'Cancelled',
        color: 'text-slate-300',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-400',
        dotColor: 'bg-slate-400'
      };
    default:
      return {
        text: 'Unknown',
        color: 'text-white',
        bgColor: 'bg-black/20',
        borderColor: 'border-gray-400',
        dotColor: 'bg-gray-400'
      };
  }
};

/**
 * @param {Object} props
 * @param {number} props.enrolledCount - Number of enrolled players
 * @param {number} props.playerCount - Max players in tournament
 * @param {number} props.status - Tournament status (0: Enrolling, 1: In Progress, 2: Completed, 3: Cancelled)
 * @param {number} props.currentRound - Current round (0-indexed)
 * @param {number} props.totalRounds - Total number of rounds
 * @param {Object} props.colors - Color theme object with 'text' property
 * @param {number} props.syncDots - Number of dots for syncing indicator (1-3)
 * @param {number|null} props.resolutionReason - Tournament completion reason
 * @param {number|null} props.statusTimerTarget - Unix timestamp when the status timer expires
 * @param {boolean} props.hideRoundCard - Whether to omit the round card entirely
 * @param {React.ReactNode|null} props.statusDetail - Optional secondary line inside the status card
 * @param {string[]|null} props.playersDetails - Optional expandable list of enrolled player addresses
 * @param {string|null} props.account - Current user's address
 * @param {string|null} props.thirdCardLabel - Optional replacement label for the third card
 * @param {React.ReactNode|null} props.thirdCardContent - Optional replacement content for the third card
 */
const StatsGrid = ({
  enrolledCount,
  playerCount,
  status,
  currentRound,
  totalRounds,
  colors,
  syncDots = 1,
  resolutionReason = null,
  statusTimerTarget = null,
  hideRoundCard = false,
  statusDetail = null,
  playersDetails = null,
  account = null,
  thirdCardLabel = null,
  thirdCardContent = null,
}) => {
  const statusDisplay = getStatusDisplay(status, resolutionReason);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [playersExpanded, setPlayersExpanded] = useState(false);

  // Don't show status message if tournament is enrolling with 0 players
  const showStatus = !(status === 0 && enrolledCount === 0);
  const showStatusTimer = status === 0 && enrolledCount > 0 && Number(statusTimerTarget) > 0;
  const timeRemaining = showStatusTimer ? Math.max(0, Number(statusTimerTarget) - now) : 0;
  const hasPlayerDetails = Array.isArray(playersDetails) && playersDetails.length > 0;
  const showReplacementThirdCard = hideRoundCard && (thirdCardLabel || thirdCardContent);
  const gridColumnCount = showReplacementThirdCard || !hideRoundCard ? 3 : 2;

  useEffect(() => {
    if (!showStatusTimer) return undefined;

    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [showStatusTimer, statusTimerTarget]);

  useEffect(() => {
    setPlayersExpanded(false);
  }, [status, enrolledCount, playerCount, hasPlayerDetails]);

  const formatStatusTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className={`grid ${gridColumnCount === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 md:gap-4`}>
      <div className={`${showStatus ? `${statusDisplay.bgColor} border ${statusDisplay.borderColor}` : 'bg-black/20'} rounded-lg p-2 md:p-4`}>
        <div className={`${colors.text} text-xs md:text-sm mb-1`}>Status</div>
        {showStatus ? (
          <div className="flex flex-col gap-1">
            <div className={`${statusDisplay.color} font-bold text-xs md:text-base flex items-center gap-1 md:gap-2`}>
              <div className={`w-1.5 md:w-2 h-1.5 md:h-2 ${statusDisplay.dotColor} rounded-full ${status < 2 ? 'animate-pulse' : ''}`}></div>
              <span className="truncate">{statusDisplay.text}</span>
            </div>
            {showStatusTimer && (
              <div className="text-orange-300 text-[11px] md:text-sm font-semibold">
                {timeRemaining > 0 ? `Window closes in ${formatStatusTimer(timeRemaining)}` : 'Enrolment window elapsed'}
              </div>
            )}
            {statusDetail && (
              <div className="text-[11px] md:text-sm">
                {statusDetail}
              </div>
            )}
            {status < 2 && (
              <div className="hidden md:flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-cyan-400 text-sm font-semibold">
                  Syncing{'.'.repeat(syncDots)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-white/50 font-bold text-xs md:text-base">-</div>
        )}
      </div>
      <div className="bg-black/20 rounded-lg p-2 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className={`${colors.text} text-xs md:text-sm mb-1`}>Players</div>
            <div className="text-white font-bold text-sm md:text-xl">{enrolledCount} / {playerCount}</div>
          </div>
          {hasPlayerDetails && (
            <button
              type="button"
              onClick={() => setPlayersExpanded((expanded) => !expanded)}
              className={`${colors.text} ${colors.textHover ?? ''} shrink-0 inline-flex items-center gap-1 text-[11px] md:text-xs font-semibold transition-colors`}
              aria-expanded={playersExpanded}
              aria-label={playersExpanded ? 'Collapse players' : 'Expand players'}
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${playersExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
        {hasPlayerDetails && playersExpanded && (
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-purple-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/70 [&::-webkit-scrollbar-thumb]:to-blue-500/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:from-purple-400 hover:[&::-webkit-scrollbar-thumb]:to-blue-400 [scrollbar-width:thin] [scrollbar-color:rgb(168_85_247_/_0.7)_rgb(24_24_27_/_0.4)]">
            {playersDetails.map((address, index) => {
              const isCurrentUser = address?.toLowerCase() === account?.toLowerCase();
              return (
                <div
                  key={`${address}-${index}`}
                  className={`rounded-md border px-2 py-1.5 font-mono text-[11px] leading-relaxed break-all ${
                    isCurrentUser
                      ? 'border-yellow-400/50 bg-yellow-500/15 text-yellow-200'
                      : 'border-purple-400/20 bg-purple-500/10 text-purple-200'
                  }`}
                >
                  <span className="md:hidden">{getCompactMobileAddress(address)}</span>
                  <span className="hidden md:inline">{shortenAddress(address)}</span>
                  {isCurrentUser && <span className="ml-2 text-[10px] font-sans uppercase tracking-wide text-yellow-300">You</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!hideRoundCard && (
        <div className="bg-black/20 rounded-lg p-2 md:p-4">
          <div className={`${colors.text} text-xs md:text-sm mb-1`}>Round</div>
          <div className="text-white font-bold text-sm md:text-xl">{currentRound + 1}/{totalRounds}</div>
        </div>
      )}
      {showReplacementThirdCard && (
        <div className="bg-black/20 rounded-lg p-2 md:p-4">
          <div className={`${colors.text} text-xs md:text-sm mb-1`}>{thirdCardLabel}</div>
          {thirdCardContent}
        </div>
      )}
    </div>
  );
};

export default StatsGrid;
