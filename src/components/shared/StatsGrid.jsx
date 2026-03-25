/**
 * Shared StatsGrid Component
 *
 * Displays a 3-column grid with tournament stats: Players, Status, Current Round.
 * Used in tournament bracket headers.
 */

/**
 * Get status display text and styling from status code
 * @param {number} status - 0: Enrolling, 1: In Progress, 2: Completed
 * @returns {Object} { text, color, bgColor, borderColor }
 */
const getStatusDisplay = (status) => {
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
 * @param {number} props.status - Tournament status (0: Enrolling, 1: In Progress, 2: Completed)
 * @param {number} props.currentRound - Current round (0-indexed)
 * @param {number} props.totalRounds - Total number of rounds
 * @param {Object} props.colors - Color theme object with 'text' property
 * @param {number} props.syncDots - Number of dots for syncing indicator (1-3)
 */
const StatsGrid = ({ enrolledCount, playerCount, status, currentRound, totalRounds, colors, syncDots = 1 }) => {
  const statusDisplay = getStatusDisplay(status);

  // Don't show status message if tournament is enrolling with 0 players
  const showStatus = !(status === 0 && enrolledCount === 0);

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      <div className="bg-black/20 rounded-lg p-2 md:p-4">
        <div className={`${colors.text} text-xs md:text-sm mb-1`}>Players</div>
        <div className="text-white font-bold text-sm md:text-xl">{enrolledCount} / {playerCount}</div>
      </div>
      <div className={`${showStatus ? `${statusDisplay.bgColor} border ${statusDisplay.borderColor}` : 'bg-black/20'} rounded-lg p-2 md:p-4`}>
        <div className={`${colors.text} text-xs md:text-sm mb-1`}>Status</div>
        {showStatus ? (
          <div className="flex flex-col gap-1">
            <div className={`${statusDisplay.color} font-bold text-xs md:text-base flex items-center gap-1 md:gap-2`}>
              <div className={`w-1.5 md:w-2 h-1.5 md:h-2 ${statusDisplay.dotColor} rounded-full ${status < 2 ? 'animate-pulse' : ''}`}></div>
              <span className="truncate">{statusDisplay.text}</span>
            </div>
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
        <div className={`${colors.text} text-xs md:text-sm mb-1`}>Round</div>
        <div className="text-white font-bold text-sm md:text-xl">{currentRound + 1}/{totalRounds}</div>
      </div>
    </div>
  );
};

export default StatsGrid;
