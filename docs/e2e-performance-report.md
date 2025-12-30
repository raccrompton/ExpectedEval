# E2E Test Performance Report

**Generated**: 2025-12-30
**Total Tests**: 147
**Passed**: 137
**Failed/Timeout**: 10 (1 failure, 2 timeouts, 7 skipped due to serial dependencies)

---

## Executive Summary

The E2E test suite has **3 problematic tests** causing cascading failures:

1. Two tests timeout at 30s (Playwright default) waiting for UI state that never arrives
2. One test fails due to missing `data-selected` attribute
3. These failures cause 7 additional tests to be skipped (serial test dependencies)

**Resource usage is not the issue** - tests are I/O bound waiting on async operations, not CPU/memory constrained.

---

## Failing Tests Analysis

### 1. TIMEOUT: `clicking Add SF Analysis enriches results`

| Field | Value |
|-------|-------|
| **File** | `src/__tests__/e2e/06-ew-mock.spec.ts` |
| **Line** | 191 |
| **Duration** | 30.08s (hit timeout) |
| **Status** | Timeout |

**Test Code:**
```typescript
test('clicking Add SF Analysis enriches results', async () => {
  const sfButton = page.getByTestId('add-sf-analysis-button')
  await sfButton.click()

  // This assertion times out - element never contains expected text
  await expect(page.getByTestId('ew-status')).toContainText(/Complete|Stockfish/, { timeout: EW_CALC_TIMEOUT })

  const ewSF = page.getByTestId('ew-sf-value')
  await expect(ewSF).toContainText(/%/)
})
```

**Root Cause Analysis:**
- The `ew-status` element exists but never updates to contain "Complete" or "Stockfish"
- Either:
  1. SF enrichment function doesn't complete
  2. Status state isn't being set correctly after enrichment
  3. The `ew-status` test ID is on wrong element

**Suggested Investigation:**
1. Check `useExpectedWinrate` hook - does `enrichWithSF()` update status to 'complete'?
2. Verify `ew-status` test ID is on the element displaying status text
3. Add console logging to track status transitions during enrichment

---

### 2. TIMEOUT: `evaluations update when navigating through moves`

| Field | Value |
|-------|-------|
| **File** | `src/__tests__/e2e/07-real-engines.spec.ts` |
| **Line** | 149 |
| **Duration** | 30.05s (hit timeout) |
| **Status** | Timeout |

**Test Code:**
```typescript
test('evaluations update when navigating through moves', async () => {
  await page.getByTestId('nav-start').click()
  await expect(page.getByTestId('maia-moves')).toBeVisible({ timeout: EVAL_TIMEOUT })

  await page.getByTestId('nav-forward').click()
  await expect(page.getByTestId('sf-eval')).toBeVisible({ timeout: EVAL_TIMEOUT })

  // This click times out - button stays disabled
  await page.getByTestId('nav-end').click()  // <-- FAILS HERE
  await expect(page.getByTestId('sf-eval')).toBeVisible({ timeout: EVAL_TIMEOUT })
})
```

**Error Details:**
```
Error: locator.click: Target page, context or browser has been closed
- element is not enabled
- 58 × waiting for element to be visible, enabled and stable
```

**Root Cause Analysis:**
- The `nav-end` button remains disabled throughout the test
- Button is disabled when already at the end of the game OR when game isn't loaded
- Previous navigation commands may have put the game in an unexpected state

**Suggested Investigation:**
1. Check if game is properly loaded before navigation tests run
2. Verify `nav-forward` successfully moved to a non-end position
3. Check button enable/disable logic in navigation component
4. The serial test setup may have state pollution from prior tests

---

### 3. FAILURE: `clicking candidate updates tree column`

| Field | Value |
|-------|-------|
| **File** | `src/__tests__/e2e/06-ew-mock.spec.ts` |
| **Line** | 272 |
| **Duration** | 5.68s |
| **Status** | Failed |

**Test Code:**
```typescript
test('clicking candidate updates tree column', async () => {
  const secondCandidate = page.getByTestId('ew-candidate-1')
  const candidateExists = await secondCandidate.isVisible().catch(() => false)

  if (candidateExists) {
    await secondCandidate.click()
    // This assertion fails - attribute not set
    await expect(secondCandidate).toHaveAttribute('data-selected', 'true')
  }
})
```

