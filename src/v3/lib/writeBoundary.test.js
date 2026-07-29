import { describe, expect, it, vi } from 'vitest';
import {
  getValidatedV3FactoryWriter,
  getValidatedV3InstanceWriter,
  V3WriteBoundaryError,
} from './writeBoundary';

const FACTORY = '0x1111111111111111111111111111111111111111';
const INSTANCE = '0x2222222222222222222222222222222222222222';
const V2_FACTORY = '0x3333333333333333333333333333333333333333';
const signer = { address: 'primary' };
const browserProvider = {
  getNetwork: vi.fn().mockResolvedValue({ chainId: 412346n }),
  getSigner: vi.fn().mockResolvedValue(signer),
};
const expectedFactory = { address: FACTORY, chainId: 412346 };

describe('V3 write boundary', () => {
  it('creates a writer only for the validated factory and chain', async () => {
    const createContract = vi.fn().mockReturnValue({ target: FACTORY, runner: signer });
    const result = await getValidatedV3FactoryWriter({
      browserProvider,
      readFactory: { target: FACTORY },
      expectedFactory,
      createContract,
    });

    expect(result).toEqual({ target: FACTORY, runner: signer });
    expect(createContract).toHaveBeenCalledWith(signer, FACTORY);
  });

  it('rejects a mixed-generation factory address', async () => {
    await expect(getValidatedV3FactoryWriter({
      browserProvider,
      readFactory: { target: V2_FACTORY },
      expectedFactory,
      createContract: vi.fn(),
    })).rejects.toThrow(V3WriteBoundaryError);
  });

  it('rejects a wallet connected to another chain', async () => {
    await expect(getValidatedV3FactoryWriter({
      browserProvider: {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 42161n }),
        getSigner: vi.fn(),
      },
      readFactory: { target: FACTORY },
      expectedFactory,
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
      expectedFactory,
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
      expectedFactory,
      createContract: vi.fn(),
    })).rejects.toThrow('outside the V3 factory');
  });
});
