# Escalation CTA Visibility Fix

## Problem Statement

Escalation CTAs were not displaying correctly based on user enrollment status. The issues were:

1. **Escalation 2 CTA** showed to EVERYONE instead of only non-enrolled players
2. **Escalation 1 CTA** continued showing even after Escalation 2 started
3. **TournamentBracket** view had NO escalation CTAs, only showing a text message
4. Escalation CTAs didn't respect enrollment status properly

## Requirements

### Escalation 1: Force Start Tournament
- **Who can see it:** ONLY enrolled players
- **When:** After enrollment window expires, before Escalation 2 starts
- **Where:** Tournament cards (home screen) AND tournament bracket/lobby view
- **Action:** Force start the tournament

### Escalation 2: Claim Abandoned Pool
- **Who can see it:** ONLY non-enrolled players
- **When:** After Escalation 2 window starts
- **Where:** Tournament cards (home screen) AND tournament bracket/lobby view
- **Action:** Claim the abandoned enrollment pool

### Visibility Rules
```
Escalation 1 CTA:
  Show IF: tournamentStatus === 0 (Pending)
       AND escalationState.canStartEscalation1 === true
       AND isEnrolled === true
       AND escalationState.canStartEscalation2 === false  // Hide when Esc2 starts

Escalation 2 CTA:
  Show IF: tournamentStatus === 0 (Pending)
       AND escalationState.canStartEscalation2 === true
       AND isEnrolled === false  // Only unenrolled players
```

## Changes Made

### 1. Fixed TournamentCard Component (Lines 750-772)

**Before:**
```jsx
{/* Escalation 1: Enrolled players can force start */}
{tournamentStatus === 0 && escalationState.canStartEscalation1 && isEnrolled && (
  <button>Force Start Tournament</button>
)}

{/* Escalation 2: Anyone can claim the abandoned pool */}
{tournamentStatus === 0 && escalationState.canStartEscalation2 && (
  <button>Claim Abandoned Pool</button>
)}
```

**After:**
```jsx
{/* Escalation 1: ONLY enrolled players can force start */}
{tournamentStatus === 0 && escalationState.canStartEscalation1 && isEnrolled && !escalationState.canStartEscalation2 && (
  <button
    onClick={() => onManualStart(tierId, instanceId)}
    disabled={loading || !account}
  >
    <Zap size={18} />
    {loading ? 'Starting...' : !account ? 'Connect Wallet to Force Start' : 'Force Start Tournament'}
  </button>
)}

{/* Escalation 2: ONLY non-enrolled players can claim abandoned pool */}
{tournamentStatus === 0 && escalationState.canStartEscalation2 && !isEnrolled && (
  <button
    onClick={() => onClaimAbandonedPool(tierId, instanceId)}
    disabled={loading || !account}
  >
    <Coins size={18} />
    {loading ? 'Claiming...' : !account ? 'Connect Wallet to Claim' : 'Claim Abandoned Pool'}
  </button>
)}
```

**Key Changes:**
- ✅ Added `!escalationState.canStartEscalation2` check to Escalation 1 (hides when Esc2 starts)
- ✅ Added `!isEnrolled` check to Escalation 2 (only non-enrolled players)
- ✅ Added `!account` check with proper messaging
- ✅ Added `disabled` state handling

### 2. Updated TournamentBracket Component Signature (Line 825)

**Before:**
```jsx
const TournamentBracket = ({
  tournamentData, onBack, onEnterMatch, onForceEliminate,
  onClaimReplacement, account, loading, syncDots, theme
}) => {
```

**After:**
```jsx
const TournamentBracket = ({
  tournamentData, onBack, onEnterMatch, onForceEliminate, onClaimReplacement,
  onManualStart, onClaimAbandonedPool, account, loading, syncDots, theme,
  escalationState, isEnrolled
}) => {
```

**Key Changes:**
- ✅ Added `onManualStart` callback prop
- ✅ Added `onClaimAbandonedPool` callback prop
- ✅ Added `escalationState` data prop
- ✅ Added `isEnrolled` boolean prop

### 3. Added Escalation CTAs to TournamentBracket (Lines 1015-1042)

**Before:**
```jsx
{countdownExpired && (
  <p className="text-orange-200 text-sm mt-2">
    Enrolled players can force-start the tournament from the tournament list.
  </p>
)}
```

