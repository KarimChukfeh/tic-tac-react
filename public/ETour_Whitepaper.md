### Tournament Infrastructure for Skill-Based Competition

---

## Abstract

ETour is competitive gaming infrastructure on the blockchain. 

Players compete in skill-based tournaments for ETH prizes with guaranteed fair outcomes and instant payouts.

Every move is a transaction. Every outcome is immutable. The smart contract handles matchmaking, brackets, timeouts, and prize distribution. No servers, no admins, no possibility of manipulation.

Developers inherit this infrastructure by implementing a simple game contract. Players connect their wallets and compete.

**ETH in, ETH out. Pure competition, pure meritocracy.**

---

This whitepaper explains ETour's philosophy and how it makes trustless competition possible.

**It's intended for those who want to understand not just what ETour does but why it was built this way.**

---

## 1. Philosophy: Why ETour Exists

### The Failed Promise of Web3 Gaming

Web3 gaming has become synonymous with speculation, ponzi schemes, and "play-to-earn" models that inevitably collapse. The focus shifted from creating compelling games to engineering complex tokenomics. Players became investors, games became financial instruments, and fun became secondary to ROI calculations.

This isn't what blockchain gaming was supposed to be.

### What Players Actually Want

Competitive players have simple desires that haven't changed since the dawn of gaming:

- **Fair matches** where skill determines outcomes
- **Real stakes** that make victory meaningful
- **Instant resolution** with no payment delays
- **Transparent rules** that apply equally to everyone

These desires exist independently of technology. Chess players in coffee shops betting $20 want the same things as esports professionals competing for millions. The question isn't whether blockchain adds value to competition, it's whether we can deliver that value without drowning players in complexity.

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

## 2. The Problem with Trust

### Centralized Gaming's Hidden Failures

Every online game requires trusting multiple parties:

- **The server** not to manipulate game state
- **The operator** not to freeze your funds
- **Payment processors** not to reverse transactions
- **The company** not to shut down tomorrow

Most of the time, this trust is justified. But when real money is involved, "most of the time" isn't good enough.

### The Payout Problem

Traditional gaming platforms hold player funds in custody. Withdrawals require:
- Identity verification
- Waiting periods
- Withdrawal fees
- Geographic restrictions
- Minimum amounts

Players routinely report frozen funds, delayed payments, and arbitrary account closures. Even legitimate platforms can fail, taking player balances with them.

ETour never holds player funds. Entry fees go directly to smart contract prize pools. Winners receive ETH instantly upon victory. No withdrawals, no custody, no trust required.

---

## 3. The Three Games That Define ETour

### The Selection Criteria

Not every game belongs on blockchain. We chose games that naturally align with blockchain's constraints while providing compelling competition. Each game had to meet strict criteria:

- **Perfect information** — All players see complete game state
- **Turn-based** — Clear boundaries for blockchain transactions
- **Deterministic** — Same moves always produce same outcomes
- **Culturally universal** — Rules known worldwide
- **Strategically rich** — Skill clearly determines winners

### Tic-Tac-Toe: The Gateway

**Entry: 0.001 ETH**

Everyone dismisses tic-tac-toe as "solved": perfect play always draws. **That's exactly why we chose it.**

Tic-tac-toe serves as ETour's tutorial. New players can learn the platform mechanics with minimal risk. The high draw rate demonstrates our refund system: when both players draw, they split the prize pool minus a small protocol fee. It's training wheels for trustless competition.

But more importantly, tic-tac-toe proves a point: even the simplest game becomes interesting with real stakes. 

That moment when you realize your opponent might not play perfectly; who might crack under pressure. 

**That's when tic-tac-toe transforms from child's game to psychological battle.**

### Chess: The Main Event

**Entry: 0.01 - 0.1 ETH**

Chess needs no introduction. It's the ultimate test of strategic thinking, played by millions worldwide. 

We implemented complete chess rules: castling, en passant, pawn promotion, fifty-move rule, threefold repetition, fully **on-chain,** 

