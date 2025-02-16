import React from 'react'
import { motion } from 'framer-motion'
import { Tooltip } from 'react-tooltip'
import { BlunderMeterResult, ColorSanMapping } from 'src/types'

interface Props {
  data: BlunderMeterResult
  colorSanMapping: ColorSanMapping
  hover: (move?: string) => void
  makeMove: (move: string) => void
}

export const BlunderMeter: React.FC<Props> = ({
  data,
  hover,
  makeMove,
  colorSanMapping,
}: Props) => {
  return (
    <div className="flex h-64 max-h-full w-full flex-col gap-2 overflow-hidden rounded bg-background-1/60 p-3 md:h-full md:w-auto md:min-w-[40%] md:max-w-[40%]">
      <Tooltip id="probability" />
      <p className="text-lg text-primary">Blunder Meter</p>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex h-full w-full select-none flex-col overflow-hidden rounded">
          <Meter
            hover={hover}
            makeMove={makeMove}
            title="Best Moves"
            textColor="text-[#1a9850]"
            moves={data.goodMoves.moves}
            bgColor="bg-[#1a9850] rounded-t"
            probability={data.goodMoves.probability}
            colorSanMapping={colorSanMapping}
          />
          <Meter
            hover={hover}
            title="Meh Moves"
            makeMove={makeMove}
            moves={data.okMoves.moves}
            bgColor="bg-[#fee08b]"
            textColor="text-[#fee08b]"
            probability={data.okMoves.probability}
            colorSanMapping={colorSanMapping}
          />
          <Meter
            hover={hover}
            title="Blunders"
            makeMove={makeMove}
            textColor="text-[#d73027]"
            bgColor="bg-[#d73027] rounded-b"
            moves={data.blunderMoves.moves}
            probability={data.blunderMoves.probability}
            colorSanMapping={colorSanMapping}
          />
        </div>
      </div>
    </div>
  )
}
function Meter({
  moves,
  bgColor,
  title,
  hover,
  makeMove,
  textColor,
  probability,
  colorSanMapping,
}: {
  title: string
  textColor: string
  bgColor: string
  probability: number
  hover: (move?: string) => void
  makeMove: (move: string) => void
  colorSanMapping: ColorSanMapping
  moves: { move: string; probability: number }[]
}) {
  const filteredMoves = () => {
    if (moves.length > 0 && moves[0].probability < 10) {
      return moves.slice(0, 6).slice(0, 1)
    }
    return moves.slice(0, 6).filter((move) => move.probability >= 10)
  }

  return (
    <motion.div
      className="flex min-h-10 w-full flex-row items-start justify-start gap-2 overflow-hidden"
      animate={{
        height: probability + '%',
        maxHeight: probability + '%',
        width: '100%',
      }}
    >
      <motion.div
        data-tooltip-id="probability"
        data-tooltip-content={`Maia predicts there is a ${Math.round(
          probability,
        )}% chance that the player will make a good move`}
        className={`flex h-full min-h-10 min-w-8 flex-col items-center justify-start py-1 ${bgColor}`}
      >
        <motion.p className="text-xs font-bold text-black text-opacity-50">
          {Math.round(probability)}%
        </motion.p>
      </motion.div>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <p className={`text-sm font-medium ${textColor}`}>{title}</p>
        <div className="grid w-full grid-cols-3 overflow-hidden overflow-ellipsis text-wrap text-xs text-secondary">
          {filteredMoves().map((move) => (
            <button
              key={move.move}
              className="text-left hover:underline"
              onMouseLeave={() => hover()}
              onMouseEnter={() => hover(move.move)}
              onClick={() => makeMove(move.move)}
            >
              {colorSanMapping[move.move]?.san || move.move} (
              {Math.round(move.probability)}%){' '}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
