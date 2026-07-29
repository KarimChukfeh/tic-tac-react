# V3 frontend baseline

Captured on 2026-07-29 from client commit `d936ec0`.

## Source and routes

- `src/v3/` contains 63 files.
- The public entry routes are `/v3/tictactoe`, `/v3/connect4`, and `/v3/chess`.
- Each route renders a thin arena wrapper around a V2-derived page.
- The three V2-derived pages total 10,297 lines:
  - `TicTacToeV2.jsx`: 3,450 lines;
  - `ConnectFourV2.jsx`: 3,538 lines; and
  - `ChessV2.jsx`: 3,309 lines.
- At baseline, the arena wrappers passed `/tictactoe`, `/connect4`, and
  `/chess` as their route bases. This allowed share links and internal
  navigation to leave the V3 namespace.
- V3 source does not directly import `src/v2`, but it retains V2 naming,
  logging, URL parsing, shared V2 UI components, and transaction assumptions.

## Generated contract payloads

`src/v3/ABIs/hardhat-factory.json` is a complete V3 deployment manifest:

- schema version: `2`;
- generation: `v3`;
- local chain ID: `412346`;
- local RPC expected by the backend workflow: `http://127.0.0.1:8545`;
- EntryPoint: `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108`;
- SessionKeyRegistry:
  `0x610178dA211FEF7D417bC0e6FeD39F05609AD788`;
- session account factory:
  `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`;
- session paymaster:
  `0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0`; and
- configured session TTL: 3,600 seconds.

The per-game payloads contain the factory ABI, instance ABI, deployment
addresses, modules, profile contracts, and session registry ABI. Their V3
write signatures differ from the cloned frontend calls:

```text
createInstance(
  uint8 playerCount,
  uint256 entryFee,
  uint256 enrollmentWindow,
  uint256 matchTimePerPlayer,
  uint256 timeIncrementPerMove,
  address sessionExecutor
)

enrollInTournament(address sessionExecutor)
```

The cloned frontend omits `sessionExecutor` from both calls. Create and join
must not be considered functional against the generated V3 contracts until
Phase 4 replaces those calls.

## Browser SDK

The backend SDK source is in the sibling repository at `e-tour/v3/sdk/`.
`npm --prefix v3 run sdk:build` produces the browser-capable ESM entrypoint at
`e-tour/v3/sdk/dist/index.js`. It exports:

- `V3SessionClient`;
- browser key generation and encrypted IndexedDB storage;
- session lifecycle inspection, refresh, revoke, and recovery;
- cross-tab coordination and nonce locking;
- game move encoding;
- ERC-4337 UserOperation construction and signing;
- JSON-RPC bundler and failover clients; and
- deterministic error/fallback mapping.

The backend package is not currently publishable: `e-tour/v3/package.json`
has no `exports` map for the SDK. The client also has no SDK dependency or
sync mechanism.

## Transaction call sites

All current writes use an injected primary-wallet signer.

| Surface | Tic-Tac-Toe | Connect Four | Chess |
| --- | ---: | ---: | ---: |
| Create | `TicTacToeV2.jsx:1318` | `ConnectFourV2.jsx:1510` | `ChessV2.jsx:1689` |
| Enroll | `TicTacToeV2.jsx:1469` | `ConnectFourV2.jsx:1567` | `ChessV2.jsx:1723` |
| Move | `TicTacToeV2.jsx:1964` | `ConnectFourV2.jsx:2280` | `ChessV2.jsx:2427` |
| Force start | `TicTacToeV2.jsx:1550` | `ConnectFourV2.jsx:1660` | `ChessV2.jsx:1798` |
| Cancel | `TicTacToeV2.jsx:1590` | `ConnectFourV2.jsx:1701` | `ChessV2.jsx:1828` |
| Reset enrollment | `TicTacToeV2.jsx:1616` | `ConnectFourV2.jsx:1730` | `ChessV2.jsx:1854` |
| Claim abandoned pool | `TicTacToeV2.jsx:1653` | `ConnectFourV2.jsx:1782` | `ChessV2.jsx:1891` |
| Claim timeout | `TicTacToeV2.jsx:2070` | `ConnectFourV2.jsx:2381` | `ChessV2.jsx:2526` |
| Claim replacement | `TicTacToeV2.jsx:2155` | `ConnectFourV2.jsx:2460` | `ChessV2.jsx:2605` |

Only routine `makeMove` is eligible for session transport. Create and enroll
remain primary-wallet transactions but atomically register the executor.
Financial, lifecycle, escalation, recovery, and administrative calls remain
on the primary-wallet signer.

## Local infrastructure gap

The backend fresh-stack command starts the chain and deploys contracts at
`http://127.0.0.1:8545`. Its two configured local bundlers,
`HardhatBundlerA` and `HardhatBundlerB`, are in-process adapters used by
backend tests and acceptance scripts. They are not browser-reachable ERC-7769
JSON-RPC services and have no URLs the frontend can configure.

Phase 2 therefore requires the backend local workflow to expose two HTTP
bundler endpoints before browser acceptance can satisfy bundler failover.

## Reproducible validation

Baseline commands:

```bash
npm run build
npm run test:run
```

Results on 2026-07-29:

- production build: passed, with the existing large-chunk warning;
- tests: 34 files passed and 3 files failed; 144 tests passed and 2 tests
  failed;
- the failures are outside `src/v3/`:
  - `src/App.test.jsx` cannot resolve the pre-existing `./TicTacBlock`;
  - `src/Docs.test.jsx` expects an expanded Overview navigation group; and
  - `src/components/shared/MatchCard.test.jsx` expects no View button without
    a connected account.