**Root Cause Analysis:**
- Click succeeds but `data-selected="true"` attribute is never set
- Either:
  1. The selection state update doesn't add the attribute
  2. The attribute name is different (e.g., `aria-selected`)
  3. Selection logic has a bug

**Suggested Investigation:**
1. Check `CandidateColumn` component - does it set `data-selected` on click?
2. Verify the attribute name matches what the component renders
3. Check if there's a re-render issue preventing attribute update

---

## Skipped Tests (Due to Serial Dependencies)

These 7 tests were skipped because they depend on prior tests in a serial group that failed:

| Test | File | Reason |
|------|------|--------|
| `EW auto-recalculates after navigation` | 06-ew-mock.spec.ts | Depends on SF enrichment test |
| `no console errors during EW operations` | 06-ew-mock.spec.ts | Depends on SF enrichment test |
| `evaluation completes within reasonable time` | 07-real-engines.spec.ts | Depends on navigation test |
| `no critical console errors during engine operations` | 07-real-engines.spec.ts | Depends on navigation test |
| `branch toggle expands alternatives` | 06-ew-mock.spec.ts | Serial dependency |
| `hovering any tree node shows tooltip` | 06-ew-mock.spec.ts | Serial dependency |
| `mainline shows leaf evaluation at end` | 06-ew-mock.spec.ts | Serial dependency |

---

## Resource Usage Analysis

| Phase | CPU | Memory | Notes |
|-------|-----|--------|-------|
| Test startup | 525% peak | 22.7% | 4 parallel workers + Chromium |
| Engine init | 150-220% | 14-17% | WASM/ONNX loading |
| Test execution | 0-6% | 8-15% | **I/O bound** - waiting, not computing |

**Conclusion**: Tests are **not resource-constrained**. CPU is mostly idle during test execution. The issues are functional bugs, not performance problems.

---

## Slowest Passing Tests

| Rank | Duration | Test | Root Cause |
|------|----------|------|------------|
| 1 | 6.56s | `no console errors after loading PGN` | `waitForLoadState('networkidle')` |
| 2 | 5.17s | `settings button has gear icon or label` | localStorage sync wait |
| 3 | 4.08s | `no console errors with board` | `networkidle` wait |
| 4 | 4.01s | `no console errors` | `networkidle` wait |
| 5 | 3.73s | `settings are loaded from localStorage` | Async hydration |

**Pattern**: Tests using `waitForLoadState('networkidle')` are slow because they wait 500ms after last network activity. Consider using specific element waits instead.

---

## Slowest Test Files

| File | Total | Tests | Avg | Notes |
|------|-------|-------|-----|-------|
| 06-ew-mock.spec.ts | 42.55s | 23 | 1.85s | Contains 2 failing tests |
| 08-settings.spec.ts | 34.70s | 24 | 1.45s | localStorage operations |
| 04-navigation.spec.ts | 31.88s | 17 | 1.88s | Multiple UI interactions |
| 07-real-engines.spec.ts | 31.32s | 11 | 2.85s | Contains 1 timeout, serial mode |
| 05-mock-engines.spec.ts | 3.45s | 7 | 0.49s | **Fastest** - mocked engines |

---

## Recommendations

### Immediate Fixes (to unblock tests)

1. **Fix SF enrichment status update** (06-ew-mock.spec.ts:191)
   - Verify `enrichWithSF()` sets status to 'complete' when done
   - Check `ew-status` test ID placement

2. **Fix nav-end button state** (07-real-engines.spec.ts:149)
   - Debug why button stays disabled after `nav-forward`
   - May need to wait for game state to update before clicking

3. **Fix candidate selection attribute** (06-ew-mock.spec.ts:272)
   - Add `data-selected={isSelected}` to candidate element
   - Or update test to use correct attribute name

### Performance Improvements (optional)

1. Replace `waitForLoadState('networkidle')` with specific element waits in console error tests

2. Consider increasing Playwright timeout in `playwright.config.ts`:
   ```typescript
   timeout: 60000, // Match EW_CALC_TIMEOUT
   ```

3. Use mock engines for more tests (05-mock-engines.spec.ts is 3.5x faster per test)

---

## Test Environment

- **Platform**: macOS Darwin 23.6.0
- **Node**: v24.12.0
- **Playwright**: 1.57.0
- **Workers**: 4 (parallel)
- **Browser**: Chromium (Desktop Chrome)
