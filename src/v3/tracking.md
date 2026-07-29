# V3 frontend implementation tracking

Last updated: 2026-07-29

## Phase 0 — Baseline, decisions, and tracking

- [x] Read `plan.md`, `tracking.md`, and the latest `logs.txt`.
- [x] Capture the V3 source, route, page-size, naming, and import baseline.
- [x] Inventory create, enroll, move, escalation, recovery, and financial
  transaction call sites for all three games.
- [x] Inspect and record the generated V3 ABI/deployment payload schema.
- [x] Confirm the backend browser SDK source and built ESM entrypoint.
- [x] Record the current frontend build and test baseline.
- [x] Decide generation routing and isolation boundaries.
- [x] Decide deterministic SDK delivery.
- [x] Decide pre-instance creation staging.
- [x] Define the V3 runtime environment interface.
- [x] Record browser-reachable local bundlers as a backend integration gap.
- [x] Add architecture decision records.

## Phase 1 — V3 isolation and structural cleanup

Status: complete. Generation, route, wallet, read, and write orchestration now
use declared V3 boundaries shared by all three games.

- [x] Keep arena route bases, share links, and internal navigation under
  `/v3/*`.
- [x] Add a source-boundary test that rejects direct imports from `src/v2`.
- [x] Introduce generation-neutral V3 names at page, routing, deployment, and
  transaction seams.
- [x] Replace legacy URL helpers with generation-aware V3 URL parsing.
- [x] Prevent V3 writes from using unvalidated or mixed-generation payloads.
- [x] Extract validated signer-backed transaction construction from the three
  monolithic pages.
- [x] Extract wallet lifecycle from the three monolithic pages.
- [x] Extract lobby/tournament read state from the three monolithic pages.
- [x] Extract active-match read state from the three monolithic pages.
- [x] Add regression coverage proving non-V3 routes remain unchanged.

## Phase 2 — Deployment configuration and SDK integration

- [ ] Implement and test the normalized V3 deployment loader.
- [ ] Validate schema, generation, chain, addresses, ABI surfaces, and bytecode.
- [ ] Add deterministic backend-owned SDK sync and frontend integrity checks.
- [ ] Add the stable frontend adapter around the generated SDK.
- [ ] Parse `VITE_V3_RPC_URL` and both bundler URL variables.
- [ ] Add browser-reachable local primary and failover bundler services
  upstream.
- [ ] Build provider, bundler, vault, coordinator, and session-client factories.
- [ ] Add public-only startup diagnostics and mapped SDK errors.

## Phase 3 — Wallet, identity, and session state

- [x] Centralize V3 wallet connection, account, chain, and signer lifecycle.
- [ ] Model primary player and executor as distinct identities.
- [ ] Implement and test the session lifecycle reducer/state machine.
- [ ] Integrate encrypted IndexedDB storage and startup recovery.
- [ ] Integrate public cross-tab lifecycle updates and nonce coordination.
- [ ] Reset monitors and coordinators on identity changes and unmount.
- [ ] Handle unavailable/evicted storage and unsupported browser crypto.
- [ ] Add reusable session status and action UI.

## Phase 4 — Atomic create and join

- [ ] Add encrypted creation-stage APIs to the backend SDK.
- [ ] Add confirm-once onboarding for all games.
- [ ] Pass the candidate executor to all V3 factory create calls.
- [ ] Finalize/discard creation stages from confirmed transaction outcomes.
- [ ] Pass the candidate executor to all V3 enrollment calls.
- [ ] Inspect registry state before declaring a session active.
- [ ] Preserve an explicit direct-wallet-only enrollment path if approved.
- [ ] Test rejection, revert, replacement, reload, and interrupted finalization.

## Phase 5 — Prompt-free Tic-Tac-Toe

- [ ] Define and test the shared move-controller state machine.
- [ ] Add the Tic-Tac-Toe move adapter.
- [ ] Submit Tic-Tac-Toe moves through ERC-4337.
- [ ] Reconcile UserOperation receipts with authoritative match state.
- [ ] Prevent duplicate intents and nonce races.
- [ ] Add explicit direct-primary fallback.
- [ ] Preserve tournament, timeout, escalation, and settlement behavior.

## Phase 6 — Connect Four and Chess parity

- [ ] Add and test the Connect Four move adapter.
- [ ] Add and test the Chess move adapter, including promotion.
- [ ] Reuse the shared move controller without AA duplication.
- [ ] Verify primary-player event/profile/history attribution.
- [ ] Normalize cross-game lifecycle and error presentation.

## Phase 7 — Refresh, recovery, revoke, and expiry

- [ ] Show on-chain session time remaining and near-expiry state.
- [ ] Implement staged refresh and post-confirmation promotion.
- [ ] Recover interrupted promotion on startup.
- [ ] Support lost-browser and new-device replacement.
- [ ] Implement confirmed revocation and local cleanup.
- [ ] Detect cross-tab/device rotation and stop old executor use.
- [ ] Preserve direct-primary gameplay throughout session failure.

## Phase 8 — Reliability, accessibility, and polish

- [ ] Normalize pending, success, error, and fallback feedback.
- [ ] Add accessible live regions, focus handling, and keyboard controls.
- [ ] Respect reduced motion and verify narrow/mobile wallet layouts.
- [ ] Keep routine session status visually quiet during gameplay.
- [ ] Add scrubbed advanced diagnostics.
- [ ] Review product copy for custody, expiry, sponsorship, and recovery.

## Phase 9 — Comprehensive validation and security

- [ ] Complete unit, component, integration, and route-isolation coverage.
- [ ] Add browser tests using real IndexedDB and Web Crypto.
- [ ] Add local E2E against deployed V3 contracts and both bundlers.
- [ ] Exercise account/chain/reload/cross-tab/storage failure states.
- [ ] Exercise bundler, paymaster, RPC, revert, and timeout failures.
- [ ] Prove session paths cannot invoke non-move operations.
- [ ] Add secret-leak, dependency, CSP, and unsafe-DOM checks.
- [ ] Run frontend and relevant backend release gates.

## Phase 10 — Fully local acceptance

- [ ] Reproduce a fresh local stack and generated frontend artifacts.
- [ ] Complete a sponsored tournament for each game.
- [ ] Verify profiles, history, prizes, and primary/executor identity.
- [ ] Verify bundler failover, total outage, and paymaster refusal.
- [ ] Verify direct fallback, expiry, refresh, revoke, and cache loss.
- [ ] Verify reload and cross-tab reconciliation with no public service.

## Phase 11 — Dual-generation release readiness

- [ ] Preserve V2 active/history flows and aggregate without identity mixing.
- [ ] Add reversible new-generation feature/canary routing.
- [ ] Ensure sponsorship disablement never disables direct gameplay.
- [ ] Finalize CSP, allowlists, diagnostics, recovery docs, and checksums.

## Phase 12 — Cutover and cleanup

- [ ] Enable V3 creation only after approved backend and canary gates.
- [ ] Observe scrubbed operational outcomes and expand gradually.
- [ ] Retain historical V2 access.
- [ ] Remove obsolete V2-derived code from `src/v3/`.
- [ ] Archive acceptance evidence and update final documentation.
