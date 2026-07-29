# ETour Frontend V3 Implementation Plan

> Status: Planning and implementation guide  
> Created: 2026-07-29  
> Scope: Complete the client-side V3 implementation under `src/v3/`, preserve all shipped gameplay and tournament behavior, and add safe, instance-scoped session authorization for prompt-free moves.

---

## 1. How to use these V3 documents

Frontend V3 work must be managed using the following three files together:

- [`plan.md`](./plan.md) is the architecture and implementation guide. Read it to understand the intended outcome, constraints, phases, interfaces, security rules, test strategy, and release gates.
- [`tracking.md`](./tracking.md) is the ordered execution checklist. It is intentionally empty when first created. Before implementation begins, derive concrete, reviewable checklist items from the phases in this plan. Developers should use it to select the next task and record completion.
- [`logs.txt`](./logs.txt) is the chronological implementation and handoff log. It is intentionally empty when first created. Once implementation starts, every developer should read its latest entries before making changes and append a concise entry after each meaningful batch.

The normal development loop is:

1. Read this plan to understand the destination and current architectural intent.
2. Read `tracking.md` to find the next incomplete task.
3. Read the latest entries in `logs.txt` to learn what changed, what was validated, what remains uncertain, and where the previous developer stopped.
4. Implement one coherent batch.
5. Run the tests and validation appropriate to that batch.
6. Update `tracking.md`.
7. Append a dated entry to `logs.txt` with:
   - the completed work;
   - the files or surfaces changed;
   - the exact validation performed and its result;
   - decisions, risks, and blockers discovered; and
   - the next recommended action.

These documents have distinct roles:

- `plan.md` explains what should be built and why.
- `tracking.md` records implementation progress.
- `logs.txt` records the current repository truth and developer handoff context.

Neither `plan.md` nor `tracking.md` is gospel. They are living documents and should change when implementation evidence, browser behavior, backend interfaces, security review, usability testing, or operational constraints reveal a better or safer approach. Developers may add, remove, split, combine, reorder, or rewrite phases and tasks, provided that they:

- preserve the core product goal and security invariants described below;
- explain material decisions in `logs.txt`;
- keep the plan, tracking checklist, implementation, and tests consistent;
- do not silently weaken session scope, primary-wallet recovery, fund isolation, generation isolation, or direct-wallet fallback; and
- update acceptance criteria when the implementation design changes.

When code and documentation disagree, investigate the mismatch and update the documents to reflect the safest verified truth. The purpose of these files is continuity and correctness, not rigid compliance with assumptions that have become obsolete.

---

## 2. Purpose of this plan

This document defines the end-to-end frontend work required to make the V3 protocol usable as a polished product.

The backend already provides V3 factories, game instances, a session registry, ERC-4337 session accounts, paymaster policy, bundler support, browser-session SDK primitives, deployment manifests, and generated frontend ABI payloads. The frontend must turn those capabilities into a coherent experience across:

- Tic-Tac-Toe;
- Connect Four;
- Chess;
- lobby creation and enrollment;
- active gameplay;
- recovery on a new browser or device;
- expired, rotated, or revoked sessions;
- direct primary-wallet fallback;
- completed tournament history and profiles; and
- the transition from historical V2 instances to V3 as the creation default.

This is not merely an ABI update. It is a generation-aware client architecture and a session lifecycle product flow. The final interface should require a wallet confirmation when a player creates or joins a V3 tournament, then allow normal legal moves without repeated primary-wallet popups while the session remains active.

---

## 3. Desired product outcome

### 3.1 Player experience

A successful V3 experience has the following shape:

1. A player connects their primary wallet and selects a V3 lobby.
2. The browser generates a unique convenience key for that player and tournament.
3. The create or join transaction atomically pays the entry fee, enrolls the primary wallet, and authorizes the browser session account.
4. After confirmation, legal moves are submitted through the session account without opening the primary wallet for every turn.
5. The UI clearly reports move submission, inclusion, and deterministic game errors.
6. If the session expires, is revoked, is replaced, or disappears with browser storage, the tournament and funds remain safe.
7. The primary wallet can authorize a replacement key and resume the same on-chain match.
8. If sponsorship or bundler infrastructure is unavailable, the player can explicitly make the move directly with the enrolled wallet.
9. Results, prizes, profiles, and history always belong to the primary player, never the temporary executor.

### 3.2 Must-haves

