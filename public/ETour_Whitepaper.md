# Tournament Infrastructure for Skill-Based Competition

---

## Abstract

ETour is competitive gaming infrastructure on the blockchain.

Players compete in skill-based tournaments for ETH prizes with guaranteed fair outcomes and instant payouts.

Every move is a transaction.
Every outcome is immutable.

The smart contract handles matchmaking, brackets, timeouts, and prize distribution.

No servers, no admins, no possibility of manipulation.

Developers inherit this infrastructure by implementing a simple game contract. Players connect their wallets and compete.

**ETH in, ETH out. Pure competition, pure meritocracy.**

---

This whitepaper explains ETour's philosophy and how it makes trustless competition possible.

**It's intended for those who want to understand not just what ETour does but why it was built this way.**

---

## 1. The Philosophy — Why ETour Exists

### The Failed Promise of Web3 Gaming

Web3 gaming has become synonymous with speculation, ponzi schemes, and "play-to-earn" models that inevitably collapse. The focus shifted from creating compelling games to engineering complex tokenomics. Players became investors, games became financial instruments, and fun became secondary to ROI calculations.

This isn't what blockchain gaming was supposed to be.

### What Players Actually Want

Competitive players have simple desires that haven't changed since the dawn of gaming:

- **Fair matches** where skill determines outcomes
- **Real stakes** that make victory meaningful
- **Instant resolution** with no payment delays
- **Transparent rules** that apply equally to everyone

These desires exist independently of technology. Chess players in coffee shops betting $20 want the same things as esports professionals competing for millions. The question isn't whether blockchain adds value to competition — it's whether we can deliver that value without drowning players in complexity.

### The ETour Thesis

ETour inverts the typical Web3 gaming approach:

**Traditional Web3 Gaming**
> Here's our revolutionary blockchain protocol with tokenomics, governance, and yield farming. You can also play some games on it.

**ETour**
> Here are games you already know and love. Play them for real ETH stakes. The better player takes the pot.

### Pure Competition, No Speculation

ETour has no token. This is intentional and permanent.

Without a token:
- Players can't "invest" in the protocol
- There's no speculation on future value
- No early adopters extracting value from later players
- No complex tokenomics to understand
- No governance votes or staking mechanisms

The only way to profit from ETour is to be good at games. This aligns every participant's incentives: players want to compete, the protocol wants to facilitate competition, and nobody is trying to pump a token price.

---

## 2. The Problem — Trust is an Issue

### Centralized Gaming's Hidden Failures

Every online game requires trusting multiple parties:

- **The server** not to manipulate game state
- **The operator** not to freeze your funds
- **Payment processors** not to reverse transactions
- **The company** not to shut down tomorrow

Most of the time, this trust is justified. 

**But when real money is involved, "most of the time" isn't good enough.**

### Why Blockchain?

Blockchain provides three irreplaceable properties for competitive gaming:

**Transparency** — Every game state, every move, every outcome is visible on-chain. Not just verifiable — actually visible. Anyone can reconstruct any game from transaction history.

**Immutability** — Once a move is made, it cannot be changed. Once a winner is determined, it cannot be overridden. Once prizes are distributed, they cannot be clawed back.

**Autonomy** — No servers to maintain. No admins to trust. No company to depend on. ETour runs itself according to its code, forever.

These aren't "extra features". These are properties we inherited by building on blockchain. 

**Trustless competition is a new paradigm to think about online competion.**

---

## 3. The Demo — Three Games

### The Selection Criteria

Not every game belongs on blockchain.

We chose games that naturally align with blockchain's constraints while providing compelling competition. Each game had to meet strict criteria:

- **Perfect information** — All players see complete game state
- **Turn-based** — Clear boundaries for blockchain transactions
- **Deterministic** — Same moves always produce same outcomes
- **Culturally universal** — Rules known worldwide
- **Strategically rich** — Skill clearly determines winners

#### A) The Gateway - TicTacToe

**Entry: 0.001 ETH**

> But TicTacToe is solved, perfect play always draws. 

**That's exactly why we chose it.**

TicTacToe serves as ETour's tutorial. 

New players can learn the platform mechanics with minimal risk. 

The high draw rate demonstrates our refund system: when both players draw, they split the prize pool minus a small protocol fee. 

It's training wheels for trustless competition.

But more importantly, TicTacToe proves a point: **even the simplest game becomes interesting with real stakes.** 

That moment when you realize your opponent might not play perfectly. That they might crack under pressure. **That's when tic-tac-toe transforms from child's game to psychological battle.**

#### B) The Flagship - Chess

**Entry: 0.01 — 0.1 ETH**

Chess needs no introduction. It's the ultimate test of strategic thinking, played by millions worldwide.

We implemented complete chess rules — castling, en passant, pawn promotion, fifty-move rule, threefold repetition — fully **on-chain.** 

