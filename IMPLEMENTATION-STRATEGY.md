# ExpectedEval MVP Implementation Strategy

## Executive Summary

**Recommendation: Start Fresh + Copy Engines + Testability First**

After extensive attempts to adapt `maia-platform-frontend/`, the "copy and strip down" approach proved problematic. The codebase has deep interconnections that cause cascading failures when components are removed.

**The optimal strategy:**
1. Start with a minimal Next.js setup
2. Copy ONLY the well-isolated engine infrastructure
3. **Separate logic from UI** - all core logic in pure functions/classes that are easily unit tested
4. Build new, simplified UI components that consume the tested logic
5. Use open source alternatives where maia-platform integration proves difficult

---

## Testability-First Architecture

### Core Principle: Logic/UI Separation

Every feature should have its core logic in **pure, testable modules** separate from React components.

```
src/
├── core/                    # PURE LOGIC (no React, no DOM)
│   ├── chess/
│   │   ├── game.ts          # Thin wrapper around chessops
│   │   ├── game.test.ts     # Unit tests
│   │   ├── annotations.ts   # Parse/serialize [%prob][%eval][%ew] comments
│   │   ├── annotations.test.ts
│   │   └── types.ts         # Re-export chessops types + our extensions
│   ├── engine/
│   │   ├── adapters.ts      # EngineAdapter interface (mockable)
│   │   ├── stockfish.ts     # SF wrapper (async interface)
│   │   ├── maia.ts          # Maia wrapper
│   │   └── types.ts         # Engine result types
│   └── analysis/
│       ├── expectedWinrate.ts      # EW algorithm (PURE)
│       ├── expectedWinrate.test.ts # Unit tests with mocked engines
│       ├── treeBuilder.ts          # Build EW results as chessops variations
│       └── treeBuilder.test.ts     # Unit tests
├── hooks/                   # React hooks that USE core logic
│   ├── useChessGame.ts      # Wraps core/chess/game.ts
│   └── useExpectedWinrate.ts # Wraps core/analysis/*
├── components/              # UI components (thin, rendering only)
│   ├── Board/
│   │   └── ...
│   └── Analysis/
│       ├── EWTree.tsx       # Expandable tree visualization
│       └── ...
└── __tests__/
    ├── e2e/                 # Playwright tests
    │   ├── analysis.spec.ts
    │   └── pgn-input.spec.ts
    └── integration/         # Integration tests
        └── engine-loading.test.ts
```

### chessops-First Design

We use **chessops** as the foundation. Our code is a thin wrapper:

| What we need           | chessops provides    | Our code                        |
|------------------------|----------------------|---------------------------------|
| PGN parsing            | `parsePgn()`         | Just call it                    |
| PGN export             | `makePgn()`          | Just call it                    |
| Move validation        | `Chess.isLegal()`    | Just call it                    |
| FEN generation         | `makeFen()`          | Just call it                    |
| Game tree / variations | Built-in             | EW branches = variations        |
| Annotations            | Comments in nodes    | Parse/serialize `[%prob]` etc.  |

**Key Insight:** chessops variations ARE our EW tree. When we calculate Expected Winrate, we add results as variations to the game tree with annotations in comments.

### Testing Strategy by Layer

| Layer | Test Type | Tools | What to Test |
|-------|-----------|-------|--------------|
| `core/chess/annotations.ts` | Unit | Vitest | Parse/serialize `[%prob][%eval][%ew]` comments |
| `core/chess/game.ts` | Unit | Vitest | Game loading, export, adding variations |
| `core/chess/navigation.ts` | Unit | Vitest | Forward/back, path navigation, FEN computation |
| `core/analysis/*` | Unit | Vitest | EW algorithm with mocked engine responses |
| `hooks/*` | Integration | RTL + Vitest | Hook behavior with mocked core |
| `components/Board/MoveList.tsx` | Component | RTL | Click navigation, current move highlight |
| `components/Analysis/PgnInput.tsx` | Component | RTL | Parse button, error states |
| `components/Analysis/EWTree.tsx` | Component | RTL | Tree expand/collapse, click navigation |
| Full app | E2E | Playwright | User flows, engine loading, visual regression |

