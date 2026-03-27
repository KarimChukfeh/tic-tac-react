const initialBrowserPath = typeof window === 'undefined' ? '' : window.location.pathname;
const initialBrowserSearch = typeof window === 'undefined' ? '' : window.location.search;

function hasValidInitialInviteParam() {
  if (typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(initialBrowserSearch);
  const contractAddress = searchParams.get('c');
  return /^0x[0-9a-fA-F]{40}$/.test(contractAddress || '');
}

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

export function shouldResetOnInitialDocumentLoad(routePath, options = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigationType = getNavigationType();
  if (navigationType !== 'reload' && navigationType !== 'navigate') {
    return false;
  }

  if (initialBrowserPath !== routePath) {
    return false;
  }

  if (options.allowInviteParam && hasValidInitialInviteParam()) {
    return false;
  }

  return true;
}
