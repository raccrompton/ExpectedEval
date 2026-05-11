/**
 * Prediction Cache for Maia Evaluations
 *
 * LRU cache that stores Maia predictions keyed by FEN to eliminate
 * redundant neural network inferences during EW calculation.
 *
 * Memory budget: ~50-100 MB for 1000 cached positions
 * Each cached entry is approximately 50-100 KB depending on policy size.
 *
 * The cache dramatically reduces Maia calls by caching:
 * - Candidate selection predictions (then reused in tree roots)
 * - Tree node predictions (reused across branches visiting same position)
 * - Parent node re-evaluations
 */

import type { MaiaEvaluation } from '../engine/types'

/** Maximum number of cached predictions (LRU eviction beyond this) */
const MAX_CACHE_SIZE = 1000

/** Internal LRU cache using Map (maintains insertion order for LRU) */
const cache = new Map<string, MaiaEvaluation>()

/** Cache statistics for monitoring */
let hits = 0
let misses = 0

/**
 * Compose the cache key from FEN + ELO. Maia predictions are
 * ELO-dependent, so two callers using the same FEN at different ELOs
 * must receive distinct cached values.
 */
function makeKey(fen: string, eloLevel?: number): string {
  return eloLevel === undefined ? fen : `${eloLevel}::${fen}`
}

/**
 * Get a cached Maia prediction for a position.
 *
 * @param fen - Position FEN string
 * @param eloLevel - Maia ELO (omit only for legacy callers / tests)
 * @returns Cached MaiaEvaluation if found, undefined otherwise
 */
export function getCachedPrediction(
  fen: string,
  eloLevel?: number,
): MaiaEvaluation | undefined {
  const key = makeKey(fen, eloLevel)
  const result = cache.get(key)

  if (result !== undefined) {
    hits++
    // Move to end of Map to mark as recently used (LRU refresh)
    cache.delete(key)
    cache.set(key, result)
    return result
  }

  misses++
  return undefined
}

/**
 * Store a Maia prediction in the cache.
 *
 * If the cache exceeds MAX_CACHE_SIZE, the least recently used
 * entry is evicted (LRU eviction policy).
 *
 * @param fen - Position FEN string
 * @param result - Maia evaluation to cache
 * @param eloLevel - Maia ELO (omit only for legacy callers / tests)
 */
export function cachePrediction(
  fen: string,
  result: MaiaEvaluation,
  eloLevel?: number,
): void {
  const key = makeKey(fen, eloLevel)

  // If already exists, delete to refresh position in Map
  if (cache.has(key)) {
    cache.delete(key)
  }

  // Evict oldest entry if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    // Map iterates in insertion order, so first key is oldest
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }

  cache.set(key, result)
}

/**
 * Clear all cached predictions.
 *
 * Call this when the position changes significantly (e.g., new game loaded)
 * or when the user changes ELO level settings.
 */
export function clearCache(): void {
  cache.clear()
  hits = 0
  misses = 0
}

/**
 * Get cache statistics for monitoring and debugging.
 *
 * @returns Object with cache size, hit/miss counts, and hit rate
 */
export function getCacheStats(): {
  size: number
  hits: number
  misses: number
  hitRate: number
} {
  const total = hits + misses
  return {
    size: cache.size,
    hits,
    misses,
    hitRate: total > 0 ? hits / total : 0,
  }
}
