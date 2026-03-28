import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForTxOrStateSync } from './txSync';

describe('waitForTxOrStateSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps polling after the receipt until state syncs', async () => {
    const onReceipt = vi.fn();
    const tx = {
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    };
    const sync = vi.fn()
      .mockResolvedValueOnce({ version: 0 })
      .mockResolvedValueOnce({ version: 1 });

    const resultPromise = waitForTxOrStateSync({
      tx,
      sync,
      isSynced: (updated) => updated?.version === 1,
      pollIntervalMs: 1_000,
      postReceiptSyncMs: 5_000,
      onReceipt,
    });

    await Promise.resolve();
    expect(sync).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    const result = await resultPromise;

    expect(onReceipt).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      source: 'state',
      synced: true,
      receiptObserved: true,
      updated: { version: 1 },
    });
  });

  it('falls back to the confirmed receipt if state sync lags too long', async () => {
    const tx = {
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    };
    const sync = vi.fn().mockResolvedValue({ version: 0 });

    const resultPromise = waitForTxOrStateSync({
      tx,
      sync,
      isSynced: (updated) => updated?.version === 1,
      pollIntervalMs: 1_000,
      postReceiptSyncMs: 2_000,
    });

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await resultPromise;

    expect(result).toMatchObject({
      source: 'receipt',
      synced: false,
      receiptObserved: true,
      updated: { version: 0 },
    });
  });

  it('rejects when the transaction never confirms before timeout', async () => {
    const tx = {
      wait: vi.fn().mockImplementation(() => new Promise(() => {})),
    };
    const sync = vi.fn().mockResolvedValue(null);

    const resultPromise = waitForTxOrStateSync({
      tx,
      sync,
      isSynced: () => false,
      timeoutMs: 3_000,
      pollIntervalMs: 1_000,
    });

    const rejection = expect(resultPromise).rejects.toThrow('TX_TIMEOUT');
    await vi.advanceTimersByTimeAsync(3_000);
    await rejection;
  });
});
