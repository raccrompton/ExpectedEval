/**
 * Unit Tests for Stockfish Engine Helper Functions
 *
 * Tests the pure helper functions extracted from the Stockfish engine.
 * The actual WASM engine is not tested here (requires browser environment).
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  computeMateInfo,
  convertToWhitePerspective,
  checkSharedArrayBufferSupport,
  createSharedMemory,
} from './stockfish'

describe('computeMateInfo', () => {
  /**
   * Test: No mate information
   * When mate_vec is undefined, isMate should be false.
   */
  it('returns isMate false when mate_vec is undefined', () => {
    const result = computeMateInfo(undefined, 'e2e4')

    expect(result.isMate).toBe(false)
    expect(result.mateIn).toBeUndefined()
  })

  /**
   * Test: Empty mate_vec
   * When mate_vec is empty object, isMate should be false.
   */
  it('returns isMate false when mate_vec is empty', () => {
    const result = computeMateInfo({}, 'e2e4')

    expect(result.isMate).toBe(false)
    expect(result.mateIn).toBeUndefined()
  })

  /**
   * Test: Best move is a mate move
   * When bestMove is in mate_vec, isMate should be true.
   */
  it('returns isMate true when bestMove has a mate value', () => {
    const mateVec = { e2e4: 3, d2d4: 5 }
    const result = computeMateInfo(mateVec, 'e2e4')

    expect(result.isMate).toBe(true)
    expect(result.mateIn).toBe(3)
  })

  /**
   * Test: Bug regression - best move is NOT a mate move
   * When mate_vec has entries but bestMove is not one of them,
   * isMate should be false (not true with undefined mateIn).
   */
  it('returns isMate false when bestMove is not in mate_vec', () => {
    // This is the bug scenario: mate_vec has entries for d2d4, but bestMove is e2e4
    const mateVec = { d2d4: 5, c2c4: 7 }
    const result = computeMateInfo(mateVec, 'e2e4')

    expect(result.isMate).toBe(false)
    expect(result.mateIn).toBeUndefined()
  })

  /**
   * Test: Invariant - isMate true implies mateIn is defined
   * This documents the required invariant that was violated by the bug.
   */
  it('never returns isMate true with undefined mateIn', () => {
    // Test various scenarios with explicit type to avoid TypeScript inference issues
    const testCases: Array<{ mateVec: Record<string, number> | undefined; bestMove: string }> = [
      { mateVec: undefined, bestMove: 'e2e4' },
      { mateVec: {}, bestMove: 'e2e4' },
      { mateVec: { d2d4: 5 }, bestMove: 'e2e4' }, // Bug case
      { mateVec: { e2e4: 3 }, bestMove: 'e2e4' },
    ]

    for (const { mateVec, bestMove } of testCases) {
      const result = computeMateInfo(mateVec, bestMove)

      // If isMate is true, mateIn must be defined
      if (result.isMate) {
        expect(result.mateIn).toBeDefined()
        expect(typeof result.mateIn).toBe('number')
      }
    }
  })
})

describe('convertToWhitePerspective', () => {
  /**
   * Test: White to move - cp stays the same
   * UCI outputs from side-to-move's perspective. When White is to move,
   * +39 cp means White is better by 0.39 pawns - no conversion needed.
   */
  it('keeps cp unchanged when White to move', () => {
    // Starting position - White to move
    const whiteFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    expect(convertToWhitePerspective(39, whiteFen)).toBe(39)
    expect(convertToWhitePerspective(-50, whiteFen)).toBe(-50)
    expect(convertToWhitePerspective(0, whiteFen)).toBe(0)
  })

  /**
   * Test: Black to move - cp gets flipped
   * UCI outputs from side-to-move's perspective. When Black is to move,
   * -39 cp (bad for Black) should become +39 cp (good for White).
   */
  it('flips cp sign when Black to move', () => {
    // After 1. e4 e5 2. Nf3 - Black to move
    const blackFen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2'

    // UCI says -39 (bad for Black) -> should be +39 (good for White)
    expect(convertToWhitePerspective(-39, blackFen)).toBe(39)

    // UCI says +39 (good for Black) -> should be -39 (bad for White)
    expect(convertToWhitePerspective(39, blackFen)).toBe(-39)

    // Zero stays zero
    expect(convertToWhitePerspective(0, blackFen)).toBe(0)
  })

  /**
   * Test: Mate scores get flipped correctly
   * Large values like +/-10000 for mate should also flip based on perspective.
   */
  it('flips mate scores correctly for Black to move', () => {
    const blackFen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2'

    // UCI says +10000 (Black is mating) -> should be -10000 (White is getting mated)
    expect(convertToWhitePerspective(10000, blackFen)).toBe(-10000)

    // UCI says -10000 (Black is getting mated) -> should be +10000 (White is mating)
    expect(convertToWhitePerspective(-10000, blackFen)).toBe(10000)
  })
})

