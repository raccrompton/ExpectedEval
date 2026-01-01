/**
 * Game Tree Navigation Module
 *
 * This module handles navigation through a chess game tree.
 * chessops provides a tree structure for games (with variations),
 * but it's stateless - it doesn't track "where" you are.
 *
 * This module provides:
 * - A NavigationState that tracks the current position
 * - Functions to navigate forward/back through moves
 * - FEN computation for any position in the tree
 *
 * Key concept: The "path" is an array of indices that describes
 * which child to follow at each level of the tree.
 *
 * Example tree:
 *   Root → e4 → e5 → Nf3
 *              → c5 → Nf3 → Nc6
 *
 * Paths:
 *   [] = Root (starting position)
 *   [0] = after e4
 *   [0, 0] = after e4 e5
 *   [0, 0, 0] = after e4 e5 Nf3
 *   [0, 1] = after e4 c5 (variation)
 *   [0, 1, 0] = after e4 c5 Nf3
 *   [0, 1, 0, 0] = after e4 c5 Nf3 Nc6
 *
 * Dependencies:
 * - chessops: Chess position and FEN handling
 * - chessops/pgn: PGN types
 */

import { Chess } from 'chessops/chess'
import { makeFen, parseFen } from 'chessops/fen'
import { parseSan } from 'chessops/san'
import { isChildNode, type Game, type PgnNodeData, type Node } from 'chessops/pgn'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Navigation state for a chess game.
 *
 * This tracks where we are in the game tree so we can:
 * - Show the correct board position
 * - Navigate forward/back
 * - Know which variations are available
 */
export interface NavigationState {
  /**
   * The chessops game tree.
   * This contains the full game with all variations.
   */
  game: Game<PgnNodeData>

  /**
   * Path through the tree to the current position.
   *
   * Each number is an index into the children array at that level.
   * - Empty array [] = starting position (before any moves)
   * - [0] = first move played (usually White's first move)
   * - [0, 0] = second move (first Black move in mainline)
   * - [0, 1] = second move but a variation (not mainline)
   */
  currentPath: number[]
}

// ============================================================================
// STARTING POSITION
// ============================================================================

/**
 * Standard chess starting position FEN.
 * This is the position before any moves are played.
 */
export const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// ============================================================================
// STATE CREATION
// ============================================================================

/**
 * Create a navigation state for a game.
 *
 * @param game - The chessops game tree
 * @param startPath - Optional starting path (defaults to root)
 * @returns Navigation state at the specified position
 *
 * @example
 * const game = loadGame(pgn)
 * const nav = createNavigationState(game)
 * // nav.currentPath is [] (at start)
 */
export function createNavigationState(
  game: Game<PgnNodeData>,
  startPath: number[] = []
): NavigationState {
  return {
    game,
    currentPath: [...startPath], // Copy to avoid mutation
  }
}

// ============================================================================
// NODE ACCESS
// ============================================================================

/**
 * Get the node at a specific path in the game tree.
 *
 * Returns null if the path is invalid (points to non-existent node).
 *
 * @param game - The game tree
 * @param path - Path to the node
 * @returns The node at that path, or null if invalid
 */
export function getNodeAtPath(
  game: Game<PgnNodeData>,
  path: number[]
): Node<PgnNodeData> | null {
  // Start at the root - game.moves is a Node (no data), not ChildNode
  // We use Node<PgnNodeData> for the root since it doesn't have data
  let node: Node<PgnNodeData> = game.moves

  // Follow the path through the tree
  // Each step gives us a ChildNode (which has data and children)
  for (const index of path) {
    // Check if this child exists
    if (index < 0 || index >= node.children.length) {
      return null
    }
    node = node.children[index]
  }

  // Return the node at this path
  // If path was empty, this is the root (Node)
  // If path was non-empty, this is a ChildNode (has data)
  return node
}

/**
 * Get the current node based on navigation state.
 *
 * Returns the node at the current position in the game tree.
 * At the starting position (empty path), returns the root Node.
 * After moves have been played, returns a ChildNode.
 *
 * @param state - Current navigation state
 * @returns The node at current position, or null if path is invalid
 */
export function getCurrentNode(
  state: NavigationState
): Node<PgnNodeData> | null {
  return getNodeAtPath(state.game, state.currentPath)
}

/**
 * Get the data (move, comments, etc.) at the current position.
 *
 * Note: The root node has no data (it represents the starting position).
 * If at the starting position, returns null.
 *
 * @param state - Current navigation state
 * @returns The node data, or null if at root or invalid path
 */
