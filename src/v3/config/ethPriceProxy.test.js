import { describe, expect, it, vi } from 'vitest';
import {
  createV3EthPriceMiddleware,
  createV3EthPricePlugin,
} from '../../../scripts/v3-eth-price-proxy';

function createResponse() {
  const headers = {};
  return {
    statusCode: 0,
    headers,
    body: '',
    setHeader(name, value) {
      headers[name] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}

describe('V3 shared ETH price proxy', () => {
  it('registers Vite middleware without returning an invalid post-start hook', () => {
    const use = vi.fn();
    const plugin = createV3EthPricePlugin({ apiKey: 'test-key' });

    expect(plugin.configureServer({ middlewares: { use } })).toBeUndefined();
    expect(plugin.configurePreviewServer({ middlewares: { use } })).toBeUndefined();
    expect(use).toHaveBeenCalledTimes(2);
  });

  it('deduplicates simultaneous clients and caches one Etherscan price for a day', async () => {
    let clock = 1_000;
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: '1', result: { ethusd: '4000.25' } }),
    });
    const middleware = createV3EthPriceMiddleware({
      apiKey: 'test-key',
      fetchImpl,
      now: () => clock,
    });
    const first = createResponse();
    const second = createResponse();

    await Promise.all([
      middleware({ method: 'GET' }, first),
      middleware({ method: 'GET' }, second),
    ]);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(JSON.parse(first.body)).toEqual({ ethUsd: 4000.25 });
    expect(JSON.parse(second.body)).toEqual({ ethUsd: 4000.25 });
    expect(first.headers['Cache-Control']).toBe('public, max-age=86400');

    clock += 86_399_000;
    await middleware({ method: 'GET' }, createResponse());
    expect(fetchImpl).toHaveBeenCalledOnce();

    clock += 2_000;
    await middleware({ method: 'GET' }, createResponse());
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get('module')).toBe('stats');
    expect(requestedUrl.searchParams.get('action')).toBe('ethprice');
    expect(requestedUrl.searchParams.get('chainid')).toBe('1');
  });

  it('returns no price when Etherscan is unavailable', async () => {
    const response = createResponse();
    const middleware = createV3EthPriceMiddleware({
      apiKey: 'test-key',
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
    });

    await middleware({ method: 'GET' }, response);

    expect(response.statusCode).toBe(502);
    expect(JSON.parse(response.body)).not.toHaveProperty('ethUsd');
    expect(response.headers['Cache-Control']).toBe('no-store');
  });
});
