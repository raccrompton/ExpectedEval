# Expected Winrate Analysis - Product Requirements Document

## 1. Executive Summary

### 1.1 Product Vision
Replace the existing analysis pane components (Maia analysis, Stockfish analysis, moves by rating, move map, blunder meter) with a unified "Expected Winrate" analysis that combines Maia 2's human-like move predictions with Stockfish's position evaluations to predict realistic game outcomes.

### 1.2 Success Criteria
- **Functional**: Accurate winrate calculations that help users understand move consequences
- **Performance**: Visible progress during calculations (time not critical)
- **Usability**: Users can interpret results within 30 seconds
- **Technical**: Clean integration with existing chess engine infrastructure

## 2. Product Requirements

### 2.1 Core Functionality

#### 2.1.1 Analysis Algorithm
**Expected Winrate** = Weighted average win probability across likely future continuations where:
- Move probabilities come from Maia 2 (human-like behavior)
- Position evaluations come from Stockfish (optimal analysis)

#### 2.1.2 User Parameters
| Parameter | Type | Options | Default | Purpose |
|-----------|------|---------|---------|----------|
| Probability Threshold | Dropdown | 10%, 1%, 0.1% | 10% | Controls analysis tree depth |
| Stockfish Depth | Dropdown | 15, 20, 25 | 15 | Analysis depth for evaluations |
| Winrate Loss Threshold | Float Input | e.g., -0.1 | -0.1 | Max acceptable winrate loss from initial position |
| Maia Rating Level | Current Selection | 1100-1900 | User's current | Human skill level for predictions |

#### 2.1.3 Calculation Process
1. **Move Filtering**: Get legal moves, evaluate with Stockfish, filter by winrate loss threshold
2. **Tree Generation**: Build Maia probability trees for each candidate move
3. **Endpoint Evaluation**: Evaluate tree leaf positions with Stockfish
4. **Player-Aware Pruning**: Stop analysis when analyzing player makes bad moves
5. **Expected Calculation**: Compute weighted average winrates

### 2.2 User Interface Requirements

#### 2.2.1 Parameter Controls Panel
- **Layout**: Horizontal row of 4 controls above results
- **Responsive**: Stack vertically on mobile
- **Validation**: Real-time input validation with error states
- **Persistence**: Remember user preferences across sessions

#### 2.2.2 Results Display - Main View
**Ranked Move List** (replacing MovesByRating component at lines 327-333 in AnalysisSidebar.tsx):
```
Move            Expected Win Rate    Confidence    Tree Depth
1. Nf3              67.3%             High          4.2 plies
2. e4               65.8%             High          3.8 plies
3. d4               63.1%             Medium        3.1 plies
```

**Column Specifications**:
- **Move**: SAN notation, clickable for detail view
- **Expected Win Rate**: Percentage (1 decimal), color-coded by quality
- **Confidence**: High (>80%), Medium (60-80%), Low (<60%) tree coverage
- **Tree Depth**: Average analyzed depth (1 decimal)

#### 2.2.3 Results Display - Detail View
**Interactive Tree Visualization** (when clicking a move):
- **UI Architecture Decision**: Implement using **Approach 2: UI Pattern Reuse**
  - **Reuse visual patterns** from MovesContainer.tsx tree navigation (lines 487-572, 574-664)
  - **Create purpose-built component hierarchy**: 
  - `ExpectedWinrateTree.tsx` (main container)
  - `ExpectedWinrateBranch.tsx` (individual branches) 
  - `ExpectedWinrateSequence.tsx` (linear sequences)
  - All using unified `ExpectedWinRateNode` data structure
  - **Leverage existing** responsive mobile/desktop layouts and interaction patterns
  - **Maintain semantic clarity** - Probability trees distinct from game progression trees

**Tree Visualization Features**:
- Expandable/collapsible tree nodes showing move sequences using existing `VariationTree` styling
- Probability flow: Visual representation of cumulative probabilities with tree connectors
- Win rate annotations: Stockfish win rates at key nodes with existing color coding patterns
- **Responsive Design**: Mobile horizontal scroll vs desktop tree view (following MovesContainer patterns)

