/**
 * PGN Annotation Parsing and Serialization
 *
 * This module handles parsing and serializing custom annotations
 * embedded in PGN comments. These annotations store engine data
 * like Maia probabilities and Stockfish evaluations.
 *
 * Format: {[%prob 0.35][%eval 0.52][%ew 0.54][%cp 28]}
 *
 * This follows PGN standard extension conventions where custom
 * data is stored in comments using [%name value] syntax.
 *
 * Dependencies: None (pure functions, no external libraries)
 */

import type { ParsedAnnotations } from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Regular expression to match individual annotations in a comment.
 *
 * Pattern breakdown:
 * - \[%        - Literal "[%" (start of annotation)
 * - (\w+)      - Capture group 1: annotation name (letters/numbers/underscore)
 * - \s+        - One or more whitespace characters
 * - ([^\]]+)   - Capture group 2: annotation value (anything except "]")
 * - \]         - Literal "]" (end of annotation)
 *
 * The 'g' flag makes it match all occurrences in the string.
 *
 * Example match: "[%prob 0.35]" → groups: ["prob", "0.35"]
 */
const ANNOTATION_REGEX = /\[%(\w+)\s+([^\]]+)\]/g

/**
 * Supported annotation names.
 *
 * We only parse these specific annotations to avoid
 * accidentally interpreting other PGN extensions.
 */
const SUPPORTED_ANNOTATIONS = new Set(['prob', 'eval', 'ew', 'cp'])

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse annotations from a PGN comment string.
 *
 * Takes a comment like "{[%prob 0.35][%eval 0.52]} Great move!"
 * and extracts the annotation values into a structured object.
 *
 * @param comment - A PGN comment string (may or may not contain annotations)
 * @returns Parsed annotation values (only present if found in comment)
 *
 * @example
 * // Full annotation set
 * parseAnnotations("{[%prob 0.35][%eval 0.52][%ew 0.54]}")
 * // Returns: { prob: 0.35, eval: 0.52, ew: 0.54 }
 *
 * @example
 * // Partial annotations
 * parseAnnotations("{[%prob 0.35]}")
 * // Returns: { prob: 0.35 }
 *
 * @example
 * // No annotations
 * parseAnnotations("Just a regular comment")
 * // Returns: {}
 */
export function parseAnnotations(comment: string): ParsedAnnotations {
  // Initialize empty result object
  // We'll add properties as we find them in the comment
  const result: ParsedAnnotations = {}

  // Reset regex lastIndex to ensure we start from the beginning
  // This is necessary because the regex has the 'g' flag
  ANNOTATION_REGEX.lastIndex = 0

  // Iterate through all matches in the comment
  // exec() with 'g' flag returns each match sequentially
  let match: RegExpExecArray | null
  while ((match = ANNOTATION_REGEX.exec(comment)) !== null) {
    // match[0] = full match, e.g., "[%prob 0.35]"
    // match[1] = first capture group (name), e.g., "prob"
    // match[2] = second capture group (value), e.g., "0.35"
    const name = match[1].toLowerCase()
    const value = match[2].trim()

    // Only process annotations we recognize
    // This prevents us from misinterpreting other PGN extensions
    if (!SUPPORTED_ANNOTATIONS.has(name)) {
      continue
    }

    // Parse the value based on annotation type
    // All our annotations are numeric, but we validate carefully
    const numericValue = parseFloat(value)

    // Skip if the value isn't a valid number
    // NaN check: parseFloat("abc") returns NaN
    if (isNaN(numericValue)) {
      continue
    }

    // Assign the parsed value to the appropriate property
    switch (name) {
      case 'prob':
        // Probability should be between 0 and 1
        // Clamp to valid range in case of malformed data
        result.prob = clamp(numericValue, 0, 1)
        break
      case 'eval':
        // Evaluation (winrate) should be between 0 and 1
        result.eval = clamp(numericValue, 0, 1)
        break
      case 'ew':
        // Expected Winrate should be between 0 and 1
        result.ew = clamp(numericValue, 0, 1)
        break
      case 'cp':
        // Centipawns can be any integer (positive for white advantage)
        // Round to integer since centipawns are discrete
        result.cp = Math.round(numericValue)
        break
    }
  }

  return result
}

