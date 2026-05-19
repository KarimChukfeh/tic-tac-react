import TicTacToeV2FactoryData from '../v2/ABIs/TicTacToeFactory-ABI.json';

// Network configuration for ETour gaming platform
// Switch networks via VITE_NETWORK environment variable

export const NETWORKS = {
  localhost: {
    chainId: 412346,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: null,
    explorerName: null,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  arbitrumOne: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/SqzIja8yhoiiyN1fsMDlV',
    explorerUrl: 'https://arbiscan.io',
    explorerName: 'Arbiscan',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

const ABI_NETWORK_KEY_MAP = {
  arbitrum: 'arbitrumOne',
  arbitrumOne: 'arbitrumOne',
  localhost: 'localhost',
  hardhat: 'localhost',
};

function resolveDefaultNetworkKey() {
  const manifestNetwork = ABI_NETWORK_KEY_MAP[TicTacToeV2FactoryData.network];
  if (manifestNetwork && NETWORKS[manifestNetwork]) {
    return manifestNetwork;
  }

  const manifestChainId = Number(TicTacToeV2FactoryData.chainId);
  const matchedNetwork = Object.entries(NETWORKS).find(([, network]) => network.chainId === manifestChainId);
  return matchedNetwork?.[0] || 'arbitrumOne';
}

const defaultNetworkKey = resolveDefaultNetworkKey();
const networkKey = import.meta.env.VITE_NETWORK || defaultNetworkKey;
const selectedNetwork = NETWORKS[networkKey] || NETWORKS[defaultNetworkKey];
const rpcUrlOverride = import.meta.env.VITE_V2_RPC_URL || import.meta.env.VITE_RPC_URL;

export const CURRENT_NETWORK = {
  ...selectedNetwork,
  rpcUrl: rpcUrlOverride || selectedNetwork.rpcUrl,
};

export const TARGET_CHAIN_ID_HEX = `0x${CURRENT_NETWORK.chainId.toString(16)}`;

export function getWalletAddChainParams() {
  return {
    chainId: TARGET_CHAIN_ID_HEX,
    chainName: CURRENT_NETWORK.name,
    nativeCurrency: CURRENT_NETWORK.nativeCurrency,
    rpcUrls: [CURRENT_NETWORK.rpcUrl],
    blockExplorerUrls: CURRENT_NETWORK.explorerUrl ? [CURRENT_NETWORK.explorerUrl] : undefined,
  };
}

// Helper to get explorer URL for a transaction
export function getTransactionUrl(txHash) {
  if (!CURRENT_NETWORK.explorerUrl) return null;
  return `${CURRENT_NETWORK.explorerUrl}/tx/${txHash}`;
}

// Helper to get explorer URL for an address
export function getAddressUrl(address) {
  if (!CURRENT_NETWORK.explorerUrl) return null;
  return `${CURRENT_NETWORK.explorerUrl}/address/${address}`;
}

// Helper to get explorer URL for the block explorer home
export function getExplorerHomeUrl() {
  return CURRENT_NETWORK.explorerUrl;
}
