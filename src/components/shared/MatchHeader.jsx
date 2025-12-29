/**
 * MatchHeader - Shared component for match page header
 *
 * Displays back button, game title, sync indicator, and status badge.
 * Adapts styling based on gameType for theme consistency.
 */

import { ChevronDown } from 'lucide-react';

const MatchHeader = ({
  // gameType available for future game-specific customization
  gameType: _gameType,
  title,
  icon,
  matchStatus,
  isDraw,
  onClose,
  tournamentInfo, // { tierId, instanceId, roundNumber, matchNumber }
  theme
}) => {
  const getStatusBadge = () => {
    if (matchStatus === 0) {
      return { text: 'Not Started', className: 'bg-gray-500/20 text-gray-300' };
    }
    if (matchStatus === 1) {
      return { text: 'In Progress', className: 'bg-yellow-500/20 text-yellow-300' };
    }
    if (matchStatus === 2) {
      return { text: isDraw ? 'Draw' : 'Complete', className: 'bg-green-500/20 text-green-300' };
    }
    return { text: 'Unknown', className: 'bg-gray-500/20 text-gray-300' };
  };

  const status = getStatusBadge();

  return (
    <div className={`bg-gradient-to-r ${theme.headerBg} backdrop-blur-lg rounded-2xl p-6 border ${theme.headerBorder} mb-8`}>
      <button
        onClick={onClose}
        className={`mb-4 flex items-center gap-2 ${theme.textMuted} hover:text-white transition-colors`}
      >
        <ChevronDown className="rotate-90" size={20} />
        Back to Tournament
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            {icon && <span className="text-3xl">{icon}</span>}
            <h2 className="text-3xl font-bold text-white">
              {title}
            </h2>
          </div>
          {tournamentInfo && (
            <p className={`${theme.textMuted} mt-2`}>
              T{tournamentInfo.tierId + 1}-I{tournamentInfo.instanceId + 1} • Round {tournamentInfo.roundNumber + 1} • Match {tournamentInfo.matchNumber + 1}
            </p>
          )}
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold ${status.className}`}>
          {status.text}
        </div>
      </div>
    </div>
  );
};

export default MatchHeader;
