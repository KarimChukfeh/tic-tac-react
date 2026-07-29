import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function normalizeChainIdHex(value) {
  try {
    return `0x${BigInt(value).toString(16)}`;
  } catch {
    return '';
  }
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
  const connectionRequestedRef = useRef(false);
  const walletAvailable = Boolean(injectedProvider);

  const installProvider = useCallback(async () => {
    if (!injectedProvider) {
      setBrowserProvider(null);
      setAccount('');
      return null;
    }

    const provider = createBrowserProvider(injectedProvider);
    setBrowserProvider(provider);
    return provider;
  }, [createBrowserProvider, injectedProvider]);

  useEffect(() => {
    let active = true;
    if (!injectedProvider) {
      setWalletBootDone(true);
      return undefined;
    }

    installProvider()
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
      if (!active || !connectionRequestedRef.current) return;
      const nextAccount = accounts?.[0] || '';
      setAccount(nextAccount);
      if (!nextAccount) connectionRequestedRef.current = false;
    };
    const handleChainChanged = () => {
      connectionRequestedRef.current = false;
      setAccount('');
      installProvider().catch(() => {
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

  const ensureTargetNetwork = useCallback(async () => {
    const normalizedTargetChainId = normalizeChainIdHex(targetChainIdHex);
    const currentChainIdHex = normalizeChainIdHex(await injectedProvider.request({
      method: 'eth_chainId',
    }));
    if (currentChainIdHex === normalizedTargetChainId) {
      return false;
    }

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

    const switchedChainIdHex = normalizeChainIdHex(await injectedProvider.request({
      method: 'eth_chainId',
    }));
    if (switchedChainIdHex !== normalizedTargetChainId) {
      throw new Error(
        `Wallet did not switch to the validated V3 chain ${BigInt(targetChainIdHex).toString()}.`,
      );
    }
    return true;
  }, [getAddChainParams, injectedProvider, targetChainIdHex]);

  const connect = useCallback(async () => {
    if (!injectedProvider) throw new V3WalletUnavailableError();

    setIsConnecting(true);
    try {
      await injectedProvider.request({ method: 'eth_requestAccounts' });
      await ensureTargetNetwork();
      const provider = await installProvider();
      const network = await provider.getNetwork();
      if (normalizeChainIdHex(network.chainId) !== normalizeChainIdHex(targetChainIdHex)) {
        throw new Error(
          `Wallet did not connect to the validated V3 chain ${BigInt(targetChainIdHex).toString()}.`,
        );
      }
      const signer = await provider.getSigner();
      const nextAccount = await signer.getAddress();
      connectionRequestedRef.current = true;
      setAccount(nextAccount);
      return { account: nextAccount, provider, signer };
    } catch (error) {
      connectionRequestedRef.current = false;
      setAccount('');
      throw error;
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
