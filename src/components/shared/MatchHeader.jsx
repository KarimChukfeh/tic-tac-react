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
import UserManualAnchorLink from './UserManualAnchorLink';
import { getUserManualHrefForReasonCode } from '../../utils/userManualLinks';

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
      return { text: 'Not Started', className: 'bg-gray-500/20 text-gray-300', href: null };
    }
    if (matchStatus === 1) {
      return { text: 'In Progress', className: 'bg-yellow-500/20 text-yellow-300', href: null };
    }
    if (matchStatus === 2) {
      const neutralReasonLabel = useV2ReasonLabels ? getV2NeutralMatchReasonLabel(completionReason) : '';
      const v2StatusMap = {
        0: { text: 'Resolved Normally', href: getUserManualHrefForReasonCode('R0') },
        1: { text: 'Resolved via ML1 Timeout Victory', href: getUserManualHrefForReasonCode('ML1') },
        2: { text: 'Resolved via R1 Draw Resolution', href: getUserManualHrefForReasonCode('R1') },
        3: { text: 'Resolved via ML2 Advanced Player Elimination', href: getUserManualHrefForReasonCode('ML2') },
        4: { text: 'Resolved via ML3 Outsider Replacement', href: getUserManualHrefForReasonCode('ML3') },
      };
      const normalizedReason = Number(completionReason ?? 0);
      const mappedV2Status = useV2ReasonLabels ? v2StatusMap[normalizedReason] : null;
      return {
        text: mappedV2Status?.text
          ?? (isDraw(completionReason)
            ? (useV2ReasonLabels && neutralReasonLabel
              ? `Completed via ${neutralReasonLabel}`
              : 'Draw')
            : (useV2ReasonLabels && v2ReasonCode && v2ReasonCode !== 'R0'
              ? `Resolved via ${v2ReasonCode}`
              : 'Resolved')),
        className: 'bg-green-500/20 text-green-300',
        href: mappedV2Status?.href ?? null,
      };
    }
    return { text: 'Unknown', className: 'bg-gray-500/20 text-gray-300', href: null };
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
  const winnerLabel = shortenAddress(tournamentInfo?.winner);
  const renderAddressPill = (label, tone = 'cyan') => {
    const tones = {
      cyan: 'border-cyan-300/35 bg-cyan-400/12 text-cyan-100',
      pink: 'border-pink-300/35 bg-pink-400/12 text-pink-100',
      emerald: 'border-emerald-300/35 bg-emerald-400/12 text-emerald-100',
      amber: 'border-amber-300/35 bg-amber-400/12 text-amber-100',
    };
    return (
      <span className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-xs shadow-[0_0_16px_rgba(255,255,255,0.06)] ${tones[tone] || tones.cyan}`}>
        {label}
      </span>
    );
  };
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
  const completedMatchExplanation = (() => {
    if (!isV2MatchHeader || matchStatus !== 2) return null;

    const reason = Number(completionReason ?? 0);
    const player1Address = tournamentInfo?.player1?.toLowerCase();
    const player2Address = tournamentInfo?.player2?.toLowerCase();
    const winnerAddress = tournamentInfo?.winner?.toLowerCase();
    const winnerIsPlayer1 = winnerAddress && player1Address && winnerAddress === player1Address;
    const winnerIsPlayer2 = winnerAddress && player2Address && winnerAddress === player2Address;
    const winnerPlayerLabel = winnerIsPlayer1 ? player1Label : winnerIsPlayer2 ? player2Label : winnerLabel;
    const loserPlayerLabel = winnerIsPlayer1 ? player2Label : winnerIsPlayer2 ? player1Label : player2Label;
    const winnerPlayerPill = winnerIsPlayer1
      ? renderAddressPill(player1Label, 'cyan')
      : winnerIsPlayer2
        ? renderAddressPill(player2Label, 'pink')
        : renderAddressPill(winnerLabel, 'emerald');
    const loserPlayerPill = winnerIsPlayer1
      ? renderAddressPill(player2Label, 'pink')
      : winnerIsPlayer2
        ? renderAddressPill(player1Label, 'cyan')
        : renderAddressPill(player2Label, 'pink');

    if (reason === 0) {
      if (_gameType === 'chess') {
        return <>{winnerPlayerPill} <span>wins because they checkmated</span> {loserPlayerPill}</>;
      }
      if (_gameType === 'connectfour') {
        return <>{winnerPlayerPill} <span>wins because they connected 4 in a row before</span> {loserPlayerPill}</>;
      }
      return <>{winnerPlayerPill} <span>wins because they connected 3 in a row before</span> {loserPlayerPill}</>;
    }

    if (reason === 2) {
      return <>Both players {renderAddressPill(player1Label, 'cyan')} <span>and</span> {renderAddressPill(player2Label, 'pink')} <span>played until a draw</span></>;
    }

    if (reason === 1) {
      return <>{winnerPlayerPill} <span>wins because they claimed victory by timeout after</span> {loserPlayerPill}<span>'s clock has run out</span></>;
    }

    if (reason === 3) {
      return <>Both players {renderAddressPill(player1Label, 'cyan')} <span>and</span> {renderAddressPill(player2Label, 'pink')} <span>stalled and were eliminated by</span> {renderAddressPill(winnerLabel, 'amber')}</>;
    }

    if (reason === 4) {
      return <>Both players {renderAddressPill(player1Label, 'cyan')} <span>and</span> {renderAddressPill(player2Label, 'pink')} <span>stalled and were replaced by</span> {renderAddressPill(winnerLabel, 'amber')}</>;
    }

    return null;
  })();

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
            <>
              {status.href ? (
                <UserManualAnchorLink
                  href={status.href}
                  className={`mt-4 inline-flex px-4 py-2 rounded-xl font-bold underline decoration-dotted underline-offset-4 hover:opacity-80 transition-colors ${status.className}`}
                  title={`Learn more about ${status.text} in the User Manual`}
                >
                  {status.text}
                </UserManualAnchorLink>
              ) : (
                <div className={`mt-4 inline-flex px-4 py-2 rounded-xl font-bold ${status.className}`}>
                  {status.text}
                </div>
              )}
              {completedMatchExplanation && (
                <div className="mt-4 max-w-3xl">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-purple-200/75">
                    Reasoning
                  </div>
                  <div className="text-sm leading-relaxed text-purple-100/90 flex flex-wrap items-center gap-x-1.5 gap-y-2">
                    {completedMatchExplanation}
                  </div>
                </div>
              )}
            </>
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
