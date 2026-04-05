ETour is tournament infrastructure on the blockchain. 

Developers inherit this infrastructure by implementing a simple game contract.

Players connect their wallets and compete.

ETour handles matchmaking, brackets, timeouts, prize distribution, and more.

---

This whitepaper explains why ETour was built this way and what becomes possible when competitive gaming is built on trustless infrastructure.

---

## 1. The Philosophy of ETour

Web3 gaming has become synonymous with speculation, ponzi schemes, and "play-to-earn" models that always collapse.

The focus shifted from creating fun games to engineering complex tokenomics. Players became investors, games became financial instruments, and fun became secondary to ROI calculations.

This is backwards.

Competitive players have simple desires that haven't changed since the dawn of gaming:

- Fair matches where skill determines outcomes
- Real stakes that make victory meaningful
- Instant resolution with no delays

Adding a Web3 layer to games is counterproductive unless it delivers on those core needs first *and* adds value that wouldn't be possible without blockchain.

ETour inverts the typical Web3 gaming approach:

- **Current Web3:** Here's our token/coin/scheme. You must learn about its tokenomics, governance, and yield farming. There's also a game somewhere.

- **ETour:** Play games you already know over ETH stakes. Winner takes all.

### Why Blockchain Matters

Centralized gaming requires trust in multiple parties: the server not to manipulate game state, the operator not to freeze your funds, payment processors not to reverse transactions, the company not to shut down tomorrow.

Most of the time, this trust is justified.

But when real money is involved, "most of the time" isn't good enough.

Blockchain provides three irreplaceable properties for competitive gaming:

**Transparency.** Every game state, every move, every outcome is visible on-chain. Not just verifiable, actually traceable. Anyone can reconstruct any game from transaction history.

**Immutability.** Once a move is made, it cannot be changed. Once a winner is determined, it cannot be overridden. Once prizes are distributed, they cannot be clawed back.

**Autonomy.** No servers to maintain. No admins to trust. No company to depend on.

These aren't "extra features." These are properties we inherited by building on blockchain. ETour runs itself forever according to its code.

### The RW3 Movement

ETour is built on the principles of Reclaim Web3 (RW3): a commitment to real utility, fully on-chain verification, self-sustaining economics, fair and equitable access, and no altcoins.

These principles reject the speculation-first mindset that has corrupted Web3. 

RW3 commits to:

- **Real Utility:** The platform solves a genuine problem that wouldn't be possible without blockchain.
- **Fully On-Chain:** No off-chain databases, no centralized APIs. Everything that matters must live in the smart contracts.
- **Self-Sustaining:** Revenue comes from fair fees on actual gameplay, not token sales or venture funding.
- **Fair and Equitable:** No insider advantages, no token-holder voting that distorts the game, no governance theater.
- **No Altcoins:** ETH only. Not because we couldn't create a token, but because tokens corrupt competitive gaming. With a token, players become investors, competition becomes secondary to price action, and simplicity becomes complexity.

These commitments shape every technical decision in ETour. They're not roadmap items or future work. They're the foundation.

---

## 2. The Problems with Competitive Gaming

### The Trust Problem

Every online competitive system faces the same fundamental issue: you must trust a third party to keep your money, execute the rules fairly, and actually pay you if you win.

- A platform can freeze your account and keep your funds.
- A server operator can manipulate game state to favor certain players.
- A payment processor can reverse transactions after the fact.
- A company can shut down tomorrow, taking your winnings with them.

Traditional solutions require accepting this risk because there was no alternative. Web3 changes that.

### The Griefing Problem

Every competitive system faces the same behavioral problem: losing players stall to avoid defeat.

In chess, they let the clock run. In poker, they tank every decision. Online, they disconnect and hope opponents quit.

Traditional solutions require human intervention - moderators, support tickets, manual reviews. These introduce bias and centralization that goes directly against what Web3 stands for.

ETour solves stalling through economic incentives that escalate over time. The longer someone stalls, the more people benefit from their inaction. The only party that doesn't benefit is the staller. This is game theory, not punishment.

### The Cost Problem

Every action on a blockchain costs gas. But the real cost problem isn't the price per move — it's how costs accumulate over time.

Traditional Web3 games write every move, every match, every outcome to storage indiscriminately. This accumulates fast. As the game grows more popular, storage fills up, and gas costs for every subsequent move increase.

The more people play, the more expensive it gets. The more expensive it gets, the fewer people play. The game collapses.

This isn't a gas problem. It's a design problem.

