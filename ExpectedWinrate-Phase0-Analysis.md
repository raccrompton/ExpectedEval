# Expected Winrate Analysis - Phase 0 Architecture Integration Analysis

## Phase 0.1: Engine Integration Deep Dive - Complete

### 1. useEngineAnalysis Hook Coordination Patterns (Lines 612-618)

**Key Integration Points:**
- **Hook Invocation**: `useEngineAnalysis(controller.currentNode, inProgressAnalyses, currentMaiaModel, setAnalysisState, targetDepth)`
- **Dual Engine Coordination**: Manages both Stockfish and Maia engines through separate `useEffect` hooks
- **Conflict Prevention**: Uses `inProgressAnalyses` Set to prevent duplicate evaluations of same position
- **Retry Logic**: Robust engine readiness checking (30 retries × 100ms = 3 second timeout)
- **Perspective Handling**: Critical for Expected Winrate - evaluations are always from current player's perspective

**Reusable Patterns for Expected Winrate:**
- Engine readiness wait patterns (lines 64-72, 143-158)
- Timeout-based analysis triggering (100ms delay to prevent rapid-fire, lines 116-118, 189-193)
- Progress tracking via `setAnalysisState` counter increments
- Cleanup and cancellation patterns for component unmounting

### 2. analysisState Reactive System Integration (Line 60, 615)

**Current Architecture:**
- **State Counter**: `const [analysisState, setAnalysisState] = useState(0)` - incrementing counter triggers UI updates
- **Update Triggers**: Every engine result calls `setAnalysisState((state) => state + 1)` (lines 103, 108, 179)
- **Reactive Dependencies**: All UI components depend on this counter for re-rendering analysis results
- **Coordination**: Single source of truth for when any analysis data changes

**Expected Winrate Integration Strategy:**
- Must use same `setAnalysisState` increment pattern for UI reactivity
- Can coordinate with existing `inProgressAnalyses` Set for conflict prevention
- Should integrate with existing `hasUnsavedAnalysis` tracking (line 166)

### 3. useMoveRecommendations Reusable Evaluation Patterns (Lines 659-667 Reference)

**Data Processing Patterns:**
- **Move Filtering**: Legal move enumeration using `chess.moves({ verbose: true })` (line 123)
- **Evaluation Normalization**: CP values clamped and normalized (lines 135-138, 146-148)
- **Winrate Calculations**: Integration with `cp_relative_vec` and `winrate_loss_vec` (lines 44-46, 51-53)
- **Data Transformation**: Converting engine data to UI-ready formats with opacity/importance scoring

**Critical Reusable Logic:**
- **Perspective-Aware Processing**: `isBlackTurn` handling for evaluation direction (line 17)
- **Missing Data Defaults**: Graceful handling when moves not evaluated by engines (lines 135-138, 140-141)
- **Comprehensive Move Data**: Structure including `rawCp`, `winrate`, `cp_relative` (lines 163-179)

### 4. Caching & Auto-Save System Architecture (Lines 92-189)

**Cache Integration Points:**
- **Key Generation**: `generateAnalysisCacheKey(analysisData)` creates unique identifiers from position + analysis metadata
- **Cache Structure**: Includes `ply`, `fen`, `hasStockfish`, `stockfishDepth`, `hasMaia`, `maiaModels` (lines 177-184)
- **Backend Sync**: `storeEngineAnalysis(game.id, analysisData)` for persistence (line 132)
- **Change Detection**: Compares current vs `lastSavedCacheKey` to determine if save needed (line 127)

**Auto-Save Infrastructure:**
- **Trigger System**: `analysisState` changes mark `hasUnsavedAnalysis = true` (lines 165-167)
- **Timer-Based**: 10-second interval auto-save with cleanup (lines 179-188)
- **Quality Thresholds**: Only saves "meaningful" analysis (depth ≥ 12 or Maia data, lines 117-124)
- **Game Type Filtering**: Excludes custom PGN/FEN and tournament games (lines 94-100)

## Critical Integration Requirements for Expected Winrate

### Engine Coordination
- **Reuse Existing Contexts**: Must work within `StockfishEngineContext` and `MaiaEngineContext`
- **Respect Conflict Prevention**: Use `inProgressAnalyses` Set to avoid evaluation collisions
- **Follow Retry Patterns**: Implement same 3-second engine readiness wait logic
- **Maintain Perspective Consistency**: Ensure evaluations remain from current player's perspective

### State Management
- **Reactive Integration**: Use `setAnalysisState` counter for UI updates
- **Cache Extension**: Enhance `generateAnalysisCacheKey` to include Expected Winrate parameters
- **Auto-Save Integration**: Work with existing unsaved changes tracking and backend sync

### Data Processing 
- **Reuse Move Processing**: Adapt legal move enumeration and evaluation normalization patterns
- **Extend Evaluation Structure**: Build on existing `cp_relative_vec`, `winrate_vec` patterns
- **Maintain Data Quality**: Follow existing thresholds for meaningful analysis storage

## Phase 0.2: UI Architecture Patterns - Complete

### 1. AnalysisSidebar Responsive Patterns (Lines 104-348)