**Tree Node Interaction - Board Preview Mode**:
- **Click Behavior**: When user clicks a tree node, chess board updates to show position after that move sequence
- **Preview Mode Requirements**:
  - **Temporary Display**: Board shows position preview without changing main analysis context
  - **Visual Indicators**: Subtle board overlay indicating "preview mode" active
  - **Highlighted Node**: Clicked tree node remains visually highlighted during preview
  - **Return Mechanism**: "Return to Analysis" button or ESC key to exit preview mode
  - **Non-Disruptive**: Expected Winrate calculations and analysis position unchanged during preview
- **Educational Value**: Users can visualize potential future positions from probability tree paths
- **Keyboard Navigation**: Arrow keys for tree traversal, Enter for preview, ESC to return
- **Summary Stats**:
  - Total branches analyzed: X
  - Coverage: Y% of likely continuations
  - Calculation time: Z ms
- **Cache Status**: Show if results are cached/fresh (as specified in feature plan)

#### 2.2.4 Progressive Display & Performance Indicators
**Two-Phase Progress Display**:
- **Phase A**: Show Maia trees immediately as they're generated (move probabilities visible)
- **Phase B**: Update trees with Stockfish evaluations as they complete (winrates appear)
- **Progressive Ranking**: Move list re-sorts as expected winrates are calculated

**Performance Indicators**:
- **Loading State**: Progress bar showing current phase and completion percentage
- **Calculation Time**: Display total computation time
- **Status Messages**: "Generating Maia trees..." → "Evaluating positions with Stockfish..."
- **Visual Cues**: Trees show "Evaluating..." until Stockfish winrates are available

### 2.3 Technical Requirements

#### 2.3.1 Architecture Compliance & Integration
**Follow Existing Controller Hook + Context + Presentational Components Pattern**:
- **Controller Hook**: `useExpectedWinrateController` integrating with existing engine infrastructure
- **Engine Integration**: Work within existing `useEngineAnalysis` coordination (useAnalysisController.ts:612-618)
- **State Management**: Integrate with existing `analysisState` reactive system (line 60, 615)
- **Context Provider**: `ExpectedWinrateContext` following existing context patterns
- **Presentational Components**: Pure UI components consuming context, matching existing responsive patterns

#### 2.3.2 Integration Points & Component Replacement Strategy
**Consistent Replacement Approach Across All Documents**:
- **Replace MoveMap Component**: Lines 177-186 in AnalysisSidebar.tsx with ExpectedWinrateControls
- **Replace MovesByRating Component**: Lines 327-333 in AnalysisSidebar.tsx with ExpectedWinrateResults
- **Maintain Responsive Layout**: Preserve existing xl:hidden and xl:flex patterns (lines 104-348)
- **Preserve Analysis State**: Integrate with analysis enabled/disabled overlay system (lines 159-212)
- **Reuse Container Styling**: Follow existing container patterns from MovesByRating.tsx (lines 42-48)
- **Integration Pattern**: Component-level replacement rather than div id replacement for cleaner architecture

#### 2.3.3 Critical Technical Details
**Stockfish Evaluation Perspective**: 
- Stockfish raw output is always from White's perspective
- Platform converts to current player's perspective (multiply by -1 when Black to move)
- Positive values always mean "good for current player"
- Implementation follows existing pattern in `src/providers/StockfishEngineContextProvider/engine.ts`

**Data Structures** (see FeaturePlan.txt section 3.3 for complete TypeScript definitions):
- Core data structures defined in `src/types/expectedWinrate.ts`
- `ExpectedWinRateNode`: Unified tree node structure for both algorithm and UI (includes position, move, probabilities, winrates, and optional UI state)
- `ExpectedWinRateResult`: Complete analysis result with confidence and timing
- `ExpectedWinrateAnalysis`: Integration type extending existing `AnalysisResult` patterns

#### 2.3.4 Engine Integration & Caching Requirements
- **Stockfish Integration**: Work within existing depth management system (useAnalysisController.ts:617)
- **Maia Integration**: Coordinate with existing `currentMaiaModel` state and model loading (lines 601-610)
- **Evaluation Coordination**: Use existing `inProgressAnalyses` Set to prevent conflicts
- **Caching Strategy**: Extend existing `generateAnalysisCacheKey` rather than creating parallel system
- **Auto-save Integration**: Work with existing backend sync and unsaved changes tracking (lines 92-189)

#### 2.3.5 Performance Requirements with Architecture Compliance  
- **Calculation**: No time limit, visible progress using existing progress patterns
- **Memory Management**: Efficient tree data structures, integrate with existing cleanup patterns
- **UI Responsiveness**: Non-blocking calculations, smooth interactions matching existing standards
- **Engine Performance**: Leverage existing Stockfish worker and evaluation queuing systems
- **Mobile Optimization**: Follow existing responsive patterns and mobile interaction standards

