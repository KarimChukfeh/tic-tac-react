import { describe, expect, it } from 'vitest';
import { validateV3GameDeployment, V3DeploymentValidationError } from './deploymentGuard';

const FACTORY = '0x1111111111111111111111111111111111111111';
const IMPLEMENTATION = '0x2222222222222222222222222222222222222222';
const PROFILE_REGISTRY = '0x3333333333333333333333333333333333333333';
const SESSION_REGISTRY = '0x4444444444444444444444444444444444444444';

function artifacts() {
  return {
    manifest: {
      generation: 'v3',
      network: 'localhost',
      chainId: '412346',
      factories: { TicTacToeFactory: FACTORY },
      playerProfile: { PlayerRegistry: PROFILE_REGISTRY },
      sessionAuthorization: { SessionKeyRegistry: SESSION_REGISTRY },
    },
    gamePayload: {
      network: 'localhost',
      chainId: '412346',
      factory: {
        address: FACTORY,
        abi: [{
          type: 'function',
          name: 'createInstance',
          inputs: ['uint8', 'uint256', 'uint256', 'uint256', 'uint256', 'address']
            .map((type) => ({ type })),
        }],
      },
      instance: {
        address: IMPLEMENTATION,
        abi: [{
          type: 'function',
          name: 'enrollInTournament',
          inputs: [{ type: 'address' }],
        }],
      },
      playerProfile: { PlayerRegistry: { address: PROFILE_REGISTRY } },
      sessionAuthorization: { SessionKeyRegistry: { address: SESSION_REGISTRY } },
    },
    localPayload: {
      network: 'localhost',
      chainId: '412346',
      factory: { TicTacToeFactory: FACTORY },
      playerProfile: { PlayerRegistry: PROFILE_REGISTRY },
      sessionAuthorization: { SessionKeyRegistry: SESSION_REGISTRY },
    },
    factoryName: 'TicTacToeFactory',
  };
}

describe('V3 deployment guard', () => {
  it('normalizes a consistent V3 deployment', () => {
    expect(validateV3GameDeployment(artifacts())).toMatchObject({
      generation: 'v3',
      chainId: 412346,
      factory: FACTORY,
      implementation: IMPLEMENTATION,
      profileRegistry: PROFILE_REGISTRY,
      sessionRegistry: SESSION_REGISTRY,
    });
  });

  it.each([
    ['generation', (value) => { value.manifest.generation = 'v2'; }],
    ['chain', (value) => { value.gamePayload.chainId = '42161'; }],
    ['factory', (value) => { value.gamePayload.factory.address = IMPLEMENTATION; }],
    ['session registry', (value) => {
      value.gamePayload.sessionAuthorization.SessionKeyRegistry.address = IMPLEMENTATION;
    }],
    ['V3 create signature', (value) => { value.gamePayload.factory.abi[0].inputs.pop(); }],
  ])('rejects a mismatched %s', (_label, mutate) => {
    const value = artifacts();
    mutate(value);
    expect(() => validateV3GameDeployment(value)).toThrow(V3DeploymentValidationError);
  });
});

