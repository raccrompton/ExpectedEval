import { describe, it, expect } from 'vitest'
import { RealMaia } from '../maia'

const RUN = process.env.RUN_MAIA3_ENGINE_TESTS === '1'
const d = RUN ? describe : describe.skip

// A position with a clear best move vs a tempting human mistake.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'

d('Maia 3 strength adjustment', () => {
  it('different ELO levels produce different policy distributions', async () => {
    const maia = new RealMaia()
    await maia.init()
    const low = await maia.predict(FEN, { eloLevel: 1100 })
    const high = await maia.predict(FEN, { eloLevel: 1900 })
    maia.destroy()
    const lowTop = Object.keys(low.policy)[0]
    const diff = Object.keys(low.policy).some(
      (m) => Math.abs((low.policy[m] ?? 0) - (high.policy[m] ?? 0)) > 0.01,
    )
    expect(diff).toBe(true)
    expect(lowTop).toBeTruthy()
  })

  it('boundary ELO levels do not error', async () => {
    const maia = new RealMaia()
    await maia.init()
    await expect(maia.predict(FEN, { eloLevel: 600 })).resolves.toBeTruthy()
    await expect(maia.predict(FEN, { eloLevel: 2600 })).resolves.toBeTruthy()
    maia.destroy()
  })
})
