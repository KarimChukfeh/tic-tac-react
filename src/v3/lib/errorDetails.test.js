import { describe, expect, it } from 'vitest';
import { collectErrorDetails, pickBestErrorMessage } from './errorDetails';

describe('V3 error details', () => {
  it('reads non-enumerable Error messages', () => {
    const error = new Error('Wallet chain does not match the validated V3 chain 412346');
    expect(collectErrorDetails(error).messageCandidates).toContain(error.message);
  });

  it('turns a refused local RPC connection into an actionable message', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:8545');
    error.code = 'ECONNREFUSED';
    const details = collectErrorDetails(error);
    expect(pickBestErrorMessage(details.messageCandidates)).toBe(
      'The local V3 RPC is unavailable. Start the V3 backend on http://127.0.0.1:8545 and try again.',
    );
  });

  it('does not let UNKNOWN_ERROR hide a nested local fee-cap failure', () => {
    const error = {
      code: 'UNKNOWN_ERROR',
      message: 'could not coalesce error',
      error: {
        code: -32000,
        message: 'Transaction maxFeePerGas (30000000) is too low for the next block, which has a baseFeePerGas of 36936503',
      },
    };
    const details = collectErrorDetails(error);
    expect(details.messageCandidates).not.toContain('UNKNOWN_ERROR');
    expect(pickBestErrorMessage(details.messageCandidates)).toBe(
      'The wallet gas fee cap is below the local chain base fee. Restart the fresh V3 backend so its browser-wallet base fee resets, then reconnect and try again.',
    );
  });
});
