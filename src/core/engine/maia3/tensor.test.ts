import { describe, it, expect } from 'vitest'
import { preprocessMaia3, mirrorMove, MAIA3_MOVE_VOCAB_SIZE } from './tensor'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const START_FEN_BLACK = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'

describe('preprocessMaia3', () => {
  it('produces a 64*12 token array for the start position', () => {
    const { boardTokens } = preprocessMaia3(START_FEN)
    expect(boardTokens.length).toBe(64 * 12)
  })

  it('marks 20 legal moves for the start position', () => {
    const { legalMoves } = preprocessMaia3(START_FEN)
    expect(legalMoves.filter((v) => v > 0).length).toBe(20)
  })

  it('produces a legalMoves array of the full vocabulary size (4352)', () => {
    const { legalMoves } = preprocessMaia3(START_FEN)
    expect(legalMoves.length).toBe(MAIA3_MOVE_VOCAB_SIZE)
    expect(legalMoves.length).toBe(4352)
  })

  it('black-to-move start position has 20 legal moves after mirroring', () => {
    const { legalMoves } = preprocessMaia3(START_FEN_BLACK)
    expect(legalMoves.filter((v) => v > 0).length).toBe(20)
  })

  it('throws on an invalid FEN', () => {
    expect(() => preprocessMaia3('not a fen')).toThrow()
  })
})

describe('mirrorMove', () => {
  it('flips ranks: e2e4 <-> e7e5', () => {
    expect(mirrorMove('e2e4')).toBe('e7e5')
  })

  it('mirrors a promotion: e7e8q -> e2e1q', () => {
    expect(mirrorMove('e7e8q')).toBe('e2e1q')
  })
})
