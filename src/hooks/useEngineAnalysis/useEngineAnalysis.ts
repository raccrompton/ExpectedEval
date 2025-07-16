import { Chess } from 'chess.ts'
import { useContext, useEffect, useMemo, useState } from 'react'
import { getBookMoves } from 'src/api'
import { useLocalStorage } from 'src/hooks'
import { MAIA_MODELS } from 'src/constants/common'
import { GameNode, MaiaEvaluation } from 'src/types'
import { MaiaEngineContext } from 'src/contexts/MaiaEngineContext'
import { StockfishEngineContext } from 'src/contexts/StockfishEngineContext'

export const useEngineAnalysis = (
  currentNode: GameNode | null,
  forceUpdate?: () => void,
) => {
  const inProgressAnalyses = useMemo(() => new Set<string>(), [])
  const [currentMaiaModel] = useLocalStorage('currentMaiaModel', MAIA_MODELS[0])

  const maiaEngine = useContext(MaiaEngineContext)
  const stockfishEngine = useContext(StockfishEngineContext)

  async function inferenceMaiaModel(board: Chess): Promise<{
    [key: string]: MaiaEvaluation
  }> {
    if (!maiaEngine.maia) {
      throw new Error('Maia engine not initialized')
    }

    const { result } = await maiaEngine.maia.batchEvaluate(
      Array(9).fill(board.fen()),
      [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
      [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
    )

    const maiaEvaluations: { [key: string]: MaiaEvaluation } = {}
    MAIA_MODELS.forEach((model, index) => {
      maiaEvaluations[model] = result[index]
    })

    return maiaEvaluations
  }

  async function fetchFromOpeningBook(board: Chess) {
    const bookMoves = await getBookMoves(board.fen())

    return bookMoves
  }

  useEffect(() => {
    if (!currentNode) return

    const board = new Chess(currentNode.fen)
    const nodeFen = currentNode.fen

    const analyzeWithMaia = async () => {
      if (
        !currentNode ||
        currentNode.analysis.maia ||
        inProgressAnalyses.has(nodeFen)
      )
        return

      let retries = 0
      const maxRetries = 30

      while (retries < maxRetries && maiaEngine.status !== 'ready') {
        await new Promise((resolve) => setTimeout(resolve, 100))
        retries++
      }

      if (maiaEngine.status !== 'ready') {
        console.warn('Maia not ready after waiting, skipping analysis')
        return
      }

      inProgressAnalyses.add(nodeFen)

      try {
        // If the node is within the first 5 moves, use the opening book and fill in the gaps with the Maia model
        if (currentNode.moveNumber <= 5) {
          const [openingBookMoves, maiaEvaluations] = await Promise.all([
            fetchFromOpeningBook(board),
            inferenceMaiaModel(board),
          ])

          const analysis: { [key: string]: MaiaEvaluation } = {}
          for (const model of MAIA_MODELS) {
            const policySource = Object.keys(openingBookMoves[model] || {})
              .length
              ? openingBookMoves[model]
              : maiaEvaluations[model].policy

            const sortedPolicy = Object.entries(policySource).sort(
              ([, a], [, b]) => (b as number) - (a as number),
            )

            analysis[model] = {
              value: maiaEvaluations[model].value,
              policy: Object.fromEntries(sortedPolicy),
            } as MaiaEvaluation
          }

          currentNode.addMaiaAnalysis(analysis, currentMaiaModel)
          forceUpdate?.()
          return
        } else {
          // If the node is not within the first 5 moves, use the Maia model to evaluate the position
          const maiaEvaluations = await inferenceMaiaModel(board)
          currentNode.addMaiaAnalysis(maiaEvaluations, currentMaiaModel)
          forceUpdate?.()
        }
      } finally {
        inProgressAnalyses.delete(nodeFen)
      }
    }

    // Delay Maia analysis to prevent rapid fire when moving quickly
    const timeoutId = setTimeout(() => {
      analyzeWithMaia()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [
    maiaEngine,
    currentNode,
    currentMaiaModel,
    forceUpdate,
    inProgressAnalyses,
  ])

  useEffect(() => {
    if (
      !currentNode ||
      (currentNode.analysis.stockfish &&
        currentNode.analysis.stockfish?.depth >= 18)
    )
      return

    let cancelled = false

    const analyzeWithStockfish = async () => {
      let retries = 0
      const maxRetries = 30

      while (retries < maxRetries && !stockfishEngine.isReady() && !cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        retries++
      }

      if (cancelled || !stockfishEngine.isReady()) {
        if (!cancelled) {
          console.warn('Stockfish not ready after waiting, skipping analysis')
        }
        return
      }

      const chess = new Chess(currentNode.fen)
      const evaluationStream = stockfishEngine.streamEvaluations(
        chess.fen(),
        chess.moves().length,
      )

      if (evaluationStream && !cancelled) {
        const nodeForAnalysis = currentNode
        try {
          for await (const evaluation of evaluationStream) {
            if (
              cancelled ||
              !nodeForAnalysis ||
              nodeForAnalysis !== currentNode
            ) {
              break
            }
            nodeForAnalysis.addStockfishAnalysis(evaluation, currentMaiaModel)
            forceUpdate?.()
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Stockfish evaluation error:', error)
          }
        }
      }
    }

    // Delay Stockfish analysis to prevent rapid fire when moving quickly
    const timeoutId = setTimeout(() => {
      if (cancelled) return
      analyzeWithStockfish()
    }, 100)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [currentNode, stockfishEngine, currentMaiaModel, forceUpdate])
}
