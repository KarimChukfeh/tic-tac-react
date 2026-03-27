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
  className = '',
  onClick,
}) => {
  const completionReason = Number(reason ?? 0);
  const isDrawOutcome =
    completionReason === CompletionReason.DRAW ||
    completionReason === CompletionReason.ALL_DRAW_SCENARIO;
  const href = getCompletionReasonHref(completionReason);
  const manualLabel = getCompletionReasonManualLabel(completionReason);
  const badgeClass = isDrawOutcome
    ? 'bg-yellow-500/60 text-white'
    : isWinner
    ? 'bg-green-500/60 text-white'
    : 'bg-red-500/60 text-white';
  const label = getCompletedMatchOutcomeLabel(completionReason, isWinner, gameName);
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
