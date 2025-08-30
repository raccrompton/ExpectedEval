/**
 * Format utilities for ExpectedEval application
 */

/**
 * Format a move number for display
 * @param moveNumber - The move number (1-based)
 * @param isWhiteMove - Whether this is a white move
 * @returns Formatted move number string
 */
export const formatMoveNumber = (
  moveNumber: number,
  isWhiteMove = true,
): string => {
  if (isWhiteMove) {
    return `${moveNumber}.`
  } else {
    return `${moveNumber}...`
  }
}

/**
 * Format calculation time in milliseconds to human readable string
 * @param timeMs - Time in milliseconds
 * @returns Formatted time string
 */
export const formatTime = (timeMs: number): string => {
  if (timeMs < 1000) {
    return `${timeMs}ms`
  } else if (timeMs < 60000) {
    const seconds = (timeMs / 1000).toFixed(1)
    return `${seconds}s`
  } else {
    const minutes = Math.floor(timeMs / 60000)
    const seconds = Math.floor((timeMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}