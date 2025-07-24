import { isValidRating, safeUpdateRating } from '../../src/lib/ratingUtils'

describe('ratingUtils', () => {
  describe('isValidRating', () => {
    it('should accept valid positive ratings', () => {
      expect(isValidRating(1500)).toBe(true)
      expect(isValidRating(1100)).toBe(true)
      expect(isValidRating(1900)).toBe(true)
      expect(isValidRating(800)).toBe(true)
      expect(isValidRating(2500)).toBe(true)
      expect(isValidRating(3000)).toBe(true)
    })

    it('should reject zero and negative ratings', () => {
      expect(isValidRating(0)).toBe(false)
      expect(isValidRating(-100)).toBe(false)
      expect(isValidRating(-1500)).toBe(false)
    })

    it('should reject non-numeric values', () => {
      expect(isValidRating(null)).toBe(false)
      expect(isValidRating(undefined)).toBe(false)
      expect(isValidRating('1500')).toBe(false)
      expect(isValidRating({})).toBe(false)
      expect(isValidRating([])).toBe(false)
      expect(isValidRating(true)).toBe(false)
    })

    it('should reject infinite and NaN values', () => {
      expect(isValidRating(Number.POSITIVE_INFINITY)).toBe(false)
      expect(isValidRating(Number.NEGATIVE_INFINITY)).toBe(false)
      expect(isValidRating(Number.NaN)).toBe(false)
    })

    it('should reject extremely high ratings', () => {
      expect(isValidRating(5000)).toBe(false)
      expect(isValidRating(10000)).toBe(false)
    })

    it('should accept ratings at boundaries', () => {
      expect(isValidRating(1)).toBe(true)
      expect(isValidRating(4000)).toBe(true)
    })
  })

  describe('safeUpdateRating', () => {
    let mockUpdateFunction: jest.Mock

    beforeEach(() => {
      mockUpdateFunction = jest.fn()
      // Mock console.warn to avoid noise in test output
      jest.spyOn(console, 'warn').mockImplementation(() => {
        // Do nothing
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should call update function with valid ratings', () => {
      expect(safeUpdateRating(1500, mockUpdateFunction)).toBe(true)
      expect(mockUpdateFunction).toHaveBeenCalledWith(1500)

      expect(safeUpdateRating(2000, mockUpdateFunction)).toBe(true)
      expect(mockUpdateFunction).toHaveBeenCalledWith(2000)

      expect(mockUpdateFunction).toHaveBeenCalledTimes(2)
    })

    it('should not call update function with invalid ratings', () => {
      expect(safeUpdateRating(0, mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating(null, mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating(undefined, mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating('1500', mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating(-100, mockUpdateFunction)).toBe(false)

      expect(mockUpdateFunction).not.toHaveBeenCalled()
    })

    it('should log warnings for invalid ratings', () => {
      const consoleSpy = jest.spyOn(console, 'warn')

      safeUpdateRating(0, mockUpdateFunction)
      safeUpdateRating(null, mockUpdateFunction)
      safeUpdateRating(undefined, mockUpdateFunction)

      expect(consoleSpy).toHaveBeenCalledTimes(3)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Attempted to update rating with invalid value:',
        0,
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Attempted to update rating with invalid value:',
        null,
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Attempted to update rating with invalid value:',
        undefined,
      )
    })

    it('should handle edge cases that might come from API responses', () => {
      // Test common problematic API response values
      expect(safeUpdateRating('', mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating(' ', mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating(Number.NaN, mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating({}, mockUpdateFunction)).toBe(false)
      expect(safeUpdateRating([], mockUpdateFunction)).toBe(false)

      expect(mockUpdateFunction).not.toHaveBeenCalled()
    })
  })
})
