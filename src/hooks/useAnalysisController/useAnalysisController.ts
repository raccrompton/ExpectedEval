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
import toast from 'react-hot-toast'

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
import { storeGameAnalysisCache } from 'src/api/analysis'
import {
  extractPlayerMistakes,
  isBestMove,
  collectEngineAnalysisData,
  generateAnalysisCacheKey,
} from 'src/lib/analysis'
import {
  LearnFromMistakesConfiguration,
  DeepAnalysisConfig,
  DeepAnalysisProgress,
} from 'src/types/analysis'
import { LEARN_FROM_MISTAKES_DEPTH } from 'src/constants/analysis'

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

  const [deepAnalysisConfiguration, setDeepAnalysisConfig] =
    useState<DeepAnalysisConfig>({
      targetDepth: 18,
    })
  const [deepAnalysisProgress, setDeepAnalysisProgress] =
    useState<DeepAnalysisProgress>({
      currentMoveIndex: 0,
      totalMoves: 0,
      currentMove: '',
      isAnalyzing: false,
      isComplete: false,
      isCancelled: false,
    })
  const deepAnalysisStatus = useRef<{
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
      !enableAutoSave ||
      !hasUnsavedAnalysis ||
      game.type === 'tournament'
    ) {
      return
    }

    try {
      setIsAutoSaving(true)
      const analysisData = collectEngineAnalysisData(controller.tree)

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

      await storeGameAnalysisCache(game.id, analysisData)
      setLastSavedCacheKey(cacheKey)
      setHasUnsavedAnalysis(false)
    } catch (error) {
      console.warn('Failed to save analysis to backend:', error)
    } finally {
      setIsAutoSaving(false)
    }
  }, [
    enableAutoSave,
    game.id,
    game.type,
    controller.tree,
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

  const startDeepAnalysis = useCallback(
    async (targetDepth: number) => {
      if (deepAnalysisProgress.isAnalyzing) {
        deepAnalysisStatus.current.cancelled = true
        stockfish.stopEvaluation()
      }

      deepAnalysisStatus.current.cancelled = false
      deepAnalysisStatus.current.currentNode = null

      const mainLine = controller.tree.getMainLine()

      setDeepAnalysisConfig({ targetDepth })
      setDeepAnalysisProgress({
        currentMoveIndex: 0,
        totalMoves: mainLine.length,
        currentMove: '',
        isAnalyzing: true,
        isComplete: false,
        isCancelled: false,
      })

      let retries = 0
      const maxRetries = 50

      while (
        retries < maxRetries &&
        (!stockfish.isReady() || maia.status !== 'ready') &&
        !deepAnalysisStatus.current.cancelled
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        retries++
      }

      if (deepAnalysisStatus.current.cancelled) {
        setDeepAnalysisProgress((prev) => ({
          ...prev,
          isAnalyzing: false,
          isCancelled: true,
        }))
        return
      }

      // Analyze each position in the main line
      for (let i = 0; i < mainLine.length; i++) {
        if (deepAnalysisStatus.current.cancelled) break

        const node = mainLine[i]
        deepAnalysisStatus.current.currentNode = node
        controller.setCurrentNode(node)

        const moveDisplay = node.san || node.move || `Position ${i + 1}`

        setDeepAnalysisProgress((prev) => ({
          ...prev,
          currentMoveIndex: i + 1,
          currentMove: moveDisplay,
        }))

        const chess = new Chess(node.fen)
        const isTerminalPosition = chess.gameOver()

        if (!isTerminalPosition) {
          let analysisRetries = 0
          const maxAnalysisRetries = 600 // 60 seconds max per position

          while (
            analysisRetries < maxAnalysisRetries &&
            !deepAnalysisStatus.current.cancelled &&
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

      setDeepAnalysisProgress((prev) => ({
        ...prev,
        isAnalyzing: false,
        isComplete: !deepAnalysisStatus.current.cancelled,
        isCancelled: deepAnalysisStatus.current.cancelled,
      }))

      deepAnalysisStatus.current.currentNode = null
    },
    [
      stockfish,
      maia.status,
      controller.tree,
      deepAnalysisProgress.isAnalyzing,
      controller.setCurrentNode,
    ],
  )

  const cancelDeepAnalysis = useCallback(() => {
    deepAnalysisStatus.current.cancelled = true
    stockfish.stopEvaluation()

    setDeepAnalysisProgress((prev) => ({
      ...prev,
      isAnalyzing: false,
      isCancelled: true,
    }))
  }, [stockfish])

  const resetDeepAnalysisProgress = useCallback(() => {
    setDeepAnalysisProgress({
      currentMoveIndex: 0,
      totalMoves: 0,
      currentMove: '',
      isAnalyzing: false,
      isComplete: false,
      isCancelled: false,
    })
  }, [])

  const [learnModeState, setLearnModeState] =
    useState<LearnFromMistakesConfiguration>({
      isActive: false,
      showPlayerSelection: false,
      selectedPlayerColor: null,
      currentMistakeIndex: 0,
      mistakes: [],
      hasCompletedAnalysis: false,
      showSolution: false,
      currentAttempt: 1,
      maxAttempts: Infinity,
      originalPosition: null,
    })

  const requestLearnModePlayerColor = useCallback(async () => {
    // Show player selection dialog first
    setLearnModeState((prev) => ({
      ...prev,
      showPlayerSelection: true,
      isActive: true,
    }))
  }, [])

  const checkAnalysisProgressForLearnMode = useCallback(
    async (playerColor: 'white' | 'black') => {
      // Check if we have sufficient analysis for learn from mistakes
      const mainLine = controller.tree.getMainLine()
      const hasEnoughAnalysis = mainLine.every((node) => {
        if (!node.move) return true

        // Skip terminal positions (checkmate/stalemate)
        const chess = new Chess(node.fen)
        if (chess.gameOver()) return true

        return (
          (node.analysis.stockfish?.depth ?? 0) >= LEARN_FROM_MISTAKES_DEPTH
        )
      })

      if (hasEnoughAnalysis) {
        beginLearnMode(playerColor)
        return Promise.resolve()
      } else {
        await startDeepAnalysis(LEARN_FROM_MISTAKES_DEPTH)

        return new Promise<void>((resolve) => {
          const checkComplete = () => {
            if (
              deepAnalysisProgress.isComplete ||
              deepAnalysisProgress.isCancelled
            ) {
              if (deepAnalysisProgress.isComplete) {
                beginLearnMode(playerColor)
              }
              resolve()
            } else {
              setTimeout(checkComplete, 500)
            }
          }

          checkComplete()
        })
      }
    },
    [deepAnalysisProgress, startDeepAnalysis, controller.tree],
  )

  const beginLearnMode = useCallback(
    (playerColor: 'white' | 'black') => {
      const mistakes = extractPlayerMistakes(controller.tree, playerColor)

      if (mistakes.length === 0) {
        const colorName = playerColor === 'white' ? 'White' : 'Black'
        toast(`No clear mistakes made by ${colorName}`, {
          icon: '👑',
          duration: 3000,
        })

        setLearnModeState({
          isActive: false,
          showPlayerSelection: false,
          selectedPlayerColor: null,
          currentMistakeIndex: 0,
          mistakes: [],
          hasCompletedAnalysis: false,
          showSolution: false,
          currentAttempt: 1,
          maxAttempts: Infinity,
          originalPosition: null,
        })
        return
      }

      // Navigate to the first mistake position
      const firstMistake = mistakes[0]
      const mistakeNode = controller.tree.getMainLine()[firstMistake.moveIndex]
      const originalPosition =
        mistakeNode && mistakeNode.parent ? mistakeNode.parent.fen : null

      setLearnModeState({
        isActive: true,
        showPlayerSelection: false,
        selectedPlayerColor: playerColor,
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
    },
    [controller.tree, controller],
  )

  const stopLearnMode = useCallback(() => {
    setLearnModeState({
      isActive: false,
      showPlayerSelection: false,
      selectedPlayerColor: null,
      currentMistakeIndex: 0,
      mistakes: [],
      hasCompletedAnalysis: false,
      showSolution: false,
      currentAttempt: 1,
      maxAttempts: Infinity,
      originalPosition: null,
    })
  }, [])

  const showLearnModeSolution = useCallback(() => {
    if (!learnModeState.isActive || learnModeState.mistakes.length === 0) return

    const currentMistake =
      learnModeState.mistakes[learnModeState.currentMistakeIndex]
    if (!currentMistake || !controller.currentNode) return

    // Make the best move on the board
    const chess = new Chess(controller.currentNode.fen)
    const moveResult = chess.move(currentMistake.bestMove, { sloppy: true })

    if (moveResult) {
      const newVariation = controller.tree.addVariationNode(
        controller.currentNode,
        chess.fen(),
        currentMistake.bestMove,
        currentMistake.bestMoveSan,
        currentMaiaModel,
      )
      controller.goToNode(newVariation)
    }

    setLearnModeState((prev) => ({
      ...prev,
      showSolution: true,
    }))
  }, [learnModeState, controller, controller.tree])

  const goToNextLearnModeMistake = useCallback(() => {
    if (!learnModeState.isActive || learnModeState.mistakes.length === 0) return

    const nextIndex = learnModeState.currentMistakeIndex + 1

    if (nextIndex >= learnModeState.mistakes.length) {
      // No more mistakes - end the session
      stopLearnMode()
      return
    }

    const nextMistake = learnModeState.mistakes[nextIndex]
    const mistakeNode = controller.tree.getMainLine()[nextMistake.moveIndex]
    const newOriginalPosition =
      mistakeNode && mistakeNode.parent ? mistakeNode.parent.fen : null

    if (mistakeNode && mistakeNode.parent) {
      controller.setCurrentNode(mistakeNode.parent)
    }

    setLearnModeState((prev) => ({
      ...prev,
      currentMistakeIndex: nextIndex,
      showSolution: false,
      currentAttempt: 1,
      originalPosition: newOriginalPosition,
    }))
  }, [learnModeState, controller, controller.tree, stopLearnMode])

  const checkMoveInLearnMode = useCallback(
    (moveUci: string): 'correct' | 'incorrect' | 'not-learning' => {
      if (!learnModeState.isActive || !controller.currentNode)
        return 'not-learning'

      const currentMistake =
        learnModeState.mistakes[learnModeState.currentMistakeIndex]
      if (!currentMistake) return 'not-learning'

      const isCorrect = isBestMove(controller.currentNode, moveUci)

      if (isCorrect) {
        setLearnModeState((prev) => ({
          ...prev,
          showSolution: true,
        }))
        return 'correct'
      } else {
        setLearnModeState((prev) => ({
          ...prev,
          currentAttempt: prev.currentAttempt + 1,
        }))
        return 'incorrect'
      }
    },
    [learnModeState, controller],
  )

  const returnLearnModeMistakeToOriginalPosition = useCallback(() => {
    if (!learnModeState.originalPosition) return

    const mainLine = controller.tree.getMainLine()
    const originalNode = mainLine.find(
      (node) => node.fen === learnModeState.originalPosition,
    )

    if (originalNode) {
      controller.setCurrentNode(originalNode)
    }
  }, [learnModeState.originalPosition, controller.tree, controller])

  const getCurrentLearnModeMistakeInfo = useCallback(() => {
    if (!learnModeState.isActive || learnModeState.mistakes.length === 0) {
      return null
    }

    const currentMistake =
      learnModeState.mistakes[learnModeState.currentMistakeIndex]
    const totalMistakes = learnModeState.mistakes.length
    const currentIndex = learnModeState.currentMistakeIndex + 1

    return {
      mistake: currentMistake,
      progress: `${currentIndex} of ${totalMistakes}`,
      isLastMistake: learnModeState.currentMistakeIndex === totalMistakes - 1,
    }
  }, [learnModeState])

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
    deepAnalysisProgress.isAnalyzing
      ? deepAnalysisConfiguration.targetDepth
      : 18,
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
    gameTree: controller.tree,
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
      progress: deepAnalysisProgress,
      config: deepAnalysisConfiguration,
      setConfig: setDeepAnalysisConfig,
      startAnalysis: startDeepAnalysis,
      cancelAnalysis: cancelDeepAnalysis,
      resetProgress: resetDeepAnalysisProgress,
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
      state: learnModeState,
      start: requestLearnModePlayerColor,
      startWithColor: checkAnalysisProgressForLearnMode,
      stop: stopLearnMode,
      showSolution: showLearnModeSolution,
      goToNext: goToNextLearnModeMistake,
      checkMove: checkMoveInLearnMode,
      getCurrentInfo: getCurrentLearnModeMistakeInfo,
      returnToOriginalPosition: returnLearnModeMistakeToOriginalPosition,
    },
  }
}
