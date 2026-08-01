const GAME_PATHS = Object.freeze({
  tictactoe: Object.freeze({ v2: '/tictactoe', v3: '/v3/tictactoe' }),
  connect4: Object.freeze({ v2: '/connect4', v3: '/v3/connect4' }),
  chess: Object.freeze({ v2: '/chess', v3: '/v3/chess' }),
});

export function getGenerationGamePath(game, generation) {
  const routes = GAME_PATHS[game];
  if (!routes || !['v2', 'v3'].includes(generation)) {
    throw new Error(`Unsupported game generation route: ${game}/${generation}`);
  }
  return routes[generation];
}
