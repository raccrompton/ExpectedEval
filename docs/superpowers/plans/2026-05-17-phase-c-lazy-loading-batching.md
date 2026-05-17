# Phase C — Lazy Engine Loading + Batched Maia Inference — Implementation Plan

> **For agentic workers:** Execute task-by-task with review between tasks (superpowers:subagent-driven-development).

**Goal:** Make real iOS Safari run the app without OOM, and remove the ~5× Win Finder slowdown introduced by the Maia 3 worker.

**Architecture:** Two independent changes. (1) **Batching** — add a `predictBatch` path so Win Finder issues one worker round-trip per position instead of ~35; the worker already supports `batchSize`. (2) **Lazy Stockfish init** — `EngineContext` initializes Maia eagerly but defers Stockfish until first use, so a fresh iOS tab never holds Stockfish's 404MB + ONNX at once.

**Tech Stack:** Same as the engine-migration plan. Branch: `fix/safari-engine-loading` (continues from Phase A+B).

**Context from Phase A+B verification:** Maia 3 + worker works on desktop; iOS still OOMs (`RangeError: Out of memory` from ONNX `initWasm`) because both engines load eagerly. Stockfish is 404MB resident. Win Finder on macOS went from ~30s to ~2.5min because the worker adds a postMessage round-trip per `predict()` and Win Finder makes ~2,700 calls.

**Key facts:** The worker (`public/maia-worker.js`) already handles `{ type:'inference', batchSize, tokens, eloSelfs, eloOppos }` with `tokens` shaped `[batchSize·64·12]` and replies with concatenated logits. Per-item slice sizes (from maia-platform `batchEvaluateMaia3`): `moveLogitsPerItem = 4352`, `valueLogitsPerItem = 3`. `RealMaia.runInference` already accepts a `batchSize` parameter.

---

### Task C1: Batched Maia inference

**Files:** Modify `src/core/engine/types.ts` (`MaiaAdapter`), `src/core/engine/maia.ts` (`RealMaia`), `src/core/engine/mock.ts` (`MockMaia`). Test: `src/core/engine/maia3/batch.test.ts` (gated real-engine) + a `MockMaia` batch unit test.

- [ ] **Step 1: Add `predictBatch` to the `MaiaAdapter` interface**

In `src/core/engine/types.ts`, add to `MaiaAdapter`:
```ts
/**
 * Predict multiple positions in one batched inference call.
 * Far fewer worker round-trips than calling predict() per position.
 * @returns evaluations in the same order as the input fens
 */
predictBatch(_fens: string[], _config?: Partial<MaiaConfig>): Promise<MaiaEvaluation[]>
```

- [ ] **Step 2: Implement `predictBatch` in `RealMaia`**

In `src/core/engine/maia.ts`, add a `predictBatch(fens, config)` method:
- Guard `if (!this.ready) throw` (same as `predict`). Handle empty `fens` → return `[]`.
- For each fen: `const { boardTokens, legalMoves } = preprocessMaia3(fen)`. Keep the `legalMoves` array per fen.
- Concatenate all `boardTokens` into one `Float32Array(fens.length * 64 * 12)` (`combined.set(boardTokens[i], i*64*12)`).
- Build `eloSelfs`/`eloOppos` as `new Float32Array(fens.length)` each filled with the resolved `eloLevel`.
- One `runInference(combinedTokens, eloSelfs, eloOppos, fens.length)` call.
- Slice the result: for item `i`, `logitsMove.slice(i*4352, (i+1)*4352)` and `logitsValue.slice(i*3, (i+1)*3)`; call `processMaia3Outputs(fens[i], moveSlice, valueSlice, legalMoves[i])`.
- Return the array of `{ policy, value }` in input order.
- Refactor `predict(fen, config)` to delegate: `return (await this.predictBatch([fen], config))[0]` — avoids duplicated logic.

- [ ] **Step 3: Implement `predictBatch` in `MockMaia`**

