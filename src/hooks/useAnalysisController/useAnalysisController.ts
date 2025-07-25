import { Chess } from 'chess.ts'
import {
  Key,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react'

import { AnalyzedGame, GameNode } from 'src/types'
import type { DrawShape } from 'chessground/draw'
import { MAIA_MODELS } from 'src/constants/common'
import { useTreeController, useLocalStorage } from '..'
import { useEngineAnalysis } from './useEngineAnalysis'
import { useBoardDescription } from './useBoardDescription'
import { useMoveRecommendations } from './useMoveRecommendations'
import { MaiaEngineContext } from 'src/contexts/MaiaEngineContext'
import { generateColorSanMapping, calculateBlunderMeter } from './utils'
import { StockfishEngineContext } from 'src/contexts/StockfishEngineContext'
import {
  collectEngineAnalysisData,
  generateAnalysisCacheKey,
  applyEngineAnalysisData,
} from 'src/lib/analysisStorage'
import {
  storeEngineAnalysis,
  getEngineAnalysis,
} from 'src/api/analysis/analysis'

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

export const useAnalysisController = (
  game: AnalyzedGame,
  initialOrientation?: 'white' | 'black',
) => {
  const defaultOrientation = initialOrientation
    ? initialOrientation
    : game.whitePlayer.name.includes('Maia')
      ? 'black'
      : 'white'

  const maia = useContext(MaiaEngineContext)
  const stockfish = useContext(StockfishEngineContext)
  const controller = useTreeController(game.tree, defaultOrientation)

  const [analysisState, setAnalysisState] = useState(0)
  const inProgressAnalyses = useMemo(() => new Set<string>(), [])

  // Game analysis state
  const [gameAnalysisConfig, setGameAnalysisConfig] =
    useState<GameAnalysisConfig>({
      targetDepth: 18,
    })

  const [gameAnalysisProgress, setGameAnalysisProgress] =
    useState<GameAnalysisProgress>({
      currentMoveIndex: 0,
      totalMoves: 0,
      currentMove: '',
      isAnalyzing: false,
      isComplete: false,
      isCancelled: false,
    })

  const gameAnalysisController = useRef<{
    cancelled: boolean
    currentNode: GameNode | null
  }>({
    cancelled: false,
    currentNode: null,
  })

  const [lastSavedCacheKey, setLastSavedCacheKey] = useState<string>('')
  const [hasUnsavedAnalysis, setHasUnsavedAnalysis] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const saveAnalysisToBackend = useCallback(async () => {
    if (
      !game.id ||
      game.type === 'custom-pgn' ||
      game.type === 'custom-fen' ||
      game.type === 'tournament'
    ) {
      return
    }

    // Don't save if there are no unsaved changes
    if (!hasUnsavedAnalysis) {
      return
    }

    try {
      setIsAutoSaving(true)
      const analysisData = collectEngineAnalysisData(game.tree)

      if (analysisData.length === 0) {
        setIsAutoSaving(false)
        return
      }

      const hasMeaningfulAnalysis = analysisData.some(
        (pos) => (pos.stockfish && pos.stockfish.depth >= 12) || pos.maia,
      )

      if (!hasMeaningfulAnalysis) {
        setIsAutoSaving(false)
        return
      }

      const cacheKey = generateAnalysisCacheKey(analysisData)
      if (cacheKey === lastSavedCacheKey) {
        setIsAutoSaving(false)
        return
      }

      await storeEngineAnalysis(game.id, analysisData)
      setLastSavedCacheKey(cacheKey)
      setHasUnsavedAnalysis(false) // Mark as saved
      console.log(
        'Analysis saved to backend:',
        analysisData.length,
        'positions',
      )
    } catch (error) {
      console.warn('Failed to save analysis to backend:', error)
      // Don't show error to user as this is background functionality
    } finally {
      setIsAutoSaving(false)
    }
  }, [game.id, game.type, game.tree, lastSavedCacheKey, hasUnsavedAnalysis])

  const saveAnalysisToBackendRef = useRef(saveAnalysisToBackend)
  saveAnalysisToBackendRef.current = saveAnalysisToBackend

  const loadStoredAnalysis = useCallback(async () => {
    console.log(
      'loadStoredAnalysis called for game:',
      game.id,
      'type:',
      game.type,
    )

    if (
      !game.id ||
      game.type === 'custom-pgn' ||
      game.type === 'custom-fen' ||
      game.type === 'tournament'
    ) {
      console.log('Skipping analysis load - game not eligible')
      return
    }

    try {
      console.log('Fetching stored analysis for game:', game.id)
      const storedAnalysis = await getEngineAnalysis(game.id)
      console.log('Received stored analysis:', storedAnalysis)

      if (storedAnalysis && storedAnalysis.positions.length > 0) {
        applyEngineAnalysisData(game.tree, storedAnalysis.positions)
        setAnalysisState((prev) => prev + 1) // Trigger UI updates
        console.log(
          'Loaded stored analysis:',
          storedAnalysis.positions.length,
          'positions',
        )
      } else {
        console.log('No stored analysis found for game:', game.id)
      }
    } catch (error) {
      console.warn('Failed to load stored analysis:', error)
      // Don't show error to user as this is background functionality
    }
  }, [game.id, game.type])

  // Load stored analysis when game changes
  useEffect(() => {
    // Reset states for new game
    setHasUnsavedAnalysis(false)
    setIsAutoSaving(false)
    setLastSavedCacheKey('')
    loadStoredAnalysis()
  }, [loadStoredAnalysis])

  // Mark analysis as unsaved when new analysis comes in
  useEffect(() => {
    if (analysisState > 0) {
      setHasUnsavedAnalysis(true)
    }
  }, [analysisState])

  // Setup auto-save timer
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }

    // Set up new timer to save every 10 seconds
    autoSaveTimerRef.current = setInterval(() => {
      saveAnalysisToBackendRef.current()
    }, 10000)

    // Cleanup on unmount or game change - save one last time
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
      // Final save when component unmounts or game changes
      saveAnalysisToBackendRef.current()
    }
  }, [game.id])

  // Simple batch analysis functions that reuse existing analysis infrastructure
  const startGameAnalysis = useCallback(
    async (targetDepth: number) => {
      // If already analyzing, cancel the current analysis first
      if (gameAnalysisProgress.isAnalyzing) {
        gameAnalysisController.current.cancelled = true
        stockfish.stopEvaluation()
      }

      // Reset state
      gameAnalysisController.current.cancelled = false
      gameAnalysisController.current.currentNode = null

      const mainLine = game.tree.getMainLine()

      setGameAnalysisConfig({ targetDepth })
      setGameAnalysisProgress({
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
        !gameAnalysisController.current.cancelled
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        retries++
      }

      if (gameAnalysisController.current.cancelled) {
        setGameAnalysisProgress((prev) => ({
          ...prev,
          isAnalyzing: false,
          isCancelled: true,
        }))
        return
      }

      // Analyze each position in the main line
      for (let i = 0; i < mainLine.length; i++) {
        if (gameAnalysisController.current.cancelled) break

        const node = mainLine[i]
        gameAnalysisController.current.currentNode = node

        // Update the UI to show the current node being analyzed (live update)
        controller.setCurrentNode(node)

        const moveDisplay = node.san || node.move || `Position ${i + 1}`

        setGameAnalysisProgress((prev) => ({
          ...prev,
          currentMoveIndex: i + 1,
          currentMove: moveDisplay,
        }))

        // Wait for analysis to reach target depth (the useEngineAnalysis will handle this)
        let analysisRetries = 0
        const maxAnalysisRetries = 600 // 60 seconds max per position

        while (
          analysisRetries < maxAnalysisRetries &&
          !gameAnalysisController.current.cancelled &&
          (!node.analysis.stockfish ||
            node.analysis.stockfish.depth < targetDepth)
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          analysisRetries++
        }
      }

      // Analysis complete
      setGameAnalysisProgress((prev) => ({
        ...prev,
        isAnalyzing: false,
        isComplete: !gameAnalysisController.current.cancelled,
        isCancelled: gameAnalysisController.current.cancelled,
      }))

      gameAnalysisController.current.currentNode = null
    },
    [
      game.tree,
      gameAnalysisProgress.isAnalyzing,
      stockfish,
      maia.status,
      controller.setCurrentNode,
    ],
  )

  const cancelGameAnalysis = useCallback(() => {
    gameAnalysisController.current.cancelled = true
    stockfish.stopEvaluation()

    setGameAnalysisProgress((prev) => ({
      ...prev,
      isAnalyzing: false,
      isCancelled: true,
    }))
  }, [stockfish])

  const resetGameAnalysisProgress = useCallback(() => {
    setGameAnalysisProgress({
      currentMoveIndex: 0,
      totalMoves: 0,
      currentMove: '',
      isAnalyzing: false,
      isComplete: false,
      isCancelled: false,
    })
  }, [])

  const [currentMove, setCurrentMove] = useState<[string, string] | null>()
  const [currentMaiaModel, setCurrentMaiaModel] = useLocalStorage(
    'currentMaiaModel',
    MAIA_MODELS[0],
  )

  useEffect(() => {
    if (!MAIA_MODELS.includes(currentMaiaModel)) {
      setCurrentMaiaModel(MAIA_MODELS[0])
    }
  }, [currentMaiaModel, setCurrentMaiaModel])

  useEngineAnalysis(
    controller.currentNode || null,
    inProgressAnalyses,
    currentMaiaModel,
    setAnalysisState,
    gameAnalysisProgress.isAnalyzing ? gameAnalysisConfig.targetDepth : 18,
  )

  const availableMoves = useMemo(() => {
    if (!controller.currentNode) return new Map<string, string[]>()

    const moveMap = new Map<string, string[]>()
    const chess = new Chess(controller.currentNode.fen)
    const moves = chess.moves({ verbose: true })

    moves.forEach((key) => {
      const { from, to } = key
      moveMap.set(from, (moveMap.get(from) ?? []).concat([to]))
    })

    return moveMap
  }, [controller.currentNode])

  const colorSanMapping = useMemo(() => {
    if (!controller.currentNode) return {}

    return generateColorSanMapping(
      controller.currentNode.analysis.stockfish,
      controller.currentNode.fen,
    )
  }, [controller.currentNode, analysisState])

  const moveEvaluation = useMemo(() => {
    if (!controller.currentNode) return null

    return {
      maia: controller.currentNode.analysis.maia?.[currentMaiaModel],
      stockfish: controller.currentNode.analysis.stockfish,
    }
  }, [currentMaiaModel, controller.currentNode, analysisState])

  const blunderMeter = useMemo(
    () =>
      calculateBlunderMeter(moveEvaluation?.maia, moveEvaluation?.stockfish),
    [moveEvaluation],
  )

  const {
    recommendations: moveRecommendations,
    movesByRating,
    moveMap,
  } = useMoveRecommendations(
    controller.currentNode || null,
    moveEvaluation,
    currentMaiaModel,
  )

  const boardDescription = useBoardDescription(
    controller.currentNode || null,
    moveEvaluation,
  )

  const move = useMemo(() => {
    if (!currentMove) return undefined

    const chess = new Chess(controller.currentNode?.fen)
    const san = chess.move({ from: currentMove[0], to: currentMove[1] })?.san

    if (san) {
      return {
        move: currentMove,
        fen: chess.fen(),
        check: chess.inCheck(),
        san,
      }
    }

    return undefined
  }, [currentMove, controller.currentNode])

  const arrows = useMemo(() => {
    if (!controller.currentNode) return []

    const arrows: DrawShape[] = []

    if (moveEvaluation?.maia) {
      const bestMove = Object.entries(moveEvaluation.maia.policy)[0]
      if (bestMove) {
        arrows.push({
          brush: 'red',
          orig: bestMove[0].slice(0, 2) as Key,
          dest: bestMove[0].slice(2, 4) as Key,
        } as DrawShape)
      }
    }

    if (moveEvaluation?.stockfish) {
      const bestMove = Object.entries(moveEvaluation.stockfish.cp_vec)[0]
      if (bestMove) {
        arrows.push({
          brush: 'blue',
          orig: bestMove[0].slice(0, 2) as Key,
          dest: bestMove[0].slice(2, 4) as Key,
          modifiers: { lineWidth: 8 },
        } as DrawShape)
      }
    }

    return arrows
  }, [controller.currentNode, moveEvaluation])

  return {
    gameTree: controller.gameTree,
    currentNode: controller.currentNode,
    setCurrentNode: controller.setCurrentNode,
    goToNode: controller.goToNode,
    goToNextNode: controller.goToNextNode,
    goToPreviousNode: controller.goToPreviousNode,
    goToRootNode: controller.goToRootNode,
    plyCount: controller.plyCount,
    orientation: controller.orientation,
    setOrientation: controller.setOrientation,

    move,
    availableMoves,
    currentMaiaModel,
    setCurrentMaiaModel,
    currentMove,
    colorSanMapping,
    setCurrentMove,
    moveEvaluation,
    movesByRating,
    moveRecommendations,
    moveMap,
    blunderMeter,
    boardDescription,
    arrows,
    stockfish: stockfish,
    maia: maia,
    gameAnalysis: {
      progress: gameAnalysisProgress,
      config: gameAnalysisConfig,
      setConfig: setGameAnalysisConfig,
      startAnalysis: startGameAnalysis,
      cancelAnalysis: cancelGameAnalysis,
      resetProgress: resetGameAnalysisProgress,
      isEnginesReady: stockfish.isReady() && maia.status === 'ready',
      saveAnalysis: saveAnalysisToBackend,
      loadStoredAnalysis,
      autoSave: {
        hasUnsavedChanges: hasUnsavedAnalysis,
        isSaving: isAutoSaving,
        status: isAutoSaving
          ? 'saving'
          : hasUnsavedAnalysis
            ? 'unsaved'
            : 'saved',
      },
    },
  }
}
