import { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

export class V3WalletUnavailableError extends Error {
  constructor() {
    super('No injected wallet is available');
    this.name = 'V3WalletUnavailableError';
  }
}

function defaultCreateBrowserProvider(provider) {
  return new ethers.BrowserProvider(provider);
}

export function useV3Wallet({
  targetChainIdHex,
  getAddChainParams,
  injectedProvider = globalThis.window?.ethereum,
  createBrowserProvider = defaultCreateBrowserProvider,
}) {
  const [browserProvider, setBrowserProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletBootDone, setWalletBootDone] = useState(!injectedProvider);
  const walletAvailable = Boolean(injectedProvider);

  const installProvider = useCallback(async ({ hydrateAccount = false } = {}) => {
    if (!injectedProvider) {
      setBrowserProvider(null);
      setAccount('');
      return null;
    }

    const provider = createBrowserProvider(injectedProvider);
    setBrowserProvider(provider);
    if (hydrateAccount) {
      const accounts = await provider.send('eth_accounts', []).catch(() => []);
      setAccount(accounts?.[0] || '');
    }
    return provider;
  }, [createBrowserProvider, injectedProvider]);

  useEffect(() => {
    let active = true;
    if (!injectedProvider) {
      setWalletBootDone(true);
      return undefined;
    }

    installProvider({ hydrateAccount: true })
      .catch(() => {
        if (active) {
          setBrowserProvider(null);
          setAccount('');
        }
      })
      .finally(() => {
        if (active) setWalletBootDone(true);
      });

    const handleAccountsChanged = (accounts) => {
      if (active) setAccount(accounts?.[0] || '');
    };
    const handleChainChanged = () => {
      installProvider({ hydrateAccount: true }).catch(() => {
        if (active) {
          setBrowserProvider(null);
          setAccount('');
        }
      });
    };

    injectedProvider.on?.('accountsChanged', handleAccountsChanged);
    injectedProvider.on?.('chainChanged', handleChainChanged);

    return () => {
      active = false;
      injectedProvider.removeListener?.('accountsChanged', handleAccountsChanged);
      injectedProvider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [injectedProvider, installProvider]);

  const ensureTargetNetwork = useCallback(async (provider) => {
    const network = await provider.getNetwork();
    const currentChainIdHex = `0x${BigInt(network.chainId).toString(16)}`;
    if (currentChainIdHex.toLowerCase() === targetChainIdHex.toLowerCase()) return;

    try {
      await injectedProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainIdHex }],
      });
    } catch (switchError) {
      if (switchError?.code !== 4902) throw switchError;
      await injectedProvider.request({
        method: 'wallet_addEthereumChain',
        params: [getAddChainParams()],
      });
    }
  }, [getAddChainParams, injectedProvider, targetChainIdHex]);

  const connect = useCallback(async () => {
    if (!injectedProvider) throw new V3WalletUnavailableError();

    setIsConnecting(true);
    try {
      const provider = await installProvider();
      await ensureTargetNetwork(provider);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const nextAccount = await signer.getAddress();
      setAccount(nextAccount);
      return { account: nextAccount, provider, signer };
    } finally {
      setIsConnecting(false);
    }
  }, [ensureTargetNetwork, injectedProvider, installProvider]);

  return useMemo(() => ({
    account,
    browserProvider,
    connect,
    isConnecting,
    walletAvailable,
    walletBootDone,
  }), [
    account,
    browserProvider,
    connect,
    isConnecting,
    walletAvailable,
    walletBootDone,
  ]);
}