Not because we had to, but because chess players deserve respect. 

**If you're going to play chess for real stakes, then you deserve real chess.**

### Connect Four: The Dark Horse

**Entry: 0.001 - 0.01 ETH**

Connect Four occupies the sweet spot. It's more complex than tic-tac-toe, faster than chess, but still familiar to everyone. 

The vertical drop mechanic creates unique tactical patterns. It's a game where beginners can get lucky but experts dominate over time.

We added Connect Four because variety matters. Some days you want the intense strategic depth of chess. Other days you want quick tactical skirmishes. 

**Connect Four delivers satisfaction in five-minute bursts.**

### Why Not Battleship?

We initially planned to include Battleship. It's beloved, strategic, and everyone knows the rules. But Battleship requires hidden information. 

**Ship positions must remain secret until revealed.**

Blockchain's fundamental nature is transparency. Every piece of data on-chain is visible to everyone. 

To implement Battleship would require either:

1. **Commit-reveal schemes** — Complex cryptographic proofs that confuse players
2. **Off-chain components** — Defeating the purpose of trustless competition

Rather than compromise our principles, we rejected Battleship. 

This decision embodies ETour's philosophy:

> **Work within blockchain's constraints rather than fighting them.**

---

## 4. How Competition Works

### Tournament Structure

ETour uses single-elimination tournaments, i.e the simplest, most exciting format. 

Winners advance, losers go home. No complex Swiss pairings, no round-robin calculations. Pure knockout competition.

Tournaments come in any size:

- **2 players** — Quick heads-up matches
- **4 players** — Mini-tournaments with semifinals
- **8 players** — Full bracket experience
- **16 players** — Extended competition for serious players

Each tier operates multiple concurrent instances. While you're competing in one tournament, others are enrolling, playing, completing. The system never sleeps.

### The Life of a Tournament

**Enrollment**
Players join by paying the entry fee. The moment your ETH arrives, you're enrolled. No forms, no accounts, no waiting for approval. The tournament waits for enough players or until the enrollment window expires.

**The Bracket**
When a tournament begins, players are paired into matches. Round 0 starts immediately. In an 8-player tournament, four matches begin 
simultaneously. 

Winners advance to Round 1, then Round 2, etc, until the finals.

**Victory**
The tournament champion takes everything. No second place or consolation prizes. 

This isn't about participation, **it's about winning.**

### When Games Draw

Some games can end in draws. In chess, perpetual check or insufficient material. In tic-tac-toe, perfect play.

Regular draws eliminate both players so neither player advances. This creates natural pressure to play for wins rather than safe draws.

##### But what if the finals draw? 

Both finalists split the prize pool equally. They've proven themselves equally matched and share the victory.

What if every match in a round draws? The tournament cannot continue. All remaining players split the prize pool equally. 

Rare, **but handled fairly.**

### Edge Cases and Elegance

Tournaments are messy. Players get eliminated asymmetrically. Odd numbers emerge from draw-heavy rounds. 

##### ETour handles every scenario

- **Odd advancement** — One player randomly selected for walkover
- **Orphaned winners** — Automatically advance to next round
- **Incomplete brackets** — Consolidate remaining players

These aren't patches or hacks. 

**They're deliberate design decisions ensuring tournaments always resolve fairly.**

---

## 5. The Economics of Fair Play

### The Fee Split

Every entry fee divides three ways:

- **90%** — to the tournament winner
- **2.5%** — to subsidize the contract
- **7.5%** — to reward ETour's creator

These percentages are hardcoded and unchangeable. 

**No governance votes, no admin adjustments.**
**The economics are transparent and permanent.**

### Why This Breakdown

**The winner gets 90%** — because that's fair. 

When you compete, you're putting in skill, time, and money. You win, you get paid. It's that straightforward.
The remaining 10% is split wo ways:

**7.5% percent goes to me** - as the creator and operator of each tournament. 
This is my profit. My chosen cut for building ETour. I'm also hosting the frontend myself, which is part of what that seven point five percent funds. 