In `src/core/engine/mock.ts`, add `predictBatch(fens, config)` to `MockMaia` — simply `return Promise.all(fens.map(f => this.predict(f, config)))`. This keeps mock-based tests working.

- [ ] **Step 4: Write the MockMaia batch unit test**

Create or extend a test (e.g. in `src/core/engine/mock.test.ts` if it exists, else `src/core/engine/maia3/batch.test.ts`):
```ts
import { describe, it, expect } from 'vitest'
import { MockMaia } from './mock' // adjust path

describe('MockMaia.predictBatch', () => {
  it('returns one evaluation per input fen, in order', async () => {
    const maia = new MockMaia()
    await maia.init()
    const fens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    ]
    const out = await maia.predictBatch(fens)
    expect(out.length).toBe(2)
    expect(typeof out[0].value).toBe('number')
    expect(out[0].policy).toBeTruthy()
  })
  it('returns [] for empty input', async () => {
    const maia = new MockMaia()
    await maia.init()
    expect(await maia.predictBatch([])).toEqual([])
  })
})
```

- [ ] **Step 5: Add a gated real-engine batch test**

Create `src/core/engine/maia3/batch.test.ts` with the `RUN_MAIA3_ENGINE_TESTS=1` gate (same pattern as `strength.test.ts`): a `RealMaia`, `predictBatch` of 3 fens, assert 3 results and that batched results equal per-`predict` results for the same fens (consistency).

- [ ] **Step 6: Run tests + build**

Run `npx vitest run src/core/engine` (expect PASS, gated tests skipped) and `npm run build` (expect "Compiled successfully").

- [ ] **Step 7: Commit**

```bash
git add src/core/engine/types.ts src/core/engine/maia.ts src/core/engine/mock.ts src/core/engine/maia3/batch.test.ts src/core/engine/mock.test.ts
git commit -m "feat(maia): add batched predictBatch inference path"
```

### Task C2: Use batching in Win Finder

**Files:** Modify `src/core/analysis/winFinder.ts`. Test: existing `winFinder` tests must still pass.

- [ ] **Step 1: Read `analyzePositionForDisagreement`**

In `src/core/analysis/winFinder.ts`, the function loops over every legal move, computes the resulting FEN via `applyMove`, and calls `await maia.predict(resultingFen, { eloLevel })` once per move. This is the ~35-calls-per-position hot path.

- [ ] **Step 2: Replace the per-move loop with one batched call**

Restructure: first build the full list `{ uci, san, resultingFen }` for all legal moves (skipping moves where `applyMove` returns null). Then issue ONE `await maia.predictBatch(resultingFens, { eloLevel })`. Then iterate results in lockstep with the move list to build `moveRankings` exactly as before (`playerMaiaWinrate = 1 - maiaResult.value`, etc.). Preserve all existing behavior: the `checkCancel()` calls (call it before the batch and after), SF winrate lookup, ranking, scoring. The ONLY change is N `predict` calls → 1 `predictBatch` call.

- [ ] **Step 3: Keep cancellation responsive**

`checkCancel()` was previously called between each `maia.predict`. After batching there is one long call instead. Call `checkCancel()` immediately before the `predictBatch` and immediately after it returns. (The outer `analyzeGameForDisagreements` loop still checks cancellation between positions, so responsiveness stays acceptable.)

- [ ] **Step 4: Run Win Finder tests + build**

Run `npx vitest run src/core/analysis` (expect PASS — these use `MockMaia`, whose `predictBatch` was added in C1) and `npm run build` (expect "Compiled successfully"). If a winFinder test fails, fix the implementation, not the test, unless the test asserted call-count of `predict` specifically — in that case update it to reflect `predictBatch` usage.

- [ ] **Step 5: Commit**

```bash
git add src/core/analysis/winFinder.ts
git commit -m "perf(winfinder): batch per-position Maia inference into one call"
```

