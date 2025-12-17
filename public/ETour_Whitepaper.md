# ETOUR
### Tournament Infrastructure for Skill-Based Competition

---

## Abstract

ETour is a game-agnostic tournament protocol that enables any deterministic competitive game to run perpetual, stake-based competitions entirely on-chain. 

ETour is different from other Web3 gaming platforms that sell tokens or promise players money. Instead, it focuses on one thing: **players compete in games they already know, and the better player wins real ETH.**

The protocol separates universal tournament mechanics from game-specific logic. (e.g matchmaking, bracket management, timeout escalation, prize distribution). Architectural decisions allow multiple games to share battle-tested infrastructure while each maintains its own rules and identity. 

ETour launches with three classic games: Tic-Tac-Toe, Connect Four, and Chess, chosen specifically because they require no hidden information and can be fully verified on-chain.

This whitepaper explains the philosophical reasoning behind ETour's design decisions and the technical implementation that makes trustless competition possible. It's intended for those who want to understand*not just what ETour does;

### **But why it was built this way.**

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
   - [3.1 Separation of Concerns](#31-separation-of-concerns)
   - [3.2 The Abstract Contract Pattern](#32-the-abstract-contract-pattern)
   - [3.3 Game Implementation Requirements](#33-game-implementation-requirements)
   - [3.4 Shared Infrastructure Benefits](#34-shared-infrastructure-benefits)

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

9. [Technical Specification](#9-technical-specification)
   - [9.1 Contract Structure](#91-contract-structure)
   - [9.2 Key Data Structures](#92-key-data-structures)
   - [9.3 Core Functions](#93-core-functions)
   - [9.4 Events](#94-events)
   - [9.5 Gas Optimization](#95-gas-optimization)

10. [Conclusion](#10-conclusion)

**Appendices:**
- [Appendix A: Game Implementation Guide](#appendix-a-game-implementation-guide)
- [Appendix B: Economic Projections](#appendix-b-economic-projections)

</details>

---

## 1. Philosophy: Games First, Infrastructure Second

### 1.1 The Problem with Web3 Gaming

Web3 gaming has a credibility problem. The phrase "play games and earn crypto" has been used so many times by scams, rugpulls, and tokenomics that don't work that it makes people doubt it, rightfully so. **Players have learned that "earn" usually means "lose money slowly while enriching early adopters."**

Most Web3 gaming projects make the same fundamental mistake: they lead with blockchain technology and financial incentives rather than compelling gameplay. They're selling infrastructure, tokens, and economic mechanisms to people who just want to play games.

This approach fails because:

- **Players don't care about infrastructure.** They care about fair competition and real outcomes.
- **"Earn" messaging attracts speculators, not gamers.** The community becomes focused on extraction rather than competition.
- **Technical complexity creates barriers.** Explaining on-chain verification to someone who wants to play chess is backwards.

### 1.2 What Players Actually Want

Competitive players want simple things:

1. **Fair games** — No hidden algorithms deciding outcomes
2. **Meaningful stakes** — Something real on the line
3. **Skill determines results** — Not luck, not who bought more tokens
4. **Instant resolution** — Win and get paid, no waiting periods

These desires exist independently of blockchain. Chess players have always wanted fair competition with meaningful stakes. The question is whether blockchain adds value to this experience and that value can manifest without drowning the player in technical jargon.

### 1.3 The ETour Approach

ETour turns the usual Web3 gaming pitch on its head:

#### **Traditional Web3 Gaming** 

> Here's our "revolutionary blockchain protocol". It has tokenomics, staking mechanisms, and governance.<br>Oh, and you can play games on it.

<br> 

#### **ETour** 

> Here are classic games you already know.<br>Play for real ETH stakes. The better player claims the pot.

The blockchain infrastructure exists to serve the games, not the other way around. ETour Protocol is the engine under the hood that makes this competition possible, but not the selling point.

**This whitepaper exists for those who want to look under the hood.** If you're a player who just wants to compete, the landing page tells you everything you need: pick a game, connect your wallet, prove you're good.

---

## 2. The Three Flagship Games

### 2.1 Selection Criteria

ETour's flagship games were chosen based on strict criteria that ensure full on-chain verifiability:

1. **Complete Information** — All game state must be visible to all players. No hidden hands, no fog of war.
2. **Deterministic Rules** — Given the same inputs, the same output must always result. No randomness mid-game.
3. **Discrete Turns** — Games must have clear turn boundaries suitable for blockchain transaction timing.
4. **Reasonable Complexity** — Game logic must be implementable within smart contract gas limits.
5. **Cultural Recognition** — Games should be widely known, requiring no rule explanation.

These criteria eliminate entire categories of games. Poker requires hidden cards. Real-time games can't wait for block confirmation. Complex simulations exceed gas limits. But within these constraints, several classic games fit perfectly.


### 2.2 Tic-Tac-Toe

**Entry Point: 0.001 ETH**

Tic-tac-toe serves as the accessible entry point to ETour. Everyone knows the rules. Games complete quickly. The low stakes allow new players to experience the platform mechanics without significant risk.

> But tic-tac-toe is solved, perfect play always draws.

Exactly! And that's the point. Tic-tac-toe's high draw rate makes it the perfect demonstration of ETour's draw economics. When a match ends in a draw, both players receive most of their entry fee back. On a $3 entry, approximately $2.50 returns to each player. The draw essentially costs each player $0.50, a fee for playing a fair, verified game.

This transforms tic-tac-toe's "flaw" into a feature:

- **Low-risk learning environment** — New players can experience the full platform flow (enroll, play, payout) with minimal downside
- **Draw mechanics demonstration** — Players see exactly how ETour handles non-decisive outcomes
- **Economic transparency** — The refund math is simple enough to verify immediately

Tic-tac-toe is the "Hello World" of ETour - not because it's competitive at the highest level, but because it proves the system works. Fair games, instant payouts, sensible draw handling. If you can trust ETour with tic-tac-toe, you can trust it with chess.

### 2.3 Chess

**Entry Point: 0.01 – 0.02 ETH**

Chess is ETour's flagship serious competition. 

Full chess rules: castling, en passant, pawn promotion, fifty-move rule, threefold repetition. **All verified on-chain.** 

Every move is permanently recorded, creating an immutable record of every game.

We chose chess because: 

- **Deep strategic complexity** that makes the stakes worth it
- **Established competitive culture** gives you an audience right away
- **Full information** is a perfect match for blockchain transparency 
- **Existing rating systems** give players benchmarks to prove

Chess on chain has something that no other centralized platform can offer serious chess players: 

**They are 100% sure that their opponent isn't using engine assistance (each move is a transaction from their wallet), and they will get paid if they win.** 

### 2.4 Connect Four

**Entry Point: 0.001 – 0.1 ETH**

Connect Four occupies the middle ground. More strategic depth than tic-tac-toe, faster than chess, familiar to most players. The vertical drop mechanic creates unique tactical situations while remaining simple to verify on-chain.

Connect Four was added because:

- **Deceptive strategic depth** — Simple rules hide complex tactics
- **Quick games** — Matches complete faster than chess, enabling higher tournament throughput
- **Complementary audience** — Appeals to players who want more than tic-tac-toe but less commitment than chess

### 2.5 Why Not Battleship?

Battleship was initially considered as the third flagship game. It was rejected because it fundamentally conflicts with blockchain's transparency properties.

Battleship requires **hidden information**—players place ships secretly, then guess opponent positions. To make this work on-chain, you have to make one of two compromises: 

1. **Commit-reveal schemes** —  Players agree to send their positions cryptographically, and they will be revealed after the game.

2. **Off-chain computation** — Ship positions stored off-chain, only results posted on-chain. This breaks the "fully on-chain" principle entirely.

Neither option aligns with ETour's principles. Hidden information games require trusting some mechanism beyond the blockchain itself. Rather than compromise, we replaced Battleship with Connect Four; a game that needs no hidden state and can be fully verified in a single transaction per move.

This decision exemplifies ETour's philosophy: **accept blockchain's constraints and build games that naturally fit, rather than forcing incompatible designs.**

---

## 3. Protocol Architecture

### 3.1 Separation of Concerns

ETour's architecture separates **universal tournament mechanics** from **game-specific logic**:

**ETour Protocol (Universal):**
- Tournament enrollment and matchmaking
- Bracket management and round progression
- Timeout detection and escalation
- Prize pool calculation and distribution
- Player statistics tracking
- Permanent earnings history and leaderboard

**Game Contracts (Specific):**
- Move validation rules
- Win/draw detection
- Board state representation
- Game-specific data structures

This separation means that once ETour's tournament logic is audited and battle-tested, new games can be added with confidence that the competitive infrastructure works correctly. Each new game only needs to implement its own rules correctly.

### 3.2 The Abstract Contract Pattern

ETour is implemented as an abstract Solidity contract. Game implementations inherit from ETour and override specific functions:

```solidity
abstract contract ETour is ReentrancyGuard {
    // Universal tournament mechanics implemented here
    
    // Game-specific functions to be implemented by child contracts
    function _createMatchGame(...) internal virtual;
    function _resetMatchGame(bytes32 matchId) internal virtual;
    function _getMatchResult(bytes32 matchId) internal view virtual 
        returns (address winner, bool isDraw, MatchStatus status);
    function _getMatchPlayers(bytes32 matchId) internal view virtual 
        returns (address player1, address player2);
    // ... additional abstract functions
}

contract ChessOnChain is ETour {
    // Chess-specific implementation of abstract functions
    // Plus chess rules, board state, move validation
}
```

This pattern provides compile-time guarantees that game implementations provide all required functions while inheriting all tournament functionality automatically.

### 3.3 Game Implementation Requirements

To build a game on ETour, developers implement these core functions:

| Function | Purpose |
|----------|---------|
| `_createMatchGame` | Initialize game state for a new match |
| `_resetMatchGame` | Clean up game state after match completion |
| `_getMatchResult` | Return winner, draw status, and match status |
| `_getMatchPlayers` | Return both players' addresses |
| `_initializeMatchForPlay` | Set up match for active gameplay |
| `_completeMatchWithResult` | Finalize match with outcome |
| `_setMatchPlayer` | Assign player to match slot |
| `_setMatchTimeoutState` | Update timeout tracking |
| `_getMatchTimeoutState` | Read timeout state |

Additionally, games define their tier structure in the constructor:

```solidity
constructor() {
    // Tier 0: 2-player, 0.001 ETH entry
    uint8[] memory tier0Prizes = new uint8[](2);
    tier0Prizes[0] = 100; // Winner takes all
    tier0Prizes[1] = 0;
    
    _registerTier(
        0,              // tierId
        2,              // playerCount
        10,             // instances
        0.001 ether,    // entryFee
        Mode.Classic,   // mode
        30 minutes,     // enrollmentWindow
        10 minutes,     // matchMoveTimeout
        1 hours,        // escalationInterval
        tier0Prizes     // prize distribution
    );
}
```

### 3.4 Shared Infrastructure Benefits

Games built on ETour inherit:

- **Proven tournament logic** — Bracket progression, round management, and advancement handling
- **Economic sustainability** — Fee splitting, prize distribution, forfeit handling
- **Anti-griefing protection** — Timeout escalation across enrollment and matches
- **Player statistics** — Cross-game win/loss tracking
- **Permanent earnings history** — Per-player prize records (`playerPrizes`) and net earnings (`playerEarnings`) stored permanently on-chain, enabling lifetime leaderboards
- **Security patterns** — ReentrancyGuard, access controls, prize isolation

This shared foundation means game developers focus purely on game rules, confident that the competitive infrastructure handles edge cases correctly.

---

## 4. Tournament Mechanics

### 4.1 Tier System

ETour supports configurable tournament tiers, each defining:

- **Player count** — Tournament size (powers of 2 for clean brackets, or any number with walkover handling)
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


1. Players sign up until the tier is full or the time runs out and the games start
2. Round 0 puts players together for their first matches
3. Winners move on to the next round. Losers are kicked out
4. This goes on until the finals decide the champion
5. Prizes distribute automatically upon completion
6. Tournament automatically resets for new enrollment

The protocol handles odd player counts through walkover advancement. One randomly selected player advances without playing, ensuring brackets remain functional.

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

- **Orphaned winners** — A player who won their match but has no opponent in the next round (because that opponent's match drew) advances automatically
- **Scattered players** — When odd numbers of players remain in a round, the protocol consolidates them into valid matchups
- **Solo survivor** — If only one player remains active, they're declared tournament winner regardless of round number

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

This split is hardcoded in the contract. No admin function can modify it once deployed and players know exactly where their entry fee goes.

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

Traditional platforms solve this with centralized intervention. Admins who adjudicate disputes. **ETour brings forth autonomous solutions.**

### 6.2 Enrollment Timeout Escalation

When a player enrolls in an unfilled tournament, a countdown begins. If the tournament doesn't fill naturally:

**Escalation 1 — Enroller Claim (Force Start):**
After the enrollment window expires, enrolled players can force-start the tournament with whatever players have joined, even if below capacity. If only one player has enrolled, they win immediately and receive the prize pool.

**Escalation 2 — Public Claim (Abandoned Pool):**
After an additional escalation interval, **anyone** (including non-enrolled players) can claim the abandoned enrollment pool. All enrolled players are marked as forfeited, and **the claimer receives the entire prize pool** (90% of all entry fees collected). This is not a small reward, **it's the full pot!**.

This creates a strong economic incentive for resolution. Rather than funds sitting locked forever, someone can always claim the either by playing a reduced tournament or by cleaning up an abandoned one and taking the entire pool.

### 6.3 Match Timeout Escalation

During active matches, each move must occur within the configured timeout. When a timeout occurs:

**Escalation 1 — Opponent Claim:**
The opponent can claim victory directly. They waited; they win. The stalling player forfeits and is eliminated.

**Escalation 2 — Advanced Players (Force Eliminate):**
Players in the same tournament who have already won a match (and thus "advanced") can force-eliminate the stalled match. **Both players in the stalled match are eliminated** and neither advances. The advanced player who triggers this receives no direct reward; their incentive is unblocking the tournament so they can continue competing for the prize pool.

**Escalation 3 — External Replacement:**
Anyone can claim the match slot by **replacing** both stalled players. The claimer does not receive a cash reward. Instead, **they become the match winner and advance to the next round** (or win the tournament if it's the finals). Both original players are eliminated and forfeit their entry fees. The replacement player is added to the tournament and can compete for the full prize pool.

Each escalation level expands who can resolve the situation, guaranteeing that no match stalls indefinitely. The incentives shift from "claim the stalled match" to "become a participant and compete for the prize."

### 6.4 Economic Incentives for Resolution

The escalation system transforms stalling from a grief vector into various opportunities. If someone stalls:

**During Enrollment:**
- Enrolled players can force-start with fewer players (competing for the existing prize pool)
- External observers can claim the **entire abandoned prize pool** for themselves

**During Matches:**
- The opponent benefits (free win and tournament advancement)
- Advanced players benefit (unblocking their path to the finals and prize pool)
- External observers benefit (**they can join the tournament mid-competition** and potentially win the entire prize)

The incentive structure is designed so that everyone except the staller has reason to resolve the situation. For enrollment timeouts, the reward is direct and substantial (the full pool). For match timeouts, the reward is participation. The chance to compete for prizes in a tournament you didn't have to pay to enter.

This alignment ensures rapid resolution without requiring centralized intervention.

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

This determinism enables complete verification. Anyone can reconstruct a tournament's history from emitted events and transaction logs to confirm the outcome matches.

### 7.4 Open Source Verification

All contract code is verified on Arbiscan. Players can:

- Read the exact code governing their competition
- Verify fee percentages match documentation
- Confirm no hidden admin functions exist
- Audit game rules for fairness

No trust required. Verification is available to anyone willing to read Solidity.

---

## 8. RW3 Compliance

### 8.1 The Five Principles

ETour is built according to RW3 (Reclaim Web3) principles. A movement committed to rebuilding blockchain applications that deliver genuine utility without compromising decentralization:

1. **Real Utility** — Solve an actual problem, not a manufactured one
2. **Fully On-Chain** — Execute core logic on blockchain, not centralized servers
3. **Self-Sustaining** — Generate revenue from usage, not token speculation
4. **Fair Distribution** — No pre-mine, insider allocations, or VC extraction
5. **No Altcoins** — Use established currencies (ETH), don't create new tokens

### 8.2 How ETour Meets Each Principle

**Real Utility:**
ETour enables skill-based competition with guaranteed fair outcomes and instant payouts. Players get something that centralized platforms can't give them: absolute certainty that nobody can cheat, steal funds, or manipulate results.

**Fully On-Chain:**
All tournament logic, game rules, and financial operations execute via smart contract. The only off-chain component is this interface which is purely cosmetic. A different frontend, or direct contract interaction, produces exactly the same results.

**Self-Sustaining:**
The 10% operational fee funds ongoing development and hosting costs. No external funding required. No token sales. No investor extraction.

**Fair Distribution:**
There are no tokens to distribute. All ETH in prize pools comes from player entry fees in that specific tournament. No insiders. No early advantages.

**No Altcoins:**
ETour uses only ETH. No governance tokens. No utility tokens. No "reward tokens." Just the native currency of Arbitrum.

---

## 9. Technical Specification

### 9.1 Contract Structure

```
ETour.sol (abstract)
├── State Management
│   ├── Tier configuration
│   ├── Tournament instances
│   ├── Round tracking
│   └── Player statistics
├── Enrollment Logic
│   ├── Fee processing
│   ├── Player registration
│   └── Timeout escalation
├── Tournament Management
│   ├── Round initialization
│   ├── Match advancement
│   └── Winner determination
├── Prize Distribution
│   ├── Ranking calculation
│   ├── Prize calculation
│   └── Payout execution
└── Abstract Functions (game-specific)
    ├── _createMatchGame
    ├── _resetMatchGame
    ├── _getMatchResult
    └── ... (others)
```

### 9.2 Key Data Structures

**TierConfig:**
```solidity
struct TierConfig {
    uint8 playerCount;
    uint8 instanceCount;
    uint256 entryFee;
    Mode mode;
    uint256 enrollmentWindow;
    uint256 matchMoveTimeout;
    uint256 escalationInterval;
    uint8 totalRounds;
    bool initialized;
}
```

**TournamentInstance:**
```solidity
struct TournamentInstance {
    uint8 tierId;
    uint8 instanceId;
    TournamentStatus status;
    Mode mode;
    uint8 currentRound;
    uint8 enrolledCount;
    uint256 prizePool;
    uint256 startTime;
    address winner;
    address coWinner;
    bool finalsWasDraw;
    bool allDrawResolution;
    uint8 allDrawRound;
    EnrollmentTimeoutState enrollmentTimeout;
    bool hasStartedViaTimeout;
    // ... additional tracking fields
}
```

**PlayerStats:**
```solidity
struct PlayerStats {
    uint256 tournamentsWon;
    uint256 tournamentsPlayed;
    uint256 matchesWon;
    uint256 matchesPlayed;
}
```

**Permanent Earnings Tracking:**
```solidity
// Prize amount each player received per tournament (permanent, never deleted)
mapping(uint8 => mapping(uint8 => mapping(address => uint256))) public playerPrizes;

// Net earnings per player across ALL tournaments (prizes minus entry fees)
mapping(address => int256) public playerEarnings;

// All players who have ever participated (for leaderboard)
address[] internal _leaderboardPlayers;
```

**LeaderboardEntry:**
```solidity
struct LeaderboardEntry {
    address player;
    int256 earnings;  // Net profit/loss across all tournaments
}
```

### 9.3 Core Functions

**Enrollment:**
```solidity
function enrollInTournament(uint8 tierId, uint8 instanceId) external payable
```

**Force Start (after enrollment timeout):**
```solidity
function forceStartTournament(uint8 tierId, uint8 instanceId) external
```

**Claim Abandoned Enrollment:**
```solidity
function claimAbandonedEnrollmentPool(uint8 tierId, uint8 instanceId) external
```

**View Functions:**
```solidity
function getTournamentInfo(uint8 tierId, uint8 instanceId) external view 
    returns (TournamentStatus, Mode, uint8 currentRound, uint8 enrolledCount, uint256 prizePool, address winner)

function getPlayerStats(address player) external view 
    returns (uint256 tournamentsWon, uint256 tournamentsPlayed, uint256 matchesWon, uint256 matchesPlayed)

function getTierOverview(uint8 tierId) external view 
    returns (TournamentStatus[] memory, uint8[] memory enrolledCounts, uint256[] memory prizePools)
```

### 9.4 Events

ETour emits comprehensive events for frontend integration and historical analysis:

```solidity
event TierRegistered(uint8 indexed tierId, uint8 playerCount, uint8 instanceCount, uint256 entryFee);
event TournamentInitialized(uint8 indexed tierId, uint8 indexed instanceId);
event PlayerEnrolled(uint8 indexed tierId, uint8 indexed instanceId, address indexed player, uint8 enrolledCount);
event TournamentStarted(uint8 indexed tierId, uint8 indexed instanceId, uint8 playerCount);
event MatchStarted(uint8 indexed tierId, uint8 indexed instanceId, uint8 roundNumber, uint8 matchNumber, address player1, address player2);
event MatchCompleted(bytes32 indexed matchId, address winner, bool isDraw);
event RoundCompleted(uint8 indexed tierId, uint8 indexed instanceId, uint8 roundNumber);
event TournamentCompleted(uint8 indexed tierId, uint8 indexed instanceId, address winner, uint256 prizeAmount, bool finalsWasDraw, address coWinner);
event PrizeDistributed(uint8 indexed tierId, uint8 indexed instanceId, address indexed player, uint8 rank, uint256 amount);
event TimeoutVictoryClaimed(uint8 indexed tierId, uint8 indexed instanceId, uint8 roundNum, uint8 matchNum, address indexed winner, address loser);
event TournamentCached(uint8 indexed tierId, uint8 indexed instanceId, address winner);  // Emitted when earnings are recorded
event PlayerForfeited(uint8 indexed tierId, uint8 indexed instanceId, address indexed player, uint256 amount, string reason);
```

**Leaderboard View Functions:**
```solidity
function getLeaderboard() external view returns (LeaderboardEntry[] memory);
function getLeaderboardCount() external view returns (uint256);
```

### 9.5 Gas Optimization

ETour employs several gas optimization strategies:

- **Packed structs** — Related small values share storage slots
- **Minimal storage writes** — Derived values computed rather than stored
- **Efficient mappings** — Direct lookups rather than array iteration
- **Bounded loops** — All iterations have known maximum bounds
- **Selective permanent storage** — Only essential historical data (`playerPrizes`, `playerEarnings`) is stored permanently; detailed match history is reconstructable from events

Typical gas costs on Arbitrum:

| Operation | Gas Units | Cost @ 0.1 gwei |
|-----------|-----------|-----------------|
| Enroll | ~150,000 | ~0.000015 ETH |
| Make Move | ~80,000 | ~0.000008 ETH |
| Claim Timeout | ~120,000 | ~0.000012 ETH |

These costs are negligible relative to entry fees, ensuring game economics aren't dominated by transaction costs.

---

## 10. Conclusion

ETour Protocol demonstrates that blockchain gaming can focus on games rather than financial mechanisms. By accepting blockchain's constraints: transparency, determinism, discrete transactions, and building games that naturally fit within them. We've created infrastructure for genuine skill-based competition.

The three flagship games serve different audiences and skill levels:

- **Tic-Tac-Toe** welcomes newcomers with familiar rules and low stakes
- **Chess** provides serious competition for strategic players
- **Connect Four** offers tactical depth with faster resolution

All three share the same guarantees: fair play, instant payouts, no cheating possible.

For players, the message is simple: **Think you're good? Prove it.**

For developers, ETour offers battle-tested tournament infrastructure. Build your game's rules; we handle the rest.

For skeptics, all code is open source and verified. **Trust nothing. Verify everything.**

This is what Web3 gaming should have been from the start: technology enabling experiences that weren't possible before, rather than technology demanding attention for its own sake.

---

## Appendix A: Game Implementation Guide

To build a game on ETour:

1. **Inherit from ETour**
```solidity
contract YourGame is ETour {
    // Your game logic
}
```

2. **Define tier structure in constructor**
```solidity
constructor() {
    uint8[] memory prizes = new uint8[](2);
    prizes[0] = 100;
    prizes[1] = 0;
    
    _registerTier(0, 2, 10, 0.001 ether, Mode.Classic, 
                  30 minutes, 10 minutes, 1 hours, prizes);
}
```

3. **Implement abstract functions**
- `_createMatchGame` — Set up initial game state
- `_resetMatchGame` — Clean up after match
- `_getMatchResult` — Return winner/draw/status
- `_getMatchPlayers` — Return player addresses
- `_initializeMatchForPlay` — Prepare for active play
- `_completeMatchWithResult` — Finalize with outcome
- `_setMatchPlayer` — Assign player to slot
- `_setMatchTimeoutState` — Update timeout tracking
- `_getMatchTimeoutState` — Read timeout state

4. **Add your move function**
```solidity
function makeMove(uint8 tierId, uint8 instanceId, uint8 round, uint8 match, /* game-specific params */) external {
    // Validate move
    // Update game state
    // Check for win/draw
    // If game over, call _completeMatch()
}
```

5. **Deploy and configure frontend**

---

## Appendix B: Economic Projections

Conservative scenario (1,000 daily active players):

| Metric | Daily | Monthly | Yearly |
|--------|-------|---------|--------|
| Tournaments | 300 | 9,000 | 108,000 |
| Entry Volume | 3 ETH | 90 ETH | 1,080 ETH |
| Prize Pools | 2.7 ETH | 81 ETH | 972 ETH |
| Operational Revenue | 0.3 ETH | 9 ETH | 108 ETH |

At ETH = $2,000, this yields ~$216,000/year operational revenue. It's more than sufficient for hosting, development, and maintenance.

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
