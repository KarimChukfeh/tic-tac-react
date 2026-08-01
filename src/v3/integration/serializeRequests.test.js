import { describe, expect, it } from 'vitest';
import { createRequestSerializer } from './serializeRequests';

describe('local V3 bundler concurrency', () => {
  it('serializes concurrent relayer requests for an automining chain', async () => {
    const serialize = createRequestSerializer();
    const order = [];
    let releaseFirst;
    const first = serialize(async () => {
      order.push('start-first');
      await new Promise((resolve) => { releaseFirst = resolve; });
      order.push('end-first');
      return 'first';
    });
    await Promise.resolve();
    const second = serialize(async () => {
      order.push('start-second');
      order.push('end-second');
      return 'second';
    });

    expect(order).toEqual(['start-first']);
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
    expect(order).toEqual([
      'start-first', 'end-first', 'start-second', 'end-second',
    ]);
  });

  it('continues the queue after a rejected request', async () => {
    const serialize = createRequestSerializer();
    await expect(serialize(() => Promise.reject(new Error('rejected'))))
      .rejects.toThrow('rejected');
    await expect(serialize(() => Promise.resolve('recovered')))
      .resolves.toBe('recovered');
  });
});
