import { useEffect, useRef } from 'react';
import {
  isMobileDevice,
  isMetaMaskBrowser,
  buildMetaMaskDeepLink,
} from '../utils/mobileDetection';

// SessionStorage key to track if redirect was attempted
const REDIRECT_ATTEMPTED_KEY = 'metamask_redirect_attempted';

/**
 * Custom hook to handle MetaMask mobile deep linking
 *
 * Automatically redirects mobile users to MetaMask browser on first visit.
 * Uses sessionStorage to prevent infinite redirect loops.
 *
 * How it works:
 * 1. Detects if user is on mobile device (iOS/Android)
 * 2. Checks if already in MetaMask browser (skips redirect)
 * 3. Checks sessionStorage to avoid re-attempting redirect in same session
 * 4. Constructs MetaMask deep link preserving full URL (path + query params)
 * 5. Redirects to MetaMask app link:
 *    - If MetaMask installed: Opens in MetaMask browser
 *    - If MetaMask not installed: Opens in default mobile browser
 *
 * @returns {Object} Status object with { redirected, skipped, reason }
 */
export function useMetaMaskDeepLink() {
  const hasRedirected = useRef(false);
  const redirectStatus = useRef({
    redirected: false,
    skipped: false,
    reason: null,
  });

  useEffect(() => {
    // Only run once per component lifecycle
    // Prevents double execution in React StrictMode
    if (hasRedirected.current) {
      return;
    }

    hasRedirected.current = true;

    // Check if mobile device
    if (!isMobileDevice()) {
      redirectStatus.current = {
        redirected: false,
        skipped: true,
        reason: 'not_mobile',
      };
      return;
    }

    // Check if already in MetaMask browser
    if (isMetaMaskBrowser()) {
      redirectStatus.current = {
        redirected: false,
        skipped: true,
        reason: 'already_in_metamask',
      };
      return;
    }

    // Check if redirect was already attempted this session
    const redirectAttempted = sessionStorage.getItem(REDIRECT_ATTEMPTED_KEY);
    if (redirectAttempted === 'true') {
      redirectStatus.current = {
        redirected: false,
        skipped: true,
        reason: 'already_attempted',
      };
      return;
    }

    // All checks passed - perform redirect
    try {
      // Mark that we've attempted redirect
      // This prevents re-triggering if user comes back in same session
      sessionStorage.setItem(REDIRECT_ATTEMPTED_KEY, 'true');

      // Build deep link preserving current URL
      const currentUrl = window.location.href;
      const deepLink = buildMetaMaskDeepLink(currentUrl);

      // Store redirect status before redirecting (for debugging)
      redirectStatus.current = {
        redirected: true,
        skipped: false,
        reason: 'redirecting_to_metamask',
      };

      // Perform redirect
      window.location.href = deepLink;
    } catch (error) {
      console.error('MetaMask deep link redirect failed:', error);
      redirectStatus.current = {
        redirected: false,
        skipped: true,
        reason: 'redirect_error',
      };
    }
  }, []);

  return redirectStatus.current;
}