#### 2.3.6 Error Handling with Existing Patterns
- **Engine Failures**: Use existing error handling patterns from engine contexts, graceful degradation
- **Game Endings**: Integrate with existing Chess.ts gameOver() detection patterns
- **Repetitions**: Use existing position repetition detection, avoid infinite loops
- **Input Validation**: Follow existing parameter validation patterns from analysis components
- **UI Error States**: Match existing error display patterns from analysis sidebar

#### 2.3.7 Tree UI Integration Strategy - Critical Requirements
**UI Reuse Decision**: Implement **Approach 2: UI Pattern Reuse** for Expected Winrate tree visualization

**Reuse from Existing Game Tree Navigation (MovesContainer.tsx)**:
- **Visual Styling**: `VariationTree` and `InlineChain` CSS patterns and tree connectors (lines 487-572, 574-664)
- **Responsive Layouts**: Mobile horizontal scroll vs desktop tree view patterns (lines 215-327 vs 329-446) 
- **Interaction Patterns**: Click handlers, hover states, current node highlighting (lines 231-235, 271-275)
- **Accessibility**: Keyboard navigation patterns and ARIA support for tree traversal

**Purpose-Built New Architecture**:
- **ExpectedWinrateTree.tsx**: Main tree container component using existing visual patterns but optimized for probability trees
- **ExpectedWinrateBranch.tsx**: Individual tree branch component (equivalent to VariationTree from MovesContainer.tsx)
- **ExpectedWinrateSequence.tsx**: Linear sequence component (equivalent to InlineChain from MovesContainer.tsx)
- **ExpectedWinRateNode**: Unified data structure designed for both algorithm processing and UI display
- **Board Preview Logic**: Temporary position display without affecting main analysis state
- **Preview State Management**: Separate state for preview mode vs main analysis mode

**Integration Requirements**:
- **Analysis Toggle Integration**: Must work seamlessly with existing analysis enabled/disabled system (AnalysisSidebar.tsx:84-102)
- **Move Highlighting Coordination**: Integrate with existing move highlighting and arrow drawing systems  
- **Keyboard Navigation**: Preserve existing keyboard shortcuts for analysis navigation and move selection
- **Engine Status Display**: Show Stockfish/Maia engine readiness status consistent with existing patterns
- **Progress Indication**: Use existing progress display patterns for calculation status
- **Overlay System Consistency**: Follow existing disabled state overlay patterns (lines 159-212)

## 3. Non-Functional Requirements

### 3.1 Compatibility
- **Browsers**: Same support as existing platform
- **Mobile**: Responsive design for tablet/phone usage
- **Engines**: Compatible with existing Stockfish + Maia infrastructure

### 3.2 Accessibility
- **Screen Readers**: ARIA labels for tree navigation
- **Keyboard**: Full keyboard navigation support
- **Color Blind**: Color schemes with sufficient contrast ratios

### 3.3 Security
- **Input Validation**: Sanitize all user inputs
- **Resource Limits**: Prevent memory exhaustion on large trees
- **Engine Safety**: Proper error boundaries around engine calls

## 4. Algorithm Implementation Details

### 4.1 Player-Aware Tree Pruning Algorithm
```typescript
for (const path of probability_tree) {
  for (const move of path.move_sequence) {
    const position_after_move = makeMove(current_position, move)
    if (move.player === analyzing_player) {
      const move_winrate = stockfish.evaluateAsWinRate(position_after_move, depth=user_depth)
      if (move_winrate < winrate_threshold) {
        // Stop here and capture the damage from our blunder
        path.leaf_position = position_after_move     // After our bad move
        path.leaf_win_rate = move_winrate            // The bad win rate
        path.is_pruned = true
        path.pruning_reason = "analyzing_player_blunder"
        break
      }
    }
    // If opponent makes bad move, continue - we benefit from their mistakes
  }
}
```

### 4.2 Two-Phase Calculation Process
**Phase A: Generate Maia Tree (Show Progress)**
```typescript
// After filtering candidate moves with Stockfish
for (const candidate_move of candidate_moves) {
  const position_after_move = makeMove(current_position, candidate_move)
  const probability_tree = generateMaiaTree(position_after_move, threshold=user_threshold)
  
  // Display tree immediately so user sees progress
  displayTreeInUI(candidate_move, probability_tree)
}
```

