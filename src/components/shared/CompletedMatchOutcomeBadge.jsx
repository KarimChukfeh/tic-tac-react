import {
  CompletionReason,
  getCompletedMatchOutcomeLabel,
  getCompletionReasonHref,
  getCompletionReasonManualLabel,
} from '../../utils/completionReasons';
import {
  getV2BracketMatchOutcomeLabel,
  getV2CompletedMatchOutcomeLabel,
  getV2CompletionReasonHref,
  getV2CompletionReasonManualLabel,
  getV2NeutralMatchReasonLabel,
} from '../../v2/lib/reasonLabels';
import UserManualAnchorLink from './UserManualAnchorLink';

const getReasonSuffix = (completionReason) => {
  switch (completionReason) {
    case CompletionReason.TIMEOUT:
      return 'Timeout (ML1)';
    case CompletionReason.FORCE_ELIMINATION:
      return 'ML2';
    case CompletionReason.REPLACEMENT:
      return 'ML3';
    case CompletionReason.ALL_DRAW_SCENARIO:
      return 'All-Draw Resolution';
    default:
      return '';
  }
};

const formatWinnerToken = (winnerAddress) => {
  if (!winnerAddress || winnerAddress === '0x0000000000000000000000000000000000000000') {
    return 'Winner';
  }
  return winnerAddress.slice(0, 4);
};

const CompletedMatchOutcomeBadge = ({
  reason,
  isWinner,
  gameName,
  variant = 'participant',
  viewerRelation = null,
  winnerAddress = null,
  className = '',
  onClick,
  reasonLabelMode = 'default',
}) => {
  const completionReason = Number(reason ?? 0);
  const useV2ReasonLabels = reasonLabelMode === 'v2';
  const isDrawOutcome =
    completionReason === CompletionReason.DRAW ||
    completionReason === CompletionReason.ALL_DRAW_SCENARIO;
  const href = useV2ReasonLabels
    ? getV2CompletionReasonHref(completionReason)
    : getCompletionReasonHref(completionReason);
  const manualLabel = useV2ReasonLabels
    ? getV2CompletionReasonManualLabel(completionReason)
    : getCompletionReasonManualLabel(completionReason);
  const isNeutral = variant === 'neutral';
  const isBracketView = variant === 'bracket';
  const reasonSuffix = getReasonSuffix(completionReason);
  const label = isBracketView
    ? (() => {
        if (useV2ReasonLabels) {
          return getV2BracketMatchOutcomeLabel({
            reason: completionReason,
            viewerRelation,
            winnerAddress,
          });
        }
        if (isDrawOutcome) return 'Draw';
        if (viewerRelation === 'winner') {
          return reasonSuffix ? `Victory by ${reasonSuffix}` : 'Victory';
        }
        if (viewerRelation === 'loser') {
          return reasonSuffix ? `Defeated by ${reasonSuffix}` : 'Defeat';
        }
        const winnerToken = formatWinnerToken(winnerAddress);
        return reasonSuffix ? `${winnerToken} wins via ${reasonSuffix}` : `${winnerToken} wins`;
      })()
    : isNeutral
    ? (() => {
        if (useV2ReasonLabels) {
          return getV2NeutralMatchReasonLabel(completionReason) || 'Completed';
        }
        if (isDrawOutcome) return 'Draw';
        if (completionReason === CompletionReason.TIMEOUT) return 'Timeout (ML1)';
        if (completionReason === CompletionReason.FORCE_ELIMINATION) return 'Force Eliminated (ML2)';
        if (completionReason === CompletionReason.REPLACEMENT) return 'Replacement Claimed (ML3)';
        return 'Completed';
      })()
    : useV2ReasonLabels
    ? getV2CompletedMatchOutcomeLabel(completionReason, isWinner, gameName)
    : getCompletedMatchOutcomeLabel(completionReason, isWinner, gameName);
  const badgeClass = isBracketView
    ? isDrawOutcome
      ? 'bg-yellow-500/60 text-white'
      : viewerRelation === 'winner'
      ? 'bg-green-500/60 text-white'
      : viewerRelation === 'loser'
      ? 'bg-red-500/60 text-white'
      : 'bg-slate-500/60 text-white'
    : isNeutral
    ? isDrawOutcome
      ? 'bg-yellow-500/60 text-white'
      : completionReason === CompletionReason.TIMEOUT
      ? 'bg-orange-500/60 text-white'
      : completionReason === CompletionReason.FORCE_ELIMINATION
      ? 'bg-amber-500/60 text-white'
      : completionReason === CompletionReason.REPLACEMENT
      ? 'bg-red-500/60 text-white'
      : 'bg-slate-500/60 text-white'
    : isDrawOutcome
    ? 'bg-yellow-500/60 text-white'
    : isWinner
    ? 'bg-green-500/60 text-white'
    : 'bg-red-500/60 text-white';
  const mergedClassName = `text-[10px] px-2 py-0.5 rounded font-bold ${badgeClass}${className ? ` ${className}` : ''}`;

  if (href) {
    return (
      <UserManualAnchorLink
        href={href}
        onClick={onClick}
        className={`${mergedClassName} hover:opacity-80 transition-colors underline decoration-dotted cursor-pointer`}
        title={manualLabel ? `Learn more about ${manualLabel} in the User Manual` : ''}
      >
        {label}
      </UserManualAnchorLink>
    );
  }

  return (
    <span className={mergedClassName}>
      {label}
    </span>
  );
};

export default CompletedMatchOutcomeBadge;