**Note:** Vitest + React Testing Library (RTL) should cover 90%+ of tests. Playwright only for full integration with real engines and visual checks.

### Example: Testable Expected Winrate

```typescript
// src/core/analysis/expectedWinrate.ts
// PURE FUNCTION - no React, no side effects

export interface EngineAdapter {
  evaluatePosition(fen: string): Promise<{ winrate: number; bestMoves: string[] }>
  getMoveProbabilities(fen: string): Promise<Record<string, number>>
}

export interface EWConfig {
  maxDepth: number
  probabilityThreshold: number
  winrateLossThreshold: number
}

export interface EWResult {
  candidateMoves: Array<{
    move: string
    expectedWinrate: number
    exploredTree: TreeNode
  }>
  calculationTimeMs: number
}

/**
 * Calculate Expected Winrate for a position
 *
 * This is a PURE function - given the same inputs, returns the same outputs.
 * Engine calls are abstracted through the adapter interface for easy mocking.
 */
export async function calculateExpectedWinrate(
  fen: string,
  config: EWConfig,
  stockfish: EngineAdapter,
  maia: EngineAdapter
): Promise<EWResult> {
  // Phase 1: Filter candidate moves
  const candidates = await filterCandidateMoves(fen, config, stockfish)

  // Phase 2: Build probability trees
  const trees = await buildProbabilityTrees(candidates, config, maia)

  // Phase 3: Evaluate leaf positions
  const evaluatedTrees = await evaluateTreeLeaves(trees, stockfish)

  // Phase 4: Calculate weighted averages
  return computeExpectedWinrates(evaluatedTrees)
}
```

```typescript
// src/core/analysis/expectedWinrate.test.ts
import { calculateExpectedWinrate, EngineAdapter } from './expectedWinrate'

describe('calculateExpectedWinrate', () => {
  // Mock engines return predictable results
  const mockStockfish: EngineAdapter = {
    evaluatePosition: jest.fn().mockResolvedValue({
      winrate: 0.52,
      bestMoves: ['e2e4', 'd2d4', 'g1f3']
    }),
  }

  const mockMaia: EngineAdapter = {
    getMoveProbabilities: jest.fn().mockResolvedValue({
      'e7e5': 0.45,
      'c7c5': 0.25,
      'd7d6': 0.15,
    }),
  }

  it('returns candidate moves with expected winrates', async () => {
    const result = await calculateExpectedWinrate(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      { maxDepth: 2, probabilityThreshold: 0.1, winrateLossThreshold: 0.05 },
      mockStockfish,
      mockMaia
    )

    expect(result.candidateMoves).toHaveLength(3)
    expect(result.candidateMoves[0].expectedWinrate).toBeCloseTo(0.52, 2)
  })

  it('prunes branches below probability threshold', async () => {
    // Test that low-probability moves are not explored
  })

  it('handles mate positions correctly', async () => {
    // Test edge case
  })
})
```

### Playwright E2E Tests

```typescript
// src/__tests__/e2e/analysis.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Analysis Page', () => {
  test('loads and displays empty board', async ({ page }) => {
    await page.goto('/analysis')
    await expect(page.locator('.cg-board')).toBeVisible()
  })

  test('parses PGN and displays game', async ({ page }) => {
    await page.goto('/analysis')

    // Paste PGN
    await page.fill('[data-testid="pgn-input"]', '1. e4 e5 2. Nf3 Nc6')
    await page.click('[data-testid="load-pgn-button"]')

    // Verify board shows starting position
    await expect(page.locator('.cg-board')).toBeVisible()

    // Verify move list populated
    await expect(page.locator('[data-testid="move-list"]')).toContainText('e4')
    await expect(page.locator('[data-testid="move-list"]')).toContainText('Nc6')
  })

  test('clicking move navigates board', async ({ page }) => {
    await page.goto('/analysis')
    await page.fill('[data-testid="pgn-input"]', '1. e4 e5 2. Nf3')
    await page.click('[data-testid="load-pgn-button"]')

    // Click first move
    await page.click('[data-testid="move-0"]')

    // Board should show position after 1. e4
    // (verify by checking piece positions or FEN display)
  })

  test('engine loads and shows evaluation', async ({ page }) => {
    await page.goto('/analysis')

    // Wait for engine to load (may take a few seconds)
    await expect(page.locator('[data-testid="stockfish-status"]')).toContainText('Ready', { timeout: 10000 })

    // Load a position
    await page.fill('[data-testid="pgn-input"]', '1. e4')
    await page.click('[data-testid="load-pgn-button"]')

    // Wait for evaluation
    await expect(page.locator('[data-testid="sf-eval"]')).not.toContainText('...', { timeout: 5000 })
  })
})
```

