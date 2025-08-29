# Expected Winrate Analysis - Systematic Development Plan

## Phase 0: Architecture Integration Analysis (Day 1)
### 0.1 Engine Integration Deep Dive
- **Analyze**: How `useEngineAnalysis` hook coordinates Stockfish/Maia requests (useAnalysisController.ts:612-618)
- **Map**: Integration points with existing `analysisState` reactive system (line 60, 615)
- **Identify**: Reusable evaluation patterns from `useMoveRecommendations` (lines 659-667)
- **Study**: Existing caching with `generateAnalysisCacheKey` and auto-save (lines 92-189)

### 0.2 UI Architecture Patterns
- **Study**: AnalysisSidebar.tsx responsive patterns (lines 104-348) for container reuse
- **Analyze**: MovesByRating.tsx container structure (lines 42-48) to maintain styling consistency
- **Plan**: Analysis enabled/disabled state integration (lines 159-212 in AnalysisSidebar.tsx)
- **Map**: WindowSizeContext responsive breakpoints usage across components

## Phase 1: Foundation & Core Types (Days 2-3)
### 1.1 Create Type Definitions with Architecture Integration
- **File**: `src/types/expectedWinrate.ts`
- **Core Types**: `ExpectedWinRateNode`, `ExpectedWinRateResult`, `ExpectedWinRateParams`
- **Integration Types**: `ExpectedWinrateProgress`, `ExpectedWinrateCache`, `ExpectedWinrateAnalysis`
- **Engine Coordination**: Types that extend existing `AnalysisResult` patterns
- **Testing**: TypeScript compilation + integration with existing analysis types

### 1.2 Create Core Algorithm Functions with Engine Integration
- **File**: `src/lib/expectedWinrate/`
  - `engineCoordination.ts` - Coordinate with existing Stockfish/Maia contexts
  - `treeGeneration.ts` - Implement Step 2: Maia probability tree building using existing engine patterns
  - `stockfishEvaluation.ts` - Implement Step 1 & 3: Position evaluation and tree endpoint evaluation
  - `pruning.ts` - Implement Step 4: Player-aware tree pruning logic
  - `calculation.ts` - Implement Step 5: Expected winrate calculation with normalization
  - `cacheIntegration.ts` - Extend existing cache system for expected winrate results

**Algorithm Implementation Reference** (from FeaturePlan.txt):
- **Step 1**: Initial Move Filtering - Filter legal moves by winrate loss threshold
- **Step 2**: Probability Tree Generation - Build Maia trees for each candidate move
- **Step 3**: Stockfish Win Rate Evaluation - Evaluate all tree leaf positions
- **Step 4**: Player-Aware Tree Pruning - Stop analysis when analyzing player makes bad moves
- **Step 5**: Expected Win Rate Calculation - Compute weighted average with normalization

- **Testing**: Unit tests for each algorithm step + integration tests with engine mocks

## Phase 2: Controller Hook Implementation (Days 4-6)
### 2.1 Create Expected Winrate Controller Hook with Engine Integration
- **File**: `src/hooks/useExpectedWinrateController/index.ts`
- **Architecture**: Extend existing controller patterns, integrate with `useAnalysisController`
- **Engine Integration**: 
  - Reuse `currentMaiaModel` state management (useAnalysisController.ts:601-610)
  - Coordinate with existing `analysisState` counter for reactive updates (line 60)
  - Work within existing `inProgressAnalyses` Set to avoid evaluation conflicts
- **Features**: Parameter management, calculation orchestration, result caching
- **Testing**: Integration tests with actual engine contexts + calculation flow validation

### 2.2 Progressive Calculation with Existing Infrastructure
- **Phase A Integration**: Generate Maia trees using existing engine coordination patterns
- **Phase B Coordination**: Batch Stockfish requests within existing depth management system
- **Progress Integration**: Update existing UI progress patterns for two-phase calculation
- **Cache Integration**: Extend existing `generateAnalysisCacheKey` to include expected winrate params
- **Auto-save Integration**: Work with existing `saveAnalysisToBackend` system (lines 92-153)
- **Testing**: Progress state updates, calculation interruption, cache validation

## Phase 3: UI Components with Architecture Compliance (Days 7-9)
### 3.1 Parameter Controls Component - Responsive Integration
- **File**: `src/components/Analysis/ExpectedWinrateControls.tsx`
- **Architecture**: Follow existing responsive patterns from AnalysisSidebar.tsx (lines 104-348)
- **Responsive Design**: 
  - Reuse existing font sizing patterns (getAxisLabelFontSize, getTickFontSize from MoveMap.tsx)
  - Integrate with WindowSizeContext breakpoints
  - Match existing mobile/desktop layout switching
