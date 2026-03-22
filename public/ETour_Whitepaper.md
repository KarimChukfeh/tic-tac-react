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
  • [The Failed Promise of Web3 Gaming](#the-failed-promise-of-web3-gaming)
  • [What Players Actually Want](#what-players-actually-want)
  • [The ETour Thesis](#the-etour-thesis)

[2. The Problems with Competitive Gaming](#2-the-problems-with-competitive-gaming)
  • [The Trust Problem](#the-trust-problem)
  • [The Griefing Problem](#the-griefing-problem)
  • [The Bot Problem](#the-bot-problem)
  • [The Cost Problem](#the-cost-problem)
  • [Where ETour Shines](#where-etour-shines)
  • [Where ETour Falls Short (For Now)](#where-etour-falls-short-for-now)


[3. How ETour Works](#3-how-etour-works)
  • [The Lifecycle of Tournaments](#the-lifecycle-of-tournaments)
  • [The Economics of Fair Play](#the-economics-of-fair-play)
  • [Solving Stalls Without Admins](#solving-stalls-without-admins-1)

[4. The Three-Game Demo](#4-the-three-game-demo)
  • [TicTacToe — The Gateway](#a-tictactoe--the-gateway)
  • [Chess — The Flagship](#b-chess--the-flagship)
  • [Connect Four — The Dark Horse](#c-connect-four--the-dark-horse)

[5. The Future of Competition](#5-the-future-of-competition)
  • [What We've Built](#what-weve-built)
  • [ETour as Infrastructure](#etour-as-infrastructure)
  • [The Broader Vision](#the-broader-vision)

[6. Conclusion](#6-an-invitation)
[7. Appendix](#7-the-appendix)


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
> Here's our token/coin/scheme. You must learn about its tokenomics, governance, and yield farming. There's also a game somewhere.

##### ETour
> Play games you already know over ETH stakes. The winner takes the pot.


---

## 2. The Problems with Competitive Gaming

### The Trust Problem

#### Centralized Gaming's Hidden Failures

Every online game requires trusting multiple parties:

- **The server** not to manipulate game state
- **The operator** not to freeze your funds
- **Payment processors** not to reverse transactions
- **The company** not to shut down tomorrow

Most of the time, this trust is justified. 

But when real money is involved, **"most of the time" isn't good enough.**

#### Why Blockchain?

The blockchain provides three irreplaceable properties for competitive gaming:

**Transparency** — Every game state, every move, every outcome is visible on-chain. Not just verifiable, **actually traceable.** 
Anyone can reconstruct any game from transaction history.

**Immutability** — Once a move is made, it cannot be changed. Once a winner is determined, it cannot be overridden. Once prizes are distributed, they cannot be clawed back.

**Autonomy** — No servers to maintain. No admins to trust. No company to depend on. 

These aren't "extra features". These are properties we inherited by building on blockchain. 

**ETour runs itself forever according to its code.**

---

### The Griefing Problem

#### Solving Stalls Without Admins

Every competitive system faces the same problem: losing players stalling to avoid defeat. In chess, letting the clock run. In poker, tanking every decision. Online, disconnecting and hoping opponents quit.

Traditional solutions require human intervention — moderators, support tickets, manual reviews.

**These introduce bias that goes against what Web3 stands for.**

#### Escalating Incentives

ETour solves stalling through economic incentives that escalate over time. The longer someone stalls, the more people can claim their position.

**For Enrollment Stalling:**

When tournaments don't fill naturally, two options emerge. First, enrolled players can force-start with whoever joined — three players in an 8-player tournament start a 3-player tournament, with the prize pool adjusting accordingly. If nobody acts, eventually anyone — even non-enrolled players — can claim the entire abandoned prize pool. **This is the nuclear option that ensures tournaments are never stuck forever.**

**For Match Stalling:**

When a player stops moving, escalation begins:

**Level 1:** Their opponent can claim victory by timeout. Simple and fair.

**Level 2:** Players already advanced to later rounds can eliminate both stalled players. Why should their tournament be held up by others' inaction?

**Level 3:** Anyone can replace both stalled players and take their spot in the tournament. Free entry to potentially win the entire prize pool.

#### Incentive Alignment

Notice how each escalation level benefits someone: opponents get free wins, advanced players get cleared paths, external observers get free tournament entry, and the protocol gets resolved states. The only party that doesn't benefit is the staller. This isn't punishment — it's game theory.

**ETour makes stalling costly and resolution profitable.**

#### Time as a Resource

Each player receives a time bank for their moves, plus increment per move. This isn't arbitrary pressure — it's resource management. Time becomes another strategic dimension. Run low on time and you must play faster, potentially making mistakes. But your opponent knows you're under pressure and might try to complicate positions. Time management becomes part of the game.

---

### The Bot Problem

Bots will always be a problem in online competitive gaming.

Instead of falsely pretending that ETour solves the bot problem, we chose to deliver a solution that focuses on solving other fundamental issues with on-chain gaming: griefing, storage, trustless settlement, and more.

#### Zero-Trust. Zero Overpromises

Detecting bots is a never ending cat-and-mouse game:
• **Let's be real** - Billion dollar projects with dedicated anti-cheat departments cannot guarantee 100% bot protection.
• **The resulting risk** — Because money is involved, bots can, and probably will, exist on etour.games.
• **Focus on Infrastructure** — This reality does not take away from the fact that etour.games delivers a 100% on-chain system for playing chess over ETH stakes without a centralized authority.

#### ETour's Value Remains Unchanged

ETour remains a robust, zero-trust tool for competitive stakes. If you can verify your opponent, such as playing with a friend or within a community, then ETour still provides a perfect, tamper-proof decentralized gameplay over ETH stakes.

---

### The Cost Problem

Every action on ETour costs gas that's paid for by the player.

On Arbitrum, these costs are minimal:

- **Enrollment:** ~$0.03 per tournament entry
- **Moves:** ~$0.01 per move
- **Claims:** ~$0.03 per victory claim

These fees are negligible compared to entry fees.

#### The Deeper Issue With Cost

Traditional Web3 games are built without deliberate storage design. 

Every move, every match, every outcome gets written to contract storage indiscriminately. 

This accumulates, **fast**, because Ethereum charges gas proportional to storage reads and writes. 

The cost of a single move on the billionth match can be disproportionately more expensive than the cost of the very first move.

The more people play, the more expensive it gets. The more expensive it gets, the fewer people play. The sooner the game collapses.

This isn't a gas problem. It's a design problem.

**ETour was built to avoid this trap from day one.**

---

#### Where ETour Shines
ETour is at its best when players already know each other.

Settling a score with a friend. Running a weekly tournament within a community. 

Competing in a group where everyone can vouch that there's a real human on the other side.

In these contexts, ETour delivers exactly what's missing from every other option 

> Trustless stakes with guaranteed resolution. No one holds your money. No one can rig the bracket. No one can walk away without consequence.

--- 


#### Where ETour Falls Short (For Now)
Open matchmaking against strangers is a different story.

Without skill-based pairing, a first-time player might face a veteran. Without solved anti-bot measures, there's no guarantee your anonymous opponent isn't an engine. These are real limitations, not future roadmap items disguised as features.

> We'd rather be honest about scope than pretend ETour is something it isn't.


---


## 3. How ETour Works

### The Lifecycle of Tournaments

ETour uses single-elimination brackets. It's the simplest, most exciting format that a 4 year-old can understand.

Tournament tiers come in any size:

- **2 players** — Quick heads-up matches
- **4 players** — Mini-tournaments with semifinals
- **8 players** — Full bracket experience
- **16 players** — Extended competition for serious players
- **...+**

#### Enrollment

Players join by paying the entry fee. The moment your ETH arrives, you're enrolled. No forms, no accounts, no waiting for approval. The tournament waits for enough players or until the enrollment window expires.

#### Matchmaking
When a tournament begins, players are paired into matches. Round 0 starts immediately. In an 8-player tournament, four matches begin simultaneously. Winners advance round by round until the finals.

#### Victory
The tournament champion takes everything. No second place, no consolation prizes.

This isn't about participation.  **It's about winning.**

#### Draws

Some games can end in draws. In chess, perpetual check or insufficient material. In tic-tac-toe, perfect play.

Regular draws eliminate both players — neither advances. This creates natural pressure to play for wins rather than safe draws.

But what if the finals draw? Both finalists split the prize pool equally. They've proven themselves equally matched and share the victory.

What if every match in a round draws? The tournament cannot continue. All remaining players split the prize pool equally. Rare, **but handled fairly.**

#### Other Edge Cases

Tournaments are messy. 

Players get eliminated asymmetrically. Odd numbers emerge from draw-heavy rounds.

ETour handles every scenario: odd advancement gives one player a walkover, orphaned winners automatically advance, and incomplete brackets consolidate remaining players.

These aren't patches or hacks. 

**They're deliberate design decisions ensuring tournaments always resolve fairly.**

---

### The Economics of Fair Play

Every entry fee is split three ways:

- **90%** — to the tournament winner
- **7.5%** — to ETour's creator
- **2.5%** — to the contract subsidy pool

These percentages are hardcoded and unchangeable. No governance votes, no admin adjustments. The economics are transparent and permanent.

#### Why This Breakdown

**The winner gets 90%** because that's fair. You put in skill, time, and money. You win, you get paid. Straightforward.

**7.5% goes to ETour's creator** as profit for building and operating the platform, including hosting the frontend. This is honest revenue for honest work.

**2.5% accumulates in the contract** until it hits game-specific thresholds, keeping the system self-sustaining. Any excess gets raffled back to active players as a way of giving back to the community.

That's it. You always know exactly where your entry fee goes.

#### ETour is Anti-Token

ETour will never have a token. Not because we couldn't create one, but because tokens corrupt competitive gaming.

With a token, players become investors, competition becomes secondary to price action, and complexity obscures the product.

Without a token, players remain players, competition is the only focus, and simplicity enhances the product.

**ETH in, ETH out. Nothing more needed.**

#### Sustainable by Design

ETour doesn't need token sales, venture funding, or financial engineering to survive.

As long as people want to compete, ETour generates enough revenue to run itself.

**Dynamic Storage is Temproray**

During a tournament: move data, game state, and round progress live in contract storage **only as long as they're needed.**

Once a tournament concludes, that data is reset and recycled for the next round of the same tournament. 

The storage slot gets reused rather than abandoned. 

**This means the gas cost of making a move in round one of the millionth tournament is identical to the gas cost of making a move in round one of the very first tournament.**

> What about stats?

**Historical data is cold storage.**

Stats, match history, and outcomes are append-only/read-only records. 

They grow indefinitely, and that's fine. But they are never used in active tournament logic. 

This means that the billionth ETour game move cost the same as the first move. 

The history exists purely for retrieval, with no computation performed on it during live gameplay.

This separation means ETour's economics hold at any scale.

The protocol doesn't get more expensive as adoption it grows.

#### Community Raffles

ETour contracts keep 2.5% of every entry fee to ensure the protocol remains healthy and operational.

Rather than letting this ETH accumulate indefinitely, ETour redistributes it back to the community through periodic raffle events.

ETour rewards a random enrolled player with accumulated ETH

This is part of ETour's commitment to **sustainable & fair** distribution of funds.

---

## 4. The Three-Game Demo

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

## 5. The Future of Competition

### What We've Built

ETour demonstrates that blockchain gaming doesn't need complex tokenomics or speculative mechanisms. By focusing on pure competition with transparent rules and guaranteed payouts, we've created what competitive players actually want: games with real stakes and fair outcomes.

### ETour as Infrastructure

ETour separates universal tournament logic from game-specific rules. Game contracts only need to implement move validation, win detection, and state management. Everything else — brackets, matchmaking, timeouts, escalation, prizes, leaderboards — is inherited.

This means any developer can build a game on ETour by implementing roughly a dozen functions. Focus on making your game fun and strategic. Let ETour handle the competitive infrastructure.

### The Broader Vision

ETour proves that blockchain applications can be simple, useful, and sustainable without tokens or speculation. This model — fee-based services with transparent economics — represents blockchain's true potential: not as financial engineering, but as trust infrastructure for human coordination.

As more games build on the protocol, network effects emerge: shared player bases, unified leaderboards, cross-game achievements. But growth isn't the goal — sustainability is. ETour succeeds if it's still running unchanged in ten years, facilitating fair competition for whoever wants to play.

## 6. An Invitation

**If you're a player** — Pick a game and compete. Test yourself against others with real stakes on the line.

**If you're a developer** — Build your game on ETour. Inherit our infrastructure and focus on what makes your game special.

**If you're a skeptic** — Read the code. Verify the claims. Find flaws.

---

## 7. The Appendix 

**ETour Core Modules**
- [ETour_Core.sol](https://arbiscan.io/address/0xc39985E520bDcB6c551591a0afE9B76b4B4EEED4#code)
- [ETour_Matches.sol](https://arbiscan.io/address/0xa6e29A8C842AC39416be48Ca26F5274b87FB2118#code)
- [ETour_Prizes.sol](https://arbiscan.io/address/0x93A4524571AEBCf81e443D8707E8DbDB6Db3C73C#code)
- [ETour_Raffle.sol](https://arbiscan.io/address/0xd64CC3B13f71E1D357F83F8A9433D0B31fa28973#code)
- [ETour_Escalation.sol](https://arbiscan.io/address/0x9B59380DDA483F21B6c0E8E778e3ACF47D9E5462#code)

**Game Contracts**
- [TicTacChain.sol](https://arbiscan.io/address/0x3544bf202b7C1A9111a5F65eaAB6E79E61eec4cA#code)
- [ChessOnChain.sol](https://arbiscan.io/address/0xDD730f00973389DfB1e669c8E024166C96dc1a7d#code)
- [ConnectFourOnChain.sol](https://arbiscan.io/address/0xd3DFcFcCC8248946731efe7091a59B1E12353ea1#code)

**Game-Specific Modules**
- [ChessRules.sol](https://arbiscan.io/address/0x1CB99D88175f015fB1299B359AFD14f229267921#code)