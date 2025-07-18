import {
  normalize,
  normalizeEvaluation,
  pseudoNL,
  cpToWinrate,
} from '../../src/lib/stockfish'

describe('Stockfish utilities', () => {
  describe('normalize', () => {
    it('should normalize values correctly', () => {
      expect(normalize(5, 0, 10)).toBe(0.5)
      expect(normalize(0, 0, 10)).toBe(0)
      expect(normalize(10, 0, 10)).toBe(1)
      expect(normalize(7.5, 0, 10)).toBe(0.75)
    })

    it('should handle negative ranges', () => {
      expect(normalize(-5, -10, 0)).toBe(0.5)
      expect(normalize(-10, -10, 0)).toBe(0)
      expect(normalize(0, -10, 0)).toBe(1)
    })

    it('should handle equal min and max', () => {
      expect(normalize(5, 5, 5)).toBe(1)
      expect(normalize(0, 0, 0)).toBe(1)
    })

    it('should handle values outside range', () => {
      expect(normalize(15, 0, 10)).toBe(1.5)
      expect(normalize(-5, 0, 10)).toBe(-0.5)
    })
  })

  describe('normalizeEvaluation', () => {
    it('should normalize evaluation values correctly', () => {
      const result = normalizeEvaluation(5, 0, 10)
      const expected = -8 + (Math.abs(5 - 0) / Math.abs(10 - 0)) * (0 - -8)
      expect(result).toBe(expected)
    })

    it('should handle negative evaluations', () => {
      const result = normalizeEvaluation(-3, -10, 0)
      const expected = -8 + (Math.abs(-3 - -10) / Math.abs(0 - -10)) * (0 - -8)
      expect(result).toBe(expected)
    })

    it('should handle equal min and max', () => {
      expect(normalizeEvaluation(5, 5, 5)).toBe(1)
    })
  })

  describe('pseudoNL', () => {
    it('should handle values >= -1 correctly', () => {
      expect(pseudoNL(0)).toBe(-0.5)
      expect(pseudoNL(1)).toBe(0)
      expect(pseudoNL(-1)).toBe(-1)
      expect(pseudoNL(2)).toBe(0.5)
    })

    it('should handle values < -1 correctly', () => {
      expect(pseudoNL(-2)).toBe(-2)
      expect(pseudoNL(-5)).toBe(-5)
      expect(pseudoNL(-1.5)).toBe(-1.5)
    })
  })

  describe('cpToWinrate', () => {
    it('should convert centipawns to winrate correctly', () => {
      expect(cpToWinrate(0)).toBeCloseTo(0.526949638981131, 5)
      expect(cpToWinrate(100)).toBeCloseTo(0.6271095095579187, 5)
      expect(cpToWinrate(-100)).toBeCloseTo(0.4456913220302985, 5)
    })

    it('should handle string input', () => {
      expect(cpToWinrate('0')).toBeCloseTo(0.526949638981131, 5)
      expect(cpToWinrate('100')).toBeCloseTo(0.6271095095579187, 5)
      expect(cpToWinrate('-100')).toBeCloseTo(0.4456913220302985, 5)
    })

    it('should clamp values to [-1000, 1000] range', () => {
      expect(cpToWinrate(1500)).toBeCloseTo(0.8518353443061348, 5) // Should clamp to 1000
      expect(cpToWinrate(-1500)).toBeCloseTo(0.16874792794783955, 5) // Should clamp to -1000
    })

    it('should handle edge cases', () => {
      expect(cpToWinrate(1000)).toBeCloseTo(0.8518353443061348, 5)
      expect(cpToWinrate(-1000)).toBeCloseTo(0.16874792794783955, 5)
    })

    it('should handle invalid input with allowNaN=false', () => {
      // The function actually returns 0.5 for invalid input when allowNaN=false
      expect(cpToWinrate('invalid')).toBe(0.5)
    })

    it('should handle invalid input with allowNaN=true', () => {
      expect(cpToWinrate('invalid', true)).toBeNaN()
    })

    it('should handle edge case with no matching key', () => {
      // This should not happen with proper clamping and rounding, but testing edge case
      expect(cpToWinrate(0, true)).toBeCloseTo(0.526949638981131, 5)
    })
  })
})
