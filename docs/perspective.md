Handy notes:

### Engine Evaluation Perspective (IMPORTANT)

**FIXED** - Perspective handling is now consistent across all engines and the EW tree builder.

Empirical testing (`src/core/engine/perspective.test.ts`) verifies perspective conventions:

| Engine             | File                | Output    | Perspective      |
| ------------------ | ------------------- | --------- | ---------------- |
| **Stockfish Node** | `stockfish.node.ts` | `cp`      | White's          |
| **Stockfish Node** | `stockfish.node.ts` | `winrate` | Side-to-move     |
| **Maia Node**      | `maia.node.ts`      | `value`   | Side-to-move     |
| **Maia Browser**   | `maia.ts`           | `value`   | Side-to-move     |

**The Convention:**

- **Engine layer** returns evaluations from **side-to-move's perspective**
- **Consumer layer** (treeBuilder.ts) normalizes to **root player's perspective** using `currentTurn === rootTurn` pattern

**Test file:** `src/core/engine/perspective.test.ts` - run to verify perspective behavior

## Engine Evaluation Perspective Conventions

**CRITICAL:** Different evaluation fields use different perspectives. Getting this wrong causes display bugs.

| Field             | Perspective    | Example: White winning, Black to move |
| ----------------- | -------------- | ------------------------------------- |
| `cp`              | WHITE's        | `+150` (positive = White better)      |
| `moveEvaluations` | WHITE's        | `{ "d6": +150, "Nc6": +148 }`         |
| `winrate`         | SIDE-TO-MOVE's | `0.25` (Black has 25% chance)         |
| `wdl`             | SIDE-TO-MOVE's | `{ win: 5, draw: 40, loss: 55 }`      |
| `moveWinrates`    | SIDE-TO-MOVE's | `{ "d6": 0.25, "Nc6": 0.26 }`         |
| Maia `value`      | SIDE-TO-MOVE's | `0.25` (Black has 25% chance)         |

### Why the Difference?

- **cp in White's perspective**: Matches standard chess UI convention (`+0.50` = White better)
- **winrate in side-to-move perspective**: More useful for "best move for me" sorting logic

### Key Implementation Details

1. **UCI Stockfish** outputs cp from **side-to-move's** perspective
2. Our `stockfish.ts` converts cp to **White's perspective** via `convertToWhitePerspective()`
3. **winrate/WDL** are passed through unchanged (stay in side-to-move perspective)
4. When **sorting moves** in UI, sort descending for White, ascending for Black

### Regression Test

The `src/core/engine/perspective.test.ts` file **empirically verifies** these conventions by evaluating positions where one side is clearly winning. Any perspective bug will cause these tests to fail.

---

## All Perspective-Related Code Locations

### 🟢 FIXED BUGS

| File | Lines | Fix Applied |
|------|-------|-------------|
| `src/core/engine/maia.node.ts` | 316-322 | Removed incorrect flip for Black's turn - now returns side-to-move perspective (matching browser `maia.ts`) |
| `src/core/analysis/treeBuilder.ts` | 148-153 | Changed to `currentTurn === rootTurn` pattern for Maia normalization at root node |
| `src/core/analysis/treeBuilder.ts` | 261-266 | Changed to `currentTurn === rootTurn` pattern for Maia normalization at child nodes |

**Resolution:** All Maia code now uses side-to-move perspective at engine layer, with `currentTurn === rootTurn` normalization in treeBuilder (same pattern as SF handling)

---

### 🟢 Engine Output Layer (Where perspectives are set)

