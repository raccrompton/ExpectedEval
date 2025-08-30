/**
 * Expected Winrate Controller Hook
 *
 * Main controller hook that coordinates Expected Winrate analysis with existing
 * engine infrastructure. Follows the established Controller Hook + Context +
 * Presentational Components pattern used throughout the application.
 */

import {
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react'
import { Chess } from 'chess.ts'
import toast from 'react-hot-toast'

import { GameNode } from 'src/types'
import { StockfishEngineContext } from 'src/contexts/StockfishEngineContext'
import { MaiaEngineContext } from 'src/contexts/MaiaEngineContext'
import {
  ExpectedWinRateParams,
  ExpectedWinRateResult,
  ExpectedWinrateProgress,
  ExpectedWinrateAnalysis,
  ExpectedWinrateCache,
  DEFAULT_EXPECTED_WINRATE_PARAMS,
  DEFAULT_EXPECTED_WINRATE_PROGRESS,
} from 'src/types/expectedWinrate'
import { ExpectedWinrateCalculationOrchestrator } from './calculationOrchestrator'
import {
  ExpectedWinrateMemoryCache,
  generateExpectedWinrateCacheKey,
  createExpectedWinrateCache,
  shouldSaveExpectedWinrateToBackend,
} from './cacheIntegration'

export interface UseExpectedWinrateControllerOptions {
  enableAutoSave?: boolean
  gameId?: string
  gameType?: string
}

export const useExpectedWinrateController = (
  currentNode: GameNode | null,
  inProgressAnalyses: Set<string>,
  options: UseExpectedWinrateControllerOptions = {},
) => {
  const { enableAutoSave = true, gameId, gameType } = options

  // Engine contexts - reuse existing infrastructure
  const stockfish = useContext(StockfishEngineContext)
  const maia = useContext(MaiaEngineContext)

  // Core state management
  const [params, setParams] = useState<ExpectedWinRateParams>(
    DEFAULT_EXPECTED_WINRATE_PARAMS,
  )
  const [results, setResults] = useState<ExpectedWinRateResult[]>([])
  const [progress, setProgress] = useState<ExpectedWinrateProgress>(
    DEFAULT_EXPECTED_WINRATE_PROGRESS,
  )
  const [cache, setCache] = useState<ExpectedWinrateCache | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calculation control
  const calculationController = useRef<{
    abortController: AbortController | null
    currentPosition: string | null
  }>({
    abortController: null,
    currentPosition: null,
  })

  // Auto-save integration with existing patterns
  const [lastSavedCacheKey, setLastSavedCacheKey] = useState<string>('')
  const [hasUnsavedResults, setHasUnsavedResults] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Memory cache for session-based caching
  const memoryCache = useMemo(() => new ExpectedWinrateMemoryCache(), [])

  // Generate analysis object following existing patterns
  const analysis: ExpectedWinrateAnalysis = useMemo(
    () => ({
      fen: currentNode?.fen || '',
      params,
      results,
      progress,
      cache: cache || undefined,
      requiresStockfish: true,
      requiresMaia: true,
      maiaModel: params.maiaLevel,
      error: error || undefined,
      warnings: progress.warnings,
    }),
    [currentNode?.fen, params, results, progress, cache, error],
  )

  // Engine readiness checks - follow existing patterns
  const isEnginesReady = useMemo(() => {
    return stockfish.isReady() && maia.maia
  }, [stockfish, maia.maia])

  // Generate cache key for current position and params
  const generateCacheKey = useCallback(
    (fen: string, analysisParams: ExpectedWinRateParams): string => {
      const paramString = JSON.stringify({
        probabilityThreshold: analysisParams.probabilityThreshold,
        maxDepth: analysisParams.maxDepth,
        maiaLevel: analysisParams.maiaLevel,
        stockfishDepth: analysisParams.stockfishDepth,
        winrateLossThreshold: analysisParams.winrateLossThreshold,
        playerAwarePruning: analysisParams.playerAwarePruning,
        pruningThreshold: analysisParams.pruningThreshold,
      })
      return `expected_winrate_${fen}_${btoa(paramString)}`
    },
    [],
  )

  // Check if calculation is in progress for current position
  const isCalculationInProgress = useMemo(() => {
    const cacheKey = currentNode
      ? generateCacheKey(currentNode.fen, params)
      : null
    return cacheKey ? inProgressAnalyses.has(cacheKey) : false
  }, [currentNode, params, generateCacheKey, inProgressAnalyses])

  // Start Expected Winrate calculation
  const startCalculation = useCallback(async () => {
    if (!currentNode || !isEnginesReady) {
      toast.error('Position or engines not ready')
      return
    }

    const fen = currentNode.fen
    const cacheKey = generateCacheKey(fen, params)

    // Check memory cache first
    const cachedResults = memoryCache.get(fen, params)
    if (cachedResults) {
      setResults(cachedResults)
      setProgress({
        ...DEFAULT_EXPECTED_WINRATE_PROGRESS,
        isCalculating: false,
        currentPhase: 'complete',
        overallProgress: 1,
      })
      toast.success('Loaded from cache')
      return
    }

    // Prevent duplicate calculations
    if (inProgressAnalyses.has(cacheKey)) {
      return
    }

    const startTime = Date.now()

    try {
      // Reset state
      setError(null)
      setResults([])
      setProgress({
        ...DEFAULT_EXPECTED_WINRATE_PROGRESS,
        isCalculating: true,
        currentPhase: 'filtering',
        startTime,
      })

      // Mark as in progress
      inProgressAnalyses.add(cacheKey)
      calculationController.current.abortController = new AbortController()
      calculationController.current.currentPosition = fen

      // Create calculation orchestrator
      const orchestrator = new ExpectedWinrateCalculationOrchestrator(
        stockfish,
        maia,
        calculationController.current.abortController.signal,
        (progressUpdate) => {
          setProgress((prev) => ({
            ...prev,
            ...progressUpdate,
            startTime,
          }))
        },
      )

      // Execute calculation
      console.log(
        `[Expected Winrate] Starting calculation for ${fen.substring(0, 20)}... with params:`,
        params,
      )
      const calculationResults = await orchestrator.calculateExpectedWinrate(
        fen,
        params,
      )

      // Add calculation time to results
      const calculationTime = Date.now() - startTime
      const finalResults = calculationResults.map((result) => ({
        ...result,
        calculationTime,
      }))

      console.log(
        `[Expected Winrate] Calculation completed in ${calculationTime}ms. Results:`,
        finalResults.map(
          (r) =>
            `${r.san}: ${(r.expectedWinrate * 100).toFixed(1)}% (${r.confidence.toFixed(2)} confidence)`,
        ),
      )

      // Update state with results
      setResults(finalResults)
      setProgress((prev) => ({
        ...prev,
        isCalculating: false,
        currentPhase: 'complete',
        overallProgress: 1,
      }))

      // Store in memory cache
      memoryCache.set(fen, params, finalResults)

      // Mark as having unsaved results for auto-save
      if (shouldSaveExpectedWinrateToBackend(finalResults, gameType)) {
        setHasUnsavedResults(true)
      }

      toast.success(
        `Expected Winrate calculated in ${(calculationTime / 1000).toFixed(1)}s`,
      )
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setProgress((prev) => ({
        ...prev,
        isCalculating: false,
        warnings: [...prev.warnings, errorMessage],
      }))

      if (errorMessage !== 'Calculation aborted') {
        toast.error(`Calculation failed: ${errorMessage}`)
      }
    } finally {
      inProgressAnalyses.delete(cacheKey)
      calculationController.current.currentPosition = null
    }
  }, [
    currentNode,
    isEnginesReady,
    params,
    generateCacheKey,
    inProgressAnalyses,
    memoryCache,
    stockfish,
    maia,
    gameType,
  ])

  // Stop calculation
  const stopCalculation = useCallback(() => {
    if (calculationController.current.abortController) {
      calculationController.current.abortController.abort()
      calculationController.current.abortController = null
    }

    if (calculationController.current.currentPosition) {
      const cacheKey = generateCacheKey(
        calculationController.current.currentPosition,
        params,
      )
      inProgressAnalyses.delete(cacheKey)
      calculationController.current.currentPosition = null
    }

    setProgress((prev) => ({
      ...prev,
      isCalculating: false,
      currentPhase: 'filtering',
      overallProgress: 0,
    }))

    toast.success('Calculation stopped')
  }, [params, generateCacheKey, inProgressAnalyses])

  // Update parameters
  const updateParams = useCallback(
    (newParams: Partial<ExpectedWinRateParams>) => {
      setParams((prev) => ({ ...prev, ...newParams }))
      // Clear results when parameters change
      setResults([])
      setCache(null)
      setError(null)
    },
    [],
  )

  // Clear cache
  const clearCache = useCallback(() => {
    memoryCache.clear()
    setResults([])
    setCache(null)
    toast.success('Cache cleared')
  }, [memoryCache])

  // Auto-save integration (placeholder - will be implemented with cache integration)
  const saveResultsToBackend = useCallback(async () => {
    if (!enableAutoSave || !gameId || !hasUnsavedResults) {
      return
    }

    try {
      setIsAutoSaving(true)
      // TODO: Implement backend saving
      console.log('Saving Expected Winrate results to backend')
      setHasUnsavedResults(false)
    } catch (err) {
      console.warn('Failed to save Expected Winrate results:', err)
    } finally {
      setIsAutoSaving(false)
    }
  }, [enableAutoSave, gameId, hasUnsavedResults])

  // Auto-save timer following existing patterns
  useEffect(() => {
    if (hasUnsavedResults && enableAutoSave) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveResultsToBackend()
      }, 3000) // 3 second delay like existing analysis
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [hasUnsavedResults, enableAutoSave, saveResultsToBackend])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCalculation()
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [stopCalculation])

  // Mark results as unsaved when they change
  useEffect(() => {
    if (results.length > 0) {
      setHasUnsavedResults(true)
    }
  }, [results])

  return {
    // State
    analysis,
    params,
    results,
    progress,
    cache,
    error,

    // Engine status
    isEnginesReady,
    isCalculationInProgress,

    // Actions
    startCalculation,
    stopCalculation,
    updateParams,
    clearCache,

    // Auto-save status
    isAutoSaving,
    hasUnsavedResults,

    // Cache utilities
    memoryCache,
    generateCacheKey,
  }
}
