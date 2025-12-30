# ExpectedEval - Project Knowledge

> This file contains domain knowledge and progress tracking for the ExpectedEval MVP.
> For coding standards, see `.claude/CLAUDE.md`.

---

## Current Progress

### Completed

- **Phase 1-3: Core Logic** - Chess utilities, engine adapters, EW algorithm (234 unit tests)
- **Phase 4-7: UI Foundation** - Board, PGN input, move list, navigation, variations display
- **Phase 8-9: Engine Display** - Mock engine panels, EW section with tree visualization
- **Phase 10: Real Engines + Settings** - Stockfish WASM, Maia ONNX, configurable settings with localStorage

### In Progress

- **Phase 10.5: Maia-First EW Architecture**
  - [x] `calculateMaiaOnlyEW()` - fast path using Maia only
  - [x] `enrichWithStockfish()` - adds SF data on-demand
  - [x] `selectCandidatesByMaiaProbability()` - candidate selection
  - [x] Auto-trigger on FEN change with 300ms debounce
  - [x] UI yield mechanism to prevent page freeze
  - [x] LRU prediction cache to prevent memory leaks
  - [x] ONNX tensor disposal in Maia engine
  - [x] Verify all E2E tests pass after changes
  - [x] Two-column EW tree redesign (CandidateColumn + TreeColumn)
  - [x] Vertical recursive tree with VerticalTreeNode component
  - [x] Accordion behavior (one branch per depth level)
  - [x] EnginePanel side-by-side layout (SF + Maia displayed simultaneously)

### TODO

- **Phase 11: Full E2E + Polish** - Error handling, loading states, responsive layout

### Test Status

| Type | Count | Status |
|------|-------|--------|
| Unit tests | 270 | ✅ Passing |
| E2E tests | 145+ | ✅ Passing |

---

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm run test:run` | Run unit tests (outputs JSON to `test-results/unit-tests.json`) |
| `npm run test:e2e` | Run E2E tests (outputs JSON to `test-results/e2e-tests.json`) |
| `npm run test:timing` | View timing report for slowest tests |
| `npm run test:timing -- --unit` | Timing report for unit tests only |
| `npm run test:timing -- --e2e` | Timing report for E2E tests only |

---

## Project Goal

Build a single-purpose **Expected Evaluation Analysis Page** that combines:

- **Stockfish** (traditional engine evaluation)
- **Maia2** (human-like move probability predictions)

This creates an "expected winrate" analysis that shows what evaluation a position will likely reach given how humans actually play (not perfect engine play).

---

## The Expected Winrate Algorithm

### Concept

Traditional chess engines evaluate the "best possible" result assuming perfect play. But humans don't play perfectly. **Expected Winrate** answers: "What's my realistic winning chance if both players make human-like moves?"

The analysis provides **four evaluation methods** for any position:

| # | Method | What It Shows | Source |
|---|--------|---------------|--------|
| 1 | **SF Baseline** | Traditional engine evaluation | Stockfish evaluates position directly |
| 2 | **Maia Baseline** | Human win probability | Maia's neural network value head |
| 3 | **EW (SF leaves)** | Expected outcome with accurate evals | Tree search: Maia probs → SF values |
| 4 | **EW (Maia leaves)** | Expected outcome with human perception | Tree search: Maia probs → Maia values |

It combines:

- **Maia**: Predicts move probabilities (policy head) AND position evaluation (value head)
- **Stockfish**: Evaluates each resulting position

### Two-Phase Calculation (Maia-First Architecture)

The EW calculation uses a **Maia-first approach** for responsive UI:

| Phase | Trigger | Engine | Speed | Result |
|-------|---------|--------|-------|--------|
| **Fast Path** | Auto on position change | Maia only | ~100-500ms | EW(Maia) ready |
| **Slow Path** | User clicks "Add SF" | Stockfish | ~1-3s | EW(SF) added |

```
┌─────────────────────────────────────────────────────────────────┐
│ FAST PATH: calculateMaiaOnlyEW() - Auto-triggered               │
│   1. Select candidates by Maia probability (top N moves)        │
│   2. Build probability trees using Maia policy head             │
│   3. Evaluate nodes using Maia value head                       │
│   4. Compute EW(Maia) immediately                               │
│   Result: SF fields are NULL, EW(Maia) is populated             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ User clicks "Add SF Analysis"
┌─────────────────────────────────────────────────────────────────┐
│ SLOW PATH: enrichWithStockfish() - On-demand                    │
│   1. Collect all unique positions from existing trees           │
│   2. Batch evaluate with Stockfish                              │
│   3. Populate SF values into tree nodes                         │
│   4. Compute EW(SF)                                             │
│   Result: Full result with both EW(SF) and EW(Maia)             │
└─────────────────────────────────────────────────────────────────┘
```

**Key Functions:**
- `calculateMaiaOnlyEW(fen, config, maia)` → Fast, Maia-only result
- `enrichWithStockfish(result, stockfish)` → Adds SF data to existing result
- `calculateExpectedWinrate(fen, config, sf, maia)` → Full calculation (legacy)

### UI Responsiveness

Tree building yields to the browser event loop every 3 Maia predictions via `yieldToUI()` (a `setTimeout(resolve, 0)` wrapper in [treeBuilder.ts](src/core/analysis/treeBuilder.ts)). This prevents page freezing during calculation while keeping the implementation simple (no web workers needed for Maia).

Additional responsiveness measures:
- **300ms debounce** on position changes before auto-triggering EW calculation
- **Stale result detection** via `currentFenRef` - discards results if position changed during calculation
- **Concurrent engine guard** - waits for panel evaluation to complete before starting EW calc
- **LRU prediction cache** (1000 entries) - avoids redundant Maia calls for repeated positions
- **ONNX tensor disposal** - explicit cleanup of GPU/CPU tensors after each Maia prediction

### The Four Phases (Full Calculation)

```
Phase 1: FILTER CANDIDATE MOVES
  • Stockfish evaluates all legal moves
  • Keep moves within winrate loss threshold (e.g., <5%)
  • Get base position winrate for baseline display
                              ↓