**Responsive Layout Architecture:**
- **XL+ Screens (1280px+)**: 2-row layout with `xl:flex xl:h-full xl:flex-col xl:gap-2` (line 105)
  - **Row 1**: Highlight + MovesByRating side-by-side (lines 107-172)
  - **Row 2**: MoveMap + BlunderMeter side-by-side (lines 175-212)
- **Smaller Screens (<1280px)**: 3-row vertical layout with `xl:hidden` (line 216)
  - **Row 1**: Highlight + BlunderMeter side-by-side (lines 217-293)
  - **Row 2**: MoveMap full width (lines 296-322)
  - **Row 3**: MovesByRating full width (lines 325-347)

**Critical Replacement Points for Expected Winrate:**
- **MoveMap Container**: Lines 177-186 - Replace with `ExpectedWinrateControls`
- **MovesByRating Container**: Lines 327-333 (small screens), 151-156 (large screens) - Replace with `ExpectedWinrateResults`

**Container Structure Patterns:**
- **Flex Containers**: `desktop-analysis-big-row-*-container` and `desktop-analysis-small-row-*-container` classes
- **Border Styling**: Consistent `border-[0.5px] border-white/40` across containers
- **Background**: `bg-background-1` with opacity variations
- **Gap Spacing**: Consistent `gap-2` between major sections

### 2. MovesByRating Container Structure (Lines 42-48)

**Base Container Pattern:**
```tsx
<div
  id="analysis-moves-by-rating"
  className="flex h-64 w-full flex-col bg-background-1/60 md:h-full md:rounded"
>
  <h2 className="p-3 text-base text-primary md:text-sm xl:text-base">
    Moves by Rating
  </h2>
  // Chart content...
</div>
```

**Key Reusable Elements:**
- **Height Management**: `h-64` on mobile, `md:h-full` for larger screens
- **Background**: `bg-background-1/60` for subtle container distinction
- **Typography**: Responsive text sizing `text-base md:text-sm xl:text-base`
- **Padding**: `p-3` for header content
- **ID Naming**: Follows `analysis-*` convention for component identification

### 3. Analysis Enabled/Disabled State Integration (Lines 159-212)

**Overlay System Architecture:**
- **Toggle State**: `analysisEnabled` boolean controls all analysis components
- **Toggle UI**: Lines 84-102 provide toggle button with visual state indicators
- **Conditional Rendering**: All components receive conditional props based on `analysisEnabled`
- **Overlay Pattern**: Absolute positioned overlay with backdrop blur for disabled state

**Disabled State Overlay Template:**
```tsx
{!analysisEnabled && (
  <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
    <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
      <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
        lock
      </span>
      <p className="font-medium text-primary">Analysis Disabled</p>
      <p className="text-sm text-secondary">
        Enable analysis to see [specific feature description]
      </p>
    </div>
  </div>
)}
```

**Integration Requirements:**
- Expected Winrate components must respect `analysisEnabled` state
- Must provide appropriate disabled state messaging
- Should integrate with existing toggle mechanism in AnalysisSidebar header

### 4. WindowSizeContext Responsive Breakpoints Usage

**Context Integration:**
- **Provider**: Available globally via `WindowSizeContext` (imported from `src/contexts`)
- **Interface**: `{ height: number, width: number, isMobile: boolean }`
- **Usage Pattern**: `const { width, height, isMobile } = useContext(WindowSizeContext)`

**Responsive Font Sizing Patterns (MoveMap.tsx):**
```tsx
const getAxisLabelFontSize = () => {
  if (width < 640) return 10   // Very small screens
  if (width < 768) return 11   // Small screens  
  if (width < 1024) return 12  // Medium screens
  if (width < 1280) return 13  // Large screens
  return 14                    // Extra large screens
}

const getTickFontSize = () => {
  if (width < 640) return 8    // Very small screens
  if (width < 768) return 9    // Small screens
  if (width < 1024) return 9   // Medium screens
  if (width < 1280) return 10  // Large screens
  return 11                    // Extra large screens
}
```

**Tailwind Breakpoints Coordination:**
- **sm**: 640px (matches width < 640 check)
- **md**: 768px (matches width < 768 check)
- **lg**: 1024px (matches width < 1024 check)
- **xl**: 1280px (matches width < 1280 check) - **Critical for AnalysisSidebar layout switch**
- **Custom**: 3xl (1920px), 4xl (2560px) for ultra-wide displays

## Expected Winrate UI Integration Strategy

### Component Replacement Plan
1. **ExpectedWinrateControls** replaces MoveMap in AnalysisSidebar containers
2. **ExpectedWinrateResults** replaces MovesByRating in AnalysisSidebar containers
3. **ExpectedWinrateTree** as new addition (doesn't replace existing component)

### Responsive Design Requirements
- Follow existing `xl:` breakpoint for layout switching at 1280px
- Implement progressive font sizing using WindowSizeContext width values
- Maintain container styling patterns with `bg-background-1/60` and border styling
- Integrate disabled state overlay system with appropriate messaging

### Architecture Compliance
- Use existing container class naming convention (`desktop-analysis-*-container`)
- Respect `analysisEnabled` boolean for conditional rendering
- Follow header typography patterns (`text-base md:text-sm xl:text-base`)
- Maintain consistent spacing with `gap-2` and `p-3` patterns

This analysis confirms the UI integration points are well-defined with clear patterns to follow for seamless Expected Winrate integration.