- Full feature parity for V3 Tic-Tac-Toe, Connect Four, and Chess.
- Explicit separation of V2 and V3 routes, addresses, ABIs, profiles, events, and writes.
- One shared session implementation used by all three games.
- A fresh, browser-generated session owner and salt per `(chainId, instance, primary)` identity.
- Atomic session registration in the primary-wallet create/join transaction.
- Prompt-free V3 move submission through the audited ERC-4337 SDK path.
- On-chain confirmation before the client declares a session active, refreshed, or revoked.
- Visible session status and time remaining where it materially affects play.
- Primary-wallet refresh and revoke controls.
- Safe recovery after lost IndexedDB data, another browser/device, private-mode eviction, or interrupted refresh promotion.
- Direct primary-wallet moves as a first-class fallback.
- No automatic duplicate move when submission outcome is ambiguous.
- Responsive and accessible behavior on desktop, mobile, wallet browsers, keyboard navigation, and reduced-motion settings.
- Unit, component, integration, and browser end-to-end coverage for all critical states.
- A fully local development path using the V3 backend stack, generated ABIs, local wallets, local bundlers, and local sponsorship.

### 3.3 Do

- Treat the connected primary wallet as the player identity.
- Treat the on-chain registry as the authority for session validity.
- Use the backend V3 SDK rather than recreating signing, storage, nonce, or UserOperation rules independently in React pages.
- Model deployment generation explicitly in every contract reference.
- Bind cached data and session records to chain, generation, instance, and primary address.
- Keep financial and administrative actions on the primary-wallet signer.
- Require explicit user intent before switching to a wallet-signature fallback.
- Decode and present actionable contract, wallet, RPC, bundler, and paymaster errors.
- Reconcile pending state against the chain after reload, account change, chain change, tab conflict, or timeout.
- Preserve spectating and read-only access without forcing wallet connection.
- Keep implementation batches small enough to validate and hand off cleanly.

### 3.4 Do not

- Do not store raw session private keys in localStorage, cookies, query strings, application state snapshots, logs, analytics, crash reports, or server APIs.
- Do not derive a session key from a wallet signature, password, account address, timestamp, device ID, or predictable random source.
- Do not reuse one session executor across tournaments.
- Do not give the session path access to deposits, withdrawals, prizes, refunds, cancellation, escalation, administration, or arbitrary calls.
- Do not consider local storage proof of an active session without checking the registry.
- Do not mix V2 ABIs or addresses with V3 instances.
- Do not infer contract generation from a game label or ABI filename.
- Do not automatically submit a direct wallet transaction after an illegal move, an execution revert, user rejection, or an ambiguous UserOperation timeout.
- Do not claim that a browser session is a wallet, controls funds, lasts for the whole tournament, or can recover without the enrolled primary wallet.
- Do not expose internal account-abstraction jargon in normal gameplay unless it helps diagnose a problem.
- Do not hand-edit generated ABI payloads or deployment addresses.
- Do not make public-network deployment or V3 cutover part of routine local frontend development.

### 3.5 Development freedom inside `src/v3/`

The V3 route namespace is deliberately isolated so the new frontend can be developed without preserving the current V3 arena UI or its internal APIs.

- The current V3 pages are not a compatibility contract.
- Developers may replace, rename, split, or remove V3 pages, hooks, components, styles, state models, and navigation flows.
- V3 arena screens may be temporarily incomplete or broken while a coherent implementation batch is in progress.
- Refactors do not need to preserve the current V3 visual design, component hierarchy, direct-wallet transaction flow, or V2-derived filenames.
- Characterization tests are useful for understanding existing product capabilities, but should not freeze an unsuitable V3 architecture.
- The `/v3/` namespace should remain clearly isolated; individual V3 route shapes may change when the new design needs them.

This freedom does **not** authorize changes to the existing non-V3 routes or their behavior. The currently shipped `/tictactoe`, `/connect4`, `/chess`, historical links, and V2 contract interactions must remain unaffected unless a separate task explicitly changes them. Final V3 still needs the required game and tournament capabilities, but it does not need UI or implementation compatibility with the V3 clone that exists today.

---

## 4. Non-negotiable frontend invariants

### 4.1 Identity and funds

- The primary address is the enrolled player shown in brackets, profiles, match history, results, and prize displays.
- The session account is a transaction executor only.
- Every financial, ownership, lifecycle, recovery, and administrative action must be connected to the primary-wallet signer.
- The client must never display the session executor as a second player or prize recipient.
- Transaction summaries must distinguish the primary player from the executor without confusing users.

### 4.2 Session scope and lifecycle