**After:**
```jsx
{countdownExpired && (
  <p className="text-orange-200 text-sm mt-2">
    Enrolled players can force-start the tournament using the button below.
  </p>
)}

{/* Escalation CTAs */}
{status === 0 && escalationState && (
  <div className="mt-4">
    {/* Escalation 1: ONLY enrolled players can force start */}
    {escalationState.canStartEscalation1 && isEnrolled && !escalationState.canStartEscalation2 && (
      <button
        onClick={() => onManualStart(tierId, instanceId)}
        disabled={loading || !account}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl..."
      >
        <Zap size={18} />
        {loading ? 'Starting...' : !account ? 'Connect Wallet to Force Start' : 'Force Start Tournament'}
      </button>
    )}

    {/* Escalation 2: ONLY non-enrolled players can claim abandoned pool */}
    {escalationState.canStartEscalation2 && !isEnrolled && (
      <button
        onClick={() => onClaimAbandonedPool(tierId, instanceId)}
        disabled={loading || !account}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl..."
      >
        <Coins size={18} />
        {loading ? 'Claiming...' : !account ? 'Connect Wallet to Claim' : 'Claim Abandoned Pool'}
      </button>
    )}
  </div>
)}
```

**Key Changes:**
- ✅ Added full CTA buttons (not just text messages)
- ✅ Same visibility logic as TournamentCard
- ✅ Proper styling with gradient buttons
- ✅ Icons for visual clarity (Zap for force start, Coins for claim)

### 4. Updated TournamentBracket Invocation (Lines 4608-4637)

**Before:**
```jsx
<TournamentBracket
  tournamentData={viewingTournament}
  onBack={() => setViewingTournament(null)}
  onEnterMatch={handlePlayMatch}
  onForceEliminate={handleForceEliminateStalledMatch}
  onClaimReplacement={handleClaimMatchSlotByReplacement}
  account={account}
  loading={tournamentsLoading}
  syncDots={bracketSyncDots}
  theme={theme}
/>
```

**After:**
```jsx
{viewingTournament ? (
  (() => {
    // Calculate escalation state for this tournament
    const tournamentEscalation = calculateEscalationState(viewingTournament.firstEnrollmentTime);

    // Check if user is enrolled in this tournament
    const userIsEnrolled = viewingTournament.enrolledPlayers?.some(
      addr => addr.toLowerCase() === account?.toLowerCase()
    ) || false;

    return (
      <TournamentBracket
        tournamentData={viewingTournament}
        onBack={() => setViewingTournament(null)}
        onEnterMatch={handlePlayMatch}
        onForceEliminate={handleForceEliminateStalledMatch}
        onClaimReplacement={handleClaimMatchSlotByReplacement}
        onManualStart={handleManualStartTournament}
        onClaimAbandonedPool={handleClaimAbandonedEnrollmentPool}
        account={account}
        loading={tournamentsLoading}
        syncDots={bracketSyncDots}
        theme={theme}
        escalationState={tournamentEscalation}
        isEnrolled={userIsEnrolled}
      />
    );
  })()
) : (
  // Tournament list...
)}
```

**Key Changes:**
- ✅ Calculate `escalationState` using existing `calculateEscalationState()` function
- ✅ Determine `isEnrolled` by checking if account is in `enrolledPlayers` array
- ✅ Pass both handlers: `onManualStart` and `onClaimAbandonedPool`
- ✅ Pass computed `escalationState` and `isEnrolled` to component

## Escalation Flow Visualization

```
Timeline: Tournament Enrollment & Escalation Windows

t=0s              t=60s                 t=360s                t=960s
│                 │                     │                     │
│  Normal         │  Escalation 1      │  Escalation 2       │
│  Enrollment     │  (Enrolled only)   │  (Non-enrolled)     │
└─────────────────┴─────────────────────┴─────────────────────┘

During Normal Enrollment (0-60s):
  - Enrolled: See "Enter Tournament" button
  - Non-enrolled: See "Enroll Now" button
  - Nobody sees escalation CTAs

During Escalation 1 (60s-960s):
  - Enrolled: See "Force Start Tournament" CTA ⚡
  - Non-enrolled: See "Enroll Now" button (still can enroll)
  - Escalation 2 CTA hidden for everyone

During Escalation 2 (960s+):
  - Enrolled: See "Enter Tournament" button (Esc1 CTA gone)
  - Non-enrolled: See "Claim Abandoned Pool" CTA 💰
  - Force Start CTA hidden for everyone
```