**Phase B: Add Stockfish Evaluations to Tree**
```typescript
// Now evaluate all leaf positions with Stockfish
for (const tree of maia_trees) {
  for (const leaf_position of tree.leaf_positions) {
    const leaf_win_rate = stockfish.evaluateAsWinRate(leaf_position, depth=user_depth)
    updateTreeNodeWithWinrate(leaf_position, leaf_win_rate)
  }
  
  // Recalculate expected winrate as Stockfish data comes in
  updateExpectedWinrateDisplay(tree)
}
```

### 4.3 Expected Win Rate Calculation
```typescript
expected_win_rate = Σ(path_probability × leaf_win_rate) // for all valid/pruned paths
normalization_factor = Σ(all_path_probabilities)
normalized_expected_win_rate = expected_win_rate + (1 - normalization_factor) × base_position_win_rate
```

## 5. User Stories

### 4.1 Primary Use Cases

**As a chess player analyzing a position, I want to:**
- See which moves lead to the best expected outcomes in realistic play
- Understand the risk/reward tradeoffs of different candidate moves  
- Identify moves that look good but lead to practical problems
- Adjust analysis depth and parameters based on my needs

**As a chess student, I want to:**
- Learn which moves are practically best vs theoretically best
- Understand why some "obvious" moves might be suboptimal
- See the likely continuations after key moves
- Practice with analysis that matches human playing patterns

### 4.2 Edge Cases

**Position-Specific Scenarios:**
- Opening positions with many reasonable moves
- Sharp tactical positions with forced variations
- Endgame positions with precise evaluation requirements
- Drawn positions where small advantages matter

**Technical Edge Cases:**
- Very long calculations that might timeout
- Positions where Maia gives unexpected move probabilities
- Network issues affecting engine performance
- Browser memory constraints with large trees

## 5. Acceptance Criteria

### 5.1 Functional Acceptance
- [ ] All 4 user parameters work correctly and persist across sessions using existing localStorage patterns
- [ ] Move filtering uses winrate loss threshold correctly (e.g., 0.5 + (-0.1) = 0.4) with proper Stockfish perspective conversion
- [ ] **Phase A**: Maia trees generate and display immediately using existing engine coordination patterns
- [ ] **Phase B**: Stockfish evaluations added progressively to existing trees without evaluation conflicts
- [ ] Player-aware pruning: Capture analyzing player blunders, continue through opponent blunders as specified
- [ ] Expected winrate calculation with normalization: `normalized_expected_win_rate = expected_win_rate + (1 - normalization_factor) × base_position_win_rate`
- [ ] Results display shows moves ranked by expected winrate, integrated with existing responsive design
- [ ] Detail view shows interactive tree with SAN notation and winrate annotations
- [ ] **Tree Node Click Behavior**: Clicking tree nodes shows board preview of position after move sequence
- [ ] **Board Preview Mode**: Preview shows position without affecting main analysis, with clear return mechanism
- [ ] **Preview Visual Indicators**: Board overlay and highlighted tree node clearly indicate preview mode active
- [ ] Cache status display integrated with existing cache system and auto-save indicators
- [ ] Analysis enabled/disabled state integration with existing overlay patterns

### 5.2 UI/UX Acceptance with Architecture Integration
- [ ] Parameter controls follow existing responsive patterns and are intuitive to use
- [ ] Loading states provide clear progress feedback using existing progress indication patterns  
- [ ] Progress on tree generation and Stockfish analysis updates incrementally without UI blocking
- [ ] Results display matches existing component styling and responsive behavior
- [ ] Detail view tree navigation is smooth, logical, and follows existing interaction patterns
- [ ] Mobile layout works well using existing mobile optimization patterns
- [ ] Error messages follow existing error display patterns and are helpful/actionable
- [ ] Analysis enabled/disabled states work seamlessly with existing analysis toggle system

### 5.3 Technical Acceptance & Architecture Compliance  
- [ ] Integration cleanly replaces analysis components while preserving responsive layout structure
- [ ] Engine integration works within existing coordination patterns without conflicts
- [ ] Performance matches existing analysis components with acceptable calculation times
- [ ] Caching extends existing system and integrates with auto-save functionality
- [ ] Error handling leverages existing engine error patterns and covers edge cases
- [ ] Memory usage remains reasonable and follows existing cleanup patterns
- [ ] State management integrates with existing `analysisState` reactive system
- [ ] No regressions in existing analysis functionality or engine performance

