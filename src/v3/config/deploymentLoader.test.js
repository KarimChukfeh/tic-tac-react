import { describe, expect, it, vi } from 'vitest';
import { keccak256 } from 'ethers';
import HardhatFactoryData from '../ABIs/localhost-hardhat-factory.json';
import ETourFactoryABIs from '../ABIs/localhost-ETour-Factory-ABIs.json';
import TicTacToeFactoryABIData from '../ABIs/localhost-TicTacToeFactory-ABI.json';
import ConnectFourFactoryABIData from '../ABIs/localhost-ConnectFourFactory-ABI.json';
import ChessFactoryABIData from '../ABIs/localhost-ChessFactory-ABI.json';
import LocalhostTicTacToeFactoryData from '../ABIs/localhost-tictac-factory.json';
import LocalhostConnectFourFactoryData from '../ABIs/localhost-connectfour-factory.json';
import LocalhostChessFactoryData from '../ABIs/localhost-chess-factory.json';
import { V3DeploymentValidationError } from './deploymentGuard';
import {
  normalizeV3DeploymentArtifacts,
  resolveV3ArtifactBundle,
  verifyV3DeploymentRuntime,
} from './deploymentLoader';

const ARTIFACT_NAMES = [
  'hardhat-factory.json',
  'ETour-Factory-ABIs.json',
  'PlayerProfile-ABI.json',
  'PlayerRegistry-ABI.json',
  'TicTacToeFactory-ABI.json',
  'ConnectFourFactory-ABI.json',
  'ChessFactory-ABI.json',
  'tictac-factory.json',
  'connectfour-factory.json',
  'chess-factory.json',
];

function artifacts() {
  return structuredClone({
    manifest: HardhatFactoryData,
    canonicalBundle: ETourFactoryABIs,
    gameArtifacts: {
      tictactoe: {
        gamePayload: TicTacToeFactoryABIData,
        localPayload: LocalhostTicTacToeFactoryData,
      },
      connect4: {
        gamePayload: ConnectFourFactoryABIData,
        localPayload: LocalhostConnectFourFactoryData,
      },
      chess: {
        gamePayload: ChessFactoryABIData,
        localPayload: LocalhostChessFactoryData,
      },
    },
  });
}

describe('normalized V3 deployment loader', () => {
  it.each([
    ['PRODUCTION', 'arbitrum'],
    ['production', 'localhost'],
    [undefined, 'localhost'],
  ])('selects the complete %s artifact set', (environment, expectedNetwork) => {
    const modules = Object.fromEntries(ARTIFACT_NAMES.flatMap((fileName) => [
      [`../ABIs/localhost-${fileName}`, { network: 'localhost', fileName }],
      [`../ABIs/arbitrum-${fileName}`, { network: 'arbitrum', fileName }],
    ]));

    const selected = resolveV3ArtifactBundle({ environment, modules });

    expect(selected.network).toBe(expectedNetwork);
    expect(Object.values(selected.payloads)).toHaveLength(ARTIFACT_NAMES.length);
    expect(Object.values(selected.payloads).every(
      (payload) => payload.network === expectedNetwork,
    )).toBe(true);
  });

  it('fails closed when a selected network artifact is missing', () => {
    expect(() => resolveV3ArtifactBundle({
      environment: 'PRODUCTION',
      modules: {},
    })).toThrow('Missing arbitrum V3 deployment artifact');
  });

  it('normalizes the complete generated deployment into immutable game contexts', () => {
    const deployment = normalizeV3DeploymentArtifacts(artifacts());

    expect(deployment).toMatchObject({
      schemaVersion: 3,
      manifestKind: 'complete-v3-deployment',
      generation: 'v3',
      network: 'localhost',
      chainId: 412346,
    });
    expect(Object.keys(deployment.games)).toEqual(['tictactoe', 'connect4', 'chess']);
    expect(deployment.games.chess.context).toEqual({
      generation: 'v3',
      chainId: 412346,
      factory: deployment.games.chess.factory,
      instance: null,
      profileRegistry: deployment.games.chess.profileRegistry,
      sessionRegistry: deployment.games.chess.sessionRegistry,
    });
    expect(deployment.shared.sessionTtlSeconds).toBe(3600);
    expect(deployment.shared.sessionAccountAbi.length).toBeGreaterThan(0);
    expect(Object.isFrozen(deployment.games.chess.contracts.factory.abi)).toBe(true);
  });

  it.each([
    ['schema version', (value) => { value.manifest.schemaVersion = 1; }],
    ['manifest kind', (value) => { value.manifest.manifestKind = 'partial'; }],
    ['account abstraction address', (value) => {
      value.manifest.accountAbstraction.sessionPaymaster = value.manifest.factories.TicTacToeFactory;
    }],
    ['implementation address', (value) => {
      value.gameArtifacts.chess.localPayload.implementation.Chess = value.manifest.factories.ChessFactory;
    }],
    ['canonical factory address', (value) => {
      value.canonicalBundle.factories.ConnectFourFactory.address = value.manifest.factories.ChessFactory;
    }],
    ['move ABI', (value) => {
      const move = value.gameArtifacts.tictactoe.gamePayload.instance.abi
        .find((entry) => entry.type === 'function' && entry.name === 'makeMove');
      move.inputs.pop();
    }],
    ['bytecode hash', (value) => {
      value.manifest.contracts.EntryPoint.runtimeBytecodeHash = '0x1234';
    }],
  ])('rejects an invalid %s', (_label, mutate) => {
    const value = artifacts();
    mutate(value);
    expect(() => normalizeV3DeploymentArtifacts(value))
      .toThrow(V3DeploymentValidationError);
  });
});

describe('V3 deployment runtime verification', () => {
  const CODE = '0x60006000';
  const ADDRESS = '0x1111111111111111111111111111111111111111';
  const runtimeContract = {
    key: 'RuntimeContract',
    address: ADDRESS,
    bytecodeHash: keccak256(CODE),
  };
  const deployment = {
    id: 'tictactoe',
    generation: 'v3',
    chainId: 412346,
    contracts: {
      factory: runtimeContract,
      implementation: runtimeContract,
      playerProfile: runtimeContract,
      profileRegistry: runtimeContract,
      sessionRegistry: runtimeContract,
      entryPoint: runtimeContract,
      simpleAccountImplementation: runtimeContract,
      simpleAccountFactory: runtimeContract,
      sessionAccountFactory: runtimeContract,
      sessionPaymaster: runtimeContract,
    },
  };

  it('confirms chain, live code, and manifest bytecode hashes', async () => {
    const provider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 412346n }),
      getCode: vi.fn().mockResolvedValue(CODE),
    };

    await expect(verifyV3DeploymentRuntime(deployment, provider)).resolves.toEqual({
      generation: 'v3',
      chainId: 412346,
      game: 'tictactoe',
      contracts: [{
        key: 'RuntimeContract',
        address: ADDRESS,
        bytecodeHash: keccak256(CODE),
      }],
    });
    expect(provider.getCode).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['wrong chain', {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 42161n }),
      getCode: vi.fn(),
    }],
    ['missing code', {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 412346n }),
      getCode: vi.fn().mockResolvedValue('0x'),
    }],
    ['wrong code', {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 412346n }),
      getCode: vi.fn().mockResolvedValue('0x6001'),
    }],
  ])('rejects runtime state with %s', async (_label, provider) => {
    await expect(verifyV3DeploymentRuntime(deployment, provider))
      .rejects.toThrow(V3DeploymentValidationError);
  });
});
