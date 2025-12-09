/**
 * Engine Coordination Utilities for Expected Winrate Analysis
 *
 * Coordinates with existing Stockfish and Maia engine contexts to perform
 * batch evaluations needed for Expected Winrate calculations. Follows existing
 * patterns from useEngineAnalysis and maintains compatibility with current
 * engine infrastructure.
 */

import { Chess } from 'chess.ts'
import {
  StockfishBatchRequest,
  MaiaBatchRequest,
  ExpectedWinRateNode,
  ExpectedWinRateParams,
} from 'src/types/expectedWinrate'
import { StockfishEvaluation, MaiaEvaluation } from 'src/types/analysis'
import { cpToWinrate } from 'src/lib/stockfish'

/**
 * Coordinates Stockfish batch evaluation following existing engine patterns
 */
export const coordinateStockfishBatch = async (
  stockfish: any,
  request: StockfishBatchRequest,
  abortSignal?: AbortSignal,
): Promise<Map<string, StockfishEvaluation>> => {
  const results = new Map<string, StockfishEvaluation>()

  if (!stockfish?.isReady?.()) {
    throw new Error('Stockfish engine not initialized')
  }

  // Process positions sequentially to avoid overwhelming the engine
  // Following existing depth and evaluation patterns
  for (let i = 0; i < request.positions.length; i++) {
    if (abortSignal?.aborted) {
      throw new Error('Calculation aborted')
    }

    const position = request.positions[i]
    const chess = new Chess(position.fen)

    // Skip invalid positions - chess.ts doesn't have isValid(), use try/catch
    try {
      chess.fen() // This will throw if invalid
    } catch (error) {
      console.warn(`Skipping invalid position: ${position.fen}`)
      continue
    }

    try {
      // Use actual Stockfish API - streamEvaluations returns AsyncIterable
      const legalMoves = chess.moves().length
      const evaluationStream = stockfish.streamEvaluations(
        position.fen,
        legalMoves,
        position.depth,
      )

      if (evaluationStream) {
        let finalEvaluation: StockfishEvaluation | null = null

        // Consume the stream to get the final evaluation
        for await (const evaluation of evaluationStream) {
          finalEvaluation = evaluation
          if (abortSignal?.aborted) {
            stockfish.stopEvaluation()
            throw new Error('Calculation aborted')
          }
        }

        if (finalEvaluation) {
          // Convert to current player perspective (critical implementation detail)
          const isBlackTurn = chess.turn() === 'b'
          const adjustedEvaluation = {
            ...finalEvaluation,
            // StockfishEvaluation uses model_optimal_cp, not cp
            model_optimal_cp:
              finalEvaluation.model_optimal_cp * (isBlackTurn ? -1 : 1),
          }

          results.set(position.id, adjustedEvaluation)

          // Call progress callback
          request.onProgress?.(i + 1, request.positions.length)
          request.onResult?.(position.id, adjustedEvaluation)
        }
      }
    } catch (error) {
      console.warn(`Stockfish evaluation failed for ${position.fen}:`, error)
      // Continue with other positions rather than failing entire batch
    }

    // Small delay to prevent engine overload
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return results
}

/**
 * Coordinates Maia batch evaluation following existing engine patterns
 */
export const coordinateMaiaBatch = async (
  maia: any,
  request: MaiaBatchRequest,
  abortSignal?: AbortSignal,
): Promise<Map<string, MaiaEvaluation>> => {
  const results = new Map<string, MaiaEvaluation>()

  if (!maia?.maia) {
    throw new Error('Maia engine not initialized')
  }

  // Wait for engine readiness (following existing patterns)
  let readyWaitCount = 0
  while (!maia?.maia && readyWaitCount < 30) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    readyWaitCount++
  }

  if (!maia?.maia) {
    throw new Error('Maia engine failed to initialize within timeout')
  }

  // Batch process positions (Maia handles batching better than Stockfish)
  const validPositions = request.positions.filter((pos) => {
    try {
      const chess = new Chess(pos.fen)
      chess.fen() // This will throw if invalid
      return true
    } catch {
      return false
    }
  })

  if (validPositions.length === 0) {
    return results
  }

  try {
    // Use existing Maia batch evaluation method
    const fens = validPositions.map((pos) => pos.fen)
    const maiaLevel = parseInt(request.maiaLevel)

    const { result } = await maia.maia.batchEvaluate(
      fens,
      [maiaLevel], // Single level for consistency
      [maiaLevel],
    )

    // Process results
    validPositions.forEach((position, index) => {
      if (abortSignal?.aborted) {
        throw new Error('Calculation aborted')
      }

      const evaluation = result[0] // Single level result
      if (evaluation && evaluation.policy) {
        results.set(position.id, evaluation)
        request.onProgress?.(index + 1, validPositions.length)
        request.onResult?.(position.id, evaluation)
      }
    })
  } catch (error) {
    console.warn('Maia batch evaluation failed:', error)
    throw error
  }

  return results
}