- Session identity is exactly `{ chainId, instance, primary }`.
- A session is usable only when its locally stored executor equals the currently active on-chain executor.
- Session state must support at least `missing`, `active`, `expired`, `revoked`, `rotated`, and `inactive`.
- Account changes, chain changes, route changes, and unmounts must close lifecycle monitors and nonce coordinators.
- Rotation makes the old local session unusable immediately.
- Local key removal occurs only after confirmed revocation, successful replacement promotion, or an explicit safe cleanup path.
- A confirmed on-chain refresh followed by interrupted local promotion must be recoverable on startup.

### 4.3 Move delivery

- All three games use the same high-level submission state machine and transport policy.
- The game-specific adapter supplies only the canonical move data.
- A successful UserOperation receipt must be reconciled with updated game state.
- An execution revert is final for that attempt and must not trigger automatic wallet fallback.
- An ambiguous timeout must preserve the nonce lock and require receipt/nonce reconciliation before retry.
- A direct primary move remains available when session or sponsorship infrastructure is unavailable.

### 4.4 Generation isolation

Every contract context must carry:

```text
{ generation, chainId, factory, instance, profileRegistry, sessionRegistry }
```

- V2 links and active tournaments continue to use V2 code, contracts, and history.
- V3 links use only V3 payloads from `src/v3/ABIs/`.
- New creation switches to V3 only through an explicit, reversible release flag.
- Combined history may be presented to users, but generation-specific identities and write paths must remain separate internally.

### 4.5 Security and privacy

- The browser session SDK's encrypted IndexedDB vault is the only approved persistent key path.
- Private key material and signatures must never enter React state, developer tools serialization, console output, telemetry, or session-replay tooling.
- Same-origin script execution can use the vault; therefore preventing XSS is part of session-key security.
- Production must use a restrictive Content Security Policy, narrow network allowlists, reviewed dependencies, and no third-party session replay on game or wallet surfaces.

---

## 5. Current frontend baseline

At the creation of this plan:

- V3 source exists under `src/v3/`.
- Separate routes exist for:
  - `/v3/tictactoe`
  - `/v3/connect4`
  - `/v3/chess`
- The V3 arena wrappers still render large V2-derived page implementations.
- Several V3 files retain V2 names and assumptions.
- The current V3 create, join, and move flows still use the injected wallet directly.
- Shared game utilities and ABI helpers exist, but there is no frontend session context, session vault integration, UserOperation transport, or recovery UI yet.
- Generated V3 ABI payloads already exist under `src/v3/ABIs/`, including deployment and account-abstraction metadata.
- The backend provides a typed SDK covering browser keys, encrypted storage, session inspection, refresh/revoke preparation, cross-tab nonce coordination, move encoding, bundler failover, UserOperation creation, error mapping, and direct-fallback policy.

Capture enough of this baseline to understand which product capabilities must exist in the finished V3 experience, but do not preserve the current V3 implementation merely for compatibility. Large refactors and complete UI replacements are acceptable. The important boundary is that work under `src/v3/` must not regress the existing non-V3 routes while final V3 acceptance still proves the required tournament, gameplay, profile, history, accessibility, and mobile capabilities.

---

## 6. Target frontend architecture

The exact filenames may change during implementation, but responsibilities should remain separated.

### 6.1 Deployment and generation layer

Create one validated loader that:

- reads V3 deployment metadata and game ABIs;
- asserts `generation === "v3"`;
- checks the configured chain ID;
- exposes factory, instance, profile registry, session registry, EntryPoint, session-account factory, and paymaster addresses;
- rejects zero, malformed, missing, mismatched, or mixed-generation addresses;
- resolves local versus future production configuration without runtime ambiguity; and
- prevents write operations if the connected chain does not match the payload.

Generated JSON remains an input artifact, not an application API. Components and pages should consume normalized configuration objects rather than understand each JSON file's legacy shape.

### 6.2 Backend SDK integration layer

Integrate the backend's built V3 browser SDK through one reproducible and reviewable mechanism. Prefer a versioned package or deterministic sync/build step over copied, diverging source.

The frontend adapter should expose stable operations such as:

```text
prepareSessionForCreation
prepareSessionForEnrollment
inspectSession
submitSessionMove
refreshSession
recoverPendingRefresh
revokeSession
submitDirectPrimaryMove
```

The React application must not independently implement private-key generation, account derivation, typed-data signing, vault encryption, nonce locking, UserOperation packing, paymaster encoding, or bundler failover.

### 6.3 Wallet and network layer

Centralize:

- injected wallet discovery;
- mobile/wallet-browser prompts;
- account connection;
- chain switching and chain addition;
- read provider and primary signer creation;
- account/chain event listeners;
- disconnect cleanup; and
- user-visible wallet errors.

