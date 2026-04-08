import { CompletionReason } from '../../utils/completionReasons';
import { getUserManualHrefForReasonCode } from '../../utils/userManualLinks';

export const V2TournamentResolutionReason = {
  NORMAL_WIN: 0,
  TIMEOUT: 1,
  DRAW: 2,
  FORCE_ELIMINATION: 3,
  REPLACEMENT: 4,
  SOLO_ENROLL_CANCELLED: 5,
  ABANDONED_TOURNAMENT_CLAIMED: 6,
  UNCONTESTED_FINALS_WIN: 7,
};

const REASON_CODES = {
  0: 'R0',
  1: 'ML1',
  2: 'R1',
  3: 'ML2',
  4: 'ML3',
  5: 'EL0',
  6: 'EL2',
  7: 'R2',
};

const TOURNAMENT_LABELS = {
  0: 'Normal Resolution',
  1: 'Timeout',
  2: 'Draw Resolution',
  3: 'Force Elimination',
  4: 'Replacement',
  5: 'Tournament Canceled',
  6: 'Abandoned Pool Claimed',
  7: 'Uncontested Finals Resolution',
};

const TOURNAMENT_LINKS = {
  0: getUserManualHrefForReasonCode('R0'),
  1: getUserManualHrefForReasonCode('ML1'),
  2: getUserManualHrefForReasonCode('R1'),
  3: getUserManualHrefForReasonCode('ML2'),
  4: getUserManualHrefForReasonCode('ML3'),
  5: getUserManualHrefForReasonCode('EL0'),
  6: getUserManualHrefForReasonCode('EL2'),
  7: getUserManualHrefForReasonCode('R2'),
};

const toReasonNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getV2ReasonCode = (reason) => REASON_CODES[toReasonNumber(reason, -1)] ?? '';

export const formatV2ReasonLabel = (reason, label) => {
  const code = getV2ReasonCode(reason);
  return code && code !== 'R0' ? `${code} ${label}` : label;
};

export const getV2TournamentResolutionText = (reason) => {
  const normalizedReason = toReasonNumber(reason, -1);
  const label = TOURNAMENT_LABELS[normalizedReason];
  if (!label) {
    return { text: 'Tournament Completion', summary: 'tournament completion', link: null };
  }

  const text = formatV2ReasonLabel(normalizedReason, label);
  return {
    text,
    summary: text,
    link: TOURNAMENT_LINKS[normalizedReason] ?? null,
  };
};

export const isV2TournamentCancelledReason = (reason) => (
  toReasonNumber(reason, -1) === V2TournamentResolutionReason.SOLO_ENROLL_CANCELLED
);

export const getV2StatsResolutionReason = (reason) => (
  isV2TournamentCancelledReason(reason)
    ? CompletionReason.SOLO_ENROLL_CANCELLED
    : toReasonNumber(reason, -1) === V2TournamentResolutionReason.ABANDONED_TOURNAMENT_CLAIMED
      ? CompletionReason.ABANDONED_TOURNAMENT_CLAIMED
    : toReasonNumber(reason, 0)
);

export const getV2CompletionReasonHref = (reason) => TOURNAMENT_LINKS[toReasonNumber(reason, -1)] ?? null;

export const getV2CompletionReasonManualLabel = (reason) => getV2ReasonCode(reason);

export const getV2NeutralMatchReasonLabel = (reason) => {
  switch (toReasonNumber(reason, -1)) {
    case V2TournamentResolutionReason.TIMEOUT:
      return formatV2ReasonLabel(reason, 'Timeout');
    case V2TournamentResolutionReason.DRAW:
      return formatV2ReasonLabel(reason, 'Draw Resolution');
    case V2TournamentResolutionReason.FORCE_ELIMINATION:
      return formatV2ReasonLabel(reason, 'Force Elimination');
    case V2TournamentResolutionReason.REPLACEMENT:
      return formatV2ReasonLabel(reason, 'Replacement');
    default:
      return '';
  }
};

export const getV2CompletedMatchOutcomeLabel = (reason, userWon, gameType = 'tictactoe') => {
  const normalizedReason = toReasonNumber(reason, 0);

  if (normalizedReason === V2TournamentResolutionReason.DRAW) {
    return getV2NeutralMatchReasonLabel(normalizedReason);
  }

  if (userWon) {
    if (normalizedReason === V2TournamentResolutionReason.TIMEOUT) return 'ML1 Victory by Timeout';
    if (normalizedReason === V2TournamentResolutionReason.FORCE_ELIMINATION) return 'ML2 Victory via Force Elimination';
    if (normalizedReason === V2TournamentResolutionReason.REPLACEMENT) return 'ML3 Victory via Replacement';
    return 'Victory';
  }

  if (normalizedReason === V2TournamentResolutionReason.TIMEOUT) return 'ML1 Defeat by Timeout';
  if (normalizedReason === V2TournamentResolutionReason.FORCE_ELIMINATION) return 'ML2 Defeat via Force Elimination';
  if (normalizedReason === V2TournamentResolutionReason.REPLACEMENT) return 'ML3 Defeat via Replacement';
  return 'Defeat';
};

export const getV2CompletionReasonText = (reason, userWon, gameType = 'tictactoe') => {
  const normalizedReason = toReasonNumber(reason, 0);

  if (normalizedReason === V2TournamentResolutionReason.DRAW) {
    return getV2NeutralMatchReasonLabel(normalizedReason);
  }

  switch (normalizedReason) {
    case V2TournamentResolutionReason.NORMAL_WIN:
      if (userWon) {
        if (gameType === 'chess') return 'Checkmate!';
        if (gameType === 'connect4') return 'Connect Four!';
        if (gameType === 'checkers') return 'You Won!';
        return 'You Won!';
      }
      return 'Defeat';
    case V2TournamentResolutionReason.TIMEOUT:
      return userWon ? 'ML1 Victory by Timeout!' : 'ML1 Lost by Timeout';
    case V2TournamentResolutionReason.FORCE_ELIMINATION:
    case V2TournamentResolutionReason.REPLACEMENT:
      return getV2NeutralMatchReasonLabel(normalizedReason);
    default:
      return userWon ? 'Victory!' : 'Defeat';
  }
};

export const getV2BracketMatchOutcomeLabel = ({
  reason,
  viewerRelation,
  winnerAddress,
}) => {
  const normalizedReason = toReasonNumber(reason, 0);
  const winnerToken = winnerAddress && winnerAddress !== '0x0000000000000000000000000000000000000000'
    ? winnerAddress.slice(0, 4)
    : 'Winner';

  if (normalizedReason === V2TournamentResolutionReason.DRAW) {
    return getV2NeutralMatchReasonLabel(normalizedReason);
  }

  if (viewerRelation === 'winner') {
    return getV2CompletedMatchOutcomeLabel(normalizedReason, true);
  }

  if (viewerRelation === 'loser') {
    return getV2CompletedMatchOutcomeLabel(normalizedReason, false);
  }

  if (normalizedReason === V2TournamentResolutionReason.TIMEOUT) {
    return `${winnerToken} wins via ML1 Timeout`;
  }

  if (normalizedReason === V2TournamentResolutionReason.FORCE_ELIMINATION) {
    return `${winnerToken} wins via ML2 Force Elimination`;
  }

  if (normalizedReason === V2TournamentResolutionReason.REPLACEMENT) {
    return `${winnerToken} wins via ML3 Replacement`;
  }

  return `${winnerToken} wins`;
};