### 5.4 Testing Methodologies & Quality Assurance
**How acceptance criteria will be validated**:

#### 5.4.1 Functional Testing Methods
- [ ] **Algorithm Testing**: Unit tests with known chess positions for accuracy validation
- [ ] **Integration Testing**: Mock engine responses to test controller coordination
- [ ] **Parameter Validation**: Automated tests for input validation and persistence
- [ ] **Progressive Display**: Manual testing of Phase A → Phase B calculation flow
- [ ] **Cache Testing**: Automated tests for cache hits/misses and invalidation

#### 5.4.2 UI/UX Testing Methods  
- [ ] **Responsive Testing**: Automated viewport testing across breakpoints
- [ ] **Component Testing**: Testing Library for component behavior and user interactions
- [ ] **Tree UI Pattern Validation**: Verify adapted patterns maintain existing UX quality from MovesContainer.tsx
- [ ] **Board Preview Testing**: 
  - Tree node click triggers correct board position preview
  - Visual indicators (board overlay, highlighted tree node) display correctly
  - Return mechanisms (ESC key, return button, click outside) function properly
  - Preview mode doesn't affect main analysis state
- [ ] **Interaction Parity Testing**: Ensure Expected Winrate tree interaction quality matches game tree navigation
- [ ] **Accessibility Testing**: Screen reader and keyboard navigation validation including preview mode
- [ ] **Mobile Testing**: Manual testing on actual tablet/phone devices including touch preview interactions
- [ ] **Analysis State Testing**: Toggle enabled/disabled state integration

#### 5.4.3 Technical Testing Methods
- [ ] **Performance Testing**: Memory leak detection and calculation timeout testing
- [ ] **Engine Coordination**: Integration tests with actual Stockfish/Maia contexts
- [ ] **Error Scenario Testing**: Simulation of engine failures and network issues
- [ ] **Regression Testing**: Automated tests ensuring existing functionality unchanged
- [ ] **Coverage Validation**: Code coverage >80% with focus on algorithm accuracy

## 6. Success Metrics

### 6.1 Quality Metrics
- **Calculation Accuracy**: Manual verification against known positions
- **UI Responsiveness**: No blocking operations during calculations
- **Error Rate**: < 1% of calculations result in errors
- **Cache Hit Rate**: > 70% of repeated calculations use cache

### 6.2 User Experience Metrics
- **Time to Understanding**: Users interpret results within 30 seconds
- **Feature Adoption**: > 80% of users try the new analysis
- **User Satisfaction**: Qualitative feedback on practical usefulness

### 6.3 Performance Metrics
- **Calculation Progress**: Visible progress updates every 2-5 seconds
- **Memory Usage**: No memory leaks during extended use
- **Browser Performance**: UI remains responsive during calculations

## 7. Dependencies and Assumptions

### 7.1 Technical Dependencies
- **Next.js 15.2.3**: Pages Router (not App Router) with existing configuration
- **React 18.3.1 + TypeScript 5.1.6**: Existing component architecture
- **Stockfish Engine**: WebAssembly via `lila-stockfish-web` with evaluation perspective conversion
- **Maia Engine**: ONNX Runtime Web with model files in `public/maia2/`
- **Chess Logic**: chess.ts 0.16.2 for move generation and validation
- **UI Framework**: Tailwind CSS 3.4.10 with custom theme system
- **Testing**: Jest with Testing Library (existing configuration)

### 7.2 Assumptions
- **User Behavior**: Users will primarily use default parameter settings
- **Calculation Time**: Users accept longer calculations for better accuracy
- **Engine Reliability**: Stockfish and Maia engines work consistently
- **Browser Support**: Target browsers support WebAssembly and WebWorkers

## 8. Future Considerations

### 8.1 Potential Enhancements
- **Analysis Comparison**: Side-by-side with traditional analysis
- **Historical Analysis**: Track winrate accuracy over time
- **Export Features**: Save/share analysis results
- **Advanced Parameters**: Fine-tune pruning and evaluation settings

### 8.2 Scaling Considerations
- **Performance Optimization**: WebWorkers for background calculations
- **Caching Strategy**: Persistent storage for frequently analyzed positions
- **Memory Management**: Garbage collection for large analysis trees