import {
  IndexedDbKeyValueStore,
  SessionKeyVault,
  sessionStorageKey,
} from '../vendor/sdk/dist/session-storage.js';
import { generateBrowserSessionKey } from '../vendor/sdk/dist/session-crypto.js';
import { SessionCoordinator } from '../vendor/sdk/dist/session-coordinator.js';

const INSTANCE = '0x1111111111111111111111111111111111111111';
const PRIMARY = '0x2222222222222222222222222222222222222222';
const ACCOUNT = '0x3333333333333333333333333333333333333333';

function waitForMessage(coordinator, expectedType, timeoutMs = 2_000) {
  return new Promise((resolve) => {
    const timer = globalThis.setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);
    const unsubscribe = coordinator.subscribe((event) => {
      if (event?.type !== expectedType) return;
      globalThis.clearTimeout(timer);
      unsubscribe();
      resolve(true);
    });
  });
}

/**
 * Runs only in a real secure browser context. The returned object contains no
 * key material, signatures, ciphertext, or provider error bodies.
 */
export async function runBrowserPrimitiveProbe() {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB) {
    throw new Error('A browser with Web Crypto and IndexedDB is required');
  }
  const suffix = globalThis.crypto.randomUUID?.() || String(Date.now());
  const databaseName = `etour-v3-release-probe-${suffix}`;
  const identity = { chainId: 412346n, instance: INSTANCE, primary: PRIMARY };
  const store = new IndexedDbKeyValueStore(databaseName);
  const vault = new SessionKeyVault({ store, crypto: globalThis.crypto });
  const initialKey = generateBrowserSessionKey(globalThis.crypto);
  const rotatedKey = generateBrowserSessionKey(globalThis.crypto);
  const channelName = `etour-v3-release-probe-${suffix}`;
  const firstCoordinator = new SessionCoordinator({ channelName });
  const secondCoordinator = new SessionCoordinator({ channelName });

  try {
    await vault.save(identity, initialKey, {
      account: ACCOUNT,
      salt: 1n,
      replace: true,
    });
    const rawRecord = await store.get(sessionStorageKey(identity));
    const wrappingKey = await store.get('vault:aes-gcm:v1');

    const reloadedVault = new SessionKeyVault({
      store: new IndexedDbKeyValueStore(databaseName),
      crypto: globalThis.crypto,
    });
    const restored = await reloadedVault.load(identity);
    const restoredAddressMatches = restored?.key.address === initialKey.address;
    restored?.key.destroy();

    await vault.stageRefresh(identity, rotatedKey, {
      account: ACCOUNT,
      salt: 2n,
      replace: true,
    });
    const staged = await vault.loadStagedRefresh(identity);
    const stagedAddressMatches = staged?.key.address === rotatedKey.address;
    staged?.key.destroy();
    await vault.commitStagedRefresh(identity);
    const refreshed = await reloadedVault.load(identity);
    const rotationCommitted = refreshed?.key.address === rotatedKey.address;
    refreshed?.key.destroy();

    const crossContextMessage = waitForMessage(secondCoordinator, 'probe');
    firstCoordinator.publish({ type: 'probe' });

    return Object.freeze({
      webCrypto: true,
      indexedDb: true,
      encryptedRecord: Boolean(rawRecord?.ciphertext && rawRecord?.iv),
      plaintextPrivateKeyAbsent: !Object.hasOwn(rawRecord || {}, 'privateKey'),
      wrappingKeyNonExtractable: wrappingKey instanceof CryptoKey
        && wrappingKey.extractable === false,
      reloadRestored: restoredAddressMatches,
      stagedRefreshRestored: stagedAddressMatches,
      rotationCommitted,
      broadcastChannel: await crossContextMessage,
      browserLocks: Boolean(globalThis.navigator?.locks),
    });
  } finally {
    initialKey.destroy();
    rotatedKey.destroy();
    await vault.remove(identity);
    firstCoordinator.close();
    secondCoordinator.close();
  }
}
