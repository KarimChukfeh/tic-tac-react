# Local V3 Tic-Tac-Toe testing

Start from an empty local service state. These commands should print no
listeners:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:4337 -sTCP:LISTEN
lsof -nP -iTCP:4338 -sTCP:LISTEN
lsof -nP -iTCP:8545 -sTCP:LISTEN
```

In backend terminal 1, start a fresh V3 chain and deployment:

```bash
cd /Users/karim/Documents/workspace/zero-trust/e-tour/v3
npm run local:stack:fresh
```

Wait until it prints `Fresh local V3 backend is ready`, then leave that
terminal open.

In backend terminal 2, regenerate, validate, and copy the deployment payloads
used by the frontend. This must happen after every fresh deployment:

```bash
cd /Users/karim/Documents/workspace/zero-trust/e-tour/v3
npm run frontend:abis
```

In frontend terminal 3, start both ERC-4337 HTTP bundlers:

```bash
cd /Users/karim/Documents/workspace/zero-trust/tic-tac-react
npm run v3:bundlers
```

In frontend terminal 4, start Vite on exactly port 3000:

```bash
cd /Users/karim/Documents/workspace/zero-trust/tic-tac-react
npm run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

Open the URL printed by Vite with `/v3/tictactoe`, for example:

```text
http://127.0.0.1:3000/v3/tictactoe
```

Connect two deterministic funded Hardhat development accounts on chain
`412346`. Creating a tournament or joining it asks for one wallet
confirmation. An active session then submits ordinary board moves through the
local paymaster and bundlers without further primary-wallet prompts.

Accounts 240 and 241 are reserved for the two local bundler relayers. Do not
import or use those two accounts as interactive test wallets. The commonly
imported development accounts 0 through 9 remain available for browser testing.

The session key is generated in-browser and stored encrypted in IndexedDB.
The status panel can deliberately switch to wallet-confirmation mode. Session
failures never resubmit a move through the primary wallet automatically.

For a non-interactive local acceptance check after the chain and bundlers are
running:

```bash
npm run v3:tictactoe:accept
```

That command creates and joins a two-player tournament, submits five sponsored
moves, verifies primary/executor attribution, and checks winner settlement.

To stop cleanly, press `Ctrl-C` in the Vite and bundler terminals, then stop
the managed backend:

```bash
cd /Users/karim/Documents/workspace/zero-trust/e-tour/v3
npm run local:stack:stop
```
