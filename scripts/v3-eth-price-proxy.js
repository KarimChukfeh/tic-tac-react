const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
const DEFAULT_CACHE_MS = 24 * 60 * 60 * 1000;

function sendJson(response, statusCode, body, cacheSeconds = 0) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader(
    'Cache-Control',
    cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store',
  );
  response.end(JSON.stringify(body));
}

export function createV3EthPriceMiddleware({
  apiKey,
  fetchImpl = globalThis.fetch,
  cacheMs = DEFAULT_CACHE_MS,
  now = () => Date.now(),
} = {}) {
  let cachedPrice = null;
  let cachedAt = 0;
  let pendingPrice = null;

  const readPrice = async () => {
    if (cachedPrice != null && now() - cachedAt < cacheMs) return cachedPrice;
    if (pendingPrice) return pendingPrice;

    pendingPrice = (async () => {
      if (!apiKey || typeof fetchImpl !== 'function') {
        throw new Error('ETH price unavailable');
      }

      const url = new URL(ETHERSCAN_API_URL);
      url.searchParams.set('chainid', '1');
      url.searchParams.set('module', 'stats');
      url.searchParams.set('action', 'ethprice');
      url.searchParams.set('apikey', apiKey);

      const upstream = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
      });
      if (!upstream.ok) throw new Error(`Etherscan returned ${upstream.status}`);

      const payload = await upstream.json();
      const ethUsd = Number(payload?.result?.ethusd);
      if (payload?.status !== '1' || !Number.isFinite(ethUsd) || ethUsd <= 0) {
        throw new Error('Etherscan returned an invalid ETH price');
      }

      cachedPrice = ethUsd;
      cachedAt = now();
      return ethUsd;
    })().finally(() => {
      pendingPrice = null;
    });

    return pendingPrice;
  };

  return async function v3EthPriceMiddleware(request, response) {
    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const ethUsd = await readPrice();
      sendJson(response, 200, { ethUsd }, Math.floor(cacheMs / 1000));
    } catch {
      sendJson(response, 502, { error: 'ETH price unavailable' });
    }
  };
}

export function createV3EthPricePlugin(options = {}) {
  const middleware = createV3EthPriceMiddleware(options);
  const install = (server) => {
    server.middlewares.use('/__v3/eth-price', middleware);
  };

  return {
    name: 'v3-eth-price-proxy',
    configureServer: install,
    configurePreviewServer: install,
  };
}
