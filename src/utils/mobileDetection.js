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
 * Detects if currently running in Brave wallet mobile browser
 *
 * @returns {boolean} True if in Brave wallet mobile browser
 */
export function isBraveBrowser() {
  const userAgent = navigator.userAgent || '';

  // Check for Brave-specific indicators
  if (userAgent.includes('Brave')) {
    return true;
  }

  // Check for Brave wallet properties
  if (
    typeof window.ethereum !== 'undefined' &&
    window.ethereum.isBraveWallet
  ) {
    return true;
  }

  return false;
}

/**
 * Detects if currently running in Trust Wallet mobile browser
 *
 * @returns {boolean} True if in Trust Wallet mobile browser
 */
export function isTrustBrowser() {
  const userAgent = navigator.userAgent || '';

  // Check for Trust Wallet user agent
  if (userAgent.includes('Trust')) {
    return true;
  }

  // Check for Trust wallet properties
  if (
    typeof window.ethereum !== 'undefined' &&
    window.ethereum.isTrust
  ) {
    return true;
  }

  return false;
}

/**
 * Detects if currently running in any supported wallet browser
 *
 * @returns {boolean} True if in any wallet browser
 */
export function isWalletBrowser() {
  return isMetaMaskBrowser() || isBraveBrowser() || isTrustBrowser();
}

/**
 * Constructs wallet deep link URL from current URL
 *
 * Converts a regular URL to a wallet app link that:
 * - Opens in the wallet's browser if app is installed
 * - Opens in default browser if wallet is not installed
 *
 * @param {string} walletId - The wallet identifier ('metamask', 'brave', or 'trust')
 * @param {string} currentUrl - The full current URL (e.g., window.location.href)
 * @returns {string|null} Wallet deep link URL or null if wallet not supported
 *
 * @example
 * buildWalletDeepLink('metamask', 'https://example.com/tictactoe?tier=1')
 * // Returns: 'https://metamask.app.link/dapp/example.com/tictactoe?tier=1'
 */
export function buildWalletDeepLink(walletId, currentUrl) {
  // Remove protocol from current URL
  // Example: "https://example.com/tictactoe" -> "example.com/tictactoe"
  const urlWithoutProtocol = currentUrl.replace(/^https?:\/\//, '');

  switch (walletId) {
    case 'metamask':
      // MetaMask deep link format
      return `https://metamask.app.link/dapp/${urlWithoutProtocol}`;

    case 'brave':
      // Brave wallet deep link format
      // Brave uses a different format - opens the URL directly
      return `brave://open-url?url=${encodeURIComponent(currentUrl)}`;

    case 'trust':
      // Trust Wallet deep link format
      return `https://link.trustwallet.com/open_url?url=${encodeURIComponent(currentUrl)}`;

    default:
      console.warn(`Unsupported wallet: ${walletId}`);
      return null;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use buildWalletDeepLink('metamask', url) instead
 */
export function buildMetaMaskDeepLink(currentUrl) {
  return buildWalletDeepLink('metamask', currentUrl);
}
