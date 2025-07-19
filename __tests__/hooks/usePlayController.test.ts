import { Chess } from 'chess.ts'

// Helper functions extracted from usePlayController for testing
const computeTimeTermination = (chess: Chess, playerWhoRanOutOfTime: 'white' | 'black') => {
  // If there's insufficient material on the board, it's a draw
  if (chess.insufficientMaterial()) {
    return {
      result: '1/2-1/2',
      winner: 'none',
      type: 'time',
    }
  }

  // Otherwise, the player who ran out of time loses
  return {
    result: playerWhoRanOutOfTime === 'white' ? '0-1' : '1-0',
    winner: playerWhoRanOutOfTime === 'white' ? 'black' : 'white',
    type: 'time',
  }
}

describe('Time-based game termination', () => {
  describe('computeTimeTermination', () => {
    it('should result in draw when insufficient material exists', () => {
      // King vs King
      const chess1 = new Chess('8/8/8/8/8/8/8/4K2k w - - 0 1')
      const result1 = computeTimeTermination(chess1, 'white')
      expect(result1).toEqual({
        result: '1/2-1/2',
        winner: 'none',
        type: 'time',
      })

      // King + Bishop vs King
      const chess2 = new Chess('8/8/8/8/8/8/8/4KB1k w - - 0 1')
      const result2 = computeTimeTermination(chess2, 'black')
      expect(result2).toEqual({
        result: '1/2-1/2',
        winner: 'none',
        type: 'time',
      })

      // King + Knight vs King
      const chess3 = new Chess('8/8/8/8/8/8/8/4KN1k w - - 0 1')
      const result3 = computeTimeTermination(chess3, 'white')
      expect(result3).toEqual({
        result: '1/2-1/2',
        winner: 'none',
        type: 'time',
      })
    })

    it('should result in loss when sufficient material exists', () => {
      // King + Queen vs King
      const chess1 = new Chess('8/8/8/8/8/8/8/4KQ1k w - - 0 1')
      const result1 = computeTimeTermination(chess1, 'white')
      expect(result1).toEqual({
        result: '0-1',
        winner: 'black',
        type: 'time',
      })

      // King + Rook vs King
      const chess2 = new Chess('8/8/8/8/8/8/8/4KR1k w - - 0 1')
      const result2 = computeTimeTermination(chess2, 'black')
      expect(result2).toEqual({
        result: '1-0',
        winner: 'white',
        type: 'time',
      })

      // Starting position
      const chess3 = new Chess()
      const result3 = computeTimeTermination(chess3, 'white')
      expect(result3).toEqual({
        result: '0-1',
        winner: 'black',
        type: 'time',
      })
    })

    it('should handle both players correctly', () => {
      // King + Pawn vs King (sufficient material)
      const chess = new Chess('8/8/8/8/8/8/4P3/4K2k w - - 0 1')
      
      const whiteTimeout = computeTimeTermination(chess, 'white')
      expect(whiteTimeout).toEqual({
        result: '0-1',
        winner: 'black',
        type: 'time',
      })

      const blackTimeout = computeTimeTermination(chess, 'black')
      expect(blackTimeout).toEqual({
        result: '1-0',
        winner: 'white',
        type: 'time',
      })
    })
  })
})