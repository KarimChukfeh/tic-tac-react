import { describe, expect, it } from 'vitest';
import {
  getNewTournamentPath,
  loadV3ReleaseConfig,
} from './releaseConfig';
import { getGenerationGamePath } from '../../routing/gameRoutes';

const deployment = { network: 'arbitrumOne' };

describe('V3 release routing', () => {
  it('fails closed to V2 until a production release is approved', () => {
    const config = loadV3ReleaseConfig({}, deployment);
    expect(config.selectedGeneration).toBe('v2');
    expect(config.diagnostics.reason).toBe('V3 release approval missing');
  });

  it('supports deterministic canary cohorts and a one-flag rollback', () => {
    const base = {
      VITE_V3_RELEASE_APPROVED: 'true',
      VITE_V3_CREATION_ENABLED: 'true',
      VITE_NEW_TOURNAMENT_GENERATION: 'v3',
      VITE_V3_CANARY_PERCENT: '100',
      VITE_V3_CANARY_COHORT: 'canary-a',
    };
    const enabled = loadV3ReleaseConfig(base, deployment);
    expect(enabled.selectedGeneration).toBe('v3');
    expect(getNewTournamentPath('chess', enabled)).toBe('/v3/chess');

    const rolledBack = loadV3ReleaseConfig({
      ...base,
      VITE_NEW_TOURNAMENT_GENERATION: 'v2',
    }, deployment);
    expect(rolledBack.selectedGeneration).toBe('v2');
    expect(getNewTournamentPath('chess', rolledBack)).toBe('/chess');
  });

  it('keeps existing tournament routes generation-explicit', () => {
    expect(getGenerationGamePath('tictactoe', 'v2')).toBe('/tictactoe');
    expect(getGenerationGamePath('tictactoe', 'v3')).toBe('/v3/tictactoe');
  });

  it('rejects malformed release controls', () => {
    expect(() => loadV3ReleaseConfig({
      VITE_V3_RELEASE_APPROVED: 'maybe',
    }, deployment)).toThrow('boolean release flag');
    expect(() => loadV3ReleaseConfig({
      VITE_V3_CANARY_PERCENT: '101',
    }, deployment)).toThrow('between 0 and 100');
  });
});
