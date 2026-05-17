import { describe, it, expect } from 'vitest'
import { RealMaia } from '../maia'

const RUN = process.env.RUN_MAIA3_ENGINE_TESTS === '1'
const d = RUN ? describe : describe.skip

// White is up a queen.
const WHITE_WINNING_W = '4k3/8/8/8/8/8/8/3QK3 w - - 0 1'
const WHITE_WINNING_B = '4k3/8/8/8/8/8/8/3QK3 b - - 0 1'

d('Maia 3 value perspective', () => {
  it('value is high for the side that is winning (white to move)', async () => {
    const maia = new RealMaia()
    await maia.init()
    const r = await maia.predict(WHITE_WINNING_W)
    maia.destroy()
    expect(r.value).toBeGreaterThan(0.6)
  })

  it('value is low for the side that is losing (black to move)', async () => {
    const maia = new RealMaia()
    await maia.init()
    const r = await maia.predict(WHITE_WINNING_B)
    maia.destroy()
    expect(r.value).toBeLessThan(0.4)
  })
})
