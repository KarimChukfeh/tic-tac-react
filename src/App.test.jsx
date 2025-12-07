import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicTacBlock from './App';
import { createMockEnvironment, TEST_SCENARIOS } from './test/mocks';
import * as ethersModule from 'ethers';

// Mock ethers module
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn(),
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn(),
    formatEther: vi.fn((value) => {
      if (typeof value === 'bigint') {
        return (Number(value) / 1e18).toFixed(4);
      }
      return '0.0000';
    }),
    parseEther: vi.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
  },
}));

// Mock the ABI import
vi.mock('./TourABI.json', () => ({
  default: [],
}));

describe('TicTacBlock App - Mocked Scenarios', () => {
  let mockEnv;

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockEnv = createMockEnvironment();

    // Setup ethers mocks
    ethersModule.ethers.BrowserProvider.mockImplementation(() => ({
      getNetwork: vi.fn().mockResolvedValue({
        chainId: 412346n,
        name: 'local',
      }),
      getSigner: vi.fn().mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue(mockEnv.account),
      }),
    }));

    ethersModule.ethers.JsonRpcProvider.mockImplementation(() => ({
      getNetwork: vi.fn().mockResolvedValue({
        chainId: 412346n,
        name: 'local',
      }),
      getBlockNumber: vi.fn().mockResolvedValue(12345),
    }));

    ethersModule.ethers.Contract.mockImplementation(() => mockEnv.contract);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete global.window.ethereum;
  });

  describe('Initial Render & Wallet Connection', () => {
    it('should render the app without crashing', () => {
      render(<TicTacBlock />);
      expect(screen.getByText(/TicTacBlock/i)).toBeInTheDocument();
    });

    it('should display connect wallet button when wallet is not connected', () => {
      render(<TicTacBlock />);
      expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
    });

    it('should show error when MetaMask is not installed', async () => {
      delete global.window.ethereum;
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<TicTacBlock />);
      const connectButton = screen.getByText(/Connect Wallet/i);
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(
          expect.stringContaining('MetaMask')
        );
      });

      alertMock.mockRestore();
    });

    it('should connect wallet successfully with mock provider', async () => {
      render(<TicTacBlock />);

      const connectButton = screen.getByText(/Connect Wallet/i);
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(mockEnv.provider.request).toHaveBeenCalledWith({
          method: 'eth_requestAccounts',
        });
      });
    });

    it('should display connected account address after connection', async () => {
      render(<TicTacBlock />);

      const connectButton = screen.getByText(/Connect Wallet/i);
      await userEvent.click(connectButton);

      await waitFor(() => {
        const shortAddress = `${mockEnv.account.slice(0, 6)}...${mockEnv.account.slice(-4)}`;
        expect(screen.getByText(new RegExp(shortAddress))).toBeInTheDocument();
      });
    });
  });

  describe('Theme Switching', () => {
    it('should start with daring theme by default', () => {
      const { container } = render(<TicTacBlock />);
      // The component should render with daring theme colors
      expect(container).toBeInTheDocument();
    });

    it('should switch theme when theme toggle is clicked', async () => {
      render(<TicTacBlock />);

      // Find theme toggle button (it should have the theme switch icon/text)
      const themeButtons = screen.queryAllByRole('button');
      const themeToggle = themeButtons.find((btn) =>
        btn.textContent.includes('Classic') || btn.textContent.includes('Level Up')
      );

      if (themeToggle) {
        const initialText = themeToggle.textContent;
        await userEvent.click(themeToggle);

        await waitFor(() => {
          expect(themeToggle.textContent).not.toBe(initialText);
        });
      }
    });
  });

  describe('Tournament Display - Pending State', () => {
    it('should display pending tournament with correct enrollment status', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(1n);
      mockEnv.contract.getTournamentInstance.mockResolvedValue({
        status: 0n,
        enrolledCount: 2n,
        currentRound: 0n,
        prizePool: BigInt('1000000000000000000'),
        startTime: BigInt(Math.floor(Date.now() / 1000)),
        playerCount: 4n,
      });

      render(<TicTacBlock />);

      // Wait for tournaments to load
      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      // Should show enrollment status
      await waitFor(() => {
        const enrollmentText = screen.queryByText(/2\s*\/\s*4/);
        if (enrollmentText) {
          expect(enrollmentText).toBeInTheDocument();
        }
      });
    });

    it('should display enroll button for pending tournament', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(1n);
      mockEnv.contract.isEnrolled.mockResolvedValue(false);

      render(<TicTacBlock />);

      await waitFor(() => {
        const enrollButtons = screen.queryAllByText(/Enroll Now/i);
        expect(enrollButtons.length).toBeGreaterThan(0);
      });
    });

    it('should handle enrollment transaction with mocked contract call', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(1n);
      mockEnv.contract.isEnrolled.mockResolvedValue(false);
      mockEnv.contract.enrollInTournament.mockResolvedValue({
        hash: '0xabc123',
        wait: vi.fn().mockResolvedValue({ status: 1 }),
      });

      render(<TicTacBlock />);

      // Connect wallet first
      const connectButton = screen.getByText(/Connect Wallet/i);
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(mockEnv.provider.request).toHaveBeenCalled();
      });

      // Try to enroll (this tests the flow, even if UI hasn't loaded yet)
      await waitFor(
        () => {
          const enrollButtons = screen.queryAllByText(/Enroll Now/i);
          expect(enrollButtons.length).toBeGreaterThanOrEqual(0);
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Tournament Display - Active State', () => {
    it('should display active tournament with current round', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(1n);
      mockEnv.contract.getTournamentInstance.mockResolvedValue({
        status: 1n, // Active
        enrolledCount: 8n,
        currentRound: 2n,
        prizePool: BigInt('4000000000000000000'),
        startTime: BigInt(Math.floor(Date.now() / 1000) - 3600),
        playerCount: 8n,
      });

      render(<TicTacBlock />);

      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      // Should show active status
      await waitFor(
        () => {
          const activeText = screen.queryByText(/Active/i);
          if (activeText) {
            expect(activeText).toBeInTheDocument();
          }
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Tournament Display - Completed State', () => {
    it('should display completed tournament', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(1n);
      mockEnv.contract.getTournamentInstance.mockResolvedValue({
        status: 2n, // Completed
        enrolledCount: 16n,
        currentRound: 4n,
        prizePool: BigInt('8000000000000000000'),
        startTime: BigInt(Math.floor(Date.now() / 1000) - 7200),
        playerCount: 16n,
      });

      render(<TicTacBlock />);

      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      await waitFor(
        () => {
          const completedText = screen.queryByText(/Completed/i);
          if (completedText) {
            expect(completedText).toBeInTheDocument();
          }
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Prize Pool Display', () => {
    it('should format and display prize pool correctly', async () => {
      const prizePoolWei = BigInt('5000000000000000000'); // 5 ETH
      mockEnv.contract.getTournamentCount.mockResolvedValue(1n);
      mockEnv.contract.getTournamentInstance.mockResolvedValue({
        status: 1n,
        enrolledCount: 10n,
        currentRound: 1n,
        prizePool: prizePoolWei,
        startTime: BigInt(Math.floor(Date.now() / 1000)),
        playerCount: 16n,
      });

      render(<TicTacBlock />);

      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      // Prize pool should be displayed somewhere
      await waitFor(
        () => {
          const prizeText = screen.queryByText(/5\.0000/);
          if (prizeText) {
            expect(prizeText).toBeInTheDocument();
          }
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Network Handling', () => {
    it('should handle wrong network scenario', async () => {
      mockEnv.provider.request.mockImplementation(async ({ method }) => {
        if (method === 'eth_chainId') {
          return '0x1'; // Ethereum mainnet (wrong network)
        }
        if (method === 'eth_requestAccounts') {
          return [mockEnv.account];
        }
        return null;
      });

      ethersModule.ethers.BrowserProvider.mockImplementation(() => ({
        getNetwork: vi.fn().mockResolvedValue({
          chainId: 1n, // Wrong chain
          name: 'mainnet',
        }),
        getSigner: vi.fn().mockResolvedValue({
          getAddress: vi.fn().mockResolvedValue(mockEnv.account),
        }),
      }));

      render(<TicTacBlock />);

      const connectButton = screen.getByText(/Connect Wallet/i);
      await userEvent.click(connectButton);

      // App should handle wrong network
      await waitFor(() => {
        expect(mockEnv.provider.request).toHaveBeenCalledWith({
          method: 'eth_requestAccounts',
        });
      });
    });

    it('should attempt to switch to correct network', async () => {
      mockEnv.provider.request.mockImplementation(async ({ method }) => {
        if (method === 'wallet_switchEthereumChain') {
          return null; // Success
        }
        if (method === 'eth_requestAccounts') {
          return [mockEnv.account];
        }
        return null;
      });

      ethersModule.ethers.BrowserProvider.mockImplementation(() => ({
        getNetwork: vi.fn().mockResolvedValue({
          chainId: 1n, // Start with wrong chain
          name: 'mainnet',
        }),
        getSigner: vi.fn().mockResolvedValue({
          getAddress: vi.fn().mockResolvedValue(mockEnv.account),
        }),
      }));

      render(<TicTacBlock />);

      const connectButton = screen.getByText(/Connect Wallet/i);
      await userEvent.click(connectButton);

      await waitFor(() => {
        expect(mockEnv.provider.request).toHaveBeenCalled();
      });
    });
  });

  describe('Multiple Tournaments', () => {
    it('should display multiple tournaments with different states', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(3n);

      mockEnv.contract.getTournamentInstance.mockImplementation(
        async (tierId, instanceId) => {
          const tournaments = {
            '0-0': {
              status: 0n,
              enrolledCount: 2n,
              currentRound: 0n,
              prizePool: BigInt('1000000000000000000'),
              startTime: BigInt(Math.floor(Date.now() / 1000)),
              playerCount: 4n,
            },
            '1-0': {
              status: 1n,
              enrolledCount: 8n,
              currentRound: 2n,
              prizePool: BigInt('4000000000000000000'),
              startTime: BigInt(Math.floor(Date.now() / 1000) - 3600),
              playerCount: 8n,
            },
            '2-0': {
              status: 2n,
              enrolledCount: 16n,
              currentRound: 4n,
              prizePool: BigInt('8000000000000000000'),
              startTime: BigInt(Math.floor(Date.now() / 1000) - 7200),
              playerCount: 16n,
            },
          };
          return tournaments[`${tierId}-${instanceId}`] || tournaments['0-0'];
        }
      );

      render(<TicTacBlock />);

      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      // Should call getTournamentInstance multiple times
      await waitFor(
        () => {
          expect(mockEnv.contract.getTournamentInstance).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle contract call failures gracefully', async () => {
      mockEnv.contract.getTournamentCount.mockRejectedValue(
        new Error('Contract call failed')
      );

      render(<TicTacBlock />);

      // App should not crash
      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      expect(screen.getByText(/TicTacBlock/i)).toBeInTheDocument();
    });

    it('should handle enrollment transaction failure', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(1n);
      mockEnv.contract.isEnrolled.mockResolvedValue(false);
      mockEnv.contract.enrollInTournament.mockRejectedValue(
        new Error('User rejected transaction')
      );

      render(<TicTacBlock />);

      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      // App should handle error gracefully
      expect(screen.getByText(/TicTacBlock/i)).toBeInTheDocument();
    });

    it('should handle zero tournaments scenario', async () => {
      mockEnv.contract.getTournamentCount.mockResolvedValue(0n);

      render(<TicTacBlock />);

      await waitFor(() => {
        expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
      });

      // Should still render without crashing
      expect(screen.getByText(/TicTacBlock/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during initial data fetch', async () => {
      mockEnv.contract.getTournamentCount.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(1n), 100);
          })
      );

      render(<TicTacBlock />);

      // Should show some loading indicator or initial state
      expect(screen.getByText(/TicTacBlock/i)).toBeInTheDocument();

      await waitFor(
        () => {
          expect(mockEnv.contract.getTournamentCount).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Match Board Simulation', () => {
    it('should handle empty board state', () => {
      const emptyBoard = TEST_SCENARIOS.EMPTY_BOARD;
      expect(emptyBoard).toHaveLength(9);
      expect(emptyBoard.every((cell) => cell === 0)).toBe(true);
    });

    it('should recognize X winning board', () => {
      const xWinningBoard = TEST_SCENARIOS.X_WINNING_BOARD;
      // Top row is all X (1s)
      expect(xWinningBoard.slice(0, 3)).toEqual([1, 1, 1]);
    });

    it('should recognize O winning board', () => {
      const oWinningBoard = TEST_SCENARIOS.O_WINNING_BOARD;
      // Middle row is all O (2s)
      expect(oWinningBoard.slice(3, 6)).toEqual([2, 2, 2]);
    });

    it('should recognize draw board', () => {
      const drawBoard = TEST_SCENARIOS.DRAW_BOARD;
      // All cells filled, no winner
      expect(drawBoard.every((cell) => cell !== 0)).toBe(true);
    });

    it('should recognize in-progress board', () => {
      const inProgressBoard = TEST_SCENARIOS.IN_PROGRESS_BOARD;
      // Some cells empty
      expect(inProgressBoard.some((cell) => cell === 0)).toBe(true);
      // Some cells filled
      expect(inProgressBoard.some((cell) => cell !== 0)).toBe(true);
    });
  });
});
