import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useV3Wallet, V3WalletUnavailableError } from './useV3Wallet';

function walletFixture({ chainId = 412346n } = {}) {
  const listeners = new Map();
  const injectedProvider = {
    on: vi.fn((event, listener) => listeners.set(event, listener)),
    removeListener: vi.fn((event, listener) => {
      if (listeners.get(event) === listener) listeners.delete(event);
    }),
    request: vi.fn(),
  };
  const provider = {
    getNetwork: vi.fn().mockResolvedValue({ chainId }),
    send: vi.fn(async (method) => (
      method === 'eth_accounts'
        ? ['0x1111111111111111111111111111111111111111']
        : ['0x1111111111111111111111111111111111111111']
    )),
    getSigner: vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
    }),
  };

  return {
    createBrowserProvider: vi.fn(() => provider),
    injectedProvider,
    listeners,
    provider,
  };
}

describe('useV3Wallet', () => {
  it('boots the provider, hydrates the account, and removes listeners', async () => {
    const fixture = walletFixture();
    const { result, unmount } = renderHook(() => useV3Wallet({
      targetChainIdHex: '0x64aba',
      getAddChainParams: () => ({ chainId: '0x64aba' }),
      injectedProvider: fixture.injectedProvider,
      createBrowserProvider: fixture.createBrowserProvider,
    }));

    await waitFor(() => expect(result.current.walletBootDone).toBe(true));
    expect(result.current.account).toBe('0x1111111111111111111111111111111111111111');
    expect(fixture.listeners.has('accountsChanged')).toBe(true);
    expect(fixture.listeners.has('chainChanged')).toBe(true);

    act(() => fixture.listeners.get('accountsChanged')([]));
    expect(result.current.account).toBe('');

    unmount();
    expect(fixture.injectedProvider.removeListener).toHaveBeenCalledTimes(2);
  });

  it('switches to the target chain before requesting accounts', async () => {
    const fixture = walletFixture({ chainId: 42161n });
    const { result } = renderHook(() => useV3Wallet({
      targetChainIdHex: '0x64aba',
      getAddChainParams: () => ({ chainId: '0x64aba' }),
      injectedProvider: fixture.injectedProvider,
      createBrowserProvider: fixture.createBrowserProvider,
    }));
    await waitFor(() => expect(result.current.walletBootDone).toBe(true));

    await act(async () => {
      await result.current.connect();
    });

    expect(fixture.injectedProvider.request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x64aba' }],
    });
    expect(fixture.provider.send).toHaveBeenCalledWith('eth_requestAccounts', []);
  });

  it('reports an unavailable injected wallet', async () => {
    const { result } = renderHook(() => useV3Wallet({
      targetChainIdHex: '0x64aba',
      getAddChainParams: () => ({ chainId: '0x64aba' }),
      injectedProvider: null,
    }));

    await expect(result.current.connect()).rejects.toBeInstanceOf(V3WalletUnavailableError);
  });
});