- **Features**: 4 dropdowns/inputs (probability threshold, SF depth, winrate loss, Maia level)
- **Integration**: Replace MoveMap header content while maintaining container structure
- **Testing**: Parameter validation, persistence, responsive behavior

### 3.2 Results Display Component - Container Reuse
- **File**: `src/components/Analysis/ExpectedWinrateResults.tsx`
- **Architecture**: Reuse MovesByRating container structure and styling patterns (lines 42-48)
- **Responsive Design**: Match existing chart responsive behavior and font sizing
- **Features**: Ranked move list with confidence indicators, progressive update display
- **Analysis State Integration**: Handle analysis enabled/disabled states with overlay pattern
- **Testing**: Sorting, rendering with mock data, responsive layout, disabled state

### 3.3 Tree Visualization Component - UI Pattern Reuse Implementation
- **File**: `src/components/Analysis/ExpectedWinrateTree.tsx`
- **Architecture Decision**: Implement **Approach 2: UI Pattern Reuse** for optimal UX

**Reuse from MovesContainer.tsx**:
- **Visual Patterns**: Extract and adapt `VariationTree` and `InlineChain` styling patterns (lines 487-572, 574-664)
- **CSS Tree Connectors**: Reuse existing tree indentation and connector CSS
- **Responsive Layouts**: Adapt mobile horizontal scroll vs desktop tree view patterns (lines 215-327 vs 329-446)
- **Interaction Patterns**: Adapt click handlers, hover states, current node highlighting (lines 231-235, 271-275)
- **Accessibility Features**: Maintain keyboard navigation and ARIA support patterns

**Purpose-Built Architecture**:
- **ExpectedWinRateNode Data Structure**: Unified structure for both algorithm and UI, optimized for probability trees with cumulative probabilities and optional UI state fields
- **Board Preview Logic**: Temporary position display without affecting main analysis state (not permanent game state changes)
- **Tree Navigation Controller**: Purpose-built for probability tree traversal and preview mode management

**Features**: 
- Interactive expandable tree with SAN notation + winrates + probability percentages
- Move highlighting with probability flow visualization

**Tree Node Click Behavior - Board Preview Implementation**:
- **Click Handler**: Adapt existing click patterns (MovesContainer.tsx:231-235, 271-275) for board preview mode
- **Board Preview Controller**: New state management system for temporary position display
- **Preview Mode State**:
  - Track current preview position vs main analysis position
  - Manage visual indicators (board overlay, highlighted tree node)
  - Handle return to analysis mechanism (ESC key, click outside, return button)
- **Non-Disruptive Design**: Preview mode doesn't affect Expected Winrate calculations or analysis state
- **Integration**: Work with existing board component to display preview positions

**Mobile Integration**: Touch-friendly interaction following existing mobile patterns
- **Testing**: Tree navigation, node expansion, mobile interaction, pattern reuse validation, board preview functionality

## Phase 4: Sidebar Integration & Context (Days 10-11)
### 4.1 Context Provider with Architecture Integration
- **File**: `src/contexts/ExpectedWinrateContext/`
- **Pattern**: Follow existing context provider structure (match StockfishEngineContext pattern)
- **Integration**: Connect controller to components via context, coordinate with existing analysis contexts
- **State Management**: Work with existing analysis state system, don't create parallel state
- **Testing**: Context state sharing, updates, integration with existing contexts

### 4.2 AnalysisSidebar Component Replacement
- **Files**: Update `src/components/Analysis/AnalysisSidebar.tsx` (lines 177-186, 327-333)
- **Replacement Strategy**:
  - **Replace MoveMap**: Lines 177-186 with ExpectedWinrateControls 
  - **Replace MovesByRating**: Lines 327-333 with ExpectedWinrateResults
  - **Maintain**: All existing responsive layout patterns (lines 104-348)
  - **Preserve**: Analysis enabled/disabled overlay system (lines 159-212)
- **Responsive Integration**: Maintain existing xl:hidden and xl:flex patterns
- **Testing**: Component replacement, responsive layout, analysis state integration