/**
 * Parse annotations from an array of PGN comments.
 *
 * chessops stores node comments as an array of strings.
 * This function parses all comments and merges the results.
 *
 * @param comments - Array of comment strings from a PGN node
 * @returns Merged annotations from all comments
 *
 * @example
 * parseAnnotationsFromComments([
 *   "{[%prob 0.35]}",
 *   "{[%eval 0.52]}"
 * ])
 * // Returns: { prob: 0.35, eval: 0.52 }
 */
export function parseAnnotationsFromComments(
  comments: string[] | undefined
): ParsedAnnotations {
  // Handle undefined or empty comments array
  if (!comments || comments.length === 0) {
    return {}
  }

  // Parse each comment and merge results
  // Later comments override earlier ones if there's a conflict
  let result: ParsedAnnotations = {}

  for (const comment of comments) {
    const parsed = parseAnnotations(comment)
    // Spread operator merges objects, with later values overriding
    result = { ...result, ...parsed }
  }

  return result
}

// ============================================================================
// SERIALIZATION FUNCTIONS
// ============================================================================

/**
 * Serialize annotations to a PGN comment string.
 *
 * Takes structured annotation data and converts it to the
 * standard PGN comment format with [%name value] syntax.
 *
 * @param annotations - The annotation values to serialize
 * @returns Formatted comment string (empty string if no annotations)
 *
 * @example
 * serializeAnnotations({ prob: 0.35, eval: 0.52, ew: 0.54 })
 * // Returns: "[%prob 0.35][%eval 0.52][%ew 0.54]"
 *
 * @example
 * serializeAnnotations({ cp: 28 })
 * // Returns: "[%cp 28]"
 *
 * @example
 * serializeAnnotations({})
 * // Returns: ""
 */
export function serializeAnnotations(annotations: ParsedAnnotations): string {
  // Build array of annotation strings
  const parts: string[] = []

  // Add each annotation that has a value
  // Order: prob, eval, ew, cp (consistent ordering for readability)
  if (annotations.prob !== undefined) {
    // Format probability to 2 decimal places
    parts.push(`[%prob ${formatNumber(annotations.prob, 2)}]`)
  }

  if (annotations.eval !== undefined) {
    // Format evaluation to 2 decimal places
    parts.push(`[%eval ${formatNumber(annotations.eval, 2)}]`)
  }

  if (annotations.ew !== undefined) {
    // Format expected winrate to 2 decimal places
    parts.push(`[%ew ${formatNumber(annotations.ew, 2)}]`)
  }

  if (annotations.cp !== undefined) {
    // Centipawns are integers, no decimal places
    parts.push(`[%cp ${Math.round(annotations.cp)}]`)
  }

  // Join all parts into a single string
  return parts.join('')
}

/**
 * Remove annotations from a comment, leaving only the text.
 *
 * Useful for displaying comments to users without the
 * machine-readable annotation data.
 *
 * @param comment - A PGN comment string
 * @returns The comment with all annotations removed
 *
 * @example
 * stripAnnotations("{[%prob 0.35][%eval 0.52]} Great move!")
 * // Returns: "Great move!"
 */
export function stripAnnotations(comment: string): string {
  // Replace all annotation patterns with empty string
  let result = comment.replace(ANNOTATION_REGEX, '')

  // Remove empty braces {} that might be left behind
  // This handles cases like "{[%prob 0.35]}" becoming "{}"
  result = result.replace(/\{\s*\}/g, '')

  // Clean up extra whitespace and trim
  return result.trim()
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamp a number to a specified range.
 *
 * Ensures the value is not less than min or greater than max.
 * This is a common utility for validating numeric inputs.
 *
 * @param value - The number to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped value
 *
 * @example
 * clamp(1.5, 0, 1)  // Returns: 1
 * clamp(-0.5, 0, 1) // Returns: 0
 * clamp(0.5, 0, 1)  // Returns: 0.5
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Format a number to a specific number of decimal places.
 *
 * Removes trailing zeros for cleaner output.
 *
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @returns Formatted string representation
 *
 * @example
 * formatNumber(0.5, 2)   // Returns: "0.5" (not "0.50")
 * formatNumber(0.123, 2) // Returns: "0.12"
 */
function formatNumber(value: number, decimals: number): string {
  // toFixed gives us exactly 'decimals' decimal places
  // parseFloat removes trailing zeros
  return parseFloat(value.toFixed(decimals)).toString()
}
