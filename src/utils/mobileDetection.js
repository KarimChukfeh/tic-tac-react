/**
 * Mobile and MetaMask Browser Detection Utilities
 *
 * Provides functions to detect mobile devices (iOS/Android),
 * check if running in MetaMask mobile browser, and construct
 * MetaMask deep links for mobile redirects.
 */

/**
 * Detects if the current device is iOS
 * @returns {boolean} True if device is iOS (iPhone, iPad, iPod)
 */
export function isIOS() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
}

/**
 * Detects if the current device is Android
 * @returns {boolean} True if device is Android
 */
export function isAndroid() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android/i.test(userAgent);
}

/**
 * Checks if the device is mobile (iOS or Android)
 * @returns {boolean} True if device is iOS or Android
 */
export function isMobileDevice() {
  return isIOS() || isAndroid();
}

/**
 * Detects if currently running in MetaMask mobile browser
 *
 * Uses multiple detection methods:
 * 1. Checks for MetaMask-specific user agent strings
 * 2. Verifies window.ethereum properties specific to MetaMask mobile
 *
 * @returns {boolean} True if in MetaMask mobile browser
 */
export function isMetaMaskBrowser() {
  const userAgent = navigator.userAgent || '';

  // Check for MetaMask-specific user agent strings
  if (userAgent.includes('MetaMaskMobile')) {
    return true;
  }

  // Additional check: MetaMask mobile sets window.ethereum.isMetaMask
  // and typically has isMetaMask === true with isMobile or _metamask properties
  if (
    typeof window.ethereum !== 'undefined' &&
    window.ethereum.isMetaMask &&
    (window.ethereum.isMobile || window.ethereum._metamask?.isUnlocked !== undefined)
  ) {
    return true;
  }

  return false;
}

/**
 * Constructs MetaMask deep link URL from current URL
 *
 * Converts a regular URL to a MetaMask app link that:
 * - Opens in MetaMask browser if app is installed
 * - Opens in default browser if MetaMask is not installed
 *
 * @param {string} currentUrl - The full current URL (e.g., window.location.href)
 * @returns {string} MetaMask deep link URL
 *
 * @example
 * buildMetaMaskDeepLink('https://example.com/tictactoe?tier=1')
 * // Returns: 'https://metamask.app.link/dapp/example.com/tictactoe?tier=1'
 */
export function buildMetaMaskDeepLink(currentUrl) {
  // Remove protocol from current URL
  // Example: "https://example.com/tictactoe" -> "example.com/tictactoe"
  const urlWithoutProtocol = currentUrl.replace(/^https?:\/\//, '');

  // Construct MetaMask deep link
  return `https://metamask.app.link/dapp/${urlWithoutProtocol}`;
}
