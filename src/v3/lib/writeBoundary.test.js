import { describe, expect, it, vi } from 'vitest';
import { keccak256 } from 'ethers';
import {
  getValidatedV3FactoryWriter,
  getValidatedV3InstanceWriter,
  V3WriteBoundaryError,
} from './writeBoundary';

const FACTORY = '0x1111111111111111111111111111111111111111';
const INSTANCE = '0x2222222222222222222222222222222222222222';
const V2_FACTORY = '0x3333333333333333333333333333333333333333';
const signer = { address: 'primary' };
const RUNTIME_CODE = '0x6000';
const runtimeContract = {
  key: 'TestContract',
  address: FACTORY,
  bytecodeHash: keccak256(RUNTIME_CODE),
};
const deployment = {
  id: 'test',
  generation: 'v3',
  factory: FACTORY,
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
const browserProvider = {
  getNetwork: vi.fn().mockResolvedValue({ chainId: 412346n }),
  getCode: vi.fn().mockResolvedValue(RUNTIME_CODE),
  getSigner: vi.fn().mockResolvedValue(signer),
};

describe('V3 write boundary', () => {
  it('creates a writer only for the validated factory and chain', async () => {
    const createContract = vi.fn().mockReturnValue({ target: FACTORY, runner: signer });
    const result = await getValidatedV3FactoryWriter({
      browserProvider,
      readFactory: { target: FACTORY },
      deployment,
      createContract,
    });

    expect(result).toEqual({ target: FACTORY, runner: signer });
    expect(createContract).toHaveBeenCalledWith(signer, FACTORY);
  });

  it('rejects a mixed-generation factory address', async () => {
    await expect(getValidatedV3FactoryWriter({
      browserProvider,
      readFactory: { target: V2_FACTORY },
      deployment,
      createContract: vi.fn(),
    })).rejects.toThrow(V3WriteBoundaryError);
  });

  it('rejects a wallet connected to another chain', async () => {
    await expect(getValidatedV3FactoryWriter({
      browserProvider: {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 42161n }),
        getCode: vi.fn(),
        getSigner: vi.fn(),
      },
      readFactory: { target: FACTORY },
      deployment,
      createContract: vi.fn(),
    })).rejects.toThrow('does not match the validated V3 chain');
  });

  it('verifies instance membership before creating a signer-backed contract', async () => {
    const createContract = vi.fn().mockReturnValue({ target: INSTANCE, runner: signer });
    const readFactory = {
      target: FACTORY,
      isInstance: vi.fn().mockResolvedValue(true),
    };

    await expect(getValidatedV3InstanceWriter({
      browserProvider,
      readFactory,
      instanceContract: { target: INSTANCE },
      deployment,
      createContract,
    })).resolves.toEqual({ target: INSTANCE, runner: signer });
    expect(readFactory.isInstance).toHaveBeenCalledWith(INSTANCE);
  });

  it('rejects an instance not registered by the V3 factory', async () => {
    await expect(getValidatedV3InstanceWriter({
      browserProvider,
      readFactory: {
        target: FACTORY,
        isInstance: vi.fn().mockResolvedValue(false),
      },
      instanceContract: { target: INSTANCE },
      deployment,
      createContract: vi.fn(),
    })).rejects.toThrow('outside the V3 factory');
  });

  it('rejects writes when deployed bytecode differs from the manifest', async () => {
    await expect(getValidatedV3FactoryWriter({
      browserProvider: {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 412346n }),
        getCode: vi.fn().mockResolvedValue('0x6001'),
        getSigner: vi.fn(),
      },
      readFactory: { target: FACTORY },
      deployment,
      createContract: vi.fn(),
    })).rejects.toThrow('bytecode does not match');
  });
});
