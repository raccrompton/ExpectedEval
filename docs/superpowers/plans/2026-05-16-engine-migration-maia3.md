# Engine Migration — Stockfish sf17-79 + Maia 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate maia-platform-frontend's engine setup (Stockfish `sf17-79`, Maia 3 in a Web Worker, onnxruntime-web 1.23) so the app runs both engines within real iOS Safari's memory budget, without changing the desktop experience.

**Architecture:** Phase A swaps the Stockfish build. Phase B replaces the Maia 2 ONNX model with Maia 3, moving inference into a Web Worker. `RealMaia` becomes a thin proxy that keeps the existing `MaiaAdapter` interface (`predict → MaiaEvaluation { policy, value }`), so the EW algorithm, panels, Win Finder, and mock-based unit tests are untouched. LDW (loss/draw/win) output is converted to the existing single `value` at the adapter boundary.

**Tech Stack:** Next.js 15, TypeScript, `lila-stockfish-web`, `onnxruntime-web`, `chessops`, Web Workers, Vitest, Playwright, BrowserStack Selenium (`scripts/bs-safari-selenium.mjs`).

**Branch:** `fix/safari-engine-loading` (already checked out; the desktop OOM fix lives here).

**Reference:** `github.com/csslab/maia-platform-frontend` — port from `src/lib/engine/{maia,tensor,storage}.ts` and `public/{maia-worker.js,ort/,maia3/}`. Spec: `docs/superpowers/specs/2026-05-16-engine-migration-maia3-design.md`.

**Key facts established during design:**
- Maia 3 takes the **raw ELO rating as a float** (`elo_self`, `elo_oppo`), tensor shape `[batchSize]` — NO bucketing/category mapping (that is the Maia 2 path). Valid range ~600–2600.
- Maia 3 input: `boardTokens` `[batchSize,64,12]` float; output: `logits_move` (4352-dim policy) + `logits_value` (3-dim LDW).
- LDW channels: 0=Loss, 1=Draw, 2=Win, **for side-to-move**. `winProb = (expW + 0.5·expD)/sumExp`, then `winProb = 1 - winProb` if FEN side-to-move is black (because `preprocessMaia3` mirrors black-to-move boards to white).
- `MaiaEvaluation` (our result type) = `{ policy: Record<string,number>, value: number }`. `value` is side-to-move's perspective (`docs/perspective.md`).

---

## Phase A — Stockfish → `sf17-79`

### Task A1: Switch the Stockfish build to `sf17-79`

**Files:**
- Modify: `package.json` (dependency `lila-stockfish-web`)
- Modify: `scripts/copy-engine-assets.mjs`
- Modify: `src/core/engine/stockfish.ts` (the dynamic import line)

- [ ] **Step 1: Pin lila-stockfish-web to 0.0.7**

Run: `npm install lila-stockfish-web@0.0.7 --save-exact`
Then confirm `node_modules/lila-stockfish-web/` contains `sf17-79.js` and `sf17-79.wasm`.
Expected: both files present (this is the build maia-platform uses).

- [ ] **Step 2: Verify the 0.0.7 API matches what stockfish.ts uses**

Run: `cat node_modules/lila-stockfish-web/stockfishWeb.d.ts`
Confirm the `StockfishWeb` interface still has: `uci(command)`, `listen`, `onError`, `setNnueBuffer(data, index?)`, `getRecommendedNnue(index?)`.
Expected: all present. If any differ, STOP and report — the plan assumes interface parity.

- [ ] **Step 3: Update the copy script to sync the sf17-79 files**

In `scripts/copy-engine-assets.mjs`, change the `FILES` array:

```js
const FILES = ['sf17-79.js', 'sf17-79.wasm']
```

- [ ] **Step 4: Run the copy script**

Run: `node scripts/copy-engine-assets.mjs`
Expected: logs copying `sf17-79.js` and `sf17-79.wasm` into `public/stockfish/`.

- [ ] **Step 5: Point stockfish.ts at the sf17-79 static asset**

In `src/core/engine/stockfish.ts`, change the engine URL constant:

```ts
const engineUrl: string = '/stockfish/sf17-79.js'
```

- [ ] **Step 6: Confirm the NNUE nets exist**

