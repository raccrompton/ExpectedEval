/**
 * Unit Tests for PGN Annotation Parsing and Serialization
 *
 * These tests verify that our annotation module correctly:
 * 1. Parses annotations from PGN comments
 * 2. Serializes annotations back to PGN format
 * 3. Handles edge cases (empty input, malformed data, etc.)
 *
 * Testing philosophy:
 * - Each test should test ONE specific behavior
 * - Test names describe the expected behavior
 * - Tests are independent (no shared state)
 */

import { describe, it, expect } from 'vitest'
import {
  parseAnnotations,
  parseAnnotationsFromComments,
  serializeAnnotations,
  stripAnnotations,
} from './annotations'

// ============================================================================
// parseAnnotations() tests
// ============================================================================

describe('parseAnnotations', () => {
  /**
   * Test: Basic annotation parsing
   * Verify that we can parse a comment with all annotation types.
   */
  it('parses all annotation types from a comment', () => {
    // Arrange: Create a comment with all annotation types
    const comment = '{[%prob 0.35][%eval 0.52][%ew 0.54][%cp 28]}'

    // Act: Parse the comment
    const result = parseAnnotations(comment)

    // Assert: All values should be extracted correctly
    expect(result.prob).toBeCloseTo(0.35)
    expect(result.eval).toBeCloseTo(0.52)
    expect(result.ew).toBeCloseTo(0.54)
    expect(result.cp).toBe(28)
  })

  /**
   * Test: Partial annotations
   * Not all comments have all annotation types.
   */
  it('parses partial annotations', () => {
    // Only probability annotation
    const result = parseAnnotations('{[%prob 0.45]}')

    expect(result.prob).toBeCloseTo(0.45)
    expect(result.eval).toBeUndefined()
    expect(result.ew).toBeUndefined()
    expect(result.cp).toBeUndefined()
  })

  /**
   * Test: Comments without annotations
   * Regular comments should return an empty object.
   */
  it('returns empty object for comments without annotations', () => {
    const result = parseAnnotations('Great move!')

    expect(result).toEqual({})
  })

  /**
   * Test: Empty string input
   * Edge case: empty input should not crash.
   */
  it('handles empty string', () => {
    const result = parseAnnotations('')

    expect(result).toEqual({})
  })

  /**
   * Test: Mixed content
   * Comments can have both annotations and regular text.
   */
  it('parses annotations from mixed content', () => {
    const comment = '{[%prob 0.35]} This is a great move! {[%eval 0.52]}'

    const result = parseAnnotations(comment)

    expect(result.prob).toBeCloseTo(0.35)
    expect(result.eval).toBeCloseTo(0.52)
  })

  /**
   * Test: Negative centipawn values
   * Black advantage is represented as negative centipawns.
   */
  it('parses negative centipawn values', () => {
    const result = parseAnnotations('{[%cp -150]}')

    expect(result.cp).toBe(-150)
  })

  /**
   * Test: Decimal centipawn values get rounded
   * Centipawns should be integers.
   */
  it('rounds centipawn values to integers', () => {
    const result = parseAnnotations('{[%cp 28.7]}')

    expect(result.cp).toBe(29)
  })

  /**
   * Test: Clamping out-of-range probability values
   * Probabilities must be between 0 and 1.
   */
  it('clamps probability values to valid range', () => {
    // Value above 1 should be clamped to 1
    const high = parseAnnotations('{[%prob 1.5]}')
    expect(high.prob).toBe(1)

    // Value below 0 should be clamped to 0
    const low = parseAnnotations('{[%prob -0.5]}')
    expect(low.prob).toBe(0)
  })

  /**
   * Test: Case insensitivity
   * Annotation names should work regardless of case.
   */
  it('handles case-insensitive annotation names', () => {
    const result = parseAnnotations('{[%PROB 0.35][%Eval 0.52]}')

    expect(result.prob).toBeCloseTo(0.35)
    expect(result.eval).toBeCloseTo(0.52)
  })

  /**
   * Test: Ignores unknown annotations
   * We should not parse annotations we don't recognize.
   */
  it('ignores unknown annotation types', () => {
    const result = parseAnnotations('{[%unknown 123][%prob 0.35]}')

    expect(result.prob).toBeCloseTo(0.35)
    expect(result).not.toHaveProperty('unknown')
  })

  /**
   * Test: Malformed annotation values
   * Non-numeric values should be skipped, not crash.
   */
  it('skips annotations with non-numeric values', () => {
    const result = parseAnnotations('{[%prob abc][%eval 0.52]}')

    expect(result.prob).toBeUndefined()
    expect(result.eval).toBeCloseTo(0.52)
  })

  /**
   * Test: Extra whitespace
   * Should handle various whitespace patterns.
   */
  it('handles extra whitespace in annotations', () => {
    const result = parseAnnotations('{[%prob   0.35  ]}')

    expect(result.prob).toBeCloseTo(0.35)
  })
})

// ============================================================================
// parseAnnotationsFromComments() tests
// ============================================================================