export function getCurrentNodeData(
  state: NavigationState
): PgnNodeData | null {
  const node = getCurrentNode(state)
  if (!node) return null

  // The root node (when path is []) doesn't have meaningful data
  // Only ChildNodes (after moves) have data
  // Use isChildNode type guard to check
  if (!isChildNode(node)) return null

  return node.data
}

// ============================================================================
// FEN COMPUTATION
// ============================================================================

/**
 * Compute the FEN string at the current position.
 *
 * This replays all moves from the starting position to the current
 * path position, building up the board state.
 *
 * @param state - Current navigation state
 * @returns FEN string for the current position
 */
export function getCurrentFen(state: NavigationState): string {
  // If at root (empty path), return starting position
  if (state.currentPath.length === 0) {
    return STARTING_FEN
  }

  // Get the starting position from the game headers, or use default
  const setupFen = state.game.headers.get('FEN') || STARTING_FEN

  // Parse the starting position
  const setupResult = parseFen(setupFen)
  if (!setupResult.isOk) {
    // If the FEN is invalid, fall back to standard start
    return STARTING_FEN
  }

  // Create a chess position from the setup
  const chess = Chess.fromSetup(setupResult.value)
  if (!chess.isOk) {
    return STARTING_FEN
  }

  // Create mutable position
  const position = chess.value

  // Replay moves along the current path
  // Start at root (Node), then traverse ChildNodes
  let node: Node<PgnNodeData> = state.game.moves

  for (const index of state.currentPath) {
    // Get the child at this index
    if (index < 0 || index >= node.children.length) {
      // Invalid path - return what we have so far
      break
    }

    const child = node.children[index]

    // Parse and apply the move
    // child.data exists because children are ChildNodes
    if (child.data.san) {
      const move = parseSan(position, child.data.san)
      if (move) {
        position.play(move)
      }
    }

    node = child
  }

  // Return the FEN of the final position
  return makeFen(position.toSetup())
}

/**
 * Get the FEN at a specific path (not using state).
 *
 * Useful when you need to compute FEN for a path different
 * from the current navigation position.
 *
 * @param game - The game tree
 * @param path - Path to compute FEN for
 * @returns FEN string for that position
 */
