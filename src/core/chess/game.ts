/**
 * Chess Game Module - Thin Wrapper Around chessops
 *
 * This module provides functions for loading and exporting chess games
 * in PGN format. It's intentionally a thin wrapper around chessops -
 * we don't reinvent the wheel, just provide a clean interface.
 *
 * Key responsibilities:
 * - Load PGN text into a structured game object
 * - Export game objects back to PGN text
 * - Add variations to the game tree (for Expected Winrate results)
 *
 * chessops represents games as a TREE structure where each node can have
 * multiple children (variations). This is perfect for our Expected Winrate
 * feature where we want to show alternative lines.
 *
 * Dependencies:
 * - chessops/pgn: PGN parsing and serialization
 * - ./annotations: Our annotation parsing/serialization
 * - ./types: Type definitions
 */

import { parsePgn, makePgn, Node, ChildNode } from 'chessops/pgn'
import type { Game, PgnNodeData } from 'chessops/pgn'
import { serializeAnnotations } from './annotations'
import type { ParsedAnnotations, EWCandidate } from './types'

// ============================================================================
// GAME LOADING
// ============================================================================

/**
 * Load a chess game from PGN text.
 *
 * Takes a PGN string and parses it into a structured Game object.
 * If the PGN contains multiple games, only the first one is returned.
 *
 * The returned Game object contains:
 * - headers: Map of header key-value pairs (Event, Date, White, Black, etc.)
 * - moves: Tree of moves with variations
 *
 * @param pgn - PGN text to parse (can be a single game or multiple games)
 * @returns Parsed Game object, or null if parsing fails
 *
 * @example
 * const game = loadGame('1. e4 e5 2. Nf3 Nc6 *')
 * if (game) {
 *   console.log(game.headers.get('Result')) // '*'
 * }
 */
export function loadGame(pgn: string): Game<PgnNodeData> | null {
  // Parse the PGN text into an array of games
  // parsePgn returns an iterable, so we collect into an array
  const games: Game<PgnNodeData>[] = []

  // parsePgn returns an iterable of Game objects
  // We iterate through it to collect games
  for (const game of parsePgn(pgn)) {
    games.push(game)
  }

  // Return the first game, or null if none were parsed
  // This handles cases like empty string or invalid PGN
  if (games.length === 0) {
    return null
  }

  return games[0]
}

/**
 * Load all games from a PGN text containing multiple games.
 *
 * Some PGN files contain multiple games (tournament records, etc.).
 * This function returns all of them.
 *
 * @param pgn - PGN text potentially containing multiple games
 * @returns Array of parsed Game objects
 *
 * @example
 * const games = loadAllGames(multiGamePgn)
 * console.log(`Loaded ${games.length} games`)
 */
export function loadAllGames(pgn: string): Game<PgnNodeData>[] {
  const games: Game<PgnNodeData>[] = []

  for (const game of parsePgn(pgn)) {
    games.push(game)
  }

  return games
}

// ============================================================================
// GAME EXPORT
// ============================================================================

/**
 * Export a game to PGN text format.
 *
 * Takes a Game object and serializes it back to standard PGN format.
 * All headers, moves, variations, comments, and annotations are preserved.
 *
 * @param game - The Game object to export
 * @returns PGN text representation
 *
 * @example
 * const pgn = exportGame(game)
 * // Returns something like:
 * // [Event "?"]
 * // [Date "????.??.??"]
 * // 1. e4 e5 2. Nf3 Nc6 *
 */
export function exportGame(game: Game<PgnNodeData>): string {
  return makePgn(game)
}

// ============================================================================
// GAME CREATION
// ============================================================================

/**
 * Create a new empty game.
 *
 * Returns a Game object representing the standard starting position
 * with no moves played yet. Headers are set to sensible defaults.
 *
 * @returns A new Game object at the starting position
 *
 * @example
 * const game = createEmptyGame()
 * // Ready to add moves or load a position
 */
export function createEmptyGame(): Game<PgnNodeData> {
  // Create a game with default headers
  return {
    headers: new Map([
      ['Event', '?'],
      ['Site', '?'],
      ['Date', '????.??.??'],
      ['Round', '?'],
      ['White', '?'],
      ['Black', '?'],
      ['Result', '*'],
    ]),
    // Empty moves tree - just the root node with no children
    // This represents the starting position before any moves
    // Node() creates a proper root node with empty children array
    moves: new Node<PgnNodeData>(),
  }
}

// ============================================================================
// VARIATION HANDLING
// ============================================================================

