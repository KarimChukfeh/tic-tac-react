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
  TicTacChain: import.meta.env.VITE_TICTACCHAIN_ADDRESS || '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
  ChessOnChain: import.meta.env.VITE_CHESS_ADDRESS || '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
  ConnectFourOnChain: import.meta.env.VITE_CONNECTFOUR_ADDRESS || '0x59b670e9fA9D0A427751Af201D676719a970857b',
  // ETour Module Addresses
  ETour_Core: import.meta.env.VITE_ETOUR_CORE_ADDRESS || '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
  ETour_Matches: import.meta.env.VITE_ETOUR_MATCHES_ADDRESS || '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE',
  ETour_Prizes: import.meta.env.VITE_ETOUR_PRIZES_ADDRESS || '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
  ETour_Raffle: import.meta.env.VITE_ETOUR_RAFFLE_ADDRESS || '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
  ETour_Escalation: import.meta.env.VITE_ETOUR_ESCALATION_ADDRESS || '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d',
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