Pages should not each maintain their own subtly different wallet lifecycle. Existing behavior can be wrapped first, then migrated incrementally.

### 6.4 Session service and React state

Create one V3 session provider/service with:

- the active `{ chainId, instance, primary }` identity;
- local metadata without secret material;
- on-chain inspection status;
- expiry and seconds remaining;
- pending create/join registration state;
- pending UserOperation state;
- refresh/revoke/recovery state;
- direct fallback eligibility;
- cross-tab lifecycle updates;
- safe cleanup on identity changes; and
- deterministic error descriptors.

Use a reducer or explicit state machine for lifecycle transitions. Avoid scattered booleans such as `isLoading`, `hasSession`, and `failed` that permit contradictory UI states.

### 6.5 Game transaction adapters

Define a shared game adapter contract with game-specific move normalization:

- Tic-Tac-Toe: round, match, cell index.
- Connect Four: round, match, column.
- Chess: round, match, from square, to square, promotion piece.

The shared move controller should:

1. validate obvious client-side shape constraints;
2. select session or direct-primary transport;
3. prevent duplicate intent while pending;
4. submit through the selected transport;
5. wait for the correct receipt;
6. refresh authoritative match state;
7. map errors to safe product copy; and
8. preserve the user's board selection when correction is possible.

### 6.6 UI component layer

Create reusable V3 components rather than duplicating session markup in each arena:

- session status indicator;
- first-time “confirm once” explanation;
- wallet approval and on-chain confirmation progress;
- session expiry warning;
- refresh/reconnect action;
- revoke action;
- lost-browser/new-device recovery prompt;
- sponsored move progress;
- direct-wallet fallback prompt;
- infrastructure status message; and
- advanced diagnostic details hidden behind disclosure.

The normal successful path should remain visually quiet. Session machinery should become prominent only during onboarding, expiry, recovery, or transport failure.

---

## 7. Required user journeys

### 7.1 Create a V3 lobby with a session

1. Connect the primary wallet and verify the target chain.
2. Generate and encrypt a browser session key before opening the wallet.
3. Derive its counterfactual session-account address.
4. Pass that executor to the V3 factory `createInstance` call.
5. Pay the entry fee and register the executor atomically.
6. Parse the created instance address from the confirmed factory event.
7. re-key or finalize local identity against the actual instance if the pre-creation flow requires staging.
8. Inspect the registry and accept the session only when the executor matches on-chain.
9. Navigate to the V3 tournament route and show active status.
10. Cleanly discard staged local state if the wallet rejects or the transaction reverts.

The implementation must resolve the fact that a session identity includes the instance address while factory creation derives that instance during the transaction. Use the backend-supported deterministic instance address, a staged creation record, or another reviewed atomic design; do not weaken identity binding.

### 7.2 Join a V3 lobby with a session

1. Generate and persist a session candidate for the known instance.
2. Call `enrollInTournament(sessionExecutor)` from the primary wallet with the entry fee.
3. Wait for confirmation.
4. Inspect the on-chain binding.
5. Enable prompt-free moves only when the local and on-chain executors match.
6. Remove unconfirmed staged data if enrollment fails.

### 7.3 Submit a routine move

1. Confirm the user is the primary player for the active match and it is their turn.
2. Confirm the session is locally available and active on-chain.
3. Encode the exact game move.
4. Build, estimate, sign, and submit the UserOperation through the SDK.
5. Show pending and included states without opening the primary wallet.
6. Reconcile the receipt and authoritative match state.
7. Never optimistically persist a move as final before chain confirmation.

### 7.4 Refresh an expired, lost, or rotated session

1. Generate and encrypt a new candidate.
2. Ask the enrolled primary wallet to call `refreshSession(instance, newExecutor)`.
3. Show wallet approval separately from on-chain confirmation.
4. Promote the staged local key only after confirmation.
5. Re-inspect the registry and show success only on exact match.
6. Recover a confirmed but interrupted promotion on next startup.
7. Preserve the old record when wallet approval or the transaction fails.

### 7.5 Revoke a session

1. Explain that revocation stops prompt-free moves but does not affect the tournament or funds.
2. Submit `revokeSession(instance)` from the primary wallet.
3. Wait for confirmation.
4. Remove the local record and notify other tabs.
5. Continue offering direct-primary moves.

### 7.6 Direct-primary fallback

Offer an explicit direct-wallet move when:

- the local session is missing;
- it is expired, revoked, rotated, or inactive;
- the bundlers are unavailable;
- the paymaster is paused or refuses an otherwise valid sponsored path; or
- the relevant session infrastructure is unavailable.

Do not automatically fall back when:

