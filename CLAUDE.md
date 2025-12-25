# ExpectedEval - Project Knowledge

> This file contains stable domain knowledge for the ExpectedEval MVP.
> For coding standards, see `.claude/CLAUDE.md`.
> For implementation details, see `IMPLEMENTATION-STRATEGY.md`.

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

### The Four Phases

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: FILTER CANDIDATE MOVES                                 │
│   • Stockfish evaluates all legal moves                         │
│   • Keep moves within winrate loss threshold (e.g., <5%)        │
│   • Also get base position winrate for baseline display         │
│   • Maia predicts move probabilities for baseline display       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: BUILD PROBABILITY TREES                                │
│   For EACH candidate move:                                      │
│   • Apply the candidate move to get the resulting FEN           │
│   • Build tree starting from that FEN (opponent's responses)    │
│   • Maia predicts likely moves at each position                 │
│   • Prune branches where cumProb < probabilityThreshold         │
│   • NO maxDepth limit - termination is probability-based only   │
│                                                                 │
│   Example: candidate "e4" → tree starts after e4 is played      │
│   showing Black's responses (e5: 45%, c5: 30%, etc.)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: EVALUATE POSITIONS WITH BOTH ENGINES                   │
│   • Stockfish evaluates all nodes (objective evaluation)        │
│   • Maia evaluates all nodes (human-perceived evaluation)       │
│   • Both leaf nodes and internal nodes are evaluated            │
│   • This enables computing TWO different EW values              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 4: CALCULATE TWO EXPECTED WINRATES                        │
│   For each candidate move's tree, compute BOTH:                 │
│                                                                 │
│   EW(SF) = Σ(SF_winrate × prob) + Σ(SF_winrate × uncovered)    │
│   EW(Maia) = Σ(Maia_winrate × prob) + Σ(Maia_winrate × uncov)  │
│                                                                 │
│   • EW(SF): "Objectively accurate" expected outcome             │
│   • EW(Maia): "Human-perceived" expected outcome                │
└─────────────────────────────────────────────────────────────────┘
```

### The Formulas

Two Expected Winrate values are computed using the same formula but different evaluations:

```
EW(SF) = Σ(SF_winrate × leaf_prob) + Σ(SF_winrate × uncovered_mass)
EW(Maia) = Σ(Maia_winrate × leaf_prob) + Σ(Maia_winrate × uncovered_mass)

Where:
- SF_winrate = Stockfish evaluation at position (0.0 to 1.0) - "objective"
- Maia_winrate = Maia value head evaluation (0.0 to 1.0) - "human perception"
- leaf_prob = cumulative probability of reaching that leaf
- uncovered_mass = (1 - Σexplored_child_probs) × node's cumulative probability
```

**When to use which:**
- **EW(SF)**: For objectively accurate expected outcomes
- **EW(Maia)**: For how humans perceive the position

### Example Tree

```
ROOT POSITION: White to move after 1. e4 e5

Candidate move: Nf3 (one of several candidates within winrateLossThreshold)
Tree below shows what happens AFTER Nf3 is played (Black to move):

Each node has BOTH SF and Maia evaluations:

├─ Nc6 (45%) → cumulative: 0.45, SF: 52%, Maia: 51%
│   ├─ Bb5 (40%) → cumulative: 0.18 → LEAF, SF: 54%, Maia: 52%
│   ├─ Bc4 (35%) → cumulative: 0.1575 → LEAF, SF: 53%, Maia: 51%
│   └─ [unexplored: 25%] → UNCOVERED: 0.45 × 0.25 = 0.1125
│
├─ Nf6 (30%) → cumulative: 0.30, SF: 49%, Maia: 48%
│   ├─ Nxe5 (60%) → cumulative: 0.18 → LEAF, SF: 58%, Maia: 55%
│   └─ [unexplored: 40%] → UNCOVERED: 0.30 × 0.40 = 0.12
│
├─ d6 (15%) → cumulative: 0.15 → LEAF, SF: 51%, Maia: 50%
│
└─ [unexplored: 10%] → UNCOVERED: 1.0 × 0.10 = 0.10 (at root: SF 51%, Maia 50%)

Calculation for EW(SF):
LEAF CONTRIBUTIONS:
  (0.54 × 0.18) + (0.53 × 0.1575) + (0.58 × 0.18) + (0.51 × 0.15)
  = 0.0972 + 0.0835 + 0.1044 + 0.0765 = 0.3616

UNCOVERED MASS CONTRIBUTIONS:
  (0.52 × 0.1125) + (0.49 × 0.12) + (0.51 × 0.10)
  = 0.0585 + 0.0588 + 0.051 = 0.1683

TOTAL EW(SF): 0.3616 + 0.1683 = 52.99% ≈ 53%

Calculation for EW(Maia): (same structure, different values)
TOTAL EW(Maia): ~51% (uses Maia evaluations instead of SF)

RESULT: If White plays Nf3:
  - EW(SF) = 53% (objectively accurate expected outcome)
  - EW(Maia) = 51% (how humans perceive this line)
```

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

## Target Architecture

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
```

### Dependency Flow

```
UI Components → React Hooks → Core Logic → External Libraries
```

Core logic has NO React dependencies. This enables:

- Unit testing without React
- Easy debugging of algorithm
- Reuse in non-React contexts

---

## Target UI Layout

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ ExpectedEval Analysis                          [Calculate EW] [Export] [Settings ▼]│
├─────────────┬──────────────────────────────────────────────────────────────────────┤
│             │                                │                                     │
│   PGN       │                                │  ┌─ EVALUATION PANEL ─────────────┐ │
│   INPUT     │          CHESSBOARD            │  │  Stockfish 17      +0.35 (54%) │ │
│             │              (A)               │  │  Best: e4, d4, Nf3             │ │
│  [Paste     │         (interactive)          │  │                                │ │
│   game]     │                                │  │  Maia 1500          52.1%      │(B)
│             │      ┌──◄ ◄ ► ►►──┐            │  │  Predicted: e4 (35%), d4 (28%) │ │
│  [Load PGN] │      └────────────┘            │  │                                │ │
│             │                                │  │  EW (Maia)   53.2%             │ │
│─────────────│                                │  │  EW (SF)     54.1%             │ │
│             ├────────────────────────────────┴──┴────────────────────────────────┘ │
│   MOVE      │  ┌─ EXPECTED WINRATE TREE (C) ───────────────────────────────────┐   │
│   LIST      │  │  Sort by: [SF▼] [Maia] [Prob]                                 │   │
│             │  │                                                               │   │
│  1. e4  e5  │  │  ▼ e4   EW: 54.2%  prob: 35%  ────────────────────────────────│   │
│  2. Nf3 Nc6 │  │    ├─ e5  52% (45%)  ├─ Nf3 51% (40%)  └─ Bc4 50% (25%)  ...  │   │
│  3. Bb5 ... │  │    └─ c5  53% (30%)  ├─ Nc3 52% (35%)  └─ d3  51% (20%)       │   │
│             │  │                                                               │   │
│  (click to  │  │  ▶ d4  EW: 52.8%  prob: 28%   ▶ Nf3  EW: 51.1%  prob: 20%     │   │
│   navigate) │  │                                                               │   │
│             │  │  (hover: preview on board)  (click: navigate to position)     │   │
│             │  └───────────────────────────────────────────────────────────────┘   │
└─────────────┴──────────────────────────────────────────────────────────────────────┘

[Settings] dropdown (appears on click):
┌─────────────────────────┐
│ Prob Threshold: [1%  ▼] │
│ Maia Level:     [1500▼] │
│ SF Depth:       [12  ▼] │
│ Winrate Loss:   [5%  ▼] │
└─────────────────────────┘
```

**Layout Key:**
- **Left column:** PGN Input + Move List (full height)
- **Top right (A+B):** Chessboard + Evaluation Panel side-by-side
- **Bottom right (C):** Expected Winrate Tree spans under A+B for horizontal flow

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

## Expected Winrate Tree Visualization

The EW tree is **interactive and expandable**, allowing users to explore the lines Maia predicts humans will play.

### Tree Features

1. **Expand/Collapse** - Click a node to show/hide children
2. **Hover Preview** - Hovering shows position on the board
3. **Click to Navigate** - Clicking jumps the main board to that position
4. **Visual Indicators**:
   - Node size proportional to probability
   - Color gradient based on evaluation (green=good, red=bad)
   - Dashed lines for low-probability branches

### Example Visualization

```
Candidate Moves for current position:

▼ e4    EW: 54.2%  (SF: 52%, Prob: 35%)
  ├─ e5     48%   (SF: 48%, Prob: 45%)
  │  ├─ Nf3   51%   (SF: 51%, Prob: 40%)  ← click to expand
  │  └─ Bc4   50%   (SF: 50%, Prob: 25%)
  ├─ c5     52%   (SF: 52%, Prob: 30%)
  └─ e6     54%   (SF: 54%, Prob: 15%)

▶ d4    EW: 52.8%  (SF: 51%, Prob: 28%)  ← collapsed

▶ Nf3   EW: 51.1%  (SF: 50%, Prob: 20%)  ← collapsed
```

### Data Flow

1. User clicks "Calculate EW" at a position
2. Algorithm runs (4 phases) → produces tree of candidates
3. Results added as **variations** to the chessops game tree
4. Annotations stored in comments (`[%prob][%eval][%ew]`)
5. UI renders tree from chessops structure
6. Export to PGN preserves all data

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

## Success Criteria

The MVP is complete when:

- [ ] User can paste a PGN and see it on the board
- [ ] User can click moves to navigate the game
- [ ] **All 4 evaluations display** for current position:
  - [ ] SF Baseline (Stockfish direct evaluation)
  - [ ] Maia Baseline (Maia value head)
  - [ ] EW(SF) - Expected Winrate using SF at leaves
  - [ ] EW(Maia) - Expected Winrate using Maia at leaves
- [ ] Maia move probabilities display for current position
- [ ] Expected winrate tree is visualized (showing both EW variants)
- [ ] All unit tests pass (>80% coverage on core/)
- [ ] All E2E tests pass
- [ ] App is deployable and performant

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