Phase 2: BUILD PROBABILITY TREES
  For EACH candidate move:
  • Apply the candidate move to get the resulting FEN
  • Build tree starting from that FEN (opponent's responses)
  • Maia predicts likely moves at each position
  • Prune branches where cumProb < probabilityThreshold
  • NO maxDepth limit - termination is probability-based only
                              ↓
Phase 3: EVALUATE POSITIONS WITH BOTH ENGINES
  • Stockfish evaluates all nodes (objective evaluation)
  • Maia evaluates all nodes (human-perceived evaluation)
  • Both leaf nodes and internal nodes are evaluated
                              ↓
Phase 4: CALCULATE TWO EXPECTED WINRATES
  EW(SF) = Σ(SF_winrate × prob) + Σ(SF_winrate × uncovered)
  EW(Maia) = Σ(Maia_winrate × prob) + Σ(Maia_winrate × uncov)
```

### The Formula

```
EW = Σ(winrate × leaf_prob) + Σ(winrate × uncovered_mass)

Where:
- winrate = SF or Maia evaluation at position (0.0 to 1.0)
- leaf_prob = cumulative probability of reaching that leaf
- uncovered_mass = (1 - Σexplored_child_probs) × node's cumulative probability
```

### Tree Termination: Probability-Only

**IMPORTANT:** Never limit tree depth artificially with `maxDepth` or `maxNodes` parameters. Tree exploration terminates **only** when cumulative probability falls below `probabilityThreshold`. This ensures:

- High-probability lines are explored deeply regardless of depth
- Low-probability lines are pruned early regardless of depth
- The tree shape naturally reflects human play patterns

---

## Configuration Parameters

| Parameter              | Description                                      | Typical Value |
| ---------------------- | ------------------------------------------------ | ------------- |
| `probabilityThreshold` | Min cumulative probability to explore a branch   | 0.01-0.05     |
| `winrateLossThreshold` | Max SF winrate loss to include as candidate move | 0.05 (5%)     |
| `eloLevel`             | Maia ELO rating for move predictions             | 1100-1900     |
| `sfDepth`              | Stockfish search depth for evaluations           | 10-18         |

**Note**: No `maxDepth` parameter - tree termination is purely probability-based. Branches are pruned when their cumulative probability falls below `probabilityThreshold`.

---

## Architecture

### File Structure

```
src/
├── core/                        # PURE LOGIC - 100% unit testable
│   ├── chess/                   # Game state, PGN parsing, moves
│   ├── engine/                  # Engine adapters (mockable)
│   └── analysis/                # Expected Winrate algorithm
├── hooks/                       # React hooks - thin wrappers
├── components/                  # UI components - rendering only
│   ├── Board/                   # Chessboard + moves
│   ├── Analysis/                # Engine panels, EW display
│   └── Layout/                  # Page structure
├── contexts/                    # React contexts (minimal)
├── pages/                       # Next.js pages
└── __tests__/                   # E2E and integration tests
scripts/
└── test-timing-report.ts        # Parse test JSON and display timing summaries
test-results/                    # Generated test output (gitignored)
├── unit-tests.json              # Vitest JSON reporter output
└── e2e-tests.json               # Playwright JSON reporter output
```

### Dependency Flow

```
UI Components → React Hooks → Core Logic → External Libraries
```

Core logic has NO React dependencies. This enables:

- Unit testing without React
- Easy debugging of algorithm
- Reuse in non-React contexts

### Key Dependencies

```json
{
  "chessops": "^0.14.0",
  "chessground": "^9.5.0",
  "onnxruntime-web": "^1.17.0",
  "next": "^15.0.0",
  "react": "^19.0.0"
}
```

---

## Target UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Header                                                               [Settings]     │
├─────────────────────┬─────────────────────┬─────────────────────────────────────────┤
│  PGN INPUT          │  MOVE LIST          │  EVALUATION PANEL (side-by-side)        │
│  [Paste PGN...]     │  1. e4 e5 2. Nf3    │  ┌─────────────┬─────────────────────┐  │
│  [Load PGN]         │  Nc6...             │  │ Stockfish   │ Maia 1500           │  │
│                     │                     │  │ +0.55 57.8% │ 50.3%               │  │
│                     │                     │  │ Best: d4    │ Bb5 28% Bc4 24%...  │  │
│                     │                     │  └─────────────┴─────────────────────┘  │
├─────────────────────┴─────────────────────┴─────────────────────────────────────────┤
│                                                                                     │
│  ┌───────────────────────┐      EXPECTED WINRATE                                    │
│  │                       │      ────────────────────────────────────────────        │
│  │                       │      Maia analysis complete        [Add SF Analysis]     │
│  │                       │                                                          │
│  │        BOARD          │      EW(SF): --              EW(Maia): 50.0%             │
│  │                       │                                                          │
│  │                       │      ▼ Bb5  EW: 51% (28.5%)                              │
│  │                       │        ├─ e6  49%                                        │
│  │                       │        ├─ a6  50%                                        │
│  │                       │        └─ Nf6 48%                                        │
│  │                       │      ▶ Bc4  EW: 50% (24.2%)                              │
│  └───────────────────────┘      ▶ Nc3  EW: 49% (12.8%)                              │
│      [|<] [<] [>] [>|]                                                              │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

[Settings] dropdown (appears on click):
┌─────────────────────────┐
│ Prob Threshold: [1%  ▼] │
│ Maia Level:     [1500▼] │
│ SF Depth:       [12  ▼] │
│ Winrate Loss:   [5%  ▼] │
└─────────────────────────┘
```

**Layout Key:**
- **Top row (Header):** Fixed ~40px with settings
- **Middle row:** PgnInput (compact, rows=3) | MoveList (truncates with "...") | EnginePanel (SF+Maia side-by-side, top 3 moves, no bars)
- **Bottom row:** Board + NavButtons (left, square) | EWSection (right, no baselines - shown in EnginePanel)
- **All panels fit on desktop viewport without scrolling**

---

## Data Model: chessops-First Approach

We use **chessops** as the foundation for all chess logic. Don't reinvent the wheel.

### Why chessops

| Feature             | chessops provides | We don't write    |
| ------------------- | ----------------- | ----------------- |
| PGN parsing         | `parsePgn()`      | Parser            |
| PGN export          | `makePgn()`       | Serializer        |
| Move validation     | `Chess.isLegal()` | Validation logic  |
| FEN generation      | `makeFen()`       | Position tracking |
| Variation handling  | Built-in tree     | Tree structure    |
| NAG support         | `nags: number[]`  | Quality markers   |

### Key Insight: EW Tree = chessops Variations

chessops represents games as a **tree with variations**. This is exactly what we need for Expected Winrate branches:

```
Main line:     1. e4 e5 2. Nf3 Nc6 ...
                   │
EW branches:       ├── (1. d4 {[%prob 0.28][%eval 0.51]} ...)
                   └── (1. Nf3 {[%prob 0.20][%eval 0.50]} ...)
```

When we calculate EW, we **add variations** to the chessops tree. No separate data structure needed.

### Annotations in PGN Comments

Probabilities and evaluations are stored as **PGN comment annotations**:

```pgn
1. e4 {[%prob 0.35][%eval 0.52][%ew 0.54]} e5 {[%prob 0.45][%eval 0.48]}
2. Nf3 {[%prob 0.40][%eval 0.51]} Nc6 {[%prob 0.45]}
```

Annotation format:
- `[%prob X.XX]` - Maia move probability (0.0-1.0)
- `[%eval X.XX]` - Stockfish winrate (0.0-1.0)
- `[%ew X.XX]` - Expected Winrate result (only on candidate moves)
- `[%cp X]` - Stockfish centipawns (optional)

### Our Code: Thin Wrappers Only

We write minimal code on top of chessops. Our wrappers handle:

1. **Annotation parsing** - Extract `[%prob]` etc. from comments (chessops parses comments but not their internal format)
2. **Navigation state** - Track "current position" in the tree (chessops is stateless)
3. **EW variation attachment** - Add calculated results to tree nodes

```typescript
// src/core/chess/annotations.ts - parsing [%prob][%eval] from comment strings
interface ParsedAnnotations {
  prob?: number;   // Maia probability
  eval?: number;   // SF winrate
  ew?: number;     // Expected Winrate
  cp?: number;     // SF centipawns
}

function parseAnnotations(comments: string[]): ParsedAnnotations;
function serializeAnnotations(annotations: ParsedAnnotations): string;
```

```typescript
// src/core/chess/game.ts - thin wrapper around chessops
import { parsePgn, makePgn } from 'chessops/pgn';

// These just call chessops
function loadGame(pgn: string): Game<PgnNodeData>;
function exportGame(game: Game<PgnNodeData>): string;

// This is our logic - attach EW results as variations
function addEWVariations(node: PgnNodeData, ewResults: EWCandidate[]): void;
```

```typescript
// src/core/chess/navigation.ts - track position in game tree
// chessops tree is stateless; we track where user is viewing

interface NavigationState {
  game: Game<PgnNodeData>;     // The chessops tree
  currentPath: number[];        // Path to current node (index at each depth)
  currentFen: string;           // FEN at current position (computed)
}

function getCurrentNode(state: NavigationState): PgnNodeData;
function goToMove(state: NavigationState, path: number[]): NavigationState;
function goForward(state: NavigationState): NavigationState;
function goBack(state: NavigationState): NavigationState;
```

---

## Key Interface Contracts

### useChessGame Hook

```typescript
interface UseChessGameReturn {
  game: Game<PgnNodeData> | null;
  currentPath: number[];
  currentFen: string;
  currentNode: PgnNodeData | null;
  actions: {
    loadPgn: (pgn: string) => void;
    goForward: () => void;
    goBack: () => void;
    goToPath: (path: number[]) => void;
    goToStart: () => void;
    goToEnd: () => void;
  };
}
```

### useExpectedWinrate Hook

```typescript
interface UseExpectedWinrateReturn {
  result: EWResult | null;
  status: 'idle' | 'calculating_maia' | 'complete_maia' | 'enriching_sf' | 'complete' | 'error';
  hasSFResults: boolean;
  canEnrichSF: boolean;
  enrichWithSF: () => Promise<void>;
}
```

### State Synchronization Rules

1. **Single Source of Truth**: The `game` object in `useChessGame` is the authoritative game state
2. **FEN is Always Derived**: Never store FEN separately - always compute from game + path
3. **Path Drives Everything**: Changing `currentPath` triggers FEN recomputation and engine re-evaluation
4. **Engines Are Stateless**: Engine adapters don't cache - each call is independent

---

## Expected Winrate Tree Visualization

The EW tree answers: **"Which move has the best realistic outcome given how humans play?"**

### Two-Column Layout (EWCandidateTreeView)

The tree uses a two-column design for better usability:

| Column | Component | Contents |
|--------|-----------|----------|
| **Left** | CandidateColumn | Clickable list of candidate moves with EW values |
| **Right** | EWTable | Horizontal table showing variation lines by ply |

```
┌─────────────────┬───────────────────────────────────────────────────────────────┐
│ CANDIDATES      │ TABLE (for selected candidate)                                │
│                 │                                                               │
│ ● e4  51%       │ Ply 1    Ply 2    Ply 3    Ply 4   | Line EW | Likelihood    │
│   d4  50%       │ d5       exd5     Qxd5     Nc3     | 51%     | 12.3%         │
│   Nf3 49%       │ + e6                               | 50%     | 8.2%          │
│                 │   + c5                             | 49%     | 5.1%          │
└─────────────────┴───────────────────────────────────────────────────────────────┘
```

### Display Structure

| Level | Shows | Sorted by |
|-------|-------|-----------|
| **Candidate moves** | EW (probability-weighted average) | EW (highest first) |
| **Table rows** | Line EW and Likelihood | Play rate (most likely first) |

### Table Display (EWTable)

- **Horizontal layout**: Each ply has its own column, lines are rows
- **Two display modes**:
  - **Default Mode**: All ply 1 children shown as separate rows with their continuation mainlines (no + button on ply 1)
  - **Focused Mode**: When any + button is clicked, other ply 1 rows disappear to reduce visual clutter
- **Expand/Collapse buttons**: `+` to show alternative moves, `-` to collapse
- **Line EW column**: Shows EW value for each line (leaf node eval)
- **Likelihood column**: Shows cumulative probability of reaching that line
- **Horizontally scrollable**: Deep lines scroll right without breaking layout
- **Transformation**: Uses `treeToTable()` function to convert TreeNode to flat rows
- **Key functions**: `buildDefaultModeRows()`, `buildPly1RowCells()` for ply 1 default expansion

### Core Files

| File | Purpose |
|------|---------|
| `src/core/analysis/treeToTable.ts` | Transforms TreeNode to TableRow[] for display |
| `src/components/Analysis/EWTable.tsx` | Renders horizontal table with expand/collapse |
| `src/components/Analysis/EWSection.tsx` | Container integrating CandidateColumn + EWTable |

### Interactions

1. **Select candidate** - Click candidate in left column to show its table
2. **Expand alternatives** - Click `+` button to show alternative moves as new rows
3. **Collapse alternatives** - Click `-` button to hide alternative rows
4. **Horizontal scroll** - Scroll right to see deeper plies

### Test IDs

| Element | Test ID Pattern |
|---------|-----------------|
| Container | `ew-candidate-tree-view` |
| Candidate column | `ew-candidate-column` |
| Candidate item | `ew-candidate-{index}` |
| Table container | `ew-table` |
| Table row | `ew-table-row-{index}` |
| Expand button | `ew-expand-{rowIndex}-{plyIndex}` |
| Collapse button | `ew-collapse-{rowIndex}` |

---

## Engine Integration

Both engines run **entirely client-side** in the browser. No backend required.

### Maia2 Engine (ONNX Runtime Web)

- Uses `onnxruntime-web` to run neural network in browser
- Model (~89MB ONNX) downloaded once, cached in IndexedDB
- Input: FEN + ELO ratings
- Output: Two outputs from separate neural network heads:
  - **Policy head**: Move probabilities (used for tree building)
  - **Value head**: Position evaluation (used for EW(Maia) and Maia baseline)

```typescript
interface MaiaResult {
  policy: Record<string, number>; // Move → probability (for tree building)
  value: number; // Win probability (0-1) - used for EW(Maia)
}
```

**Key insight**: Maia's value head provides an alternative position evaluation to Stockfish. This enables computing EW(Maia) which represents "human-perceived" expected outcomes.

### Stockfish Engine (WebAssembly)

- Uses Stockfish WASM (~75MB with NNUE)
- Requires SharedArrayBuffer (needs CORS headers)
- Streams evaluations depth-by-depth

```typescript
interface StockfishEvaluation {
  depth: number;
  model_move: string;
  model_optimal_cp: number;
  cp_vec: Record<string, number>; // Move → centipawns
  winrate_vec: Record<string, number>; // Move → win probability
}
```

### Required CORS Headers

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## MVP Features

### Must Have

1. **PGN Input** - Paste a game, parse it, load onto board
2. **Interactive Board** - View position, navigate moves
3. **Move List** - Click to jump to any position
4. **Stockfish Analysis** - Show centipawn / stockfish winrate eval for current position
5. **Maia Move Probabilities** - Show human-likely moves with percentages
6. **Basic Expected Winrate** - Calculate Expected Winrate for current position
7. **Expandable EW Tree** - Interactive tree visualization with expand/collapse, showing probabilities and evaluations stored as annotations
8. **Board Preview on Hover** - See position for any move in the tree or move list

### Not In MVP

- User authentication
- Game saving/loading from server
- Play against Maia
- Puzzles/Training
- Leaderboards
- Opening explorer
- Lichess integration

---

## Success Criteria

The MVP is complete when:

- [x] User can paste a PGN and see it on the board
- [x] User can click moves to navigate the game
- [x] SF Baseline displays for current position
- [x] Maia Baseline (value head) displays for current position
- [x] EW(Maia) displays for current position
- [ ] EW(SF) displays for current position (on-demand enrichment)
- [x] Maia move probabilities display for current position
- [x] Expected winrate tree is visualized
- [x] All unit tests pass (270 passing)
- [x] All E2E tests pass after Phase 10.5
- [ ] App is deployable and performant

---

## Design Tokens (Brutalist Theme)

The UI follows a **Brutalist/Geometric** design language:

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0a0a0a` | Near-black base |
| Primary | `#FFE000` | Electric yellow accents, borders |
| Secondary | `#00D4FF` | Cyan for best moves, highlights |
| Text | `#ffffff` | Primary text |
| Muted | `#666666` | Secondary text |

### Typography
| Font | Usage |
|------|-------|
| **Archivo Black** | Display headers, titles |
| **IBM Plex Mono** | Data, UI elements, monospace content |

### Styling Conventions
- **No border-radius** - All corners are sharp (0px)
- **Thick borders** - 2-3px solid borders
- **Harsh shadows** - Box-shadows without blur (`4px 4px 0 rgba(255,224,0,0.3)`)
- **Yellow accent bars** - 3px left border on panel sections
- **Grid overlay** - 64px grid pattern (chess board reference)

### Key Files
- `src/styles/globals.css` - Design tokens and base styles
- `src/pages/index.tsx` - Main layout with brutalist panels
- `src/components/Analysis/EWSection.tsx` - EW display styling
- `src/components/Analysis/EnginePanel.tsx` - Engine panel styling

---

## Key Files Reference

When implementing, these files from `maia-platform-frontend/` are useful references:

| Concept                    | Reference File                            |
| -------------------------- | ----------------------------------------- |
| Maia engine wrapper        | `src/lib/engine/maia.ts`                  |
| Stockfish wrapper          | `src/lib/engine/stockfish.ts`             |
| Board tensor preprocessing | `src/lib/engine/tensor.ts`                |
| EW algorithm structure     | `src/hooks/useExpectedWinrateController/` |
| Chessground config         | `src/components/Board/GameBoard.tsx`      |
| Move list display          | `src/components/Board/MovesContainer.tsx` |

**Note:** Reference for patterns only. Build fresh implementations.
