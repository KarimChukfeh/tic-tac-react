export const USER_MANUAL_REASON_CODE_TO_HASH = {
  R0: '#41-r0---normal-resolution',
  R1: '#42-r1---draw-resolution',
  R2: '#43-r2---uncontested-finalist',
  EL0: '#44-el0---canceled-tournament',
  EL1: '#521-el1--force-start-tournament-after-enrollment-window-expires',
  'EL1*': '#522-el1--extend-enrollment-window-when-solo-enrolled',
  EL2: '#45-el2---abandoned-tournament',
  ML1: '#46-ml1---match-timeout',
  ML2: '#47-ml2---advanced-player-wins-via-stalled-semifinal',
  ML3: '#48-ml3---outsider-replaces-both-players',
};

export const USER_MANUAL_REASON_CODE_PATTERN = /(R0|R1|R2|EL0|EL1\*|EL1|EL2|ML1|ML2|ML3)(?![A-Za-z0-9])/g;

export const getUserManualHrefForReasonCode = (code = '') => USER_MANUAL_REASON_CODE_TO_HASH[code] ?? null;
