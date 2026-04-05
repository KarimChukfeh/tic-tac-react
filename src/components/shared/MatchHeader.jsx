/**
 * MatchHeader - Shared component for match page header
 *
 * Displays back button, game title, sync indicator, and status badge.
 * Adapts styling based on gameType for theme consistency.
 */

import { ChevronDown } from 'lucide-react';
import { getTournamentTypeLabel } from '../../utils/formatters';
import { isDraw } from '../../utils/completionReasons';
import { getV2NeutralMatchReasonLabel } from '../../v2/lib/reasonLabels';

const MatchHeader = ({
  // gameType available for future game-specific customization
  gameType: _gameType,
  title,
  icon,
  matchStatus,
  completionReason,
  onClose,
  tournamentInfo, // { tierId, instanceId, roundNumber, matchNumber, playerCount }
  theme,
  reasonLabelMode = 'default',
}) => {
  const getStatusBadge = () => {
    const useV2ReasonLabels = reasonLabelMode === 'v2';
    if (matchStatus === 0) {
      return { text: 'Not Started', className: 'bg-gray-500/20 text-gray-300' };
    }
    if (matchStatus === 1) {
      return { text: 'In Progress', className: 'bg-yellow-500/20 text-yellow-300' };
    }
    if (matchStatus === 2) {
      return {
        text: isDraw(completionReason)
          ? (useV2ReasonLabels ? getV2NeutralMatchReasonLabel(completionReason) : 'Draw')
          : 'Complete',
        className: 'bg-green-500/20 text-green-300'
      };
    }
    return { text: 'Unknown', className: 'bg-gray-500/20 text-gray-300' };
  };

  const status = getStatusBadge();

  // Determine tournament type label (Duel vs Tournament) if playerCount is available
  const tournamentTypeLabel = tournamentInfo?.playerCount
    ? getTournamentTypeLabel(tournamentInfo.playerCount)
    : 'Tournament';

  return (
    <div className={`bg-gradient-to-r ${theme.headerBg} backdrop-blur-lg rounded-xl md:rounded-2xl p-4 md:p-6 border ${theme.headerBorder} mb-4 md:mb-8`}>
      <button
        onClick={onClose}
        className={`mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base ${theme.textMuted} hover:text-white transition-colors`}
      >
        <ChevronDown className="rotate-90" size={20} />
        Back to {tournamentTypeLabel}
      </button>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 md:gap-3">
            {icon && <span className="text-xl md:text-3xl">{icon}</span>}
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {title}
            </h2>
          </div>
          {tournamentInfo && (
            <>
              <p className={`hidden md:block ${theme.textMuted} mt-2`}>
              T{tournamentInfo.tierId + 1}-I{tournamentInfo.instanceId + 1} • Round {tournamentInfo.roundNumber + 1} • Match {tournamentInfo.matchNumber + 1}
              </p>
              <p className={`md:hidden ${theme.textMuted} mt-1 text-sm`}>
                T{tournamentInfo.tierId + 1}-I{tournamentInfo.instanceId + 1} • R{tournamentInfo.roundNumber + 1} • M{tournamentInfo.matchNumber + 1}
              </p>
            </>
          )}
        </div>
        <div className={`self-start md:self-auto px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-sm md:text-base font-bold ${status.className}`}>
          {status.text}
        </div>
      </div>
    </div>
  );
};

export default MatchHeader;
