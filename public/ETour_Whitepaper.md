# Tournament Infrastructure for Skill-Based Competition

---

## Abstract

ETour is tournament infrastructure on the blockchain.

Every move is a transaction. Every outcome is immutable.

Developers inherit this infrastructure by implementing a simple game contract. Players connect their wallets and compete.

ETour handles matchmaking, brackets, timeouts, prize distribution, and more...

**No servers. No admins. ETH in. ETH out.**

---

This whitepaper explains how ETour makes trustless competition possible.

**It's intended for those who want to understand not just what ETour does but why it was built this way.**

---

# Table of Contents

[1. The Philosophy of ETour](#1-the-philosophy-of-etour)

[2. The Trust Problem](#2-the-turst-problem)

[3. The Three-Game Demo](#3-the-three-game-demo)

[4. The Lifecycle of Tournaments](#4-the-lifecycle-of-tournaments)

[5. The Gas Problem](#5-the-gas-problem)

[6. The Economics of Fair Play](#6-the-economics-of-fair-play)

[7. The Griefing Problem](#7-the-grefing-problem)

[8. The Bot Problem](#8-the-bot-problem)

[9. The Future of Competition](#9-the-future-of-competition)

---

## 1. The Philosophy of ETour

### The Failed Promise of Web3 Gaming

Web3 gaming has become synonymous with speculation, ponzi schemes, and "play-to-earn" models that **always** collapse. 

The focus shifted from creating fun games to engineering complex tokenomics. 

Players became investors, games became financial instruments, and fun became secondary to ROI calculations.

### What Players Actually Want

Competitive players have simple desires that haven't changed since the dawn of gaming:

- **Fair matches** where skill determines outcomes
- **Real stakes** that make victory meaningful
- **Instant resolution** with no delays

---

Adding a Web3 layer to games is counterproductive unless it delivers on those core needs first **AND adds value that wouldn't be possible without blockchain.**

---

### The ETour Thesis

ETour inverts the typical Web3 gaming approach:

##### Traditional Web3 Gaming
> Here's our token/coin/scheme. You must learn about its tokenomics, governance, and yield farming. 
Oh, you there's also a game in there somewhere.

##### ETour
> Play games you already know over ETH stakes. 
The winner takes the pot.

---

## 2. The Turst Problem

### Centralized Gaming's Hidden Failures

Every online game requires trusting multiple parties:

- **The server** not to manipulate game state
- **The operator** not to freeze your funds
- **Payment processors** not to reverse transactions
- **The company** not to shut down tomorrow

Most of the time, this trust is justified. 

But when real money is involved, **"most of the time" isn't good enough.**

### Why Blockchain?

The blockchain provides three irreplaceable properties for competitive gaming:

**Transparency** — Every game state, every move, every outcome is visible on-chain. Not just verifiable, **actually traceable.** 
Anyone can reconstruct any game from transaction history.

**Immutability** — Once a move is made, it cannot be changed. Once a winner is determined, it cannot be overridden. Once prizes are distributed, they cannot be clawed back.

**Autonomy** — No servers to maintain. No admins to trust. No company to depend on. 

These aren't "extra features". These are properties we inherited by building on blockchain. 

**ETour runs itself forever according to its code.**


---

## 3. The Three-Game Demo

Not every game belongs on ETour. At least no yet.

We chose games that naturally align with blockchain's current constraints while providing compelling competition. 

Each game had to meet strict criteria:

- **Perfect information** — All players see complete game state
- **Turn-based** — Clear boundaries for blockchain transactions
- **Deterministic** — Same moves always produce same outcomes
- **Culturally universal** — Rules known worldwide

These criteria eliminate entire categories of games. Poker requires hidden cards. Real-time games can't wait for block confirmation. Complex simulations exceed gas limits. But within these constraints, several classic games fit perfectly.  

---

#### A) TicTacToe — The Gateway

**Entry: 0.001 ETH**

> But TicTacToe is solved, perfect play always draws. 

**That's exactly why we chose it.**

TicTacToe serves as ETour's tutorial. 

New players can learn the platform mechanics with minimal risk. 

The high draw rate demonstrates our refund system: when both players draw, they split the prize pool minus a small protocol fee. 

It's training wheels for trustless competition.

But more importantly, TicTacToe proves a point: **even the simplest game becomes interesting with real stakes.** 

That moment when you realize your opponent might not play perfectly. That they might crack under pressure. **That's when tic-tac-toe transforms from child's game to psychological battle.**

--- 

#### B) Chess — The Flagship

**Entry: 0.01 — 0.1 ETH**

Chess needs no introduction. It's the ultimate test of strategic thinking, played by millions worldwide.

We implemented complete chess rules — castling, en passant, pawn promotion, fifty-move rule, threefold repetition. 

Fully on-chain. Not because we **had** to, but because players deserve respect.

**If you're going to play chess for real stakes, then you deserve real chess.**

---

#### C) Connect Four — The Dark Horse

**Entry: 0.001 — 0.01 ETH**

Connect Four occupies the sweet spot. 

It's more complex than tic-tac-toe, faster than chess, but still familiar to everyone.

We added Connect Four because variety matters. Some days you want the intense strategic depth of chess. Other days you want quick tactical skirmishes.

**Connect Four delivers satisfaction in five-minute bursts.**

---

### Why Not Battleship?

We initially planned to include Battleship. It's beloved, strategic, and everyone knows the rules. 

But Battleship requires hidden information...

To implement Battleship would require either:
- Commit-reveal schemes that confuse players
or
- Off-chain logic that defeat the purpose of trustless competition
 
I.e, ship positions must remain secret until revealed **but blockchain's fundamental nature is transparency.**

So rather than compromising our principles, we rejected Battleship for now.

---

## 4. The Lifecycle of Tournaments 

ETour uses single-elimination brackets. It's the simplest, most exciting format that a 4 year-old can understand.

Tournament tiers come in any size:

- **2 players** — Quick heads-up matches
- **4 players** — Mini-tournaments with semifinals
- **8 players** — Full bracket experience
- **16 players** — Extended competition for serious players
- **...+**

### A) Enrollment

Players join by paying the entry fee. The moment your ETH arrives, you're enrolled. No forms, no accounts, no waiting for approval. The tournament waits for enough players or until the enrollment window expires.

### B) Matchmaking
When a tournament begins, players are paired into matches. Round 0 starts immediately. In an 8-player tournament, four matches begin simultaneously. Winners advance round by round until the finals.

### C) Victory
The tournament champion takes everything. No second place, no consolation prizes. 

This isn't about participation.  **It's about winning.**

### D) When Games Draw

Some games can end in draws. In chess, perpetual check or insufficient material. In tic-tac-toe, perfect play.

Regular draws eliminate both players — neither advances. This creates natural pressure to play for wins rather than safe draws.

But what if the finals draw? Both finalists split the prize pool equally. They've proven themselves equally matched and share the victory.

What if every match in a round draws? The tournament cannot continue. All remaining players split the prize pool equally. Rare, **but handled fairly.**

### E) Edge Cases and Elegance

Tournaments are messy. Players get eliminated asymmetrically. Odd numbers emerge from draw-heavy rounds.

ETour handles every scenario: odd advancement gives one player a walkover, orphaned winners automatically advance, and incomplete brackets consolidate remaining players.

These aren't patches or hacks. **They're deliberate design decisions ensuring tournaments always resolve fairly.**

---

## 5. The Gas Problem

Every action on ETour costs gas that's paid for by the player. 

On Arbitrum, these costs are minimal:

- **Enrollment:** ~$0.03 per tournament entry
- **Moves:** ~$0.01 per move
- **Claims:** ~$0.03 per victory claim

These fees are negligible compared to entry fees.

---

## 6. The Economics of Fair Play

Every entry fee is split three ways:

- **90%** — to the tournament winner
- **7.5%** — to ETour's creator
- **2.5%** — to the contract subsidy pool

These percentages are hardcoded and unchangeable. No governance votes, no admin adjustments. The economics are transparent and permanent.

### Why This Breakdown

**The winner gets 90%** because that's fair. You put in skill, time, and money. You win, you get paid. Straightforward.

**7.5% goes to ETour's creator** as profit for building and operating the platform, including hosting the frontend. This is honest revenue for honest work.

**2.5% accumulates in the contract** until it hits game-specific thresholds, keeping the system self-sustaining. Any excess gets raffled back to active players as a way of giving back to the community.

That's it. You always know exactly where your entry fee goes.

### ETour is Anti-Token

ETour will never have a token. Not because we couldn't create one, but because tokens corrupt competitive gaming. 

With a token, players become investors, competition becomes secondary to price action, and complexity obscures the product. 

Without a token, players remain players, competition is the only focus, and simplicity enhances the product.

**ETH in, ETH out. Nothing more needed.**

### Sustainable by Design

ETour doesn't need token sales, venture funding, or financial engineering to survive. 

As long as people want to compete, ETour generates revenue. 

**ETour is not dependent on speculation.**

---

## 7. The Grefing Problem

### Solving Stalls Without Admins

Every competitive system faces the same problem: losing players stalling to avoid defeat. In chess, letting the clock run. In poker, tanking every decision. Online, disconnecting and hoping opponents quit.

Traditional solutions require human intervention — moderators, support tickets, manual reviews. 

**These introduce bias that goes against what Web3 stands for.**

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

## 8. The Bot Problem

Bots will always be a problem in online competitive gaming.

Instead of falsely pretending that ETour solves the bot problem, we chose to deliver a solution that focuses on solving other fundamental issues with on-chain gaming: griefing, storage, trustless settlement, and more.

### Zero-Trust. Zero Overpromises

Detecting bots is a never ending cat-and-mouse game:
• **Let's be real** - Billion dollar projects with dedicated anti-cheat departments cannot guarantee 100% bot protection.
• **The resulting risk** — Because money is involved, bots can, and probably will, exist on etour.games.
• **Focus on Infrastructure** — This reality does not take away from the fact that etour.games delivers a 100% on-chain system for playing chess over ETH stakes without a centralized authority.

### ETour's Value Remains Unchanged

ETour remains a robust, zero-trust tool for competitive stakes. If you can verify your opponent, such as playing with a friend or within a community, then ETour still provides a perfect, tamper-proof decentralized gameplay over ETH stakes.

---

## 9. The Future of Competition

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

# Think you're good? Prove it.

---

### The Appendix 

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