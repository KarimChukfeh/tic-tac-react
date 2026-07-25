export default function ArenaEffectsSwitch({
  enabled = true,
  onToggle,
  context = 'hero',
  className = '',
}) {
  const accessiblePrefix = context === 'match' ? 'Match ' : '';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${accessiblePrefix}3D Effects ${enabled ? 'on' : 'off'}`}
      className={`t2-effects-switch ${className}`.trim()}
      onClick={onToggle}
    >
      <span className="t2-effects-switch__label">3D Effects</span>
      <span className="t2-effects-switch__track" aria-hidden="true"><i /></span>
      <strong>{enabled ? 'ON' : 'OFF'}</strong>
    </button>
  );
}
