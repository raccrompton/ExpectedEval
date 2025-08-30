# Product Requirements Document (PRD): Expected Winrate Analysis

## 1) Summary
Introduce a unified Expected Winrate analysis mode that replaces the current analysis pane. It combines Maia (move probabilities) and Stockfish (objective evaluation) to estimate realistic win probability for each candidate move from the current position.  
Runs fully client-side within the existing Next.js + React + Context + Controller Hooks architecture.

No enforced time limits or node caps: analysis may run indefinitely. The UI must continuously indicate that analysis is running and progressively surface partial results.

## 2) Goals
- Provide a single, interpretable metric per move: expected win rate, weighted by human-likely continuations.
- Parameterization: probability threshold, Stockfish depth, minimum winrate filter, Maia level (from global selection).
- Provide both summary (ranked move list) and detail (interactive tree) views, with coverage/confidence indicators.
- Progressive results display with clear running status; no hard cutoffs.

## 3) Non-goals
- Server-side compute or backend changes.
- Changing other site features (openings, puzzles, play).
- Creating new auth or API surfaces.

## 4) Users and Use Cases
- Chess players analyzing positions post-game or during study.
- Use cases:
  - Compare candidate moves by human-weighted outcome estimates.
  - Understand cost of own blunders without counter-blunder recovery.
  - Inspect probability trees to trace where estimates come from.

## 5) Assumptions and Dependencies
- Engines: onnxruntime-web Maia models and WASM Stockfish are integrated via engine contexts/hooks (MaiaEngineContext, StockfishEngineContext; used by controller hooks).
- Stockfish evals use current-to-move perspective; Expected Winrate must use the same convention.
- Tree generation alternates sides with Maia probabilities each ply.
- UI/State follows Context + Controller Hook + Presentational Components.
- Caching aligns with existing analysis patterns.

## 6) Functional Requirements

### 6.1 Inputs/Parameters
- Probability threshold: {10%, 1%, 0.1%}, default 1%.
- Stockfish depth: {15, 20, 25}, default 20.
- Minimum win rate filter: numeric (percent), default 45%.
- Maia rating level: from global selection (1100–1900).

### 6.2 Algorithm
- Initial candidate filtering:
  - From current FEN, enumerate legal moves.
  - Compute Stockfish winrate at chosen depth for each legal move.
  - Candidate moves = those with winrate ≥ minimum winrate filter.
- Probability tree generation (per candidate):
  - Apply candidate move; recursively expand using Maia move probabilities for both sides.
  - Continue path expansion while cumulative path probability ≥ threshold; record [sequence, cumulative prob, leaf position].
- Player-aware pruning:
  - If analyzing player’s own move leads to winrate < minimum filter, stop at that node; record degraded winrate.
  - Opponent blunders continue (they benefit the analyzing player).
- Leaf evaluation:
  - Evaluate each leaf position via Stockfish as winrate at chosen depth.
- Aggregation:
  - expected_win_rate = Σ(path_prob × leaf_win_rate).
  - Normalize coverage: expected_win_rate += (1 − Σ(path_probs)) × base_position_winrate.
  - Confidence buckets by coverage thresholds (e.g., High ≥ 80%, Medium ≥ 60%, Low < 60%).
- Output per candidate move:
  - SAN, expected winrate, confidence, average tree depth, elapsed calculation time, and pruned tree for details.

### 6.3 UI/UX
- Controls (top row): Probability Threshold, Stockfish Depth, Min Win Rate, Maia Level (reflect global).
- Main view: Ranked move list with Move, Expected Winrate, Confidence, Tree Depth.
- Detail view: interactive tree with probability flow, Stockfish annotations, and summary stats (branches, coverage, elapsed time).
- Continuous feedback: progress indicator, “analysis running” state, partial results progressively update; cache status.

### 6.4 Telemetry
- Track parameter selections, calculation start/finish, duration, cache hits, number of branches explored, coverage, detail-view opens.

## 7) Non-Functional Requirements
- No enforced max runtime or node caps; computation may continue as long as desired with UI indicating running state.
- Progressive rendering without blocking UI; leverage workers/streams where applicable.
- Reliability: graceful partial results; safe abort on navigation.
- Accessibility: keyboard navigation, labels, readable formatting.

## 8) Data Structures
- ExpectedWinRateNode and ExpectedWinRateResult (as specified in Feature plan).
- Cache key = FEN + threshold + depth + minWin + maiaLevel.

## 9) Risks and Mitigations
- Tree growth can be large: rely on probability thresholding and progressive results; surface coverage/confidence so users understand partiality.
- Engine contention/UI jank: use workers and yield to main thread; incremental updates.
- Perspective consistency: reuse existing Stockfish perspective handling.

## 10) Acceptance Criteria
- Default parameters produce a ranked list with progressive updates and visible “running” state.
- Parameter changes re-trigger computation or load from cache; UI shows progress.
- Detail view shows the pruned probability tree; coverage matches confidence rules.
- Player-aware pruning demonstrably stops paths at first own blunder below threshold; opponent blunders continue.
- Telemetry logs computation and interactions.

## 11) Open Questions
- Finalize confidence thresholds.
- Min Win Rate input: percentage vs decimal display; rounding.
- How/when to stop automatically (user-controlled stop button?).

## Source
Derived from Feature plan.txt in repo and aligned with project architecture in README.md.
