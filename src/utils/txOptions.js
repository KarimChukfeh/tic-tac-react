import { ethers } from 'ethers';

const PRIORITY_TIP = ethers.parseUnits('0.1', 'gwei');

// Returns EIP-1559 tx overrides that give slightly above-average priority
// without violating the maxFeePerGas >= maxPriorityFeePerGas invariant.
// Pass the ethers contract instance — its signer's provider is used to fetch
// the current base fee so maxFeePerGas is always set correctly.
// Falls back to an empty object if fee data is unavailable.
export async function getHighPriorityTx(contract) {
  try {
    const provider = contract?.runner?.provider;
    if (!provider) return {};
    const feeData = await provider.getFeeData();
    const baseFee = feeData.lastBaseFeePerGas ?? feeData.gasPrice ?? 0n;
    return {
      maxPriorityFeePerGas: PRIORITY_TIP,
      maxFeePerGas: baseFee + PRIORITY_TIP,
    };
  } catch {
    return {};
  }
}