- the player rejected a request;
- the game move is illegal;
- execution reached the chain and reverted;
- a UserOperation timeout has an ambiguous outcome; or
- the same logical move may already be pending.

### 7.7 Spectating and completed history

- Keep read-only tournament, board, bracket, profile, and history views usable without a wallet.
- Show primary player identities, not executor accounts.
- Decode V3 `MoveMade` player and executor fields correctly.
- Preserve access to V2 historical and active-instance views after V3 becomes the creation default.

---

## 8. User-visible state and copy rules

The final component copy may evolve through product review, but it must communicate these truths:

| State | Product meaning | Required action |
| --- | --- | --- |
| Preparing | A convenience key is being created only for this tournament | Keep the user on the current flow |
| Awaiting wallet | One primary-wallet confirmation will create/join and enable prompt-free moves | Ask for the wallet confirmation |
| Confirming | The paid transaction is submitted but not final | Wait and reconcile |
| Active | This browser can submit legal moves without wallet popups | Allow session moves |
| Near expiry | The fixed on-chain session will expire soon | Offer proactive refresh without blocking current legal moves |
| Expired | The tournament and funds are unchanged; prompt-free submission stopped | Refresh or use the primary wallet |
| Missing local key | This browser no longer has the convenience key | Connect the enrolled wallet to authorize a new one |
| Rotated/revoked | This browser's key is no longer authorized | Refresh or use the primary wallet |
| Bundler/paymaster unavailable | Convenience infrastructure is unavailable, not the game | Offer explicit direct-wallet fallback |
| Move reverted | The attempted move did not execute | Show the decoded reason; do not retry automatically |
| Ambiguous timeout | Submission may still be pending | Reconcile receipt and nonce before allowing retry |

Avoid presenting “gasless” as an unconditional guarantee. Prefer “sponsored” or “prompt-free” where accurate, because sponsorship can be paused or unavailable.

---

## 9. Phased implementation plan

Each phase should end with working code, focused tests, updated tracking, and a log entry. Phases may be split or reordered when dependencies require it.

### Phase 0 — Baseline, decisions, and tracking setup

Goals:

- Populate `tracking.md` with ordered, reviewable tasks derived from this plan.
- Record the current V3 file inventory, routes, imports, tests, and known V2-derived assumptions.
- Run and record the current frontend test and build baseline.
- Identify all create, enroll, move, recovery, financial, and administrative transaction call sites in the three game pages.
- Confirm the exact generated ABI payload schema and backend SDK browser entrypoint.
- Decide how the frontend consumes the SDK without source divergence.
- Decide how pre-instance session staging works for factory creation.
- Define environment configuration for local RPC and both local bundlers.
- Add an architecture decision record for generation routing and SDK delivery.

Exit gate:

- The baseline is reproducible, major integration decisions are recorded, and the tracking checklist is ready for implementation.

### Phase 1 — V3 isolation and structural cleanup

Goals:

- Ensure every `/v3/*` route remains inside V3 after internal navigation.
- Correct V3 route-base assumptions.
- Replace or rename V2-derived V3 components as aggressively as the target architecture requires.
- Prevent accidental imports of V2 ABI/address data into V3 transaction paths.
- Add import-boundary tests or lint rules for generation isolation.
- Break apart or replace the large arena pages without treating their current component APIs or visuals as stable.
- Protect the existing non-V3 routes from imports, styling changes, state changes, and routing regressions.

Exit gate:

- V3 routes use declared V3 boundaries, the target architecture is ready for session work, the client still builds, and the existing non-V3 routes remain unaffected. V3 screens may still be visually or functionally incomplete at this gate.

### Phase 2 — Deployment configuration and SDK integration

Goals:

- Implement the normalized V3 deployment loader.
- Validate chain ID, generation, required addresses, ABI presence, and live bytecode before enabling writes.
- Integrate the backend browser SDK through the chosen deterministic mechanism.
- Create provider, bundler, failover, vault, coordinator, and `V3SessionClient` factories.
- Configure two local bundlers for development failover.
- Map SDK errors into the frontend's existing error presentation.
- Add startup diagnostics that expose public configuration only.
- Add scripts/checks that fail when generated payloads are stale or malformed.

Exit gate:

- A browser test can load local V3 configuration, create a session client, derive a counterfactual executor, and inspect the live local registry without exposing secret material.

### Phase 3 — Wallet, identity, and session state foundation

Goals:

