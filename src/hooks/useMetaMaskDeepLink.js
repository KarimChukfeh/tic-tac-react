import { useState, useEffect, useRef } from 'react';
import {
  isMobileDevice,
  isMetaMaskBrowser,
  buildMetaMaskDeepLink,
} from '../utils/mobileDetection';

// SessionStorage key to track if user made a choice
const USER_CHOICE_KEY = 'metamask_user_choice';

/**
 * Custom hook to handle MetaMask mobile deep linking
 *
 * Shows a prompt to mobile users asking if they want to open in MetaMask
 * or continue in their current browser. Uses sessionStorage to remember choice.
 *
 * How it works:
 * 1. Detects if user is on mobile device (iOS/Android)
 * 2. Checks if already in MetaMask browser (skips prompt)
 * 3. Checks sessionStorage to see if user already made a choice
 * 4. Returns state to control prompt visibility and handle user choice
 *
 * @returns {Object} Status object with { showPrompt, handleMetaMaskChoice, handleContinueChoice }
 */
export function useMetaMaskDeepLink() {
  const [showPrompt, setShowPrompt] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run once per component lifecycle
    // Prevents double execution in React StrictMode
    if (hasChecked.current) {
      return;
    }

    hasChecked.current = true;

    // Check if mobile device
    if (!isMobileDevice()) {
      return;
    }

    // Check if already in MetaMask browser
    if (isMetaMaskBrowser()) {
      return;
    }

    // Check if user already made a choice this session
    const userChoice = sessionStorage.getItem(USER_CHOICE_KEY);
    if (userChoice) {
      // If user previously chose MetaMask, automatically redirect to current URL
      if (userChoice === 'metamask') {
        try {
          const currentUrl = window.location.href;
          const deepLink = buildMetaMaskDeepLink(currentUrl);
          window.location.href = deepLink;
        } catch (error) {
          console.error('Automatic MetaMask redirect failed:', error);
        }
      }
      // If user chose 'continue', do nothing (stay in current browser)
      return;
    }

    // Show prompt to user
    setShowPrompt(true);
  }, []);

  const handleMetaMaskChoice = () => {
    try {
      // Mark that user chose MetaMask
      sessionStorage.setItem(USER_CHOICE_KEY, 'metamask');

      // Build deep link preserving current URL
      const currentUrl = window.location.href;
      const deepLink = buildMetaMaskDeepLink(currentUrl);

      // Perform redirect
      window.location.href = deepLink;
    } catch (error) {
      console.error('MetaMask deep link redirect failed:', error);
      setShowPrompt(false);
    }
  };

  const handleContinueChoice = () => {
    // Mark that user chose to continue in current browser
    sessionStorage.setItem(USER_CHOICE_KEY, 'continue');
    setShowPrompt(false);
  };

  return {
    showPrompt,
    handleMetaMaskChoice,
    handleContinueChoice,
  };
}
