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
  account,
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
  const shouldHidePrimaryResolvedBadge = isV2MatchHeader
    && matchStatus === 2
    && [0, 1, 2, 3, 4].includes(Number(completionReason ?? 0));

  // Determine tournament type label (Duel vs Tournament) if playerCount is available
  const tournamentTypeLabel = tournamentInfo?.playerCount
    ? getTournamentTypeLabel(tournamentInfo.playerCount)
    : 'Tournament';
  const isDuel = tournamentInfo?.playerCount === 2;
  const player1Label = shortenAddress(tournamentInfo?.player1);
  const player2Label = shortenAddress(tournamentInfo?.player2);
  const winnerLabel = shortenAddress(tournamentInfo?.winner);
  const connectedAccount = account?.toLowerCase?.() || null;
  const renderYouBadge = () => (
    <span className="absolute -right-1 -top-3 rounded-full border border-yellow-300/50 bg-yellow-400/90 px-1 py-[1px] text-[7px] font-black uppercase tracking-[0.16em] text-yellow-950 shadow-[0_0_10px_rgba(250,204,21,0.45)] animate-bounce">
      YOU
    </span>
  );
  const renderAddressPill = (label, tone = 'cyan', symbol = null, address = null, options = {}) => {
    const tones = {
      cyan: 'border-cyan-300/35 bg-cyan-400/12 text-cyan-100',
      pink: 'border-pink-300/35 bg-pink-400/12 text-pink-100',
      emerald: 'border-emerald-300/35 bg-emerald-400/12 text-emerald-100',
      amber: 'border-amber-300/35 bg-amber-400/12 text-amber-100',
    };
    const isConnectedWallet = connectedAccount && address?.toLowerCase?.() === connectedAccount;
    const { symbolPosition = 'after', symbolSize = 'default' } = options;
    return (
      <span className={`relative inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] shadow-[0_0_16px_rgba(255,255,255,0.06)] md:px-2.5 md:text-xs ${tones[tone] || tones.cyan}`}>
        {symbol && symbolPosition === 'before' ? renderMatchHistorySymbol(symbol, symbolSize) : null}
        <span className="font-mono">{label}</span>
        {symbol && symbolPosition !== 'before' ? renderMatchHistorySymbol(symbol, symbolSize) : null}
        {isConnectedWallet ? renderYouBadge() : null}
      </span>
    );
  };
  const renderMatchHistorySymbol = (symbol, size = 'default') => {
    if (!symbol) return null;
    const isSmall = size === 'small';

    if (symbol === 'White' || symbol === 'Black') {
      return (
        <img
          src={symbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
          alt={symbol}
          className={`${isSmall ? 'h-4 w-4' : 'h-6 w-6'} shrink-0 inline-block`}
          draggable="false"
        />
      );
    }

    if (symbol === 'X') {
      return (
        <span className={`relative inline-block ${isSmall ? 'h-4 w-4' : 'h-6 w-6'} shrink-0`} aria-hidden="true">
          <span className={`absolute inset-0 left-1/2 h-full ${isSmall ? 'w-[2px]' : 'w-[3px]'} -translate-x-1/2 rotate-45 bg-blue-500`} />
          <span className={`absolute inset-0 left-1/2 h-full ${isSmall ? 'w-[2px]' : 'w-[3px]'} -translate-x-1/2 -rotate-45 bg-blue-500`} />
        </span>
      );
    }

    if (symbol === 'O') {
      return <span className={`inline-block ${isSmall ? 'h-4 w-4 border-2' : 'h-6 w-6 border-[3px]'} shrink-0 rounded-full border-red-500`} aria-hidden="true" />;
    }

    if (symbol === 'Red' || symbol === 'Blue') {
      return <span className={`inline-block ${isSmall ? 'h-4 w-4' : 'h-6 w-6'} shrink-0 rounded-full ${symbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`} aria-hidden="true" />;
    }

    return <span className="font-semibold text-white">{symbol}</span>;
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
  const statusSectionLabel = isV2MatchHeader && matchStatus === 2 ? 'Resolution' : 'Status';
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
      ? renderAddressPill(player1Label, 'cyan', tournamentInfo?.player1Symbol, tournamentInfo?.player1, { symbolPosition: 'before', symbolSize: 'small' })
      : winnerIsPlayer2
        ? renderAddressPill(player2Label, 'pink', tournamentInfo?.player2Symbol, tournamentInfo?.player2, { symbolPosition: 'before', symbolSize: 'small' })
        : renderAddressPill(winnerLabel, 'emerald', null, tournamentInfo?.winner);
    const loserPlayerPill = winnerIsPlayer1
      ? renderAddressPill(player2Label, 'pink', tournamentInfo?.player2Symbol, tournamentInfo?.player2, { symbolPosition: 'before', symbolSize: 'small' })
      : winnerIsPlayer2
        ? renderAddressPill(player1Label, 'cyan', tournamentInfo?.player1Symbol, tournamentInfo?.player1, { symbolPosition: 'before', symbolSize: 'small' })
        : renderAddressPill(player2Label, 'pink', tournamentInfo?.player2Symbol, tournamentInfo?.player2, { symbolPosition: 'before', symbolSize: 'small' });

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
      return <>Both players {renderAddressPill(player1Label, 'cyan', tournamentInfo?.player1Symbol, tournamentInfo?.player1, { symbolPosition: 'before', symbolSize: 'small' })} <span>and</span> {renderAddressPill(player2Label, 'pink', tournamentInfo?.player2Symbol, tournamentInfo?.player2, { symbolPosition: 'before', symbolSize: 'small' })} <span>played until a draw</span></>;
    }

    if (reason === 1) {
      return <>{winnerPlayerPill} <span>wins because they claimed victory by timeout after</span> {loserPlayerPill}<span>'s clock has run out</span></>;
    }

    if (reason === 3) {
      return <>Both players {renderAddressPill(player1Label, 'cyan', tournamentInfo?.player1Symbol, tournamentInfo?.player1, { symbolPosition: 'before', symbolSize: 'small' })} <span>and</span> {renderAddressPill(player2Label, 'pink', tournamentInfo?.player2Symbol, tournamentInfo?.player2, { symbolPosition: 'before', symbolSize: 'small' })} <span>stalled and were eliminated by</span> {renderAddressPill(winnerLabel, 'amber', null, tournamentInfo?.winner)}</>;
    }

    if (reason === 4) {
      return <>Both players {renderAddressPill(player1Label, 'cyan', tournamentInfo?.player1Symbol, tournamentInfo?.player1, { symbolPosition: 'before', symbolSize: 'small' })} <span>and</span> {renderAddressPill(player2Label, 'pink', tournamentInfo?.player2Symbol, tournamentInfo?.player2, { symbolPosition: 'before', symbolSize: 'small' })} <span>stalled and were replaced by</span> {renderAddressPill(winnerLabel, 'amber', null, tournamentInfo?.winner)}</>;
    }

    return null;
  })();
  const completedMatchOutcomeBadge = (() => {
    if (!isV2MatchHeader || matchStatus !== 2) return null;

    const reason = Number(completionReason ?? 0);
    const player1Address = tournamentInfo?.player1?.toLowerCase();
    const player2Address = tournamentInfo?.player2?.toLowerCase();
    const winnerAddress = tournamentInfo?.winner?.toLowerCase();
    const winnerIsPlayer1 = winnerAddress && player1Address && winnerAddress === player1Address;
    const winnerIsPlayer2 = winnerAddress && player2Address && winnerAddress === player2Address;
    const winnerPlayerLabel = winnerIsPlayer1 ? player1Label : winnerIsPlayer2 ? player2Label : winnerLabel;
    const winnerPlayerTone = winnerIsPlayer1 ? 'cyan' : winnerIsPlayer2 ? 'pink' : 'amber';
    const winnerPlayerSymbol = winnerIsPlayer1
      ? tournamentInfo?.player1Symbol
      : winnerIsPlayer2
        ? tournamentInfo?.player2Symbol
        : '';

    if (reason === 0 || reason === 1) {
      const timeoutHref = reason === 1 ? getUserManualHrefForReasonCode('ML1') : null;
      return (
        <>
          {renderMatchHistorySymbol(winnerPlayerSymbol)}
          {renderAddressPill(winnerPlayerLabel, winnerPlayerTone, null, winnerIsPlayer1 ? tournamentInfo?.player1 : winnerIsPlayer2 ? tournamentInfo?.player2 : tournamentInfo?.winner)}
          <span>wins</span>
          {reason === 1 && timeoutHref && (
            <UserManualAnchorLink
              href={timeoutHref}
              className="underline decoration-dotted underline-offset-4 hover:opacity-80 transition-colors"
              title="Learn more about ML1 in the User Manual"
            >
              by timeout (ML1)
            </UserManualAnchorLink>
          )}
        </>
      );
    }

    if (reason === 2) {
      return (
        <>
          <span>No Winner.</span>
          <UserManualAnchorLink
            href={getUserManualHrefForReasonCode('R1')}
            className="underline decoration-dotted underline-offset-4 hover:opacity-80 transition-colors"
            title="Learn more about R1 in the User Manual"
          >
            Draw Resolution (R1)
          </UserManualAnchorLink>
        </>
      );
    }

    if (reason === 3) {
      return (
        <>
          <span>No Winner. Players Eliminated via</span>
          <UserManualAnchorLink
            href={getUserManualHrefForReasonCode('ML2')}
            className="underline decoration-dotted underline-offset-4 hover:opacity-80 transition-colors"
            title="Learn more about ML2 in the User Manual"
          >
            Anti-Stall (ML2)
          </UserManualAnchorLink>
        </>
      );
    }

    if (reason === 4) {
      return (
        <>
          <span>No Winner. Players Replaced by</span>
          {renderAddressPill(winnerLabel, 'amber', null, tournamentInfo?.winner)}
          <span>via</span>
          <UserManualAnchorLink
            href={getUserManualHrefForReasonCode('ML3')}
            className="underline decoration-dotted underline-offset-4 hover:opacity-80 transition-colors"
            title="Learn more about ML3 in the User Manual"
          >
            Anti-Stall (ML3)
          </UserManualAnchorLink>
        </>
      );
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
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-purple-200/75">
                  Players
                </div>
                <div className={`flex flex-wrap items-center gap-2 ${theme.textMuted}`}>
                  <span className="relative inline-flex items-center gap-1.5 rounded-full border border-cyan-300/35 bg-cyan-400/12 px-2.5 py-0.5 text-xs text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)] md:px-3 md:py-1 md:text-sm">
                    <span className="font-mono">{player1Label}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80 md:text-[11px]">
                      as
                    </span>
                    {renderMatchHistorySymbol(tournamentInfo?.player1Symbol)}
                    {connectedAccount && tournamentInfo?.player1?.toLowerCase?.() === connectedAccount ? renderYouBadge() : null}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-purple-200/80 md:text-xs md:tracking-[0.32em]">
                    vs
                  </span>
                  <span className="relative inline-flex items-center gap-1.5 rounded-full border border-pink-300/35 bg-pink-400/12 px-2.5 py-0.5 text-xs text-pink-100 shadow-[0_0_20px_rgba(244,114,182,0.12)] md:px-3 md:py-1 md:text-sm">
                    <span className="font-mono">{player2Label}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-100/80 md:text-[11px]">
                      as
                    </span>
                    {renderMatchHistorySymbol(tournamentInfo?.player2Symbol)}
                    {connectedAccount && tournamentInfo?.player2?.toLowerCase?.() === connectedAccount ? renderYouBadge() : null}
                  </span>
                </div>
              </div>
            ) : (
              <p className={`${theme.textMuted} mt-2`}>
                {headerSubtitle}
              </p>
            )
          )}
          {isV2MatchHeader && (
            <>
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-purple-200/75">
                  {statusSectionLabel}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!shouldHidePrimaryResolvedBadge && (
                    status.href ? (
                      <UserManualAnchorLink
                        href={status.href}
                        className={`inline-flex rounded-xl px-3 py-1.5 text-sm font-bold underline decoration-dotted underline-offset-4 hover:opacity-80 transition-colors md:px-4 md:py-2 md:text-base ${status.className}`}
                        title={`Learn more about ${status.text} in the User Manual`}
                      >
                        {status.text}
                      </UserManualAnchorLink>
                    ) : (
                      <div className={`inline-flex rounded-xl px-3 py-1.5 text-sm font-bold md:px-4 md:py-2 md:text-base ${status.className}`}>
                        {status.text}
                      </div>
                    )
                  )}
                  {completedMatchOutcomeBadge && (
                    <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold md:px-4 md:py-2 md:text-base ${status.className}`}>
                      {completedMatchOutcomeBadge}
                    </div>
                  )}
                </div>
              </div>
              {completedMatchExplanation && (
                <div className="mt-4 max-w-3xl">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-purple-200/75">
                    Reasoning
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs leading-relaxed text-purple-100/90 md:text-sm">
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
