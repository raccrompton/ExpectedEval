import { describe, it, expect } from 'vitest'
import { preprocessMaia3, mirrorMove } from './tensor'

describe('preprocessMaia3', () => {
  it('produces a 64*12 token array for the start position', () => {
    const { boardTokens } = preprocessMaia3(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    expect(boardTokens.length).toBe(64 * 12)
  })

  it('marks 20 legal moves for the start position', () => {
    const { legalMoves } = preprocessMaia3(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    expect(legalMoves.filter((v) => v > 0).length).toBe(20)
  })

  it('mirrorMove flips ranks: e2e4 <-> e7e5', () => {
    expect(mirrorMove('e2e4')).toBe('e7e5')
  })
})
