# Project Status

> Living status doc for ExpectedEval. Last updated: 2026-05-17.
> For domain knowledge see `CLAUDE.md` (note: its "Current Progress" / test-count
> section predates the Maia 3 migration and is partly stale — this file is current).

## What this project is

A single-page chess **Expected Evaluation** analysis app: combines **Stockfish**
(engine eval) and **Maia** (human-move neural net) to show what evaluation a
position realistically reaches given human-like play. Both engines run
client-side in the browser. Next.js 15 + React 19 + TypeScript.

## Current state — engine migration complete

The Stockfish + Maia engine migration is **done and merged to `main`** (and
pushed to `origin/main`). Head: `c080fae`.

What shipped (branch `fix/safari-engine-loading`, merged via `0957ecf`):
- **Stockfish**: `sf17-79` build via `lila-stockfish-web@0.0.7` (was `sf171-79`).
- **Maia**: migrated **Maia 2 → Maia 3** (`public/maia3/maia3_simplified.onnx`,
  46MB). ONNX inference runs in a **Web Worker** (`public/maia-worker.js`);
  `onnxruntime-web@1.23`. `RealMaia` (`src/core/engine/maia.ts`) is a thin
  worker proxy that keeps the `MaiaAdapter` interface stable.
- **Lazy Stockfish init**: only Maia loads at app mount; Stockfish initializes
  on first use (`ensureStockfish()` in `EngineContext`).
- **Batched inference**: `predictBatch` on the `MaiaAdapter`; Win Finder issues
  one batched call per position.
- `NodeMaia` (`src/core/engine/maia.node.ts`, used by `scripts/test-engines.ts`
  etc.) also migrated to Maia 3.

This fixed the original bug — Safari "fails due to memory" OOM. **Verified on a
real iPhone, real macOS Safari, and Chrome.**

## Tests

- Unit: **339 passing**, 6 skipped (the 6 are real-engine tests gated behind
  `RUN_MAIA3_ENGINE_TESTS=1` — they need a browser, skip in Node/CI).
- E2E (Playwright): **167 passing**.
- CI (`.github/workflows/ci.yml`) runs lint + `npm test` (vitest) + build only —
  NOT e2e, NOT `test:engines`.

## How to run / deploy

- Dev: `npm run dev`. Build: `npm run build`. Unit tests: `npm run test:run`.
- **E2E**: Playwright's bundled browser will not install on this OS. Run against
  a system Chromium: `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium-browser npm run
  test:e2e` (the config honors that env var).
- Deploy: `vercel --prod --yes` → `https://expected-eval.vercel.app`.
- Real-device Safari testing: BrowserStack Selenium scripts in `scripts/`
  (`bs-safari-selenium.mjs`, `BS_DEVICE=macos|ios|ipad`). Needs
  `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` env vars.

## Architecture notes (important for picking up work)

- **Two separate analysis features, two tabs:**
  - **Expected Winrate (EW)** — `src/core/analysis/treeBuilder.ts`,
    `expectedWinrate.ts`. Builds a probability *tree* (Maia policy → branches,
    pruned by `probabilityThreshold`), evaluates leaves, rolls up an expected
    winrate. Runs per-position. This is the real human-continuation rollout.
  - **Win Finder** — `src/core/analysis/winFinder.ts`. A flat **one-ply** scan
    over every mainline game position; finds Stockfish/Maia disagreement. Does
    NOT use the tree or Maia's policy head. Score =
    `maiaAdvantage / (sfSpread + ε)`.
- `MaiaAdapter` is the stable engine interface; `RealMaia` / `MockMaia` /
  `NodeMaia` implement it. Mock engines are used by most unit tests.
- Perspective conventions: see `docs/perspective.md` and `docs/maia3-strength.md`
  (Maia 3 takes raw ELO as a float input — no bucketing).

## Testing gotchas (learned the hard way)

- **`playwright-webkit` is NOT Safari** and gives false WASM/OOM failures.
- **BrowserStack's iPhone is more memory-constrained than a real iPhone** — it
  reported false "iOS OOM" failures that do not occur on a real device.
- For in-browser WASM memory limits, **trust real-device testing only**.

## Open follow-ups (not done — next work)

1. **Win Finder is slow** (~76 s desktop / ~2.5 min mobile for a full game).
   Profiled cause: ~2,400 Maia inferences/game (79 positions × ~30 legal moves,
   one ply each); Maia ONNX `session.run` is ~91% of the time. Maia 3 is ~1.3×
   slower than Maia 2 at Win Finder's batch size (controlled benchmark) — a
   ~20% penalty, not the main story; the cost is inherent to ~2,400 inferences.
   Proposed, not yet implemented (in rough priority order):
   - **SF-spread early-exit** — `score ≤ 1/(sfSpread+ε)`, so any position with
     `sfSpread > ~0.32` provably cannot qualify; skip its ~30 Maia calls. Zero
     false negatives. Biggest free win.
   - **Policy-gated move selection** — one Maia *policy* inference per position
     → only deep-evaluate Maia's top ~5 moves. ~30 → ~6 calls/position. Also
     aligns Win Finder with its stated "moves humans play" definition.
   - **Wire the LRU `predictionCache`** (`src/core/analysis/predictionCache.ts`)
     into `winFinder.ts` — it exists and is used by the EW tree but not by Win
     Finder. Dedupes transpositions; makes re-runs free.
2. **Win Finder algorithm design question** — its score is a one-ply,
   value-head heuristic; it ignores Maia's policy head entirely, so it does not
   actually use the "human-*likely*" path. Open question whether Win Finder
   should be rebuilt on the EW tree engine. See the chat history / ask the user.
3. **EW tree eval-pruning** — `treeBuilder.ts` prunes only by cumulative
   probability; could also stop expanding branches whose eval is saturated
   (near 0 or 1). Statistically sound, not yet done.

## Reference docs

- Specs: `docs/superpowers/specs/2026-05-16-engine-migration-maia3-design.md`
- Plans: `docs/superpowers/plans/2026-05-16-engine-migration-maia3.md`,
  `docs/superpowers/plans/2026-05-17-phase-c-lazy-loading-batching.md`
- `docs/perspective.md`, `docs/maia3-strength.md`
