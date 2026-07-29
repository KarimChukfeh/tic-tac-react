import { isAddress } from 'ethers';
import { V3_RUNTIME_CONFIG } from './runtimeConfig';

const NETWORK_METADATA = Object.freeze({
  localhost: Object.freeze({
    chainName: 'ETour V3 Local',
    nativeCurrency: Object.freeze({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    }),
    explorerUrl: null,
  }),
});

function metadataFor(config = V3_RUNTIME_CONFIG) {
  return NETWORK_METADATA[config.network] || {
    chainName: `ETour V3 ${config.network}`,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    explorerUrl: null,
  };
}

export const V3_NETWORK_NAME = metadataFor().chainName;
export const V3_TARGET_CHAIN_ID_HEX = `0x${V3_RUNTIME_CONFIG.chainId.toString(16)}`;

export function getV3WalletAddChainParams(config = V3_RUNTIME_CONFIG) {
  const metadata = metadataFor(config);
  if (!config.rpcUrl) {
    throw new Error('The validated V3 RPC URL is unavailable.');
  }
  return {
    chainId: `0x${config.chainId.toString(16)}`,
    chainName: metadata.chainName,
    nativeCurrency: metadata.nativeCurrency,
    rpcUrls: [config.rpcUrl],
    blockExplorerUrls: metadata.explorerUrl ? [metadata.explorerUrl] : undefined,
  };
}

export function getV3AddressUrl(address, config = V3_RUNTIME_CONFIG) {
  const explorerUrl = metadataFor(config).explorerUrl;
  if (!explorerUrl || !isAddress(address || '')) return null;
  return `${explorerUrl.replace(/\/$/u, '')}/address/${address}`;
}