Not because we had to, but because chess players deserve respect.

**If you're going to play chess for real stakes, then you deserve real chess.**

#### C) The Dark Horse - Connect Four

**Entry: 0.001 — 0.01 ETH**

Connect Four occupies the sweet spot. 

It's more complex than tic-tac-toe, faster than chess, but still familiar to everyone.

We added Connect Four because variety matters. Some days you want the intense strategic depth of chess. Other days you want quick tactical skirmishes.

**Connect Four delivers satisfaction in five-minute bursts.**

### Why Not Battleship?

We initially planned to include Battleship. It's beloved, strategic, and everyone knows the rules. 

But Battleship requires hidden information. 

> **Ship positions must remain secret until revealed.**

Blockchain's fundamental nature is transparency. Every piece of data on-chain is visible to everyone. 

To implement Battleship would require either:
- Commit-reveal schemes that confuse players*
or
- Off-chain logic that defeat the purpose of trustless competition

So rather than compromise our principles, we rejected Battleship **for now.**

This decision embodies ETour's philosophy:

> **Ship fully on-chain applications or don't ship anything at all.**

---

## 4. The Fix — Back to Basics

### Simple is Good

ETour uses single-elimination tournaments.

It's the simplest, most exciting format that a 4 year-old can understand. 

Winners advance, losers go home. 

No complex Swiss pairings, no round-robin calculations. Pure knockout competition.

Tournaments come in any size:

- **2 players** — Quick heads-up matches
- **4 players** — Mini-tournaments with semifinals
- **8 players** — Full bracket experience
- **16 players** — Extended competition for serious players
- **...+**

Each tier operates multiple concurrent instances per the developer's design and configuration. 

### Enrolment

**Enrollment** — Players join by paying the entry fee. The moment your ETH arrives, you're enrolled. No forms, no accounts, no waiting for approval. The tournament waits for enough players or until the enrollment window expires.

**The Bracket** — When a tournament begins, players are paired into matches. Round 0 starts immediately. In an 8-player tournament, four matches begin simultaneously. Winners advance round by round until the finals.

**Victory** — The tournament champion takes everything. No second place, no consolation prizes. This isn't about participation — **it's about winning.**

### When Games Draw

Some games can end in draws. In chess, perpetual check or insufficient material. In tic-tac-toe, perfect play.

Regular draws eliminate both players — neither advances. This creates natural pressure to play for wins rather than safe draws.

But what if the finals draw? Both finalists split the prize pool equally. They've proven themselves equally matched and share the victory.

What if every match in a round draws? The tournament cannot continue. All remaining players split the prize pool equally. Rare, **but handled fairly.**

### Edge Cases and Elegance

Tournaments are messy. Players get eliminated asymmetrically. Odd numbers emerge from draw-heavy rounds.

ETour handles every scenario: odd advancement gives one player a walkover, orphaned winners automatically advance, and incomplete brackets consolidate remaining players.

These aren't patches or hacks. **They're deliberate design decisions ensuring tournaments always resolve fairly.**

---

## 5. The Economics — Fair Play

### The Fee Split

Every entry fee divides three ways:

- **90%** — to the tournament winner
- **7.5%** — to ETour's creator
- **2.5%** — to the contract subsidy pool

These percentages are hardcoded and unchangeable. No governance votes, no admin adjustments. The economics are transparent and permanent.

### Why This Breakdown

**The winner gets 90%** because that's fair. You put in skill, time, and money. You win, you get paid. Straightforward.

**7.5% goes to ETour's creator** as profit for building and operating the platform, including hosting the frontend. This is honest revenue for honest work.

**2.5% accumulates in the contract** until it hits game-specific thresholds, keeping the system self-sustaining. Any excess gets raffled back to active players as a way of giving back to the community.

There are no hidden costs. You know exactly where your entry fee goes.

### The Anti-Token

ETour will never have a token. Not because we couldn't create one, but because tokens corrupt competitive gaming. With a token, players become investors, competition becomes secondary to price action, and complexity obscures the product. Without a token, players remain players, competition is the only focus, and simplicity enhances the product.

**ETH in, ETH out. Nothing more needed.**

### Sustainable by Design

ETour doesn't need token sales, venture funding, or financial engineering to survive. As long as people want to compete, ETour generates revenue. The protocol is built to run unchanged for years — not racing to find product-market fit before funding runs out, not dependent on speculation. Permanence through simplicity.

### Gas Economics

Every action costs gas on Arbitrum — enrollment (~$0.05), moves (~$0.02), claims (~$0.04). Negligible compared to entry fees, but enough to prevent spam. Players naturally optimize their moves, adding another strategic layer to competition.

---

## 6. Solving the Stalling Problem

### The Universal Griefing Vector