## Phase 5: Engine Integration & Advanced Caching (Days 12-13)
### 5.1 Stockfish Integration with Existing Infrastructure
- **Use**: Existing `StockfishEngineContext` and evaluation coordination from `useEngineAnalysis`
- **Integration**: Work within existing depth management system (useAnalysisController.ts:617)
- **Coordination**: Use existing `inProgressAnalyses` Set to prevent evaluation conflicts
- **Features**: Batch evaluation with perspective conversion, winrate conversion
- **Performance**: Leverage existing Stockfish worker and evaluation queuing
- **Testing**: Evaluation accuracy, perspective handling, conflict prevention

### 5.2 Maia Integration with Model Management  
- **Use**: Existing `MaiaEngineContext` and `currentMaiaModel` state (lines 601-610)
- **Integration**: Coordinate with existing model loading and caching system
- **Features**: Tree generation with probability thresholds using existing model infrastructure
- **Performance**: Reuse existing model download and caching mechanisms
- **Testing**: Probability extraction, tree building, model switching

### 5.3 Enhanced Caching Strategy
- **Implementation**: Extend existing cache system rather than creating parallel caching
- **Integration**: Enhance `generateAnalysisCacheKey` to include expected winrate parameters
- **Backend Integration**: Work with existing `storeEngineAnalysis` system (lines 92-189)
- **Auto-save**: Integrate with existing auto-save timer and unsaved changes tracking
- **Features**: Cache status display, fresh/cached indicators, backend persistence
- **Testing**: Cache hits/misses, invalidation, backend sync, auto-save integration

## Phase 6: Error Handling & Performance Polish (Days 14-15)
### 6.1 Error Boundaries & Comprehensive Validation
- **Engine Integration**: Leverage existing error handling patterns from engine contexts
- **Features**: Engine failure handling with graceful degradation, input validation, game end detection
- **UI Integration**: Use existing error display patterns from analysis components
- **Testing**: Error scenarios, recovery, engine failure simulation

### 6.2 Performance Optimization & Resource Management
- **Memory Management**: Efficient tree data structures, cleanup of large calculation trees
- **Calculation Performance**: Progress indicators, timeout handling, calculation interruption
- **Engine Coordination**: Optimize batch requests to prevent engine overload
- **UI Performance**: Prevent blocking during calculations, smooth progressive updates
- **Testing**: Large tree handling, resource cleanup, calculation interruption, UI responsiveness

### 6.3 Mobile & Accessibility Enhancement
- **Responsive Design**: Match existing mobile patterns from AnalysisSidebar and component library
- **Touch Interaction**: Touch-friendly tree navigation, mobile parameter controls
- **Accessibility**: Screen reader support, keyboard navigation, ARIA labels
- **Performance**: Mobile-optimized calculation display and interaction patterns
- **Testing**: Mobile viewport testing, accessibility audit, performance on mobile devices

## Phase 7: Comprehensive Testing & Quality Assurance (Days 16-17)
### 7.1 Multi-Layer Testing Strategy
- **Unit Tests**: All algorithm functions with known position validation
- **Integration Tests**: Controller + engine integration, cache integration, auto-save coordination
- **Component Tests**: UI components with Testing Library, responsive behavior testing
- **Tree Interaction Tests**: Board preview mode functionality, return mechanisms, visual indicators
- **Engine Integration Tests**: Stockfish/Maia coordination, evaluation accuracy, perspective conversion
- **Performance Tests**: Large tree handling, calculation timeout, memory usage
- **E2E Tests**: Full calculation workflow, progressive display, user interaction flows, board preview workflow

### 7.2 Code Quality & Architecture Compliance
- **Linting**: Run `npm run lint` with auto-fix, ensure compliance with existing code style
- **Type Safety**: Run `npm run typecheck`, fix all TypeScript errors
- **Architecture Review**: Verify integration patterns match existing codebase standards
- **Test Coverage**: Achieve > 80% coverage with focus on algorithm accuracy and engine integration
- **Performance Benchmarking**: Validate calculation performance and UI responsiveness
- **Accessibility Compliance**: Screen reader testing, keyboard navigation validation

## Testing Strategy Per Phase

### Unit Testing Approach
```bash
# Test individual phases
npm test -- --testPathPattern=expectedWinrate/treeGeneration
npm test -- --testPathPattern=expectedWinrate/calculation
npm test -- --testPathPattern=useExpectedWinrateController
npm test -- --testPathPattern=ExpectedWinrateResults
```

### Integration Testing
```bash
# Test engine integration
npm test -- --testPathPattern=expectedWinrate/integration
# Test UI integration
npm test -- --testPathPattern=Analysis/ExpectedWinrate
```

