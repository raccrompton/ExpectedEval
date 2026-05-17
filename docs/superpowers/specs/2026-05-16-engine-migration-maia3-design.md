# Engine Migration — Stockfish sf17-79 + Maia 3 — Design

> Date: 2026-05-16
> Status: Approved (brainstorming) — pending implementation plan

## Problem

The app runs two WebAssembly engines simultaneously — Stockfish and Maia
(ONNX Runtime Web). On real iOS Safari the combined footprint exceeds the
per-tab memory budget and the engines fail to initialize
(`RangeError: Out of memory`). Measured: Stockfish's WASM heap alone is
**406MB** (`sf171-79`, Stockfish 17.1), and the Maia 2 model is **93MB**
(`maia_rapid.onnx`). Desktop Safari has more headroom (the desktop OOM the
user originally reported is already fixed by sequential engine init on the
`fix/safari-engine-loading` branch), but iOS does not fit.

`maia-platform-frontend` (maiachess.com) runs the same two engines and works
on iOS. The fix is to **replicate its engine setup**.

## Goal / Success Criteria

- Real iOS Safari initializes **both** engines and completes Win Finder / EW
  analysis without OOM.
- Desktop Safari and Chrome remain unaffected (init + analysis still work).
- Full test suite green.
- Verified on BrowserStack (real iOS, real macOS Safari, Chrome).

## What maia-platform uses (the target setup)

| Component | maia-platform | current app |
| --- | --- | --- |
| Stockfish build | `sf17-79` (SF 17.0), `lila-stockfish-web@0.0.7` | `sf171-79` (17.1), `@0.0.11` |
| Stockfish memory | `sharedWasmMemory(2560)`, `locateFile /stockfish/` | identical |
| Maia model | Maia 3 — `maia3_simplified.onnx`, 46MB | Maia 2 — `maia_rapid.onnx`, 93MB |
| ONNX runtime | `onnxruntime-web@1.23`, static `/ort/` files | `@1.17`, bundled |
| Maia execution | Web Worker (`maia-worker.js`) | main thread |

## Approach

Phased — Stockfish first, Maia 3 second — so each independent risk area
(Stockfish build, ORT version bump, new model, worker boundary, ELO
encoding) is verified before the next compounds on it.

### Phase A — Stockfish → `sf17-79`

- Pin `lila-stockfish-web` to `0.0.7` (ships the `sf17-79` build).
- Update `scripts/copy-engine-assets.mjs` to copy `sf17-79.js` +
  `sf17-79.wasm` into `public/stockfish/`.
- Change `stockfish.ts`'s dynamic import to `/stockfish/sf17-79.js`
  (keeps the existing static-asset, `webpackIgnore` loading).
- Confirm the NNUE nets `sf17-79` requests via `getRecommendedNnue()` are
  present in `public/stockfish/`.
- No behavior change expected: SF 17.0 vs 17.1 is negligible for winrate
  evaluation at depth ~14.
- **Risk:** `lila-stockfish-web@0.0.7`'s `StockfishWeb` API (`uci`,
  `listen`, `onError`, `setNnueBuffer`, `getRecommendedNnue`) must match
  what `stockfish.ts` uses — verify on integration.
- **Verify:** build → deploy → BrowserStack iOS captures
  `[mem:stockfish-init]`; macOS Safari + Chrome still init and run Win Finder.

### Phase B — Maia 3 in a Web Worker

**Assets & dependencies**
- Add `public/maia3/maia3_simplified.onnx` (46MB).
- Upgrade `onnxruntime-web` `1.17` → `1.23`; serve ORT WASM statically from
  `public/ort/` (`ort.wasm.min.js`, `ort-wasm-simd-threaded.{wasm,mjs}`).
- Add `public/maia-worker.js`, ported from maia-platform: ONNX
  `InferenceSession` runs inside the worker, with IndexedDB model caching,
  batched inference, and transferable result buffers.

**`maia.ts` becomes a thin proxy.** `RealMaia` keeps its `MaiaAdapter`
interface **unchanged** — `predict(fen, config) -> MaiaResult { policy,
value }`. Internally `init()` spawns the worker; `predict()` posts an
inference message and awaits the result. The EW algorithm, engine panels,
Win Finder, and all mock-based unit tests stay untouched.

**Maia 3 specifics (ported from maia-platform):**
- Token-based preprocessing (board → `[N,64,12]` tokens) plus the
  `all_moves_maia3*.json` move-vocabulary data files → `tensor.ts`.
