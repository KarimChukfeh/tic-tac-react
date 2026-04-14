const GENERIC_RPC_MESSAGE_PATTERNS = [
  /^internal json-rpc error\.?$/i,
  /^json-rpc error\.?$/i,
  /^could not coalesce error/i,
  /^missing revert data/i,
  /^call exception\.?$/i,
  /^execution reverted\.?$/i,
  /^unknown error\.?$/i,
  /^server error\.?$/i,
];

function normalizeMessage(message) {
  if (typeof message !== 'string') return '';
  return message.trim().replace(/\s+/g, ' ');
}

function isHexDataString(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value) && value.length >= 10;
}

function isGenericRpcMessage(message) {
  const normalized = normalizeMessage(message);
  if (!normalized || normalized === '[object Object]') return true;
  return GENERIC_RPC_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function tryParseEmbeddedJson(value) {
  if (typeof value !== 'string') return null;
  const firstBrace = value.indexOf('{');
  const lastBrace = value.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) return null;

  try {
    return JSON.parse(value.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export function collectErrorDetails(error) {
  const seen = new WeakSet();
  const dataCandidates = [];
  const messageCandidates = [];

  const pushData = (value) => {
    if (isHexDataString(value) && !dataCandidates.includes(value)) {
      dataCandidates.push(value);
    }
  };

  const pushMessage = (value) => {
    const normalized = normalizeMessage(value);
    if (normalized && !messageCandidates.includes(normalized)) {
      messageCandidates.push(normalized);
    }
  };

  const walk = (value, keyHint = '') => {
    if (value == null) return;

    if (typeof value === 'string') {
      const normalized = normalizeMessage(value);
      if (!normalized) return;

      if (isHexDataString(normalized)) {
        pushData(normalized);
      } else {
        if (keyHint !== 'stack' && keyHint !== 'name') {
          pushMessage(normalized);
        }
        const parsed = tryParseEmbeddedJson(normalized);
        if (parsed) walk(parsed, keyHint);
      }
      return;
    }

    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, keyHint));
      return;
    }

    Object.entries(value).forEach(([key, child]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'stack' || lowerKey === 'name') return;
      if (typeof child === 'string' && lowerKey === 'data') {
        pushData(child.trim());
      }
      walk(child, lowerKey);
    });
  };

  walk(error);

  return { dataCandidates, messageCandidates };
}

export function pickBestErrorMessage(messages, fallback = 'Transaction failed.') {
  const normalizedMessages = messages
    .map(normalizeMessage)
    .filter(Boolean);

  const explicitMessage = normalizedMessages.find((message) => !isGenericRpcMessage(message));
  if (explicitMessage) return explicitMessage;

  return fallback;
}
