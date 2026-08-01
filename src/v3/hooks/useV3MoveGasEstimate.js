import { useEffect, useState } from 'react';
import { parseEther } from 'ethers';

export const V3_SESSION_MOVE_GAS_UNITS = Object.freeze({
  tictactoe: 400_000n,
  connectfour: 450_000n,
  chess: 550_000n,
});

const MINIMUM_DISPLAY_WEI = parseEther('0.00001');
const FIVE_DECIMAL_WEI = 10_000_000_000_000n;
const FIVE_DECIMAL_SCALE = 100_000n;

export function formatV3GasCost(wei) {
  const value = BigInt(wei ?? 0);
  if (value < MINIMUM_DISPLAY_WEI) return '0 ETH';

  const roundedUnits = (value + (FIVE_DECIMAL_WEI / 2n)) / FIVE_DECIMAL_WEI;
  const whole = roundedUnits / FIVE_DECIMAL_SCALE;
  const fraction = String(roundedUnits % FIVE_DECIMAL_SCALE)
    .padStart(5, '0')
    .replace(/0+$/u, '');
  return `${whole}${fraction ? `.${fraction}` : ''} ETH`;
}

export function estimateV3MoveGasCost(feeData, game) {
  const gasPrice = feeData?.gasPrice ?? feeData?.maxFeePerGas;
  const gasUnits = V3_SESSION_MOVE_GAS_UNITS[game];
  if (gasPrice == null || gasUnits == null) return null;
  return BigInt(gasPrice) * gasUnits;
}

export function useV3MoveGasEstimate({
  provider,
  game,
  enabled = true,
  pollMs = 15_000,
} = {}) {
  const [estimate, setEstimate] = useState({ status: 'idle', wei: null, formatted: null });

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !provider || !V3_SESSION_MOVE_GAS_UNITS[game]) {
      setEstimate({ status: 'idle', wei: null, formatted: null });
      return undefined;
    }

    const update = async () => {
      setEstimate(current => ({ ...current, status: current.wei == null ? 'loading' : 'ready' }));
      try {
        const wei = estimateV3MoveGasCost(await provider.getFeeData(), game);
        if (!cancelled && wei != null) {
          setEstimate({ status: 'ready', wei, formatted: formatV3GasCost(wei) });
        }
      } catch {
        if (!cancelled) setEstimate({ status: 'unavailable', wei: null, formatted: null });
      }
    };

    void update();
    const interval = globalThis.setInterval(update, pollMs);
    return () => {
      cancelled = true;
      globalThis.clearInterval(interval);
    };
  }, [enabled, game, pollMs, provider]);

  return estimate;
}
