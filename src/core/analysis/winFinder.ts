/**
 * Win Finder Algorithm
 *
 * Identifies "hidden edge" positions where Stockfish sees roughly equal moves
 * but Maia reveals one move yields significantly better outcomes for humans.
 *
 * The disagreement score measures: Maia's preference strength / SF's indifference
 * High scores indicate moves where humans have a practical advantage that
 * engines don't recognize.
 *
 * Algorithm:
 * 1. Get SF evaluations for all legal moves
 * 2. Get Maia values for resulting positions (with perspective flip)
 * 3. Calculate SF spread (how much SF distinguishes between moves)
 * 4. Calculate Maia advantage (how much Maia prefers one move)
 * 5. Disagreement = Maia advantage / SF spread
 *
 * Dependencies:
 * - StockfishAdapter for position evaluation
 * - MaiaAdapter for human-like predictions
 * - chessops for move generation and application
 */

import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSquare } from 'chessops/util'
import { SquareSet } from 'chessops/squareSet'
import type { StockfishAdapter, MaiaAdapter } from '../engine/types'
import { applyMove, uciToSan } from './treeBuilder'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Ranking data for a single move from both engines' perspectives.
 */
export interface MoveRanking {
  /** Move in SAN notation (e.g., "e4") */
  move: string
  /** Move in UCI notation (e.g., "e2e4") */
  uci: string
  /** SF winrate for this move (0-1, from side-to-move perspective) */
  sfWinrate: number
  /** Rank in SF's ordering (1 = best) */
  sfRank: number
  /** Maia's perceived winrate after move (0-1, player's POV after flip) */
  maiaWinrate: number
  /** Rank in Maia's ordering (1 = best) */
  maiaRank: number
}

/**
 * Result of analyzing a single position for disagreement.
 */
export interface PositionDisagreement {
  /** FEN of the analyzed position */
  fen: string
  /** Ply number in the game (0 = starting position) */
  ply: number
  /** Path in the game tree for navigation (if provided) */
  path?: number[]
  /** Move that was played (if any) */
  playedMove?: string
  /** Disagreement score (higher = more disagreement) */
  disagreementScore: number
  /** SF's top ranked move */
  sfTopMove: MoveRanking
  /** Maia's top ranked move */
  maiaTopMove: MoveRanking
  /** All legal moves with rankings from both engines */
  allMoves: MoveRanking[]
  /** Human-readable explanation of the disagreement */
  description: string
}

/**
 * Complete result of Win Finder analysis on a game.
 */
export interface WinFinderResult {
  /** Positions sorted by disagreement score (highest first) */
  positions: PositionDisagreement[]
  /** Total number of positions analyzed */
  analyzedPositions: number
  /** Time taken for calculation in milliseconds */
  calculationTimeMs: number
}

/**
 * Configuration for Win Finder analysis.
 */
export interface WinFinderConfig {
  /** How many SF moves to consider for spread calculation (default: 5) */
  sfTopN: number
  /** SF search depth (default: 12) */
  sfDepth: number
  /** Maia ELO level (default: 1500) */
  maiaLevel: number
  /** Minimum disagreement score to include in results (default: 3) */
  minDisagreement: number
  /** Maximum positions to return (default: 20) */
  maxResults: number
  /** Skip first N half-moves (default: 20 = first 10 moves per side) */
  skipFirstPly: number
}

/**
 * Input position for game analysis.
 */
export interface PositionInput {
  fen: string
  ply: number
  path?: number[]
  playedMove?: string
}

/**
 * Progress callback type for long-running analysis.
 */
export type WinFinderProgressCallback = (current: number, total: number) => void

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_WIN_FINDER_CONFIG: WinFinderConfig = {
  sfTopN: 5,
  sfDepth: 8,  // Reduced from 12 for faster analysis
  maiaLevel: 1500,
  minDisagreement: 3,
  maxResults: 20,
  skipFirstPly: 20,  // Skip first 10 moves per side (opening theory)
}

