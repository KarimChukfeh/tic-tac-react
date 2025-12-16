/**
 * Shared StatsGrid Component
 *
 * Displays a 3-column grid with tournament stats: Players, Status, Current Round.
 * Used in tournament bracket headers.
 */

/**
 * Get status display text from status code
 * @param {number} status - 0: Enrolling, 1: In Progress, 2: Completed
 * @returns {string}
 */
const getStatusText = (status) => {
  switch (status) {
    case 0: return 'Enrolling';
    case 1: return 'In Progress';
    case 2: return 'Completed';
    default: return 'Unknown';
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
 */
const StatsGrid = ({ enrolledCount, playerCount, status, currentRound, totalRounds, colors }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-black/20 rounded-lg p-4">
        <div className={`${colors.text} text-sm mb-1`}>Players</div>
        <div className="text-white font-bold text-xl">{enrolledCount} / {playerCount}</div>
      </div>
      <div className="bg-black/20 rounded-lg p-4">
        <div className={`${colors.text} text-sm mb-1`}>Status</div>
        <div className="text-white font-bold text-xl">
          {getStatusText(status)}
        </div>
      </div>
      <div className="bg-black/20 rounded-lg p-4">
        <div className={`${colors.text} text-sm mb-1`}>Current Round</div>
        <div className="text-white font-bold text-xl">Round {currentRound + 1}</div>
      </div>
    </div>
  );
};

export default StatsGrid;