The engine calls `getRecommendedNnue(0)` and `getRecommendedNnue(1)`, then `fetch('/stockfish/' + name)`. After Step 8 the dev server is up — load the app, watch the network panel / console for the two NNUE requests, and confirm both return 200. If a 404 appears, copy the missing `nn-*.nnue` file into `public/stockfish/` from `node_modules/lila-stockfish-web/` or the maia-platform repo's `public/stockfish/`.

- [ ] **Step 7: Run unit tests**

Run: `npx vitest run src/core/engine`
Expected: PASS (the engine adapters' Node-side tests still pass; `sf17-79` is API-compatible).

- [ ] **Step 8: Local smoke test**

Run: `npm run dev`, open the app, load a PGN, confirm Stockfish reaches "ready" and produces an evaluation. Confirm console shows `[mem:stockfish-init]`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json scripts/copy-engine-assets.mjs src/core/engine/stockfish.ts public/stockfish/sf17-79.js public/stockfish/sf17-79.wasm
git commit -m "feat(stockfish): switch to sf17-79 build (lila-stockfish-web 0.0.7)"
```

### Task A2: Verify Phase A on real devices

**Files:** none (verification only)

- [ ] **Step 1: Deploy**

Run: `vercel --prod --yes` (PATH must include the global npm bin).
Expected: aliased to `https://expected-eval.vercel.app`.

- [ ] **Step 2: Measure on real iOS Safari**

Run: `BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... BS_DEVICE=ios node scripts/bs-safari-selenium.mjs`
Record the `[mem:stockfish-init]` value. Expected: Stockfish initializes (it may still OOM later when Maia loads — that is Phase B's job). Note whether `stockfish-wasm` is below the 406MB seen with `sf171-79`.

- [ ] **Step 3: Confirm desktop is unaffected**

Run the same script with `BS_DEVICE=macos` and `BS_BROWSER`-equivalent Chrome check (`scripts/bs-safari-winfinder.mjs` with `BS_BROWSER=chromium`).
Expected: engines init, Win Finder completes, no crash.

- [ ] **Step 4: Record results**

Append the measured numbers to the spec doc or a comment on the commit. No code change.

---

## Phase B — Maia 3 in a Web Worker

### Task B1: Add Maia 3 assets and upgrade onnxruntime-web

**Files:**
- Create: `public/maia3/maia3_simplified.onnx`
- Create: `public/ort/ort.wasm.min.js`, `public/ort/ort-wasm-simd-threaded.wasm`, `public/ort/ort-wasm-simd-threaded.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the Maia 3 model**

Download `maia3_simplified.onnx` from the maia-platform repo (`public/maia3/maia3_simplified.onnx`, ~46MB) into `public/maia3/`.

- [ ] **Step 2: Add the ORT static runtime files**

Copy `ort.wasm.min.js`, `ort-wasm-simd-threaded.wasm`, `ort-wasm-simd-threaded.mjs` from the maia-platform repo's `public/ort/` into `public/ort/`.

- [ ] **Step 3: Upgrade onnxruntime-web**

Run: `npm install onnxruntime-web@1.23 --save-exact`
Expected: `package.json` shows `onnxruntime-web: 1.23.x`.

- [ ] **Step 4: Verify the build still compiles**

Run: `npm run build`
Expected: `Compiled successfully`. (`maia.ts` still imports the old API at this point; if 1.23 broke an import, note it — Task B4 rewrites `maia.ts` anyway.)

- [ ] **Step 5: Commit**

```bash
git add public/maia3 public/ort package.json package-lock.json
git commit -m "feat(maia): add Maia 3 model + ORT 1.23 static runtime assets"
```

### Task B2: Port Maia 3 preprocessing and move vocabulary

**Files:**
- Create: `src/core/engine/maia3/tensor.ts`
- Create: `src/core/engine/maia3/all_moves_maia3.json`, `src/core/engine/maia3/all_moves_maia3_reversed.json`
- Test: `src/core/engine/maia3/tensor.test.ts`

- [ ] **Step 1: Copy the move-vocabulary data files**

Copy `all_moves_maia3.json` and `all_moves_maia3_reversed.json` from the maia-platform repo (`src/lib/engine/data/`) into `src/core/engine/maia3/`.

- [ ] **Step 2: Port the preprocessing functions**

Create `src/core/engine/maia3/tensor.ts` containing, ported verbatim from maia-platform `src/lib/engine/tensor.ts`: `boardToMaia3Tokens`, `preprocessMaia3`, `mirrorMove`, `mirrorFEN`, and the loaded `allPossibleMovesMaia3` / `allPossibleMovesMaia3Reversed` maps (from the JSON files). `preprocessMaia3(fen)` returns `{ boardTokens: Float32Array, legalMoves: Float32Array }` and mirrors black-to-move boards to white.

- [ ] **Step 3: Write the failing test**

Create `src/core/engine/maia3/tensor.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { preprocessMaia3, mirrorMove } from './tensor'

describe('preprocessMaia3', () => {
  it('produces a 64*12 token array for the start position', () => {
    const { boardTokens } = preprocessMaia3(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    expect(boardTokens.length).toBe(64 * 12)
  })

  it('marks legal moves for the start position', () => {
    const { legalMoves } = preprocessMaia3(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    // 20 legal moves from the start position
    expect(legalMoves.filter((v) => v > 0).length).toBe(20)
  })

  it('mirrorMove flips ranks: e2e4 <-> e7e5', () => {
    expect(mirrorMove('e2e4')).toBe('e7e5')
  })
})
```

- [ ] **Step 4: Run the test to verify it fails then passes**

Run: `npx vitest run src/core/engine/maia3/tensor.test.ts`
Expected: PASS once Step 2's port is correct. If `legalMoves` count is wrong, the move-vocabulary JSON or `boardToMaia3Tokens` is mis-ported — fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/core/engine/maia3
git commit -m "feat(maia): port Maia 3 tensor preprocessing + move vocabulary"
```

### Task B3: Add the Maia worker

**Files:**
- Create: `public/maia-worker.js`

- [ ] **Step 1: Port the worker**

Copy maia-platform's `public/maia-worker.js` into `public/maia-worker.js` verbatim. It: `importScripts('/ort/ort.wasm.min.js')`, sets `ORT.env.wasm.wasmPaths = '/ort/'`, handles `init` / `download` / `inference` messages, caches the model in IndexedDB (`MaiaModels` DB), runs `session.run` with feeds `{ tokens, elo_self, elo_oppo }`, and posts back `inference-result` with transferred `logitsMove` / `logitsValue` buffers.

- [ ] **Step 2: Set the ONNX thread count for memory safety**

In `public/maia-worker.js`, immediately after `ORT.env.wasm.wasmPaths = '/ort/'`, add:

```js
// Single-threaded WASM backend — keeps the ONNX memory footprint within
// iOS Safari's per-tab budget (Stockfish is already resident).
ORT.env.wasm.numThreads = 1
```

- [ ] **Step 3: Sanity-check the worker is served**

Run: `npm run dev`, then in the browser console: `fetch('/maia-worker.js').then(r => console.log(r.status))`.
Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add public/maia-worker.js
git commit -m "feat(maia): add Maia 3 ONNX inference Web Worker"
```

### Task B4: Add the LDW→value output processor

**Files:**
- Create: `src/core/engine/maia3/processOutputs.ts`
- Test: `src/core/engine/maia3/processOutputs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/engine/maia3/processOutputs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { processMaia3Outputs } from './processOutputs'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('processMaia3Outputs', () => {
  it('LDW logits favouring Win give value > 0.5 for white to move', () => {
    const legal = mkLegal(START)
    const { value } = processMaia3Outputs(START, mkMove(legal), [0, 0, 5], legal)
    expect(value).toBeGreaterThan(0.5)
  })

  it('flips value for black to move (mirrored board)', () => {
    const blackFen = START.replace(' w ', ' b ')
    const legal = mkLegal(blackFen)
    const { value } = processMaia3Outputs(blackFen, mkMove(legal), [0, 0, 5], legal)
    // Win logits are for side-to-move (black); after the black flip the
    // returned value is from black's side-to-move perspective and stays > 0.5
    expect(value).toBeGreaterThan(0.5)
  })

  it('policy is a probability distribution over legal moves', () => {
    const legal = mkLegal(START)
    const { policy } = processMaia3Outputs(START, mkMove(legal), [1, 1, 1], legal)
    const sum = Object.values(policy).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 4)
    expect(Object.keys(policy).length).toBe(20)
  })
})

// helpers: import preprocessMaia3 for legalMoves; mkMove builds a uniform
// 4352-length logit array. (Implement these inline in the test file.)
```

Implement `mkLegal` (calls `preprocessMaia3(fen).legalMoves`) and `mkMove` (a `Float32Array(4352)` filled with `1`) inline in the test file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/engine/maia3/processOutputs.test.ts`
Expected: FAIL — `processMaia3Outputs` not defined.

- [ ] **Step 3: Implement the processor**

Create `src/core/engine/maia3/processOutputs.ts`. Port the body of maia-platform's `processOutputsMaia3` (see plan header), with this signature:

```ts
import { allPossibleMovesMaia3Reversed, mirrorMove } from './tensor'

/**
 * Convert Maia 3 raw outputs into the app's MaiaEvaluation shape.
 * @param fen        position FEN (used for the black-to-move flip)
 * @param moveLogits 4352-dim policy logits for one position
 * @param valueLogits 3-dim LDW logits (0=Loss, 1=Draw, 2=Win, side-to-move)
 * @param legalMoves Float32Array legal-move mask from preprocessMaia3
 * @returns { policy, value } — value is side-to-move's win probability
 */
export function processMaia3Outputs(
  fen: string,
  moveLogits: Float32Array,
  valueLogits: ArrayLike<number>,
  legalMoves: Float32Array,
): { policy: Record<string, number>; value: number } {
  // ... port processOutputsMaia3 body here (softmax LDW -> winProb,
  //     black-to-move flip, legal-move softmax over policy logits,
  //     mirrorMove for black). Return { policy: sorted, value: winProb }.
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/engine/maia3/processOutputs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/engine/maia3/processOutputs.ts src/core/engine/maia3/processOutputs.test.ts
git commit -m "feat(maia): add Maia 3 LDW->value output processor"
```

### Task B5: Rewrite RealMaia as a worker proxy

**Files:**
- Modify: `src/core/engine/maia.ts` (rewrite `RealMaia`)
- Modify: `src/core/engine/maia.ts` — `DEFAULT_MODEL_URL` → `'/maia3/maia3_simplified.onnx'`
- Test: `src/core/engine/maia.test.ts` (if a real-Maia unit test exists; otherwise verification is via Task B7)

- [ ] **Step 1: Rewrite `RealMaia`**

`RealMaia` keeps `implements MaiaAdapter`. Internally:
- `init()`: if `window`/`Worker` undefined, reject (SSR). Spawn `new Worker('/maia-worker.js')`. Wire `onmessage` (handle `status`, `progress`, `error`, `inference-result`) and `onerror`. Post `{ type: 'init', modelUrl: '/maia3/maia3_simplified.onnx', modelVersion: '3' }`. On `status: 'no-cache'`, post `{ type: 'download' }`. Resolve `init()` when `status: 'ready'`.
- `predict(fen, config)`: `const { boardTokens, legalMoves } = preprocessMaia3(fen)`. Resolve `eloLevel` from `config` (default from `DEFAULT_EW_CONFIG.maiaLevel`). Post an `inference` message (request id, `tokens: boardTokens.buffer`, `eloSelfs`/`eloOppos` as `Float32Array.from([eloLevel]).buffer`, `batchSize: 1`) with the buffers transferred. Await the `inference-result`, then `return processMaia3Outputs(fen, logitsMove, logitsValue, legalMoves)`.
- `isReady()`: true once `status: 'ready'`.
- `destroy()`: `worker?.terminate()`.

Port the request-id / `pendingInferences` map mechanics from maia-platform's `Maia` class (plan header references it).

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: `Compiled successfully`. Fix any type errors from the rewrite.

- [ ] **Step 3: Run engine unit tests**

Run: `npx vitest run src/core/engine`
Expected: PASS. Mock-engine tests are unaffected; if a real-`RealMaia` Node test fails because Workers do not exist in Node, mark it to skip in the Node environment (the worker path is exercised by the E2E/BrowserStack tests instead) and note it.

- [ ] **Step 4: Commit**

```bash
git add src/core/engine/maia.ts
git commit -m "feat(maia): rewrite RealMaia as a Web Worker proxy for Maia 3"
```

### Task B6: ELO / strength handling + tests

**Files:**
- Modify: `src/core/engine/maia.ts` (elo passthrough — likely already done in B5)
- Create: `docs/maia3-strength.md`
- Test: `src/core/engine/maia3/strength.test.ts`
- Modify: `src/hooks/useSettings.ts` and the settings UI only if widening the level range (see Step 4)

- [ ] **Step 1: Document Maia 3's strength mechanism**

Create `docs/maia3-strength.md` stating: Maia 3 takes the **raw ELO rating** as a float `elo_self` / `elo_oppo` input (tensor `[batchSize]`); there is **no** category bucketing (that is the Maia 2 `createEloDict`/`mapToCategory` path). Valid range observed in maia-platform: 600–2600 (`MAIA_RATINGS`). The app passes `MaiaConfig.eloLevel` straight through as both `elo_self` and `elo_oppo`.

- [ ] **Step 2: Write the failing strength test**

Create `src/core/engine/maia3/strength.test.ts`. This is a real-engine test — gate it behind an env flag so CI without the model skips it:

```ts
import { describe, it, expect } from 'vitest'
import { RealMaia } from '../maia'

const RUN = process.env.RUN_MAIA3_ENGINE_TESTS === '1'
const d = RUN ? describe : describe.skip

// A position with a clear best move vs a tempting human mistake.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'

d('Maia 3 strength adjustment', () => {
  it('different ELO levels produce different policy distributions', async () => {
    const maia = new RealMaia()
    await maia.init()
    const low = await maia.predict(FEN, { eloLevel: 1100 })
    const high = await maia.predict(FEN, { eloLevel: 1900 })
    maia.destroy()
    // The two distributions must not be identical.
    const lowTop = Object.keys(low.policy)[0]
    const diff = Object.keys(low.policy).some(
      (m) => Math.abs((low.policy[m] ?? 0) - (high.policy[m] ?? 0)) > 0.01,
    )
    expect(diff).toBe(true)
    expect(lowTop).toBeTruthy()
  })

  it('boundary ELO levels do not error', async () => {
    const maia = new RealMaia()
    await maia.init()
    await expect(maia.predict(FEN, { eloLevel: 600 })).resolves.toBeTruthy()
    await expect(maia.predict(FEN, { eloLevel: 2600 })).resolves.toBeTruthy()
    maia.destroy()
  })
})
```

- [ ] **Step 3: Run the strength test**

Run: `RUN_MAIA3_ENGINE_TESTS=1 npx vitest run src/core/engine/maia3/strength.test.ts`
Expected: PASS. If the two distributions are identical, the ELO inputs are not reaching the model — inspect the worker `feeds` and the `elo_self`/`elo_oppo` buffer wiring. Do not proceed until this passes.

- [ ] **Step 4: (Optional) widen the settings ELO range**

Maia 3 supports 600–2600; the app's settings currently offer 1100–1900. Leaving the range as-is is valid (subset). If widening: update the level options in the settings UI and any clamp in `useSettings.ts`. If not widening, skip — note the decision in `docs/maia3-strength.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/maia3-strength.md src/core/engine/maia3/strength.test.ts
git commit -m "feat(maia): document + test Maia 3 raw-ELO strength handling"
```

### Task B7: Perspective tests, branding, cleanup

**Files:**
- Modify: `src/core/engine/perspective.test.ts`
- Create: `src/core/engine/maia3/perspective.test.ts`
- Modify: `src/components/Analysis/EnginePanel.tsx` (label text), `CLAUDE.md`
- Modify: `docs/perspective.md` (Maia 3 note)
- Delete: `public/maia2/maia_rapid.onnx`, `public/stockfish/sf171-79.*` (stale assets)
- Modify: `src/core/engine/maia.ts` — `DEFAULT_MODEL_URL` already updated in B5; remove dead Maia 2 code paths

- [ ] **Step 1: Write the Maia 3 perspective test**

Create `src/core/engine/maia3/perspective.test.ts` — a real-engine test gated by `RUN_MAIA3_ENGINE_TESTS=1`:

```ts
import { describe, it, expect } from 'vitest'
import { RealMaia } from '../maia'

const RUN = process.env.RUN_MAIA3_ENGINE_TESTS === '1'
const d = RUN ? describe : describe.skip

// White is up a queen.
const WHITE_WINNING_W = '4k3/8/8/8/8/8/8/3QK3 w - - 0 1'
const WHITE_WINNING_B = '4k3/8/8/8/8/8/8/3QK3 b - - 0 1'

d('Maia 3 value perspective', () => {
  it('value is high for the side that is winning (white to move)', async () => {
    const maia = new RealMaia()
    await maia.init()
    const r = await maia.predict(WHITE_WINNING_W)
    maia.destroy()
    expect(r.value).toBeGreaterThan(0.6) // white to move, white winning
  })

  it('value is low for the side that is losing (black to move)', async () => {
    const maia = new RealMaia()
    await maia.init()
    const r = await maia.predict(WHITE_WINNING_B)
    maia.destroy()
    expect(r.value).toBeLessThan(0.4) // black to move, black losing
  })
})
```

- [ ] **Step 2: Run the perspective test**

Run: `RUN_MAIA3_ENGINE_TESTS=1 npx vitest run src/core/engine/maia3/perspective.test.ts`
Expected: PASS. If a value points the wrong way, the black-to-move flip in `processMaia3Outputs` is wrong — fix it there, not downstream.

- [ ] **Step 3: Keep the existing perspective test green**

Run: `npx vitest run src/core/engine/perspective.test.ts`
Expected: PASS (it uses mock engines / Stockfish; unaffected by Maia 3). If it asserted Maia 2-specific values, update those assertions to the Maia 3 equivalents.

- [ ] **Step 4: Update branding**

In `src/components/Analysis/EnginePanel.tsx` change user-facing "Maia 2" text to "Maia 3" (keep the "Maia <level>" rating label). Update `CLAUDE.md`'s Maia references to Maia 3. Add a short Maia 3 note to `docs/perspective.md` (LDW output, side-to-move, black flip).

- [ ] **Step 5: Remove stale assets**

```bash
git rm public/maia2/maia_rapid.onnx public/stockfish/sf171-79.js public/stockfish/sf171-79.wasm
```

Confirm nothing references `maia_rapid.onnx` or `sf171-79`: `grep -rn "maia_rapid\|sf171-79" src scripts`.
Expected: no matches (Task A1 and B5 already moved off them).

- [ ] **Step 6: Full unit + build check**

Run: `npm run build && npx vitest run`
Expected: build `Compiled successfully`; all non-engine-gated unit tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(maia): Maia 3 perspective tests, branding, remove stale Maia 2 assets"
```

### Task B8: Verify Phase B on real devices

**Files:** none (verification only)

- [ ] **Step 1: Deploy**

Run: `vercel --prod --yes`
Expected: aliased to `https://expected-eval.vercel.app`.

- [ ] **Step 2: Verify real iOS Safari runs both engines**

Run: `BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... BS_DEVICE=ios node scripts/bs-safari-selenium.mjs`
Expected: `#1 RESULT: engines INITIALIZED` AND `#2 RESULT: Analyze Game COMPLETED — no crash`. This is the success bar.

- [ ] **Step 3: Verify iPad**

Run the same with `BS_DEVICE=ipad`.
Expected: engines initialize, Win Finder completes.

- [ ] **Step 4: Verify desktop is unaffected**

Run with `BS_DEVICE=macos`, and `scripts/bs-safari-winfinder.mjs` with `BS_BROWSER=chromium`.
Expected: both init engines and complete Win Finder with no crash.

- [ ] **Step 5: Run the E2E suite**

Run: `npm run test:e2e`
Expected: PASS. Update any test that asserted Maia 2-specific values to Maia 3 ranges/structure. Re-run until green.

- [ ] **Step 6: Final commit (if any test updates were needed)**

```bash
git add -A
git commit -m "test: update real-engine tests for Maia 3"
```

---

## Self-Review Notes

- **Spec coverage:** Phase A → Tasks A1–A2. Maia 3 model/worker/ORT → B1, B3. Preprocessing → B2. LDW→value + perspective → B4, B7. Proxy/`MaiaAdapter` stability → B5. ELO/strength documentation + behavioral tests → B6. Branding → B7. Verification (BrowserStack iOS/iPad/macOS/Chrome) → A2, B8. Perspective four checks → B4 (LDW), B7 (value direction, existing test), B2 (mirror via preprocessing). All spec sections mapped.
- **Stale-asset removal** (B7 Step 5) depends on A1/B5 having moved off `sf171-79`/`maia_rapid.onnx` — ordering is correct.
- Real-engine tests are env-gated (`RUN_MAIA3_ENGINE_TESTS=1`) so CI without the 46MB model still passes; the worker path is fully exercised by Task B8 on BrowserStack.