### Task C3: Lazy Stockfish init

**Files:** Modify `src/contexts/EngineContext.tsx`. Test: existing engine/context tests must still pass.

- [ ] **Step 1: Read `EngineContext.tsx`**

Currently the mount `useEffect` initializes BOTH engines sequentially (`await sfEngine.init(); await maiaEngine.init()`). On iOS, holding Stockfish's 404MB + Maia's ONNX at once OOMs.

- [ ] **Step 2: Make Stockfish initialization lazy**

Change the mount `useEffect` to initialize **Maia only**. Create the `RealStockfish` instance but do NOT call `sfEngine.init()` at mount. Add an idempotent `ensureStockfish()` async function (memoized with a `stockfishInitPromise` ref, like `RealMaia`'s `initPromise`) that calls `sfEngine.init()` on first invocation and sets `stockfishStatus`. Set `stockfishStatus` to a new resting state — reuse `'not_initialized'` (already in `EngineStatus`) until `ensureStockfish()` runs, then `'loading'` → `'ready'`/`'error'`.

- [ ] **Step 3: Trigger `ensureStockfish()` on first Stockfish need**

`evaluatePosition` (the panel eval) uses both engines. Change it to: `await ensureStockfish()` at the start (no-op once ready), then proceed. This means Stockfish loads the first time the user views a position needing an evaluation — not at app mount. Maia-only features (the EW fast path) work immediately. Confirm `isInitialized` / `canEnrichSF` style flags still make sense — `isInitialized` should reflect Maia readiness for the Maia-first experience; Stockfish readiness is tracked separately via `stockfishStatus`.

- [ ] **Step 4: Verify Win Finder still gets Stockfish**

`useWinFinder` requires Stockfish. Ensure that whatever path Win Finder uses to access `stockfish` still works — if Win Finder reads `stockfish` from context and calls it, and Stockfish is lazy, Win Finder's "Analyze Game" must trigger `ensureStockfish()` first (await it before analysis). Add that call in `useWinFinder`'s `analyze` (or wherever it checks engine readiness) so clicking Analyze Game lazily loads Stockfish if needed.

- [ ] **Step 5: Build + tests**

Run `npm run build` (expect "Compiled successfully") and `npx vitest run` (expect all non-gated tests PASS). Fix type errors from the refactor.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/EngineContext.tsx src/hooks/useWinFinder.ts
git commit -m "feat(engines): lazy-init Stockfish to fit iOS Safari memory budget"
```

### Task C4: Verify Phase C on real devices

**Files:** none (verification only).

- [ ] **Step 1:** Deploy: `vercel --prod --yes`.
- [ ] **Step 2:** BrowserStack real iOS: `BS_DEVICE=ios node scripts/bs-safari-selenium.mjs`. Expected: engines initialize (Maia at mount; Stockfish when Win Finder's Analyze Game runs) AND Win Finder completes with no crash. This is the success bar.
- [ ] **Step 3:** BrowserStack iPad (`BS_DEVICE=ipad`) — same expectation.
- [ ] **Step 4:** BrowserStack macOS (`BS_DEVICE=macos`) + Chrome (`scripts/bs-safari-winfinder.mjs BS_BROWSER=chromium`): engines + Win Finder work; confirm Win Finder is faster than the ~2.5min Phase B time (batching win).
- [ ] **Step 5:** `npm run test:e2e` — expect PASS; update Maia-value-specific assertions to Maia 3 if needed.
- [ ] **Step 6:** Commit any test updates.

---

## Notes
- The `bs-safari-selenium.mjs` script clicks "Analyze Game", which (after C3/C4) is what triggers lazy Stockfish init on iOS — so the existing script already exercises the lazy path. Its engine-init wait may need to tolerate Stockfish being `not_initialized` until Analyze Game; if the script times out waiting for `sf-status=ready` at load, that is expected — adjust the script to wait for Maia ready at load and Stockfish ready after the Analyze Game click.
