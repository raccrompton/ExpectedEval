import { describe, it, expect } from 'vitest'
import { preprocessMaia3 } from './tensor'
import { processMaia3Outputs } from './processOutputs'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Uniform 4352-length policy logits (all moves equally likely).
const uniformMoveLogits = () => new Float32Array(4352).fill(1)
const legalOf = (fen: string) => preprocessMaia3(fen).legalMoves

describe('processMaia3Outputs', () => {
  it('LDW logits favouring Win give value > 0.5 (white to move)', () => {
    const { value } = processMaia3Outputs(START, uniformMoveLogits(), [0, 0, 5], legalOf(START))
    expect(value).toBeGreaterThan(0.5)
  })

  it('LDW logits favouring Loss give value < 0.5 (white to move)', () => {
    const { value } = processMaia3Outputs(START, uniformMoveLogits(), [5, 0, 0], legalOf(START))
    expect(value).toBeLessThan(0.5)
  })

  it('black-to-move: Win-favouring LDW (white wins) flips to < 0.5 for black', () => {
    const blackFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'
    const { value } = processMaia3Outputs(blackFen, uniformMoveLogits(), [0, 0, 5], legalOf(blackFen))
    // The model sees a mirrored white board, so LDW "Win" means white wins.
    // After the black flip, the side-to-move (black) value is low (~0.01).
    expect(value).toBeLessThan(0.5)
  })

  it('policy is a probability distribution over the 20 legal moves', () => {
    const { policy } = processMaia3Outputs(START, uniformMoveLogits(), [1, 1, 1], legalOf(START))
    const sum = Object.values(policy).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 4)
    expect(Object.keys(policy).length).toBe(20)
  })

  it('policy keys are valid UCI moves from the start position', () => {
    const { policy } = processMaia3Outputs(START, uniformMoveLogits(), [1, 1, 1], legalOf(START))
    expect(Object.keys(policy)).toContain('e2e4')
  })
})