/**
 * Add Expected Winrate results as variations to a game tree node.
 *
 * This is the key function for integrating our analysis with chessops.
 * When we calculate Expected Winrate for a position, we get multiple
 * candidate moves with their scores. This function adds those as
 * variations in the game tree.
 *
 * Each candidate becomes a new child node with:
 * - The move (in SAN notation)
 * - Annotations in the comment ([%prob][%eval][%ew])
 *
 * @param node - The parent node to add variations to
 * @param candidates - Array of EW candidate moves to add
 *
 * @example
 * // After calculating EW for a position
 * addEWVariations(currentNode, [
 *   { move: 'e2e4', san: 'e4', probability: 0.35, evaluation: 0.52, expectedWinrate: 0.54, exploredDepth: 4 },
 *   { move: 'd2d4', san: 'd4', probability: 0.28, evaluation: 0.51, expectedWinrate: 0.52, exploredDepth: 4 },
 * ])
 */
export function addEWVariations(
  node: ChildNode<PgnNodeData>,
  candidates: EWCandidate[]
): void {
  // Add each candidate as a new variation
  for (const candidate of candidates) {
    // Create annotations object from candidate data
    const annotations: ParsedAnnotations = {
      prob: candidate.probability,
      eval: candidate.evaluation,
      ew: candidate.expectedWinrate,
    }

    // Serialize annotations to PGN comment format
    const annotationComment = serializeAnnotations(annotations)

    // Create the new node data
    // PgnNodeData contains the move and optional metadata
    const nodeData: PgnNodeData = {
      san: candidate.san,
      // Store annotations in comments array
      // This is how chessops represents comments on moves
      comments: annotationComment ? [annotationComment] : undefined,
    }

    // Create the child node structure
    // ChildNode wraps PgnNodeData with tree structure (children array)
    // Use the ChildNode class constructor to create a proper instance
    const childNode = new ChildNode<PgnNodeData>(nodeData)

    // Add to parent's children array
    // This creates the variation in the game tree
    node.children.push(childNode)
  }
}

/**
 * Get the number of variations at a node.
 *
 * Useful for UI to show when there are alternative moves.
 * The mainline is the first child (index 0), variations are
 * any additional children (index 1+).
 *
 * @param node - The node to check
 * @returns Number of variations (0 = only mainline, 1+ = has alternatives)
 *
 * @example
 * if (getVariationCount(node) > 0) {
 *   showVariationIndicator()
 * }
 */
export function getVariationCount(node: ChildNode<PgnNodeData>): number {
  // If there's 0 or 1 child, there are no variations
  // Only 2+ children means we have mainline + variations
  return Math.max(0, node.children.length - 1)
}

/**
 * Get all children (mainline + variations) of a node.
 *
 * Returns an array where index 0 is the mainline continuation
 * and index 1+ are the variations.
 *
 * @param node - The node to get children from
 * @returns Array of child nodes
 */
export function getChildren(
  node: ChildNode<PgnNodeData>
): ChildNode<PgnNodeData>[] {
  return node.children
}

/**
 * Get the mainline continuation from a node.
 *
 * The mainline is always the first child (index 0).
 * Returns null if the node has no children (end of game).
 *
 * @param node - The node to get mainline from
 * @returns The mainline child node, or null if at end
 */
export function getMainline(
  node: ChildNode<PgnNodeData>
): ChildNode<PgnNodeData> | null {
  if (node.children.length === 0) {
    return null
  }
  return node.children[0]
}

/**
 * Get a specific variation by index.
 *
 * Index 0 = mainline
 * Index 1+ = variations in order added
 *
 * @param node - The parent node
 * @param index - Which child to get (0 = mainline)
 * @returns The child node, or null if index out of bounds
 */
export function getVariation(
  node: ChildNode<PgnNodeData>,
  index: number
): ChildNode<PgnNodeData> | null {
  if (index < 0 || index >= node.children.length) {
    return null
  }
  return node.children[index]
}

// ============================================================================
// GAME INFORMATION
// ============================================================================

/**
 * Get a header value from a game.
 *
 * Common headers: Event, Site, Date, Round, White, Black, Result, ECO, etc.
 *
 * @param game - The game to get header from
 * @param key - The header key (case-sensitive)
 * @returns The header value, or undefined if not present
 */
export function getHeader(
  game: Game<PgnNodeData>,
  key: string
): string | undefined {
  return game.headers.get(key)
}

/**
 * Set a header value on a game.
 *
 * @param game - The game to modify
 * @param key - The header key
 * @param value - The header value
 */
export function setHeader(
  game: Game<PgnNodeData>,
  key: string,
  value: string
): void {
  game.headers.set(key, value)
}

/**
 * Get the result of a game.
 *
 * @param game - The game to check
 * @returns '1-0', '0-1', '1/2-1/2', or '*' (ongoing/unknown)
 */
export function getResult(game: Game<PgnNodeData>): string {
  return game.headers.get('Result') || '*'
}

/**
 * Check if a game is complete (has a decisive result).
 *
 * @param game - The game to check
 * @returns true if the game has ended with a result
 */
export function isGameComplete(game: Game<PgnNodeData>): boolean {
  const result = getResult(game)
  return result === '1-0' || result === '0-1' || result === '1/2-1/2'
}