- Centralize wallet connection and network switching.
- Introduce explicit primary-player and session-executor concepts.
- Implement the session lifecycle reducer/state machine.
- Integrate encrypted IndexedDB storage.
- Recover pending refresh records on startup.
- Implement cross-tab public lifecycle synchronization and nonce locking.
- Reset monitors and active identity safely on account or chain change.
- Handle private mode, storage denial, storage eviction, and unsupported Web Crypto.
- Add a reusable session status and action surface.

Exit gate:

- Session lifecycle states are deterministic across reloads, tabs, accounts, chains, and storage conditions, with focused browser-backed tests.

### Phase 4 — Atomic create and join

Goals:

- Add “confirm once to enable prompt-free moves” onboarding.
- Generate the session candidate before wallet submission.
- Pass the executor to each game's V3 factory create call.
- Pass the executor to each game's V3 enrollment call.
- Finalize or discard staged local data correctly.
- Parse confirmed instance addresses and validate enrollment.
- Inspect the registry before marking a session active.
- Support a deliberate `address(0)` direct-wallet-only path if product policy keeps it available.
- Ensure wallet rejection, transaction revert, replacement block, and navigation interruption leave recoverable state.

Exit gate:

- Local creator and joiner flows register a unique active executor atomically for all three games using one primary-wallet transaction each.

### Phase 5 — Prompt-free Tic-Tac-Toe moves

Goals:

- Implement the shared move controller and Tic-Tac-Toe adapter.
- Submit session moves through ERC-4337.
- Show pending, included, and reverted states.
- Reconcile receipts with board and tournament state.
- Prevent double clicks and nonce races.
- Add explicit direct-primary fallback.
- Preserve existing timeout, escalation, bracket, and settlement behavior.

Exit gate:

- Two local players can create/join and complete a Tic-Tac-Toe tournament with session-authorized moves, correct profiles/prizes, and no repeated primary-wallet prompts.

### Phase 6 — Connect Four and Chess parity

Goals:

- Add the Connect Four move adapter and tests for columns, full columns, turns, and settlement.
- Add the Chess move adapter and tests for source/destination squares, promotion, illegal moves, turns, clock behavior, and settlement.
- Reuse the shared move controller without copying account-abstraction logic.
- Confirm each game emits and displays the primary player correctly.
- Complete cross-game UI and error-copy consistency.

Exit gate:

- Prompt-free session gameplay and direct fallback work for all three games with equivalent lifecycle behavior.

### Phase 7 — Refresh, recovery, revoke, and expiry

Goals:

- Show session time remaining using on-chain expiry.
- Add near-expiry and expired states.
- Implement primary-wallet refresh with staged-key promotion.
- Implement startup recovery for interrupted refresh promotion.
- Implement lost-browser and new-device recovery.
- Implement explicit revocation and post-confirmation cleanup.
- Handle another tab/device rotating the active executor.
- Verify old executors stop being used immediately.
- Keep direct gameplay available through every recoverable session failure.

Exit gate:

- Expiry, refresh, cache loss, cross-device replacement, rotation, revocation, and interrupted refresh are recoverable without changing match or fund state.

### Phase 8 — Reliability, accessibility, and product polish

Goals:

- Normalize loading, pending, success, error, and fallback feedback.
- Use accessible live regions for transaction and move state.
- Ensure session controls are keyboard accessible and screen-reader understandable.
- Test focus restoration around wallet prompts and modals.
- Respect reduced motion.
- Validate mobile wallet-browser and narrow-screen layouts.
- Avoid blocking game visibility with routine session status.
- Add safe advanced diagnostics for support without key or signature data.
- Review all wording for custody, security, expiry, sponsorship, and recovery accuracy.

Exit gate:

- The core journeys are understandable and usable across supported devices and accessibility modes without exposing protocol complexity in the happy path.

### Phase 9 — Comprehensive validation and security hardening

Goals:

- Add unit tests for configuration, adapters, reducers, error mapping, and route isolation.
- Add component tests for every visible session state.
- Add integration tests using real IndexedDB, Web Crypto, provider events, and mocked deterministic RPC boundaries.
- Add local browser E2E tests against deployed V3 contracts and local bundlers.
- Test account changes, chain changes, reloads, cross-tab races, private mode, lost storage, and refresh interruption.
- Test bundler failover, paymaster pause/refusal, RPC failure, execution revert, and ambiguous timeout.
- Test that illegal moves never auto-fallback.
- Test that session paths cannot invoke financial or administrative actions.
- Add secret-leak scanning for logs, storage, telemetry fixtures, source maps, and screenshots.
- Add dependency, CSP, and unsafe-DOM review.
- Run the full frontend build and test suite.
- Run the backend V3 SDK, contract, security, and contract-size gates when integration changes depend on backend artifacts.

