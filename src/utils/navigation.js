const initialBrowserPath = typeof window === 'undefined' ? '' : window.location.pathname;

function getNavigationType() {
  if (typeof window === 'undefined' || !window.performance) {
    return '';
  }

  const navigationEntry = window.performance.getEntriesByType?.('navigation')?.[0];
  if (navigationEntry?.type) {
    return navigationEntry.type;
  }

  if (window.performance.navigation?.type === 1) {
    return 'reload';
  }

  if (window.performance.navigation?.type === 0) {
    return 'navigate';
  }

  return '';
}

export function shouldResetOnInitialDocumentLoad(routePath) {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigationType = getNavigationType();
  if (navigationType !== 'reload' && navigationType !== 'navigate') {
    return false;
  }

  return initialBrowserPath === routePath;
}
