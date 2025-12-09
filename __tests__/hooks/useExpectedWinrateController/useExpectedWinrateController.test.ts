/**
 * Integration tests for useExpectedWinrateController hook
 *
 * Tests the controller hook's integration with existing engine contexts
 * and validates state management, caching, and calculation coordination.
 */

import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useExpectedWinrateController } from 'src/hooks/useExpectedWinrateController'
import { GameNode } from 'src/types'
import { DEFAULT_EXPECTED_WINRATE_PARAMS } from 'src/types/expectedWinrate'

// Mock engine contexts
const mockStockfishContext = {
  isReady: jest.fn(() => true),
  status: 'ready' as any,
  error: null,
  stopEvaluation: jest.fn(),
  streamEvaluations: jest.fn(),
}

const mockMaiaContext = {
  maia: {
    batchEvaluate: jest.fn().mockResolvedValue({
      result: [
        {
          policy: {
            e2e4: 0.3,
            d2d4: 0.25,
            g1f3: 0.2,
          },
        },
      ],
    }),
  },
}

// Mock React contexts
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn((context) => {
    if (context.displayName === 'StockfishEngineContext') {
      return mockStockfishContext
    }
    if (context.displayName === 'MaiaEngineContext') {
      return mockMaiaContext
    }
    return {}
  }),
}))

// Mock toast notifications
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}))

describe('useExpectedWinrateController', () => {
  // Create mock GameNode using jest mock
  const mockGameNode = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    parent: null,
    children: [],
    san: '',
    analysis: {},
  } as unknown as GameNode

  const mockInProgressAnalyses = new Set<string>()

  beforeEach(() => {
    jest.clearAllMocks()
    mockInProgressAnalyses.clear()
  })

  describe('Hook Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      expect(result.current.params).toEqual(DEFAULT_EXPECTED_WINRATE_PARAMS)
      expect(result.current.results).toEqual([])
      expect(result.current.progress.isCalculating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isEnginesReady).toBe(true) // Mocked engines are ready
    })

    it('should generate correct analysis object', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      const analysis = result.current.analysis
      expect(analysis.fen).toBe(mockGameNode.fen)
      expect(analysis.params).toEqual(DEFAULT_EXPECTED_WINRATE_PARAMS)
      expect(analysis.requiresStockfish).toBe(true)
      expect(analysis.requiresMaia).toBe(true)
      expect(analysis.maiaModel).toBe(DEFAULT_EXPECTED_WINRATE_PARAMS.maiaLevel)
    })
  })

  describe('Parameter Management', () => {
    it('should update parameters correctly', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      act(() => {
        result.current.updateParams({
          probabilityThreshold: 0.1,
          maxDepth: 4,
          maiaLevel: '1800',
        })
      })

      expect(result.current.params.probabilityThreshold).toBe(0.1)
      expect(result.current.params.maxDepth).toBe(4)
      expect(result.current.params.maiaLevel).toBe('1800')
      // Other params should remain unchanged
      expect(result.current.params.stockfishDepth).toBe(
        DEFAULT_EXPECTED_WINRATE_PARAMS.stockfishDepth,
      )
    })

    it('should clear results when parameters change', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      // Set some mock results first
      act(() => {
        result.current.results.push({
          move: 'e2e4',
          san: 'e4',
          expectedWinrate: 0.6,
          confidence: 0.8,
          tree: {} as any,
          nodeCount: 10,
          leafNodeCount: 5,
          calculationTime: 1000,
        })
      })

      act(() => {
        result.current.updateParams({ maxDepth: 5 })
      })

      expect(result.current.results).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      const cacheKey1 = result.current.generateCacheKey(
        mockGameNode.fen,
        DEFAULT_EXPECTED_WINRATE_PARAMS,
      )
      const cacheKey2 = result.current.generateCacheKey(
        mockGameNode.fen,
        DEFAULT_EXPECTED_WINRATE_PARAMS,
      )

      expect(cacheKey1).toBe(cacheKey2)
      expect(cacheKey1).toContain('expected_winrate_')
    })

    it('should generate different cache keys for different parameters', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      const params1 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS, maxDepth: 3 }
      const params2 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS, maxDepth: 4 }

      const cacheKey1 = result.current.generateCacheKey(
        mockGameNode.fen,
        params1,
      )
      const cacheKey2 = result.current.generateCacheKey(
        mockGameNode.fen,
        params2,
      )

      expect(cacheKey1).not.toBe(cacheKey2)
    })
  })

  describe('Engine Readiness', () => {
    it('should detect when engines are ready', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      expect(result.current.isEnginesReady).toBe(true)
    })

    it('should detect when engines are not ready', () => {
      // Mock engines as not ready
      const mockNotReadyStockfish = {
        isReady: jest.fn(() => false),
        status: 'initializing' as any,
        error: null,
        stopEvaluation: jest.fn(),
        streamEvaluations: jest.fn(),
      }
      const mockNotReadyMaia = { maia: null }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.mocked(React.useContext).mockImplementation((context: any) => {
        if (context.displayName === 'StockfishEngineContext') {
          return mockNotReadyStockfish
        }
        if (context.displayName === 'MaiaEngineContext') {
          return mockNotReadyMaia
        }
        return {}
      })

      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      expect(result.current.isEnginesReady).toBe(false)
    })
  })

  describe('Calculation Progress Detection', () => {
    it('should detect when calculation is in progress', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      const cacheKey = result.current.generateCacheKey(
        mockGameNode.fen,
        DEFAULT_EXPECTED_WINRATE_PARAMS,
      )
      mockInProgressAnalyses.add(cacheKey)

      // Re-render to trigger useMemo recalculation
      const { result: result2 } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      expect(result2.current.isCalculationInProgress).toBe(true)
    })

    it('should detect when calculation is not in progress', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      expect(result.current.isCalculationInProgress).toBe(false)
    })
  })

  describe('Memory Cache', () => {
    it('should initialize memory cache', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      expect(result.current.memoryCache).toBeDefined()
      expect(typeof result.current.memoryCache.get).toBe('function')
      expect(typeof result.current.memoryCache.set).toBe('function')
      expect(typeof result.current.memoryCache.clear).toBe('function')
    })

    it('should clear cache correctly', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      act(() => {
        result.current.clearCache()
      })

      // Should clear results and cache
      expect(result.current.results).toEqual([])
      expect(result.current.cache).toBeNull()
    })
  })

  describe('Auto-save Integration', () => {
    it('should initialize auto-save state correctly', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses, {
          enableAutoSave: true,
          gameId: 'test-game',
        }),
      )

      expect(result.current.isAutoSaving).toBe(false)
      expect(result.current.hasUnsavedResults).toBe(false)
    })

    it('should handle disabled auto-save', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses, {
          enableAutoSave: false,
        }),
      )

      expect(result.current.isAutoSaving).toBe(false)
      expect(result.current.hasUnsavedResults).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle null currentNode gracefully', () => {
      const { result } = renderHook(() =>
        useExpectedWinrateController(null, mockInProgressAnalyses),
      )

      expect(result.current.analysis.fen).toBe('')
      expect(result.current.isCalculationInProgress).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useExpectedWinrateController(mockGameNode, mockInProgressAnalyses),
      )

      // Start a mock calculation
      const cacheKey = result.current.generateCacheKey(
        mockGameNode.fen,
        DEFAULT_EXPECTED_WINRATE_PARAMS,
      )
      mockInProgressAnalyses.add(cacheKey)

      unmount()

      // Cleanup should have been called (we can't directly test this without more complex mocking)
      // But the test validates the hook doesn't crash on unmount
    })
  })
})
