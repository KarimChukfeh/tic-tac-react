import { describe, expect, it } from 'vitest';
import { CHESS_DEPLOYMENT } from '../lib/chess';
import { CONNECTFOUR_DEPLOYMENT } from '../lib/connectfour';
import { TICTACTOE_DEPLOYMENT } from '../lib/tictactoe';

describe('generated V3 deployment artifacts', () => {
  it('loads all game deployments through the V3 validation boundary', () => {
    const deployments = [
      TICTACTOE_DEPLOYMENT,
      CONNECTFOUR_DEPLOYMENT,
      CHESS_DEPLOYMENT,
    ];

    expect(deployments.every((deployment) => deployment.generation === 'v3')).toBe(true);
    expect(new Set(deployments.map((deployment) => deployment.chainId))).toEqual(new Set([412346]));
    expect(new Set(deployments.map((deployment) => deployment.factory)).size).toBe(3);
    expect(new Set(deployments.map((deployment) => deployment.profileRegistry)).size).toBe(1);
    expect(new Set(deployments.map((deployment) => deployment.sessionRegistry)).size).toBe(1);
  });
});

