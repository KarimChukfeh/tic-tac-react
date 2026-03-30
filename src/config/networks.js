import TicTacToeV2FactoryData from '../v2/ABIs/TicTacChainFactory-ABI.json';

// Network configuration for ETour gaming platform
// Switch networks via VITE_NETWORK environment variable

export const NETWORKS = {
  localhost: {
    // chainId: 42161,
    // name: 'Arbitrum One',
    // rpcUrl: 'https://arb1.arbitrum.io/rpc',
    // explorerUrl: 'https://arbiscan.io',
    // explorerName: 'Arbiscan',
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
  return matchedNetwork?.[0] || 'localhost';
}

const networkKey = import.meta.env.VITE_NETWORK || resolveDefaultNetworkKey();
const selectedNetwork = NETWORKS[networkKey] || NETWORKS.localhost;

export const CURRENT_NETWORK = {
  ...selectedNetwork,
  rpcUrl: import.meta.env.VITE_V2_RPC_URL || selectedNetwork.rpcUrl,
};

// Contract addresses - can be overridden via environment variables
export const CONTRACT_ADDRESSES = {
  TicTacChain: import.meta.env.VITE_TICTACCHAIN_ADDRESS || '0x67d269191c92Caf3cD7723F116c85e6E9bf55933',
  ChessOnChain: import.meta.env.VITE_CHESS_ADDRESS || '0x9A676e781A523b5d0C0e43731313A708CB607508',
  ConnectFourOnChain: import.meta.env.VITE_CONNECTFOUR_ADDRESS || '0x59b670e9fA9D0A427751Af201D676719a970857b',
  // ETour Module Addresses (shared across games)
  ETour_Core: import.meta.env.VITE_ETOUR_CORE_ADDRESS || '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
  ETour_Matches: import.meta.env.VITE_ETOUR_MATCHES_ADDRESS || '0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f',
  ETour_Prizes: import.meta.env.VITE_ETOUR_PRIZES_ADDRESS || '0x4A679253410272dd5232B3Ff7cF5dbB88f295319',
  ETour_Raffle: import.meta.env.VITE_ETOUR_RAFFLE_ADDRESS || '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F',
  ETour_Escalation: import.meta.env.VITE_ETOUR_ESCALATION_ADDRESS || '0x09635F643e140090A9A8Dcd712eD6285858ceBef',
  ETour_GameCache: import.meta.env.VITE_ETOUR_GAMECACHE_ADDRESS || '0xc5a5C42992dECbae36851359345FE25997F5C42d',
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
