import { ethers } from 'ethers';

// Default high-priority transaction overrides.
// Sets a 0.3 gwei priority fee tip to encourage faster block inclusion.
// Users can still override this in their wallet before confirming.
export const HIGH_PRIORITY_TX = {
  maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
};
