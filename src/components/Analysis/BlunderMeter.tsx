import React from 'react'
import { motion } from 'framer-motion'
import { Tooltip } from 'react-tooltip'
import { BlunderMeterResult, ColorSanMapping } from 'src/types'

interface Props {
  data: BlunderMeterResult
  colorSanMapping: ColorSanMapping
}

export const BlunderMeter: React.FC<Props> = ({
  data,
  colorSanMapping,
}: Props) => {
  return (
    <div className="flex h-full max-h-full min-w-[40%] max-w-[40%] flex-col gap-2 overflow-hidden rounded bg-background-1/60 p-3">
      <Tooltip id="probability" />
      <p className="text-lg text-white">Blunder Meter</p>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex h-full w-full select-none flex-col overflow-hidden rounded">
          <Meter
            title="Good Moves"
            textColor="text-green-600"
            bgColor="bg-green-600 rounded-t"
            probability={data.goodMoves.probability}
            moves={data.goodMoves.moves}
            colorSanMapping={colorSanMapping}
          />
          <Meter
            title="OK Moves"
            textColor="text-yellow-500"
            bgColor="bg-yellow-500"
            probability={data.okMoves.probability}
            moves={data.okMoves.moves}
            colorSanMapping={colorSanMapping}
          />
          <Meter
            title="Blunder Moves"
            textColor="text-red-600"
            bgColor="bg-red-600 rounded-b"
            probability={data.blunderMoves.probability}
            moves={data.blunderMoves.moves}
            colorSanMapping={colorSanMapping}
          />
        </div>
      </div>
    </div>
  )
}
function Meter({
  probability,
  moves,
  textColor,
  bgColor,
  title,
  colorSanMapping,
}: {
  title: string
  textColor: string
  bgColor: string
  probability: number
  moves: { move: string; probability: number }[]
  colorSanMapping: ColorSanMapping
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
        <p className="w-full overflow-hidden overflow-ellipsis text-wrap text-xs text-secondary">
          {moves
            .slice(0, 10)
            .filter((move) => move.probability > 2)
            .map((move) => (
              <span key={move.move} className="hover:underline">
                {colorSanMapping[move.move]?.san || move.move} (
                {Math.round(move.probability)}%){' '}
              </span>
            ))}
        </p>
      </div>
    </motion.div>
  )
}
