import { Tooltip } from 'react-tooltip'
import { useState, useEffect, useRef } from 'react'
import { MovesByRating } from './MovesByRating'
import { motion, AnimatePresence } from 'framer-motion'
import { MaiaEvaluation, StockfishEvaluation, ColorSanMapping } from 'src/types'

interface Props {
  currentMaiaModel: string
  moveEvaluation: {
    maia?: MaiaEvaluation
    stockfish?: StockfishEvaluation
  }
  colorSanMapping: ColorSanMapping
  recommendations: {
    maia?: { move: string; prob: number }[]
    stockfish?: {
      move: string
      cp: number
      winrate?: number
      winrate_loss?: number
    }[]
    isBlackTurn?: boolean
  }
  hover: (move?: string) => void
  makeMove: (move: string) => void
  movesByRating: { [key: string]: number }[] | undefined
  boardDescription: string
}

export const Highlight: React.FC<Props> = ({
  hover,
  makeMove,
  movesByRating,
  moveEvaluation,
  colorSanMapping,
  recommendations,
  currentMaiaModel,
  boardDescription,
}: Props) => {
  const findMatchingMove = (move: string, source: 'maia' | 'stockfish') => {
    if (source === 'maia') {
      return recommendations.stockfish?.find((rec) => rec.move === move)
    } else {
      return recommendations.maia?.find((rec) => rec.move === move)
    }
  }

  const getTooltipContent = (
    move: string,
    source: 'maia' | 'stockfish',
    prob?: number,
    cp?: number,
    winrate?: number,
  ) => {
    const matchingMove = findMatchingMove(move, source)
    const maiaProb =
      source === 'maia' ? prob : (matchingMove as { prob: number })?.prob
    const stockfishCp =
      source === 'stockfish' ? cp : (matchingMove as { cp: number })?.cp
    const stockfishWinrate =
      source === 'stockfish'
        ? winrate
        : (matchingMove as { winrate?: number })?.winrate

    return (
      <div className="flex flex-col gap-1 overflow-hidden rounded border border-background-2 bg-backdrop">
        <div className="flex items-center bg-backdrop px-3 py-1.5">
          <span
            style={{
              color: colorSanMapping[move]?.color ?? '#fff',
            }}
            className="font-medium"
          >
            {colorSanMapping[move]?.san ?? move}
          </span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1 bg-background-1/80 px-3 py-1.5 text-sm">
          {maiaProb !== undefined && (
            <div className="flex w-full items-center justify-between gap-2 font-mono">
              <span className="text-human-3">Maia:</span>
              <span>{(Math.round(maiaProb * 1000) / 10).toFixed(1)}%</span>
            </div>
          )}
          {stockfishCp !== undefined && (
            <div className="flex w-full items-center justify-between gap-2 font-mono">
              <span className="text-engine-3">SF Eval:</span>
              <span>
                {stockfishCp > 0 ? '+' : ''}
                {(stockfishCp / 100).toFixed(2)}
              </span>
            </div>
          )}
          {stockfishWinrate !== undefined && (
            <div className="flex w-full items-center justify-between gap-2 font-mono">
              <span className="text-engine-3">SF Winrate:</span>
              <span>{(stockfishWinrate * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Track whether description exists (not its content)
  const hasDescriptionRef = useRef(!!boardDescription)
  const [animationKey, setAnimationKey] = useState(0)

  useEffect(() => {
    const descriptionNowExists = !!boardDescription
    // Only trigger animation when presence changes (exists vs doesn't exist)
    if (hasDescriptionRef.current !== descriptionNowExists) {
      hasDescriptionRef.current = descriptionNowExists
      setAnimationKey((prev) => prev + 1)
    }
  }, [boardDescription])

  return (
    <div className="flex h-full w-full flex-col items-start gap-1 overflow-hidden md:flex-row md:gap-0 md:rounded md:border-[0.5px] md:border-white/40">
      <div className="flex h-full w-full flex-col border-white/40 bg-background-1 md:w-auto md:min-w-[40%] md:max-w-[40%] md:border-r-[0.5px]">
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-1 bg-human-3/5 py-2 md:py-3">
            <p className="text-center text-xs text-human-2 md:text-sm">
              Maia {currentMaiaModel.slice(-4)}
              <br />
              White Win %
            </p>
            <p className="text-xl font-bold text-human-1 md:text-2xl">
              {moveEvaluation?.maia
                ? `${Math.round(moveEvaluation.maia?.value * 1000) / 10}%`
                : '...'}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 bg-engine-3/5 py-2 md:py-3">
            <p className="text-center text-xs text-engine-2 md:text-sm">
              SF Eval
              <br />
              {moveEvaluation?.stockfish?.depth
                ? ` (Depth ${moveEvaluation.stockfish?.depth})`
                : ''}
            </p>
            <p className="text-xl font-bold text-engine-1 md:text-2xl">
              {moveEvaluation?.stockfish
                ? `${moveEvaluation.stockfish.model_optimal_cp > 0 ? '+' : ''}${moveEvaluation.stockfish.model_optimal_cp / 100}`
                : '...'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2">
          <Tooltip
            place="bottom"
            id="move-tooltip"
            noArrow={true}
            className="!z-50 !bg-none !p-0 !opacity-100"
            render={({ content }) => {
              if (!content) return null
              const { move, source, prob, cp, winrate } = JSON.parse(content)
              return getTooltipContent(move, source, prob, cp, winrate)
            }}
          />
          <div className="grid grid-rows-2 items-center justify-center p-3">
            {recommendations.maia?.slice(0, 4).map(({ move, prob }, index) => {
              return (
                <button
                  key={index}
                  className="grid cursor-pointer grid-cols-2 gap-3 hover:underline"
                  style={{
                    color: colorSanMapping[move]?.color ?? '#fff',
                  }}
                  onMouseLeave={() => hover()}
                  onMouseEnter={() => hover(move)}
                  onClick={() => makeMove(move)}
                  data-tooltip-id="move-tooltip"
                  data-tooltip-content={JSON.stringify({
                    move,
                    source: 'maia',
                    prob,
                  })}
                >
                  <p className="text-right font-mono text-xs md:text-sm">
                    {(Math.round(prob * 1000) / 10).toFixed(1)}%
                  </p>
                  <p className="text-left font-mono text-xs md:text-sm">
                    {colorSanMapping[move]?.san ?? move}
                  </p>
                </button>
              )
            })}
          </div>
          <div className="grid grid-rows-2 flex-col items-center justify-center p-3">
            {recommendations.stockfish
              ?.slice(0, 4)
              .map(({ move, cp, winrate }, index) => {
                return (
                  <button
                    key={index}
                    className="grid cursor-pointer grid-cols-2 gap-3 hover:underline"
                    style={{
                      color: colorSanMapping[move]?.color ?? '#fff',
                    }}
                    onMouseLeave={() => hover()}
                    onMouseEnter={() => hover(move)}
                    onClick={() => makeMove(move)}
                    data-tooltip-id="move-tooltip"
                    data-tooltip-content={JSON.stringify({
                      move,
                      source: 'stockfish',
                      cp,
                      winrate,
                    })}
                  >
                    <p className="w-[42px] text-right font-mono text-xs md:text-sm">
                      {cp > 0 ? '+' : null}
                      {`${(cp / 100).toFixed(2)}`}
                    </p>
                    <p className="text-left font-mono text-xs md:text-sm">
                      {colorSanMapping[move]?.san ?? move}
                    </p>
                  </button>
                )
              })}
          </div>
        </div>
        <div className="flex flex-col items-start justify-start gap-1 bg-background-1/80 px-3 py-1.5 text-sm">
          <AnimatePresence mode="wait">
            {boardDescription ? (
              <motion.div
                key={animationKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
                className="w-full"
              >
                <p className="w-full whitespace-normal break-words text-xs text-secondary">
                  {boardDescription}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex h-full w-full flex-col bg-background-1">
        <MovesByRating
          moves={movesByRating}
          colorSanMapping={colorSanMapping}
        />
      </div>
    </div>
  )
}
