// Transaction overrides for contract calls.
// Kept as an empty object so callers can spread it in without changes.
// Gas/fee estimation is left to the wallet (MetaMask) to avoid
// EIP-1559 violations when the network base fee is below any hardcoded tip.
export const HIGH_PRIORITY_TX = {};
