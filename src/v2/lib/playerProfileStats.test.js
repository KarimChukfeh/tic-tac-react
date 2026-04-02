import { describe, expect, it } from 'vitest';
import {
  adjustProfileWinTotal,
  isProfileEnrollmentWin,
  isTournamentCancelled,
  isTournamentDrawResolution,
} from './playerProfileStats';

describe('playerProfileStats', () => {
  it('treats draw resolutions as non-wins', () => {
    expect(isTournamentDrawResolution(2)).toBe(true);
    expect(isProfileEnrollmentWin({
      won: true,
      instanceStatus: 2,
      resolutionReason: 2,
    })).toBe(false);
  });

  it('treats cancelled tournaments as non-wins', () => {
    expect(isTournamentCancelled({ instanceStatus: 3, resolutionReason: 5 })).toBe(true);
    expect(isProfileEnrollmentWin({
      won: true,
      instanceStatus: 3,
      resolutionReason: 5,
    })).toBe(false);
  });

  it('subtracts misclassified recent wins from the displayed total', () => {
    const rawRecords = [
      { won: true },
      { won: false },
      { won: true },
    ];
    const normalizedRecords = [
      { won: false, instanceStatus: 2, tournamentResolutionReason: 2 },
      { won: false, instanceStatus: 2, tournamentResolutionReason: 1 },
      { won: true, instanceStatus: 2, tournamentResolutionReason: 0 },
    ];

    expect(adjustProfileWinTotal(2, rawRecords, normalizedRecords)).toBe(1);
  });
});
