import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  estimateV3MoveGasCost,
  formatV3GasCost,
  formatV3GasUsdCost,
  useV3MoveGasEstimate,
} from './useV3MoveGasEstimate';

describe('V3 next-move gas estimate', () => {
  it('formats to at most five decimals and floors sub-threshold values to zero', () => {
    expect(formatV3GasCost(9_999_999_999_999n)).toBe('0 ETH');
    expect(formatV3GasCost(10_000_000_000_000n)).toBe('0.00001 ETH');
    expect(formatV3GasCost(12_345_678_900_000n)).toBe('0.00001 ETH');
    expect(formatV3GasCost(1_234_567_890_000_000_000n)).toBe('1.23457 ETH');
  });

  it('uses the current fee and the game-specific session gas envelope', () => {
    expect(estimateV3MoveGasCost({ gasPrice: 25_000_000n }, 'tictactoe'))
      .toBe(10_000_000_000_000n);
    expect(estimateV3MoveGasCost({}, 'tictactoe')).toBeNull();
  });

  it('formats the ETH estimate using the shared daily USD rate', () => {
    expect(formatV3GasUsdCost(10_000_000_000_000n, 4_000))
      .toBe("~$0.04 as of today's ETH rates");
    expect(formatV3GasUsdCost(10_000_000_000_000n, null)).toBeNull();
  });

  it('loads and refreshes a formatted estimate from the provider', async () => {
    vi.useFakeTimers();
    const provider = {
      getFeeData: vi.fn()
        .mockResolvedValueOnce({ gasPrice: 25_000_000n })
        .mockResolvedValueOnce({ gasPrice: 50_000_000n }),
    };
    const { result, unmount } = renderHook(() => useV3MoveGasEstimate({
      provider,
      game: 'tictactoe',
      pollMs: 1_000,
    }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.formatted).toBe('0.00001 ETH');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.formatted).toBe('0.00002 ETH');
    unmount();
    vi.useRealTimers();
  });
});
