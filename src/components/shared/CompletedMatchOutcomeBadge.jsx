import {
  CompletionReason,
  getCompletedMatchOutcomeLabel,
  getCompletionReasonHref,
  getCompletionReasonManualLabel,
} from '../../utils/completionReasons';

const CompletedMatchOutcomeBadge = ({
  reason,
  isWinner,
  gameName,
  variant = 'participant',
  className = '',
  onClick,
}) => {
  const completionReason = Number(reason ?? 0);
  const isDrawOutcome =
    completionReason === CompletionReason.DRAW ||
    completionReason === CompletionReason.ALL_DRAW_SCENARIO;
  const href = getCompletionReasonHref(completionReason);
  const manualLabel = getCompletionReasonManualLabel(completionReason);
  const isNeutral = variant === 'neutral';
  const label = isNeutral
    ? (() => {
        if (isDrawOutcome) return 'Draw';
        if (completionReason === CompletionReason.TIMEOUT) return 'Timeout (ML1)';
        if (completionReason === CompletionReason.FORCE_ELIMINATION) return 'Force Eliminated (ML2)';
        if (completionReason === CompletionReason.REPLACEMENT) return 'Replacement Claimed (ML3)';
        return 'Completed';
      })()
    : getCompletedMatchOutcomeLabel(completionReason, isWinner, gameName);
  const badgeClass = isNeutral
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
      <a
        href={href}
        onClick={onClick}
        className={`${mergedClassName} hover:opacity-80 transition-colors underline decoration-dotted cursor-pointer`}
        title={manualLabel ? `Learn more about ${manualLabel} in the User Manual` : ''}
      >
        {label}
      </a>
    );
  }

  return (
    <span className={mergedClassName}>
      {label}
    </span>
  );
};

export default CompletedMatchOutcomeBadge;
