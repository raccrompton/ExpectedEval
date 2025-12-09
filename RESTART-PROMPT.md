# Project Restart: ExpectedEval Analysis Page

## Context

The current HumanChess project has become overly complex. It was cloned from a full-featured chess platform but we only need a fraction of its functionality. Rather than continuing to adapt the complex codebase, we're starting fresh with a focused MVP.

### Current Project Structure

```
/Users/Alex/Documents/Github/HumanChess/
├── maia-platform-frontend/   # SOURCE: Copy components from here
├── legacy/                   # OLD: Previous attempts, archived (ignore)
├── RESTART-PROMPT.md         # This file
└── CLAUDE.md                 # Project guidelines
```

**The goal:** Build a new simplified app in the project root, pulling only what's needed from `maia-platform-frontend/`.

## Goal

Build a single-purpose **Expected Evaluation Analysis Page** that combines:

- **Stockfish** (traditional engine evaluation)
- **Maia2** (human-like move probability predictions)

This creates an "expected winrate" analysis that shows what evaluation a position will likely reach given how humans actually play (not perfect engine play).

---

## The Expected Winrate Algorithm

### Concept

Traditional chess engines evaluate the "best possible" result assuming perfect play. But humans don't play perfectly. **Expected Winrate** answers: "What's my realistic winning chance if both players make human-like moves?"

It combines:

- **Maia**: Predicts move probabilities (e.g., "humans play e4 35% of the time, d4 28%...")
- **Stockfish**: Evaluates each resulting position

### The Four Phases

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: FILTER CANDIDATE MOVES                                 │
│   • Stockfish evaluates all legal moves                         │
│   • Keep moves within winrate loss threshold (e.g., <5%)        │
│   • Also get base position winrate for later                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: BUILD PROBABILITY TREES                                │
│   For each candidate move:                                      │
│   • Maia predicts opponent's likely responses                   │
│   • Recursively build tree up to maxDepth                       │
│   • Prune branches below probabilityThreshold                   │
│   • Track cumulativeProbability at each node                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: EVALUATE POSITIONS WITH STOCKFISH                      │
│   • Evaluate all LEAF nodes (end of explored branches)          │
│   • Evaluate all INTERNAL nodes with unexplored children        │
│   • Batch evaluate for efficiency                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 4: CALCULATE EXPECTED WINRATE                             │
│   For each candidate move's tree:                               │
│   • Sum leaf contributions: Σ(leaf_winrate × leaf_prob)         │
│   • Sum uncovered mass: Σ(node_winrate × node_uncovered_prob)   │
│   • Result = realistic winning chance for that move             │
└─────────────────────────────────────────────────────────────────┘
```

### The Formula (Correct Version)

Uncovered probability mass occurs at **each internal node** where we don't explore all children (due to probability threshold). Each node's uncovered mass should use **that node's** SF evaluation.

```
Expected Winrate = Σ(leaf_winrate × leaf_prob) + Σ(node_winrate × node_uncovered_mass)

Where:
- leaf_winrate = Stockfish evaluation at leaf position (0.0 to 1.0)
- leaf_prob = cumulative probability of reaching that leaf
- node_winrate = Stockfish evaluation at internal node where pruning occurred
- node_uncovered_mass = (1 - Σexplored_child_probs) × node's cumulative probability
```

### Example Tree (Showing Uncovered Mass at Each Node)

```
Position: White to move after e4 e5
Candidate move: Nf3 → position after Nf3 (SF: 51%)

├─ Nc6 (45%) → cumulative: 0.45, SF at this node: 52%
│   ├─ Bb5 (40%) → cumulative: 0.18 → LEAF, SF: 54%
│   ├─ Bc4 (35%) → cumulative: 0.1575 → LEAF, SF: 53%
│   └─ [unexplored: 25%] → UNCOVERED: 0.45 × 0.25 = 0.1125 @ SF 52%
│
├─ Nf6 (30%) → cumulative: 0.30, SF at this node: 49%
│   ├─ Nxe5 (60%) → cumulative: 0.18 → LEAF, SF: 58%
│   └─ [unexplored: 40%] → UNCOVERED: 0.30 × 0.40 = 0.12 @ SF 49%
│
├─ d6 (15%) → cumulative: 0.15 → LEAF (no children), SF: 51%
│
└─ [unexplored: 10%] → UNCOVERED: 1.0 × 0.10 = 0.10 @ SF 51% (Nf3 position)

