const normalizeAddress = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

const isReceiptFailureStatus = (status) => {
  if (status === 0 || status === 0n) return true;
  if (typeof status === 'string') {
    return status === '0x0' || status === '0';
  }
  return false;
};

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
    let receiptCallbackFired = false;
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

    const fireReceiptCallback = (receipt) => {
      if (receiptCallbackFired) return;
      receiptCallbackFired = true;
      try {
        onReceipt?.(receipt);
      } catch {
        // Ignore UI callback failures and keep syncing.
      }
    };

    const poll = async () => {
      if (finished || pollInFlight) return;
      pollInFlight = true;
      try {
        if (tx?.provider?.getTransactionReceipt && tx?.hash) {
          const receipt = await tx.provider.getTransactionReceipt(tx.hash).catch(() => null);
          if (receipt) {
            receiptObserved = true;
            if (isReceiptFailureStatus(receipt.status)) {
              const receiptError = new Error('TX_FAILED_ONCHAIN');
              receiptError.code = 'TX_FAILED_ONCHAIN';
              receiptError.receipt = receipt;
              fail(receiptError);
              return;
            }
            fireReceiptCallback(receipt);

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
          }
        }

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
      .then((receipt) => {
        receiptObserved = true;
        if (isReceiptFailureStatus(receipt?.status)) {
          const receiptError = new Error('TX_FAILED_ONCHAIN');
          receiptError.code = 'TX_FAILED_ONCHAIN';
          receiptError.receipt = receipt;
          fail(receiptError);
          return;
        }
        fireReceiptCallback(receipt);

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
