import { ExpectedWinrateParams, ExpectedWinrateResult } from './types'

type Key = string

const mem = new Map<Key, ExpectedWinrateResult>()

const stableStringify = (obj: unknown) =>
  JSON.stringify(obj, Object.keys(obj as object).sort())

export const cacheKeyFrom = (fen: string, params: ExpectedWinrateParams) =>
  `${fen}::${stableStringify(params)}`

export const getCache = (key: Key) => mem.get(key)
export const setCache = (key: Key, value: ExpectedWinrateResult) => {
  mem.set(key, value)
}
export const clearCache = () => mem.clear()
