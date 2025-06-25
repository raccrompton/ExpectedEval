import { Chess, PieceSymbol } from 'chess.ts'

type StockfishEvals = Record<string, number>
type MaiaEvals      = Record<string, number[]>

/* ---------------- phrase banks ---------------- */

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const OUTCOME = {
  overwhelming: [
    'for an overwhelming winning advantage',
    'for a crushing advantage',
    'for a decisive winning advantage',
  ],
  win: [
    'to win',
    'for a winning advantage',
    'to maintain a winning advantage',
  ],
  advantage: [
    'for an advantage',
    'to gain an edge',
    'to press for advantage',
  ],
  balance: [
    'to keep the balance',
    'to maintain the balance',
    'to hold equality',
  ],
  hold: [
    'to hold the position',
    'to defend the position',
    'to hold on',
  ],
  stay: [
    'to stay in the game',
    'to stay afloat',
    'to keep fighting',
  ],
}

const FINDABILITY = {
  hard: [
    'hard for human players to find',
    'very tough for humans to spot',
    'challenging for most players to see',
  ],
  skilled: [
    'findable for skilled players',
    'within reach for experienced players',
    'doable for strong players',
  ],
  straight: [
    'straightforward for players across skill levels to find',
    'easy for players of all strengths to spot',
    'obvious to most players',
  ],
}

const CAREFUL = [
  'Tread carefully',
  'Be alert',
  'Stay sharp',
  'Watch out',
]

const TEMPTING_INTRO = [
  'There',
  'Be careful, as there',
  'In this position there',
]

/* ---------------- constants ---------------- */

const A = 1
const B = 0.8
const EPS = 0.08           // relative ε
const ABS_EPS = 1.0        // absolute-pawn guard

/* ---------------- helpers ---------------- */

const winRate = (p: number) => 1 / (1 + Math.exp(-(p - A) / B))
const wdl = (p: number) => {
  const w = winRate(p)
  const l = winRate(-p)
  return { w, d: 1 - w - l }
}

/* ================================================================ */

