import { distToLine } from '../../src/lib/math'

describe('Math utilities', () => {
  describe('distToLine', () => {
    it('should calculate distance from point to line correctly', () => {
      // Test case: point (0, 0) to line x + y - 1 = 0 (coefficients: [1, 1, -1])
      // Expected distance: |1*0 + 1*0 - 1| / sqrt(1^2 + 1^2) = 1 / sqrt(2) ≈ 0.707
      const point: [number, number] = [0, 0]
      const line: [number, number, number] = [1, 1, -1]
      const result = distToLine(point, line)

      // NOTE: This test will fail due to the bug in the current implementation
      // The bug is in line 5: Math.sqrt(Math.pow(a, 2) + Math.pow(a, 2))
      // It should be: Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))
      const expected = Math.abs(1 * 0 + 1 * 0 - 1) / Math.sqrt(1 * 1 + 1 * 1)
      expect(result).toBeCloseTo(expected, 5)
    })

    it('should handle vertical line (a=1, b=0)', () => {
      // Test case: point (3, 0) to line x - 2 = 0 (coefficients: [1, 0, -2])
      // Expected distance: |1*3 + 0*0 - 2| / sqrt(1^2 + 0^2) = 1 / 1 = 1
      const point: [number, number] = [3, 0]
      const line: [number, number, number] = [1, 0, -2]
      const result = distToLine(point, line)

      const expected = Math.abs(1 * 3 + 0 * 0 - 2) / Math.sqrt(1 * 1 + 0 * 0)
      expect(result).toBeCloseTo(expected, 5)
    })

    it('should handle horizontal line (a=0, b=1)', () => {
      // Test case: point (0, 3) to line y - 2 = 0 (coefficients: [0, 1, -2])
      // Expected distance: |0*0 + 1*3 - 2| / sqrt(0^2 + 1^2) = 1 / 1 = 1
      const point: [number, number] = [0, 3]
      const line: [number, number, number] = [0, 1, -2]
      const result = distToLine(point, line)

      const expected = Math.abs(0 * 0 + 1 * 3 - 2) / Math.sqrt(0 * 0 + 1 * 1)
      expect(result).toBeCloseTo(expected, 5)
    })

    it('should handle point on the line', () => {
      // Test case: point (1, 0) to line x + y - 1 = 0 (coefficients: [1, 1, -1])
      // Expected distance: |1*1 + 1*0 - 1| / sqrt(1^2 + 1^2) = 0 / sqrt(2) = 0
      const point: [number, number] = [1, 0]
      const line: [number, number, number] = [1, 1, -1]
      const result = distToLine(point, line)

      const expected = Math.abs(1 * 1 + 1 * 0 - 1) / Math.sqrt(1 * 1 + 1 * 1)
      expect(result).toBeCloseTo(expected, 5)
    })

    it('should handle negative coordinates', () => {
      // Test case: point (-2, -3) to line x + y + 1 = 0 (coefficients: [1, 1, 1])
      // Expected distance: |1*(-2) + 1*(-3) + 1| / sqrt(1^2 + 1^2) = |-4| / sqrt(2) = 4 / sqrt(2)
      const point: [number, number] = [-2, -3]
      const line: [number, number, number] = [1, 1, 1]
      const result = distToLine(point, line)

      const expected = Math.abs(1 * -2 + 1 * -3 + 1) / Math.sqrt(1 * 1 + 1 * 1)
      expect(result).toBeCloseTo(expected, 5)
    })
  })
})