### Manual Testing Checkpoints
1. **Phase 2**: Controller calculation with mock data
2. **Phase 3**: UI rendering with static test data
3. **Phase 4**: Context integration with live state
4. **Phase 5**: Full engine integration with real positions
5. **Phase 6**: Error scenarios + edge cases

### Success Criteria per Phase
- **Phase 0**: Architecture integration points identified, existing patterns understood
- **Phase 1**: Types compile and integrate with existing analysis types, algorithm functions pass unit tests
- **Phase 2**: Controller integrates with existing engine infrastructure, state management coordinated
- **Phase 3**: Components follow existing responsive patterns, analysis state integration works
- **Phase 4**: Context provider matches existing patterns, AnalysisSidebar replacement successful
- **Phase 5**: Engine coordination works within existing infrastructure, caching extends existing system
- **Phase 6**: Error handling leverages existing patterns, performance matches existing standards
- **Phase 7**: Test coverage > 80%, architecture compliance verified, no regressions

### Critical Architecture Integration Points
- **Engine Coordination**: Must work within existing `useEngineAnalysis` and engine context patterns
- **State Management**: Integrate with existing `analysisState` reactive system, don't create parallel state
- **Caching**: Extend existing cache system, don't replace it
- **Auto-save**: Work with existing backend sync and unsaved changes tracking
- **Responsive Design**: Follow existing patterns from AnalysisSidebar, MoveMap, MovesByRating
- **Component Architecture**: Use existing Controller Hook + Context + Presentational Components pattern

### Critical Integration Details & UI Reuse Strategy
- **Tree UI Implementation**: **Approach 2: UI Pattern Reuse** - Reuse visual patterns while creating purpose-built architecture
- **Analysis Toggle System**: Must integrate with existing analysis enabled/disabled system (AnalysisSidebar.tsx:84-102)
- **Move Highlighting Integration**: Coordinate with existing move highlighting and arrow drawing systems
- **Keyboard Navigation**: Preserve all existing keyboard shortcuts for analysis navigation and move selection
- **Engine Status Integration**: Display Stockfish/Maia readiness status consistent with existing analysis patterns
- **Overlay System**: Use existing disabled state overlay patterns (AnalysisSidebar.tsx:159-212) for consistency

### Tree UI Pattern Reuse Implementation Details
**From MovesContainer.tsx - Reuse These Patterns**:
- **VariationTree Component Logic**: Tree rendering with proper indentation and connectors (lines 487-571)
- **InlineChain Component Logic**: Sequential move display for linear probability paths (lines 574-664)
- **Mobile Responsive Pattern**: Horizontal scroll layout for mobile devices (lines 215-327)
- **Desktop Tree Pattern**: Vertical tree layout for desktop displays (lines 329-446)
- **Interaction States**: Click handlers, hover effects, active node highlighting patterns

**Complete Component Hierarchy to Implement**:
- **ExpectedWinrateTree.tsx**: Main tree container component using adapted visual patterns from MovesContainer.tsx
- **ExpectedWinrateBranch.tsx**: Individual tree branch component (equivalent to VariationTree, lines 487-571)
- **ExpectedWinrateSequence.tsx**: Linear sequence component (equivalent to InlineChain, lines 574-664)
- **BoardPreviewController**: State management for board preview mode functionality
- **Preview mode utilities**: Handle tree node click → board preview → return to analysis flow
- **Tree navigation utilities**: Purpose-built for probability tree traversal using unified ExpectedWinRateNode structure

### Board Preview Mode Implementation Details

**Preview State Management**:
```typescript
interface BoardPreviewState {
  isPreviewActive: boolean
  previewPosition: string | null  // FEN of preview position
  previewPath: string[]          // Move sequence leading to preview
  highlightedNodeId: string | null
  analysisPosition: string       // Original analysis position
}
```

**Key Implementation Requirements**:
- **Non-Destructive**: Preview mode never modifies main analysis state or Expected Winrate calculations
- **Visual Indicators**: Board overlay, button states, tree node highlighting to clearly indicate preview mode
- **Return Mechanism**: ESC key, click outside tree area, or explicit "Return" button exits preview
- **Keyboard Navigation**: Arrow keys navigate tree, Enter activates preview, ESC returns to analysis
- **Mobile Support**: Touch-friendly preview interaction matching existing mobile patterns

This plan ensures Expected Winrate integrates seamlessly with the existing sophisticated architecture while replacing the UI components as intended.