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
  sessionClient: false,
  blocker: 'SDK session-client imports Node module.createRequire through user-operation.js',
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
  ] = await Promise.all([
    import('../vendor/sdk/dist/bundler-client.js'),
    import('../vendor/sdk/dist/session-storage.js'),
    import('../vendor/sdk/dist/session-coordinator.js'),
    import('../vendor/sdk/dist/errors.js'),
  ]);
  return Object.freeze({
    ...bundler,
    ...storage,
    ...coordinator,
    ...errors,
  });
}

function assertSessionRuntime(runtimeConfig) {
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
  const primary = new sdk.JsonRpcBundler({
    name: 'primary',
    url: runtimeConfig.bundlerPrimaryUrl,
    fetchImpl,
  });
  const failover = new sdk.JsonRpcBundler({
    name: 'failover',
    url: runtimeConfig.bundlerFailoverUrl,
    fetchImpl,
  });
  const bundler = new sdk.FailoverBundler({
    providers: [primary, failover],
    entryPoint: deployment.shared.entryPoint.address,
  });
  const vault = new sdk.SessionKeyVault({ crypto });
  const coordinator = new sdk.SessionCoordinator({ crypto });

  return Object.freeze({
    provider: rpcProvider,
    primaryBundler: primary,
    failoverBundler: failover,
    bundler,
    vault,
    coordinator,
    addresses: Object.freeze({
      entryPoint: deployment.shared.entryPoint.address,
      sessionRegistry: deployment.shared.sessionRegistry.address,
      sessionAccountFactory: deployment.shared.sessionAccountFactory.address,
      paymaster: deployment.shared.sessionPaymaster.address,
    }),
    compatibility: V3_SDK_BROWSER_COMPATIBILITY,
  });
}

export function createV3SessionClient() {
  throw new V3SdkAdapterError(
    'The synchronized backend session client is not browser-loadable yet.',
    'V3_SDK_BROWSER_ENTRY_UNAVAILABLE',
  );
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