export function describePosition(
  fen: string,
  sf: StockfishEvals,
  maia: MaiaEvals,
  whiteToMove: boolean,
  eps = EPS
): string {
  /* ---------- board & legal moves ---------- */
  const chess = new Chess(fen)
  const legal = new Set<string>()
  chess.moves({ verbose: true }).forEach((m) =>
    legal.add(m.from + m.to + (m.promotion ?? ''))
  )

  const moves = Object.keys(sf).filter((m) => legal.has(m))
  if (!moves.length) return 'No legal moves available.'

  /* ---------- Stockfish evals ---------- */
  const seval: Record<string, number> = {}
  moves.forEach((m) => (seval[m] = sf[m]))

  /* ---------- good-move window ---------- */
  const opt = moves.reduce((a, b) => (seval[a] > seval[b] ? a : b))
  const { w: wOpt, d: dOpt } = wdl(seval[opt])

  const good = moves.filter((m) => {
    const { w, d } = wdl(seval[m])
    return Math.abs(w - wOpt) <= eps && Math.abs(d - dOpt) <= eps
  })

  const nGood = good.length
  const abundance =
    nGood === 1 ? 'only one move'
    : nGood === 2 ? 'two moves'
    :               pick(['several moves', 'multiple moves', 'a few moves'])

  /* ---------- helpers ---------- */
  const uciToSan = (uci: string): string => {
    const mv = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
    })
    const san = mv?.san ?? uci
    chess.undo()
    return san
  }

  const sortedGood = [...good].sort((a, b) => seval[b] - seval[a])
  const bestMoveSan = uciToSan(opt)

  /* ε/2 closeness check */
  let optCloseSecond = false
  if (sortedGood.length >= 2) {
    const second = sortedGood[1]
    const { w: w2, d: d2 } = wdl(seval[second])
    optCloseSecond =
      Math.abs(wOpt - w2) <= eps / 2 && Math.abs(dOpt - d2) <= eps / 2
  }

  const listWithOpt = sortedGood.slice(0, 3).map(uciToSan).join(', ')
  const listWithoutOpt = sortedGood
    .filter((m) => m !== opt)
    .slice(0, 3)
    .map(uciToSan)
    .join(', ')

  /* ---------- outcome wording ---------- */
  const avgGood = sortedGood.reduce((s, m) => s + seval[m], 0) / nGood
  let outcome: string
  if (avgGood > 3)            outcome = pick(OUTCOME.overwhelming)
  else if (avgGood > 1.5)     outcome = pick(OUTCOME.win)
  else if (avgGood > 0.35)    outcome = pick(OUTCOME.advantage)
  else if (avgGood >= -0.35)  outcome = pick(OUTCOME.balance)
  else if (avgGood >= -1.5)   outcome = pick(OUTCOME.hold)
  else                        outcome = pick(OUTCOME.stay)

  /* ---------- Maia stats & tempting counts ---------- */
  let setLevels = 0
  let optLevels = 0
  let temptLevels = 0
  const temptCount: Record<string, number> = {}
  const aggProb: Record<string, number> = {}

  for (let lvl = 0; lvl < 9; lvl++) {
    const probs = moves
      .map((m) => [maia[m]?.[lvl] ?? 0, m] as [number, string])
      .sort((a, b) => b[0] - a[0])

    const [p1, m1] = probs[0]
    const [p2, m2] = probs[1] ?? [0, '']
    const [p3, m3] = probs[2] ?? [0, '']

    if (good.includes(m1)) setLevels++
    if (m1 === opt) optLevels++

    for (const [p, m] of probs.slice(0, 4))
      aggProb[m] = (aggProb[m] ?? 0) + p

    const nearTop = (prob: number) => p1 - prob <= eps
    const addTempt = (uci: string) => {
      temptCount[uci] = (temptCount[uci] ?? 0) + 1
      return true
    }

    const nearBad =
      (m2 && !good.includes(m2) && nearTop(p2) && addTempt(m2)) ||
      (m3 && !good.includes(m3) && nearTop(p3) && addTempt(m3))

    if (nearBad) temptLevels++
  }

  /* ---------- tiers ---------- */
  const tier = (k: number) => (k <= 2 ? 0 : k <= 6 ? 1 : 2)
  const setTier = tier(setLevels)
  const optTier = tier(optLevels)
  const bestHarder = optTier < setTier && !optCloseSecond

  const phrSet =
    setTier === 0
      ? pick(FINDABILITY.hard)
      : setTier === 1
      ? pick(FINDABILITY.skilled)
      : pick(FINDABILITY.straight)

  let phrBest =
    optTier === 0
      ? pick(FINDABILITY.hard)
      : optTier === 1
      ? pick(FINDABILITY.skilled)
      : pick(FINDABILITY.straight)

  if (optTier === 1 && bestHarder) phrBest = 'only ' + phrBest

  /* ---------- blunder detection ---------- */
  const isBlunder = (m: string) => {
    const { w, d } = wdl(seval[m])
    return (
      (wOpt - w > 2.25 * eps || dOpt - d > 2.25 * eps) &&
      seval[opt] - seval[m] > ABS_EPS
    )
  }

  const topNonGood = Object.entries(aggProb)
    .filter(([m]) => !good.includes(m))
    .sort((a, b) => b[1] - a[1])[0]?.[0]

  const top4ByProb = Object.entries(aggProb)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  let blunderMove: string | null = null
  if (topNonGood && isBlunder(topNonGood)) {
    blunderMove = topNonGood
  } else {
    for (const [m, p] of top4ByProb) {
      if (p > 0.15 && isBlunder(m)) {
        blunderMove = m
        break
      }
    }
  }

  /* ---------- tail text ---------- */
  const verb = nGood === 1 ? 'is' : 'are'
  const pron = nGood === 1 ? 'it is' : 'they are'
  const prefix = setTier === 2 && !bestHarder ? ', however' : ''

  let tailText = ''

  if (blunderMove) {
    tailText = ` ${pick(CAREFUL)}${prefix}! There is a tempting blunder in this position: ${uciToSan(blunderMove)}.`
  } else {
    const showTempt =
      setTier < 2 || (setTier === 2 && temptLevels > 4)

    if (showTempt) {
      /* always name a move */
      let temptUci =
        Object.entries(temptCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

      if (!temptUci) {
        temptUci = Object.entries(aggProb)
          .filter(([m]) => !good.includes(m))
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      }

      const temptSan = temptUci ? uciToSan(temptUci) : ''
      const intro = pick(TEMPTING_INTRO)
      tailText =
        temptSan
          ? ` ${intro}${prefix} are also tempting alternatives, such as ${temptSan}.`
          : ` ${intro}${prefix} are also tempting alternatives.`
    }
  }

  /* ---------- assemble ---------- */
  const moveList = bestHarder ? listWithoutOpt : listWithOpt

  if (nGood === 1)
    return `There ${verb} ${abundance} (${moveList}) ${outcome}, and ${pron} ${phrSet}.${tailText}`

  if (bestHarder)
    return `There ${verb} ${abundance} (${moveList}) ${outcome}, and ${pron} ${phrSet}, but the best move (${bestMoveSan}) is ${phrBest}.${tailText}`

  return `There ${verb} ${abundance} (${moveList}) ${outcome}, and ${pron} ${phrSet}.${tailText}`
}