// ============================================================================
// CORE ALGORITHM
// ============================================================================

/**
 * Calculate disagreement score from SF spread and Maia advantage.
 *
 * High score = SF sees equality, Maia sees clear winner
 * Low score = SF already distinguishes OR Maia also sees equality
 *
 * @param sfSpread - Difference between SF's best and Nth move winrate
 * @param maiaAdvantage - Difference between Maia's top and 2nd move value
 * @param epsilon - Small value to prevent division by zero (default 0.01)
 * @returns Disagreement score
 */
export function calculateDisagreementScore(
  sfSpread: number,
  maiaAdvantage: number,
  epsilon: number = 0.01
): number {
  return maiaAdvantage / (sfSpread + epsilon)
}

/**
 * Analyze a single position for SF/Maia disagreement.
 *
 * @param fen - Position to analyze
 * @param ply - Ply number in the game
 * @param stockfish - Stockfish adapter
 * @param maia - Maia adapter
 * @param config - Configuration options
 * @returns Position disagreement result
 */
/**
 * Sentinel error used to short-circuit position analysis when the caller
 * cancels mid-flight. Distinguishable from genuine analysis failures so
 * the outer loop can break instead of treating it as a per-position
 * error.
 */
export class WinFinderCancelledError extends Error {
  constructor() {
    super('WinFinder analysis cancelled')
    this.name = 'WinFinderCancelledError'
  }
}

