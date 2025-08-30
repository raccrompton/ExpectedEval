/**
 * Expected Winrate Analysis Types
 * 
 * Core type definitions for the Expected Winrate feature that integrates
 * with existing analysis infrastructure while providing specialized types
 * for probability tree calculations and expected value analysis.
 */

import { MaiaEvaluation, StockfishEvaluation } from './analysis'

// ============================================================================
// Core Expected Winrate Types
// ============================================================================

/**
 * Represents a single node in the Expected Winrate probability tree
 * Unified structure for both algorithm calculations and UI display
 */
export interface ExpectedWinRateNode {
  // Core identification
  id: string
  move: string // UCI notation (e.g., "e2e4")
  san: string // Standard algebraic notation (e.g., "e4")
  fen: string // Position after this move
  
  // Probability data
  probability: number // Maia probability of this move being played
  cumulativeProbability: number // Cumulative probability from root to this node
  
  // Evaluation data
  stockfishWinrate?: number // Stockfish evaluation as winrate
  expectedWinrate?: number // Calculated expected winrate (only for leaf nodes)
  
  // Tree structure
  parent: string | null // Parent node ID
  children: ExpectedWinRateNode[] // Child nodes
  depth: number // Depth from root (0 = candidate move, 1+ = response tree)
  
  // Calculation metadata
  isLeafNode: boolean // True if no further expansion
  isPruned: boolean // True if pruned due to low probability or poor play
  
  // Optional UI state (not used in calculations)
  isExpanded?: boolean // UI expansion state
  isHighlighted?: boolean // UI highlight state
}

/**
 * Parameters controlling Expected Winrate calculation
 */
export interface ExpectedWinRateParams {
  // Maia tree generation parameters
  probabilityThreshold: number // Minimum probability to include move (default: 0.05)
  maxDepth: number // Maximum tree depth to analyze (default: 3)
  maiaLevel: string // Maia model to use (e.g., "1600")
  
  // Stockfish evaluation parameters
  stockfishDepth: number // Stockfish analysis depth (default: 18)
  winrateLossThreshold: number // Maximum winrate loss to consider (default: -0.15)
  
  // Tree pruning parameters
  playerAwarePruning: boolean // Enable player-aware pruning (default: true)
  pruningThreshold: number // Probability below which to prune bad moves (default: 0.02)
}

/**
 * Result of Expected Winrate calculation for a single candidate move
 */
export interface ExpectedWinRateResult {
  move: string // UCI notation
  san: string // Standard algebraic notation
  expectedWinrate: number // Calculated expected winrate
  confidence: number // Confidence measure based on tree coverage
  tree: ExpectedWinRateNode // Root node of probability tree
  nodeCount: number // Total nodes in tree
  leafNodeCount: number // Number of evaluated leaf positions
  calculationTime: number // Time taken to calculate (ms)
}

// ============================================================================
// Integration Types (extending existing analysis patterns)
// ============================================================================

/**
 * Progress tracking for Expected Winrate calculation
 * Integrates with existing progress tracking patterns
 */
export interface ExpectedWinrateProgress {
  isCalculating: boolean
  currentPhase: 'filtering' | 'tree_generation' | 'evaluation' | 'calculation' | 'complete'
  phaseProgress: number // 0-1 for current phase
  overallProgress: number // 0-1 for entire calculation
  
  // Phase-specific details
  currentMove?: string // Move being processed
  movesProcessed: number
  totalMoves: number
  
  // Tree generation details
  nodesGenerated?: number
  nodesEvaluated?: number
  
  // Timing
  startTime?: number
  estimatedTimeRemaining?: number
  
  // Error tracking
  warnings: string[]
}

/**
 * Caching structure for Expected Winrate results
 * Extends existing analysis caching patterns
 */
export interface ExpectedWinrateCache {
  fen: string
  params: ExpectedWinRateParams
  results: ExpectedWinRateResult[]
  timestamp: number
  cacheKey: string // Generated cache key for backend storage
}