Exit gate:

- Critical journeys and adversarial states are automated, no session secrets leak, and no unresolved critical/high-confidence security issue remains.

### Phase 10 — Fully local acceptance

Use the local backend workflow from the sibling `e-tour` repository:

```bash
npm --prefix v3 run local:stack:fresh
npm --prefix v3 run abis:generate:local
npm --prefix v3 run abis:copy:client
```

Then start the client:

```bash
npm run dev
```

Acceptance must cover:

- fresh chain and fresh deployments;
- generated V3 ABIs copied to `src/v3/ABIs/`;
- deterministic funded primary wallets;
- two local bundlers and local sponsorship;
- creator and joiner session registration;
- first-use counterfactual account deployment;
- subsequent prompt-free moves;
- completion and settlement for all three games;
- profiles and history attributed to primary wallets;
- one bundler unavailable;
- all bundlers unavailable;
- paymaster unavailable;
- direct-wallet fallback;
- TTL expiry using local time travel;
- refresh, revoke, cache loss, and new-device recovery; and
- reload and cross-tab reconciliation.

Exit gate:

- A clean checkout can reproduce the entire V3 frontend experience locally without a public RPC, faucet, hosted bundler, or external API key.

### Phase 11 — Dual-generation release readiness

Goals:

- Keep existing V2 instances readable and actionable through V2 code.
- Aggregate V2 and V3 history without mixing contract identities.
- Put the “new tournament generation” decision behind a reversible feature flag.
- Add canary cohort and rollback routing support.
- Ensure disabling sponsorship does not disable direct gameplay.
- Document support diagnostics and user recovery procedures.
- Finalize production CSP, network allowlists, environment validation, and monitoring hooks.
- Coordinate published ABI/address checksums with the backend release.

Exit gate:

- The client can enable V3 for new creation without abandoning V2 activity and can route new creation back without mutating existing tournaments.

### Phase 12 — Cutover and post-release cleanup

Goals:

- Enable V3 creation only after backend audit, deployment, and canary gates approve it.
- Observe session creation, UserOperation outcomes, fallback rate, paymaster refusal, move inclusion, recovery, and settlement without collecting secrets.
- Expand traffic gradually.
- Keep V2 instance routes and history indefinitely.
- Remove obsolete V2-derived code from `src/v3/` as the replacement architecture makes it unnecessary.
- Update public documentation and user help.
- Archive final acceptance evidence and keep operational ownership current.

Exit gate:

- V3 is the stable default for new tournaments, historical generations remain accessible, and the frontend implementation has no undocumented dependency on legacy V2 transaction logic.

---

## 10. Testing strategy

### 10.1 Unit tests

Cover:

- deployment payload normalization and rejection;
- generation and chain guards;
- move adapters for every valid boundary value;
- session lifecycle reducer transitions;
- direct-fallback policy;
- error decoding and copy selection;
- identity/cache key construction; and
- no-secret serialization guarantees.

### 10.2 Component tests

Cover:

- confirm-once onboarding;
- awaiting-wallet versus confirming states;
- active and near-expiry states;
- missing, expired, rotated, revoked, and inactive sessions;
- bundler and paymaster failures;
- explicit direct fallback;
- refresh/revoke confirmations;
- accessible announcements, focus, and keyboard control; and
- disabled/re-enabled board interactions.

### 10.3 Integration tests

Use real browser primitives where practical:

- IndexedDB and non-extractable Web Crypto keys;
- reload and staged-refresh recovery;
- BroadcastChannel/Web Locks or their fallbacks;
- account and chain provider events;
- SDK integration with deterministic RPC/bundler fixtures;
- receipt reconciliation; and
- stale, mismatched, or tampered vault records.

### 10.4 Local end-to-end tests

Run against actual local contracts, EntryPoint, paymaster, and both bundlers. At minimum, complete one tournament per game and test each major recovery/failure path.

Tests must assert both product behavior and on-chain invariants:

- the primary is enrolled;
- the executor is active only for the intended instance;
- moves affect the correct match;
- the executor never becomes the player or payout recipient;
- settlement remains correct;
- old executors fail after rotation/revocation/expiry; and
- direct-primary moves continue to work.

---

## 11. Security and content hardening

Before production:

- Deliver Content Security Policy as an HTTP header, not only a meta tag.
- Start from:
  - `default-src 'self'`
  - `script-src 'self'`
  - `object-src 'none'`
  - `base-uri 'none'`
  - `frame-ancestors 'none'`
