# Development Plan: Expected Winrate Analysis

## A) Milestones

### 1. Architecture and Interfaces
- Define TS types: ExpectedWinRateNode, ExpectedWinRateResult; parameter schema; cache keys.
- Verify engine interfaces and utilities (FEN/SAN, legal moves, repetition/terminal detection).
- Establish controller architecture: new `useExpectedWinrateController` or a new mode within `useAnalysisController`.

### 2. Engine/Algorithm Integration
- Candidate filtering via Stockfish winrates at chosen depth.
- Maia-probability tree expansion using cumulative probability thresholding (both sides).
- Player-aware pruning policy integration (stop on own blunder below threshold; continue on opponent blunders).
- Leaf evaluation via Stockfish; normalization and coverage/confidence computation.

### 3. Progressive Execution and Caching
- Progressive updates: stream partial results to UI; continuous “running” indicator; elapsed time.
- Result caching by FEN+params; reuse Stockfish eval caches; display cache status.
- Abort/resume hooks on navigation, parameter changes, or explicit user stop.

### 4. UI/UX Implementation
- Parameter controls: dropdowns/inputs bound to controller state.
- Ranked move list: sortable columns; progressive updates.
- Detail tree view: lazy-load on expand; probability flow and winrate annotations; summary stats.
- Loading/progress indicators; elapsed time display; cache status.

### 5. Telemetry, Errors, Edge Cases
- Instrument analytics events via existing analytics helper.
- Handle terminal/repetition states; maintain current-to-move perspective.
- Clear error surfaces for engine failures; allow continue/retry.

### 6. Verification and Testing (granular, easy-to-verify tests)
Add easy-to-verify tests for every part of the build to ensure expected operation:

- Unit tests:
  - Stockfish winrate wrapper:
    - Perspective conversion correct (current-to-move).
    - Depth parameter honored.
    - Deterministic mocks validate outputs.
  - Candidate filtering:
    - Includes/excludes by min winrate threshold.
    - Edge: no candidates, all candidates.
  - Maia probability expansion:
    - Cumulative probability math correct.
    - Alternation by side correct.
    - Threshold stopping works deterministically.
  - Player-aware pruning:
    - Stops on analyzing player blunder below threshold and records pruning metadata.
    - Continues on opponent blunders.
  - Leaf aggregation:
    - Normalization with uncovered mass (1 − Σ(path_probs)).
    - Expected value equals manual calculation for small fixtures.
  - Confidence bucketing:
    - Coverage → bucket mapping matches thresholds.
  - Caching:
    - Key correctness (FEN+params).
    - Hit/miss behavior.
    - Invalidation on params/FEN change.
  - Terminal/repetition detection:
    - No infinite loops; early termination as expected.

- Integration tests:
  - End-to-end for fixed mock position with seeded Maia probabilities and Stockfish outputs; verify ranked list and tree detail results.
  - Progressive updates:
    - Controller emits incremental results.
    - UI reflects running state and updates list incrementally.

- Snapshot/contract tests:
  - Types and controller outputs for given inputs remain stable across refactors.

- Test tooling:
  - Deterministic seeded mocks for Maia and Stockfish.
  - Small fixed-tree fixtures to compute expected aggregates by hand.
  - Helpers to build trees and assert expected structures.

- Verification checklist per PR:
  - All unit and integration tests pass locally and in CI.
  - Manual spot-check on opening, tactical, and endgame positions with logs enabled.
  - Accessibility checks for controls and list navigation.

### 7. Documentation and Launch
- In-repo docs: this plan and the PRD under `docs/`.
- Feature flag/toggle in analysis pane; default off initially; then turn on when validated.
- In-app helper text/tooltip for Expected Winrate mode.
- Post-merge monitoring via analytics events dashboard.

## B) Task Breakdown
- Controller and Orchestration:
  - Implement `useExpectedWinrateController` (state, params, orchestration, progressive updates).
  - Integrate with analysis page/context; feature toggle.
- Engine Integration:
  - Stockfish winrate wrapper with caching/batching.
  - Maia probability runner; alternation and cumulative probability.
  - Player-aware pruning implementation.
- UI Components:
  - `ParameterControlsExpectedWinrate`
  - `ExpectedWinrateList` (ranked list)
  - `ExpectedWinrateTree` (detail view)
  - Shared formatters/indicators (confidence, coverage, percentages).
- Telemetry and Errors:
  - Analytics events; error handling surfaces; abort/resume control.
- Tests:
  - Full unit suite and integration harness with seeded engine mocks.
  - CI configuration to run the suite.

## C) Dependencies
- Existing engine contexts/hooks and utilities.
- Stockfish web worker setup; potential worker pattern for tree computation if needed.
- Analytics helper available.

## D) Implementation Notes
- No hard timeout or node caps; computation may run indefinitely; UI indicates running with partial results.
- Debounce parameter changes; cancel in-flight runs when parameters change.
- Ensure perspective consistency with existing Stockfish processing.

## E) Success Metrics
- Functional: Acceptance criteria pass; progressive updates visible; correct pruning and normalization.
- Test coverage: Unit/integration coverage across all algorithmic parts; deterministic fixtures.
- UX: Users can interpret results quickly; confidence and coverage understandable.
- Stability: Low error rates; smooth UI during long analyses.
