/**
 * Cache Integration for Expected Winrate Analysis
 *
 * Extends existing analysis caching infrastructure to support Expected Winrate
 * results. Integrates with existing generateAnalysisCacheKey patterns and
 * backend storage system while maintaining compatibility with current auto-save.
 */

import {
  ExpectedWinRateParams,
  ExpectedWinRateResult,
  ExpectedWinrateCache,
} from 'src/types/expectedWinrate'
import { generateAnalysisCacheKey } from 'src/lib/analysisStorage'
import { EngineAnalysisPosition } from 'src/api/analysis/analysis'

/**
 * Generate cache key for Expected Winrate analysis extending existing patterns
 */
export const generateExpectedWinrateCacheKey = (
  fen: string,
  params: ExpectedWinRateParams,
): string => {
  // Create consistent parameter hash
  const paramHash = {
    probabilityThreshold: params.probabilityThreshold,
    maxDepth: params.maxDepth,
    maiaLevel: params.maiaLevel,
    stockfishDepth: params.stockfishDepth,
    winrateLossThreshold: params.winrateLossThreshold,
    playerAwarePruning: params.playerAwarePruning,
    pruningThreshold: params.pruningThreshold,
  }

  // Use base64 encoding for compact, URL-safe cache keys
  const paramString = btoa(JSON.stringify(paramHash))

  return `expected_winrate_${fen.replace(/\s+/g, '_')}_${paramString}`
}

/**
 * Create Expected Winrate cache entry
 */
export const createExpectedWinrateCache = (
  fen: string,
  params: ExpectedWinRateParams,
  results: ExpectedWinRateResult[],
): ExpectedWinrateCache => {
  return {
    fen,
    params: { ...params }, // Deep copy to prevent mutations
    results: results.map((result) => ({ ...result })), // Deep copy results
    timestamp: Date.now(),
    cacheKey: generateExpectedWinrateCacheKey(fen, params),
  }
}

/**
 * Validate cache entry against current parameters
 */
export const isValidCache = (
  cache: ExpectedWinrateCache,
  currentFen: string,
  currentParams: ExpectedWinRateParams,
  maxCacheAge: number = 24 * 60 * 60 * 1000, // 24 hours default
): boolean => {
  // Check if cache is too old
  if (Date.now() - cache.timestamp > maxCacheAge) {
    return false
  }

  // Check if FEN matches
  if (cache.fen !== currentFen) {
    return false
  }

  // Check if parameters match exactly
  return areParametersEqual(cache.params, currentParams)
}

/**
 * Compare Expected Winrate parameters for equality
 */
export const areParametersEqual = (
  params1: ExpectedWinRateParams,
  params2: ExpectedWinRateParams,
): boolean => {
  return (
    params1.probabilityThreshold === params2.probabilityThreshold &&
    params1.maxDepth === params2.maxDepth &&
    params1.maiaLevel === params2.maiaLevel &&
    params1.stockfishDepth === params2.stockfishDepth &&
    params1.winrateLossThreshold === params2.winrateLossThreshold &&
    params1.playerAwarePruning === params2.playerAwarePruning &&
    params1.pruningThreshold === params2.pruningThreshold
  )
}

/**
 * Convert Expected Winrate results to EngineAnalysisPosition format
 * for integration with existing backend storage system
 * Note: Extended interface will be needed to store expectedWinrate data
 */
export const convertResultsToAnalysisData = (
  results: ExpectedWinRateResult[],
  rootFen: string,
  params: ExpectedWinRateParams,
): EngineAnalysisPosition[] => {
  if (results.length === 0) {
    return []
  }

  // Create synthetic analysis position using existing interface
  // Note: This will need backend API extension to store Expected Winrate data
  const analysisPosition: EngineAnalysisPosition = {
    ply: 0, // Expected Winrate is position-specific, not move-specific
    fen: rootFen,
    // Use stockfish field to store minimal data for now
    stockfish: {
      depth: params.stockfishDepth,
      cp_vec: results.reduce(
        (acc, result) => {
          // Store expected winrate as synthetic cp value
          acc[result.move] = Math.round((result.expectedWinrate - 0.5) * 1000)
          return acc
        },
        {} as { [move: string]: number },
      ),
    },
  }

  return [analysisPosition]
}

/**
 * Extract Expected Winrate results from analysis data
 */