/**
 * Generate legal moves for a position following existing patterns
 */
export const generateLegalMoves = (
  fen: string,
): Array<{ uci: string; san: string }> => {
  try {
    const chess = new Chess(fen)
    chess.fen() // This will throw if invalid

    const moves = chess.moves({ verbose: true })
    return moves.map((move) => ({
      uci: `${move.from}${move.to}${move.promotion || ''}`,
      san: move.san,
    }))
  } catch (error) {
    console.warn(`Failed to generate legal moves for ${fen}:`, error)
    return []
  }
}

/**
 * Filter moves by winrate loss threshold following existing analysis patterns
 */
export const filterMovesByWinrateLoss = (
  moves: Array<{ uci: string; san: string; evaluation?: StockfishEvaluation }>,
  winrateLossThreshold: number,
): Array<{ uci: string; san: string; evaluation?: StockfishEvaluation }> => {
  if (moves.length === 0) return moves

  // Find best move winrate using model_optimal_cp
  let bestWinrate = -1
  moves.forEach((move) => {
    if (move.evaluation?.model_optimal_cp !== undefined) {
      const winrate = cpToWinrate(move.evaluation.model_optimal_cp)
      if (winrate > bestWinrate) {
        bestWinrate = winrate
      }
    }
  })

  if (bestWinrate === -1) return moves

  // Filter moves within threshold
  return moves.filter((move) => {
    if (!move.evaluation?.model_optimal_cp) return true // Keep moves without evaluation

    const winrate = cpToWinrate(move.evaluation.model_optimal_cp)
    const winrateLoss = winrate - bestWinrate

    return winrateLoss >= winrateLossThreshold
  })
}

/**
 * Convert Stockfish centipawns to winrate following existing perspective handling
 */
export const convertCpToWinrate = (
  modelOptimalCp: number,
  isBlackTurn: boolean,
): number => {
  // Apply perspective conversion (critical implementation detail)
  const adjustedCp = modelOptimalCp * (isBlackTurn ? -1 : 1)
  return cpToWinrate(adjustedCp)
}

/**
 * Extract move probabilities from Maia evaluation
 */
export const extractMoveProbabilities = (
  evaluation: MaiaEvaluation,
  legalMoves: Array<{ uci: string; san: string }>,
): Map<string, number> => {
  const probabilities = new Map<string, number>()

  if (!evaluation.policy) {
    return probabilities
  }

  // Map legal moves to their probabilities
  legalMoves.forEach((move) => {
    const probability = evaluation.policy[move.uci] || 0
    if (probability > 0) {
      probabilities.set(move.uci, probability)
    }
  })

  return probabilities
}

/**
 * Create position request for batch processing
 */
export const createPositionRequest = (
  fen: string,
  id: string,
  depth = 18,
): { fen: string; id: string; depth: number } => {
  return { fen, id, depth }
}

/**
 * Validate position for analysis
 */
export const isValidPosition = (fen: string): boolean => {
  try {
    const chess = new Chess(fen)
    chess.fen() // This will throw if invalid
    return true
  } catch {
    return false
  }
}

/**
 * Wait for engines to be ready following existing patterns
 */
export const waitForEnginesReady = async (
  stockfish: any,
  maia: any,
  timeoutMs = 3000,
): Promise<void> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (stockfish.stockfish && maia.maia) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Engines not ready within ${timeoutMs}ms timeout`)
}
