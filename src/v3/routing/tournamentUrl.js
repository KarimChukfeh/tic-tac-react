const INSTANCE_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/u;

export const V3_GAME_ROUTES = Object.freeze({
  tictactoe: '/v3/tictactoe',
  connectfour: '/v3/connect4',
  chess: '/v3/chess',
});

export function getV3GameRoute(game) {
  const route = V3_GAME_ROUTES[game];
  if (!route) throw new RangeError(`Unsupported V3 game: ${game}`);
  return route;
}

export function parseV3InstanceParam(searchParams) {
  const instance = searchParams?.get('c');
  return instance && INSTANCE_ADDRESS_PATTERN.test(instance) ? instance : null;
}

export function createV3TournamentUrl(game, instance, origin = globalThis.location?.origin) {
  if (!INSTANCE_ADDRESS_PATTERN.test(instance || '')) {
    throw new TypeError('V3 tournament instance must be a valid address');
  }
  if (!origin) throw new Error('An origin is required to build a V3 tournament URL');

  return `${origin}${getV3GameRoute(game)}?c=${instance}`;
}