export async function analyzePositionForDisagreement(
  fen: string,
  ply: number,
  stockfish: StockfishAdapter,
  maia: MaiaAdapter,
  config: WinFinderConfig,
  isCancelled?: () => boolean,
): Promise<PositionDisagreement> {
  const checkCancel = () => {
    if (isCancelled?.()) throw new WinFinderCancelledError()
  }

  // Parse the position
  const setup = parseFen(fen)
  if (setup.isErr) {
    throw new Error(`Invalid FEN: ${fen}`)
  }

  const pos = Chess.fromSetup(setup.value)
  if (pos.isErr) {
    throw new Error(`Invalid position: ${fen}`)
  }

  const chess = pos.value

  checkCancel()

  // Get SF evaluation with all move winrates
  const sfEval = await stockfish.evaluate(fen, {
    depth: config.sfDepth,
    multiPv: 64,  // Get evaluations for many moves
  })

  checkCancel()

  // Build move rankings
  const moveRankings: MoveRanking[] = []

  // Collect all moves first to count them
  const allMoves: { uci: string; san: string }[] = []
  const ctx = chess.ctx()
  for (const [from, dests] of chess.allDests(ctx)) {
    const piece = chess.board.get(from)
    const isPawn = piece?.role === 'pawn'
    const backrank = chess.turn === 'white'
      ? SquareSet.fromRank(7)
      : SquareSet.fromRank(0)

    for (const to of dests) {
      const fromStr = makeSquare(from)
      const toStr = makeSquare(to)
      const isPromotion = isPawn && backrank.has(to)
      const movesToProcess = isPromotion
        ? [`${fromStr}${toStr}q`, `${fromStr}${toStr}r`, `${fromStr}${toStr}b`, `${fromStr}${toStr}n`]
        : [`${fromStr}${toStr}`]

      for (const uci of movesToProcess) {
        const san = uciToSan(fen, uci) || uci
        allMoves.push({ uci, san })
      }
    }
  }

  // Evaluate each move with Maia. Check cancellation between calls so a
  // reset doesn't wait for every legal move to finish.
  for (const { uci, san } of allMoves) {
    checkCancel()
    const sfWinrate = sfEval.moveWinrates?.[uci] ?? sfEval.winrate
    const resultingFen = applyMove(fen, uci)
    if (!resultingFen) continue

    const maiaResult = await maia.predict(resultingFen, { eloLevel: config.maiaLevel })

    // Flip perspective: Maia returns value from side-to-move's perspective
    // After our move, it's opponent's turn, so we flip
    const playerMaiaWinrate = 1 - maiaResult.value

    moveRankings.push({
      move: san,
      uci,
      sfWinrate,
      sfRank: 0,
      maiaWinrate: playerMaiaWinrate,
      maiaRank: 0,
    })
  }

  // Create a Map for O(1) lookups when assigning ranks
  const rankingMap = new Map(moveRankings.map(r => [r.uci, r]))

  // Sort by SF winrate (descending) and assign ranks
  const sfSorted = [...moveRankings].sort((a, b) => b.sfWinrate - a.sfWinrate)
  sfSorted.forEach((m, i) => {
    const original = rankingMap.get(m.uci)
    if (original) original.sfRank = i + 1
  })

  // Sort by Maia winrate (descending) and assign ranks
  const maiaSorted = [...moveRankings].sort((a, b) => b.maiaWinrate - a.maiaWinrate)
  maiaSorted.forEach((m, i) => {
    const original = rankingMap.get(m.uci)
    if (original) original.maiaRank = i + 1
  })

  // Calculate SF spread (top move vs Nth move)
  const sfTopWinrate = sfSorted[0]?.sfWinrate ?? 0
  const sfNthWinrate = sfSorted[Math.min(config.sfTopN - 1, sfSorted.length - 1)]?.sfWinrate ?? 0
  const sfSpread = sfTopWinrate - sfNthWinrate

  // Calculate Maia advantage (top vs 2nd)
  const maiaTopWinrate = maiaSorted[0]?.maiaWinrate ?? 0
  const maiaSecondWinrate = maiaSorted[1]?.maiaWinrate ?? maiaTopWinrate
  const maiaAdvantage = maiaTopWinrate - maiaSecondWinrate

  // Calculate disagreement score
  const disagreementScore = calculateDisagreementScore(sfSpread, maiaAdvantage)

  // Handle positions with no legal moves (checkmate/stalemate)
  if (moveRankings.length === 0) {
    return {
      fen,
      ply,
      disagreementScore: 0,
      sfTopMove: { move: '-', uci: '-', sfWinrate: 0, sfRank: 0, maiaWinrate: 0, maiaRank: 0 },
      maiaTopMove: { move: '-', uci: '-', sfWinrate: 0, sfRank: 0, maiaWinrate: 0, maiaRank: 0 },
      allMoves: [],
      description: 'Position has no legal moves',
    }
  }

  // Find top moves
  const sfTopMove = moveRankings.find(m => m.sfRank === 1)!
  const maiaTopMove = moveRankings.find(m => m.maiaRank === 1)!

  // Generate description
  const description = generateDescription(
    sfTopMove,
    maiaTopMove,
    sfSpread,
    maiaAdvantage,
    disagreementScore
  )

  return {
    fen,
    ply,
    disagreementScore,
    sfTopMove,
    maiaTopMove,
    allMoves: moveRankings,
    description,
  }
}

/**
 * Generate human-readable description of the disagreement.
 */
function generateDescription(
  sfTopMove: MoveRanking,
  maiaTopMove: MoveRanking,
  sfSpread: number,
  maiaAdvantage: number,
  disagreementScore: number
): string {
  const sfSpreadPct = (sfSpread * 100).toFixed(1)
  const maiaAdvPct = (maiaAdvantage * 100).toFixed(1)

  if (sfTopMove.uci === maiaTopMove.uci) {
    return `Both engines agree: ${sfTopMove.move} is best`
  }

  if (disagreementScore > 5) {
    return `Strong hidden edge: ${maiaTopMove.move} gives humans ${maiaAdvPct}% advantage, ` +
      `but SF sees only ${sfSpreadPct}% spread (score: ${disagreementScore.toFixed(1)})`
  }

  if (disagreementScore > 3) {
    return `Hidden edge: ${maiaTopMove.move} preferred by humans (${maiaAdvPct}% advantage), ` +
      `SF indifferent (${sfSpreadPct}% spread)`
  }

  return `Slight disagreement: Maia prefers ${maiaTopMove.move}, SF prefers ${sfTopMove.move}`
}

