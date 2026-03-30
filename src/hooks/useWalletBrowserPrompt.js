import { useState, useEffect, useRef } from 'react';
import {
  isMobileDevice,
  isWalletBrowser,
  buildWalletDeepLink,
} from '../utils/mobileDetection';

// SessionStorage key to track if user made a choice
const USER_CHOICE_KEY = 'wallet_browser_choice';

/**
 * Custom hook to handle wallet browser deep linking for mobile
 *
 * Shows a prompt to mobile users asking if they want to open in a wallet browser
 * (MetaMask, Brave, Trust) or continue in their current browser.
 * Uses sessionStorage to remember choice.
 *
 * How it works:
 * 1. Detects if user is on mobile device (iOS/Android)
 * 2. Checks if already in a wallet browser (skips prompt)
 * 3. Checks sessionStorage to see if user already made a choice
 * 4. Returns state to control prompt visibility and handle user choice
 *
 * @returns {Object} Status object with { showPrompt, handleWalletChoice, handleContinueChoice }
 */
export function useWalletBrowserPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const hasChecked = useRef(false);
  const walletRedirectUrlRef = useRef(
    typeof window !== 'undefined' ? window.location.href : ''
  );

  useEffect(() => {
    // Only run once per component lifecycle
    // Prevents double execution in React StrictMode
    if (hasChecked.current) {
      return;
    }

    hasChecked.current = true;

    // Skip wallet prompt on whitepaper page
    if (window.location.pathname === '/whitepaper') {
      return;
    }

    // Check if mobile device
    if (!isMobileDevice()) {
      return;
    }

    // Check if already in a wallet browser
    if (isWalletBrowser()) {
      return;
    }

    // Check if user already made a choice this session
    const userChoice = sessionStorage.getItem(USER_CHOICE_KEY);
    if (userChoice && userChoice !== 'continue') {
      // If user previously chose a wallet, automatically redirect
      try {
        const deepLink = buildWalletDeepLink(userChoice, walletRedirectUrlRef.current);
        if (deepLink) {
          window.location.href = deepLink;
        }
      } catch (error) {
        console.error(`Automatic ${userChoice} redirect failed:`, error);
      }
      return;
    } else if (userChoice === 'continue') {
      // User chose to continue in current browser
      return;
    }

    // Show prompt to user
    setShowPrompt(true);
  }, []);

  const handleWalletChoice = (walletId) => {
    try {
      // Mark that user chose a specific wallet
      sessionStorage.setItem(USER_CHOICE_KEY, walletId);

      // Build the deep link from the URL captured when the prompt opened.
      // This preserves invite params even if the SPA mutates the address bar.
      const deepLink = buildWalletDeepLink(walletId, walletRedirectUrlRef.current);

      if (deepLink) {
        // Perform redirect
        window.location.href = deepLink;
      } else {
        console.error(`No deep link available for wallet: ${walletId}`);
        setShowPrompt(false);
      }
    } catch (error) {
      console.error(`${walletId} deep link redirect failed:`, error);
      setShowPrompt(false);
    }
  };

  const handleContinueChoice = () => {
    // Mark that user chose to continue in current browser
    sessionStorage.setItem(USER_CHOICE_KEY, 'continue');
    setShowPrompt(false);
  };

  // Function to manually trigger the wallet prompt
  const triggerWalletPrompt = (targetUrl = window.location.href) => {
    walletRedirectUrlRef.current = targetUrl;
    setShowPrompt(true);
  };

  return {
    showPrompt,
    handleWalletChoice,
    handleContinueChoice,
    triggerWalletPrompt,
  };
}

// Export the old hook name for backward compatibility
export { useWalletBrowserPrompt as useMetaMaskDeepLink };
