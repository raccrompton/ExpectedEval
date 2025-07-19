import { useCallback, useContext, useRef, useState } from 'react'
import { Chess } from 'chess.ts'
import { GameNode, GameTree, MaiaEvaluation } from 'src/types'
import { MaiaEngineContext, StockfishEngineContext } from 'src/contexts'
import { MAIA_MODELS } from 'src/constants/common'
import { getBookMoves } from 'src/api'

export interface GameAnalysisProgress {
  currentMoveIndex: number
  totalMoves: number
  currentMove: string
  isAnalyzing: boolean
  isComplete: boolean
  isCancelled: boolean
}

export interface GameAnalysisConfig {
  targetDepth: number
}

export const useGameAnalysis = (
  gameTree: GameTree | null,
  currentMaiaModel: string,
  setAnalysisState: React.Dispatch<React.SetStateAction<number>>,
) => {
  const maia = useContext(MaiaEngineContext)
  const stockfish = useContext(StockfishEngineContext)

  const [progress, setProgress] = useState<GameAnalysisProgress>({
    currentMoveIndex: 0,
    totalMoves: 0,
    currentMove: '',
    isAnalyzing: false,
    isComplete: false,
    isCancelled: false,
  })

  const [config, setConfig] = useState<GameAnalysisConfig>({
    targetDepth: 15,
  })

  const analysisController = useRef<{
    cancelled: boolean
    currentNode: GameNode | null
  }>({
    cancelled: false,
    currentNode: null,
  })

  const inferenceMaiaModel = useCallback(
    async (
      board: Chess,
    ): Promise<{
      [key: string]: MaiaEvaluation
    }> => {
      if (!maia.maia) {
        throw new Error('Maia engine not initialized')
      }

      const { result } = await maia.maia.batchEvaluate(
        Array(9).fill(board.fen()),
        [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
        [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
      )

      const maiaEvaluations: { [key: string]: MaiaEvaluation } = {}
      MAIA_MODELS.forEach((model, index) => {
        maiaEvaluations[model] = result[index]
      })

      return maiaEvaluations
    },
    [maia],
  )

  const fetchOpeningBook = useCallback(async (board: Chess) => {
    const bookMoves = await getBookMoves(board.fen())
    return bookMoves
  }, [])

  const analyzeNode = useCallback(
    async (node: GameNode): Promise<void> => {
      if (analysisController.current.cancelled) return

      const board = new Chess(node.fen)

      // Analyze with Maia if not already done
      if (!node.analysis.maia && maia.status === 'ready') {
        try {
          if (node.moveNumber <= 5) {
            const [openingBookMoves, maiaEvaluations] = await Promise.all([
              fetchOpeningBook(board),
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
                policy: Object.fromEntries(
                  sortedPolicy,
                ) as MaiaEvaluation['policy'],
              }
            }

            node.addMaiaAnalysis(analysis, currentMaiaModel)
          } else {
            const maiaEvaluations = await inferenceMaiaModel(board)
            node.addMaiaAnalysis(maiaEvaluations, currentMaiaModel)
          }
          setAnalysisState((state) => state + 1)
        } catch (error) {
          console.error('Maia analysis failed for node:', error)
        }
      }

      // Analyze with Stockfish if not already at target depth
      if (
        !analysisController.current.cancelled &&
        stockfish.isReady() &&
        (!node.analysis.stockfish ||
          node.analysis.stockfish.depth < config.targetDepth)
      ) {
        try {
          const chess = new Chess(node.fen)
          const evaluationStream = stockfish.streamEvaluations(
            chess.fen(),
            chess.moves().length,
          )

          if (evaluationStream) {
            for await (const evaluation of evaluationStream) {
              if (
                analysisController.current.cancelled ||
                analysisController.current.currentNode !== node
              ) {
                break
              }

              node.addStockfishAnalysis(evaluation, currentMaiaModel)
              setAnalysisState((state) => state + 1)

              // Stop when we reach target depth
              if (evaluation.depth >= config.targetDepth) {
                break
              }
            }
          }
        } catch (error) {
          console.error('Stockfish analysis failed for node:', error)
        }
      }
    },
    [
      maia.status,
      stockfish,
      currentMaiaModel,
      config.targetDepth,
      setAnalysisState,
      fetchOpeningBook,
      inferenceMaiaModel,
    ],
  )

  const startAnalysis = useCallback(async () => {
    if (!gameTree || progress.isAnalyzing) return

    // Reset state
    analysisController.current.cancelled = false
    analysisController.current.currentNode = null

    const mainLine = gameTree.getMainLine()

    setProgress({
      currentMoveIndex: 0,
      totalMoves: mainLine.length,
      currentMove: '',
      isAnalyzing: true,
      isComplete: false,
      isCancelled: false,
    })

    // Wait for engines to be ready
    let retries = 0
    const maxRetries = 50 // 5 seconds

    while (
      retries < maxRetries &&
      (!stockfish.isReady() || maia.status !== 'ready') &&
      !analysisController.current.cancelled
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      retries++
    }

    if (analysisController.current.cancelled) {
      setProgress((prev) => ({
        ...prev,
        isAnalyzing: false,
        isCancelled: true,
      }))
      return
    }

    // Analyze each position in the main line
    for (let i = 0; i < mainLine.length; i++) {
      if (analysisController.current.cancelled) break

      const node = mainLine[i]
      analysisController.current.currentNode = node

      const moveDisplay = node.san || node.move || `Position ${i + 1}`

      setProgress((prev) => ({
        ...prev,
        currentMoveIndex: i + 1,
        currentMove: moveDisplay,
      }))

      await analyzeNode(node)
    }

    // Analysis complete
    setProgress((prev) => ({
      ...prev,
      isAnalyzing: false,
      isComplete: !analysisController.current.cancelled,
      isCancelled: analysisController.current.cancelled,
    }))

    analysisController.current.currentNode = null
  }, [gameTree, progress.isAnalyzing, stockfish, maia.status, analyzeNode])

  const cancelAnalysis = useCallback(() => {
    analysisController.current.cancelled = true
    stockfish.stopEvaluation()

    setProgress((prev) => ({
      ...prev,
      isAnalyzing: false,
      isCancelled: true,
    }))
  }, [stockfish])

  const resetProgress = useCallback(() => {
    setProgress({
      currentMoveIndex: 0,
      totalMoves: 0,
      currentMove: '',
      isAnalyzing: false,
      isComplete: false,
      isCancelled: false,
    })
  }, [])

  return {
    progress,
    config,
    setConfig,
    startAnalysis,
    cancelAnalysis,
    resetProgress,
    isEnginesReady: stockfish.isReady() && maia.status === 'ready',
  }
}