- `processOutputsMaia3`: Maia 3 emits LDW (loss/draw/win) logits + policy
  logits.
- **Adapter-boundary conversion:** LDW → single `value` as
  `softmax(LDW).win + 0.5 * softmax(LDW).draw`, so downstream code that
  consumes `value` is unaffected.
- **ELO / strength handling:** replicate maia-platform's exact
  `elo_self` / `elo_oppo` encoding (bucketing + range). Map the app's
  `MaiaConfig.eloLevel` / settings (currently 1100–1900) onto whatever
  range Maia 3 expects. A wrong ELO encoding silently corrupts predictions.
  During implementation, **document** how Maia 3's strength input works
  (it may be undocumented or differ from Maia 2) — write findings into
  `docs/perspective.md` or a sibling doc so the encoding is not folklore.

**Data flow:** `predict(fen)` → worker `postMessage` → ONNX `session.run`
in worker → logits posted back → `processOutputsMaia3` → `{ policy, value }`.

**UI branding:** update "Maia 2" labels to "Maia 3" where they appear
(`EnginePanel`, `CLAUDE.md`).

## Perspective Safety (explicit, first-class)

Perspective bugs are the classic silent failure in chess engines; a model
swap is where they creep in. The proxy design's invariant: the Maia 3
adapter must return `MaiaResult` in the **same perspective conventions** as
the Maia 2 adapter (see `docs/perspective.md`):

- `value` → **side-to-move's** perspective. Win Finder relies on this
  (`playerMaiaWinrate = 1 - maiaResult.value` after a move). The LDW→value
  conversion must preserve it.
- `policy` → move keys correct for **both colors**, which requires
  replicating maia-platform's board **mirroring for black-to-move** exactly.

Four checks before either phase is "done":
1. **Maia 3 `value` direction** — known White-winning / Black-winning
   positions, tested with each side to move; assert `value` points the
   right way (extends `perspective.test.ts`).
2. **Mirror symmetry** — a position and its color-mirror give consistent
   predictions; confirms black-to-move handling.
3. **LDW perspective** — verify whether Maia 3's LDW logits are
   side-to-move or White-relative (inspect `processOutputsMaia3`); flip in
   the conversion only if needed.
4. **Stockfish `sf17-79`** — re-confirm `cp` = White's perspective,
   `winrate` = side-to-move.

## Error Handling

- Keep the sequential engine init already on `fix/safari-engine-loading`.
- Worker `onerror` / crash surfaces as Maia engine `error` status (existing
  `EngineContext` behavior); a worker failure must not silently hang the app.

## Testing

- Unit tests use **mock engines** → core EW / Win Finder logic unaffected.
- Real-engine tests (`stockfish.test.ts`, Maia tests,
  `07-real-engines.spec.ts`) — Maia 3 values differ from Maia 2, so
  value-specific assertions become range / structural / perspective-direction
  checks rather than exact numbers.
- New tests: LDW→value conversion, the four perspective checks, and
  **Maia 3 strength-adjustment tests** (see below).
- **Strength-adjustment tests (explicit requirement).** Maia 3's ELO /
  strength mechanism may be undocumented or differ from Maia 2's, so it
  must be verified behaviorally, not just structurally:
  - The `eloLevel` → `elo_self` / `elo_oppo` mapping encodes the documented
    value (unit test on the encoding function).
  - Predictions actually *respond* to strength: running the same position
    at distinct levels (e.g. 1100 vs 1900) yields **different** policy
    distributions, and the shift is in the expected direction (higher
    level → closer to the engine-best move). Use a position with a clear
    "human mistake vs best move" gap.
  - Boundary levels (lowest / highest supported) do not error and stay
    within Maia 3's valid input range.
- Per-phase BrowserStack verification:
  - Phase A: iOS `[mem:stockfish-init]`; macOS Safari + Chrome.
  - Phase B: real iOS Safari runs both engines + completes Win Finder / EW
    with no OOM; desktop Safari + Chrome unaffected; suite green.

## Out of Scope

- Stockfish app-level Web Worker (`lila-stockfish-web` manages its own
  threads; maia-platform does not wrap it either).
- Changes to the EW algorithm, Win Finder algorithm, or UI beyond the
  "Maia 2" → "Maia 3" relabel.
- The desktop OOM fix (already done on `fix/safari-engine-loading`).