## Testing Checklist

### Tournament Card (Home Screen)

**Scenario 1: Normal Enrollment (Enrolled User)**
- [ ] See "Enter Tournament" button
- [ ] Do NOT see "Force Start Tournament"
- [ ] Do NOT see "Claim Abandoned Pool"

**Scenario 2: Normal Enrollment (Non-Enrolled User)**
- [ ] See "Enroll Now" button
- [ ] Do NOT see "Force Start Tournament"
- [ ] Do NOT see "Claim Abandoned Pool"

**Scenario 3: Escalation 1 Active (Enrolled User)**
- [ ] See "Force Start Tournament" button (orange/red gradient)
- [ ] Do NOT see "Claim Abandoned Pool"
- [ ] Button is clickable
- [ ] Shows "Connect Wallet to Force Start" if not connected

**Scenario 4: Escalation 1 Active (Non-Enrolled User)**
- [ ] See "Enroll Now" button
- [ ] Do NOT see "Force Start Tournament"
- [ ] Do NOT see "Claim Abandoned Pool"

**Scenario 5: Escalation 2 Active (Enrolled User)**
- [ ] See "Enter Tournament" button
- [ ] Do NOT see "Force Start Tournament" (hidden when Esc2 starts)
- [ ] Do NOT see "Claim Abandoned Pool" (only for non-enrolled)

**Scenario 6: Escalation 2 Active (Non-Enrolled User)**
- [ ] See "Claim Abandoned Pool" button (red gradient)
- [ ] Do NOT see "Force Start Tournament"
- [ ] Button is clickable
- [ ] Shows "Connect Wallet to Claim" if not connected

### Tournament Bracket/Lobby View

**All scenarios above apply here too, with the same visibility rules!**

Additional checks:
- [ ] CTAs appear below the countdown timer
- [ ] CTAs match the styling of tournament card CTAs
- [ ] Icons display correctly (Zap ⚡ for Force Start, Coins 💰 for Claim)
- [ ] Buttons are full-width and properly styled

## Technical Notes

### Why the IIFE (Immediately Invoked Function Expression)?

In the TournamentBracket invocation (line 4610), we use:
```jsx
{viewingTournament ? (
  (() => {
    const tournamentEscalation = calculateEscalationState(...);
    const userIsEnrolled = ...;
    return <TournamentBracket ... />;
  })()
) : (...)}
```

This is necessary because:
1. We need to compute values (`escalationState`, `isEnrolled`) before passing them
2. JSX doesn't allow multi-line statements in conditionals
3. IIFE lets us execute multiple statements and return JSX

### Alternative Approaches Considered

**Option 1: useMemo at top level**
```jsx
const tournamentEscalation = useMemo(() =>
  viewingTournament ? calculateEscalationState(...) : null,
  [viewingTournament]
);
```
❌ Rejected: Would calculate for ALL tournaments, not just viewed one

**Option 2: Separate component**
```jsx
const TournamentBracketWrapper = ({ tournament, ... }) => {
  const escalation = calculateEscalationState(...);
  return <TournamentBracket escalationState={escalation} ... />;
};
```
✅ Alternative: Could work but adds unnecessary component layer

**Option 3: IIFE (chosen)**
```jsx
{viewingTournament ? (() => {
  const escalation = calculateEscalationState(...);
  return <TournamentBracket escalationState={escalation} />;
})() : null}
```
✅ Chosen: Minimal, clear, and scoped to only when viewing tournament

## Files Modified

1. **src/App.jsx**
   - Lines 750-772: TournamentCard escalation CTA logic
   - Line 825: TournamentBracket component signature
   - Lines 1015-1042: TournamentBracket escalation CTAs
   - Lines 4608-4637: TournamentBracket invocation with escalation data

## Breaking Changes

None. This is purely additive functionality with improved visibility logic.

## Dependencies

Uses existing functions:
- `calculateEscalationState(firstEnrollmentTime)` - Already exists
- `handleManualStartTournament(tierId, instanceId)` - Already exists
- `handleClaimAbandonedEnrollmentPool(tierId, instanceId)` - Already exists

## Build Status

✅ **Build successful:** No errors or warnings related to these changes

```bash
npm run build
# ✓ built in 2.52s
```

---

**Summary:** Escalation CTAs now correctly display based on user enrollment status in both tournament cards and bracket views, disappearing when they become irrelevant to that specific player.
