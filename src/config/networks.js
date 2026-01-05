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
  TicTacChain: import.meta.env.VITE_TICTACCHAIN_ADDRESS || '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
  ChessOnChain: import.meta.env.VITE_CHESS_ADDRESS || '0x9A676e781A523b5d0C0e43731313A708CB607508',
  ConnectFourOnChain: import.meta.env.VITE_CONNECTFOUR_ADDRESS || '0x59b670e9fA9D0A427751Af201D676719a970857b',
  // ETour Module Addresses (shared across games)
  ETour_Core: import.meta.env.VITE_ETOUR_CORE_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  ETour_Matches: import.meta.env.VITE_ETOUR_MATCHES_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  ETour_Prizes: import.meta.env.VITE_ETOUR_PRIZES_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  ETour_Raffle: import.meta.env.VITE_ETOUR_RAFFLE_ADDRESS || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  ETour_Escalation: import.meta.env.VITE_ETOUR_ESCALATION_ADDRESS || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
  ETour_GameCache: import.meta.env.VITE_ETOUR_GAMECACHE_ADDRESS || '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  // TicTacToe-specific modules
  ETour_PlayerTracking: import.meta.env.VITE_ETOUR_PLAYERTRACKING_ADDRESS || '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
  ETour_TicTacToeGame: import.meta.env.VITE_ETOUR_TICTACTOEGAME_ADDRESS || '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
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
