const normalizeAddress = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

export function didMatchStateAdvance(previousMatch, nextMatch) {
  if (!previousMatch || !nextMatch) return false;

  if (Number(nextMatch.matchStatus ?? 0) === 2 && Number(previousMatch.matchStatus ?? 0) !== 2) {
    return true;
  }

  if (JSON.stringify(nextMatch.board ?? null) !== JSON.stringify(previousMatch.board ?? null)) {
    return true;
  }

  if (
    normalizeAddress(nextMatch.currentTurn) &&
    normalizeAddress(nextMatch.currentTurn) !== normalizeAddress(previousMatch.currentTurn)
  ) {
    return true;
  }

  if (Number(nextMatch.lastMoveTime ?? 0) > Number(previousMatch.lastMoveTime ?? 0)) {
    return true;
  }

  return false;
}

export function waitForTxOrStateSync({
  tx,
  sync,
  isSynced,
  timeoutMs = 90_000,
  pollIntervalMs = 1_000,
  postReceiptSyncMs = 15_000,
  onReceipt,
}) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let pollInFlight = false;
    let receiptObserved = false;
    let lastUpdated = null;
    let postReceiptTimeoutId = null;

    const cleanup = () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      clearTimeout(postReceiptTimeoutId);
    };

    const finish = (result) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(result);
    };

    const fail = (error) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };

    const finishWithReceipt = () => {
      finish({
        source: 'receipt',
        updated: lastUpdated,
        synced: false,
        receiptObserved: true,
      });
    };

    const schedulePostReceiptFallback = () => {
      if (postReceiptTimeoutId || finished) return;
      postReceiptTimeoutId = setTimeout(() => {
        finishWithReceipt();
      }, Math.max(0, postReceiptSyncMs));
    };

    const poll = async () => {
      if (finished || pollInFlight) return;
      pollInFlight = true;
      try {
        const updated = await sync();
        lastUpdated = updated;
        if (updated && isSynced(updated)) {
          finish({
            source: 'state',
            updated,
            synced: true,
            receiptObserved,
          });
        }
      } catch {
        // Keep waiting; tx.wait() remains the fallback.
      } finally {
        pollInFlight = false;
      }
    };

    const timeoutId = setTimeout(() => {
      if (receiptObserved) {
        finishWithReceipt();
        return;
      }
      fail(new Error('TX_TIMEOUT'));
    }, timeoutMs);
    const intervalId = setInterval(poll, pollIntervalMs);

    tx.wait()
      .then(() => {
        receiptObserved = true;
        try {
          onReceipt?.();
        } catch {
          // Ignore UI callback failures and keep syncing.
        }

        if (lastUpdated && isSynced(lastUpdated)) {
          finish({
            source: 'state',
            updated: lastUpdated,
            synced: true,
            receiptObserved: true,
          });
          return;
        }

        schedulePostReceiptFallback();
        void poll();
      })
      .catch(fail);

    void poll();
  });
}
