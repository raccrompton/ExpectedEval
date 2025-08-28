import {
  cacheKeyFrom,
  clearCache,
  getCache,
  setCache,
} from '../../lib/expectedWinrate/cache'

describe('cache', () => {
  beforeEach(() => clearCache())

  it('uses stable key from fen and params', () => {
    const fen = 'startpos'
    const a = {
      depth: 20,
      probThreshold: 0.01,
      minWin: 0.45,
      maiaModel: 'maia_rapid',
    }
    const b = {
      probThreshold: 0.01,
      minWin: 0.45,
      depth: 20,
      maiaModel: 'maia_rapid',
    } as any
    const ka = cacheKeyFrom(fen, a as any)
    const kb = cacheKeyFrom(fen, b as any)
    expect(ka).toBe(kb)
  })

  it('stores and retrieves results', () => {
    const key = cacheKeyFrom('f', {
      depth: 20,
      probThreshold: 0.01,
      minWin: 0.45,
      maiaModel: 'maia_rapid',
    })
    const val: any = {
      baseFen: 'f',
      baseWinrate: 0.5,
      params: {},
      moves: [],
      coverage: 0,
      elapsedMs: 0,
      cacheHit: false,
    }
    setCache(key, val)
    expect(getCache(key)).toEqual(val)
  })
})
