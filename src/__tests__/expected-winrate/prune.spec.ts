import { playerAwareShouldStop } from '../../lib/expectedWinrate/prune'

describe('playerAwareShouldStop', () => {
  it('stops when analyzing player drops below min', () => {
    expect(playerAwareShouldStop(true, 0.44, 0.45)).toBe(true)
  })
  it('does not stop on opponent blunder below min', () => {
    expect(playerAwareShouldStop(false, 0.2, 0.45)).toBe(false)
  })
  it('does not stop when above min', () => {
    expect(playerAwareShouldStop(true, 0.6, 0.45)).toBe(false)
  })
})
