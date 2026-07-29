import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useV3Wallet, V3WalletUnavailableError } from './useV3Wallet';

function walletFixture({ chainId = 412346n } = {}) {
  const listeners = new Map();
  let activeChainId = chainId;
  const injectedProvider = {
    on: vi.fn((event, listener) => listeners.set(event, listener)),
    removeListener: vi.fn((event, listener) => {
      if (listeners.get(event) === listener) listeners.delete(event);
    }),
    request: vi.fn(async ({ method, params }) => {
      if (method === 'eth_chainId') return `0x${activeChainId.toString(16)}`;
      if (method === 'wallet_switchEthereumChain') {
        activeChainId = BigInt(params[0].chainId);
        return null;
      }
      if (method === 'eth_requestAccounts') {
        return ['0x1111111111111111111111111111111111111111'];
      }
      return null;
    }),
  };
  const provider = {
    getNetwork: vi.fn(async () => ({ chainId: activeChainId })),
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
  it('boots without silently connecting and removes listeners', async () => {
    const fixture = walletFixture();
    const { result, unmount } = renderHook(() => useV3Wallet({
      targetChainIdHex: '0x64aba',
      getAddChainParams: () => ({ chainId: '0x64aba' }),
      injectedProvider: fixture.injectedProvider,
      createBrowserProvider: fixture.createBrowserProvider,
    }));

    await waitFor(() => expect(result.current.walletBootDone).toBe(true));
    expect(result.current.account).toBe('');
    expect(fixture.provider.send).not.toHaveBeenCalledWith('eth_accounts', []);
    expect(fixture.listeners.has('accountsChanged')).toBe(true);
    expect(fixture.listeners.has('chainChanged')).toBe(true);

    act(() => fixture.listeners.get('accountsChanged')([
      '0x2222222222222222222222222222222222222222',
    ]));
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
    expect(fixture.injectedProvider.request).toHaveBeenCalledWith({
      method: 'eth_requestAccounts',
    });
    expect(result.current.account).toBe('0x1111111111111111111111111111111111111111');

    act(() => fixture.listeners.get('chainChanged')('0x1'));
    expect(result.current.account).toBe('');
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