describe('checkSharedArrayBufferSupport', () => {
  // Store original globalThis.SharedArrayBuffer to restore after tests
  const originalSharedArrayBuffer = globalThis.SharedArrayBuffer

  afterEach(() => {
    // Restore original SharedArrayBuffer after each test
    if (originalSharedArrayBuffer !== undefined) {
      globalThis.SharedArrayBuffer = originalSharedArrayBuffer
    }
  })

  /**
   * Test: SharedArrayBuffer is available
   * When SharedArrayBuffer exists in the global scope, return true.
   */
  it('returns true when SharedArrayBuffer is available', () => {
    // SharedArrayBuffer should be available in Node.js/vitest environment
    const result = checkSharedArrayBufferSupport()

    expect(result).toBe(true)
  })

  /**
   * Test: SharedArrayBuffer is undefined
   * When SharedArrayBuffer is not available (missing CORS headers), return false.
   */
  it('returns false when SharedArrayBuffer is undefined', () => {
    // Temporarily remove SharedArrayBuffer from global scope
    ;(globalThis as unknown as { SharedArrayBuffer: undefined }).SharedArrayBuffer = undefined

    const result = checkSharedArrayBufferSupport()

    expect(result).toBe(false)
  })
})

describe('createSharedMemory', () => {
  // Store original globalThis.SharedArrayBuffer to restore after tests
  const originalSharedArrayBuffer = globalThis.SharedArrayBuffer

  afterEach(() => {
    // Restore original SharedArrayBuffer after each test
    if (originalSharedArrayBuffer !== undefined) {
      globalThis.SharedArrayBuffer = originalSharedArrayBuffer
    }
  })

  /**
   * Test: Successfully creates shared memory
   * When SharedArrayBuffer is available and allocation succeeds,
   * return a valid WebAssembly.Memory instance.
   */
  it('returns WebAssembly.Memory when SharedArrayBuffer is available', () => {
    // Arrange
    const minPages = 16 // 16 * 64KB = 1MB

    // Act
    const memory = createSharedMemory(minPages)

    // Assert
    expect(memory).toBeInstanceOf(WebAssembly.Memory)
    // Verify the buffer is shared
    expect(memory.buffer).toBeInstanceOf(SharedArrayBuffer)
    // Verify minimum size (16 pages * 64KB = 1MB)
    expect(memory.buffer.byteLength).toBeGreaterThanOrEqual(minPages * 64 * 1024)
  })

  /**
   * Test: Throws descriptive error when SharedArrayBuffer unavailable
   * When SharedArrayBuffer is not available, throw an error
   * that mentions CORS headers (to help developers debug).
   */
  it('throws error mentioning CORS when SharedArrayBuffer is unavailable', () => {
    // Arrange - remove SharedArrayBuffer from global scope
    ;(globalThis as unknown as { SharedArrayBuffer: undefined }).SharedArrayBuffer = undefined

    // Act & Assert
    expect(() => createSharedMemory(16)).toThrow()

    // Verify error message mentions CORS headers for debugging help
    try {
      createSharedMemory(16)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      const errorMessage = (error as Error).message.toLowerCase()
      expect(errorMessage).toMatch(/cors|cross-origin/i)
    }
  })

  /**
   * Test: Throws descriptive error when memory allocation fails
   * When WebAssembly.Memory creation fails (e.g., requesting too many pages),
   * throw a descriptive error about memory allocation.
   */
  it('throws error when memory allocation fails', () => {
    // Arrange - request an impossibly large amount of memory
    // Max WASM memory is ~4GB (65536 pages), requesting more should fail
    const impossiblyLargePages = 100000000

    // Act & Assert
    expect(() => createSharedMemory(impossiblyLargePages)).toThrow()
  })

  /**
   * Test: Accepts different page counts
   * Verify the function works with various valid page counts.
   */
  it('accepts various valid page counts', () => {
    // Test with minimum viable allocation
    const smallMemory = createSharedMemory(1)
    expect(smallMemory.buffer.byteLength).toBeGreaterThanOrEqual(64 * 1024)

    // Test with medium allocation
    const mediumMemory = createSharedMemory(64)
    expect(mediumMemory.buffer.byteLength).toBeGreaterThanOrEqual(64 * 64 * 1024)
  })
})