**The other 2.5% accumalates in the contract** until it hits game-specific thresholds. 
This is necessary to keep the game itselft self-sustaining. Any excess gets raffled back to active players as a way of giving back to the community.

**There's no hidden costs. You know exactly where your entry fee goes.**

### Sustainable Economics

At just 1,000 daily players averaging 0.01 ETH entries, ETour generates enough revenue to operate indefinitely. No token sales needed. No venture funding required. No complex financial engineering.

This sustainability matters because it ensures ETour's permanence. We're not racing to find product-market fit before funding runs out. We're not dependent on token prices or speculation. As long as people want to compete, ETour survives.

### The Anti-Token

ETour will never have a token. Not because we couldn't create one, but because tokens corrupt competitive gaming.

With a token:
- Players become investors
- Competition becomes secondary to price action
- Early adopters extract value from later players
- Governance creates politics
- Complexity obscures the product

Without a token:
- Players remain players
- Competition is the only focus
- No one gets advantaged by arriving early
- No governance drama
- Simplicity enhances the product

ETH in, ETH out. Nothing more needed.

---

## 6. Solving the Stalling Problem

### The Universal Griefing Vector

Every competitive system faces the same problem: losing players stalling to avoid defeat. In chess, letting the clock run. In poker, tanking every decision. Online, disconnecting and hoping opponents quit.

Traditional solutions require human intervention: moderators, support tickets, manual reviews. 

**These introduce bias that goes against what Web3 stands for.**

### Escalating Incentives

ETour solves stalling through economic incentives that escalate over time. The longer someone stalls, the more people can claim their position.

**For Enrollment Stalling:**

When tournaments don't fill naturally, two options emerge:

First, enrolled players can force-start with whoever joined. Three players in an 8-player tournament? Start a 3-player tournament. The prize pool adjusts accordingly.

If nobody acts, eventually anyone **- even non-enrolled players -** can claim the entire abandoned prize pool. 

**This is the nuclear option that ensures tournaments are never stuck forever.**

**For Match Stalling:**

When a player stops moving, escalation begins:

Level 1: Their opponent can claim victory by timeout. Simple and fair.

Level 2: Players already advanced to later rounds can eliminate both stalled players. Why should their tournament be held up by others' inaction?

Level 3: Anyone can replace both stalled players and take their spot in the tournament. Free entry to potentially win the entire prize pool.

### Incentive Alignment

Notice how each escalation level benefits someone:

- Opponents benefit from free wins
- Advanced players benefit from cleared paths
- External observers benefit from free tournament entry
- The protocol benefits from resolved states

The only party that doesn't benefit is the staller. This isn't punishment, it's game theory. 

**ETour makes stalling costly and resolution profitable.**

### Time as a Resource

Each player receives a time bank for their moves, plus increment per move (like professional chess). This isn't arbitrary pressure—it's resource management. Time becomes another strategic dimension.

Run low on time? You must play faster, potentially making mistakes. But your opponent knows you're under pressure and might try to complicate positions. Time management becomes part of the game.

---

## 7. Technical Architecture

### The Modular Approach

ETour separates universal tournament logic from game-specific rules. Think of it like a gaming console: the console handles controllers, display, and system functions while game cartridges provide unique experiences.

The ETour modules handle:
- Tournament enrollment and brackets
- Match creation and advancement
- Timeout and escalation logic
- Prize calculation and distribution
- Statistics and leaderboards

Game contracts only implement:
- Move validation
- Win/draw detection
- Game state management

This separation means new games inherit battle-tested tournament infrastructure. Developers focus on what makes their game unique rather than reimplementing brackets and payouts.

### Why Blockchain?

Blockchain provides three irreplaceable properties:

**Transparency**
Every game state, every move, every outcome is visible on-chain. Not just verifiable—actually visible. Anyone can reconstruct any game from transaction history.

**Immutability**
Once a move is made, it cannot be changed. Once a winner is determined, it cannot be overridden. Once prizes are distributed, they cannot be clawed back.

