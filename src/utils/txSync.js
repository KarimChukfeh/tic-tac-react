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
}) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let pollInFlight = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
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

    const poll = async () => {
      if (finished || pollInFlight) return;
      pollInFlight = true;
      try {
        const updated = await sync();
        if (updated && isSynced(updated)) {
          finish({ source: 'state', updated });
        }
      } catch {
        // Keep waiting; tx.wait() remains the fallback.
      } finally {
        pollInFlight = false;
      }
    };

    const timeoutId = setTimeout(() => fail(new Error('TX_TIMEOUT')), timeoutMs);
    const intervalId = setInterval(poll, pollIntervalMs);

    tx.wait()
      .then(() => finish({ source: 'receipt', updated: null }))
      .catch(fail);

    void poll();
  });
}
