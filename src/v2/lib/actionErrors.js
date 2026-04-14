const INSUFFICIENT_FUNDS_PATTERNS = [
  'insufficient funds',
  'not enough funds',
  'exceeds balance',
];

const USER_REJECTION_PATTERNS = [
  'user rejected',
  'user denied',
  'rejected the request',
  'transaction cancelled',
  'transaction rejected',
  'cancelled by user',
];

function cleanErrorMessage(message, fallback) {
  if (!message) return fallback;
  const trimmed = String(message).trim();
  if (!trimmed) return fallback;

  return trimmed
    .replace(/^execution reverted:\s*/i, '')
    .replace(/^error:\s*/i, '')
    .replace(/^call exception;\s*/i, '');
}

export function formatActionErrorMessage(actionLabel, message, fallback = 'Transaction failed.') {
  const cleanedMessage = cleanErrorMessage(message, fallback);
  const normalizedMessage = cleanedMessage.toLowerCase();

  if (INSUFFICIENT_FUNDS_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))) {
    return `You don't have enough ETH to ${actionLabel} and cover gas.`;
  }

  if (USER_REJECTION_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))) {
    return `You cancelled the request to ${actionLabel}.`;
  }

  if (normalizedMessage.includes('missing revert data')) {
    return fallback;
  }

  return cleanedMessage;
}
