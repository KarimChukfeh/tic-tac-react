const GENERATIONS = new Set(['v2', 'v3']);

function normalizeRecord(record, expectedGeneration) {
  if (!record || record.generation !== expectedGeneration) {
    throw new TypeError(`History record must declare generation ${expectedGeneration}`);
  }
  if (!record.instance || !record.chainId) {
    throw new TypeError('History record must include chainId and instance');
  }
  return Object.freeze({
    ...record,
    generation: expectedGeneration,
    identityKey: [
      expectedGeneration,
      String(record.chainId),
      String(record.instance).toLowerCase(),
      String(record.matchId ?? record.id ?? ''),
    ].join(':'),
  });
}

/** Combines read-only history while preserving generation-specific identity. */
export function combineGenerationHistory({ v2 = [], v3 = [] } = {}) {
  const combined = [
    ...v2.map((record) => normalizeRecord(record, 'v2')),
    ...v3.map((record) => normalizeRecord(record, 'v3')),
  ];
  combined.sort((left, right) => Number(right.timestamp ?? 0) - Number(left.timestamp ?? 0));
  return Object.freeze(combined);
}

export function assertGenerationWriteTarget(record, generation) {
  if (!GENERATIONS.has(generation) || record?.generation !== generation) {
    throw new TypeError('Write target generation does not match its contract context');
  }
  return record;
}