| File | Lines | What | Perspective | Notes |
|------|-------|------|-------------|-------|
| `src/core/engine/maia.ts` | 407-413 | Browser Maia `value` | **Side-to-move** | No flip applied |
| `src/core/engine/maia.node.ts` | 316-322 | Node Maia `value` | **Side-to-move** | No flip applied (FIXED) |
| `src/core/engine/stockfish.ts` | 507-513 | Browser SF `cp` | **White's** | Converts via `convertToWhitePerspective()` |
| `src/core/engine/stockfish.ts` | 513 | Browser SF `winrate` | **Side-to-move** | Passed through unchanged |
| `src/core/engine/stockfish.node.ts` | 390-394 | Node SF `cp` | **White's** | Flips for Black |
| `src/core/engine/stockfish.node.ts` | 405-411 | Node SF `winrate` | **Side-to-move** | Calculated from original cp |

---

### 🟢 Correct Normalization (Verify these remain correct)

| File | Lines | What | Why Correct |
|------|-------|------|-------------|
| `src/core/analysis/treeBuilder.ts` | 393-402 | SF winrate normalization | Uses `currentTurn === rootTurn` pattern ✓ |
| `src/core/analysis/expectedWinrate.ts` | 553 | `1 - maiaEval.value` | After applying move, opponent is to move, so invert ✓ |
| `src/core/analysis/expectedWinrate.ts` | 668 | `1 - sfEval.winrate` | Same - after move, invert to get our perspective ✓ |
| `src/core/analysis/expectedWinrate.ts` | 817-819 | SF and Maia inversion | Same - single move application, always invert ✓ |

---

### 📄 Type Definitions (Documentation)

| File | Lines | Documents |
|------|-------|-----------|
| `src/core/engine/types.ts` | 17-32 | General perspective convention comments |
| `src/core/engine/types.ts` | 58 | `cp` is from WHITE's perspective |
| `src/core/engine/types.ts` | 68 | `winrate` is from SIDE-TO-MOVE's perspective |
| `src/core/engine/types.ts` | 174 | Maia `value` is from SIDE-TO-MOVE's perspective |
| `src/core/analysis/types.ts` | 75, 91 | TreeNode fields are from ROOT player's perspective |
| `src/core/analysis/types.ts` | 162 | EWCandidate winrate is from side-to-move perspective |

---

### 🔧 Tensor Preprocessing (Board mirroring)

| File | Lines | What |
|------|-------|------|
| `src/core/engine/tensor.ts` | 158-160 | Comment: "Maia always evaluates from White's perspective" |
| `src/core/engine/tensor.ts` | 190 | Mirrors board for Black's turn |
| `src/core/engine/tensor.ts` | 301-302 | `mirrorMove()` - converts moves for perspective |
| `src/core/engine/tensor.ts` | 411-413 | `mirrorFen()` - mirrors position for Black |

**Note:** Board mirroring means the MODEL sees the position as if White is to move. But the OUTPUT value is still from the side-to-move's perspective (the original side, not the mirrored side).

---

### 🧪 Test Files

| File | Purpose |
|------|---------|
| `src/core/engine/perspective.test.ts` | **Empirical verification** - evaluates winning positions to verify perspective |
| `src/core/engine/stockfish.test.ts` | Tests `convertToWhitePerspective()` function |
| `src/__tests__/e2e/07-real-engines.spec.ts` | E2E test with perspective sanity check (lines 105-119) |

---

## Quick Reference: Normalization Patterns

### Pattern 1: Single move application (CORRECT)
```typescript
// After applying ONE move, opponent is to move
// Their evaluation inverted = our evaluation
maiaWinrate: 1 - maiaEval.value
sfWinrate: 1 - sfEval.winrate
```

### Pattern 2: Tree node at arbitrary depth (FIXED)
```typescript
// CORRECT (now implemented):
const currentTurn = getTurnFromFen(nodeFen)
const normalized = currentTurn === rootTurn ? value : 1 - value
```

### Pattern 3: SF handling in treeBuilder (CORRECT - use as reference)
```typescript
// From treeBuilder.ts lines 393-402
const currentTurn = getTurnFromFen(node.fen)
if (currentTurn === rootTurn) {
  node.sfWinrate = sfResult.winrate      // Same perspective
} else {
  node.sfWinrate = 1 - sfResult.winrate  // Opposite - invert
}
```