**Autonomy**
No servers to maintain. No admins to trust. No company to depend on. ETour runs itself according to its code, forever.

These aren't features we built—they're properties we inherited by building on blockchain.

### Gas Economics

Every action costs gas: enrolling, moving, claiming victory. On Arbitrum, these costs are minimal:

- Enrollment: ~$0.05
- Move: ~$0.02
- Claim: ~$0.04

Negligible compared to entry fees, but enough to prevent spam. Players naturally optimize their moves, adding another strategic layer.

---

## 8. Building on ETour

### For Developers

Building a game on ETour requires implementing roughly a dozen functions. Define how pieces move, how winners are determined, how draws are detected. ETour handles everything else.

You inherit:
- Complete tournament system
- Anti-griefing mechanisms
- Prize distribution
- Player statistics
- Permanent leaderboards
- Security guarantees

Focus on making your game fun and strategic. Let ETour handle the competitive infrastructure.

### For Players

Playing on ETour requires only a wallet and ETH. No signup, no KYC, no email verification. Your wallet is your identity, your signature is your move.

Connect to any game's frontend or interact directly with contracts. The experience remains identical—frontends are just convenience, not requirements.

### For Observers

Every tournament is public. Watch matches unfold in real-time. Study historical games. Verify outcomes yourself.

ETour isn't just transparent in principle—it's transparent in practice. Every piece of data that determines outcomes is on-chain and queryable.

---

## 9. Trust Through Transparency

### What the Owner Can Do

The owner address can withdraw accumulated operational fees. That's it.

### What the Owner Cannot Do

The owner cannot:
- Change game rules
- Override match results
- Freeze player funds
- Modify fee percentages
- Pause tournaments
- Add special privileges
- Grant advantages

These aren't policy decisions—they're architectural impossibilities. The code doesn't contain functions for these actions.

### Verification Over Trust

All ETour contracts are verified and open source. Read the code yourself. Confirm our claims. Find bugs and report them.

We don't ask for trust because trust isn't necessary. The code is the specification, the implementation, and the guarantee.

### Deterministic Resolution

Given identical inputs, ETour always produces identical outputs. No randomness in game outcomes (only in tiebreakers). No external dependencies. No oracle risks.

This determinism enables complete verification. Anyone can replay any tournament from events and confirm the results.

---

## 10. The Future of Competition

### What We've Built

ETour demonstrates that blockchain gaming doesn't need complex tokenomics or speculative mechanisms. By focusing on pure competition with transparent rules and guaranteed payouts, we've created what competitive players actually want.

No tokens to pump. No yields to farm. No governance to navigate. Just games with real stakes and fair outcomes.

### What Comes Next

ETour is infrastructure, not a destination. As more games build on the protocol, network effects emerge:

- Shared player base across all games
- Unified leaderboards and statistics
- Cross-game tournaments and achievements
- Emerging competitive meta-games

But growth isn't the goal—sustainability is. ETour succeeds if it's still running unchanged in ten years, facilitating fair competition for whoever wants to play.

### The Broader Implications

ETour proves that blockchain applications can be simple, useful, and sustainable without tokens or speculation. This model—fee-based services with transparent economics—could reshape how we think about blockchain products.

Imagine:
- Decentralized marketplaces taking transaction fees
- Content platforms sharing revenue with creators
- Prediction markets operating on commissions
- All without tokens, governance, or complexity

ETour is one example of blockchain's true potential: not as financial engineering, but as trust infrastructure for human coordination.

### An Invitation

If you're a player: Pick a game and compete. Test yourself against others with real stakes on the line.

If you're a developer: Build your game on ETour. Inherit our infrastructure and focus on what makes your game special.

If you're a skeptic: Read the code. Verify our claims. Try to find flaws.

ETour isn't asking for your backing. It just offers you a simple service. 

# Think you're good? Prove it.

---

### Contract Verification

All contracts are verified on Arbiscan for complete transparency.
