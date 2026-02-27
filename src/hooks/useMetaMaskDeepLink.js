/**
 * @deprecated This file is maintained for backward compatibility.
 * Please use useWalletBrowserPrompt from './useWalletBrowserPrompt' instead.
 *
 * The new hook supports multiple wallets (MetaMask, Brave, Trust)
 * while this one only supported MetaMask.
 */

// Re-export the new hook with backward-compatible API
export { useWalletBrowserPrompt as useMetaMaskDeepLink } from './useWalletBrowserPrompt';

// Note: The new hook returns:
// - showPrompt (same)
// - handleWalletChoice (replaces handleMetaMaskChoice)
// - handleContinueChoice (same)
//
// For full backward compatibility, the handleWalletChoice
// can be called with 'metamask' as the argument to replicate
// the old handleMetaMaskChoice behavior.
