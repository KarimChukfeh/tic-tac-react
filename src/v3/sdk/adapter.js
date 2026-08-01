import { JsonRpcProvider } from 'ethers';
import { V3_DEPLOYMENTS } from '../config/deploymentLoader';
import {
  V3_RUNTIME_CONFIG,
  V3RuntimeConfigurationError,
} from '../config/runtimeConfig';

export const V3_SDK_BROWSER_COMPATIBILITY = Object.freeze({
  bundlerClient: true,
  encryptedVault: true,
  coordinator: true,
  errorMapping: true,
  sessionClient: true,
  blocker: null,
});

export class V3SdkAdapterError extends Error {
  constructor(message, code, options) {
    super(message, options);
    this.name = 'V3SdkAdapterError';
    this.code = code;
  }
}

export async function loadBrowserSafeV3Sdk() {
  const [
    bundler,
    storage,
    coordinator,
    errors,
    sessionClient,
  ] = await Promise.all([
    import('../vendor/sdk/dist/bundler-client.js'),
    import('../vendor/sdk/dist/session-storage.js'),
    import('../vendor/sdk/dist/session-coordinator.js'),
    import('../vendor/sdk/dist/errors.js'),
    import('./generated/session-client.js'),
  ]);
  return Object.freeze({
    ...bundler,
    ...storage,
    ...coordinator,
    ...errors,
    ...sessionClient,
  });
}

function assertSessionRuntime(runtimeConfig) {
  if (runtimeConfig.capabilities?.sponsorshipEnabled === false) {
    throw new V3RuntimeConfigurationError(
      'Sponsored session moves are disabled; use the primary wallet',
      'V3_SPONSORSHIP_DISABLED',
    );
  }
  if (!runtimeConfig.rpcUrl) {
    throw new V3RuntimeConfigurationError(
      'V3 RPC configuration is required to create SDK services',
      'V3_RPC_URL_MISSING',
    );
  }
  if (!runtimeConfig.bundlerPrimaryUrl || !runtimeConfig.bundlerFailoverUrl) {
    throw new V3RuntimeConfigurationError(
      'Both V3 bundler URLs are required to create failover services',
      'V3_BUNDLER_URLS_MISSING',
    );
  }
}

export function createV3RpcProvider(
  runtimeConfig = V3_RUNTIME_CONFIG,
  Provider = JsonRpcProvider,
) {
  if (!runtimeConfig.rpcUrl) {
    throw new V3RuntimeConfigurationError(
      'V3 RPC configuration is required',
      'V3_RPC_URL_MISSING',
    );
  }
  return new Provider(
    runtimeConfig.rpcUrl,
    runtimeConfig.chainId,
    { staticNetwork: true },
  );
}

export async function createV3SdkServices({
  runtimeConfig = V3_RUNTIME_CONFIG,
  deployment = V3_DEPLOYMENTS,
  provider,
  fetchImpl,
  crypto = globalThis.crypto,
  sdkLoader = loadBrowserSafeV3Sdk,
} = {}) {
  assertSessionRuntime(runtimeConfig);
  const sdk = await sdkLoader();
  const rpcProvider = provider ?? createV3RpcProvider(runtimeConfig);
  const bundlerFetch = fetchImpl ?? globalThis.fetch?.bind(globalThis);
  const primary = new sdk.JsonRpcBundler({
    name: 'primary',
    url: runtimeConfig.bundlerPrimaryUrl,
    fetchImpl: bundlerFetch,
  });
  const failover = new sdk.JsonRpcBundler({
    name: 'failover',
    url: runtimeConfig.bundlerFailoverUrl,
    fetchImpl: bundlerFetch,
  });
  const bundler = new sdk.FailoverBundler({
    providers: [primary, failover],
    entryPoint: deployment.shared.entryPoint.address,
  });
  const vault = new sdk.SessionKeyVault({ crypto });
  const coordinator = new sdk.SessionCoordinator({ crypto });
  const sessionClient = new sdk.V3SessionClient({
    provider: rpcProvider,
    bundler,
    vault,
    coordinator,
    crypto,
    addresses: {
      entryPoint: deployment.shared.entryPoint.address,
      sessionRegistry: deployment.shared.sessionRegistry.address,
      sessionAccountFactory: deployment.shared.sessionAccountFactory.address,
      paymaster: deployment.shared.sessionPaymaster.address,
    },
  });

  return Object.freeze({
    provider: rpcProvider,
    primaryBundler: primary,
    failoverBundler: failover,
    bundler,
    vault,
    coordinator,
    sessionClient,
    addresses: Object.freeze({
      entryPoint: deployment.shared.entryPoint.address,
      sessionRegistry: deployment.shared.sessionRegistry.address,
      sessionAccountFactory: deployment.shared.sessionAccountFactory.address,
      paymaster: deployment.shared.sessionPaymaster.address,
    }),
    compatibility: V3_SDK_BROWSER_COMPATIBILITY,
  });
}

export async function createV3SessionClient(options = {}) {
  const services = await createV3SdkServices(options);
  return services.sessionClient;
}

export async function mapV3SdkError(
  error,
  sdkLoader = loadBrowserSafeV3Sdk,
) {
  if (error instanceof V3SdkAdapterError) {
    return Object.freeze({
      code: error.code,
      message: error.message,
      retryable: false,
      directFallbackRecommended: true,
    });
  }
  try {
    const sdk = await sdkLoader();
    return Object.freeze(sdk.mapV3Error(error));
  } catch {
    return Object.freeze({
      code: 'V3_SDK_ERROR_MAPPING_UNAVAILABLE',
      message: 'The session service could not classify this error. Use the primary wallet if available.',
      retryable: true,
      directFallbackRecommended: true,
    });
  }
}
