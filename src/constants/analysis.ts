/**
 * Classification criteria documentation:
 *
 * 1. BLUNDER (??): More than 10% Stockfish winrate loss compared to best move
 * 2. INACCURACY (?!): More than 5% Stockfish winrate loss compared to best move
 * 3. EXCELLENT (!!): Less than 2% Stockfish winrate loss AND less than 10% Maia probability
 *
 * Note: All winrate loss comparisons are against the BEST POSSIBLE MOVE in the
 * same position, NOT the previous position.
 */

export const MOVE_CLASSIFICATION_THRESHOLDS = {
  BLUNDER_THRESHOLD: 0.1,
  INACCURACY_THRESHOLD: 0.05,
  EXCELLENT_WINRATE_THRESHOLD: 0.02,
  MAIA_UNLIKELY_THRESHOLD: 0.1,
  GOOD_THRESHOLD: -0.05,
} as const

export const DEFAULT_MAIA_MODEL = 'maia_kdd_1500' as const
export const MIN_STOCKFISH_DEPTH = 12 as const

export const COLORS = {
  good: ['#238b45', '#41ab5d', '#74c476', '#90D289', '#AEDFA4'],
  ok: ['#ec7014', '#feb24c', '#fed976', '#ffeda0', '#ffffcc'].reverse(),
  blunder: ['#cb181d', '#ef3b2c', '#fb6a4a', '#fc9272', '#fcbba1'].reverse(),
}
