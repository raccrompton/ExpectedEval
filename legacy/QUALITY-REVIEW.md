# ExpectedEval MVP Implementation Plan

> **For Claude Code**: Execute phases in order. Each task has specific file paths and code changes.

---

## Vision

A single-page chess analysis tool that shows **Expected Winrate** - the realistic chance of winning based on how humans actually play.

---

## Target Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ExpectedEval                                                         │
├───────────┬──────────────────────┬──────────────────────────────────┤
│           │                      │ Analysis                [Visible]│
│   PGN     │                      │ ┌──────────────┬────────────────┐│
│   INPUT   │                      │ │ Maia 1100    │ Stockfish 17   ││
│           │       BOARD          │ │ Win% 58.7%   │ SF Eval +0.38  ││
│           │                      │ ├──────────────┼────────────────┤│
│           │                      │ │ Human Moves  │ Board Preview  ││
│           │                      │ │ Engine Moves │ (last clicked) ││
│           ├──────────────────────┤ └──────────────┴────────────────┘│
│  MOVE     │ Configure  │ Export  ├──────────────────────────────────┤
│  LIST     ├──────────────────────┤     EXPECTED WINRATE RESULTS     │
│           │ • Prob threshold     │                                  │
│           │ • Max depth          │  e4   54.2%  ══► e5 Nf3 Nc6 Bb5 │
│           │ • Maia level         │  d4   52.8%  ══► d5 c4 e6 Nc3   │
│           │ • SF depth           │  Nf3  51.1%  ══► d5 d4 Nf6 Nc3  │
│           │                      │       ↳ click to expand branches │
└───────────┴──────────────────────┴──────────────────────────────────┘
```

---

# Phase 1: Fix Critical Bugs

## Task 1.1: Fix Algorithm Bug (Uncovered Probability Mass)

**File**: `src/hooks/useExpectedWinrateController/calculationOrchestrator.ts`

**Problem**: Line 508 normalizes by dividing, but should add uncovered mass at base winrate.

**Current code** (line 496-509):
```typescript
private calculateTreeExpectedWinrate(tree: ExpectedWinRateNode): number {
  let weightedSum = 0
  let totalWeight = 0

  this.traverseLeafNodes(tree, (leafNode) => {
    if (leafNode.stockfishWinrate !== undefined) {
      const weight = leafNode.cumulativeProbability
      weightedSum += leafNode.stockfishWinrate * weight
      totalWeight += weight
    }
  })

  return totalWeight > 0 ? weightedSum / totalWeight : 0.5
}
```

**Replace with**:
```typescript
private calculateTreeExpectedWinrate(
  tree: ExpectedWinRateNode,
  basePositionWinrate: number
): number {
  let weightedSum = 0
  let totalWeight = 0

  this.traverseLeafNodes(tree, (leafNode) => {
    if (leafNode.stockfishWinrate !== undefined) {
      const weight = leafNode.cumulativeProbability
      weightedSum += leafNode.stockfishWinrate * weight
      totalWeight += weight
    }
  })

  // Add uncovered probability mass at base position winrate
  const uncoveredMass = 1.0 - totalWeight
  return weightedSum + (uncoveredMass * basePositionWinrate)
}
```

**Also update** `calculateFinalResults` method (~line 452) to pass `basePositionWinrate`:
- Store the root position's Stockfish winrate during Phase 1 (filtering)
- Pass it to `calculateTreeExpectedWinrate(tree, baseWinrate)`

---

## Task 1.2: Fix Button Variant Bug

**File**: `src/components/Analysis/ExpectedWinrate/ExpectedWinrateControls.tsx`

**Line**: 113

**Change**: `variant="ghost"` → `variant="outline"`

The Button component only supports: `'primary' | 'secondary' | 'outline'`

---

## Task 1.3: Remove Dead Code

**File**: `src/components/Analysis/ExpectedWinrate/ExpectedWinrateTree.tsx`

**Lines**: 168-177 (approximately)

**Remove**: The `previewState` useState and any `setPreviewState` calls - this state is set but never used in render output.

---

# Phase 2: Build New Components

## Task 2.1: Create PgnInput Component

**Create file**: `src/components/Analysis/PgnInput.tsx`

**Purpose**: Text area to paste PGN, parse button, replaces game list

**Props interface**:
```typescript
interface PgnInputProps {
  onPgnLoad: (pgn: string) => void
  isLoading?: boolean
}
```

**Features**:
- Textarea for PGN input
- "Load" button to parse
- Error display for invalid PGN
- Use existing styling patterns from `src/components/Analysis/` components

---

## Task 2.2: Create BoardPreview Component

**Create file**: `src/components/Analysis/BoardPreview.tsx`

**Purpose**: Mini chess board showing position from clicked tree node

**Props interface**:
```typescript
interface BoardPreviewProps {
  fen: string | null  // Position to display, null = show placeholder
  lastMove?: [string, string]  // [from, to] squares to highlight
}
```

**Features**:
- Use Chessground for board rendering (see `src/components/Board/GameBoard.tsx` for patterns)
- Header text: "Board Preview"
- Show placeholder when no node selected
- Non-interactive (view only)

---

## Task 2.3: Refactor ExpectedWinrateResults for Inline Lines

**File**: `src/components/Analysis/ExpectedWinrate/ExpectedWinrateResults.tsx`

**Add**: For each top move, show the "most likely line" inline:
```
e4   54.2%  ══► e5 Nf3 Nc6 Bb5
```

**Implementation**:
1. Add helper function to extract highest-probability path from tree:
```typescript
function getMostLikelyLine(tree: ExpectedWinRateNode, maxMoves = 4): string[] {
  const moves: string[] = []
  let current = tree
  while (current.children.length > 0 && moves.length < maxMoves) {
    // Find child with highest probability
    const bestChild = current.children.reduce((a, b) =>
      a.probability > b.probability ? a : b
    )
    moves.push(bestChild.san)
    current = bestChild
  }
  return moves
}
```

2. Display inline with each result row

---

## Task 2.4: Refactor ExpectedWinrateTree for Expandable Nodes

**File**: `src/components/Analysis/ExpectedWinrate/ExpectedWinrateTree.tsx`

**Behavior**:
- Initially show only top-level moves (collapsed)
- Click a node → expand one level (show its children)
- Each node displays: `{san} ({probability}%) → {winrate}%`
- Click any node → call `onNodeClick(node)` to update BoardPreview

**Add prop**:
```typescript
onNodeClick: (node: ExpectedWinRateNode) => void
```

---

# Phase 3: Integrate into Layout

## Task 3.1: Modify AnalysisSidebar

**File**: `src/components/Analysis/AnalysisSidebar.tsx`

**Changes**:

1. **Replace game list with PgnInput**:
   - Find where game list is rendered (left sidebar area)
   - Replace with `<PgnInput onPgnLoad={handlePgnLoad} />`

2. **Replace MovesByRating with BoardPreview**:
   - Find `MovesByRating` component usage
   - Replace with `<BoardPreview fen={previewFen} />`
   - Add state: `const [previewFen, setPreviewFen] = useState<string | null>(null)`

3. **Replace MoveMap/BlunderMeter with ExpectedWinrateResults**:
   - Find `MoveMap` and `BlunderMeter` components
   - Replace with `<ExpectedWinrateResults ... onNodeClick={(node) => setPreviewFen(node.fen)} />`

4. **Keep**: Maia/Stockfish header section (Win%, SF Eval, Human/Engine moves)

---

## Task 3.2: Wire Automatic Calculation

**File**: `src/hooks/useExpectedWinrateController/index.ts`

**Add**: useEffect to trigger calculation when position changes:
```typescript
useEffect(() => {
  if (currentNode && isEnginesReady && !isCalculating) {
    startCalculation()
  }
}, [currentNode?.fen, isEnginesReady])
```

**Note**: Add debounce (300ms) to avoid rapid recalculation during fast navigation.

---

## Task 3.3: Connect Tree Clicks to BoardPreview

**In AnalysisSidebar or parent component**:
- Pass `onNodeClick` callback to ExpectedWinrateResults
- Callback updates `previewFen` state
- BoardPreview receives `previewFen` and displays position

---

# Phase 4: Remove Other Pages

## Task 4.1: Delete Unused Pages

**Delete these directories/files**:
```
src/pages/play/
src/pages/openings.tsx (or /openings/)
src/pages/puzzles.tsx (or /puzzles/)
src/pages/turing.tsx (or /turing/)
src/pages/leaderboard.tsx
src/pages/profile/
src/pages/blog/
src/pages/settings.tsx
```

## Task 4.2: Delete Unused Components

**Delete these directories**:
```
src/components/Play/
src/components/Openings/
src/components/Puzzles/
src/components/Turing/
src/components/Leaderboard/
src/components/Settings/
src/components/Home/
```

## Task 4.3: Update Index Page

**File**: `src/pages/index.tsx`

**Change**: Redirect to analysis page or make it the analysis page directly:
```typescript
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/analysis')
  }, [])
  return null
}
```

## Task 4.4: Clean Up Unused Code

**Delete unused**:
- Hooks: `usePlayController`, `useOpeningDrillController`, `useTrainingController`, `useTuringController`
- Contexts: `PlayControllerContext`, `TrainingControllerContext`, `TuringTreeControllerContext`
- API modules: `src/api/play/`, `src/api/opening/`, `src/api/train/`, `src/api/turing/`

---

# Phase 5: Polish & Test

## Task 5.1: Fix TypeScript Types

**Files**:
- `src/hooks/useExpectedWinrateController/calculationOrchestrator.ts` lines 32-35
- `src/hooks/useExpectedWinrateController/engineCoordination.ts` lines 23, 105

**Change**: Replace `any` with proper types:
```typescript
// Instead of: private stockfish: any
// Use the actual context type from StockfishEngineContext
import { StockfishEngineContextType } from 'src/contexts/StockfishEngineContext'
private stockfish: StockfishEngineContextType
```

## Task 5.2: Add Educational Comments

**All modified files** need line-by-line comments per CLAUDE.md standards.

Example:
```typescript
// Calculate the expected winrate by weighting each leaf position
// by its cumulative probability (how likely we are to reach it)
private calculateTreeExpectedWinrate(
  tree: ExpectedWinRateNode,
  basePositionWinrate: number  // Fallback for uncovered probability mass
): number {
```

## Task 5.3: Add Tests for startCalculation

**File**: `__tests__/hooks/useExpectedWinrateController/useExpectedWinrateController.test.ts`

**Add test**:
```typescript
describe('startCalculation', () => {
  it('should calculate expected winrate for valid position', async () => {
    // Mock engines, call startCalculation, verify results
  })

  it('should handle uncovered probability mass correctly', async () => {
    // Verify the algorithm fix: uncovered mass uses base winrate
  })
})
```

## Task 5.4: Accessibility Fixes

**File**: `src/components/Analysis/ExpectedWinrate/ExpectedWinrateControls.tsx`

**Add** `aria-label` to form inputs (lines 136-193):
```typescript
<select aria-label="Maia level selection" ...>
<input aria-label="Probability threshold" ...>
```

---

# Verification Checklist

After each phase, verify:

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] App runs without console errors

---

# Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Main hook | `src/hooks/useExpectedWinrateController/index.ts` |
| Calculation | `src/hooks/useExpectedWinrateController/calculationOrchestrator.ts` |
| Engine coordination | `src/hooks/useExpectedWinrateController/engineCoordination.ts` |
| Types | `src/types/expectedWinrate.ts` |
| UI Controls | `src/components/Analysis/ExpectedWinrate/ExpectedWinrateControls.tsx` |
| UI Results | `src/components/Analysis/ExpectedWinrate/ExpectedWinrateResults.tsx` |
| UI Tree | `src/components/Analysis/ExpectedWinrate/ExpectedWinrateTree.tsx` |
| Sidebar layout | `src/components/Analysis/AnalysisSidebar.tsx` |
| Analysis page | `src/pages/analysis/[...id].tsx` |
| Button component | `src/components/ui/Button.tsx` |
