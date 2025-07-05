import { useState, useEffect, useRef } from 'react'
import { MoveTooltip } from './MoveTooltip'
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
  boardDescription: string
}

export const Highlight: React.FC<Props> = ({
  hover,
  makeMove,
  moveEvaluation,
  colorSanMapping,
  recommendations,
  currentMaiaModel,
  boardDescription,
}: Props) => {
  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{
    move: string
    maiaProb?: number
    stockfishCp?: number
    stockfishWinrate?: number
    stockfishLoss?: number
    position: { x: number; y: number }
  } | null>(null)

  const findMatchingMove = (move: string, source: 'maia' | 'stockfish') => {
    if (source === 'maia') {
      return recommendations.stockfish?.find((rec) => rec.move === move)
    } else {
      return recommendations.maia?.find((rec) => rec.move === move)
    }
  }

  const handleMouseEnter = (
    move: string,
    source: 'maia' | 'stockfish',
    event: React.MouseEvent,
    prob?: number,
    cp?: number,
    winrate?: number,
    winrateLoss?: number,
  ) => {
    hover(move)

    const matchingMove = findMatchingMove(move, source)
    const maiaProb =
      source === 'maia' ? prob : (matchingMove as { prob: number })?.prob
    const stockfishCp =
      source === 'stockfish' ? cp : (matchingMove as { cp: number })?.cp
    const stockfishWinrate =
      source === 'stockfish'
        ? winrate
        : (matchingMove as { winrate?: number })?.winrate
    const stockfishLoss =
      source === 'stockfish'
        ? winrateLoss
        : (matchingMove as { winrate_loss?: number })?.winrate_loss

    // Get Stockfish loss from the move evaluation if not provided
    const actualStockfishLoss =
      stockfishLoss !== undefined
        ? stockfishLoss
        : moveEvaluation?.stockfish?.winrate_loss_vec?.[move]

    setTooltipData({
      move,
      maiaProb,
      stockfishCp,
      stockfishWinrate,
      stockfishLoss: actualStockfishLoss,
      position: { x: event.clientX, y: event.clientY },
    })
  }

  const handleMouseLeave = () => {
    hover()
    setTooltipData(null)
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
    <div className="flex h-full w-full flex-col border-white/40 bg-background-1">
      <div className="grid grid-cols-2 border-b border-white/20">
        <div className="flex flex-col items-center justify-start gap-0.5 border-r border-white/20 bg-human-3/5 xl:gap-1">
          <div className="flex w-full flex-col border-b border-white/5 py-2">
            <p className="whitespace-nowrap text-center text-human-1 md:text-[10px] lg:text-xs">
              Maia {currentMaiaModel.slice(-4)}
            </p>
          </div>
          <div className="flex w-full flex-col items-center justify-start border-b border-white/5 px-2 py-1 md:py-0.5 lg:py-1">
            <p className="whitespace-nowrap text-xs text-human-2 md:text-[10px] lg:text-xs">
              White Win %
            </p>
            <p className="text-lg font-bold text-human-1 md:text-sm lg:text-lg">
              {moveEvaluation?.maia
                ? `${Math.round(moveEvaluation.maia?.value * 1000) / 10}%`
                : '...'}
            </p>
          </div>
          <div className="grid grid-rows-2 items-center justify-center p-1.5 xl:p-2">
            <p className="mb-1 whitespace-nowrap text-xs font-semibold text-human-2 md:text-[10px] lg:text-xs">
              Human Moves
            </p>
            {recommendations.maia?.slice(0, 4).map(({ move, prob }, index) => {
              return (
                <button
                  key={index}
                  className="grid cursor-pointer grid-cols-2 gap-1.5 hover:underline xl:gap-2 2xl:gap-3"
                  style={{
                    color: colorSanMapping[move]?.color ?? '#fff',
                  }}
                  onMouseLeave={handleMouseLeave}
                  onMouseEnter={(e) => handleMouseEnter(move, 'maia', e, prob)}
                  onClick={() => makeMove(move)}
                >
                  <p className="text-right font-mono text-[10px] xl:text-xs">
                    {(Math.round(prob * 1000) / 10).toFixed(1)}%
                  </p>
                  <p className="text-left font-mono text-[10px] xl:text-xs">
                    {colorSanMapping[move]?.san ?? move}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-col items-center justify-start gap-0.5 bg-engine-3/5 xl:gap-1">
          <div className="flex w-full flex-col border-b border-white/5 py-2">
            <p className="whitespace-nowrap text-center text-engine-1 md:text-[10px] lg:text-xs">
              Stockfish{' '}
              {moveEvaluation?.stockfish?.depth
                ? ` (D${moveEvaluation.stockfish?.depth})`
                : ''}
            </p>
          </div>
          <div className="flex w-full flex-col items-center justify-start border-b border-white/5 px-2 py-1 md:py-0.5 lg:py-1">
            <p className="whitespace-nowrap text-xs text-engine-2 md:text-[10px] lg:text-xs">
              Eval
            </p>
            <p className="text-lg font-bold text-engine-1 md:text-sm lg:text-lg">
              {moveEvaluation?.stockfish
                ? `${moveEvaluation.stockfish.model_optimal_cp > 0 ? '+' : ''}${moveEvaluation.stockfish.model_optimal_cp / 100}`
                : '...'}
            </p>
          </div>
          <div className="grid grid-rows-2 flex-col items-center justify-center p-1.5 xl:p-2">
            <p className="mb-1 whitespace-nowrap text-xs font-semibold text-engine-2 md:text-[10px] lg:text-xs">
              Engine Moves
            </p>
            {recommendations.stockfish
              ?.slice(0, 4)
              .map(({ move, cp, winrate, winrate_loss }, index) => {
                return (
                  <button
                    key={index}
                    className="grid cursor-pointer grid-cols-2 gap-1.5 hover:underline xl:gap-2 2xl:gap-3"
                    style={{
                      color: colorSanMapping[move]?.color ?? '#fff',
                    }}
                    onMouseLeave={handleMouseLeave}
                    onMouseEnter={(e) =>
                      handleMouseEnter(
                        move,
                        'stockfish',
                        e,
                        undefined,
                        cp,
                        winrate,
                        winrate_loss,
                      )
                    }
                    onClick={() => makeMove(move)}
                  >
                    <p className="w-[32px] text-right font-mono text-[10px] xl:w-[36px] xl:text-xs 2xl:w-[42px]">
                      {cp > 0 ? '+' : null}
                      {`${(cp / 100).toFixed(2)}`}
                    </p>
                    <p className="text-left font-mono text-[10px] xl:text-xs">
                      {colorSanMapping[move]?.san ?? move}
                    </p>
                  </button>
                )
              })}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start justify-start gap-0.5 bg-background-1/80 p-2 text-sm xl:gap-1 xl:p-3">
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
              <p className="w-full whitespace-normal break-words text-[10px] leading-tight text-secondary xl:text-xs xl:leading-tight">
                {boardDescription}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <MoveTooltip
          move={tooltipData.move}
          colorSanMapping={colorSanMapping}
          maiaProb={tooltipData.maiaProb}
          stockfishCp={tooltipData.stockfishCp}
          stockfishWinrate={tooltipData.stockfishWinrate}
          stockfishLoss={tooltipData.stockfishLoss}
          position={tooltipData.position}
        />
      )}
    </div>
  )
}
