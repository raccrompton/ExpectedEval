import { Chess } from 'chess.ts'
import { useEffect, useMemo, useState } from 'react'

import { useGameController, useStockfishEngine } from '..'
import { normalize, normalizeEvaluation, pseudoNL } from 'src/utils'
import { AnalyzedGame, Color, MoveMap, StockfishEvaluation } from 'src/types'

function parseMaiaWinRate(
  turnPlayed: string,
  currentMaiaModel: string,
  maiaValues?: { [key: string]: number },
) {
  if (maiaValues === undefined) return -1

  let maiaWr = maiaValues ? maiaValues[currentMaiaModel] : -1
  if (maiaWr !== -1 && turnPlayed === 'white') {
    maiaWr = 1 - maiaWr
  }

  return maiaWr
}

export const useAnalysisController = (
  game: AnalyzedGame,
  initialIndex: number,
  initialOrientation: Color,
) => {
  const controller = useGameController(game, initialIndex, initialOrientation)

  const parseStockfishEvaluation = (
    message: StockfishEvaluation,
    moveIndex: number,
  ) => {
    setStockfishEvaluations((prev) => {
      const newEvaluations = [...prev]
      newEvaluations[moveIndex] = message

      return newEvaluations
    })
  }

  const engine = useStockfishEngine(parseStockfishEvaluation)
  const [currentMove, setCurrentMove] = useState<null | [string, string]>(null)
  const [stockfishEvaluations, setStockfishEvaluations] = useState<
    StockfishEvaluation[]
  >([])
  const maiaModels = useMemo(
    () => Object.keys(game.maiaEvaluations).sort(),
    [game.maiaEvaluations],
  )
  const [currentMaiaModel, setCurrentMaiaModel] = useState(maiaModels[0])

  useEffect(() => {
    if (game.type === 'tournament') return
    if (stockfishEvaluations[controller.currentIndex]?.depth == 18) return

    const board = new Chess(game.moves[controller.currentIndex].board)
    engine.evaluatePosition(
      board.fen(),
      board.moves().length,
      controller.currentIndex,
    )
  }, [controller.currentIndex, game.moves, game.type, engine])

  const moves = useMemo(() => {
    const moveMap = new Map<string, string[]>()
    const currentMaiaEvaluation =
      game.maiaEvaluations[maiaModels[0]][controller.currentIndex]

    if (currentMaiaEvaluation) {
      const keys = Object.keys(currentMaiaEvaluation)
      keys.forEach((key) => {
        const [from, to] = [key.slice(0, 2), key.slice(2)]
        moveMap.set(from, (moveMap.get(from) ?? []).concat([to]))
      })
    }

    return moveMap
  }, [controller.currentIndex, game.maiaEvaluations, maiaModels])

  const plotData = useMemo(() => {
    const data: {
      [model: string]: {
        id: string
        data: {
          ny: number
          nx: number
          x: number
          y: number
          move: string
          san?: string
        }[]
      }[][]
    } = {}

    Object.keys(game.maiaEvaluations).forEach((model) => {
      data[model] = []

      Object.keys(game.availableMoves).forEach((_, index) => {
        const maiaEvaluation = game.maiaEvaluations[model][index]

        const maiaValues = Object.values(maiaEvaluation)
        const maiaMax = Math.max(...maiaValues)
        const maiaMin = Math.min(...maiaValues)

        if (game.type === 'tournament' && game.stockfishEvaluations) {
          const stockfishEvaluation = game.stockfishEvaluations[
            index
          ] as MoveMap

          const stockfishValues = Object.values(stockfishEvaluation)
          const max = Math.max(...stockfishValues)
          const min = Math.min(...stockfishValues)

          const currentData = Object.entries(stockfishEvaluation).map(
            ([move, evaluation]) => {
              const parsed = normalize(evaluation, min, max)
              const ny = normalize(maiaEvaluation[move], maiaMin, maiaMax)
              const nx = normalize(
                pseudoNL(normalizeEvaluation(parsed, 0, 1)) + 8,
                0,
                7.5,
              )

              return {
                id: `${nx}:${ny}`,
                data: [
                  {
                    ny,
                    nx,
                    x: pseudoNL(normalizeEvaluation(parsed, 0, 1)),
                    y: maiaEvaluation[move],
                    san: game.availableMoves[index][move]?.san,
                    move,
                  },
                ],
              }
            },
          )

          data[model].push(currentData)
        } else {
          const stockfishRaw = stockfishEvaluations[index]
          if (!stockfishRaw || stockfishRaw.depth < 10) {
            data[model].push([])
            return
          }
          const stockfishEvaluation = stockfishRaw.cp_vec
          const stockfishValues = Object.values(stockfishEvaluation)
          const max = Math.max(...stockfishValues)
          const min = Math.min(...stockfishValues)

          const currentData = Object.entries(stockfishEvaluation).map(
            ([move, evaluation]) => {
              const parsed = normalize(evaluation, min, max)
              const ny = normalize(maiaEvaluation[move], maiaMin, maiaMax)
              const nx = normalize(
                pseudoNL(normalizeEvaluation(parsed, 0, 1)) + 8,
                0,
                7.5,
              )

              return {
                id: `${nx}:${ny}`,
                data: [
                  {
                    ny,
                    nx,
                    x: pseudoNL(normalizeEvaluation(parsed, 0, 1)),
                    y: maiaEvaluation[move],
                    san: game.availableMoves[index][move]?.san,
                    move,
                  },
                ],
              }
            },
          )
          data[model].push(currentData)
        }
      })
    })

    return data
  }, [
    game.type,
    game.availableMoves,
    game.maiaEvaluations,
    game.stockfishEvaluations,
    stockfishEvaluations,
  ])

  const data = useMemo(() => {
    if (!plotData[currentMaiaModel]) return []
    return plotData[currentMaiaModel][controller.currentIndex]
  }, [controller.currentIndex, currentMaiaModel, plotData])

  // const positionEvaluation = useMemo(
  //   () => game.positionEvaluations[currentMaiaModel][controller.currentIndex],
  //   [controller.currentIndex, currentMaiaModel, game.positionEvaluations],
  // )

  const moveEvaluation = useMemo(() => {
    if (currentMove) {
      const maiaEvaluation =
        game.maiaEvaluations[currentMaiaModel][controller.currentIndex]
      const maiaValues = game.moves[controller.currentIndex].maia_values

      if (game.type === 'tournament') {
        const stockfishEvaluation = game.stockfishEvaluations[
          controller.currentIndex
        ] as MoveMap
        const turnPlayed = controller.currentIndex % 2 === 0 ? 'black' : 'white'
        const maiaWr = parseMaiaWinRate(
          turnPlayed,
          currentMaiaModel,
          maiaValues,
        )
        const moveEval = {
          maiaWr,
          maia: maiaEvaluation[currentMove.join('')],
          stockfish: stockfishEvaluation[currentMove.join('')],
        }

        return moveEval
      } else {
        const stockfish = stockfishEvaluations[controller.currentIndex]
        const turnPlayed = controller.currentIndex % 2 === 0 ? 'black' : 'white'
        const maiaWr = parseMaiaWinRate(
          turnPlayed,
          currentMaiaModel,
          maiaValues,
        )
        const moveEval = {
          maiaWr,
          maia: maiaEvaluation[currentMove.join('')],
          stockfish: stockfish?.model_optimal_cp / 100,
        }

        return moveEval
      }
    } else {
      if (!controller.currentIndex) return null
      const lastMove = game.moves[controller.currentIndex].lastMove?.join('')
      if (!lastMove) return null

      const maiaEvaluation =
        game.maiaEvaluations[currentMaiaModel][controller.currentIndex - 1]
      const maiaValues = game.moves[controller.currentIndex].maia_values

      if (
        game.type === 'tournament' &&
        game.stockfishEvaluations &&
        game.stockfishEvaluations[controller.currentIndex - 1]
      ) {
        const stockfishEvaluation = game.stockfishEvaluations[
          controller.currentIndex - 1
        ] as MoveMap
        const turnPlayed = controller.currentIndex % 2 === 0 ? 'black' : 'white'
        const maiaWr = parseMaiaWinRate(
          turnPlayed,
          currentMaiaModel,
          maiaValues,
        )
        const moveEval = {
          maiaWr,
          maia: maiaEvaluation[lastMove],
          stockfish:
            (turnPlayed == 'black' ? -1 : 1) * stockfishEvaluation[lastMove],
        }

        if (moveEval.maia === undefined || moveEval.stockfish === undefined)
          return null
        return moveEval
      } else {
        const stockfish = stockfishEvaluations[controller.currentIndex]

        const turnPlayed = controller.currentIndex % 2 === 0 ? 'black' : 'white'
        const maiaWr = parseMaiaWinRate(
          turnPlayed,
          currentMaiaModel,
          maiaValues,
        )

        const moveEval = {
          maiaWr,
          maia: maiaEvaluation[lastMove],
          stockfish:
            (turnPlayed == 'white' ? -1 : 1) * stockfish?.model_optimal_cp,
        }

        return moveEval
      }
    }
  }, [
    game.moves,
    currentMove,
    currentMaiaModel,
    game.maiaEvaluations,
    controller.currentIndex,
    game.stockfishEvaluations,
    stockfishEvaluations,
    game.blackPlayer.rating,
    game.whitePlayer.rating,
    game.type,
  ])

  const blunderMeter = useMemo(() => {
    let blunderMoveChance = 0
    let okMoveChance = 0
    let goodMoveChance = 0

    if (game.type === 'tournament') {
      const maia =
        game.maiaEvaluations[currentMaiaModel][controller.currentIndex]

      const sf_raw = game.stockfishEvaluations[
        controller.currentIndex
      ] as MoveMap

      if (!sf_raw || !maia)
        return { blunderMoveChance, okMoveChance, goodMoveChance }

      const max = Math.max(...Object.values(sf_raw))
      const sf = Object.fromEntries(
        Object.entries(sf_raw).map(([key, value]) => [key, max - value]),
      )

      if (!maia) return { blunderMoveChance, okMoveChance, goodMoveChance }

      for (const [move, prob] of Object.entries(maia)) {
        const loss = sf[move]

        if (loss === undefined) continue

        if (loss <= 50) {
          goodMoveChance += prob * 100
        } else if (loss <= 150) {
          okMoveChance += prob * 100
        } else {
          blunderMoveChance += prob * 100
        }
      }

      return { blunderMoveChance, okMoveChance, goodMoveChance }
    } else {
      const sf = stockfishEvaluations[controller.currentIndex]?.cp_relative_vec

      const maia =
        game.maiaEvaluations[currentMaiaModel][controller.currentIndex]

      if (!sf || !maia)
        return { blunderMoveChance, okMoveChance, goodMoveChance }

      for (const [move, prob] of Object.entries(maia)) {
        const loss = sf[move]

        if (loss === undefined) continue

        if (loss <= 50) {
          goodMoveChance += prob * 100
        } else if (loss <= 150) {
          okMoveChance += prob * 100
        } else {
          blunderMoveChance += prob * 100
        }
      }

      return { blunderMoveChance, okMoveChance, goodMoveChance }
    }
  }, [
    game.type,
    stockfishEvaluations,
    controller.currentIndex,
    game.stockfishEvaluations,
    game.maiaEvaluations,
    currentMaiaModel,
  ])

  const move = useMemo(() => {
    if (
      currentMove &&
      game.availableMoves[controller.currentIndex][currentMove.join('')]
    ) {
      const {
        board: fen,
        check,
        ...rest
      } = game.availableMoves[controller.currentIndex][currentMove.join('')]
      return { move: currentMove, fen, check, ...rest }
    }
  }, [controller.currentIndex, currentMove, game.availableMoves])

  return {
    move,
    data,
    moves,
    controller,
    maiaModels,
    currentMaiaModel,
    setCurrentMaiaModel,
    // positionEvaluation,
    currentMove,
    setCurrentMove,
    moveEvaluation,
    blunderMeter,
    stockfishEvaluations,
  }
}
