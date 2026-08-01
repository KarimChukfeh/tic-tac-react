import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getInitialArenaEffectsPreference,
  getV3ScrollBehavior,
  prefersReducedMotion,
} from './motionPreferences';

describe('V3 motion preferences', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('uses instant scrolling and disables default effects for reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));

    expect(prefersReducedMotion()).toBe(true);
    expect(getV3ScrollBehavior()).toBe('auto');
    expect(getInitialArenaEffectsPreference('effects')).toBe(false);
  });

  it('honors an explicit visual-effects preference', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    window.localStorage.setItem('effects', 'on');

    expect(getInitialArenaEffectsPreference('effects')).toBe(true);
  });
});