Calculation:
LEAF CONTRIBUTIONS:
  (0.54 × 0.18) + (0.53 × 0.1575) + (0.58 × 0.18) + (0.51 × 0.15)
  = 0.0972 + 0.0835 + 0.1044 + 0.0765 = 0.3616

UNCOVERED MASS CONTRIBUTIONS (each at its own node's SF eval):
  (0.52 × 0.1125) + (0.49 × 0.12) + (0.51 × 0.10)
  = 0.0585 + 0.0588 + 0.051 = 0.1683

TOTAL: 0.3616 + 0.1683 = 52.99% ≈ 53%
```

### Current Implementation Note

> ⚠️ **Simplification in current code:** The existing implementation uses a single
> `basePositionWinrate` for ALL uncovered mass, rather than each node's own evaluation.
> This works reasonably when probability threshold is low (little uncovered mass).
>
> **To implement correctly:**
>
> 1. Evaluate internal nodes with Stockfish (not just leaves)
> 2. Track `unexploredProbability` at each node: `1 - Σ(explored_child_probs)`
> 3. Weight each node's uncovered mass by that node's SF evaluation

### Configuration Parameters

| Parameter              | Description                             | Typical Value |
| ---------------------- | --------------------------------------- | ------------- |
| `maxDepth`             | How many half-moves deep to explore     | 4-6           |
| `probabilityThreshold` | Minimum move probability to explore     | 0.05 (5%)     |
| `winrateLossThreshold` | Max SF winrate loss for candidate moves | 0.05 (5%)     |
| `maiaLevel`            | ELO rating for Maia predictions         | 1100-1900     |
| `stockfishDepth`       | SF search depth for evaluations         | 12-18         |

### Key Implementation Files

```
src/hooks/useExpectedWinrateController/
├── index.ts                    # Main hook, exposes startCalculation()
├── calculationOrchestrator.ts  # Orchestrates the 4 phases
└── engineCoordination.ts       # Batch engine calls, utilities

src/types/expectedWinrate.ts    # TypeScript interfaces
```

## What to Keep

From `./maia-platform-frontend/`, copy and adapt the following:

### Core Infrastructure

- Next.js/React project setup (package.json, tsconfig, next.config)
- Styling system (CSS modules, global styles, theme variables)
- Type definitions for chess concepts (moves, positions, games)

### Reusable Components

- **Board component** - interactive chessboard with piece movement
- **MovesContainer** - move list display with navigation
- **PGN parsing utilities** - convert PGN text to game data
- **Engine integration** - Stockfish web worker setup
- **ExportGame** - PGN/FEN export functionality

### Hooks & Utilities

- `useAnalysisController` or similar game state management
- Chess.js integration utilities
- FEN/PGN parsing and validation
- Move formatting utilities

## What to Delete

Remove all features unrelated to analysis:

- Play against Maia (live games, clocks, matchmaking)
- Puzzles/Training mode
- Turing test features
- User profiles and authentication
- Leaderboards
- Opening explorer/drills
- Blog pages
- Settings pages (keep only essential config)
- Home page marketing content

## Target Architecture

```
src/
├── components/
│   ├── Board/              # Chessboard + pieces (reuse)
│   ├── Analysis/           # Analysis-specific components
│   │   ├── PgnInput.tsx        # Text input for PGN
│   │   ├── AnalysisSidebar.tsx # Main analysis panel
│   │   ├── ExpectedWinrate/    # Expected eval results
│   │   ├── MoveMap.tsx         # Visual move analysis
│   │   └── BoardPreview.tsx    # Mini board for variations
│   ├── Common/             # Shared UI (buttons, modals)
│   └── ui/                 # Base UI primitives
├── hooks/
│   ├── useAnalysisController.ts  # Game state management
│   └── useExpectedWinrateController/  # EW calculation logic
├── lib/
│   ├── chess.ts            # Chess utilities
│   ├── engine.ts           # Stockfish/Maia integration
│   └── format.ts           # Formatting utilities
├── pages/
│   ├── index.tsx           # Redirect to /analysis
│   └── analysis/
│       ├── index.tsx       # Main analysis page
│       └── [...id].tsx     # Analysis with game ID
├── styles/                 # Global styles, CSS modules
└── types/                  # TypeScript definitions
```

## Target UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ExpectedEval                                            [Logo/Nav]  │
├───────────┬──────────────────────┬──────────────────────────────────┤
│           │                      │ Analysis Panel                   │
│   PGN     │                      │ ┌──────────────┬────────────────┐│
│   INPUT   │                      │ │ Maia 1100    │ Stockfish 17   ││
│  (paste   │       BOARD          │ │ Win% 58.7%   │ Eval: +0.38    ││
│   game)   │    (interactive)     │ ├──────────────┼────────────────┤│
│           │                      │ │ Human Moves  │ Board Preview  ││
│           │                      │ │ (by prob)    │ (hover/click)  ││
│           ├──────────────────────┤ └──────────────┴────────────────┘│
│  MOVE     │  [Configure][Export] ├──────────────────────────────────┤
│  LIST     ├──────────────────────┤   EXPECTED WINRATE TREE          │
│ (click to │ Config Options:      │                                  │
│  navigate)│ • Prob threshold     │  e4   54.2%  → e5 Nf3 Nc6 Bb5   │
│           │ • Search depth       │  d4   52.8%  → d5 c4 e6 Nc3     │
│           │ • Maia model level   │  Nf3  51.1%  → d5 d4 Nf6 Nc3    │
│           │ • Stockfish depth    │       ↳ expandable branches      │
└───────────┴──────────────────────┴──────────────────────────────────┘
```

## MVP Features (Phase 1)

### Must Have

1. **PGN Input** - Paste a game, parse it, load onto board
2. **Interactive Board** - View position, navigate moves
3. **Move List** - Click to jump to any position
4. **Stockfish Analysis** - Show centipawn eval for current position
5. **Maia Move Probabilities** - Show human-likely moves with percentages
6. **Basic Expected Winrate** - Calculate EW for current position
7. **Visualise Expected Winrate** - Expected Winrate tree visualization
8. **Visualise moves** -- Board preview on move hover


## Implementation Steps

### Step 1: Clean Slate Setup

1. Create a new branch or backup current work
2. Identify the minimal file set from maia-platform-frontend
3. Remove all non-analysis pages and components
4. Verify the app still builds and runs

### Step 2: Simplify Analysis Page

1. Strip the analysis page to its core: board + moves + basic sidebar
2. Remove any features not in MVP scope
3. Ensure PGN loading works
4. Ensure move navigation works

### Step 3: Engine Integration

1. Verify Stockfish web worker functions
2. Integrate or stub Maia2 API calls
3. Display engine results in sidebar

### Step 4: Expected Winrate

1. Port/simplify the useExpectedWinrateController
2. Create simple results display component
3. Wire up calculation trigger

### Step 5: Polish

1. Clean up unused styles
2. Remove dead code
3. Update navigation/header
4. Test all MVP features

## Technical Notes

### Engine Integration - CRITICAL TO PRESERVE

Both engines run **entirely client-side** in the browser. No backend required.

#### Maia2 Engine (ONNX Runtime Web)

**Files to preserve:**

```
src/lib/engine/maia.ts        # Main Maia class
src/lib/engine/tensor.ts      # Board preprocessing, move encoding
src/lib/engine/storage.ts     # IndexedDB model caching
src/contexts/MaiaEngineContext.tsx  # React context provider
public/maia2/maia_rapid.onnx  # ~50MB ONNX model file
```

**How it works:**

1. Uses `onnxruntime-web` to run neural network in browser
2. Model is downloaded once, cached in IndexedDB for future visits
3. `MaiaModelStorage` class handles persistent caching
4. Takes FEN + ELO ratings as input, outputs:
   - `policy`: Move probabilities (e.g., `{ "e2e4": 0.35, "d2d4": 0.28, ... }`)
   - `value`: Win probability (0-1)

**Key API:**

```typescript
// Single position evaluation
const { policy, value } = await maia.evaluate(fen, eloSelf, eloOppo)

// Batch evaluation (more efficient for tree search)
const { result, time } = await maia.batchEvaluate(fens[], eloSelfs[], eloOppos[])
```

#### Stockfish Engine (WebAssembly)

**Files to preserve:**

```
src/lib/engine/stockfish.ts           # Engine class with streaming eval
src/contexts/StockfishEngineContext.tsx  # React context provider
public/stockfish/sf17-79.js           # Stockfish JS loader
public/stockfish/sf17-79.wasm         # Stockfish WASM binary
public/stockfish/nn-1111cefa1111.nnue # NNUE neural network (large)
public/stockfish/nn-37f18f62d772.nnue # NNUE neural network (small)
```

**How it works:**

1. Uses `lila-stockfish-web` (Lichess's build) for WASM execution
2. Requires SharedArrayBuffer (needs proper CORS headers)
3. Loads NNUE files for neural network evaluation
4. Streams evaluations depth-by-depth via AsyncGenerator

**Key API:**

```typescript
// Streaming evaluation (yields results at each depth)
for await (const eval of engine.streamEvaluations(
  fen,
  legalMoveCount,
  targetDepth,
)) {
  console.log(eval.depth, eval.cp_vec, eval.winrate_vec)
}

// Stop current evaluation
engine.stopEvaluation()
```

**Output structure:**

```typescript
interface StockfishEvaluation {
  depth: number
  model_move: string // Best move at this depth
  model_optimal_cp: number // Centipawn score of best move
  cp_vec: Record<string, number> // CP for each legal move
  winrate_vec: Record<string, number> // Win% for each legal move
  mate_vec?: Record<string, number> // Mate-in-N if applicable
}
```

#### Dependencies (package.json)

```json
{
  "onnxruntime-web": "^1.x",
  "lila-stockfish-web": "^0.x",
  "chess.ts": "^0.x" // Or chess.js
}
```

#### Server Headers Required

For Stockfish SharedArrayBuffer to work, server must send:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### State Management

- Keep it simple: React hooks + context where needed
- Engine contexts provide maia/stockfish instances app-wide
- Avoid complex state libraries unless already in use

### Styling

- Preserve existing CSS module approach
- Keep the chess piece/board styles
- Simplify the rest

## Success Criteria

The MVP is complete when:

- [ ] User can paste a PGN and see it on the board
- [ ] User can click moves to navigate the game
- [ ] Stockfish evaluation displays for current position
- [ ] Maia move probabilities display for current position
- [ ] Basic expected winrate calculation works
- [ ] App is deployable and performant
- [ ] Codebase is simple enough to understand and extend

---

## Quick Reference: File Preservation Checklist

### MUST KEEP (Engine Infrastructure)

- [ ] `src/lib/engine/maia.ts`
- [ ] `src/lib/engine/tensor.ts`
- [ ] `src/lib/engine/storage.ts`
- [ ] `src/lib/engine/stockfish.ts`
- [ ] `src/contexts/MaiaEngineContext.tsx`
- [ ] `src/contexts/StockfishEngineContext.tsx`
- [ ] `public/maia2/` (entire folder)
- [ ] `public/stockfish/` (entire folder)
- [ ] `src/types/engine.ts`

### MUST KEEP (Board & Analysis UI)

- [ ] `src/components/Board/` (core board rendering)
- [ ] `src/components/Board/MovesContainer.tsx`
- [ ] Chess piece SVGs/images
- [ ] Board CSS styles

### LIKELY KEEP (Utilities)

- [ ] `src/lib/` utility functions (format, chess helpers)
- [ ] `src/types/` relevant type definitions
- [ ] `chess.ts` or `chess.js` integration

### DELETE (Unneeded Features)

- [ ] `src/pages/play/` - live game pages
- [ ] `src/pages/puzzles.tsx`
- [ ] `src/pages/turing.tsx`
- [ ] `src/pages/leaderboard.tsx`
- [ ] `src/pages/profile/`
- [ ] `src/pages/settings.tsx`
- [ ] `src/pages/openings/`
- [ ] `src/pages/blog/`
- [ ] `src/components/Play/`
- [ ] `src/components/Puzzles/`
- [ ] `src/components/Turing/`
- [ ] `src/components/Leaderboard/`
- [ ] `src/components/Profile/`
- [ ] `src/components/Openings/`
- [ ] `src/components/Home/` (marketing content)
- [ ] `src/hooks/usePlayController/`
- [ ] `src/hooks/useTuringController/`
- [ ] `src/hooks/useTrainingController/`
- [ ] `src/api/play.ts`, `train.ts`, `turing.ts`, etc.