/**
 * Analyze multiple positions for disagreements.
 *
 * @param positions - Array of positions to analyze
 * @param config - Configuration options
 * @param stockfish - Stockfish adapter
 * @param maia - Maia adapter
 * @param onProgress - Optional progress callback
 * @returns Win Finder result with sorted positions
 */
export async function analyzeGameForDisagreements(
  positions: PositionInput[],
  config: WinFinderConfig,
  stockfish: StockfishAdapter,
  maia: MaiaAdapter,
  onProgress?: WinFinderProgressCallback,
  /**
   * Optional cancellation predicate. Polled between positions; returning
   * true short-circuits further analysis. Without this, the analysis
   * keeps issuing SF/Maia calls after the user resets the panel.
   */
  isCancelled?: () => boolean,
): Promise<WinFinderResult> {
  const startTime = performance.now()

  // Filter out early positions (opening theory)
  const positionsToAnalyze = positions.filter(p => p.ply >= config.skipFirstPly)

  if (positionsToAnalyze.length === 0) {
    return {
      positions: [],
      analyzedPositions: 0,
      calculationTimeMs: 0,
    }
  }

  const results: PositionDisagreement[] = []

  for (let i = 0; i < positionsToAnalyze.length; i++) {
    if (isCancelled?.()) break
    const pos = positionsToAnalyze[i]
    onProgress?.(i + 1, positionsToAnalyze.length)

    try {
      const disagreement = await analyzePositionForDisagreement(
        pos.fen,
        pos.ply,
        stockfish,
        maia,
        config,
        isCancelled,
      )

      if (pos.playedMove) {
        disagreement.playedMove = pos.playedMove
      }
      if (pos.path) {
        disagreement.path = pos.path
      }

      results.push(disagreement)
    } catch (error) {
      // Caller-driven cancellation: stop entirely, no retry.
      if (error instanceof WinFinderCancelledError) {
        break
      }
      // Engine "cancelled by new request" comes through as a plain Error
      // from concurrent SF access. Distinguish from user cancellation
      // by re-checking the predicate before retrying.
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('cancelled')) {
        if (isCancelled?.()) break
        console.warn(`[WinFinder] Position ${i} cancelled, retrying...`)
        // Retry once after a brief delay
        await yieldToUI()
        if (isCancelled?.()) break
        try {
          const disagreement = await analyzePositionForDisagreement(
            pos.fen,
            pos.ply,
            stockfish,
            maia,
            config,
            isCancelled,
          )
          if (pos.playedMove) disagreement.playedMove = pos.playedMove
          if (pos.path) disagreement.path = pos.path
          results.push(disagreement)
        } catch (retryError) {
          if (retryError instanceof WinFinderCancelledError) break
          console.error(`[WinFinder] Retry failed for position ${i}:`, retryError)
        }
      } else {
        console.error(`[WinFinder] Error analyzing position ${i}:`, error)
      }
      // Continue with other positions
    }

    // Yield to UI periodically
    if (i % 3 === 0) {
      await yieldToUI()
    }
  }

  // Filter by minimum disagreement
  const filtered = results.filter(r => r.disagreementScore >= config.minDisagreement)

  // Sort by disagreement descending
  filtered.sort((a, b) => b.disagreementScore - a.disagreementScore)

  // Limit results
  const limited = filtered.slice(0, config.maxResults)

  const endTime = performance.now()

  return {
    positions: limited,
    analyzedPositions: positionsToAnalyze.length,
    calculationTimeMs: Math.round(endTime - startTime),
  }
}

/**
 * Yield to browser event loop to prevent UI freeze.
 */
async function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}
