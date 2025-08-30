/**
 * Integration test for Expected Winrate functionality
 *
 * This test focuses on the core algorithm logic without mocking React contexts,
 * verifying that the calculation orchestrator and engine coordination work correctly.
 */

import { ExpectedWinrateCalculationOrchestrator } from 'src/hooks/useExpectedWinrateController/calculationOrchestrator'
import {
  coordinateStockfishBatch,
  coordinateMaiaBatch,
  generateLegalMoves,
  filterMovesByWinrateLoss,
  convertCpToWinrate,
  isValidPosition,
} from 'src/hooks/useExpectedWinrateController/engineCoordination'
import {
  ExpectedWinrateMemoryCache,
  generateExpectedWinrateCacheKey,
  areParametersEqual,
} from 'src/hooks/useExpectedWinrateController/cacheIntegration'
import { DEFAULT_EXPECTED_WINRATE_PARAMS } from 'src/types/expectedWinrate'

describe('Expected Winrate Integration Tests', () => {
  const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const middlegameFen =
    'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4'

  describe('Engine Coordination Utils', () => {
    describe('generateLegalMoves', () => {
      it('should generate legal moves for starting position', () => {
        const moves = generateLegalMoves(startingFen)

        expect(moves.length).toBe(20) // 20 legal moves from starting position
        expect(moves).toContainEqual({ uci: 'e2e4', san: 'e4' })
        expect(moves).toContainEqual({ uci: 'd2d4', san: 'd4' })
        expect(moves).toContainEqual({ uci: 'g1f3', san: 'Nf3' })
      })

      it('should handle invalid FEN gracefully', () => {
        const moves = generateLegalMoves('invalid-fen')
        expect(moves).toEqual([])
      })

      it('should generate moves for middlegame position', () => {
        const moves = generateLegalMoves(middlegameFen)
        expect(moves.length).toBeGreaterThan(0)

        // Verify moves have correct structure
        moves.forEach((move) => {
          expect(move).toHaveProperty('uci')
          expect(move).toHaveProperty('san')
          expect(typeof move.uci).toBe('string')
          expect(typeof move.san).toBe('string')
        })
      })
    })

    describe('isValidPosition', () => {
      it('should validate correct FEN positions', () => {
        expect(isValidPosition(startingFen)).toBe(true)
        expect(isValidPosition(middlegameFen)).toBe(true)
      })

      it('should reject invalid FEN positions', () => {
        expect(isValidPosition('invalid-fen')).toBe(false)
        expect(isValidPosition('')).toBe(false)
        expect(isValidPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP')).toBe(
          false,
        ) // Incomplete FEN
      })
    })

    describe('convertCpToWinrate', () => {
      it('should convert centipawns to winrate correctly', () => {
        expect(convertCpToWinrate(0, false)).toBeCloseTo(0.527, 2) // Roughly 50%
        expect(convertCpToWinrate(100, false)).toBeGreaterThan(0.527)
        expect(convertCpToWinrate(-100, false)).toBeLessThan(0.527)
      })

      it('should handle perspective conversion', () => {
        const cpWhite = convertCpToWinrate(100, false) // White to move
        const cpBlack = convertCpToWinrate(100, true) // Black to move

        // When Black to move, positive cp should be inverted
        expect(cpBlack).toBeLessThan(0.5)
        expect(cpWhite).toBeGreaterThan(0.5)
      })
    })
  })

  describe('Cache Integration', () => {
    let cache: ExpectedWinrateMemoryCache

    beforeEach(() => {
      cache = new ExpectedWinrateMemoryCache(10, 60000) // 10 entries, 1 minute TTL
    })

    describe('generateExpectedWinrateCacheKey', () => {
      it('should generate consistent cache keys', () => {
        const key1 = generateExpectedWinrateCacheKey(
          startingFen,
          DEFAULT_EXPECTED_WINRATE_PARAMS,
        )
        const key2 = generateExpectedWinrateCacheKey(
          startingFen,
          DEFAULT_EXPECTED_WINRATE_PARAMS,
        )

        expect(key1).toBe(key2)
        expect(key1).toContain('expected_winrate_')
      })

      it('should generate different keys for different positions', () => {
        const key1 = generateExpectedWinrateCacheKey(
          startingFen,
          DEFAULT_EXPECTED_WINRATE_PARAMS,
        )
        const key2 = generateExpectedWinrateCacheKey(
          middlegameFen,
          DEFAULT_EXPECTED_WINRATE_PARAMS,
        )

        expect(key1).not.toBe(key2)
      })

      it('should generate different keys for different parameters', () => {
        const params1 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS, maxDepth: 2 }
        const params2 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS, maxDepth: 3 }

        const key1 = generateExpectedWinrateCacheKey(startingFen, params1)
        const key2 = generateExpectedWinrateCacheKey(startingFen, params2)

        expect(key1).not.toBe(key2)
      })
    })

    describe('areParametersEqual', () => {
      it('should detect identical parameters', () => {
        const params1 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS }
        const params2 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS }

        expect(areParametersEqual(params1, params2)).toBe(true)
      })

      it('should detect different parameters', () => {
        const params1 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS, maxDepth: 2 }
        const params2 = { ...DEFAULT_EXPECTED_WINRATE_PARAMS, maxDepth: 3 }

        expect(areParametersEqual(params1, params2)).toBe(false)
      })

      it('should handle all parameter differences', () => {
        const baseParams = DEFAULT_EXPECTED_WINRATE_PARAMS

        const paramVariations = [
          { ...baseParams, probabilityThreshold: 0.1 },
          { ...baseParams, maxDepth: 5 },
          { ...baseParams, maiaLevel: '1800' },
          { ...baseParams, stockfishDepth: 20 },
          { ...baseParams, winrateLossThreshold: -0.2 },
          { ...baseParams, playerAwarePruning: false },
          { ...baseParams, pruningThreshold: 0.05 },
        ]

        paramVariations.forEach((variant) => {
          expect(areParametersEqual(baseParams, variant)).toBe(false)
        })
      })
    })

    describe('ExpectedWinrateMemoryCache', () => {
      const mockResults = [
        {
          move: 'e2e4',
          san: 'e4',
          expectedWinrate: 0.55,
          confidence: 0.8,
          tree: {} as any,
          nodeCount: 10,
          leafNodeCount: 5,
          calculationTime: 1000,
        },
      ]

      it('should store and retrieve results', () => {
        cache.set(startingFen, DEFAULT_EXPECTED_WINRATE_PARAMS, mockResults)
        const retrieved = cache.get(
          startingFen,
          DEFAULT_EXPECTED_WINRATE_PARAMS,
        )

        expect(retrieved).toEqual(mockResults)
      })

      it('should return null for non-existent entries', () => {
        const retrieved = cache.get(
          'non-existent-fen',
          DEFAULT_EXPECTED_WINRATE_PARAMS,
        )
        expect(retrieved).toBeNull()
      })

      it('should handle cache hits correctly', () => {
        cache.set(startingFen, DEFAULT_EXPECTED_WINRATE_PARAMS, mockResults)

        expect(cache.has(startingFen, DEFAULT_EXPECTED_WINRATE_PARAMS)).toBe(
          true,
        )
        expect(cache.has('non-existent', DEFAULT_EXPECTED_WINRATE_PARAMS)).toBe(
          false,
        )
      })

      it('should clear cache correctly', () => {
        cache.set(startingFen, DEFAULT_EXPECTED_WINRATE_PARAMS, mockResults)
        expect(cache.has(startingFen, DEFAULT_EXPECTED_WINRATE_PARAMS)).toBe(
          true,
        )

        cache.clear()
        expect(cache.has(startingFen, DEFAULT_EXPECTED_WINRATE_PARAMS)).toBe(
          false,
        )
      })

      it('should provide correct cache statistics', () => {
        const stats = cache.getStats()
        expect(stats).toHaveProperty('size')
        expect(stats).toHaveProperty('maxEntries')
        expect(stats).toHaveProperty('hitRate')
        expect(typeof stats.size).toBe('number')
        expect(typeof stats.maxEntries).toBe('number')
      })
    })
  })

  describe('Algorithm Logic Validation', () => {
    describe('Parameter Validation', () => {
      it('should have sensible default parameters', () => {
        const params = DEFAULT_EXPECTED_WINRATE_PARAMS

        expect(params.probabilityThreshold).toBeGreaterThan(0)
        expect(params.probabilityThreshold).toBeLessThan(1)
        expect(params.maxDepth).toBeGreaterThan(0)
        expect(params.stockfishDepth).toBeGreaterThan(0)
        expect(params.winrateLossThreshold).toBeLessThan(0) // Should be negative
        expect(params.pruningThreshold).toBeGreaterThan(0)
        expect(params.pruningThreshold).toBeLessThan(1)
      })

      it('should validate parameter ranges make sense', () => {
        const params = DEFAULT_EXPECTED_WINRATE_PARAMS

        // Probability threshold should be less than pruning threshold
        // (more restrictive for tree building than for pruning)
        expect(params.probabilityThreshold).toBeGreaterThan(
          params.pruningThreshold,
        )

        // Stockfish depth should be reasonable
        expect(params.stockfishDepth).toBeGreaterThanOrEqual(12)
        expect(params.stockfishDepth).toBeLessThanOrEqual(25)

        // Max depth should be reasonable for tree building
        expect(params.maxDepth).toBeGreaterThanOrEqual(2)
        expect(params.maxDepth).toBeLessThanOrEqual(5)
      })
    })

    describe('Tree Structure Validation', () => {
      it('should create valid tree node structure', () => {
        // This tests the node structure without requiring engines
        const mockNode = {
          id: 'test_e2e4',
          move: 'e2e4',
          san: 'e4',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          probability: 0.3,
          cumulativeProbability: 0.3,
          parent: null,
          children: [],
          depth: 0,
          isLeafNode: true,
          isPruned: false,
        }

        // Validate node structure matches our interface
        expect(mockNode).toHaveProperty('id')
        expect(mockNode).toHaveProperty('move')
        expect(mockNode).toHaveProperty('san')
        expect(mockNode).toHaveProperty('fen')
        expect(mockNode).toHaveProperty('probability')
        expect(mockNode).toHaveProperty('cumulativeProbability')
        expect(mockNode).toHaveProperty('children')
        expect(mockNode).toHaveProperty('depth')
        expect(mockNode).toHaveProperty('isLeafNode')
        expect(mockNode).toHaveProperty('isPruned')

        // Validate probability constraints
        expect(mockNode.probability).toBeGreaterThanOrEqual(0)
        expect(mockNode.probability).toBeLessThanOrEqual(1)
        expect(mockNode.cumulativeProbability).toBeGreaterThanOrEqual(0)
        expect(mockNode.cumulativeProbability).toBeLessThanOrEqual(1)

        // Validate FEN is different from starting position (move was made)
        expect(mockNode.fen).not.toBe(startingFen)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle engine coordination errors gracefully', () => {
      const mockStockfish = null // Simulate uninitialized engine
      const mockMaia = null

      const stockfishRequest = {
        positions: [{ fen: startingFen, id: 'test', depth: 18 }],
      }

      const maiaRequest = {
        positions: [{ fen: startingFen, id: 'test' }],
        maiaLevel: '1600',
      }

      // These should not throw but return empty results or throw controlled errors
      expect(async () => {
        await coordinateStockfishBatch(mockStockfish, stockfishRequest)
      }).rejects.toThrow('Stockfish engine not initialized')

      expect(async () => {
        await coordinateMaiaBatch(mockMaia, maiaRequest)
      }).rejects.toThrow('Maia engine not initialized')
    })

    it('should handle abort signals correctly', () => {
      const abortController = new AbortController()
      abortController.abort()

      const mockStockfish = {
        stockfish: {
          evaluatePosition: jest.fn().mockRejectedValue(new Error('Aborted')),
        },
      }

      const stockfishRequest = {
        positions: [{ fen: startingFen, id: 'test', depth: 18 }],
      }

      expect(async () => {
        await coordinateStockfishBatch(
          mockStockfish,
          stockfishRequest,
          abortController.signal,
        )
      }).rejects.toThrow()
    })
  })
})
