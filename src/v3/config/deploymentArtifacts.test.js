import { describe, expect, it } from 'vitest';
import { CHESS_DEPLOYMENT } from '../lib/chess';
import { CONNECTFOUR_DEPLOYMENT } from '../lib/connectfour';
import { TICTACTOE_DEPLOYMENT } from '../lib/tictactoe';
import { V3_DEPLOYMENTS } from './deploymentLoader';

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
    expect(deployments).toEqual([
      V3_DEPLOYMENTS.games.tictactoe,
      V3_DEPLOYMENTS.games.connect4,
      V3_DEPLOYMENTS.games.chess,
    ]);
    expect(deployments.every((deployment) => (
      deployment.contracts.factory.abi.length > 0
      && deployment.contracts.implementation.abi.length > 0
      && /^0x[0-9a-f]{64}$/u.test(deployment.contracts.factory.bytecodeHash)
    ))).toBe(true);
  });
});