/**
 * Complete Expected Winrate analysis for a position
 * Integrates with existing AnalysisResult patterns
 */
export interface ExpectedWinrateAnalysis {
  fen: string
  params: ExpectedWinRateParams
  results: ExpectedWinRateResult[]
  progress: ExpectedWinrateProgress
  cache?: ExpectedWinrateCache
  
  // Integration with existing analysis
  requiresStockfish: boolean // Whether Stockfish evaluation is needed
  requiresMaia: boolean // Whether Maia evaluation is needed
  maiaModel: string // Current Maia model being used
  
  // Error handling
  error?: string
  warnings: string[]
}

// ============================================================================
// Engine Coordination Types (extending existing engine patterns)
// ============================================================================

/**
 * Batch request for Stockfish evaluations
 * Coordinates with existing StockfishEngine interface
 */
export interface StockfishBatchRequest {
  positions: Array<{
    fen: string
    id: string // Node ID for result mapping
    depth: number
  }>
  onProgress?: (completed: number, total: number) => void
  onResult?: (id: string, evaluation: StockfishEvaluation) => void
}

/**
 * Batch request for Maia evaluations
 * Coordinates with existing MaiaEngine interface
 */
export interface MaiaBatchRequest {
  positions: Array<{
    fen: string
    id: string // Node ID for result mapping
  }>
  maiaLevel: string
  onProgress?: (completed: number, total: number) => void
  onResult?: (id: string, evaluation: MaiaEvaluation) => void
}

/**
 * Tree generation request coordinating both engines
 */
export interface TreeGenerationRequest {
  rootFen: string
  params: ExpectedWinRateParams
  onProgress?: (progress: ExpectedWinrateProgress) => void
  onNodeGenerated?: (node: ExpectedWinRateNode) => void
  abortSignal?: AbortSignal
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Props for ExpectedWinrateControls component
 */
export interface ExpectedWinrateControlsProps {
  params: ExpectedWinRateParams
  onParamsChange: (params: ExpectedWinRateParams) => void
  isCalculating: boolean
  onStartCalculation: () => void
  onStopCalculation: () => void
  analysisEnabled: boolean
}

/**
 * Props for ExpectedWinrateResults component
 */
export interface ExpectedWinrateResultsProps {
  results?: ExpectedWinRateResult[]
  progress?: ExpectedWinrateProgress
  analysisEnabled: boolean
  onMoveSelect?: (move: string) => void
  colorSanMapping: { [move: string]: { san: string; color: string } }
}

/**
 * Props for ExpectedWinrateTree component
 */
export interface ExpectedWinrateTreeProps {
  tree?: ExpectedWinRateNode
  analysisEnabled: boolean
  onNodeClick?: (node: ExpectedWinRateNode) => void
  onBoardPreview?: (fen: string, path: string[]) => void
  highlightedNodeId?: string
}

/**
 * Board preview state management for tree interaction
 */
export interface BoardPreviewState {
  isPreviewActive: boolean
  previewPosition: string | null // FEN of preview position
  previewPath: string[] // Move sequence leading to preview
  highlightedNodeId: string | null
  analysisPosition: string // Original analysis position
}

// ============================================================================
// Default Values and Constants
// ============================================================================

/**
 * Default parameters for Expected Winrate calculation
 */
export const DEFAULT_EXPECTED_WINRATE_PARAMS: ExpectedWinRateParams = {
  probabilityThreshold: 0.05,
  maxDepth: 3,
  maiaLevel: '1600',
  stockfishDepth: 18,
  winrateLossThreshold: -0.15,
  playerAwarePruning: true,
  pruningThreshold: 0.02,
}

/**
 * Default progress state
 */
export const DEFAULT_EXPECTED_WINRATE_PROGRESS: ExpectedWinrateProgress = {
  isCalculating: false,
  currentPhase: 'filtering',
  phaseProgress: 0,
  overallProgress: 0,
  movesProcessed: 0,
  totalMoves: 0,
  warnings: [],
}