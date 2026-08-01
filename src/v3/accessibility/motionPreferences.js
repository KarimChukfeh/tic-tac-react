export function prefersReducedMotion() {
  return Boolean(
    typeof globalThis.matchMedia === 'function'
    && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

export function getV3ScrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

export function getInitialArenaEffectsPreference(storageKey) {
  if (typeof window === 'undefined') return true;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'on') return true;
    if (stored === 'off') return false;
  } catch {
    // A system motion preference remains available when storage is blocked.
  }

  return !prefersReducedMotion();
}
