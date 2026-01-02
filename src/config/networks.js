// Network configuration for ETour gaming platform
// Switch networks via VITE_NETWORK environment variable

export const NETWORKS = {
  localhost: {
    chainId: 412346,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: null,
    explorerName: null,
  },
  arbitrumOne: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    explorerName: 'Arbiscan',
  },
};

// Get current network from environment, default to localhost
const networkKey = import.meta.env.VITE_NETWORK || 'localhost';
export const CURRENT_NETWORK = NETWORKS[networkKey] || NETWORKS.localhost;

// Contract addresses - can be overridden via environment variables
export const CONTRACT_ADDRESSES = {
  TicTacChain: import.meta.env.VITE_TICTACCHAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  ChessOnChain: import.meta.env.VITE_CHESS_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  ConnectFourOnChain: import.meta.env.VITE_CONNECTFOUR_ADDRESS || '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
};

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
