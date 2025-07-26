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
} from 'src/lib/analysisStorage'
import { storeEngineAnalysis } from 'src/api/analysis/analysis'
import { extractPlayerMistakes, isBestMove } from 'src/lib/analysis'
import { LearnFromMistakesState, MistakePosition } from 'src/types/analysis'
import { LEARN_FROM_MISTAKES_DEPTH } from 'src/constants/analysis'

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
  enableAutoSave = true,
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
      !enableAutoSave ||
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
  }, [
    enableAutoSave,
    game.id,
    game.type,
    game.tree,
    lastSavedCacheKey,
    hasUnsavedAnalysis,
  ])

  const saveAnalysisToBackendRef = useRef(saveAnalysisToBackend)
  saveAnalysisToBackendRef.current = saveAnalysisToBackend

  useEffect(() => {
    setHasUnsavedAnalysis(false)
    setIsAutoSaving(false)
    setLastSavedCacheKey('')
  }, [game.id, game.type])

  useEffect(() => {
    if (analysisState > 0) {
      setHasUnsavedAnalysis(true)
    }
  }, [analysisState])

  useEffect(() => {
    if (!enableAutoSave) {
      return
    }

    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setInterval(() => {
      saveAnalysisToBackendRef.current()
    }, 10000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
      saveAnalysisToBackendRef.current()
    }
  }, [game.id, enableAutoSave])

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

        // Skip analysis if this is a terminal position (checkmate/stalemate)
        const chess = new Chess(node.fen)
        const isTerminalPosition = chess.gameOver()

        if (!isTerminalPosition) {
          // Wait for analysis to reach target depth or complete (mate, etc.)
          let analysisRetries = 0
          const maxAnalysisRetries = 600 // 60 seconds max per position

          while (
            analysisRetries < maxAnalysisRetries &&
            !gameAnalysisController.current.cancelled &&
            (!node.analysis.stockfish ||
              (node.analysis.stockfish.depth < targetDepth &&
                node.analysis.stockfish.model_optimal_cp !== 10000 &&
                node.analysis.stockfish.model_optimal_cp !== -10000))
          ) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            analysisRetries++
          }
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

  // Learn from mistakes state
  const [learnFromMistakesState, setLearnFromMistakesState] =
    useState<LearnFromMistakesState>({
      isActive: false,
      currentMistakeIndex: 0,
      mistakes: [],
      hasCompletedAnalysis: false,
      showSolution: false,
      currentAttempt: 1,
      maxAttempts: Infinity, // Infinite attempts
      originalPosition: null,
    })

  // Learn from mistakes functions
  const startLearnFromMistakes = useCallback(async () => {
    // First, ensure the entire game is analyzed at the required depth
    if (!gameAnalysisProgress.isComplete) {
      // Start analysis first
      await startGameAnalysis(LEARN_FROM_MISTAKES_DEPTH)

      // Wait for analysis to complete
      return new Promise<void>((resolve) => {
        const checkComplete = () => {
          if (
            gameAnalysisProgress.isComplete ||
            gameAnalysisProgress.isCancelled
          ) {
            if (gameAnalysisProgress.isComplete) {
              initializeLearnFromMistakes()
            }
            resolve()
          } else {
            setTimeout(checkComplete, 500)
          }
        }
        checkComplete()
      })
    } else {
      initializeLearnFromMistakes()
    }
  }, [gameAnalysisProgress, startGameAnalysis])

  const initializeLearnFromMistakes = useCallback(() => {
    // Determine which player to analyze based on the current user
    // For now, we'll analyze the user playing as white by default
    // This could be enhanced to detect which player is the user
    const playerColor: 'white' | 'black' = 'white' // This could be made configurable

    const mistakes = extractPlayerMistakes(game.tree, playerColor)

    if (mistakes.length === 0) {
      // No mistakes found - could show a message
      return
    }

    // Navigate to the first mistake position (the position where the player needs to move)
    const firstMistake = mistakes[0]
    const mistakeNode = game.tree.getMainLine()[firstMistake.moveIndex]
    const originalPosition =
      mistakeNode && mistakeNode.parent ? mistakeNode.parent.fen : null

    setLearnFromMistakesState({
      isActive: true,
      currentMistakeIndex: 0,
      mistakes,
      hasCompletedAnalysis: true,
      showSolution: false,
      currentAttempt: 1,
      maxAttempts: Infinity,
      originalPosition,
    })

    if (mistakeNode && mistakeNode.parent) {
      controller.setCurrentNode(mistakeNode.parent)
    }
  }, [game.tree, controller])

  const stopLearnFromMistakes = useCallback(() => {
    setLearnFromMistakesState({
      isActive: false,
      currentMistakeIndex: 0,
      mistakes: [],
      hasCompletedAnalysis: false,
      showSolution: false,
      currentAttempt: 1,
      maxAttempts: Infinity,
      originalPosition: null,
    })
  }, [])

  const showSolution = useCallback(() => {
    if (
      !learnFromMistakesState.isActive ||
      learnFromMistakesState.mistakes.length === 0
    )
      return

    const currentMistake =
      learnFromMistakesState.mistakes[
        learnFromMistakesState.currentMistakeIndex
      ]
    if (!currentMistake || !controller.currentNode) return

    // Make the best move on the board (this will create a variation)
    const chess = new Chess(controller.currentNode.fen)
    const moveResult = chess.move(currentMistake.bestMove, { sloppy: true })

    if (moveResult) {
      const newVariation = game.tree.addVariation(
        controller.currentNode,
        chess.fen(),
        currentMistake.bestMove,
        currentMistake.bestMoveSan,
        controller.currentMaiaModel,
      )
      controller.goToNode(newVariation)
    }

    setLearnFromMistakesState((prev) => ({
      ...prev,
      showSolution: true,
    }))
  }, [learnFromMistakesState, controller, game.tree])

  const goToNextMistake = useCallback(() => {
    if (
      !learnFromMistakesState.isActive ||
      learnFromMistakesState.mistakes.length === 0
    )
      return

    const nextIndex = learnFromMistakesState.currentMistakeIndex + 1

    if (nextIndex >= learnFromMistakesState.mistakes.length) {
      // No more mistakes - end the session
      stopLearnFromMistakes()
      return
    }

    const nextMistake = learnFromMistakesState.mistakes[nextIndex]
    const mistakeNode = game.tree.getMainLine()[nextMistake.moveIndex]
    const newOriginalPosition =
      mistakeNode && mistakeNode.parent ? mistakeNode.parent.fen : null

    if (mistakeNode && mistakeNode.parent) {
      controller.setCurrentNode(mistakeNode.parent)
    }

    setLearnFromMistakesState((prev) => ({
      ...prev,
      currentMistakeIndex: nextIndex,
      showSolution: false,
      currentAttempt: 1,
      originalPosition: newOriginalPosition,
    }))
  }, [learnFromMistakesState, controller, game.tree, stopLearnFromMistakes])

  const checkMoveInLearnMode = useCallback(
    (moveUci: string): 'correct' | 'incorrect' | 'not-learning' => {
      if (!learnFromMistakesState.isActive || !controller.currentNode)
        return 'not-learning'

      const currentMistake =
        learnFromMistakesState.mistakes[
          learnFromMistakesState.currentMistakeIndex
        ]
      if (!currentMistake) return 'not-learning'

      const isCorrect = isBestMove(controller.currentNode, moveUci)

      if (isCorrect) {
        setLearnFromMistakesState((prev) => ({
          ...prev,
          showSolution: true,
        }))
        return 'correct'
      } else {
        setLearnFromMistakesState((prev) => ({
          ...prev,
          currentAttempt: prev.currentAttempt + 1,
        }))
        return 'incorrect'
      }
    },
    [learnFromMistakesState, controller],
  )

  // Function to return to the original position when a move is incorrect
  const returnToOriginalPosition = useCallback(() => {
    if (!learnFromMistakesState.originalPosition) return

    // Find the node with the original FEN
    const mainLine = game.tree.getMainLine()
    const originalNode = mainLine.find(
      (node) => node.fen === learnFromMistakesState.originalPosition,
    )

    if (originalNode) {
      controller.setCurrentNode(originalNode)
    }
  }, [learnFromMistakesState.originalPosition, game.tree, controller])

  const getCurrentMistakeInfo = useCallback(() => {
    if (
      !learnFromMistakesState.isActive ||
      learnFromMistakesState.mistakes.length === 0
    ) {
      return null
    }

    const currentMistake =
      learnFromMistakesState.mistakes[
        learnFromMistakesState.currentMistakeIndex
      ]
    const totalMistakes = learnFromMistakesState.mistakes.length
    const currentIndex = learnFromMistakesState.currentMistakeIndex + 1

    return {
      mistake: currentMistake,
      progress: `${currentIndex} of ${totalMistakes}`,
      isLastMistake:
        learnFromMistakesState.currentMistakeIndex === totalMistakes - 1,
    }
  }, [learnFromMistakesState])

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
      autoSave: {
        hasUnsavedChanges: hasUnsavedAnalysis,
        isSaving: isAutoSaving,
        status: isAutoSaving
          ? ('saving' as const)
          : hasUnsavedAnalysis
            ? ('unsaved' as const)
            : ('saved' as const),
      },
    },
    learnFromMistakes: {
      state: learnFromMistakesState,
      start: startLearnFromMistakes,
      stop: stopLearnFromMistakes,
      showSolution,
      goToNext: goToNextMistake,
      checkMove: checkMoveInLearnMode,
      getCurrentInfo: getCurrentMistakeInfo,
      returnToOriginalPosition,
    },
  }
}
