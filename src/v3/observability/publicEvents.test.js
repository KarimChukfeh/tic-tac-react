import { describe, expect, it, vi } from 'vitest';
import { createV3PublicEvent, emitV3OperationalEvent } from './publicEvents';

describe('V3 privacy-safe operational events', () => {
  it('emits only allowlisted public fields', () => {
    const event = createV3PublicEvent({
      event: 'move_included',
      game: 'tictactoe',
      instance: '0x1111111111111111111111111111111111111111',
      primary: '0x2222222222222222222222222222222222222222',
      executor: '0x3333333333333333333333333333333333333333',
      userOperationHash: `0x${'ab'.repeat(32)}`,
      inclusionLatencyMs: 12.6,
      privateKey: `0x${'ef'.repeat(32)}`,
      signature: `0x${'cd'.repeat(65)}`,
      ciphertext: 'secret-ciphertext',
      message: 'raw provider error with secret data',
    }, { now: () => 0 });

    expect(event).toEqual({
      schemaVersion: 1,
      generation: 'v3',
      timestamp: '1970-01-01T00:00:00.000Z',
      event: 'move_included',
      game: 'tictactoe',
      instance: '0x1111111111111111111111111111111111111111',
      executor: '0x3333333333333333333333333333333333333333',
      userOperationHash: `0x${'ab'.repeat(32)}`,
      inclusionLatencyMs: 13,
    });
    expect(JSON.stringify(event)).not.toContain('secret');
    expect(event).not.toHaveProperty('primary');
  });

  it('isolates collector failures from gameplay', () => {
    const collector = vi.fn(() => { throw new Error('collector down'); });
    expect(() => emitV3OperationalEvent({ event: 'move_failed' }, collector))
      .not.toThrow();
    expect(collector).toHaveBeenCalledOnce();
  });
});
