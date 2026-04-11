/**
 * MatchHeader - Shared component for match page header
 *
 * Displays back button, game title, sync indicator, and status badge.
 * Adapts styling based on gameType for theme consistency.
 */

import { ChevronDown } from 'lucide-react';
import { getTournamentTypeLabel, shortenAddress } from '../../utils/formatters';
import { isDraw } from '../../utils/completionReasons';
import { getV2NeutralMatchReasonLabel, getV2ReasonCode } from '../../v2/lib/reasonLabels';

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
    const v2ReasonCode = getV2ReasonCode(completionReason);
    if (matchStatus === 0) {
      return { text: 'Not Started', className: 'bg-gray-500/20 text-gray-300' };
    }
    if (matchStatus === 1) {
      return { text: 'In Progress', className: 'bg-yellow-500/20 text-yellow-300' };
    }
    if (matchStatus === 2) {
      const neutralReasonLabel = useV2ReasonLabels ? getV2NeutralMatchReasonLabel(completionReason) : '';
      return {
        text: isDraw(completionReason)
          ? (useV2ReasonLabels && neutralReasonLabel
            ? `Completed via ${neutralReasonLabel}`
            : 'Draw')
          : (useV2ReasonLabels && v2ReasonCode && v2ReasonCode !== 'R0'
            ? `Complete via ${v2ReasonCode}`
            : 'Complete'),
        className: 'bg-green-500/20 text-green-300'
      };
    }
    return { text: 'Unknown', className: 'bg-gray-500/20 text-gray-300' };
  };

  const status = getStatusBadge();
  const isV2MatchHeader = reasonLabelMode === 'v2';

  // Determine tournament type label (Duel vs Tournament) if playerCount is available
  const tournamentTypeLabel = tournamentInfo?.playerCount
    ? getTournamentTypeLabel(tournamentInfo.playerCount)
    : 'Tournament';
  const isDuel = tournamentInfo?.playerCount === 2;
  const player1Label = shortenAddress(tournamentInfo?.player1);
  const player2Label = shortenAddress(tournamentInfo?.player2);
  const headerTitle = isV2MatchHeader
    ? (isDuel
      ? 'Duel'
      : `Match ${Number(tournamentInfo?.matchNumber ?? 0) + 1} • Round ${Number(tournamentInfo?.roundNumber ?? 0) + 1}`)
    : title;
  const headerSubtitle = isV2MatchHeader
    ? `${player1Label} vs ${player2Label}`
    : (tournamentInfo
      ? `T${tournamentInfo.tierId + 1}-I${tournamentInfo.instanceId + 1} • Round ${tournamentInfo.roundNumber + 1} • Match ${tournamentInfo.matchNumber + 1}`
      : null);

  return (
    <div className={`bg-gradient-to-r ${theme.headerBg} backdrop-blur-lg rounded-2xl p-6 border ${theme.headerBorder} mb-8`}>
      <button
        onClick={onClose}
        className={`mb-4 flex items-center gap-2 ${theme.textMuted} hover:text-white transition-colors`}
      >
        <ChevronDown className="rotate-90" size={20} />
        {isV2MatchHeader ? 'Back' : `Back to ${tournamentTypeLabel}`}
      </button>

      <div className={`mb-4 ${isV2MatchHeader ? '' : 'flex items-center justify-between'}`}>
        <div>
          <div className="flex items-center gap-3">
            {icon && <span className="text-3xl">{icon}</span>}
            <h2 className="text-3xl font-bold text-white">
              {headerTitle}
            </h2>
          </div>
          {headerSubtitle && (
            isV2MatchHeader ? (
              <div className={`mt-3 flex flex-wrap items-center gap-2 ${theme.textMuted}`}>
                <span className="rounded-full border border-cyan-300/35 bg-cyan-400/12 px-3 py-1 font-mono text-sm text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
                  {player1Label}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-purple-200/80">
                  vs
                </span>
                <span className="rounded-full border border-pink-300/35 bg-pink-400/12 px-3 py-1 font-mono text-sm text-pink-100 shadow-[0_0_20px_rgba(244,114,182,0.12)]">
                  {player2Label}
                </span>
              </div>
            ) : (
              <p className={`${theme.textMuted} mt-2`}>
                {headerSubtitle}
              </p>
            )
          )}
          {isV2MatchHeader && (
            <div className={`mt-4 inline-flex px-4 py-2 rounded-xl font-bold ${status.className}`}>
              {status.text}
            </div>
          )}
        </div>
        {!isV2MatchHeader && (
          <div className={`px-4 py-2 rounded-xl font-bold ${status.className}`}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchHeader;
