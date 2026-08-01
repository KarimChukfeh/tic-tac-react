import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useV3Session } from './useV3Session';
import { canSubmitSessionMove } from '../session/sessionState';

const serviceCreate = vi.hoisted(() => vi.fn());

vi.mock('../session/service', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    V3BrowserSessionService: {
      create: serviceCreate,
    },
  };
});

const account = '0x3333333333333333333333333333333333333333';
const instance = '0x2222222222222222222222222222222222222222';
const factory = '0x1111111111111111111111111111111111111111';
const executor = '0x4444444444444444444444444444444444444444';
const replacement = '0x5555555555555555555555555555555555555555';

function activeInspection(selectedExecutor = executor) {
  return {
    status: 'active',
    executor: selectedExecutor,
    validUntil: BigInt(Math.floor(Date.now() / 1_000) + 3_600),
    secondsRemaining: 3_600n,
    localAvailable: true,
  };
}

function sessionService(overrides = {}) {
  return {
    restore: vi.fn().mockResolvedValue(activeInspection()),
    refreshSession: vi.fn().mockResolvedValue({
      metadata: { account: replacement },
      inspection: activeInspection(replacement),
    }),
    revokeSession: vi.fn().mockResolvedValue({
      status: 'revoked',
      executor: '0x0000000000000000000000000000000000000000',
      secondsRemaining: 0n,
      localAvailable: false,
    }),
    subscribe: vi.fn().mockReturnValue(() => {}),
    close: vi.fn(),
    ...overrides,
  };
}

describe('useV3Session lifecycle actions', () => {
  beforeEach(() => {
    serviceCreate.mockReset();
  });

  it('refreshes and revokes with the connected primary signer', async () => {
    const service = sessionService();
    serviceCreate.mockResolvedValue(service);
    const signer = {
      getAddress: vi.fn().mockResolvedValue(account),
    };
    const browserProvider = {
      getSigner: vi.fn().mockResolvedValue(signer),
    };
    const { result, unmount } = renderHook(() => useV3Session({
      account,
      instanceAddress: instance,
      factoryAddress: factory,
      browserProvider,
      lifecyclePollMs: 0,
    }));

    await waitFor(() => expect(result.current.state.status).toBe('active'));
    await act(async () => {
      await result.current.refreshSession();
    });
    expect(service.refreshSession).toHaveBeenCalledWith(
      expect.objectContaining({ instance, primary: account }),
      signer,
    );
    expect(result.current.state.executor).toBe(replacement);
    expect(canSubmitSessionMove(result.current.state)).toBe(true);

    await act(async () => {
      await result.current.revokeSession();
    });
    expect(service.revokeSession).toHaveBeenCalledWith(
      expect.objectContaining({ instance, primary: account }),
      signer,
    );
    expect(result.current.state).toMatchObject({
      status: 'revoked',
      directPrimaryMode: true,
      pendingAction: null,
    });
    unmount();
  });

  it('performs an authoritative move-time restore after reload state is still restoring', async () => {
    const service = sessionService();
    serviceCreate.mockResolvedValue(service);
    const { result, unmount } = renderHook(() => useV3Session({
      account,
      instanceAddress: instance,
      factoryAddress: factory,
      lifecyclePollMs: 0,
    }));

    await waitFor(() => expect(result.current.state.status).toBe('active'));
    let restored;
    await act(async () => {
      restored = await result.current.restoreForMove();
    });

    expect(restored).toMatchObject({
      ready: true,
      identity: expect.objectContaining({ instance, primary: account }),
      inspection: { status: 'active', localAvailable: true },
    });
    expect(service.restore.mock.calls.length).toBeGreaterThan(1);
    unmount();
  });

  it('polls the registry and disables an executor rotated on another device', async () => {
    const service = sessionService({
      restore: vi.fn()
        .mockResolvedValueOnce(activeInspection())
        .mockResolvedValue({
          status: 'rotated',
          executor: replacement,
          requestedExecutor: executor,
          secondsRemaining: 3_500n,
          localAvailable: true,
        }),
    });
    serviceCreate.mockResolvedValue(service);
    const { result, unmount } = renderHook(() => useV3Session({
      account,
      instanceAddress: instance,
      factoryAddress: factory,
      lifecyclePollMs: 100,
    }));

    await waitFor(() => expect(result.current.state.status).toBe('active'));
    await waitFor(() => expect(result.current.state.status).toBe('rotated'));
    expect(canSubmitSessionMove(result.current.state)).toBe(false);
    expect(service.restore.mock.calls.length).toBeGreaterThan(1);
    unmount();
  });

  it('rejects lifecycle writes from a wallet other than the active primary', async () => {
    const service = sessionService();
    serviceCreate.mockResolvedValue(service);
    const browserProvider = {
      getSigner: vi.fn().mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue(
          '0x6666666666666666666666666666666666666666',
        ),
      }),
    };
    const { result, unmount } = renderHook(() => useV3Session({
      account,
      instanceAddress: instance,
      factoryAddress: factory,
      browserProvider,
      lifecyclePollMs: 0,
    }));

    await waitFor(() => expect(result.current.state.status).toBe('active'));
    await act(async () => {
      await result.current.refreshSession();
    });

    expect(service.refreshSession).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      status: 'active',
      pendingAction: null,
      error: { message: 'The connected wallet is not the active primary player.' },
    });
    unmount();
  });
});
