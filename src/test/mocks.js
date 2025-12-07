import { vi } from 'vitest';

// Mock Ethereum Provider
export const createMockProvider = (overrides = {}) => {
  const mockProvider = {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    ...overrides,
  };

  // Default responses for common requests
  mockProvider.request.mockImplementation(async ({ method, params }) => {
    switch (method) {
      case 'eth_requestAccounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
      case 'eth_chainId':
        return '0x64aba'; // 412346 in hex
      case 'wallet_switchEthereumChain':
        return null;
      case 'wallet_addEthereumChain':
        return null;
      default:
        return null;
    }
  });

  return mockProvider;
};

// Mock Contract with realistic tournament data
export const createMockContract = (overrides = {}) => {
  const baseContract = {
    // Tournament queries
    getTournamentCount: vi.fn().mockResolvedValue(3n),
    getTournamentInstance: vi.fn().mockImplementation(async (tierId, instanceId) => {
      // Return different tournament states based on IDs
      const tournaments = {
        '0-0': {
          status: 0n, // Pending
          enrolledCount: 2n,
          currentRound: 0n,
          prizePool: BigInt('1000000000000000000'), // 1 ETH
          startTime: BigInt(Math.floor(Date.now() / 1000)),
          playerCount: 4n,
        },
        '1-0': {
          status: 1n, // Active
          enrolledCount: 8n,
          currentRound: 2n,
          prizePool: BigInt('4000000000000000000'), // 4 ETH
          startTime: BigInt(Math.floor(Date.now() / 1000) - 3600),
          playerCount: 8n,
        },
        '2-0': {
          status: 2n, // Completed
          enrolledCount: 16n,
          currentRound: 4n,
          prizePool: BigInt('8000000000000000000'), // 8 ETH
          startTime: BigInt(Math.floor(Date.now() / 1000) - 7200),
          playerCount: 16n,
        },
      };
      return tournaments[`${tierId}-${instanceId}`] || tournaments['0-0'];
    }),

    getTournamentRounds: vi.fn().mockResolvedValue([
      {
        matches: [
          {
            player1: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            player2: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
            winner: '0x0000000000000000000000000000000000000000',
            matchStatus: 0n,
            isDraw: false,
          },
          {
            player1: '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2',
            player2: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
            winner: '0x0000000000000000000000000000000000000000',
            matchStatus: 0n,
            isDraw: false,
          },
        ],
      },
    ]),

    getEnrolledPlayers: vi.fn().mockResolvedValue([
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2',
      '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
    ]),

    getTierInfo: vi.fn().mockImplementation(async (tierId) => {
      const tiers = {
        0: { entryFee: BigInt('100000000000000000'), playerCount: 4n }, // 0.1 ETH, 4 players
        1: { entryFee: BigInt('250000000000000000'), playerCount: 8n }, // 0.25 ETH, 8 players
        2: { entryFee: BigInt('500000000000000000'), playerCount: 16n }, // 0.5 ETH, 16 players
      };
      return tiers[tierId] || tiers[0];
    }),

    isEnrolled: vi.fn().mockResolvedValue(false),

    // Match queries
    getMatch: vi.fn().mockResolvedValue({
      player1: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      player2: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      currentPlayer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      board: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
      winner: '0x0000000000000000000000000000000000000000',
      isDraw: false,
      isActive: true,
      lastMoveTime: BigInt(Math.floor(Date.now() / 1000)),
    }),

    // Tournament actions
    enrollInTournament: vi.fn().mockResolvedValue({
      hash: '0xabc123',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),

    startTournament: vi.fn().mockResolvedValue({
      hash: '0xdef456',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),

    enterMatch: vi.fn().mockResolvedValue({
      hash: '0xghi789',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),

    // Match actions
    makeMove: vi.fn().mockResolvedValue({
      hash: '0xjkl012',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),

    claimTimeout: vi.fn().mockResolvedValue({
      hash: '0xmno345',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),

    // Listeners
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),

    ...overrides,
  };

  return baseContract;
};

// Mock ethers BrowserProvider
export const createMockBrowserProvider = (contractMock) => {
  const provider = {
    getNetwork: vi.fn().mockResolvedValue({
      chainId: 412346n,
      name: 'local',
    }),
    getSigner: vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
    }),
    getBlockNumber: vi.fn().mockResolvedValue(12345),
  };

  return provider;
};

// Mock JsonRpcProvider for read-only contracts
export const createMockJsonRpcProvider = () => {
  return {
    getNetwork: vi.fn().mockResolvedValue({
      chainId: 412346n,
      name: 'local',
    }),
    getBlockNumber: vi.fn().mockResolvedValue(12345),
  };
};

// Mock ethers Contract constructor
export const mockEthers = (contractMock) => {
  return {
    BrowserProvider: vi.fn((provider) => createMockBrowserProvider(contractMock)),
    JsonRpcProvider: vi.fn(() => createMockJsonRpcProvider()),
    Contract: vi.fn(() => contractMock),
    formatEther: vi.fn((value) => {
      // Simple implementation for testing
      if (typeof value === 'bigint') {
        return (Number(value) / 1e18).toFixed(4);
      }
      return '0.0000';
    }),
    parseEther: vi.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
  };
};

// Helper to create a complete mock environment
export const createMockEnvironment = () => {
  const contract = createMockContract();
  const provider = createMockProvider();
  const ethers = mockEthers(contract);

  // Setup window.ethereum
  global.window.ethereum = provider;

  return {
    contract,
    provider,
    ethers,
    account: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  };
};

// Test scenarios
export const TEST_SCENARIOS = {
  PENDING_TOURNAMENT: {
    tierId: 0,
    instanceId: 0,
    status: 0,
    enrolledCount: 2,
    playerCount: 4,
    prizePool: '1.0000',
    isFull: false,
  },

  ACTIVE_TOURNAMENT: {
    tierId: 1,
    instanceId: 0,
    status: 1,
    enrolledCount: 8,
    playerCount: 8,
    prizePool: '4.0000',
    currentRound: 2,
  },

  COMPLETED_TOURNAMENT: {
    tierId: 2,
    instanceId: 0,
    status: 2,
    enrolledCount: 16,
    playerCount: 16,
    prizePool: '8.0000',
    currentRound: 4,
  },

  EMPTY_BOARD: [0, 0, 0, 0, 0, 0, 0, 0, 0],

  X_WINNING_BOARD: [1, 1, 1, 2, 2, 0, 0, 0, 0], // X wins top row

  O_WINNING_BOARD: [1, 1, 0, 2, 2, 2, 1, 0, 0], // O wins middle row

  DRAW_BOARD: [1, 2, 1, 2, 2, 1, 2, 1, 2], // Draw

  IN_PROGRESS_BOARD: [1, 2, 1, 0, 2, 0, 0, 0, 0], // Game in progress
};
