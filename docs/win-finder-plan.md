# Win Finder Feature - Implementation Plan

## Feature Purpose

Win Finder identifies **"hidden edge" positions** — places where Stockfish says "all moves are roughly equal" but Maia reveals that one move yields significantly better outcomes when humans play.

### What It Measures

For each position:
1. **SF spread**: How much do SF's top move evaluations differ? (Low = "doesn't matter which you choose")
2. **Maia advantage**: How much better is Maia's top move vs others? (High = "one move clearly better for humans")
3. **Disagreement score**: `Maia advantage / SF spread` — high when SF sees equality but Maia sees a clear winner

---

## Algorithm

```
For each position in PGN (played + variations):
  1. Get SF top N moves with WDL values
  2. For each legal move:
     - Apply move → resulting FEN
     - Get Maia value of resulting position
     - Flip perspective: player_value = 1 - maia_value (since Maia is from opponent's POV)
  3. Rank moves by Maia player_value (highest first)
  4. Calculate disagreement:
     - SF spread = SF top move winrate - SF Nth move winrate
     - Maia advantage = Maia top move value - Maia 2nd move value
     - Score = Maia advantage / (SF spread + epsilon)
  5. Output positions with high score, sorted descending
```

### Perspective Handling

Per `docs/perspective.md`:
- SF `winrate`: Side-to-move's perspective
- Maia `value`: Side-to-move's perspective

