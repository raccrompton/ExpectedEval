import { describe, it, expect } from 'vitest'
import { RealMaia } from '../maia'

const RUN = process.env.RUN_MAIA3_ENGINE_TESTS === '1'
const d = RUN ? describe : describe.skip

const FEN_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const FEN_POST_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const FEN_RUYLOPEZ = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'

d('RealMaia.predictBatch (real engine)', () => {
  it('returns 3 results for 3 distinct fens', async () => {
    const maia = new RealMaia()
    await maia.init()

    const results = await maia.predictBatch([FEN_START, FEN_POST_E4, FEN_RUYLOPEZ])

    expect(results).toHaveLength(3)
    for (const result of results) {
      expect(typeof result.value).toBe('number')
      expect(result.value).toBeGreaterThanOrEqual(0)
      expect(result.value).toBeLessThanOrEqual(1)
      expect(result.policy).toBeDefined()
      expect(Object.keys(result.policy).length).toBeGreaterThan(0)
    }

    maia.destroy()
  })

  it('batched result for fen[0] has the same top policy move as predict()', async () => {
    const maia = new RealMaia()
    await maia.init()

    const [batched] = await maia.predictBatch([FEN_START])
    const single = await maia.predict(FEN_START)

    const batchedTop = Object.keys(batched.policy)[0]
    const singleTop = Object.keys(single.policy)[0]

    expect(batchedTop).toBe(singleTop)

    maia.destroy()
  })
})