export function getFenAtPath(
  game: Game<PgnNodeData>,
  path: number[]
): string {
  // Create temporary navigation state
  const tempState = createNavigationState(game, path)
  return getCurrentFen(tempState)
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

/**
 * Go to the starting position (before any moves).
 *
 * @param state - Current navigation state
 * @returns New state at the starting position
 */
export function goToStart(state: NavigationState): NavigationState {
  return {
    ...state,
    currentPath: [],
  }
}

/**
 * Go to the end of the mainline.
 *
 * Follows the first child (index 0) at each level until
 * reaching a node with no children.
 *
 * @param state - Current navigation state
 * @returns New state at the end of the mainline
 */
export function goToEnd(state: NavigationState): NavigationState {
  const path: number[] = []
  // Start at root (Node), traverse ChildNodes
  let node: Node<PgnNodeData> = state.game.moves

  // Keep following first child until we run out
  while (node.children.length > 0) {
    path.push(0)
    node = node.children[0]
  }

  return {
    ...state,
    currentPath: path,
  }
}

/**
 * Go forward one move (follow mainline by default).
 *
 * If already at the end, returns the same state unchanged.
 *
 * @param state - Current navigation state
 * @param variationIndex - Which child to follow (0 = mainline, 1+ = variations)
 * @returns New state one move forward
 */
export function goForward(
  state: NavigationState,
  variationIndex: number = 0
): NavigationState {
  const currentNode = getCurrentNode(state)

  // Can't go forward if we don't have a valid current node
  if (!currentNode) {
    return state
  }

  // Check if there's a child at the requested index
  if (variationIndex < 0 || variationIndex >= currentNode.children.length) {
    return state
  }

  // Add the child index to the path
  return {
    ...state,
    currentPath: [...state.currentPath, variationIndex],
  }
}

/**
 * Go back one move.
 *
 * If already at the start, returns the same state unchanged.
 *
 * @param state - Current navigation state
 * @returns New state one move back
 */
export function goBack(state: NavigationState): NavigationState {
  // Can't go back if at start
  if (state.currentPath.length === 0) {
    return state
  }

  // Remove the last element from the path
  return {
    ...state,
    currentPath: state.currentPath.slice(0, -1),
  }
}

/**
 * Go to a specific path in the game tree.
 *
 * Validates the path before navigating. If invalid, returns
 * unchanged state.
 *
 * @param state - Current navigation state
 * @param path - Target path
 * @returns New state at the target path
 */
export function goToPath(
  state: NavigationState,
  path: number[]
): NavigationState {
  // Validate the path exists
  const targetNode = getNodeAtPath(state.game, path)
  if (!targetNode && path.length > 0) {
    // Invalid path - don't navigate
    return state
  }

  return {
    ...state,
    currentPath: [...path],
  }
}

/**
 * Go to a specific move number (half-move / ply).
 *
 * This follows the mainline (index 0 at each level).
 * Move 0 = starting position, Move 1 = after White's first move, etc.
 *
 * @param state - Current navigation state
 * @param ply - Target ply number (0 = start)
 * @returns New state at the target ply
 */
export function goToPly(state: NavigationState, ply: number): NavigationState {
  if (ply < 0) {
    return goToStart(state)
  }

  // Build path by following mainline
  // Start at root (Node), traverse ChildNodes
  const path: number[] = []
  let node: Node<PgnNodeData> = state.game.moves

  for (let i = 0; i < ply && node.children.length > 0; i++) {
    path.push(0)
    node = node.children[0]
  }

  return {
    ...state,
    currentPath: path,
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Check if we're at the starting position.
 *
 * @param state - Current navigation state
 * @returns true if at starting position (no moves played)
 */
export function isAtStart(state: NavigationState): boolean {
  return state.currentPath.length === 0
}

/**
 * Check if we're at the end of the current line.
 *
 * @param state - Current navigation state
 * @returns true if current node has no children
 */
export function isAtEnd(state: NavigationState): boolean {
  const node = getCurrentNode(state)
  return node ? node.children.length === 0 : true
}

/**
 * Get the current ply (half-move) number.
 *
 * Ply 0 = starting position
 * Ply 1 = after White's first move
 * Ply 2 = after Black's first move
 * etc.
 *
 * @param state - Current navigation state
 * @returns Current ply number
 */
export function getCurrentPly(state: NavigationState): number {
  return state.currentPath.length
}

/**
 * Get the total ply count for the mainline.
 *
 * @param state - Current navigation state
 * @returns Total moves in the mainline
 */
export function getTotalMainlinePlies(state: NavigationState): number {
  let count = 0
  // Start at root (Node), traverse ChildNodes
  let node: Node<PgnNodeData> = state.game.moves

  while (node.children.length > 0) {
    count++
    node = node.children[0]
  }

  return count
}

/**
 * Check if variations exist at the current position.
 *
 * @param state - Current navigation state
 * @returns true if there are alternative moves
 */
export function hasVariations(state: NavigationState): boolean {
  const node = getCurrentNode(state)
  return node ? node.children.length > 1 : false
}

/**
 * Get available moves at the current position.
 *
 * Returns an array of move objects, each with the SAN notation
 * and whether it's the mainline continuation.
 *
 * @param state - Current navigation state
 * @returns Array of available moves
 */
export function getAvailableMoves(
  state: NavigationState
): Array<{ san: string; index: number; isMainline: boolean }> {
  const node = getCurrentNode(state)
  if (!node) return []

  return node.children.map((child, index) => ({
    san: child.data.san || '?',
    index,
    isMainline: index === 0,
  }))
}

// ============================================================================
// POSITION EXTRACTION
// ============================================================================

/**
 * Position data for Win Finder analysis.
 */
export interface GamePosition {
  fen: string
  ply: number
  path: number[]
}

/**
 * Extract all positions from a game tree (mainline only).
 *
 * This is useful for Win Finder analysis which needs to analyze
 * each position in the game.
 *
 * @param game - The game tree
 * @returns Array of positions with FEN and ply
 */
export function extractPositionsFromGame(
  game: Game<PgnNodeData>
): GamePosition[] {
  const positions: GamePosition[] = []

  // Add starting position
  const startFen = game.headers.get('FEN') || STARTING_FEN
  positions.push({ fen: startFen, ply: 0, path: [] })

  // Parse starting position for replay
  const setupResult = parseFen(startFen)
  if (!setupResult.isOk) {
    return positions
  }

  const chess = Chess.fromSetup(setupResult.value)
  if (!chess.isOk) {
    return positions
  }

  const position = chess.value
  let node: Node<PgnNodeData> = game.moves
  let ply = 0
  const path: number[] = []

  // Traverse mainline (index 0 at each level)
  while (node.children.length > 0) {
    const child = node.children[0]
    ply++
    path.push(0)

    // Apply move to position
    if (child.data.san) {
      const move = parseSan(position, child.data.san)
      if (move) {
        position.play(move)
        positions.push({
          fen: makeFen(position.toSetup()),
          ply,
          path: [...path],
        })
      }
    }

    node = child
  }

  return positions
}