describe('parseAnnotationsFromComments', () => {
  /**
   * Test: Merging multiple comments
   * Annotations spread across comments should be combined.
   */
  it('merges annotations from multiple comments', () => {
    const comments = ['{[%prob 0.35]}', '{[%eval 0.52]}']

    const result = parseAnnotationsFromComments(comments)

    expect(result.prob).toBeCloseTo(0.35)
    expect(result.eval).toBeCloseTo(0.52)
  })

  /**
   * Test: Later comments override earlier ones
   * If the same annotation appears twice, last one wins.
   */
  it('later comments override earlier annotations', () => {
    const comments = ['{[%prob 0.35]}', '{[%prob 0.50]}']

    const result = parseAnnotationsFromComments(comments)

    expect(result.prob).toBeCloseTo(0.50)
  })

  /**
   * Test: Undefined input
   * Should handle undefined gracefully (chessops may return undefined).
   */
  it('handles undefined comments array', () => {
    const result = parseAnnotationsFromComments(undefined)

    expect(result).toEqual({})
  })

  /**
   * Test: Empty array
   * Empty array should return empty object.
   */
  it('handles empty comments array', () => {
    const result = parseAnnotationsFromComments([])

    expect(result).toEqual({})
  })
})

// ============================================================================
// serializeAnnotations() tests
// ============================================================================

describe('serializeAnnotations', () => {
  /**
   * Test: Serialize all annotation types
   * All values should be formatted correctly.
   */
  it('serializes all annotation types', () => {
    const annotations = { prob: 0.35, eval: 0.52, ew: 0.54, cp: 28 }

    const result = serializeAnnotations(annotations)

    expect(result).toBe('[%prob 0.35][%eval 0.52][%ew 0.54][%cp 28]')
  })

  /**
   * Test: Serialize partial annotations
   * Only defined values should be included.
   */
  it('serializes partial annotations', () => {
    const annotations = { prob: 0.45 }

    const result = serializeAnnotations(annotations)

    expect(result).toBe('[%prob 0.45]')
  })

  /**
   * Test: Empty annotations
   * Should return empty string, not undefined or null.
   */
  it('returns empty string for empty annotations', () => {
    const result = serializeAnnotations({})

    expect(result).toBe('')
  })

  /**
   * Test: Decimal precision
   * Values should be formatted to reasonable precision.
   */
  it('formats values to 2 decimal places', () => {
    const annotations = { prob: 0.333333 }

    const result = serializeAnnotations(annotations)

    expect(result).toBe('[%prob 0.33]')
  })

  /**
   * Test: Removes trailing zeros
   * 0.50 should become 0.5 for cleaner output.
   */
  it('removes trailing zeros', () => {
    const annotations = { prob: 0.5, eval: 0.10 }

    const result = serializeAnnotations(annotations)

    expect(result).toBe('[%prob 0.5][%eval 0.1]')
  })

  /**
   * Test: Negative centipawns
   * Should preserve sign for black advantage.
   */
  it('handles negative centipawn values', () => {
    const annotations = { cp: -150 }

    const result = serializeAnnotations(annotations)

    expect(result).toBe('[%cp -150]')
  })

  /**
   * Test: Consistent ordering
   * Output order should be: prob, eval, ew, cp
   */
  it('maintains consistent annotation order', () => {
    // Provide annotations in different order
    const annotations = { cp: 28, ew: 0.54, prob: 0.35, eval: 0.52 }

    const result = serializeAnnotations(annotations)

    // Should always be in this order regardless of input
    expect(result).toBe('[%prob 0.35][%eval 0.52][%ew 0.54][%cp 28]')
  })
})

// ============================================================================
// stripAnnotations() tests
// ============================================================================

describe('stripAnnotations', () => {
  /**
   * Test: Remove annotations from mixed content
   * Should leave regular text intact.
   */
  it('removes annotations leaving regular text', () => {
    const comment = '{[%prob 0.35][%eval 0.52]} Great move!'

    const result = stripAnnotations(comment)

    expect(result).toBe('Great move!')
  })

  /**
   * Test: Only annotations
   * Comment with only annotations should become empty.
   */
  it('returns empty string when only annotations', () => {
    const comment = '{[%prob 0.35][%eval 0.52]}'

    const result = stripAnnotations(comment)

    expect(result).toBe('')
  })

  /**
   * Test: No annotations
   * Regular text should be unchanged.
   */
  it('leaves regular text unchanged', () => {
    const comment = 'This is a great move!'

    const result = stripAnnotations(comment)

    expect(result).toBe('This is a great move!')
  })

  /**
   * Test: Empty input
   * Should handle gracefully.
   */
  it('handles empty string', () => {
    const result = stripAnnotations('')

    expect(result).toBe('')
  })
})

// ============================================================================
// Round-trip tests (parse → serialize → parse)
// ============================================================================

describe('round-trip serialization', () => {
  /**
   * Test: Parse and serialize should be reversible
   * This ensures our serialization produces parseable output.
   */
  it('serialized annotations can be parsed back', () => {
    // Original annotations
    const original = { prob: 0.35, eval: 0.52, ew: 0.54, cp: 28 }

    // Serialize to string
    const serialized = serializeAnnotations(original)

    // Parse back
    const parsed = parseAnnotations(serialized)

    // Should match original values
    expect(parsed.prob).toBeCloseTo(original.prob)
    expect(parsed.eval).toBeCloseTo(original.eval)
    expect(parsed.ew).toBeCloseTo(original.ew)
    expect(parsed.cp).toBe(original.cp)
  })

  /**
   * Test: Multiple round-trips
   * Multiple serialize/parse cycles should be stable.
   */
  it('multiple round-trips are stable', () => {
    const original = { prob: 0.33, eval: 0.51 }

    // First round-trip
    const first = parseAnnotations(serializeAnnotations(original))

    // Second round-trip
    const second = parseAnnotations(serializeAnnotations(first))

    // Values should be stable
    expect(second.prob).toBeCloseTo(first.prob!)
    expect(second.eval).toBeCloseTo(first.eval!)
  })
})
