import { describe, expect, it, vi } from 'vitest';
import {
  createV3RpcProvider,
  createV3SdkServices,
  createV3SessionClient,
  loadBrowserSafeV3Sdk,
  mapV3SdkError,
  V3_SDK_BROWSER_COMPATIBILITY,
  V3SdkAdapterError,
} from './adapter';

const runtimeConfig = {
  rpcUrl: 'http://127.0.0.1:8545/',
  bundlerPrimaryUrl: 'http://127.0.0.1:3001/',
  bundlerFailoverUrl: 'http://127.0.0.1:3002/',
  chainId: 412346,
};
const deployment = {
  shared: {
    entryPoint: { address: '0x1111111111111111111111111111111111111111' },
    sessionRegistry: { address: '0x2222222222222222222222222222222222222222' },
    sessionAccountFactory: { address: '0x3333333333333333333333333333333333333333' },
    sessionPaymaster: { address: '0x4444444444444444444444444444444444444444' },
  },
};

class FakeProvider {
  constructor(...arguments_) {
    this.arguments = arguments_;
  }
}

class FakeBundler {
  constructor(options) {
    Object.assign(this, options);
  }
}

class FakeFailover {
  constructor(options) {
    Object.assign(this, options);
  }
}

class FakeVault {
  constructor(options) {
    Object.assign(this, options);
  }
}

class FakeCoordinator {
  constructor(options) {
    Object.assign(this, options);
  }
}

class FakeSessionClient {
  constructor(options) {
    Object.assign(this, options);
  }
}

const sdkLoader = async () => ({
  JsonRpcBundler: FakeBundler,
  FailoverBundler: FakeFailover,
  SessionKeyVault: FakeVault,
  SessionCoordinator: FakeCoordinator,
  V3SessionClient: FakeSessionClient,
  mapV3Error: vi.fn((error) => ({
    code: error.code,
    message: 'mapped',
    retryable: false,
    directFallbackRecommended: false,
  })),
});

describe('V3 SDK adapter', () => {
  it('loads the synchronized browser-safe SDK modules', async () => {
    const sdk = await loadBrowserSafeV3Sdk();
    expect(sdk.JsonRpcBundler).toBeTypeOf('function');
    expect(sdk.SessionKeyVault).toBeTypeOf('function');
    expect(sdk.SessionCoordinator).toBeTypeOf('function');
    expect(sdk.mapV3Error).toBeTypeOf('function');
    expect(sdk.V3SessionClient).toBeTypeOf('function');
  });

  it('creates a chain-pinned read provider', () => {
    const provider = createV3RpcProvider(runtimeConfig, FakeProvider);
    expect(provider.arguments).toEqual([
      runtimeConfig.rpcUrl,
      412346,
      { staticNetwork: true },
    ]);
  });

  it('creates primary/failover bundlers, vault, and coordinator from normalized config', async () => {
    const crypto = {};
    const services = await createV3SdkServices({
      runtimeConfig,
      deployment,
      provider: { kind: 'provider' },
      crypto,
      sdkLoader,
    });

    expect(services.primaryBundler.name).toBe('primary');
    expect(services.failoverBundler.name).toBe('failover');
    expect(services.bundler.providers).toEqual([
      services.primaryBundler,
      services.failoverBundler,
    ]);
    expect(services.vault.crypto).toBe(crypto);
    expect(services.coordinator.crypto).toBe(crypto);
    expect(services.sessionClient.provider).toEqual({ kind: 'provider' });
    expect(services.sessionClient.bundler).toBe(services.bundler);
    expect(services.addresses.paymaster).toBe(
      deployment.shared.sessionPaymaster.address,
    );
  });

  it('binds the default fetch implementation to the browser global', async () => {
    const originalFetch = globalThis.fetch;
    const browserFetch = vi.fn(function fetchWithBrowserReceiver() {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve({ ok: true });
    });
    globalThis.fetch = browserFetch;

    try {
      const services = await createV3SdkServices({
        runtimeConfig,
        deployment,
        provider: { kind: 'provider' },
        crypto: {},
        sdkLoader,
      });

      await expect(services.primaryBundler.fetchImpl()).resolves.toEqual({
        ok: true,
      });
      await expect(services.failoverBundler.fetchImpl()).resolves.toEqual({
        ok: true,
      });
      expect(browserFetch).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('creates the browser-compatible session client', async () => {
    expect(V3_SDK_BROWSER_COMPATIBILITY.sessionClient).toBe(true);
    const sessionClient = await createV3SessionClient({
      runtimeConfig,
      deployment,
      provider: { kind: 'provider' },
      crypto: {},
      sdkLoader,
    });
    expect(sessionClient).toBeInstanceOf(FakeSessionClient);
  });

  it('maps SDK and adapter errors into stable public descriptors', async () => {
    await expect(mapV3SdkError({ code: 'SDK_CODE' }, sdkLoader)).resolves.toEqual({
      code: 'SDK_CODE',
      message: 'mapped',
      retryable: false,
      directFallbackRecommended: false,
    });
    await expect(mapV3SdkError(new V3SdkAdapterError(
      'blocked',
      'SDK_BLOCKED',
    ), sdkLoader)).resolves.toEqual({
      code: 'SDK_BLOCKED',
      message: 'blocked',
      retryable: false,
      directFallbackRecommended: true,
    });
  });
});
