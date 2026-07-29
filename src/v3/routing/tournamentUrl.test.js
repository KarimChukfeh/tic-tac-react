import { describe, expect, it } from 'vitest';
import {
  createV3TournamentUrl,
  getV3GameRoute,
  parseV3InstanceParam,
  V3_GAME_ROUTES,
} from './tournamentUrl';

const INSTANCE = '0x1111111111111111111111111111111111111111';

describe('V3 tournament URLs', () => {
  it('keeps every supported game in the V3 namespace', () => {
    expect(V3_GAME_ROUTES).toEqual({
      tictactoe: '/v3/tictactoe',
      connectfour: '/v3/connect4',
      chess: '/v3/chess',
    });
    expect(getV3GameRoute('connectfour')).toBe('/v3/connect4');
  });

  it('creates an address-backed V3 tournament URL', () => {
    expect(createV3TournamentUrl('chess', INSTANCE, 'https://play.example')).toBe(
      `https://play.example/v3/chess?c=${INSTANCE}`,
    );
  });

  it('parses only valid instance addresses', () => {
    expect(parseV3InstanceParam(new URLSearchParams(`c=${INSTANCE}`))).toBe(INSTANCE);
    expect(parseV3InstanceParam(new URLSearchParams('c=not-an-address'))).toBeNull();
    expect(parseV3InstanceParam(new URLSearchParams())).toBeNull();
  });

  it('rejects unsupported games and malformed addresses', () => {
    expect(() => getV3GameRoute('checkers')).toThrow('Unsupported V3 game');
    expect(() => createV3TournamentUrl('chess', '0x1234', 'https://play.example')).toThrow(
      'valid address',
    );
  });
});
