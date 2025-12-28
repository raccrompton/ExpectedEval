# Layout Reorganization Plan

## Goal
Reorganize the ExpectedEval UI to maximize space utilization and eliminate scrolling.

## Current Layout (Problem)
```
┌─────────────────────────────────────────────────────────┐
│ Header                                       [Settings] │
├────────────┬──────────────────┬─────────────────────────┤
│ PgnInput   │                  │ AnalysisPanel           │
│ (tall,     │     Board        │ ┌─────────────────────┐ │
│  empty)    │                  │ │ Stockfish (stacked) │ │
├────────────┤   [Nav Buttons]  │ ├─────────────────────┤ │
│ MoveList   │                  │ │ Maia (stacked)      │ │
│            │                  │ └─────────────────────┘ │
├────────────┴──────────────────┴─────────────────────────┤
│ EWSection (cramped, requires scrolling)                 │
└─────────────────────────────────────────────────────────┘
```

**Issues:**
- PgnInput has excessive empty vertical space
- EWSection is constrained (max-height: 250px) and requires scrolling
- Board doesn't maximize available space
- SF and Maia panels stacked vertically waste horizontal space

## New Layout (Solution)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Header                                                              [Settings]  │
├─────────────────────┬─────────────────────┬─────────────────────────────────────┤
│  PgnInput           │  MoveList           │  AnalysisPanel                      │
│  [Paste PGN...]     │  1. e4 e5 2. Nf3    │  ┌─────────────┬─────────────────┐  │
│  [Load PGN]         │  Nc6                │  │ Stockfish   │ Maia 1500       │  │
│                     │                     │  │ +0.55 57.8% │ 50.3%           │  │
│                     │                     │  │ Best: d2-d4 │ Bb5 28% Bc4 24% │  │
│                     │                     │  └─────────────┴─────────────────┘  │
├─────────────────────┴─────────────────────┴─────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────┐      EXPECTED WINRATE                                │
│  │                       │      ────────────────────────────────────────────    │
│  │                       │      Maia analysis complete        [Add SF Analysis] │
│  │                       │                                                      │
│  │        BOARD          │      EW(SF): --              EW(Maia): 50.0%         │
│  │                       │                                                      │
│  │                       │      ▼ Bb5  EW: 51% (28.5%)                          │
│  │                       │        ├─ e6  49%                                    │
│  │                       │        ├─ a6  50%                                    │
│  │                       │        └─ Nf6 48%                                    │
│  │                       │      ▶ Bc4  EW: 50% (24.2%)                          │
│  └───────────────────────┘      ▶ Nc3  EW: 49% (12.8%)                          │
│      [|<] [<] [>] [>|]                                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. **Top row (Header)**: ~40px fixed - unchanged
2. **Middle row**: ~120-140px fixed height
   - PgnInput: Compact (smaller textarea, rows=3)
   - MoveList: Truncate with "..." if overflow
   - AnalysisPanel: SF and Maia **side-by-side**, Maia shows top 3 moves (no bars)
3. **Bottom row**: Fills remaining viewport height
   - Board + NavButtons: Square, sized to available height
   - EWSection: Takes remaining horizontal space, can expand vertically (no baselines)

---

## Implementation Steps

### Step 1: Modify main page layout (`src/pages/index.tsx`)

**Current grid structure:**
```css
.main-row {
  grid-template-columns: 220px 1fr 280px;
}
.ew-section-wrapper {
  min-height: 180px;
  max-height: 250px;
}
```

**New structure:**
```css
.middle-row {
  display: grid;
  grid-template-columns: 200px 1fr 400px;
  height: 140px;  /* Fixed height */
  flex-shrink: 0;
}

.bottom-row {
  display: grid;
  grid-template-columns: auto 1fr;
  flex: 1;
  min-height: 0;
}

.board-container {
  aspect-ratio: 1;
  height: 100%;
  width: auto;
}
```

**JSX changes:**
- Move `<MoveList>` from left sidebar to middle row (separate column)
- Move `<GameBoard>` + `<NavigationControls>` to bottom row left
- Move `<EWSection>` to bottom row right
- Keep `<PgnInput>` in middle row left
- Keep `<EnginePanel>` in middle row right

### Step 2: Modify EnginePanel (`src/components/Analysis/EnginePanel.tsx`)

**Current:** SF and Maia stacked vertically, Maia shows 5 moves with probability bars
**New:** SF and Maia side-by-side, Maia shows top 3 moves (no bars)

```css
.engine-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  height: 100%;
}

.stockfish-section,
.maia-section {
  overflow: hidden;
}
```

**Maia predicted moves changes:**
- Show only top 3 moves
- Remove probability bars entirely
- Simple text list: `Bb5 28.5%`, `Bc4 24.2%`, `Nc3 12.8%`

### Step 3: Compact PgnInput (`src/components/Analysis/PgnInput.tsx`)

**Current:** textarea rows=8, min-height: 120px
**New:** textarea rows=3, smaller height

```css
.pgn-textarea {
  rows: 3;
  min-height: 60px;
  resize: none;
}
```

### Step 4: Modify MoveList for truncation (`src/components/Analysis/MoveList.tsx`)

**Current:** Vertical expansion with overflow-y
**New:** Fixed height, truncate with "..." if overflow

```css
.move-list-container {
  height: 100%;
  overflow: hidden;
  position: relative;
}

.move-list-container::after {
  content: '...';
  position: absolute;
  bottom: 0;
  right: 0;
  background: var(--color-surface);
  padding-left: 4px;
}
```

Or use CSS `text-overflow: ellipsis` if single-line, or JS-based truncation for multi-line with "..." indicator when content overflows.

### Step 5: Update EWSection (`src/components/Analysis/EWSection.tsx`)

**Remove:** SF Baseline and Maia Baseline display (redundant with AnalysisPanel)

**Current EWSummary shows:**
- EW (Stockfish)
- EW (Maia)
- SF Baseline
- Maia Baseline

**New EWSummary shows:**
- EW (Stockfish)
- EW (Maia)

The baselines are already visible in the AnalysisPanel above.

### Step 6: Board sizing logic

The board should be square and fill the available height:

```css
.board-container {
  height: calc(100% - 50px);  /* Subtract nav buttons height */
  aspect-ratio: 1;
  width: auto;
  max-width: 100%;
}

.nav-buttons {
  height: 40px;
  flex-shrink: 0;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/index.tsx` | Restructure grid layout (middle row + bottom row) |
| `src/components/Analysis/EnginePanel.tsx` | SF + Maia side-by-side, top 3 moves, no bars |
| `src/components/Analysis/PgnInput.tsx` | Compact textarea (rows=3) |
| `src/components/Analysis/MoveList.tsx` | Fixed height, truncate with "..." |
| `src/components/Analysis/EWSection.tsx` | Remove SF/Maia baseline displays |

---

## Responsive Considerations

For mobile/tablet, the new layout should collapse to:
- **< 768px**: Stack everything vertically (current behavior is fine)
- **768-1024px**: Consider 2-column middle row, stack bottom row

The main changes are for desktop (>1024px) where space utilization is the issue.

---

## Testing

1. Visual check: All components fit on screen without scrolling
2. Board remains square at different viewport sizes
3. EW tree can expand fully without scroll
4. Navigation still works (click moves, nav buttons)
5. E2E tests still pass
