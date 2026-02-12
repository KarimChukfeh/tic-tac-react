# ETOUR
### Tournament Infrastructure for Skill-Based Competition

---

## Abstract

ETour is EVM freeware for on-chain competitive play.

Every move is a transaction. Every outcome is immutable. The smart contract handles matchmaking, brackets, timeouts, and prize distribution.

Developers inherit this infrastructure by implementing a simple abstract contract. Players connect and compete.

**ETH in, ETH out. No servers, no admins, no way to cheat.**

---

This whitepaper explains ETour's philosophy and how it makes trustless competition possible.

**It's for those who want to understand not just what ETour does but why it was built this way.**

---

<details>
<summary><strong>Table of Contents</strong></summary>

1. [Philosophy: Games First, Infrastructure Second](#1-philosophy-games-first-infrastructure-second)
   - [1.1 The Problem with Web3 Gaming](#11-the-problem-with-web3-gaming)
   - [1.2 What Players Actually Want](#12-what-players-actually-want)
   - [1.3 The ETour Approach](#13-the-etour-approach)

2. [The Three Flagship Games](#2-the-three-flagship-games)
   - [2.1 Selection Criteria](#21-selection-criteria)
   - [2.2 Eternal Tic-Tac-Toe](#22-eternal-tic-tac-toe)
   - [2.3 ChessOnChain](#23-chessonchain)
   - [2.4 Connect Four](#24-connect-four)
   - [2.5 Why Not Battleship?](#25-why-not-battleship)

3. [Protocol Architecture](#3-protocol-architecture)
   - [3.1 Modular Design](#31-modular-design)
   - [3.2 ETour_Base: The Foundation](#32-etour_base-the-foundation)
   - [3.3 How Games Use Modules](#33-how-games-use-modules)
   - [3.4 Game Implementation Requirements](#34-game-implementation-requirements)
   - [3.5 Shared Infrastructure Benefits](#35-shared-infrastructure-benefits)

4. [Tournament Mechanics](#4-tournament-mechanics)
   - [4.1 Tier System](#41-tier-system)
   - [4.2 Instance Management](#42-instance-management)
   - [4.3 Bracket Progression](#43-bracket-progression)
   - [4.4 Draw Handling](#44-draw-handling)
   - [4.5 Walkover and Consolidation Logic](#45-walkover-and-consolidation-logic)

5. [Economic Model](#5-economic-model)
   - [5.1 Fee Structure](#51-fee-structure)
   - [5.2 Prize Distribution](#52-prize-distribution)
   - [5.3 Self-Sustaining Operations](#53-self-sustaining-operations)
   - [5.4 No Token, No Speculation](#54-no-token-no-speculation)

6. [Anti-Griefing Systems](#6-anti-griefing-systems)
   - [6.1 The Stalling Problem](#61-the-stalling-problem)
   - [6.2 Enrollment Timeout Escalation](#62-enrollment-timeout-escalation)
   - [6.3 Match Timeout Escalation](#63-match-timeout-escalation)
   - [6.4 Economic Incentives for Resolution](#64-economic-incentives-for-resolution)

7. [Trust and Verification](#7-trust-and-verification)
   - [7.1 Fully On-Chain Execution](#71-fully-on-chain-execution)
   - [7.2 No Admin Override](#72-no-admin-override)
   - [7.3 Deterministic Outcomes](#73-deterministic-outcomes)
   - [7.4 Open Source Verification](#74-open-source-verification)

8. [RW3 Compliance](#8-rw3-compliance)
   - [8.1 The Five Principles](#81-the-five-principles)
   - [8.2 How ETour Meets Each Principle](#82-how-etour-meets-each-principle)

9. [Technical Overview](#9-technical-overview)
   - [9.1 Contract Structure](#91-contract-structure)
   - [9.2 Key Data Structures](#92-key-data-structures)
   - [9.3 Core Functions](#93-core-functions)
   - [9.4 Gas Optimization](#94-gas-optimization)

10. [Building on ETour](#10-building-on-etour)
    - [10.1 The Modular Approach](#101-the-modular-approach)
    - [10.2 What You Need to Implement](#102-what-you-need-to-implement)
    - [10.3 What You Get for Free](#103-what-you-get-for-free)
    - [10.4 Getting Started](#104-getting-started)

11. [Conclusion](#11-conclusion)

**Appendices:**
- [Appendix A: Economic Projections](#appendix-a-economic-projections)

</details>

---

## 1. Philosophy: Games First, Infrastructure Second

### 1.1 The Problem with Web3 Gaming

Web3 gaming has a credibility problem. The phrase "play and earn" has been used so many times by scams and failed tokenomics that it makes people skeptical.

**Players have learned that "earn" usually means "lose money slowly while enriching early adopters."**

Most Web3 gaming projects make the same mistake: they lead with blockchain technology and financial incentives rather than compelling gameplay. They're selling infrastructure, tokens, and economic mechanisms to people who just want to play games.

This approach fails because:

- **Players don't care about infrastructure** — They care about fair competition and real outcomes
- **"Earn" messaging attracts speculators, not gamers** — The community focuses on extraction rather than competition
- **Technical complexity creates barriers** — Explaining on-chain verification to someone who wants to play chess is backwards

### 1.2 What Players Actually Want

Competitive players want simple things:

1. **Fair games** — No hidden algorithms deciding outcomes
2. **Meaningful stakes** — Something real on the line
3. **Skill determines results** — Not luck, not who bought more tokens
4. **Instant resolution** — Win and get paid, no waiting periods

These desires exist independently of blockchain. Chess players have always wanted fair competition with meaningful stakes. The question is whether blockchain adds value to this experience without drowning the player in technical jargon.

### 1.3 The ETour Approach

ETour turns the usual Web3 gaming pitch on its head:

#### **Traditional Web3 Gaming**

> Here's our revolutionary blockchain protocol. It has tokenomics, staking mechanisms, and governance.<br>Oh, and you can play games on it.

#### **ETour**

> Here are classic games you already know.<br>Play for real ETH stakes. The better player claims the pot.

The blockchain infrastructure exists to serve the games, not the other way around. ETour Protocol is the engine under the hood that makes this competition possible, not the selling point.

**This whitepaper exists for those who want to look under the hood.** If you're a player who just wants to compete, the landing page tells you everything you need: pick a game, connect your wallet, prove you're good.

---

## 2. The Three Flagship Games

### 2.1 Selection Criteria

ETour's flagship games were chosen based on strict criteria that ensure full on-chain verifiability:

1. **Complete Information** — All game state must be visible to all players
2. **Deterministic Rules** — Same inputs always produce same outputs
3. **Discrete Turns** — Clear turn boundaries suitable for blockchain transaction timing
4. **Reasonable Complexity** — Game logic must fit within smart contract gas limits
5. **Cultural Recognition** — Games should be widely known, requiring no rule explanation

These criteria eliminate entire categories of games. Poker requires hidden cards. Real-time games can't wait for block confirmation. Complex simulations exceed gas limits. But within these constraints, several classic games fit perfectly.

### 2.2 Tic-Tac-Toe

**Entry Point: 0.001 ETH**

Tic-tac-toe serves as the accessible entry point to ETour. Everyone knows the rules. Games complete quickly. The low stakes allow new players to experience the platform mechanics without significant risk.

> But tic-tac-toe is solved. Perfect play always draws.

Exactly. And that's the point. Tic-tac-toe's high draw rate makes it the perfect demonstration of ETour's draw economics. When a match ends in a draw, both players receive most of their entry fee back. On a 0.003 ETH entry, approximately 0.0027 ETH returns to each player. The draw costs each player about 0.0003 ETH, a small fee for playing a fair, verified game.

This transforms tic-tac-toe's "flaw" into a feature:

- **Low-risk learning environment** — New players experience the full platform flow with minimal downside
- **Draw mechanics demonstration** — Players see exactly how ETour handles non-decisive outcomes
- **Economic transparency** — The refund math is simple enough to verify immediately

Tic-tac-toe is the "Hello World" of ETour—not because it's competitive at the highest level, but because it proves the system works. Fair games, instant payouts, sensible draw handling. If you trust ETour with tic-tac-toe, you can trust it with chess.

### 2.3 Chess

**Entry Point: 0.01 – 0.02 ETH**

Chess is ETour's flagship serious competition.

Full chess rules: castling, en passant, pawn promotion, fifty-move rule, threefold repetition. **All verified on-chain.**

Every move is permanently recorded, creating an immutable record of every game.

We chose chess because:

- **Deep strategic complexity** makes the stakes worth it
- **Established competitive culture** provides an existing audience
- **Complete information** is a perfect match for blockchain transparency
- **Existing rating systems** give players benchmarks to prove

Chess on chain offers something no centralized platform can give serious chess players:

**100% certainty that their opponent isn't using engine assistance (each move is a transaction from their wallet), and they will get paid if they win.**

### 2.4 Connect Four

**Entry Point: 0.001 – 0.1 ETH**

Connect Four occupies the middle ground. More strategic depth than tic-tac-toe, faster than chess, familiar to most players. The vertical drop mechanic creates unique tactical situations while remaining simple to verify on-chain.

Connect Four was added because:

- **Deceptive strategic depth** — Simple rules hide complex tactics
- **Quick games** — Matches complete faster than chess, enabling higher tournament throughput
- **Complementary audience** — Appeals to players who want more than tic-tac-toe but less commitment than chess

### 2.5 Why Not Battleship?

Battleship was initially considered as the third flagship game. It was rejected because it fundamentally conflicts with blockchain's transparency properties.

Battleship requires **hidden information**—players place ships secretly, then guess opponent positions. To make this work on-chain requires compromises:

1. **Commit-reveal schemes** — Players cryptographically commit to positions revealed after the game
2. **Off-chain computation** — Ship positions stored off-chain, only results posted on-chain

Neither option aligns with ETour's principles. Hidden information games require trusting some mechanism beyond the blockchain itself. Rather than compromise, we replaced Battleship with Connect Four—a game that needs no hidden state and can be fully verified in a single transaction per move.

This decision exemplifies ETour's philosophy: **accept blockchain's constraints and build games that naturally fit, rather than forcing incompatible designs.**

---

## 3. Protocol Architecture

### 3.1 Modular Design

ETour uses a modular architecture where shared tournament infrastructure is deployed as separate library contracts that multiple games can use. This design separates **universal tournament mechanics** from **game-specific logic**.

**Core Infrastructure Modules (Shared):**
- **ETour_Core** — Tournament enrollment, tier management, and tournament status
- **ETour_Matches** — Match management, bracket progression, and round tracking
- **ETour_Prizes** — Prize pool calculation and distribution logic
- **ETour_Raffle** — Community raffle system for protocol fee redistribution
- **ETour_Escalation** — Anti-griefing timeout escalation for enrollment and matches

**Game Contracts (Specific):**
- Move validation rules
- Win/draw detection
- Board state representation
- Game-specific data structures (boards, pieces, positions)

Each game contract is deployed with references to the shared module addresses. This means:

- **Gas Efficiency** — Shared logic is deployed once, not duplicated per game
- **Battle-Tested Code** — New games inherit proven, audited infrastructure
- **Consistent Behavior** — All games follow identical tournament mechanics
- **Simpler Game Implementation** — Developers focus only on game rules

### 3.2 ETour_Base: The Foundation

**ETour_Base.sol** serves as the foundational contract that defines common types, enums, and structures used across all ETour modules and games:

**Core Data Types:**
- `TournamentStatus` — Enrolling, Active, Completed
- `MatchStatus` — NotStarted, InProgress, Completed
- `EscalationLevel` — None, Level1, Level2, Level3
- `CompletionReason` — Victory, Draw, Timeout, Forfeit

**Shared Structures:**
- `CommonMatchData` — Player addresses, status, timestamps, timeout states
- `EnrollmentTimeoutState` — Escalation tracking for unfilled tournaments
- `LeaderboardEntry` — Player address and net earnings

All modules and game contracts reference ETour_Base types, ensuring consistency across the entire system. Think of it as the common language that all ETour components speak.

### 3.3 How Games Use Modules

Game contracts are deployed with addresses to each module. When a player enrolls, makes a move, or triggers an escalation, the game contract delegates to the appropriate module:

**Example Flow - Player Enrollment:**
1. Player calls `enrollInTournament()` on the game contract
2. Game contract delegates to **ETour_Core** for enrollment logic
3. ETour_Core validates payment, adds player to tournament
4. If tournament fills, ETour_Core signals **ETour_Matches** to start Round 0
5. ETour_Matches creates match pairings and calls back to game contract for game setup

**Example Flow - Timeout Claim:**
1. Player calls timeout claim function on game contract
2. Game contract delegates to **ETour_Escalation** to validate timeout
3. ETour_Escalation confirms escalation level reached
4. Game contract updates match result
5. ETour_Matches advances tournament bracket
6. ETour_Prizes calculates and distributes winnings

This modular delegation keeps game contracts lean while providing full tournament infrastructure.

### 3.4 Game Implementation Requirements

To build a game on ETour, you implement these core functions:

| Function | Purpose |
|----------|---------|
| `_createMatchGame` | Initialize game state for a new match |
| `_resetMatchGame` | Clean up game state after match completion |
| `_getMatchResult` | Return winner, draw status, and match status |
| `_getMatchPlayers` | Return both players' addresses |
| `_initializeMatchForPlay` | Set up match for active gameplay |
| `_completeMatchWithResult` | Finalize match with outcome |

Plus functions for timeout state management and player assignment.

You also define your tier structure in the constructor—entry fees, player counts, prize distributions, and timeout settings.

### 3.5 Shared Infrastructure Benefits

Games built on ETour modules inherit:

- **Proven tournament logic** — Bracket progression, round management, and advancement handling
- **Economic sustainability** — Fee splitting, prize distribution, forfeit handling
- **Anti-griefing protection** — Timeout escalation across enrollment and matches
- **Player statistics** — Cross-game win/loss tracking
- **Permanent earnings history** — Per-player prize records stored permanently on-chain, enabling lifetime leaderboards
- **Security patterns** — Reentrancy guards, access controls, prize isolation

This shared foundation means game developers focus purely on game rules, confident that the competitive infrastructure handles edge cases correctly.

---

## 4. Tournament Mechanics

### 4.1 Tier System

ETour supports configurable tournament tiers, each defining:

- **Player count** — Tournament size (powers of 2 for clean brackets)
- **Instance count** — Concurrent tournaments at this tier
- **Entry fee** — Stakes required to join
- **Mode** — Classic or Pro variations
- **Timeouts** — Enrollment window, move timeout, escalation intervals
- **Prize distribution** — Percentage allocation by final ranking

Example tier configuration:

| Tier | Players | Entry Fee | Prize Split |
|------|---------|-----------|-------------|
| 0 | 2 | 0.001 ETH | 100% / 0% |
| 1 | 4 | 0.005 ETH | 70% / 30% / 0% / 0% |
| 2 | 8 | 0.01 ETH | 50% / 25% / 15% / 10% / 0%... |
| 3 | 16 | 0.05 ETH | Custom distribution |

Higher tiers offer larger prize pools but require more opponents and longer tournament duration.

### 4.2 Instance Management

Each tier runs multiple concurrent instances. If Tier 2 has 4 instances, four separate 8-player tournaments can run simultaneously. When one completes, it automatically resets and begins accepting new enrollments.

This design ensures:

- **Availability** — Players can almost always find an enrolling tournament
- **Throughput** — Multiple tournaments process in parallel
- **Bounded state** — Fixed instance count prevents unbounded storage growth

### 4.3 Bracket Progression

Tournaments follow single-elimination bracket format:

1. Players sign up until the tier is full or time runs out
2. Round 0 creates matches for all players
3. Winners advance to the next round, losers are eliminated
4. This continues until the finals decide the champion
5. Prizes distribute automatically upon completion
6. Tournament automatically resets for new enrollment

The protocol handles odd player counts through walkover advancement when necessary.

### 4.4 Draw Handling

Some games (notably tic-tac-toe) can end in draws. ETour handles draws through several mechanisms:

**Single Match Draw:**
Both players are eliminated. Neither advances. This creates natural pressure to play for wins rather than safe draws.

**All-Draw Round:**
If every match in a round draws, the tournament cannot continue normally. ETour detects this condition and splits the remaining prize pool equally among all remaining players.

**Finals Draw:**
If the championship match draws, both finalists are declared co-winners and split the first-place prize.

### 4.5 Walkover and Consolidation Logic

When draws eliminate players without producing winners, bracket structures can become unbalanced. ETour's consolidation logic handles these edge cases:

- **Orphaned winners** — A player who won their match but has no opponent in the next round advances automatically
- **Scattered players** — When odd numbers of players remain in a round, the protocol consolidates them into valid matchups
- **Solo survivor** — If only one player remains active, they're declared tournament winner

This logic ensures tournaments always reach resolution rather than getting stuck in unplayable states.

---

## 5. Economic Model

### 5.1 Fee Structure

Entry fees are split at enrollment time:

| Recipient | Share | Purpose |
|-----------|-------|---------|
| Prize Pool | 90% | Distributed to tournament winners |
| Owner | 7.5% | Operational sustainability |
| Protocol | 2.5% | Future development fund |

This split is hardcoded in the contract. No admin function can modify it once deployed. Players know exactly where their entry fee goes.

### 5.2 Prize Distribution

Prize distribution is defined per-tier as percentage arrays. For an 8-player tournament:

```
[50, 25, 15, 10, 0, 0, 0, 0]
```

Meaning:
- 1st place: 50% of prize pool
- 2nd place: 25%
- 3rd-4th place (semifinal losers): Split 15% equally (7.5% each)
- 5th-8th place: 0%

Distributions must sum to 100%. Games can configure any distribution that incentivizes their competitive structure.

### 5.3 Self-Sustaining Operations

ETour requires no ongoing funding, token sales, or venture capital. The 10% operational fee (7.5% + 2.5%) from each entry fee funds:

- Server costs for frontend hosting (the only centralized component)
- Future development and audits
- Legal and operational overhead

Because the protocol runs entirely on-chain, these costs are minimal. Even with modest adoption, the fee structure generates sufficient revenue for indefinite operation.

### 5.4 No Token, No Speculation

ETour has no governance token, utility token, or any token at all. This is intentional:

- **No speculation** — Players can't "invest" in ETour; they can only compete
- **No regulatory ambiguity** — No securities law concerns
- **No extraction** — No early investors extracting value from later players
- **Simplicity** — ETH in, ETH out

This commitment means ETour will never have a "token launch," never offer staking rewards, never implement "play-to-earn" tokenomics. The only way to profit from ETour is to win games.

---

## 6. Anti-Griefing Systems

### 6.1 The Stalling Problem

Competitive systems with real stakes face a fundamental griefing vector: players can stall indefinitely to avoid losses. Without countermeasures:

- A losing player could simply stop making moves, hoping the opponent gives up
- Tournaments could stall at enrollment, never reaching required player counts
- Funds could be locked indefinitely in unresolvable states

Traditional platforms solve this with centralized intervention—admins who adjudicate disputes. **ETour brings forth autonomous solutions.**

The protocol implements a progressive escalation system that transforms every stalling scenario into an economic opportunity for resolution. Each escalation level expands who can act and what rewards they receive, guaranteeing that no tournament or match remains stuck indefinitely.

### 6.2 Enrollment Timeout Escalation

When a player enrolls in an unfilled tournament, a countdown begins. If the tournament doesn't fill naturally, two escalation levels activate sequentially:

**Escalation Level 1 — Force Start Tournament**

After the enrollment window expires with fewer than maximum players enrolled, any enrolled player can force-start the tournament with current enrollment.

Tournament begins immediately with available players. If only one player enrolled, they win by default and receive the prize pool.

This gives enrolled players the power to begin the tournament they paid to enter.

---

**Escalation Level 2 — Claim Abandoned Pool**

After an additional timeout period following Level 1, anyone can claim the entire abandoned prize pool.

Tournament ends. All enrolled players forfeit. Claimer receives the full prize pool (90% of all entry fees collected).

Both options exist simultaneously once Level 2 unlocks, creating a race condition where enrolled players can still force-start while external observers can claim the pool.

---

This creates a strong economic incentive for resolution. Rather than funds sitting locked forever, someone can always claim them—either by playing a reduced tournament or by cleaning up an abandoned one and taking the entire pool.

### 6.3 Match Timeout Escalation

During active matches, each player receives a total time allocation for all their moves. When a player exhausts their time, three escalation levels activate progressively:

**Escalation Level 1 — Claim Victory by Forfeit**

When your opponent exhausts their total match time, you can claim victory by opponent timeout.

Match ends. You win and advance to the next round. Timed-out player is eliminated.

---

**Escalation Level 2 — Eliminate Stalled Players**

If your opponent fails to claim victory within their time window, players who have already advanced to higher tournament rounds can step in.

Both players in the stalled match are removed from the tournament. Neither advances. The advanced player who triggers elimination advances in place of the eliminated players.

---

**Escalation Level 3 — Replace Stalled Players**

If advanced players fail to act within their time window, anyone can replace both stalled players and take their tournament position.

Both original players are eliminated. Replacer becomes the match winner, advances to the next round, and can compete for the full prize pool without having paid entry.

---

Each escalation level expands who can resolve the situation, guaranteeing that no match stalls indefinitely.

### 6.4 Economic Incentives for Resolution

The escalation system transforms stalling from a grief vector into an opportunity:

**During Enrollment:**
- Enrolled players can force-start with fewer players, competing for the existing prize pool
- External observers can claim the entire abandoned prize pool for themselves

**During Matches:**
- Your opponent's timeout benefits you with a free win and tournament advancement
- Advanced players benefit by unblocking their path to the finals
- External observers benefit by joining the tournament mid-competition and potentially winning without paying entry

The incentive structure ensures everyone except the staller has reason to resolve the situation. For enrollment timeouts, the reward is direct—the full pool. For match timeouts, the reward is participation: the chance to compete for prizes in a tournament you didn't pay to enter.

---

## 7. Trust and Verification

### 7.1 Fully On-Chain Execution

Every piece of ETour logic executes on Arbitrum:

- Enrollment and matchmaking
- Move validation and game rules
- Win detection and tournament progression
- Prize calculation and distribution

No off-chain server decides outcomes. No oracle reports results. No backend can be compromised. The smart contract is the complete system.

### 7.2 No Admin Override

The owner address can withdraw accumulated operational fees. It cannot:

- Modify game rules mid-tournament
- Override match results
- Freeze player funds
- Change fee percentages
- Pause the protocol

Once deployed, the contract operates autonomously according to its code. Even the developer cannot intervene in active competitions.

### 7.3 Deterministic Outcomes

Given identical inputs, ETour always produces identical outputs. There is no:

- Random number generation affecting outcomes (games are skill-only)
- Oracle data influencing results
- External calls to other contracts that could fail
- Admin discretion in any decision

This determinism enables complete verification. Anyone can reconstruct a tournament's history from emitted events and transaction logs to confirm the outcome.

### 7.4 Open Source Verification

All contract code is verified on Arbiscan. You can:

- Read the exact code governing your competition
- Verify fee percentages match documentation
- Confirm no hidden admin functions exist
- Audit game rules for fairness

No trust required. Verification is available to anyone willing to read Solidity.

---

## 8. RW3 Compliance

### 8.1 The Five Principles

ETour is built according to RW3 (Reclaim Web3) principles—a movement committed to rebuilding blockchain applications that deliver genuine utility without compromising decentralization:

1. **Real Utility** — Solve an actual problem, not a manufactured one
2. **Fully On-Chain** — Execute core logic on blockchain, not centralized servers
3. **Self-Sustaining** — Generate revenue from usage, not token speculation
4. **Fair Distribution** — No pre-mine, insider allocations, or VC extraction
5. **No Altcoins** — Use established currencies (ETH), don't create new tokens

### 8.2 How ETour Meets Each Principle

**Real Utility:**
ETour enables skill-based competition with guaranteed fair outcomes and instant payouts. Players get something centralized platforms can't give them: absolute certainty that nobody can cheat, steal funds, or manipulate results.

**Fully On-Chain:**
All tournament logic, game rules, and financial operations execute via smart contract. The only off-chain component is the interface, which is purely cosmetic. A different frontend, or direct contract interaction, produces exactly the same results.

**Self-Sustaining:**
The 10% operational fee funds ongoing development and hosting costs. No external funding required. No token sales. No investor extraction.

**Fair Distribution:**
There are no tokens to distribute. All ETH in prize pools comes from player entry fees in that specific tournament. No insiders. No early advantages.

**No Altcoins:**
ETour uses only ETH. No governance tokens. No utility tokens. No "reward tokens." Just the native currency of Arbitrum.

---

## 9. Technical Overview

### 9.1 Contract Structure

ETour uses a modular contract architecture where functionality is distributed across specialized modules:

**ETour_Base.sol (Foundation):**
- Common types and enums (TournamentStatus, MatchStatus, EscalationLevel)
- Shared data structures (CommonMatchData, EnrollmentTimeoutState)
- Type definitions used across all modules

**ETour_Core.sol (Tournament Management):**
- Tier configuration storage
- Tournament instance tracking
- Enrollment processing
- Fee collection and splitting
- Tournament status management

**ETour_Matches.sol (Match & Bracket Logic):**
- Match pairing and creation
- Round initialization and progression
- Bracket advancement logic
- Draw and walkover handling

**ETour_Prizes.sol (Prize Distribution):**
- Prize pool calculation
- Ranking determination
- Winner payout execution
- Earnings tracking and leaderboard

**ETour_Escalation.sol (Anti-Griefing):**
- Enrollment timeout tracking
- Match timeout tracking
- Escalation level progression
- Claim validation for all timeout scenarios

**ETour_Raffle.sol (Community Raffles):**
- Raffle threshold management
- Random winner selection (weighted by enrollment)
- Prize distribution from accumulated protocol fees

**Game Contracts (TicTacChain, ChessOnChain, ConnectFourOnChain):**
- Game-specific state (boards, pieces, positions)
- Move validation and game rules
- Win/draw/timeout detection
- Module callbacks for tournament integration

### 9.2 Key Data Structures

**TierConfig** stores tournament parameters: player count, instance count, entry fee, mode, timeouts, and rounds.

**TournamentInstance** tracks the state of a single tournament: status, current round, enrolled players, prize pool, winner, and timeout states.

**PlayerStats** records performance: tournaments won/played, matches won/played.

**Permanent Earnings Tracking** maintains prize history per player and net earnings across all tournaments, enabling lifetime leaderboards.

### 9.3 Core Functions

Players interact with ETour through these primary functions:

- **enrollInTournament** — Join a tournament at a specific tier
- **forceStartTournament** — Trigger EL1 enrollment escalation
- **claimAbandonedEnrollmentPool** — Trigger EL2 enrollment escalation
- **Game-specific move functions** — Make moves in your matches

View functions allow frontends to query tournament info, player stats, tier overviews, and leaderboard data.

Events are emitted for every significant action, enabling complete historical reconstruction and frontend real-time updates.

### 9.4 Gas Optimization

ETour employs several gas optimization strategies:

- **Packed structs** — Related small values share storage slots
- **Minimal storage writes** — Derived values computed rather than stored
- **Efficient mappings** — Direct lookups rather than array iteration
- **Bounded loops** — All iterations have known maximum bounds
- **Selective permanent storage** — Only essential historical data is stored permanently

Typical gas costs on Arbitrum:

| Operation | Gas Units | Cost @ 0.1 gwei |
|-----------|-----------|-----------------|
| Enroll | ~150,000 | ~0.000015 ETH |
| Make Move | ~80,000 | ~0.000008 ETH |
| Claim Timeout | ~120,000 | ~0.000012 ETH |

These costs are negligible relative to entry fees, ensuring game economics aren't dominated by transaction costs.

---

## 10. Building on ETour

### 10.1 The Modular Approach

Building a game on ETour means creating a game contract that interfaces with the shared ETour module system. You don't deploy your own tournament infrastructure—you reference the existing, audited modules.

**Your Game Contract:**
- Receives module addresses in the constructor
- Implements game-specific logic (move validation, win detection)
- Delegates tournament operations to modules
- Focuses purely on your game's rules

**The Modules (Already Deployed):**
- ETour_Core handles enrollment and tier management
- ETour_Matches manages brackets and round progression
- ETour_Prizes calculates and distributes winnings
- ETour_Escalation handles all timeout scenarios
- ETour_Raffle runs community prize drawings

This means you're building on battle-tested, gas-optimized infrastructure used by all ETour games.

### 10.2 What You Need to Implement

Building a game on ETour requires implementing about a dozen functions:

**Game State Management:**
- Create and reset match state
- Track game-specific data (board, pieces, etc.)

**Result Reporting:**
- Determine when games end (win/draw/timeout)
- Return match results to modules via callbacks

**Timeout Integration:**
- Update timeout state after each move
- Provide functions for players to claim timeout victories

**Module Communication:**
- Receive callbacks from modules (e.g., when a match starts)
- Call module functions when game events occur (e.g., match ends)

**Configuration:**
- Define your tier structure (entry fees, prize splits, timeouts)

That's it. The tournament framework, prize distribution, anti-griefing, and statistics are all handled by the modules.

### 10.3 What You Get for Free

When you build on ETour modules, you inherit:

- **Tournament bracket system** — Single-elimination with proper advancement logic
- **Prize distribution** — Automatic payout according to your configured splits
- **Anti-griefing escalation** — Both enrollment and match timeout handling
- **Player statistics** — Win/loss tracking across all games on your contract
- **Earnings leaderboard** — Permanent history of player performance and prizes
- **Security patterns** — Reentrancy protection, access controls, tested edge cases

You focus on your game's rules. ETour modules handle everything else.

### 10.4 Getting Started

The basic pattern:

1. **Reference the modules** — Your contract receives module addresses in the constructor
2. **Implement ETour_Base types** — Use the common types defined in ETour_Base.sol
3. **Define your game structures** — Board state, player positions, whatever your game needs
4. **Configure tiers** — Set entry fees, player counts, prize distributions
5. **Implement callback functions** — Handle module callbacks for match lifecycle events
6. **Deploy and verify** — Deploy to Arbitrum with module addresses and verify your contract

The implementation is straightforward because ETour handles all the complex tournament mechanics. You're just telling it how your specific game works.

For detailed implementation guidance, refer to the ETour documentation and example contracts.

---

## 11. Conclusion

ETour Protocol demonstrates that blockchain gaming can focus on games rather than financial mechanisms. By accepting blockchain's constraints—transparency, determinism, discrete transactions—and building games that naturally fit within them, we've created infrastructure for genuine skill-based competition.

The three flagship games serve different audiences and skill levels:

- **Tic-Tac-Toe** welcomes newcomers with familiar rules and low stakes
- **Chess** provides serious competition for strategic players
- **Connect Four** offers tactical depth with faster resolution

All three share the same guarantees: fair play, instant payouts, no cheating possible.

For players, the message is simple: **Think you're good? Prove it.**

For developers, ETour offers battle-tested tournament infrastructure. Build your game's rules; ETour handles the rest.

For skeptics, all code is open source and verified. **Trust nothing. Verify everything.**

This is what Web3 gaming should have been from the start: technology enabling experiences that weren't possible before, rather than technology demanding attention for its own sake.

---

## Appendix A: Economic Projections

Conservative scenario (1,000 daily active players):

| Metric | Daily | Monthly | Yearly |
|--------|-------|---------|--------|
| Tournaments | 300 | 9,000 | 108,000 |
| Entry Volume | 3 ETH | 90 ETH | 1,080 ETH |
| Prize Pools | 2.7 ETH | 81 ETH | 972 ETH |
| Operational Revenue | 0.3 ETH | 9 ETH | 108 ETH |

At ETH = $2,000, this yields ~$216,000/year operational revenue—more than sufficient for hosting, development, and maintenance.

Growth scenario (10,000 daily active players):

| Metric | Daily | Monthly | Yearly |
|--------|-------|---------|--------|
| Tournaments | 3,000 | 90,000 | 1,080,000 |
| Entry Volume | 30 ETH | 900 ETH | 10,800 ETH |
| Prize Pools | 27 ETH | 810 ETH | 9,720 ETH |
| Operational Revenue | 3 ETH | 90 ETH | 1,080 ETH |

At scale, operational revenue provides significant runway for development, audits, and ecosystem growth—all funded by actual usage rather than speculation.

---

**Contract Addresses:** [To be added upon deployment]
**Source Code:** [GitHub repository]
**Frontend:** [etour.games]
**RW3 Manifesto:** [reclaimweb3.com]

---

*This whitepaper describes ETour Protocol as designed for deployment on Arbitrum One. The protocol operates autonomously according to its smart contract code. This document is for informational purposes and does not constitute financial advice.*

