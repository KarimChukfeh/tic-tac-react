import { V3_DEPLOYMENTS } from './deploymentLoader';

const LOCAL_CHAIN_ID = 412346;
const LOCAL_RPC_URL = 'http://127.0.0.1:8545';
const LOCAL_BUNDLER_PRIMARY_URL = 'http://127.0.0.1:4337';
const LOCAL_BUNDLER_FAILOVER_URL = 'http://127.0.0.1:4338';
const LOCAL_BUNDLER_PRIMARY_PATH = '/__v3/bundler-primary';
const LOCAL_BUNDLER_FAILOVER_PATH = '/__v3/bundler-failover';

export class V3RuntimeConfigurationError extends Error {
  constructor(message, code = 'V3_RUNTIME_CONFIG_INVALID') {
    super(message);
    this.name = 'V3RuntimeConfigurationError';
    this.code = code;
  }
}

function endpoint(value, label) {
  const source = String(value ?? '').trim();
  if (!source) return null;

  let parsed;
  try {
    parsed = new URL(source);
  } catch {
    throw new V3RuntimeConfigurationError(`${label} must be an absolute HTTP(S) URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new V3RuntimeConfigurationError(`${label} must use HTTP or HTTPS`);
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw new V3RuntimeConfigurationError(
      `${label} must not contain credentials or a URL fragment`,
    );
  }
  return parsed.toString();
}

function publicEndpoint(value) {
  if (!value) return null;
  const parsed = new URL(value);
  return Object.freeze({
    origin: parsed.origin,
    path: parsed.pathname,
    hasQuery: Boolean(parsed.search),
    secure: parsed.protocol === 'https:',
  });
}

function localBrowserEndpoint(origin, path) {
  if (!origin) return null;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return null;
  }
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) return null;
  return new URL(path, parsed.origin).toString();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function enabledFlag(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new V3RuntimeConfigurationError(
    'VITE_V3_SPONSORSHIP_ENABLED must be true or false',
  );
}

export function loadV3RuntimeConfig(
  env = import.meta.env,
  deployment = V3_DEPLOYMENTS,
  browserOrigin = null,
) {
  const sponsorshipEnabled = enabledFlag(env?.VITE_V3_SPONSORSHIP_ENABLED);
  const isLocalDeployment = (
    deployment.network === 'localhost'
    && deployment.chainId === LOCAL_CHAIN_ID
  );
  const rpcUrl = endpoint(
    env?.VITE_V3_RPC_URL || (isLocalDeployment ? LOCAL_RPC_URL : null),
    'VITE_V3_RPC_URL',
  );
  const bundlerPrimaryUrl = endpoint(
    env?.VITE_V3_BUNDLER_URL_PRIMARY || (
      isLocalDeployment
        ? (
          localBrowserEndpoint(browserOrigin, LOCAL_BUNDLER_PRIMARY_PATH)
          || LOCAL_BUNDLER_PRIMARY_URL
        )
        : null
    ),
    'VITE_V3_BUNDLER_URL_PRIMARY',
  );
  const bundlerFailoverUrl = endpoint(
    env?.VITE_V3_BUNDLER_URL_FAILOVER || (
      isLocalDeployment
        ? (
          localBrowserEndpoint(browserOrigin, LOCAL_BUNDLER_FAILOVER_PATH)
          || LOCAL_BUNDLER_FAILOVER_URL
        )
        : null
    ),
    'VITE_V3_BUNDLER_URL_FAILOVER',
  );

  if (
    bundlerPrimaryUrl
    && bundlerFailoverUrl
    && bundlerPrimaryUrl === bundlerFailoverUrl
  ) {
    throw new V3RuntimeConfigurationError(
      'Primary and failover bundler URLs must be different',
    );
  }

  const issues = [];
  if (!sponsorshipEnabled) {
    issues.push({
      code: 'V3_SPONSORSHIP_DISABLED',
      severity: 'info',
      message: 'Sponsored moves are disabled. Wallet-confirmed gameplay remains available.',
    });
  }
  if (!rpcUrl) {
    issues.push({
      code: 'V3_RPC_URL_MISSING',
      severity: 'error',
      message: 'V3 RPC configuration is missing.',
    });
  }
  if (!bundlerPrimaryUrl) {
    issues.push({
      code: 'V3_PRIMARY_BUNDLER_MISSING',
      severity: 'warning',
      message: 'Sponsored moves are unavailable because the primary bundler URL is missing.',
    });
  }
  if (!bundlerFailoverUrl) {
    issues.push({
      code: 'V3_FAILOVER_BUNDLER_MISSING',
      severity: 'warning',
      message: 'Bundler failover is unavailable because the failover URL is missing.',
    });
  }

  const sessionSubmissionReady = Boolean(
    sponsorshipEnabled && rpcUrl && bundlerPrimaryUrl && bundlerFailoverUrl,
  );
  return deepFreeze({
    generation: deployment.generation,
    network: deployment.network,
    chainId: deployment.chainId,
    rpcUrl,
    bundlerPrimaryUrl,
    bundlerFailoverUrl,
    capabilities: {
      sponsorshipEnabled,
      readRpcConfigured: Boolean(rpcUrl),
      primaryBundlerConfigured: Boolean(bundlerPrimaryUrl),
      failoverBundlerConfigured: Boolean(bundlerFailoverUrl),
      sessionSubmissionReady,
      directPrimaryFallbackAvailable: true,
    },
    diagnostics: {
      generation: deployment.generation,
      network: deployment.network,
      chainId: deployment.chainId,
      sponsorshipEnabled,
      rpc: publicEndpoint(rpcUrl),
      bundlerPrimary: publicEndpoint(bundlerPrimaryUrl),
      bundlerFailover: publicEndpoint(bundlerFailoverUrl),
      sessionSubmissionReady,
      issues,
    },
  });
}

export const V3_RUNTIME_CONFIG = loadV3RuntimeConfig(
  import.meta.env,
  V3_DEPLOYMENTS,
  globalThis.location?.origin,
);
