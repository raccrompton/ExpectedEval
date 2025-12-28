# Memory Investigation & Fix Plan

## Problem Statement
Tab crashes due to excessive memory usage in the ExpectedEval app.

---

## Investigation Findings

### Baseline Memory Budget

| Component | Size | Notes |
|-----------|------|-------|
| Stockfish WASM + NNUE | ~160 MB | SharedArrayBuffer, cannot be freed until page reload |
| Maia ONNX model | ~89 MB | Loaded into ONNX runtime |
| React + dependencies | ~50 MB | Development mode adds overhead |
| **Baseline total** | **~300 MB** | Before any analysis |

**Reasonable target**: 300-400 MB total. Crashes suggest we're exceeding this significantly.

---

## Critical Issues Found

### 1. Redundant Maia Predictions (HIGH PRIORITY)

**Location**: [src/core/analysis/expectedWinrate.ts:525-533](src/core/analysis/expectedWinrate.ts#L525-L533)

**Problem**: `selectCandidatesByMaiaProbability()` evaluates ALL legal moves (~20-30) before filtering to top candidates. Each position is then re-evaluated in tree builder.

**Evidence**: Console shows duplicate log lines for identical Maia predictions:
```
[LOG] Maia value: raw=-0.1813, winProb=0.4093, isBlackTurn=false
[LOG] Maia value: raw=-0.1813, winProb=0.4093, isBlackTurn=false
```

**Impact**:
- 2-3x more Maia inferences than necessary
- Each inference allocates tensors (~1-2 MB)
- Slow calculation time (observed 50+ seconds for starting position)

### 2. No Position Caching

**Location**: Multiple files call `maia.predict()` independently

**Problem**: Same FEN positions are evaluated multiple times across:
- Candidate selection
- Tree building (parent nodes)
- Tree building (child nodes)
- Re-traversals for same branches

**Impact**: Exponential redundant work as tree grows

### 3. Expanded Nodes State Never Cleared (MEDIUM)

**Location**: [src/components/Analysis/EWSection.tsx:496](src/components/Analysis/EWSection.tsx#L496)

**Problem**: `expandedNodes` Set accumulates node IDs across position changes, never cleared.

```typescript
const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
// Never cleared when FEN changes
```

**Impact**: Memory leak over time as user navigates positions

### 4. ONNX Output Tensors Not Disposed (HIGH)

**Location**: [src/core/engine/maia.ts:335](src/core/engine/maia.ts#L335)

**Problem**: Output tensors from `model.run()` are never disposed.

```typescript
const { logits_maia, logits_value } = await this.model.run(feeds)
// ... process outputs ...
// NO tensor.dispose() called!
```

Per [ONNX Runtime docs](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu): "Call `tensor.dispose()` explicitly to destroy the underlying buffer when it is no longer needed."

**Impact**: Each `predict()` call leaks tensor memory. With 50+ predictions per EW calculation, this compounds rapidly.

### 5. Incomplete Engine Cleanup (LOW)

**Location**:
- [src/core/engine/stockfish.ts:392-399](src/core/engine/stockfish.ts#L392-L399)
- [src/core/engine/storage.ts:72](src/core/engine/storage.ts#L72)

**Problems**:
- Stockfish `store` object not cleared in `destroy()`
- IndexedDB connection never explicitly closed
- WASM memory relies on GC (may not release promptly)

---

## Fix Plan

### Phase 1: Maia Prediction Caching (Highest Impact)

**Goal**: Eliminate redundant Maia predictions by caching results

**Changes**:

1. **Create cache module** at `src/core/analysis/predictionCache.ts`:
   ```typescript
   // LRU cache for Maia predictions, keyed by FEN
   const cache = new Map<string, MaiaEvaluation>()
   const MAX_CACHE_SIZE = 1000  // ~50-100 MB worst case

   export function getCachedPrediction(fen: string): MaiaEvaluation | undefined
   export function cachePrediction(fen: string, result: MaiaEvaluation): void
   export function clearCache(): void
   ```

2. **Wrap Maia calls** in tree builder and EW calculation to use cache

3. **Clear cache** when position changes in useExpectedWinrate hook

**Expected impact**: 50-70% reduction in Maia calls

### Phase 2: Eliminate Duplicate Candidate Evaluations

**Goal**: Avoid evaluating the same position twice (candidate selection + tree root)

**Design clarification** (per user):
- ALL legal moves are candidate moves (not filtered by probability)
- Optional SF filtering when Stockfish is enabled
- Each candidate gets an EW tree assuming that move has been played

**Current problem**:

The same position is evaluated TWICE:
1. `selectCandidatesByMaiaProbability` calls `maia.predict(afterMoveFen)` to get `candidate.maiaWinrate`
2. `buildTree` calls `maia.predict(rootFen)` to get `tree.root.maiaWinrate`

These are the **same FEN** - the position after playing the candidate move!

**Current flow (inefficient)**:
```
selectCandidatesByMaiaProbability:
  - predict(fen) → get probabilities
  - for each legal move (30 moves):
    - predict(afterMoveFen) → get maiaWinrate  ← 30 calls

buildTree (for each of 30 candidates):
  - predict(rootFen) → get root maiaWinrate    ← 30 MORE calls, same positions!
  - recursively build tree...
```

**Fixed flow (with caching from Phase 1)**:
```
selectCandidatesByMaiaProbability:
  - predict(fen) → get probabilities
  - for each legal move (30 moves):
    - cachedPredict(afterMoveFen) → get maiaWinrate  ← 30 calls, cached

buildTree (for each of 30 candidates):
  - cachedPredict(rootFen) → cache HIT!              ← 0 new calls
  - recursively build tree (also uses cache)
```

**Expected impact**: Tree roots are free (cache hits). Overall ~50% fewer total predictions.

### Phase 3: Dispose ONNX Tensors

**Goal**: Prevent tensor memory leaks in Maia predictions

**Changes** in `src/core/engine/maia.ts`:

```typescript
// In predict() method, after processing outputs:
const { logits_maia, logits_value } = await this.model.run(feeds)

// ... process outputs ...

// Dispose output tensors to free memory
logits_maia.dispose()
logits_value.dispose()

return { policy, value, eloLevel }
```

**Expected impact**: Eliminates per-prediction memory leak

### Phase 4: Fix React State Leaks

**Goal**: Clear accumulated state on position changes

**Changes**:

1. **Clear expandedNodes on FEN change** in EWSection:
   ```typescript
   useEffect(() => {
     setExpandedNodes(new Set())
   }, [candidates])  // Reset when new calculation arrives
   ```

2. **Clear tooltipData** similarly if needed

### Phase 5: Improve Engine Cleanup (Optional)

**Changes**:

1. Clear Stockfish `store` in `destroy()`
2. Add `close()` method to MaiaModelStorage
3. Consider lazy-loading engines (only load when needed)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/analysis/predictionCache.ts` | **NEW** - LRU cache for Maia predictions |
| `src/core/analysis/expectedWinrate.ts` | Use cache, optimize candidate selection |
| `src/core/analysis/treeBuilder.ts` | Use cache |
| `src/core/engine/maia.ts` | Dispose output tensors after processing |
| `src/hooks/useExpectedWinrate.ts` | Clear cache on position change |
| `src/components/Analysis/EWSection.tsx` | Clear expandedNodes on new results |

---

## Testing Strategy

1. **Unit tests** for prediction cache (LRU behavior, clear, hit/miss)
2. **Integration test** verifying cache reduces prediction count
3. **Manual testing** - monitor console for duplicate predictions
4. **Memory profiling** in Chrome DevTools before/after

---

## Success Criteria

- [ ] No duplicate Maia prediction logs in console
- [ ] EW calculation completes in <10 seconds for starting position
- [ ] Tab memory stays under 500 MB after multiple calculations
- [ ] No crashes after navigating through 20+ positions
