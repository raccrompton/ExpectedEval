import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrainingGame } from 'src/types/training'
import { pseudoNL, normalizeEvaluation, normalize } from 'src/utils'
import { useGameController } from '../useGameController'

export const useTrainingController = (game: TrainingGame) => {
  const controller = useGameController(
    game,
    game.targetIndex,
    game.targetIndex % 2 === 0 ? 'white' : 'black',
  )
  const [currentSquare, setCurrentSquare] = useState<null | string>(null)
  const [currentMove, setCurrentMove] = useState<null | [string, string]>(null)
  const { setCurrentIndex, setOrientation } = controller

  useEffect(() => {
    setCurrentIndex(game.targetIndex)
    setCurrentMove(null)
    setCurrentSquare(null)
  }, [game, setCurrentIndex, setOrientation])

  const plyCount = useMemo(() => game?.moves.length ?? 0, [game])

  const data = useMemo(() => {
    const { maiaEvaluation, stockfishEvaluation, availableMoves } = game

    const stockfishValues = Object.values(stockfishEvaluation)
    const max = Math.max(...stockfishValues)
    const min = Math.min(...stockfishValues)
    Object.keys(stockfishEvaluation).forEach((move) => {
      stockfishEvaluation[move] = normalize(stockfishEvaluation[move], min, max)
    })

    const maiaValues = Object.values(maiaEvaluation)
    const maiaMax = Math.max(...maiaValues)
    const maiaMin = Math.min(...maiaValues)

    return Object.entries(stockfishEvaluation).map(([move, evaluation]) => {
      const ny = normalize(maiaEvaluation[move], maiaMin, maiaMax)
      const nx = normalize(
        pseudoNL(normalizeEvaluation(evaluation, 0, 1)) + 8,
        0,
        7.5,
      )
      return {
        id: `${nx}:${ny}`,
        data: [
          {
            ny,
            nx,
            x: pseudoNL(normalizeEvaluation(evaluation, 0, 1)),
            y: maiaEvaluation[move],
            san: availableMoves[move].san,
            move,
          },
        ],
      }
    })
  }, [game])

  const moves = useMemo(() => {
    const moveMap = new Map<string, string[]>()
    const keys = Object.keys(game.availableMoves)
    keys.forEach((key) => {
      const [from, to] = [key.slice(0, 2), key.slice(2)]
      moveMap.set(from, (moveMap.get(from) ?? []).concat([to]))
    })
    return moveMap
  }, [game.availableMoves])

  const moveEvaluation = useMemo(() => {
    if (!currentMove || controller.currentIndex !== game.targetIndex)
      return null
    const { maiaEvaluation, stockfishEvaluation } = game
    const moveEval = {
      maia: maiaEvaluation[currentMove.join('')],
      stockfish: stockfishEvaluation[currentMove.join('')],
    }
    if (moveEval.maia === undefined || moveEval.stockfish === undefined)
      return null
    return moveEval
  }, [controller.currentIndex, currentMove, game])

  const move = useMemo(() => {
    if (currentMove && game.availableMoves[currentMove.join('')]) {
      const {
        board: fen,
        check,
        ...rest
      } = game.availableMoves[currentMove.join('')]
      return { move: currentMove, fen, check, ...rest }
    }
  }, [currentMove, game.availableMoves])

  const parseMove = useCallback(
    (moveToParse: string[]) => {
      if (moveToParse && game.availableMoves[moveToParse.join('')]) {
        const {
          board: fen,
          check,
          ...rest
        } = game.availableMoves[moveToParse.join('')]
        return { move: currentMove, fen, check, ...rest }
      }
    },
    [game.availableMoves],
  )

  return {
    move,
    moves: controller.currentIndex === game.targetIndex ? moves : undefined,
    controller,
    plyCount,
    currentMove,
    parseMove,
    setCurrentMove,
    moveEvaluation,
    setCurrentSquare,
    currentSquare,
    data,
  }
}