After making a move, side-to-move flips. So:
- SF analyzes position A (player's turn) → WDL from player's perspective
- Maia analyzes position B (opponent's turn) → value from opponent's perspective
- **Must flip Maia**: `playerValue = 1 - maiaValue` to compare fairly

---

## Implementation Phases

### Phase 1: Core Types (`src/core/analysis/winFinder.ts`)

```typescript
interface MoveRanking {
  move: string           // SAN notation
  sfWinrate: number      // SF's winrate for this move (0-1)
  sfRank: number         // Rank in SF's ordering (1 = best)
  maiaWinrate: number    // Maia's perceived winrate after move (0-1, player's POV)
  maiaRank: number       // Rank in Maia's ordering (1 = best)
}

interface PositionDisagreement {
  fen: string
  ply: number
  playedMove?: string
  disagreementScore: number      // Higher = more disagreement
  sfTopMove: MoveRanking
  maiaTopMove: MoveRanking
  allMoves: MoveRanking[]        // All legal moves with rankings
  description: string            // Human-readable explanation
}

interface WinFinderResult {
  positions: PositionDisagreement[]  // Sorted by disagreementScore descending
  analyzedPositions: number
  calculationTimeMs: number
}

interface WinFinderConfig {
  sfTopN?: number           // How many SF moves to consider (default: 5)
  sfDepth?: number          // SF search depth (default: 12)
  maiaLevel?: number        // Maia ELO level (default: 1500)
  minDisagreement?: number  // Minimum score to include (default: 3)
  maxResults?: number       // Max positions to return (default: 20)
}
```

### Phase 2: Core Function

**`analyzeGameForDisagreements(positions: PositionInput[], config, sf, maia)`**

1. Loop through positions
2. For each position:
   - Call SF `evaluate(fen, depth)` → get all move winrates
   - Rank SF moves by winrate descending
   - For each legal move:
     - Apply move to get resulting FEN
     - Call Maia `predict(resultingFen)` → get value
     - Flip: `playerValue = 1 - maiaValue`
   - Rank moves by Maia playerValue descending
   - Calculate disagreement score
   - Build `PositionDisagreement` object
3. Filter by `minDisagreement`
4. Sort by `disagreementScore` descending
5. Limit to `maxResults`

**Disagreement Score Formula:**

The goal is to find positions where:
- **SF says "all moves roughly equal"** (low spread among top moves)
- **Maia says "one move is clearly better"** (high spread — top move much better than others)

```typescript
// Maia advantage: How much better is Maia's #1 vs #2?
const maiaAdvantage = maiaRanking[0].playerWinrate - maiaRanking[1].playerWinrate

// SF spread: How different are SF's evaluations?
const sfSpread = sfRanking[0].winrate - sfRanking[sfTopN - 1].winrate

// Disagreement: High when Maia sees a clear winner but SF sees equality
const epsilon = 0.01  // Prevent division by zero
const disagreementScore = maiaAdvantage / (sfSpread + epsilon)
```

**Examples:**
- **Equal position, hidden edge**: SF spread = 2% (52% vs 50%), Maia advantage = 10%
  → Score = 10% / 3% = **3.33** ✓
- **Losing position, fighting chance**: SF spread = 3% (25% vs 22%), Maia advantage = 15%
  → Score = 15% / 4% = **3.75** ✓ (one move fights back better!)
- **Winning position, easier path**: SF spread = 4% (82% vs 78%), Maia advantage = 15%
  → Score = 15% / 5% = **3.0** ✓ (one move is easier to convert)
- **Not interesting**: SF spread = 15% (65% vs 50%), Maia advantage = 10%
  → Score = 10% / 16% = **0.63** (SF already distinguishes moves)
- **Not interesting**: SF spread = 2%, Maia advantage = 2%
  → Score = 2% / 3% = **0.67** (Maia doesn't have strong preference either)

The formula captures ALL cases where SF is indifferent but Maia sees a clear preference — regardless of whether the absolute position is winning, losing, or equal.

### Phase 3: React Hook (`src/hooks/useWinFinder.ts`)

```typescript
interface UseWinFinderReturn {
  result: WinFinderResult | null
  status: 'idle' | 'analyzing' | 'complete' | 'error'
  progress: { current: number; total: number } | null
  analyze: (positions: PositionInput[], config?: WinFinderConfig) => Promise<void>
  reset: () => void
  canAnalyze: boolean
}
```

Key behaviors:
- Get engines from `useEngines()` context
- Track cancellation via `useRef`
- Yield to UI periodically to prevent freezing
- Report progress during analysis

### Phase 4: UI Component (`src/components/Analysis/WinFinderPanel.tsx`)

```
┌─────────────────────────────────────────────────────────────────┐
│ WIN FINDER                              [Analyze Game]          │
├─────────────────────────────────────────────────────────────────┤
│ Progress: ████████░░░░░░░░ 45/100 positions                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ #1  Move 12 (after 11...Nc6)           Score: 4.2               │
│     SF: "All moves ~51% (spread: 2%)"                           │
│     Maia: "d4 is 58%, others ~50% (advantage: 8%)"              │
│     → Hidden edge: d4 gives humans a significant advantage      │
│                                                                 │
│ #2  Move 8 (after 7...e5)              Score: 3.1               │
│     SF: "All moves ~52% (spread: 3%)"                           │
│     Maia: "Bc4 is 55%, others ~48% (advantage: 7%)"             │
│     → Hidden edge: Bc4 plays better in practice                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Features:
- Clickable items navigate to that position
- Color coding for disagreement severity
- Expandable to see full move rankings

### Phase 5: Integration (`src/pages/index.tsx`)

**Tab system in EW section:**
```tsx
const [activeTab, setActiveTab] = useState<'ew' | 'winfinder'>('ew')

// Tab buttons
<div className="tab-buttons">
  <button onClick={() => setActiveTab('ew')}>Expected Winrate</button>
  <button onClick={() => setActiveTab('winfinder')}>Win Finder</button>
</div>

// Both mounted, CSS visibility toggle
<div style={{ display: activeTab === 'ew' ? 'block' : 'none' }}>
  <EWSection ... />
</div>
<div style={{ display: activeTab === 'winfinder' ? 'block' : 'none' }}>
  <WinFinderPanel positions={gamePositions} onNavigate={goToPath} />
</div>
```

Convert game to positions array:
```typescript
const gamePositions = useMemo(() => {
  if (!game) return []
  return extractPositionsFromGame(game) // Walk tree, collect FEN + ply
}, [game])
```

---

## Key Files to Modify/Create

| File | Action |
|------|--------|
| `src/core/analysis/winFinder.ts` | Create - core algorithm |
| `src/core/analysis/winFinder.test.ts` | Create - unit tests |
| `src/hooks/useWinFinder.ts` | Create - React hook |
| `src/components/Analysis/WinFinderPanel.tsx` | Create - UI component |
| `src/pages/index.tsx` | Modify - add tab system |
| `src/__tests__/11-winfinder.spec.ts` | Create - E2E tests |
| `src/core/chess/types.ts` | Modify - add `disagree` to `ParsedAnnotations` |
| `src/core/chess/annotations.ts` | Modify - parse/serialize `[%disagree]` |
| `src/core/chess/annotations.test.ts` | Modify - add tests for new annotation |

---

## Test Cases

### Unit Tests (`winFinder.test.ts`)
1. Empty positions returns empty result
2. Correct perspective flip (1 - maiaValue)
3. Disagreement score calculation correct
4. SF and Maia rankings computed correctly
5. Results sorted by disagreement descending
6. minDisagreement filter works
7. maxResults limit works
8. Progress callback invoked

### E2E Tests (`11-winfinder.spec.ts`)
1. Tab switching between EW and Win Finder
2. Analyze button disabled without game
3. Progress shown during analysis
4. Results displayed with disagreement scores
5. Clicking result navigates to position
6. State preserved when switching tabs

---

## Phase 6: PGN Annotation Support

Add `[%disagree]` annotation to the existing system.

### Step 1: Update Types (`src/core/chess/types.ts`)

```typescript
export interface ParsedAnnotations {
  prob?: number
  eval?: number
  ew?: number
  cp?: number
  disagree?: number  // NEW: 0 = agreement, higher = more disagreement
}
```

### Step 2: Update Annotations (`src/core/chess/annotations.ts`)

```typescript
// Add to SUPPORTED_ANNOTATIONS set
const SUPPORTED_ANNOTATIONS = new Set(['prob', 'eval', 'ew', 'cp', 'disagree'])

// Add parsing case
case 'disagree':
  result.disagree = Math.round(numericValue)  // Integer (1-30+)
  break

// Add serialization
if (annotations.disagree !== undefined) {
  parts.push(`[%disagree ${Math.round(annotations.disagree)}]`)
}
```

### Step 3: Annotate Game Tree

After Win Finder analysis, add annotations to positions with high disagreement:

```typescript
function annotateGameWithDisagreements(
  game: Game<PgnNodeData>,
  disagreements: PositionDisagreement[]
): void {
  for (const d of disagreements) {
    const node = findNodeByFen(game, d.fen)
    if (node) {
      const existing = parseAnnotationsFromComments(node.data.comments)
      existing.disagree = d.disagreementScore
      node.data.comments = [serializeAnnotations(existing)]
    }
  }
}
```

### PGN Output Example

```pgn
1. e4 {[%disagree 8]} e5 2. Nf3 Nc6 3. Bb5 {[%disagree 6]} a6
```

---

## Decisions Made

- **Output**: Both UI display AND PGN annotation
- **Performance**: Full analysis (all legal moves) is acceptable
- **Disagreement metric**: Ratio of Maia's preference strength to SF's indifference (high when SF sees equality but Maia sees clear winner)