- Keep `connect-src` limited to reviewed RPC and bundler endpoints.
- Avoid `unsafe-inline` and `unsafe-eval`.
- Enable Trusted Types where supported and remove unsafe DOM sinks.
- Disable third-party session-replay tooling on wallet and gameplay surfaces.
- Pin dependencies and review lockfile changes.
- Ensure source maps, error collectors, and analytics cannot receive secrets or signatures.
- Never allow arbitrary user-supplied RPC, bundler, paymaster, EntryPoint, or contract addresses in production.
- Review all third-party scripts as code with access to the origin's session vault.

---

## 12. Observability and support

Permitted public operational signals include:

- chain and generation;
- game and instance address;
- primary address only when normal wallet-address telemetry policy allows it;
- executor public address;
- session status and remaining TTL;
- bundler provider label;
- UserOperation hash;
- transaction hash;
- inclusion latency;
- mapped error code;
- fallback offered/selected; and
- recovery outcome.

Never record:

- private keys or decrypted bytes;
- vault wrapping keys or ciphertext plus correlating secrets;
- raw signatures unless explicitly required for a short-lived local diagnostic;
- wallet provider objects;
- full error graphs before secret scrubbing; or
- unredacted browser storage dumps.

Support diagnostics must be copyable without exposing private material and should make clear whether a failure is in the wallet, chain, session, bundler, paymaster, or game rule.

---

## 13. ABI and local development workflow

The backend-generated files in `src/v3/ABIs/` are the only accepted V3 contract payloads. Do not edit them manually.

From the backend repository root, keep the fresh local stack running in one terminal:

```bash
npm --prefix v3 run local:stack:fresh
```

In another terminal, generate fresh payloads:

```bash
npm --prefix v3 run abis:generate:local
```

Copy only the validated payloads into this client:

```bash
npm --prefix v3 run abis:copy:client
```

The convenience command for both ABI steps is:

```bash
npm --prefix v3 run frontend:abis
```

From the client repository:

```bash
npm run test:run
npm run build
npm run dev
```

Future frontend scripts for linting, type-checking, browser E2E, CSP checks, generated-artifact checks, and SDK synchronization should be added to this section and to the release gate when introduced.

---

## 14. Definition of done

Frontend V3 is complete only when all of the following are true:

- Tic-Tac-Toe, Connect Four, and Chess retain full tournament and gameplay parity.
- Creating or joining with a session takes one primary-wallet transaction.
- Routine legal moves no longer require repeated primary-wallet confirmations.
- All authoritative session and game state is reconciled on-chain.
- Expiry, loss, rotation, revocation, refresh, and interrupted refresh are handled safely.
- Direct-primary gameplay remains available when session infrastructure fails.
- No session path can trigger escrow, payout, withdrawal, refund, administration, or arbitrary calls.
- Primary identity is preserved across boards, brackets, events, profiles, history, and payouts.
- V2 and V3 ABIs, addresses, profiles, routes, caches, and writes remain isolated.
- Existing V2 tournaments stay usable after V3 becomes the new-creation default.
- Unit, component, integration, local E2E, accessibility, and security checks pass.
- Local acceptance succeeds from a fresh stack with no public infrastructure.
- No session secret appears in persistent plaintext storage, logs, telemetry, screenshots, source maps, or reports.
- Production CSP and network allowlists are enforced.
- Release routing is reversible and does not mutate existing V2 or V3 instances.
- `plan.md`, `tracking.md`, and `logs.txt` accurately describe the final state and handoff.

---

## 15. Known risks and required decisions

Track these explicitly until resolved:

- How the counterfactual executor is staged before a newly created instance address is final.
- How the backend SDK is versioned and consumed by Vite without duplicated security-sensitive code.
- Which two bundler endpoints are used in each environment and how failover health is determined.
- Whether direct-wallet-only enrollment remains a visible product option.
- When to warn for a one-hour TTL and whether proactive refresh is offered between moves.
- How to represent pending UserOperation state across reloads without enabling nonce reuse.
- Which browser versions and wallet browsers are supported for IndexedDB, Web Crypto, BroadcastChannel, and Web Locks.
- How combined V2/V3 profiles and histories are labeled without confusing users.
- Which telemetry is necessary and how it is scrubbed.
- How production CSP is delivered by the hosting layer.
- What release evidence authorizes the switch of new creation from V2 to V3.

Each resolved decision should update this plan if architectural intent changes, update `tracking.md` if execution changes, and be recorded in `logs.txt`.

---

## 16. Final implementation principle

The session feature is successful when it removes repetitive wallet friction without changing who the player is, who owns the funds, how the game is decided, or how a player recovers. Convenience may fail gracefully; protocol access and user custody must not.
