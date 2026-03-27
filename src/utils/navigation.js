export function wasPageReloaded() {
  if (typeof window === 'undefined' || !window.performance) {
    return false;
  }

  const navigationEntry = window.performance.getEntriesByType?.('navigation')?.[0];
  if (navigationEntry?.type === 'reload') {
    return true;
  }

  return window.performance.navigation?.type === 1;
}