Every competitive system faces the same problem: losing players stalling to avoid defeat. In chess, letting the clock run. In poker, tanking every decision. Online, disconnecting and hoping opponents quit.

Traditional solutions require human intervention — moderators, support tickets, manual reviews. **These introduce bias that goes against what Web3 stands for.**

### Escalating Incentives

ETour solves stalling through economic incentives that escalate over time. The longer someone stalls, the more people can claim their position.

**For Enrollment Stalling:**

When tournaments don't fill naturally, two options emerge. First, enrolled players can force-start with whoever joined — three players in an 8-player tournament start a 3-player tournament, with the prize pool adjusting accordingly. If nobody acts, eventually anyone — even non-enrolled players — can claim the entire abandoned prize pool. **This is the nuclear option that ensures tournaments are never stuck forever.**

**For Match Stalling:**

When a player stops moving, escalation begins:

**Level 1:** Their opponent can claim victory by timeout. Simple and fair.

**Level 2:** Players already advanced to later rounds can eliminate both stalled players. Why should their tournament be held up by others' inaction?

**Level 3:** Anyone can replace both stalled players and take their spot in the tournament. Free entry to potentially win the entire prize pool.

### Incentive Alignment

Notice how each escalation level benefits someone: opponents get free wins, advanced players get cleared paths, external observers get free tournament entry, and the protocol gets resolved states. The only party that doesn't benefit is the staller. This isn't punishment — it's game theory.

**ETour makes stalling costly and resolution profitable.**

### Time as a Resource

Each player receives a time bank for their moves, plus increment per move. This isn't arbitrary pressure — it's resource management. Time becomes another strategic dimension. Run low on time and you must play faster, potentially making mistakes. But your opponent knows you're under pressure and might try to complicate positions. Time management becomes part of the game.

---

## 7. The Future of Competition

### What We've Built

ETour demonstrates that blockchain gaming doesn't need complex tokenomics or speculative mechanisms. By focusing on pure competition with transparent rules and guaranteed payouts, we've created what competitive players actually want: games with real stakes and fair outcomes.

### ETour as Infrastructure

ETour separates universal tournament logic from game-specific rules. Game contracts only need to implement move validation, win detection, and state management. Everything else — brackets, matchmaking, timeouts, escalation, prizes, leaderboards — is inherited.

This means any developer can build a game on ETour by implementing roughly a dozen functions. Focus on making your game fun and strategic. Let ETour handle the competitive infrastructure.

### The Broader Vision

ETour proves that blockchain applications can be simple, useful, and sustainable without tokens or speculation. This model — fee-based services with transparent economics — represents blockchain's true potential: not as financial engineering, but as trust infrastructure for human coordination.

As more games build on the protocol, network effects emerge: shared player bases, unified leaderboards, cross-game achievements. But growth isn't the goal — sustainability is. ETour succeeds if it's still running unchanged in ten years, facilitating fair competition for whoever wants to play.

### An Invitation

**If you're a player** — pick a game and compete. Test yourself against others with real stakes on the line.

**If you're a developer** — build your game on ETour. Inherit our infrastructure and focus on what makes your game special.

**If you're a skeptic** — read the code. Verify our claims. Try to find flaws.

---

## ETour is simple.

# Think you're good? Prove it.

---

### Appendix — Contract Verification

All contracts are verified on Arbiscan for complete transparency.

**ETour Core Modules**
- [ETour_Core.sol](https://arbiscan.io/address/0x3C86Fd676574528321fd47d21658bCf066a38b76#code)
- [ETour_Matches.sol](https://arbiscan.io/address/0xfC3c8c7a3DC6E3a8025eAD0B1fb9e1347df30b6F#code)
- [ETour_Prizes.sol](https://arbiscan.io/address/0x48D4772B6273799Ece6bb7E41254F57e076a6eE3#code)
- [ETour_Raffle.sol](https://arbiscan.io/address/0xfA1B58c9AE68d29EF0aC239dAAdd13a149cb96f8#code)
- [ETour_Escalation.sol](https://arbiscan.io/address/0x59Cc2cB8FD70b9407a06082d976C7fa5eCC29178#code)

**Game Contracts**
- [TicTacChain.sol](https://arbiscan.io/address/0x89464650B9987994222aE227303cd51dBC2d89B0#code)
- [ChessOnChain.sol](https://arbiscan.io/address/0x81bb603C84aFE5817d85Fe5D3fd1Dcf606Ff566D#code)
- [ConnectFourOnChain.sol](https://arbiscan.io/address/0x2036db40a00258cAF033049EBc2d7961C67Dfa68#code)

**Game-Specific Modules**
- [ChessRules.sol](https://arbiscan.io/address/0x2C48FFB461Cb603351FC903F582329eECf05BF33#code)