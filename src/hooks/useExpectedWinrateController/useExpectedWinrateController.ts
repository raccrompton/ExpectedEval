import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnalyzedGame } from 'src/types'
import { Chess } from 'chess.ts'
import {
  EXPECTED_WINRATE_DEFAULTS,
} from 'src/constants/expectedWinrate'
import {
  ExpectedWinrateParams,
  ExpectedWinrateResult,
  ExpectedWinrateMoveResult,
} from 'src/lib/expectedWinrate/types'
import { cacheKeyFrom, getCache, setCache } from 'src/lib/expectedWinrate/cache'
import { useStockfishExpected } from 'src/lib/expectedWinrate/stockfish'
import { useMaiaExpand } from 'src/lib/expectedWinrate/expand'
import { summarize } from 'src/lib/expectedWinrate/aggregate'
import { MaiaEngineContext } from 'src/contexts/MaiaEngineContext/MaiaEngineContext'
import { StockfishEngineContext } from 'src/contexts/StockfishEngineContext/StockfishEngineContext'

export const useExpectedWinrateController = (game: AnalyzedGame) => {
  const { evaluateAtDepth } = useStockfishExpected()
  const { expandTree } = useMaiaExpand()
  const maia = useContext(MaiaEngineContext)
  const stockfish = useContext(StockfishEngineContext)

  const [isRunning, setIsRunning] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<ExpectedWinrateResult | null>(null)
  const cancelRef = useRef({ cancelled: false })
  const timerRef = useRef<number | null>(null)

  const defaults: ExpectedWinrateParams = useMemo(
    () => ({
      probThreshold: EXPECTED_WINRATE_DEFAULTS.probThreshold,
      depth: EXPECTED_WINRATE_DEFAULTS.depth,
      minWin: EXPECTED_WINRATE_DEFAULTS.minWinPct / 100,
      maiaModel: 'maia_rapid',
    }),
    [],
  )
  const [params, setParams] = useState<ExpectedWinrateParams>(defaults)

  const start = useCallback(async () => {
    if (isRunning) return
    cancelRef.current.cancelled = false
    setIsRunning(true)
    setElapsedMs(0)
    const startAt = performance.now()
    timerRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startAt)
    }, 100) as unknown as number

    const baseNode = game.tree.getMainLine()[0]
    const baseFen = baseNode.fen
    const key = cacheKeyFrom(baseFen, params)
    const cached = getCache(key)
    if (cached) {
      setResult({ ...cached, cacheHit: true, elapsedMs: performance.now() - startAt })
      setIsRunning(false)
      if (timerRef.current) window.clearInterval(timerRef.current)
      return
    }

    const baseEval = await evaluateAtDepth(baseFen, params.depth)
    const baseWinrate = baseEval?.winrate_vec
      ? Object.values(baseEval.winrate_vec)[0] ?? 0.5
      : 0.5

    const root = new Chess(baseFen)
    const legal = root.moves({ verbose: true })
    const candidates = legal.map((m) => {
      const next = new Chess(baseFen)
      next.move(m)
      return { uci: `${m.from}${m.to}${m.promotion || ''}`, san: m.san, fen: next.fen() }
    })

    const moveResults: ExpectedWinrateMoveResult[] = []
    for (const c of candidates) {
      if (cancelRef.current.cancelled) break
      const nodes = await expandTree(c.fen, params)

      for (const n of nodes) {
        if (cancelRef.current.cancelled) break
        const ev = await evaluateAtDepth(n.fen, params.depth)
        const wr = ev?.winrate_vec ? Object.values(ev.winrate_vec)[0] ?? 0.5 : 0.5
        n.leaf = { winrate: wr, depth: ev?.depth ?? params.depth }
      }

      const { expected, coverage, avgDepth, confidence } = summarize(nodes, baseWinrate)
      moveResults.push({
        move: c.uci,
        san: c.san,
        expectedWinrate: expected,
        coverage,
        confidence,
        avgDepth,
        tree: {
          fen: c.fen,
          path: [c.uci],
          cumulativeProb: 1,
          turn: new Chess(c.fen).turn(),
          pruned: false,
          children: nodes,
        },
        elapsedMs: performance.now() - startAt,
      })
    }

    moveResults.sort((a, b) => b.expectedWinrate - a.expectedWinrate)

    const final: ExpectedWinrateResult = {
      baseFen,
      baseWinrate,
      params,
      moves: moveResults,
      coverage:
        moveResults.reduce((acc, m) => acc + m.coverage, 0) /
        Math.max(1, moveResults.length),
      elapsedMs: performance.now() - startAt,
      cacheHit: false,
    }

    setCache(key, final)
    setResult(final)
    setIsRunning(false)
    if (timerRef.current) window.clearInterval(timerRef.current)
  }, [game.tree, isRunning, params, evaluateAtDepth, expandTree])

  const stop = useCallback(() => {
    cancelRef.current.cancelled = true
    stockfish.stopEvaluation()
    setIsRunning(false)
    if (timerRef.current) window.clearInterval(timerRef.current)
  }, [stockfish])

  return {
    params,
    setParams,
    isRunning,
    elapsedMs,
    result,
    start,
    stop,
    engines: {
      maiaStatus: maia.status,
      stockfishStatus: stockfish.status,
    },
  }
}
