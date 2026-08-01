const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const TOKEN = /^[a-z0-9_.:-]{1,64}$/i;

function token(value) {
  const normalized = String(value ?? '');
  return TOKEN.test(normalized) ? normalized : undefined;
}

function address(value) {
  const normalized = String(value ?? '');
  return ADDRESS.test(normalized) ? normalized.toLowerCase() : undefined;
}

function hash(value) {
  const normalized = String(value ?? '');
  return HASH.test(normalized) ? normalized.toLowerCase() : undefined;
}

function duration(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0
    ? Math.round(normalized)
    : undefined;
}

export function createV3PublicEvent(input = {}, {
  includePrimary = false,
  now = Date.now,
} = {}) {
  const event = {
    schemaVersion: 1,
    generation: 'v3',
    timestamp: new Date(now()).toISOString(),
    event: token(input.event) || 'unknown',
  };
  const fields = {
    game: token(input.game),
    instance: address(input.instance),
    executor: address(input.executor),
    mode: token(input.mode),
    outcome: token(input.outcome),
    provider: token(input.provider),
    userOperationHash: hash(input.userOperationHash),
    transactionHash: hash(input.transactionHash),
    inclusionLatencyMs: duration(input.inclusionLatencyMs ?? input.latencyMs),
    errorCode: token(input.errorCode ?? input.error),
    fallback: token(input.fallback),
    recovery: token(input.recovery),
    sessionStatus: token(input.sessionStatus),
    secondsRemaining: duration(input.secondsRemaining),
  };
  if (includePrimary) fields.primary = address(input.primary);
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) event[name] = value;
  }
  return Object.freeze(event);
}

export function emitV3OperationalEvent(input, collector) {
  const target = collector ?? globalThis.__ETOUR_V3_PUBLIC_MONITOR__;
  const event = createV3PublicEvent(input);
  if (typeof target === 'function') {
    try {
      target(event);
    } catch {
      // Monitoring must never affect a transaction or expose its private context.
    }
  }
  return event;
}
