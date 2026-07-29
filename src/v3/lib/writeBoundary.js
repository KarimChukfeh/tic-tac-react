import { getAddress, isAddress } from 'ethers';

export class V3WriteBoundaryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'V3WriteBoundaryError';
  }
}

function contractAddress(contract, label) {
  const address = contract?.target ?? contract?.address;
  if (!isAddress(address || '')) {
    throw new V3WriteBoundaryError(`${label} has no valid contract address`);
  }
  return getAddress(address);
}

async function assertWriteChain(browserProvider, expectedChainId) {
  const network = await browserProvider?.getNetwork?.();
  if (!network || BigInt(network.chainId) !== BigInt(expectedChainId)) {
    throw new V3WriteBoundaryError(
      `Wallet chain does not match the validated V3 chain ${expectedChainId}`,
    );
  }
}

export async function getValidatedV3FactoryWriter({
  browserProvider,
  readFactory,
  expectedFactory,
  createContract,
  signer,
}) {
  await assertWriteChain(browserProvider, expectedFactory.chainId);
  const address = contractAddress(readFactory, 'V3 factory');
  if (address !== getAddress(expectedFactory.address)) {
    throw new V3WriteBoundaryError('Refusing a write through an unvalidated V3 factory');
  }

  const activeSigner = signer ?? await browserProvider.getSigner();
  return createContract(activeSigner, address);
}

export async function getValidatedV3InstanceWriter({
  browserProvider,
  readFactory,
  instanceContract,
  expectedFactory,
  createContract,
}) {
  await assertWriteChain(browserProvider, expectedFactory.chainId);
  const factoryAddress = contractAddress(readFactory, 'V3 factory');
  if (factoryAddress !== getAddress(expectedFactory.address)) {
    throw new V3WriteBoundaryError('Refusing an instance write through an unvalidated V3 factory');
  }

  const instanceAddress = contractAddress(instanceContract, 'V3 instance');
  let isRegistered = false;
  try {
    isRegistered = await readFactory.isInstance(instanceAddress);
  } catch {
    throw new V3WriteBoundaryError('Could not verify the instance against the V3 factory');
  }
  if (!isRegistered) {
    throw new V3WriteBoundaryError('Refusing a write to an instance outside the V3 factory');
  }

  const signer = await browserProvider.getSigner();
  return createContract(instanceAddress, signer);
}

