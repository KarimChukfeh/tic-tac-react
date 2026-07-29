# V3 frontend architecture decisions

## ADR-001: Generation routing and boundaries

Status: accepted on 2026-07-29.

- Existing `/tictactoe`, `/connect4`, and `/chess` behavior remains owned by
  V2 code.
- V3 entry routes are `/v3/tictactoe`, `/v3/connect4`, and `/v3/chess`.
- V3 internal navigation and share links must preserve the `/v3/*` prefix.
- V3 writes may consume only validated payloads from `src/v3/ABIs/`.
- Contract context will explicitly include `generation`, `chainId`, `factory`,
  `instance`, `profileRegistry`, and `sessionRegistry`.
- A source-boundary test will reject direct V3 imports from `src/v2`.

## ADR-002: SDK delivery

Status: accepted direction; sync tooling remains to be implemented.

The client will consume an immutable build of the backend browser SDK through
a deterministic backend-owned sync step. The sync must:

1. run the backend TypeScript SDK build;
2. copy only `sdk/dist/` into a generated V3 vendor directory;
3. record the backend commit, SDK version, and SHA-256 hashes in a manifest;
4. remove stale generated SDK files;
5. fail if the copied output and manifest disagree; and
6. be invoked by the backend frontend-artifact workflow alongside ABI sync.

The generated directory will carry a do-not-edit notice. The frontend will
have a check command that verifies the manifest before build and CI.

This is chosen over a relative import from the sibling repository, which
would not work from a clean standalone checkout, and over an unversioned
manual source copy, which could silently diverge from the audited SDK.
A separately published, exactly pinned package may replace this mechanism
later without changing the frontend adapter API.

## ADR-003: Pre-instance creation staging

Status: accepted design; backend SDK support remains to be implemented.

Factory creation cannot construct a final session identity before the
instance exists, and the V3 factory has no deterministic instance-prediction
API. The SDK will therefore support an encrypted staged-creation record:

```text
{ chainId, factory, primary, requestId }
```

The stage contains a fresh owner, salt, and derived counterfactual executor.
After the primary-wallet creation transaction confirms, the client parses
the factory's `InstanceDeployed` event and asks the SDK to finalize the stage
under the authoritative identity:

```text
{ chainId, instance, primary }
```

Finalization must decrypt and re-encrypt inside the vault so raw key material
never enters React or application logs. It must authenticate the new identity
as IndexedDB AES-GCM additional data, delete the stage atomically, and be
idempotently recoverable after interruption. Rejection or revert discards the
stage. No session becomes active until registry inspection exactly matches
the finalized executor.

Join flows already know the instance and use the normal identity directly.

## ADR-004: Runtime configuration

Status: accepted interface; browser bundler services are a backend blocker.

The normalized V3 runtime will use:

```text
VITE_V3_RPC_URL
VITE_V3_BUNDLER_URL_PRIMARY
VITE_V3_BUNDLER_URL_FAILOVER
```

The local RPC defaults to `http://127.0.0.1:8545` only when the generated
manifest declares network `localhost` and chain ID `412346`. Production
configuration has no implicit RPC or bundler fallback.

The current backend exposes no browser-reachable URLs for its two local
bundlers. Phase 2 may implement configuration parsing and diagnostics, but
session submission cannot pass browser acceptance until the backend provides
two ERC-7769 HTTP endpoints.

## ADR-005: Transport policy

Status: accepted on 2026-07-29.

- Session transport is permitted only for canonical game moves.
- Direct primary-wallet fallback is always explicit user intent.
- Wallet rejection, illegal moves, execution reverts, and ambiguous timeouts
  never trigger automatic fallback.
- Financial, lifecycle, escalation, recovery, and administrative operations
  always use the primary-wallet signer.

