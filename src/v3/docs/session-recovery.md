# V3 session support and recovery

The connected wallet is always the player and controls tournament funds. The
session executor can submit only canonical game moves for one player in one
tournament; it cannot enroll, withdraw, claim, escalate, administer, or call
arbitrary contracts.

## User recovery

- **Prompt-free moves unavailable:** select **Use wallet for moves**. The
  failed move is never resubmitted automatically.
- **Session near expiry or expired:** connect the enrolled primary wallet and
  choose **Refresh session**. The primary wallet confirms the replacement.
- **Browser data cleared or new device:** connect the enrolled primary wallet
  and authorize a replacement. The old executor becomes unusable on-chain.
- **Session revoked or rotated elsewhere:** use wallet moves or authorize a
  new session. Never retry with the old executor.
- **Wrong account or network:** select the enrolled primary and the validated
  chain before taking a write action.

## Support diagnostics

The advanced diagnostic view and operational event schema include only public
addresses, generation/chain, lifecycle state, remaining time, provider label,
transaction/UserOperation hashes, latency, mapped error codes, and recovery or
fallback outcome. Copying these diagnostics must never include a private key,
signature, vault key/ciphertext, raw provider object, RPC query credential, or
unredacted error graph.

Classify a report before escalating it: wallet/account, chain/deployment,
local-key/session lifecycle, bundler transport, paymaster policy, or game-rule
revert. For an ambiguous UserOperation timeout, inspect its hash/nonce before
any retry; do not advise automatic wallet fallback.
