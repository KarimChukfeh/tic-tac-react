## Table of Contents

**1. Getting Started**
- [1.1: What is ETour?](#11-what-is-etour)
- [1.2: How it Works](#12-how-it-works)
- [1.3: What You Need](#13-what-you-need)
- [1.4: The Five Steps](#14-the-five-steps)

**2. Lobbies & Enrollment**
- [2.1: Creating a Lobby](#21-creating-a-lobby)
- [2.2: Enrolling in a Lobby](#22-enrolling-in-a-lobby)
- [2.3: Prize Pool](#23-prize-pool)

**3. Matches & Play**
- [3.1: How Matches Work](#31-how-matches-work)
- [3.2: Draws](#32-draws)

**4. Resolution**
- [4.0: Taxonomy Overview](#40-taxonomy-overview)
- [4.1: R0 - Normal Resolution](#41-r0---normal-resolution)
- [4.2: R1 - Draw Resolution](#42-r1---draw-resolution)
- [4.3: R2 - Uncontested Finalist](#43-r2---uncontested-finalist)
- [4.4: EL0 - Canceled Tournament](#44-el0---canceled-tournament)
- [4.5: EL2 - Abandoned Tournament](#45-el2---abandoned-tournament)
- [4.6: ML1 - Match Timeout](#46-ml1---match-timeout)
- [4.7: ML2 - Advanced Player Wins via Stalled Semifinal](#47-ml2---advanced-player-wins-via-stalled-semifinal)
- [4.8: ML3 - Outsider Replaces Both Players](#48-ml3---outsider-replaces-both-players)

**5. Anti-Griefing**
- [5.1: What's Griefing?](#51-whats-griefing)
- [5.2: Enrollment Escalations](#52-enrollment-escalations)
  - [5.2.1: EL1 — Force-Start Tournament](#521-el1--force-start-tournament-after-enrollment-window-expires)
  - [5.2.2: EL1* — Extend Enrollment Window](#522-el1--extend-enrollment-window-when-solo-enrolled)
  - [5.2.3: EL2 — Claim Abandoned Prize Pool](#523-el2--claim-abandoned-prize-pool-when-tournament-never-started)
- [5.3: Match Escalations](#53-match-escalations)
  - [5.3.1: ML1 — Claim Victory by Opponent Timeout](#531-ml1--claim-victory-by-opponent-timeout)
  - [5.3.2: ML2 — Eliminate Both Players in a Stalled Match](#532-ml2--eliminate-both-players-in-a-stalled-match)
  - [5.3.3: ML3 — Replace Players in an Abandoned Match](#533-ml3--replace-players-in-an-abandoned-match)

**6. FAQ**
- [6.1: What if nobody joins my lobby?](#61-what-if-nobody-joins-my-lobby)
- [6.2: What if my opponent disconnects?](#62-what-if-my-opponent-disconnects)
- [6.3: What if all matches in a round draw?](#63-what-if-all-matches-in-a-round-draw)
- [6.4: What if I'm the only finalist left?](#64-what-if-im-the-only-finalist-left)
- [6.5: What if both finalists stall?](#65-what-if-both-finalists-stall)
- [6.6: What if I run out of time on my clock?](#66-what-if-i-run-out-of-time-on-my-clock)
- [6.7: Can I withdraw after enrolling?](#67-can-i-withdraw-after-enrolling)
- [6.8: What happens to my ETH if the tournament never starts?](#68-what-happens-to-my-eth-if-the-tournament-never-starts)

**[7. Appendix](#7-appendix)**

---

## 1. Getting Started

### 1.1: What is ETour?

ETour is a fully on-chain tournament platform. You compete in skill-based games against real opponents over ETH stakes. 

Every move is a transaction. Every outcome is immutable. Every payout is instant and automatic.

No accounts, no admins, no intermediaries.

> ETour is not a casino. There is no house edge, no randomness, no luck.
> 
> The best player wins. The winner gets paid.

### 1.2 How it Works

You decide who competes and what's at stake:

1) Create a lobby by configuring its **player count** and **entry fee**. 

2) Share it with your friends, community, or whoever you want to challenge. 

3) Players enrol by paying the entry fee.

4) Once the last spot fills, matches begin automatically. 

5) Winners advance. Losers are eliminated. 

6) The champion takes **the entire prize pool** (95% of all entry fees).

### 1.3: What You Need

To play on ETour you need three things:

- **A wallet** Your wallet is your identity on ETour. No username, no email, no account. Just a wallet address.
- **ETH on Arbitrum** All entry fees and payouts are in ETH on the Arbitrum network. Make sure your wallet is funded before you enroll.
- **A browser** ETour runs in any modern browser. No downloads, no installs.

If you're new to Arbitrum, you'll need to bridge ETH from Ethereum mainnet to Arbitrum. 

Gas fees on Arbitrum are minimal, typically less than a $0.02 per transaction.

### 1.4: The Five Steps

Everything on ETour follows the same five steps regardless of which game you're playing.

**Step 1: Connect Your Wallet**
Connect your Arbitrum wallet to etour.games. Your wallet is your player ID. No signup required.

**Step 2: Configure Your Lobby**
Choose your game, set the number of players (2 to 32), and set the entry fee per player (0.0001 ETH to 1 ETH). Once your lobby is created, you are automatically enrolled as the first participant and receive a unique invite link.

**Step 3: Invite Your Foes**
Share your invite link with whoever you want to compete against: friends, your community, anyone. Anyone with the link can join by paying the entry fee. No account needed on their end either.

**Step 4: Play Your Matches**
The moment the last spot is filled, the tournament starts automatically. No admin needed. Players are paired into matches. Winners advance round by round until the finals.

**Step 5: Winner Takes All**
When the tournament concludes, the prize pool is distributed instantly and automatically to the winner's wallet. No withdrawal, no waiting, no approval. The ETH arrives the moment the final match resolves.

## 2. Lobbies & Enrollment

### 2.1: Creating a Lobby

A lobby is your tournament instance. You configure it, you own it, you share it.

**Player Count**
Lobbies support 2 to 32 players in powers of two: 2, 4, 8, 16, or 32. The player count determines the bracket size. A 2-player lobby is a heads-up duel. A 32-player lobby is a full five-round elimination bracket.

**Entry Fee**
You set the entry fee per player. The minimum is 0.0001 ETH and the maximum is 1 ETH. Every player who enrolls pays the same entry fee. The total prize pool is the entry fee multiplied by the number of players.

**Your Invite Link**
Every lobby comes with a unique invite link the moment it's created. Share this link with whoever you want to compete against. Anyone with the link can enroll directly by paying the entry fee. No account needed.

### 2.2: Enrolling in a Lobby

**How Enrollment Works**
To enroll in a lobby, you pay the entry fee. The moment your ETH transaction confirms, you are enrolled. No forms, no approvals, no waiting for an admin. Your ETH goes directly into the prize pool smart contract.

**What Happens When the Lobby Fills**
The moment the last spot is filled, the tournament starts automatically. Players are paired into first-round matches immediately. No admin trigger needed.

**Enrollment Window and Timer**
If the lobby doesn't fill immediately, there is an enrollment window during which players can continue to join. The enrollment window can be reset by the lobby creator while they are still the sole enrollee. This gives creators flexibility to keep the lobby open while they look for opponents.

Once at least two players are enrolled and the enrollment window expires, enrolled players can force-start the tournament with however many players have joined so far. A 4-player lobby with only 3 enrollees can start as a 3-player tournament. The prize pool adjusts accordingly.

If you are the sole enrollee and decide you no longer want to wait, you can cancel the lobby at any time and receive a full refund of your entry fee.

### 2.3: Prize Pool

**How the Pool is Calculated**
The prize pool is simple: entry fee multiplied by the number of enrolled players.

For example, a 4-player lobby with a 0.01 ETH entry fee has a pot of 0.04 ETH.

**Fee Breakdown**
Every pot is split two ways at the moment the tournament resolves:

| Recipient | Share |
|---|---|
| Tournament winner | 95% |
| Game developer | 5% |

These percentages are hardcoded in the smart contract and cannot be changed by anyone. No governance, no admin adjustments, no surprises.

**Example: 4-player lobby at 0.01 ETH entry fee**

| Allocation | Amount |
|---|---|
| Total pot (100%) | 0.040 ETH |
| Tournament winner (95%) | 0.038 ETH |
| Game developer (5%) | 0.002 ETH |

**When and How You Get Paid**
The winner receives their ETH the moment the final match resolves. No withdrawal step, no waiting period, no approval required. The smart contract sends the prize pool directly to the winner's wallet automatically.

If a tournament resolves in an unusual way, whether via escalation, draw, or abandonment, the prize pool is distributed according to the resolution reason. See Section 4: Resolution for full details on every possible payout scenario.

## 3. Matches & Play

### 3.1: How Matches Work

**Single Elimination Brackets**
ETour uses single elimination brackets. Every match has one winner and one loser. Losers are eliminated. Winners advance. The last player standing wins the tournament and claims the prize pool.

| Players | Rounds |
|---|---|
| 2 | 1 (finals only) |
| 4 | 2 (semifinals + finals) |
| 8 | 3 (quarterfinals + semifinals + finals) |
| 16 | 4 rounds |
| 32 | 5 rounds |

Matches within the same round run simultaneously. In an 8-player tournament, four matches run at the same time in round one. Winners of those four matches are then paired into two semifinal matches, and so on.

**Making Moves On-Chain**
Every move you make is a blockchain transaction. This means every move costs a small amount of gas, typically less than $0.01 on Arbitrum. Make sure your wallet has enough ETH to cover both your entry fee and the gas cost of your moves.

Every move is permanent and publicly verifiable. Nobody can alter a move after it's been made. Nobody can reverse an outcome after it's been determined.

**Player Timer**
Each player has a time bank for their moves. You start with a base time and receive a small increment added back to your clock after each move you make.

Time management is part of the game. Run low on time and you must play faster, potentially making mistakes under pressure. Your opponent knows when you're running low and may try to complicate positions to exploit your time trouble.

If your clock hits zero, your opponent can claim victory by timeout. See 4.6 (ML1) for full details.

### 3.2: Draws

**What Causes a Draw**
Some games can end in draws. In chess, draws can occur via perpetual check, insufficient material, the fifty-move rule, or threefold repetition. In Tic-Tac-Toe, perfect play always results in a draw.

**How Draws Are Handled Mid-Tournament**
In regular rounds, a draw means both players are eliminated. Neither player advances to the next round. This creates natural pressure to play for wins rather than safe draws. A draw is as bad as a loss.

**Odd Advancement**
When draws eliminate players mid-tournament, the bracket may produce an odd number of remaining players. ETour handles this automatically. One player receives a walkover and advances without playing. Orphaned winners advance automatically and incomplete brackets consolidate remaining players. These are deliberate design decisions ensuring tournaments always resolve fairly.

**Final Round Draw Exceptions**
The final round is handled differently. If the finals match ends in a draw, the two finalists split the prize pool equally. They've proven themselves equally matched and share the victory.

If all matches in a round end in draws simultaneously, the tournament cannot continue. All remaining players split the prize pool equally.

These are resolution reasons 4.2 (R1) and 4.3 (R2). See Section 4: Resolution for full details.

## 4. Resolution

### 4.0: Taxonomy Overview

**What is a Resolution Reason?**
Every match and tournament on ETour end for a reason. That reason is codified as a resolution code, a short identifier that tells you exactly why and how a match or tournament concluded.

Resolution reasons exist at two levels:

- **Tournament level:** The entire tournament ends and the prize pool is distributed.
- **Match level:** A single match or an entire round of matches resolves due to the same underlying event.

Understanding resolution reasons helps you know exactly what happened to your tournament, why your ETH was distributed the way it was, and what your options were at any point during the process.

**Full List of Resolution Codes**

| Code | Name | Trigger |
|---|---|---|
| R0 | Normal resolution | Clear winner, no complications |
| R1 | Draw resolution | Match ended in a draw |
| R2 | Uncontested finalist | Sole finalist wins because of a draw in the other semifinals |
| EL0 | Canceled tournament | Solo enrollee cancelled the instance |
| EL2 | Abandoned tournament | Insufficient enrollment, outsider claimed prize pool |
| ML1 | Match timeout | Player's clock hit zero, opponent claimed victory |
| ML2 | Advanced player wins | Advanced player eliminated both stalled players |
| ML3 | Outsider replaces both players | Outsider replaced both stalled players |

### 4.1: R0 - Normal Resolution

**What it is**
R0 is the happy path. The tournament runs exactly as designed: full enrollment, all matches played to completion, no timeouts, no draws, and no escalations. One player wins every match they play, advances through the bracket, wins the finals, and claims the prize pool.

**What triggers it**
The final match concludes with a clear winner.

**What happens**
The winner receives 95% of the total prize pool instantly and automatically. ETour receives 5%. No action required from anyone.

**Payout example**
8-player lobby, 0.01 ETH entry fee, 0.08 ETH total pool:
- Winner receives: 0.076 ETH
- ETour receives: 0.004 ETH

### 4.2: R1 - Draw Resolution

**What it is**
R1 occurs when a draw ends the tournament. This happens in one of two ways: the finals match ends in a draw, or every match in a round ends in a draw simultaneously.

**What triggers it**
- Finals match ends in a draw, OR
- All matches in a round end in draws, leaving no players to advance

**What happens**
The remaining players, either the two finalists in a finals draw or all surviving players in a full-round draw, split the prize pool equally. Each receives an equal share of the 95% prize pool.

**Payout example: finals draw**
4-player lobby, 0.01 ETH entry fee, 0.04 ETH total pool, 0.038 ETH prize pool (95%):
- Each finalist receives: 0.019 ETH
- ETour receives: 0.002 ETH

**Important note**
In regular rounds, a draw eliminates both players and neither advances. R1 only applies when a draw occurs in the finals or when an entire round draws simultaneously with no survivors to continue the tournament.

### 4.3: R2 - Uncontested Finalist

**What it is**
R2 occurs when a player reaches the finals but their opponent never materializes because the other semifinal ended in a draw.

**What triggers it**
A player advances to the finals. The other semifinal match ends in a draw, eliminating both semifinalists. The waiting finalist is now the only remaining player in the tournament.

**What happens**
The uncontested finalist wins the tournament by default without playing the final match. They receive 95% of the prize pool instantly.

**Example scenario**
8-player tournament. You win your quarterfinal and semifinal. You're in the finals waiting for your opponent. The other semifinal ends in a draw, and both players are eliminated. You are now the only finalist. The tournament resolves as R2. You win.

**Important note**
R2 is not an escalation. No timer, no trigger, no action required. The moment the other semifinal draws and leaves you as the only finalist, the tournament resolves automatically in your favor.

### 4.4: EL0 - Canceled Tournament

**What it is**
EL0 occurs when a lobby creator cancels their lobby before anyone else enrolls.

**What triggers it**
The lobby creator is the sole enrollee and chooses to cancel the lobby.

**What happens**
The tournament is canceled. The creator receives a full 100% refund of their entry fee. No fees are taken. No prize pool is distributed.

**Important note**
EL0 is only available while you are the sole enrollee. The moment a second player enrolls, you can no longer cancel the lobby. Your entry fee is committed to the prize pool.

### 4.5: EL2 - Abandoned Tournament

**What it is**
EL2 occurs when a lobby attracts some enrollees but not enough to fill, and the enrolled players fail to force-start the tournament within the enrollment window. The tournament is considered abandoned and an outsider can claim the entire prize pool.

**What triggers it**
- The enrollment window expires with fewer players than the lobby was configured for, AND
- No enrolled player triggers EL1 to force-start the tournament, AND
- 5 minutes pass after EL1 becomes available without action

At this point, EL2 becomes available to anyone, including players who never enrolled.

**What happens**
Any player, even one who never enrolled, can claim the entire prize pool by triggering EL2. The outsider receives 95% of the prize pool. ETour receives 5%. All enrolled players lose their entry fees.

**Why this exists**
ETour cannot allow ETH to sit trapped in an abandoned prize pool forever. EL2 guarantees that someone always has an incentive to resolve a stuck tournament. The threat of EL2 also incentivizes enrolled players to act. If you're enrolled and don't trigger EL1 when you should, you risk losing your entire entry fee to an outsider.

**Important note**
EL2 is the nuclear option. It exists to ensure tournaments never get permanently stuck. If you're enrolled in a lobby that isn't filling up, trigger EL1 to force-start the tournament before EL2 becomes available to outsiders.

### 4.6: ML1 - Match Timeout

**What it is**
ML1 occurs when a player's clock hits zero during a match. Their opponent can claim victory by forfeit.

**What triggers it**
A player's timer reaches zero during an active match.

**What happens**
The opponent can claim victory immediately. The timed-out player is eliminated. The match resolves as ML1. The winner advances normally.

If ML1 occurs in the finals, the tournament resolves immediately. The claiming player wins the tournament and receives the prize pool.

**Scope**
ML1 can apply at three levels:
- **Tournament level:** The finals match resolves via timeout. The tournament ends and the prize pool is distributed.
- **Match level:** One match resolves via timeout. The winner advances. The tournament continues.

**Important note**
Your opponent is not required to claim victory immediately when your clock hits zero. They can choose to wait. But once your clock is at zero, the option is available to them at any time. Don't rely on your opponent not noticing.

### 4.7: ML2 - Advanced Player Wins via Stalled Semifinal

**What it is**
ML2 occurs when a player who has already advanced to a later round, typically the finals, is being held up by a stalled match in an earlier round. ML2 allows that advanced player to step in, eliminate both stalled players, and clear their path.

**What triggers it**
- A match is stalled (neither player is making moves), AND
- A player has already advanced past that round and is waiting for it to resolve, AND
- 2 minutes pass after ML1 becomes available for that stalled match without the stalled players' opponent claiming it

At this point ML2 becomes available to any player who has already advanced past that round.

**What happens**
The advanced player triggers ML2. Both stalled players are eliminated. The bracket advances. If the advanced player was waiting in the finals and the only remaining semifinal was the stalled one, the advanced player wins the tournament by default as an uncontested finalist. The tournament resolves.

**Why this exists**
Your tournament progress should not be held hostage by two players who stop making moves in an earlier round. ML2 gives advanced players the power to protect their investment and keep the tournament moving.

**Important note**
The mere existence of ML2 puts pressure on stalled players to act. If you're in a stalled match and your opponent hasn't claimed 4.6 (ML1) yet, you're both at risk of being eliminated by an advanced player stepping in. Stalling doesn't just hurt your opponent. It puts both of you at risk.

### 4.8: ML3 - Outsider Replaces Both Players

**What it is**
ML3 is the match-level nuclear option. If both players in a match have stalled and no advanced player has triggered ML2, any outsider, even someone not enrolled in the tournament, can step in, replace both stalled players, and take their spot in the bracket.

**What triggers it**
- A match is stalled, AND
- ML2 is available but no advanced player has triggered it, AND
- 2 minutes pass after ML2 becomes available without action

At this point ML3 becomes available to anyone.

**What happens**
An outsider triggers ML3. Both stalled players are eliminated and replaced by the outsider. The outsider takes their position in the bracket and continues competing. If ML3 is triggered in the finals, the outsider wins the tournament immediately and receives the prize pool.

**Why this exists**
ETour guarantees that every tournament resolves. ML3 is the final guarantee. If nobody else acts, a profit-motivated outsider always will. The prize pool is always claimed. ETH never gets permanently stuck.

**Scope**
ML3 can apply at multiple levels:
- **Match level:** Outsider replaces both stalled players in a non-finals match and continues competing in the tournament.
- **Tournament level:** Outsider triggers ML3 in the finals match and wins the tournament outright.

**Important note**
The mere existence of ML3 creates a cascading pressure effect across all three match escalation levels. Stalled players know their opponent can claim 4.6 (ML1). Opponents who don't claim 4.6 (ML1) risk having advanced players trigger 4.7 (ML2). Advanced players who don't trigger 4.7 (ML2) risk an outsider stepping in via 4.8 (ML3). Inaction at every level is punished. Action at every level is rewarded.

## 5. Anti-Griefing

### 5.1: What's Griefing?

Griefing is when players intentionally disrupt a game and prevent it from progressing or concluding.

Competitive tournaments can get stuck during:

1. **Enrollment** - some players enroll, but not enough to start the tournament.
2. **Match Play** - one or both players in a match stop making moves.

Legacy systems rely on centralized authorities to resolve these stalls, which requires trust in a person or a company.

> ETour rewards ETH to whoever steps in to resolve these scenarios.
>
> Rewards are instant, blockchain-enforced, and don't require a centralized authority.

- It's fair and simple, and follows common sense
- The closer you are to the prize, the sooner you get a chance to resolve a stall
- Payouts are instant and impossible to stop
- **Griefing is impossible when stallers lose and resolvers earn real ETH**

### 5.2: Enrollment Escalations

Enrollment escalations apply during the enrollment phase, after a lobby is created and before the tournament starts.

#### 5.2.1: EL1 — Force-Start Tournament After Enrollment Window Expires

**What it is**
EL1 gives enrolled players the power to start the tournament before the lobby is completely full.

**When it becomes available**
The enrollment window expires and at least two players are enrolled, even if the lobby hasn't reached its configured player count.

**Who can trigger it**
Any enrolled player.

**What happens**
The player triggers EL1. The tournament starts immediately with however many players have enrolled so far. A lobby configured for 8 players with only 5 enrollees starts as a 5-player tournament. The bracket and prize pool adjust accordingly.

**Why it matters**
Without EL1, enrolled players would be stuck waiting indefinitely for a lobby that may never fill. EL1 gives them autonomy: start competing now with whoever showed up, rather than waiting for a full lobby that may never arrive.

#### 5.2.2: EL1* — Extend Enrollment Window When Solo Enrolled

**What it is**
EL1* is a special variant of EL1 that applies when you are the only enrolled player. Rather than force-starting a one-player tournament (which is not possible), EL1* gives you the option to reset the enrollment window and keep looking for opponents.

**When it becomes available**
The enrollment window expires and you are the sole enrollee.

**Who can trigger it**
The sole enrolled player only.

**What happens**
The enrollment window resets. You continue waiting for other players to join. You can trigger EL1* as many times as you want while you remain the sole enrollee.

If you no longer want to wait, you can cancel the lobby instead and receive a full refund. See 4.4 (EL0).

**Why it matters**
EL1* prevents a solo enrollee from being forced into an unresolvable state. You keep control: reset and wait, or cancel and leave. Your ETH is never trapped.

#### 5.2.3: EL2 — Claim Abandoned Prize Pool When Tournament Never Started

**What it is**
EL2 is the final enrollment escalation. If EL1 was available but no enrolled player triggered it, the prize pool sits idle. EL2 opens the prize pool to anyone, including complete outsiders, to claim.

**When it becomes available**
5 minutes after EL1 becomes available without any enrolled player triggering it.

**Who can trigger it**
Anyone, including players who never enrolled in the tournament.

**What happens**
The outsider claims the entire prize pool. They receive 95% of the total pool. ETour receives 5%. All enrolled players lose their entry fees. The tournament is terminated.

**Why it matters**
ETH cannot sit trapped in an abandoned prize pool forever. EL2 guarantees resolution. The threat of EL2 creates strong pressure on enrolled players to trigger EL1 before the window closes. If you don't act, a stranger will, and they'll take your money.

**The pressure dynamic**
The mere existence of EL2 is what makes EL1 urgent. Enrolled players who ignore EL1 risk losing everything to an outsider. This ensures that tournaments either start or get resolved, never stuck in limbo indefinitely.

### 5.3: Match Escalations

Match escalations apply during active gameplay, after the tournament has started and matches are in progress.

#### 5.3.1: ML1 — Claim Victory by Opponent Timeout

**What it is**
ML1 is the first and most direct match escalation. When your opponent's clock hits zero, you can claim victory by forfeit.

**When it becomes available**
Your opponent's timer reaches zero.

**Who can trigger it**
The active opponent in the match, the player whose clock has not hit zero.

**What happens**
You claim victory. Your opponent is eliminated. The match resolves as ML1. You advance to the next round normally.

**Why it matters**
Without ML1, a player could simply stop making moves and hold their opponent hostage indefinitely. ML1 ensures that time is a real resource with real consequences. Run out of time and your opponent can end the match immediately.

**The pressure dynamic**
ML1 puts full responsibility on players to manage their time. Your opponent is not required to claim immediately. They may choose to wait, but the option is always available to them once your clock hits zero. Playing on a nearly depleted clock is a significant strategic liability.

#### 5.3.2: ML2 — Eliminate Both Players in a Stalled Match

**What it is**
ML2 allows players who have already advanced to a later round to eliminate both players in a stalled earlier-round match that is blocking their progress.

**When it becomes available**
2 minutes after ML1 becomes available for a stalled match without the opponent claiming it.

**Who can trigger it**
Any player who has already advanced past the round containing the stalled match.

**What happens**
The triggering player eliminates both stalled players. The stalled match resolves. The bracket advances. If the triggering player was waiting in the finals and this was the only remaining semifinal, they become the uncontested finalist and win the tournament. See 4.3 (R2).

**Why it matters**
Your tournament progress should not be held hostage by two players who stop making moves in an earlier round. ML2 gives advanced players the power to protect their investment and keep the tournament moving.

**The pressure dynamic**
The mere existence of ML2 puts pressure on stalled players to act. If you're in a stalled match and your opponent hasn't claimed ML1 yet, you're both at risk of being eliminated by an advanced player stepping in. Stalling doesn't just hurt your opponent. It puts both of you at risk.

#### 5.3.3: ML3 — Replace Players in an Abandoned Match

**What it is**
ML3 is the final match escalation. If a match has stalled and no advanced player has triggered ML2, ML3 opens the match to complete outsiders. Anyone can step in, replace both stalled players, and take their spot in the bracket.

**When it becomes available**
2 minutes after ML2 becomes available without any advanced player triggering it.

**Who can trigger it**
Anyone, including players not enrolled in the tournament and complete strangers.

**What happens**
The outsider replaces both stalled players. They take the position in the bracket and continue competing. If ML3 is triggered in the finals, the outsider wins the entire tournament immediately and receives the prize pool.

**Why it matters**
ML3 is the final guarantee that every tournament resolves. If nobody with skin in the game acts, a profit-motivated outsider always will. The prize pool is always claimed. ETH never gets permanently stuck.

**The pressure dynamic**
The existence of ML3 creates a cascading pressure effect across all three match escalation levels:

- Stalled players know their opponent can claim 5.3.1 (ML1) at any moment
- Opponents who don't claim ML1 risk having advanced players trigger 5.3.2 (ML2) and eliminate everyone
- Advanced players who don't trigger ML2 risk an outsider stepping in via 5.3.3 (ML3) and taking a spot that should have been theirs to protect

Inaction at every level is punished. Action at every level is rewarded. This is ETour's core anti-griefing guarantee.

## 6. FAQ

### 6.1: What if nobody joins my lobby?

If you create a lobby and nobody else enrolls, you have two options:

**Option 1: Reset the enrollment window (5.2.2)**
While you are the sole enrollee, you can reset the enrollment window at any time to keep waiting for opponents. You can do this as many times as you want. Your ETH stays in the prize pool and the lobby remains open.

**Option 2: Cancel the lobby (4.4 (EL0))**
If you decide you no longer want to wait, you can cancel the lobby at any time while you are still the sole enrollee. You receive a full 100% refund of your entry fee. No fees are taken.

**Important:** The moment a second player enrolls, you lose the ability to cancel. Your entry fee is committed to the prize pool from that point forward.

### 6.2: What if my opponent disconnects?

From ETour's perspective, a disconnected opponent is identical to a stalling opponent. ETour has no way to distinguish between a player who disconnected accidentally and one who is deliberately stalling. The escalation system handles both the same way.

If your opponent stops making moves:

1. Wait for their timer to hit zero
2. Claim victory via 5.3.1 (ML1). Your opponent is eliminated, and you advance.

Do not wait indefinitely for a disconnected opponent to return. Once their clock hits zero, claim your victory immediately. The option is available to you and it does not expire.

### 6.3: What if all matches in a round draw?

If every match in a round ends in a draw simultaneously, all players in those matches are eliminated. If no players remain to advance, the tournament cannot continue.

In this case the tournament resolves as 4.2 (R1). All surviving players at the time of the full-round draw split the prize pool equally.

This scenario is rare but fully handled. No ETH is ever lost or stuck. The prize pool is always distributed.

### 6.4: What if I'm the only finalist left?

If you have advanced to the finals but your opponent never materializes because the other semifinal ended in a draw, eliminating both semifinalists, you are the uncontested finalist.

The tournament resolves as 4.3 (R2). You win by default without playing the final match. You receive 95% of the prize pool instantly. No action required on your part.

### 6.5: What if both finalists stall?

If both players in the finals stop making moves, the escalation system kicks in:

1. **5.3.1 (ML1) becomes available:** each finalist can claim victory over the other by timeout once their opponent's clock hits zero
2. **5.3.2 (ML2) does not apply:** there are no advanced players in the finals
3. **5.3.3 (ML3) becomes available:** 2 minutes after ML2 would have been available, any outsider can step in, replace both finalists, and win the entire tournament

If you are a finalist and both you and your opponent have stalled, be aware that an outsider can step in via 5.3.3 (ML3) and claim the prize pool that should have been yours. Claim ML1 the moment your opponent's clock hits zero. Do not wait.

### 6.6: What if I run out of time on my clock?

If your timer hits zero, your opponent can claim victory over you via 5.3.1 (ML1) at any moment.

Time management is your responsibility. If your clock hits zero, your opponent can claim the match.

**Prevention:** Manage your time bank carefully. The timer gives you a small increment after each move you make, so staying active keeps your clock healthier than going silent for long periods.

### 6.7: Can I withdraw after enrolling?

No. Once you have enrolled in a lobby by paying the entry fee, your ETH is committed to the prize pool. There is no withdrawal mechanism.

This is by design. Withdrawals would allow players to sabotage tournaments by enrolling and then pulling out at the last moment. The no-withdrawal rule protects all enrolled players and ensures the prize pool is always intact.

If you enrolled in a lobby that never starts because not enough players join, your ETH is protected by the escalation system. 5.2.1 (EL1) lets enrolled players force-start the tournament, and 5.2.3 (EL2) ensures the prize pool is always claimed even if the tournament never starts.

### 6.8: What happens to my ETH if the tournament never starts?

Your ETH is never permanently trapped. ETour guarantees resolution in every scenario through the escalation system.

If you are enrolled in a lobby that never fills:

- **You can trigger 5.2.1 (EL1)** to force-start the tournament with however many players have joined
- **If you don't trigger EL1**, an outsider can trigger 5.2.3 (EL2) after the window closes and claim the entire prize pool, including your entry fee

The safest path: if your lobby isn't filling and the enrollment window is expiring, trigger EL1 yourself. Start the tournament with whoever showed up. Don't wait for EL2 to become available to outsiders.

## 7. Appendix


**Entry fee**
The amount of ETH each player pays to enroll in a lobby. Set by the lobby creator. All entry fees pool together to form the prize pool.

**Enrollment window**
The time period during which players can join a lobby after it has been created.

**Lobby**
The pre-tournament space where players gather and enroll. A lobby is configured by its creator with a player count and entry fee. Once the lobby fills, it becomes an active tournament.

**Prize pool**
The total ETH at stake in a tournament. Equals to 95% of the ETH entry fee multiplied by the number of enrolled players.

**Instance**
The smart contract deployment that represents a specific tournament. Each lobby creates its own on-chain tournament instance.

**Player timer**
The timer each player gets to make their moves during match. 

**Escalation level**
A time-triggered intervention that becomes available when a tournament or match stalls. Each escalation level opens to a wider group of potential triggers over time.

**Resolution reason**
The codified explanation for how a match or tournament ended. Every match and every tournament resolve with exactly one resolution reason. See 4.0 for the full taxonomy.


---

*ETour operates autonomously according to its smart contract code. This manual describes the platform's mechanics and rules. Always verify contract implementations before interacting.*
