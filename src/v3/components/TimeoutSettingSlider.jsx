const CREATE_TIMEOUT_LIMITS = {
  enrollmentWindow: { min: 120, max: 1800, step: 60 },
  matchTimePerPlayer: { min: 60, max: 1200, step: 60 },
  timeIncrementPerMove: { min: 0, max: 60, step: 1 },
};

export function isCreateTimeoutField(field) {
  return Object.prototype.hasOwnProperty.call(CREATE_TIMEOUT_LIMITS, field);
}

export function clampCreateTimeoutValue(field, value) {
  const limits = CREATE_TIMEOUT_LIMITS[field];
  if (!limits) return value;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return limits.min;

  const steppedValue = Math.round(numericValue / limits.step) * limits.step;
  return Math.min(limits.max, Math.max(limits.min, steppedValue));
}

export function normalizeCreateTimeouts(timeouts) {
  return Object.keys(CREATE_TIMEOUT_LIMITS).reduce((nextTimeouts, field) => ({
    ...nextTimeouts,
    [field]: clampCreateTimeoutValue(field, nextTimeouts[field]),
  }), { ...timeouts });
}

function formatTimeoutValue(field, value) {
  const normalizedValue = clampCreateTimeoutValue(field, value);
  if (field === 'timeIncrementPerMove') {
    return `${normalizedValue}s`;
  }
  return `${normalizedValue / 60} min`;
}

function formatTimeoutRange(field) {
  const limits = CREATE_TIMEOUT_LIMITS[field];
  return `${formatTimeoutValue(field, limits.min)} - ${formatTimeoutValue(field, limits.max)}`;
}

export default function TimeoutSettingSlider({
  field,
  label,
  value,
  disabled = false,
  onChange,
}) {
  const limits = CREATE_TIMEOUT_LIMITS[field];
  const normalizedValue = clampCreateTimeoutValue(field, value);
  const progressRatio = limits.max > limits.min
    ? (normalizedValue - limits.min) / (limits.max - limits.min)
    : 0;
  const progress = progressRatio * 100;
  const sliderBackground = {
    background: `linear-gradient(90deg, rgba(34,211,238,0.95) 0%, rgba(59,130,246,0.92) ${progress}%, rgba(51,65,85,0.75) ${progress}%, rgba(51,65,85,0.35) 100%)`,
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-purple-200">{label}</div>
          <div className="mt-1 text-xs text-slate-500">{formatTimeoutRange(field)}</div>
        </div>
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-200">
          {formatTimeoutValue(field, normalizedValue)}
        </div>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={String(limits.min)}
          max={String(limits.max)}
          step={String(limits.step)}
          value={normalizedValue}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={formatTimeoutValue(field, normalizedValue)}
          onChange={event => onChange(clampCreateTimeoutValue(field, event.target.value))}
          className="settings-range-slider w-full"
          style={sliderBackground}
        />

        <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <span>{formatTimeoutValue(field, limits.min)}</span>
          <span>{formatTimeoutValue(field, limits.max)}</span>
        </div>
      </div>
    </div>
  );
}
