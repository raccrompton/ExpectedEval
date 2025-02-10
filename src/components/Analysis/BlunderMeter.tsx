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
    <div className="flex h-full max-h-full min-w-[40%] max-w-[40%] flex-col gap-2 overflow-hidden rounded bg-background-1/60 p-3">
      <Tooltip id="probability" />
      <p className="text-lg text-primary">Blunder Meter</p>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex h-full w-full select-none flex-col overflow-hidden rounded">
          <Meter
            hover={hover}
            makeMove={makeMove}
            title="Good Moves"
            textColor="text-green-600"
            moves={data.goodMoves.moves}
            bgColor="bg-green-600 rounded-t"
            probability={data.goodMoves.probability}
            colorSanMapping={colorSanMapping}
          />
          <Meter
            hover={hover}
            title="OK Moves"
            makeMove={makeMove}
            moves={data.okMoves.moves}
            bgColor="bg-yellow-500"
            textColor="text-yellow-500"
            probability={data.okMoves.probability}
            colorSanMapping={colorSanMapping}
          />
          <Meter
            hover={hover}
            title="Blunder Moves"
            makeMove={makeMove}
            textColor="text-red-600"
            bgColor="bg-red-600 rounded-b"
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
          {moves
            .slice(0, 6)
            .filter((move) => move.probability >= 2)
            .map((move) => (
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