### Data-TestId Convention

Every interactive element gets a `data-testid` attribute:

```tsx
// Components use consistent testid naming
<textarea data-testid="pgn-input" />
<button data-testid="load-pgn-button">Load</button>
<div data-testid="move-list">...</div>
<span data-testid="move-{index}">{move}</span>
<div data-testid="sf-eval">{evaluation}</div>
<div data-testid="maia-moves">...</div>
<div data-testid="expected-winrate">{winrate}</div>
<div data-testid="stockfish-status">{status}</div>
<div data-testid="maia-status">{status}</div>
```

---

## Open Source Alternatives

If maia-platform components prove difficult to integrate, these are well-maintained alternatives:

### Chess Logic Libraries

| Library | npm | Pros | Cons | Recommendation |
|---------|-----|------|------|----------------|
| **[chessops](https://github.com/niklasf/chessops)** | `chessops` | By Lichess author, full TypeScript, variants support, PGN module | GPL-3.0 license | **Primary choice** |
| **[chess.js](https://github.com/jhlywa/chess.js)** | `chess.js` | Most popular, well-documented, MIT license | No variants, heavier | Fallback option |
| **[chess.ts](https://github.com/lubert/chess.ts)** | `@lubert/chess.ts` | Used by maia-platform | Less maintained | Only if needed for compatibility |

**Decision:** Start with `chessops` - it's actively maintained by Niklas Fiekas (Lichess contributor) and has excellent TypeScript support including a dedicated PGN parsing module.

### Board UI Components

| Library | npm | Pros | Cons | Recommendation |
|---------|-----|------|------|----------------|
| **[chessground](https://github.com/lichess-org/chessground)** | `chessground` | Used by Lichess, performant, flexible | Requires manual React wrapper | **Primary choice** |
| **[react-chessboard](https://github.com/Clariity/react-chessboard)** | `react-chessboard` | Native React, easy setup, active development | Less customizable | Fallback option |
| **[react-chessground](https://www.npmjs.com/package/react-chessground)** | `react-chessground` | Pre-built React wrapper for chessground | Less maintained | If chessground is hard to wrap |

**Decision:** Try `chessground` first (matches maia-platform). Fall back to `react-chessboard` if wrapping proves difficult.

### Stockfish WASM

| Library | Source | Pros | Cons | Recommendation |
|---------|--------|------|------|----------------|
| **[nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js)** | npm `stockfish` | Chess.com's build, SF 17.1, multiple flavors | Large (75MB full) | **Primary choice** |
| **[lichess-org/stockfish.wasm](https://github.com/lichess-org/stockfish.wasm)** | Manual copy | Smaller (~400KB), multi-threaded | Requires manual setup | If size matters |
| **maia-platform files** | `public/stockfish/` | Already configured | Tied to old version | Fallback |

**Decision:** Use `nmrugg/stockfish.js` from npm for easier setup and latest Stockfish version.

### Maia Neural Network

No direct alternatives - Maia is a specific model. Options:

| Approach | Pros | Cons |
|----------|------|------|
| **Copy maia-platform engine files** | Known working | Tied to their ONNX setup |
| **Direct ONNX Runtime** | More control | Need to understand tensor format |
| **Mock for testing** | Easy to test | Need real engine for production |

**Decision:** Copy the maia-platform engine wrapper, but wrap it with a testable adapter interface.

---

## Recommended Architecture (Updated)

### File Structure with Testability

```
src/
├── core/                        # PURE LOGIC - 100% unit testable
│   ├── chess/
│   │   ├── game.ts              # Thin wrapper around chessops (load/export)
│   │   ├── game.test.ts
│   │   ├── navigation.ts        # Track current position in tree (stateless chessops)
│   │   ├── navigation.test.ts
│   │   ├── annotations.ts       # Parse/serialize [%prob][%eval][%ew]
│   │   ├── annotations.test.ts
│   │   └── types.ts             # Re-export chessops types + extensions
│   ├── engine/
│   │   ├── adapters.ts          # EngineAdapter interface (mockable)
│   │   ├── stockfish.ts         # Stockfish implementation
│   │   ├── maia.ts              # Maia implementation
│   │   ├── tensor.ts            # Board preprocessing (copy from maia-platform)
│   │   └── storage.ts           # IndexedDB caching (copy from maia-platform)
│   └── analysis/
│       ├── expectedWinrate.ts   # EW algorithm (pure)
│       ├── expectedWinrate.test.ts
│       ├── treeBuilder.ts       # Build EW results as chessops variations
│       ├── treeBuilder.test.ts
│       └── types.ts             # Analysis type definitions
├── hooks/                       # React hooks - thin wrappers
│   ├── useChessGame.ts          # Uses core/chess/game.ts + navigation.ts
│   ├── useChessGame.test.tsx    # RTL integration tests
│   ├── useStockfish.ts          # Uses core/engine/stockfish.ts
│   ├── useMaia.ts               # Uses core/engine/maia.ts
│   └── useExpectedWinrate.ts    # Uses core/analysis/*
├── components/                  # UI components - rendering only
│   ├── Board/
│   │   ├── GameBoard.tsx        # Chessground wrapper
│   │   ├── MoveList.tsx         # Move navigation (renders chessops tree)
│   │   ├── MoveList.test.tsx    # RTL component tests
│   │   └── index.ts
│   ├── Analysis/
│   │   ├── PgnInput.tsx         # Textarea + parse button
│   │   ├── PgnInput.test.tsx    # RTL component tests
│   │   ├── EnginePanel.tsx      # SF + Maia display
│   │   ├── EWTree.tsx           # Expandable tree (renders chessops variations)
│   │   ├── EWTree.test.tsx      # RTL component tests
│   │   └── index.ts
│   └── Layout/
│       └── Header.tsx
├── contexts/                    # React contexts (minimal)
│   ├── EngineContext.tsx        # Provides engine instances
│   └── index.ts
├── pages/
│   ├── _app.tsx
│   ├── index.tsx
│   └── analysis.tsx
├── styles/
│   └── globals.css
├── types/
│   └── index.ts                 # Re-exports from core
└── __tests__/
    ├── e2e/                     # Playwright
    │   ├── analysis.spec.ts
    │   ├── pgn-input.spec.ts
    │   └── engine-loading.spec.ts
    └── integration/
        └── hooks.test.tsx       # React Testing Library
```

### chessops Integration Pattern

```typescript
// src/core/chess/game.ts - load/export only (just calls chessops)
import { parsePgn, makePgn, type PgnNodeData, type Game } from 'chessops/pgn';
import { serializeAnnotations } from './annotations';

export function loadGame(pgn: string): Game<PgnNodeData> {
  const games = parsePgn(pgn);
  return games[0];
}

export function exportGame(game: Game<PgnNodeData>): string {
  return makePgn(game);
}

// Add EW results as variations with annotations
export function addEWVariations(
  node: PgnNodeData,
  candidates: EWCandidate[]
): void {
  for (const candidate of candidates) {
    node.children.push({
      data: {
        san: candidate.move,
        comments: [serializeAnnotations({
          prob: candidate.probability,
          eval: candidate.evaluation,
          ew: candidate.expectedWinrate,
        })],
      },
      children: [],
    });
  }
}
```

```typescript
// src/core/chess/navigation.ts - our code (chessops is stateless)
import { type PgnNodeData, type Game } from 'chessops/pgn';
import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';

export interface NavigationState {
  game: Game<PgnNodeData>;
  currentPath: number[];  // e.g., [0, 0, 1] = mainline move 0, then child 0, then child 1
}

export function getCurrentNode(state: NavigationState): PgnNodeData | null {
  let node = state.game.moves;
  for (const index of state.currentPath) {
    if (!node.children[index]) return null;
    node = node.children[index];
  }
  return node.data;
}

export function getCurrentFen(state: NavigationState): string {
  // Replay moves from start to compute FEN
  const chess = Chess.default();
  let node = state.game.moves;
  for (const index of state.currentPath) {
    const child = node.children[index];
    if (!child) break;
    // Apply move to chess position
    // ... (uses chessops move parsing)
    node = child;
  }
  return makeFen(chess.toSetup());
}

export function goForward(state: NavigationState): NavigationState {
  const node = getCurrentNode(state);
  if (!node || !state.game.moves.children.length) return state;
  return { ...state, currentPath: [...state.currentPath, 0] };
}

export function goBack(state: NavigationState): NavigationState {
  if (state.currentPath.length === 0) return state;
  return { ...state, currentPath: state.currentPath.slice(0, -1) };
}
```

### Dependency Graph

```
                    ┌─────────────────────────────┐
                    │     UI Components           │
                    │  (GameBoard, EWTree, etc)   │
                    └─────────────┬───────────────┘
                                  │ uses
                    ┌─────────────▼───────────────┐
                    │      React Hooks            │
                    │  (useChessGame, useEW, etc) │
                    └─────────────┬───────────────┘
                                  │ wraps
    ┌─────────────────────────────▼─────────────────────────────┐
    │                    Core Logic                              │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
    │  │ chess/       │  │ engine/      │  │ analysis/        │ │
    │  │ - game.ts    │  │ - adapters   │  │ - expectedWinrate│ │
    │  │ - annotations│  │ - stockfish  │  │ - treeBuilder    │ │
    │  │   (thin wrap)│  │ - maia       │  │   (adds vars)    │ │
    │  └──────────────┘  └──────────────┘  └──────────────────┘ │
    │         │                │                                 │
    │         ▼                ▼                                 │
    │              External Libraries                            │
    │    chessops          onnxruntime-web    stockfish WASM    │
    │  (PGN, moves,        (Maia NN)          (SF eval)         │
    │   variations)                                              │
    └────────────────────────────────────────────────────────────┘
```

---

## Updated Implementation Plan

### Phase 1: Foundation + Test Setup (Day 1)

1. **Initialize Clean Project**
   ```bash
   npm init -y
   npm install next react react-dom typescript
   npm install chessops onnxruntime-web
   npm install -D vitest @testing-library/react playwright @types/react
   ```

2. **Configure Testing**
   ```typescript
   // vitest.config.ts
   export default {
     test: {
       environment: 'jsdom',
       include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
     },
   }
   ```

   ```typescript
   // playwright.config.ts
   export default {
     testDir: './src/__tests__/e2e',
     use: { baseURL: 'http://localhost:3000' },
   }
   ```

3. **Set up core/chess with tests**
   - Implement `game.ts` with unit tests
   - Implement `pgn.ts` with unit tests
   - Verify: `npm test` passes

### Phase 2: Engine Integration (Day 2)

1. **Create Engine Adapter Interface**
   - Define `EngineAdapter` interface
   - Create mock implementations for testing
   - Write unit tests with mocks

2. **Integrate Real Engines**
   - Copy Stockfish WASM or install from npm
   - Copy Maia ONNX files
   - Create real adapter implementations
   - Write integration tests

3. **Verify: Engine Loading E2E Test**
   - Playwright test that engines load successfully

### Phase 3: Core Analysis Logic (Day 3)

1. **Implement Expected Winrate Algorithm**
   - `treeBuilder.ts` with unit tests
   - `expectedWinrate.ts` with unit tests
   - All tests use mocked engines

2. **Verify: All Unit Tests Pass**
   - `npm test` runs all core logic tests
   - Coverage report shows >80% on core/

### Phase 4: UI Components (Day 4)

1. **Build Components with data-testid**
   - `GameBoard.tsx` - wraps chessground
   - `MoveList.tsx` - displays moves
   - `PgnInput.tsx` - textarea + button
   - `EnginePanel.tsx` - shows results

2. **Write React Hook Wrappers**
   - `useChessGame.ts`
   - `useExpectedWinrate.ts`

3. **Verify: Component Tests Pass**

### Phase 5: Integration + E2E (Day 5)

1. **Wire Up Analysis Page**
   - Combine all components
   - Connect to real engines

2. **Write Full E2E Tests**
   - PGN loading flow
   - Move navigation
   - Engine evaluation display
   - Expected winrate calculation

3. **Verify: All Playwright Tests Pass**

### Phase 6: Polish (Day 6)

1. **Styling and Error Handling**
2. **Performance Optimization**
3. **Final Test Pass**

---

## Key Dependencies (Updated)

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "chessops": "^0.14.0",
    "chessground": "^9.5.0",
    "onnxruntime-web": "^1.17.0",
    "stockfish": "^17.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@playwright/test": "^1.48.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test"
  }
}
```

---

## Lessons Learned (from failed approach)

### Why "Copy and Adapt" Failed

1. **Tight Component Coupling** - Components import from 10+ modules
2. **Platform-Wide Assumptions** - Auth, tours, analytics everywhere
3. **Type Definition Sprawl** - Circular type dependencies
4. **API Dependencies** - Backend calls that don't exist in MVP

### What Worked Well

1. **Engine Infrastructure is Self-Contained** - Can be copied with minimal changes
2. **Public Assets Are Standalone** - Just copy the folders
3. **Core Chess Utilities Are Reusable** - FEN/PGN parsing patterns

---

## Success Metrics (Updated)

MVP is complete when:
- [ ] `npm test` - All unit tests pass (>80% coverage on core/)
- [ ] `npm run test:e2e` - All Playwright tests pass
- [ ] Paste PGN → see game on board
- [ ] Click move → board updates
- [ ] See Stockfish eval for current position
- [ ] See Maia move probabilities
- [ ] Calculate expected winrate for position
- [ ] Clean, maintainable codebase (<2000 lines of new code)

---

## Quick Reference: Open Source Links

### Primary Dependencies
- **chessops**: https://github.com/niklasf/chessops - Chess logic (TypeScript)
- **chessground**: https://github.com/lichess-org/chessground - Board UI
- **stockfish.js**: https://github.com/nmrugg/stockfish.js - SF WASM (Chess.com)
- **onnxruntime-web**: https://www.npmjs.com/package/onnxruntime-web - Neural network runtime

### Fallback Options
- **react-chessboard**: https://github.com/Clariity/react-chessboard - Easier React board
- **chess.js**: https://github.com/jhlywa/chess.js - Alternative chess library
- **lichess stockfish.wasm**: https://github.com/lichess-org/stockfish.wasm - Smaller SF

### Testing
- **Vitest**: https://vitest.dev/ - Fast unit testing
- **Playwright**: https://playwright.dev/ - E2E testing
- **React Testing Library**: https://testing-library.com/react - Component testing

---

## Conclusion

The "start fresh + testability first" approach will result in:
- **Confidence** - Every feature proven by tests before integration
- **Debuggability** - Core logic isolated from React, easy to inspect
- **Faster iteration** - Unit tests run in milliseconds, catch bugs early
- **Cleaner codebase** - Only code that's actually used and tested

Estimated timeline: 5-6 focused development days for MVP.

---

## Appendix: Challenges Encountered with Original Approach

### What RESTART-PROMPT.md Prescribed

The original plan in `RESTART-PROMPT.md` was to:
1. Copy components from `maia-platform-frontend/` into the project root
2. Delete non-analysis features (play, puzzles, turing, profiles, etc.)
3. Keep the engine infrastructure and analysis UI intact
4. End up with a simplified analysis-only app

### What Actually Happened

**Attempt 1: Copy and Strip Down**

We copied the following from maia-platform-frontend:
- Config files (package.json, tsconfig.json, next.config.js, etc.)
- Engine files (public/stockfish/, public/maia2/, src/lib/engine/)
- Contexts (src/contexts/)
- Components (src/components/Board/, src/components/Analysis/)
- Hooks (src/hooks/)
- Types (src/types/)

**Result:** ~25+ build errors due to cascading dependencies.

### Specific Failures

1. **Context Dependencies**
   ```
   AnalysisListContext.tsx → fetchWorldChampionshipGameList (API)
   AuthContext.tsx → fetchAccount, connectLichessUrl (API)
   ```
   Contexts assumed backend API functions that don't exist in MVP.

2. **Component Assumptions**
   ```
   AnalysisSidebar → useTour → TourContext → tourConfigs
   Header → useAuth → AuthContext → API calls
   ```
   UI components were deeply integrated with auth, tours, analytics.

3. **Type Sprawl**
   ```
   AnalysisWebGame → Move → Player → User → AuthContext
   ```
   Removing one type broke 5 others in a chain.

4. **Constant Mismatches**
   ```
   MAIA_MODELS expected as object[] but components used string[]
   Missing: MOVE_CLASSIFICATION_THRESHOLDS, LEARN_FROM_MISTAKES_DEPTH
   ```
   Different parts of codebase expected different shapes.

5. **Hook Complexity**
   ```
   useAnalysisController/ - 1000+ lines across 6 files
   useExpectedWinrateController/ - Complex orchestration with many imports
   ```
   Hooks were tightly coupled to full platform context.

### Files We Had to Delete

After multiple attempts to stub missing dependencies:
- `BroadcastAnalysis.tsx`, `BroadcastGameList.tsx`, `StreamAnalysis.tsx`
- `AnalysisGameList.tsx`, `Highlight.tsx`, `GameClock.tsx`
- `GameplayInterface.tsx`, `StatsDisplay.tsx`, `Header.tsx`, `GameInfo.tsx`

Each deletion caused new import errors in other files.

### Time Spent

- ~3 hours copying and configuring
- ~2 hours creating stubs for missing exports
- ~2 hours deleting problematic components
- Build still failing with 25+ errors when we stopped

### Key Insight

The maia-platform codebase was designed as a **monolithic platform**, not a **component library**. Features are interconnected by design:

```
┌─────────────────────────────────────────────────────┐
│                 maia-platform                        │
│  ┌─────────────────────────────────────────────────┐│
│  │ Auth ←→ Tours ←→ Analytics ←→ Sounds ←→ API    ││
│  └───────────────────┬─────────────────────────────┘│
│                      │                               │
│  ┌───────────────────▼─────────────────────────────┐│
│  │     Analysis │ Play │ Puzzles │ Turing │ ...    ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘

Removing any feature pulls on the shared layer.
```

### What DID Work

The **engine infrastructure** was self-contained:
- `src/lib/engine/maia.ts` - Only depends on onnxruntime-web
- `src/lib/engine/stockfish.ts` - Only depends on WASM files
- `src/lib/engine/tensor.ts` - Pure computation, no React
- `src/lib/engine/storage.ts` - IndexedDB utilities

These can be copied directly with minimal changes.

### Recommendation

**Don't try to extract features from maia-platform-frontend.** Instead:

1. **Copy only:** Engine files + public assets (WASM, ONNX)
2. **Build new:** Everything else (UI, hooks, pages)
3. **Reference:** Look at maia-platform for patterns, don't copy code

This is why we pivoted to the "Start Fresh + Copy Engines + Testability First" approach.