export const extractResultsFromAnalysisData = (
  analysisData: EngineAnalysisPosition[],
  targetFen: string,
): ExpectedWinRateResult[] | null => {
  const position = analysisData.find((pos) => pos.fen === targetFen)

  if (!position?.stockfish?.cp_vec) {
    return null
  }

  // Convert synthetic cp values back to Expected Winrate results
  const results = Object.entries(position.stockfish.cp_vec).map(
    ([move, cp]) => ({
      move,
      san: move, // SAN not stored in current format
      expectedWinrate: cp / 1000 + 0.5, // Convert back from synthetic cp
      confidence: 1.0, // Not stored in current format
      nodeCount: 0, // Not stored in current format
      leafNodeCount: 0, // Not stored in current format
      calculationTime: 0, // Not stored in current format
      tree: createPlaceholderTree({ move }), // Trees not stored in backend
    }),
  )

  return results
}

/**
 * Create placeholder tree for cached results (trees are not stored in backend)
 */
const createPlaceholderTree = (result: any) => {
  return {
    id: `cached_${result.move}`,
    move: result.move,
    san: result.san,
    fen: '', // Not available in cached data
    probability: 1.0,
    cumulativeProbability: 1.0,
    parent: null,
    children: [],
    depth: 0,
    isLeafNode: true,
    isPruned: false,
  }
}

/**
 * Memory-based cache for Expected Winrate results during session
 */
export class ExpectedWinrateMemoryCache {
  private cache = new Map<string, ExpectedWinrateCache>()
  private readonly maxEntries: number
  private readonly maxAge: number

  constructor(maxEntries = 50, maxAge: number = 60 * 60 * 1000) {
    // 1 hour
    this.maxEntries = maxEntries
    this.maxAge = maxAge
  }

  /**
   * Get cached results if valid
   */
  get(
    fen: string,
    params: ExpectedWinRateParams,
  ): ExpectedWinRateResult[] | null {
    const cacheKey = generateExpectedWinrateCacheKey(fen, params)
    const cached = this.cache.get(cacheKey)

    if (!cached) {
      return null
    }

    if (!isValidCache(cached, fen, params, this.maxAge)) {
      this.cache.delete(cacheKey)
      return null
    }

    return cached.results
  }

  /**
   * Store results in cache
   */
  set(
    fen: string,
    params: ExpectedWinRateParams,
    results: ExpectedWinRateResult[],
  ): void {
    const cache = createExpectedWinrateCache(fen, params, results)

    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldestEntries()
    }

    this.cache.set(cache.cacheKey, cache)
  }

  /**
   * Check if results are cached and valid
   */
  has(fen: string, params: ExpectedWinRateParams): boolean {
    return this.get(fen, params) !== null
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxEntries: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hitRate: 0, // Would need to track hits/misses for this
    }
  }

  /**
   * Evict oldest entries when at capacity
   */
  private evictOldestEntries(): void {
    if (this.cache.size === 0) return

    // Find oldest entry
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, cache] of this.cache.entries()) {
      if (cache.timestamp < oldestTime) {
        oldestTime = cache.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * Integration with existing analysis auto-save system
 */
export const shouldSaveExpectedWinrateToBackend = (
  results: ExpectedWinRateResult[],
  gameType?: string,
): boolean => {
  // Don't save for custom games (following existing pattern)
  if (
    gameType === 'custom-pgn' ||
    gameType === 'custom-fen' ||
    gameType === 'tournament'
  ) {
    return false
  }

  // Only save if we have meaningful results
  if (results.length === 0) {
    return false
  }

  // Only save if results have good confidence
  const averageConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length
  return averageConfidence > 0.5 // At least 50% confidence
}

/**
 * Generate cache key compatible with existing analysis cache key format
 */
export const generateCompatibleCacheKey = (
  fen: string,
  params: ExpectedWinRateParams,
): string => {
  // Create synthetic analysis data to reuse existing cache key generation
  const syntheticAnalysisData: EngineAnalysisPosition[] = [
    {
      ply: 0,
      fen,
      stockfish: {
        depth: params.stockfishDepth,
        cp_vec: {},
      },
    },
  ]

  // Use existing cache key generation with modification for Expected Winrate
  const baseKey = generateAnalysisCacheKey(syntheticAnalysisData)
  return `ew_${baseKey}` // Prefix to distinguish Expected Winrate cache keys
}
