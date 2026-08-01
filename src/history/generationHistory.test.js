import { describe, expect, it } from 'vitest';
import {
  assertGenerationWriteTarget,
  combineGenerationHistory,
} from './generationHistory';

describe('dual-generation history', () => {
  const sharedAddress = '0x1111111111111111111111111111111111111111';

  it('aggregates reads without merging V2 and V3 contract identities', () => {
    const history = combineGenerationHistory({
      v2: [{ generation: 'v2', chainId: 1, instance: sharedAddress, matchId: '7', timestamp: 1 }],
      v3: [{ generation: 'v3', chainId: 1, instance: sharedAddress, matchId: '7', timestamp: 2 }],
    });
    expect(history.map((record) => record.generation)).toEqual(['v3', 'v2']);
    expect(new Set(history.map((record) => record.identityKey)).size).toBe(2);
  });

  it('rejects mislabeled history and cross-generation writes', () => {
    expect(() => combineGenerationHistory({
      v3: [{ generation: 'v2', chainId: 1, instance: sharedAddress }],
    })).toThrow('generation v3');
    expect(() => assertGenerationWriteTarget({ generation: 'v2' }, 'v3'))
      .toThrow('does not match');
  });
});
