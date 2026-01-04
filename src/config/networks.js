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
  ChessOnChain: import.meta.env.VITE_CHESS_ADDRESS || '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  ConnectFourOnChain: import.meta.env.VITE_CONNECTFOUR_ADDRESS || '0x59b670e9fA9D0A427751Af201D676719a970857b',
  // ETour Module Addresses
  ETour_Core: import.meta.env.VITE_ETOUR_CORE_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  ETour_Matches: import.meta.env.VITE_ETOUR_MATCHES_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  ETour_Prizes: import.meta.env.VITE_ETOUR_PRIZES_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  ETour_Raffle: import.meta.env.VITE_ETOUR_RAFFLE_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  ETour_Escalation: import.meta.env.VITE_ETOUR_ESCALATION_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
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