ETour was built from day one to avoid this trap through deliberate storage architecture. Historical data lives in read-only, append-only storage and is never used in active gameplay logic.

The gas cost of a move in round one of the billionth tournament is identical to the cost of a move in round one of the first tournament.

### Platform Dependency

All competitive gaming lives inside a company's walled garden. The company controls the rules, the matchmaking, the fee structure, and ultimately whether the platform survives.

Players have no recourse. Their history, their stats, their hard-won ranking — all of it evaporates if the company shuts down.

ETour eliminates this dependency. The protocol is code, not discretion. The rules are transparent and unchangeable. The platform survives independently of any company's viability.

---

## 3. The ETour Approach

### Settlement Integrity

Every player who enters a tournament receives an ironclad guarantee: the outcome will be settled automatically, permanently, and without human intervention.

No refunds. No reversals. No exceptions. The smart contracts execute exactly as written.

This sounds harsh until you realize what it means for competitive integrity. There is no human in the middle. There is no appeal to a support team that might be biased, underpaid, or simply overloaded. There is only code and economics.

Players compete knowing that victory is final and failure is permanent. This is the foundation of trustless competition.

### Fair by Design

ETour is not trying to prevent cheating or eliminate bots. That's an endless cat-and-mouse game where billion-dollar companies lose constantly.

Instead, ETour operates under the assumption that bad actors exist and builds the system to be resilient to them.

What ETour does prevent is the *platform* exploiting players. There is no hidden rake. There is no algorithm optimizing for the house's profit. There is no governance vote that changes the rules in favor of token holders.

The fee structure is hardcoded and transparent: 90% to the winner, 7.5% to the creator, 2.5% to sustain the protocol. These percentages cannot be changed. No governance, no voting, no discretion.

The prize pool can only go to the winner. It cannot be forfeited. It cannot be delayed. It cannot be taken back.

This is fairness by design: the code enforces equity more reliably than any human audit ever could.

### Self-Sustaining Economics

ETour doesn't need token sales, venture funding, or financial engineering to survive.

As long as people want to compete, ETour generates enough revenue to run itself. The 7.5% creator fee and 2.5% protocol fee fund development and infrastructure. The economics are simple enough for anyone to verify: prize pool size multiplied by entry fee equals total revenue. Subtract the fees, and you see exactly how much reaches the winner.

This simplicity is intentional. A self-sustaining business model is the most radical form of trustlessness — the company can't fail and take the platform with it because the platform doesn't depend on the company. It depends only on Arbitrum's continued existence.

---

## 4. The Future of Competition

### ETour as Infrastructure

ETour separates universal tournament logic from game-specific rules.

Game contracts only need to implement move validation, win detection, and state management. Everything else — brackets, matchmaking, timeouts, escalation, prizes, leaderboards — is inherited from the protocol.

This means any developer can build a game on ETour by implementing roughly a dozen functions. Focus on making your game fun and strategic. Let ETour handle the competitive infrastructure.

The three games launching with ETour (Tic-Tac-Toe, Chess, Connect Four) prove this approach works. Each is built by implementing game logic only. The tournament orchestration is not reimplemented — it's reused.

As more games build on the protocol, network effects emerge naturally: shared player bases, unified leaderboards, cross-game achievements. But growth isn't the goal — sustainability is.

### What Becomes Possible

ETour proves that blockchain applications can be simple, useful, and sustainable without tokens or speculation.

This model (fee-based services with transparent economics) represents blockchain's true potential: not as financial engineering, but as trust(less) infrastructure for human coordination.

Competitive gaming is just the beginning. Any system where fairness matters and transparency creates value can be rebuilt on this foundation. The same principles that make trustless tournaments possible apply to audits, verification, dispute resolution, and reputation systems.

ETour succeeds if it's still running unchanged in ten years, facilitating fair competition for whoever wants to play.

---

## 5. Conclusion

ETour is built on a simple belief: competitive players don't need tokens, governance votes, or complex economics. They need fair matches, transparent outcomes, and reliable payouts.

Everything else is noise.

If you're a player: pick a game and compete. Test yourself against others with real stakes on the line.

If you're a developer: build your game on ETour. Inherit our infrastructure and focus on what makes your game special.

If you're a skeptic: read the code. Verify the claims. Find flaws.

ETour will be running on Arbitrum long after this whitepaper is outdated. Code is its forever guarantee.

---

### User Manual

[Read The Full User Manual Here](https://github.com/KarimChukfeh/tic-tac-react/blob/main/public/User_Manual.md)