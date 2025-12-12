/**
 * Chess Types - Re-exports from chessops + Our Extensions
 *
 * This file serves as a central hub for all chess-related types.
 * We re-export types from chessops so the rest of our codebase
 * doesn't need to know about the underlying library.
 *
 * Benefits of this approach:
 * 1. Single import point: `import { ... } from '@/core/chess/types'`
 * 2. If we ever switch libraries, we only change this file
 * 3. We can add our own types alongside chessops types
 *
 * Note: We can't re-export everything from chessops due to how
 * TypeScript handles module re-exports. We explicitly list what we need.
 */

// ============================================================================
// RE-EXPORTS FROM CHESSOPS
// ============================================================================

/**
 * PGN-related types from chessops/pgn module.
 *
 * - Game: Represents a complete chess game with headers and moves
 * - PgnNodeData: Data stored in each node of the game tree (move, comments, etc.)
 * - ChildNode: A node in the game tree that has a parent
 * - parsePgn: Function to parse PGN text into Game objects
 * - makePgn: Function to serialize Game objects back to PGN text
 */
export type {
  Game,
  PgnNodeData,
  ChildNode,
} from 'chessops/pgn'

/**
 * Core chess types from chessops.
 *
 * - Color: 'white' | 'black'
 * - Role: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'
 * - Square: Number 0-63 representing board squares
 * - Move: Represents a move (from, to, promotion)
 */
export type {
  Color,
  Role,
  Square,
  Move,
  Piece,
} from 'chessops'

// ============================================================================
// OUR CUSTOM TYPES
// ============================================================================

/**
 * Parsed annotations extracted from PGN comments.
 *
 * PGN comments can contain special annotations like:
 *   {[%prob 0.35][%eval 0.52][%ew 0.54]}
 *
 * This interface represents those parsed values.
 *
 * @property prob - Maia move probability (0.0-1.0)
 *                  How likely a human is to play this move
 * @property eval - Stockfish winrate evaluation (0.0-1.0)
 *                  Objective evaluation of position quality
 * @property ew   - Expected Winrate result (0.0-1.0)
 *                  Weighted average accounting for human play patterns
 * @property cp   - Stockfish centipawn evaluation
 *                  Traditional +/- score in hundredths of a pawn
 */
export interface ParsedAnnotations {
  prob?: number   // Maia probability
  eval?: number   // SF winrate
  ew?: number     // Expected Winrate
  cp?: number     // SF centipawns
}

/**
 * Navigation state for tracking position in a game tree.
 *
 * chessops provides a tree structure for games with variations,
 * but it's stateless - it doesn't track "where" you are in the game.
 *
 * This interface tracks the user's current position by storing
 * the path through the tree (which child to follow at each node).
 *
 * @property currentPath - Array of indices showing path through tree
 *                         e.g., [0, 0, 1] means: first child, first child, second child
 */
export interface NavigationPath {
  /**
   * Path through the game tree as an array of child indices.
   *
   * Example for a game with variations:
   *   1. e4 e5 2. Nf3 (2. Bc4 Nc6) 2... Nc6
   *
   *   Path [] = starting position
   *   Path [0] = after 1. e4
   *   Path [0, 0] = after 1... e5
   *   Path [0, 0, 0] = after 2. Nf3 (mainline)
   *   Path [0, 0, 1] = after 2. Bc4 (variation)
   */
  currentPath: number[]
}

/**
 * Result of Expected Winrate calculation for a single candidate move.
 *
 * When we calculate Expected Winrate for a position, we get back
 * multiple candidate moves, each with their own EW score and
 * the tree of human-likely responses explored.
 */
export interface EWCandidate {
  /** The move in UCI notation (e.g., "e2e4") */
  move: string

  /** The move in SAN notation (e.g., "e4") for display */
  san: string

  /** Maia probability of playing this move (0.0-1.0) */
  probability: number

  /** Stockfish evaluation of resulting position (0.0-1.0 winrate) */
  evaluation: number

  /** Calculated Expected Winrate (0.0-1.0) */
  expectedWinrate: number

  /**
   * The explored tree of likely responses.
   * This is added as a variation to the chessops game tree.
   */
  exploredDepth: number
}

/**
 * Configuration options for Expected Winrate calculation.
 *
 * These parameters control how deep and wide we explore
 * the tree of likely human moves.
 */
export interface EWConfig {
  /** Maximum depth to explore (in half-moves/ply) */
  maxDepth: number

  /**
   * Minimum probability for a move to be explored.
   * Moves with lower probability are pruned to save computation.
   */
  probabilityThreshold: number

  /**
   * Maximum winrate loss for a move to be considered.
   * Moves that lose more than this are filtered out as "bad".
   */
  winrateLossThreshold: number

  /** Maia ELO level for predictions (1100-1900) */
  maiaLevel: number

  /** Stockfish search depth for evaluations */
  stockfishDepth: number
}

/**
 * Default configuration for Expected Winrate calculation.
 *
 * These values balance computation time vs accuracy.
 */
export const DEFAULT_EW_CONFIG: EWConfig = {
  maxDepth: 4,                    // 4 half-moves deep
  probabilityThreshold: 0.05,    // Explore moves with >5% probability
  winrateLossThreshold: 0.05,    // Consider moves within 5% of best
  maiaLevel: 1500,               // Middle-of-the-road human level
  stockfishDepth: 14,            // Reasonable depth for accuracy
}
