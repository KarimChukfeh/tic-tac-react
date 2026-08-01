# V3 release, canary, and rollback runbook

## Preconditions

Do not enable public V3 creation until the backend deployment manifest, SDK,
contract/security suite, frontend ABI copy, frontend release check, local
acceptance, and browser primitive probe all pass against the same deployment.
The deployment manifest is authoritative; no address or ABI may be edited in
the client by hand.

## Release controls

The landing page is the only new-tournament selection point. Existing V2 and
V3 tournament URLs remain generation-explicit and are never rewritten.

| Variable | Safe production default | Purpose |
| --- | --- | --- |
| `VITE_NEW_TOURNAMENT_GENERATION` | `v2` | Requested generation for new creation. |
| `VITE_V3_RELEASE_APPROVED` | `false` | Records that audit/deployment gates approved this release. |
| `VITE_V3_CREATION_ENABLED` | `true` | V3 creation kill switch. |
| `VITE_V3_CANARY_PERCENT` | `0` | Deterministic percentage of cohorts sent to V3. |
| `VITE_V3_CANARY_COHORT` | deployment-defined | Stable, non-secret cohort identifier. |
| `VITE_V3_SPONSORSHIP_ENABLED` | `true` | Sponsored-move kill switch; wallet moves remain available. |

Non-local builds fail closed to V2 without explicit approval. Localhost uses
V3 at 100% so local development remains useful.

## Canary progression

1. Publish with V3 approved but canary at `0`; verify V2 creation and both
   generations' direct instance links.
2. Increase the canary in reviewed increments. At each increment review
   session lifecycle outcomes, bundler health/failover, paymaster refusal,
   inclusion latency, explicit fallback selection, settlement, and support
   cases.
3. Set the canary to `100` only while all release gates remain green.
4. Preserve V2 routes and history indefinitely.

Monitoring receives only the allowlisted event produced by
`createV3PublicEvent`. It must not receive raw errors, signatures, provider
objects, vault records, storage dumps, or session-replay data.

## Rollback

Set `VITE_NEW_TOURNAMENT_GENERATION=v2` and redeploy. This routes only new
creation back to V2; existing `/v3/*?c=...` tournaments remain on V3 and
existing V2 tournaments remain on V2. Do not modify deployed tournaments or
copy addresses between generations.

If only sponsorship is unhealthy, set
`VITE_V3_SPONSORSHIP_ENABLED=false`. V3 stays readable and wallet-confirmed
moves remain available. Re-enable only after both bundler endpoints and the
paymaster are validated.

## Hosting security

Serve `public/_headers` through the production edge/host and replace local
`connect-src` values with the reviewed production RPC and two bundler origins.
Do not add third-party scripts, `unsafe-eval`, inline scripts, session replay,
or arbitrary user-configurable infrastructure endpoints. Verify the deployed
HTTP response headers, not merely repository configuration.
