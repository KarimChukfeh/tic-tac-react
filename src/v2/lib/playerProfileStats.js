const DRAW_RESOLUTION_REASON = 2;
const V2_SOLO_ENROLL_CANCELLED_REASON = 5;
const LEGACY_SOLO_ENROLL_CANCELLED_REASON = 6;
const CANCELLED_INSTANCE_STATUS = 3;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const isTournamentDrawResolution = (resolutionReason) => (
  toNumber(resolutionReason, -1) === DRAW_RESOLUTION_REASON
);

export const isTournamentCancelled = ({ instanceStatus, resolutionReason } = {}) => {
  const normalizedStatus = toNumber(instanceStatus, -1);
  const normalizedReason = toNumber(resolutionReason, -1);

  return normalizedStatus === CANCELLED_INSTANCE_STATUS
    || normalizedReason === V2_SOLO_ENROLL_CANCELLED_REASON
    || normalizedReason === LEGACY_SOLO_ENROLL_CANCELLED_REASON;
};

export const isProfileEnrollmentWin = ({ won, instanceStatus, resolutionReason } = {}) => (
  Boolean(won)
  && !isTournamentDrawResolution(resolutionReason)
  && !isTournamentCancelled({ instanceStatus, resolutionReason })
);

export const adjustProfileWinTotal = (rawTotalWins, rawRecords = [], normalizedRecords = []) => {
  const baseWins = toNumber(rawTotalWins, 0);
  const rawRecentWins = rawRecords.filter(record => Boolean(record?.won)).length;
  const normalizedRecentWins = normalizedRecords.filter(record => isProfileEnrollmentWin({
    won: record?.won,
    instanceStatus: record?.instanceStatus,
    resolutionReason: record?.tournamentResolutionReason,
  })).length;

  return Math.max(0, baseWins + normalizedRecentWins - rawRecentWins);
};
