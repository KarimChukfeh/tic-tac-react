import { describe, expect, it } from 'vitest';
import {
  loadV3RuntimeConfig,
  V3RuntimeConfigurationError,
} from './runtimeConfig';

const localDeployment = {
  generation: 'v3',
  network: 'localhost',
  chainId: 412346,
};

describe('V3 runtime configuration', () => {
  it('uses only the approved local RPC default', () => {
    const config = loadV3RuntimeConfig({}, localDeployment);

    expect(config.rpcUrl).toBe('http://127.0.0.1:8545/');
    expect(config.capabilities).toEqual({
      readRpcConfigured: true,
      primaryBundlerConfigured: false,
      failoverBundlerConfigured: false,
      sessionSubmissionReady: false,
      directPrimaryFallbackAvailable: true,
    });
    expect(config.diagnostics.issues.map((issue) => issue.code)).toEqual([
      'V3_PRIMARY_BUNDLER_MISSING',
      'V3_FAILOVER_BUNDLER_MISSING',
    ]);
  });

  it('requires explicit RPC configuration outside the approved local deployment', () => {
    const config = loadV3RuntimeConfig({}, {
      generation: 'v3',
      network: 'arbitrum',
      chainId: 42161,
    });

    expect(config.rpcUrl).toBeNull();
    expect(config.diagnostics.issues[0].code).toBe('V3_RPC_URL_MISSING');
  });

  it('parses distinct primary and failover bundlers and redacts query values', () => {
    const config = loadV3RuntimeConfig({
      VITE_V3_RPC_URL: 'https://rpc.example/v3?key=secret',
      VITE_V3_BUNDLER_URL_PRIMARY: 'https://primary.example/rpc?token=secret',
      VITE_V3_BUNDLER_URL_FAILOVER: 'https://failover.example/rpc',
    }, localDeployment);

    expect(config.capabilities.sessionSubmissionReady).toBe(true);
    expect(config.diagnostics.rpc).toEqual({
      origin: 'https://rpc.example',
      path: '/v3',
      hasQuery: true,
      secure: true,
    });
    expect(JSON.stringify(config.diagnostics)).not.toContain('secret');
  });

  it.each([
    ['relative URL', { VITE_V3_RPC_URL: '/rpc' }],
    ['non-HTTP URL', { VITE_V3_RPC_URL: 'ws://localhost:8545' }],
    ['embedded credentials', { VITE_V3_RPC_URL: 'https://user:pass@rpc.example' }],
    ['duplicate bundlers', {
      VITE_V3_BUNDLER_URL_PRIMARY: 'http://localhost:3000',
      VITE_V3_BUNDLER_URL_FAILOVER: 'http://localhost:3000',
    }],
  ])('rejects %s', (_label, env) => {
    expect(() => loadV3RuntimeConfig(env, localDeployment))
      .toThrow(V3RuntimeConfigurationError);
  });
});
