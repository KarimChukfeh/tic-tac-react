import { describe, expect, it, vi } from 'vitest';
import { V3BrowserSessionService } from './service';

const factory = '0x1111111111111111111111111111111111111111';
const instance = '0x2222222222222222222222222222222222222222';
const primary = '0x3333333333333333333333333333333333333333';
const executor = '0x4444444444444444444444444444444444444444';

describe('V3 browser session service', () => {
  it('stages creation encrypted under the factory and promotes after confirmation', async () => {
    const key = { destroy: vi.fn() };
    const metadata = { account: executor, salt: 7n };
    const client = {
      createSession: vi.fn().mockResolvedValue(metadata),
      inspect: vi.fn().mockResolvedValue({ status: 'active', executor }),
      close: vi.fn(),
    };
    const vault = {
      load: vi.fn().mockResolvedValue({ key, metadata }),
      save: vi.fn().mockResolvedValue(metadata),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const service = new V3BrowserSessionService({
      sessionClient: client,
      vault,
      coordinator: { subscribe: vi.fn() },
    });

    const staged = await service.prepareCreation({ factory, primary, chainId: 412346 });
    expect(staged.executor).toBe(executor);
    expect(client.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ instance: factory, primary }),
      { replace: true },
    );

    const finalized = await service.finalizeCreation(staged, instance);
    expect(vault.save).toHaveBeenCalledWith(
      expect.objectContaining({ instance }),
      key,
      { account: executor, salt: 7n, replace: true },
    );
    expect(vault.remove).toHaveBeenCalledWith(staged.identity);
    expect(key.destroy).toHaveBeenCalledOnce();
    expect(finalized.inspection.status).toBe('active');
  });

  it('discards rejected enrollment candidates without exposing key material', async () => {
    const client = {
      createSession: vi.fn().mockResolvedValue({ account: executor }),
    };
    const vault = { remove: vi.fn() };
    const service = new V3BrowserSessionService({
      sessionClient: client,
      vault,
      coordinator: {},
    });
    const prepared = await service.prepareEnrollment({
      instance,
      primary,
      chainId: 412346,
    });
    await service.discardEnrollment(prepared);
    expect(vault.remove).toHaveBeenCalledWith(prepared.identity);
    expect(Object.keys(prepared)).not.toContain('privateKey');
    expect(Object.keys(prepared.metadata)).not.toContain('privateKey');
  });

  it('recovers an interrupted creation promotion when the final instance is opened', async () => {
    const key = { destroy: vi.fn() };
    const metadata = { account: executor, salt: 11n };
    const client = {
      recoverPendingRefresh: vi.fn().mockResolvedValue(null),
      inspect: vi.fn()
        .mockResolvedValueOnce({ status: 'active', executor })
        .mockResolvedValueOnce({ status: 'active', executor }),
    };
    const vault = {
      load: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key, metadata }),
      save: vi.fn(),
      remove: vi.fn(),
    };
    const service = new V3BrowserSessionService({
      sessionClient: client,
      vault,
      coordinator: {},
    });
    const inspection = await service.restore({
      chainId: 412346n,
      instance,
      primary,
    }, { factory });

    expect(vault.save).toHaveBeenCalledWith(
      expect.objectContaining({ instance }),
      key,
      { account: executor, salt: 11n, replace: true },
    );
    expect(vault.remove).toHaveBeenCalledWith(
      expect.objectContaining({ instance: factory }),
    );
    expect(key.destroy).toHaveBeenCalledOnce();
    expect(inspection.status).toBe('active');
  });

  it('does not mark an on-chain executor usable when this browser lost its key', async () => {
    const client = {
      recoverPendingRefresh: vi.fn().mockResolvedValue(null),
      inspect: vi.fn().mockResolvedValue({
        status: 'active',
        executor,
        secondsRemaining: 3_600n,
      }),
    };
    const service = new V3BrowserSessionService({
      sessionClient: client,
      vault: { load: vi.fn().mockResolvedValue(null) },
      coordinator: {},
    });

    await expect(service.restore({
      chainId: 412346n,
      instance,
      primary,
    })).resolves.toMatchObject({
      status: 'missing-local',
      onChainStatus: 'active',
      localAvailable: false,
    });
  });

  it('refreshes and revokes only through the primary signer SDK path', async () => {
    const signer = { kind: 'primary-signer' };
    const refreshedMetadata = { account: executor };
    const client = {
      refreshSession: vi.fn().mockResolvedValue(refreshedMetadata),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      inspect: vi.fn()
        .mockResolvedValueOnce({ status: 'active', executor })
        .mockResolvedValueOnce({ status: 'revoked', executor }),
    };
    const service = new V3BrowserSessionService({
      sessionClient: client,
      vault: {},
      coordinator: {},
    });
    const sessionIdentity = { chainId: 412346n, instance, primary };

    const refreshed = await service.refreshSession(sessionIdentity, signer);
    expect(client.refreshSession).toHaveBeenCalledWith(sessionIdentity, signer);
    expect(refreshed).toMatchObject({
      metadata: refreshedMetadata,
      inspection: { status: 'active', localAvailable: true },
    });

    const revoked = await service.revokeSession(sessionIdentity, signer);
    expect(client.revokeSession).toHaveBeenCalledWith(sessionIdentity, signer);
    expect(revoked).toMatchObject({ status: 'revoked', localAvailable: false });
  });

  it('reports recovery after an interrupted refresh promotion', async () => {
    const key = { destroy: vi.fn() };
    const client = {
      recoverPendingRefresh: vi.fn().mockResolvedValue({ account: executor }),
      inspect: vi.fn().mockResolvedValue({ status: 'active', executor }),
    };
    const service = new V3BrowserSessionService({
      sessionClient: client,
      vault: { load: vi.fn().mockResolvedValue({ key, metadata: { account: executor } }) },
      coordinator: {},
    });

    await expect(service.restore({
      chainId: 412346n,
      instance,
      primary,
    })).resolves.toMatchObject({
      status: 'active',
      localAvailable: true,
      recoveredRefresh: true,
    });
    expect(key.destroy).toHaveBeenCalledOnce();
  });
});
