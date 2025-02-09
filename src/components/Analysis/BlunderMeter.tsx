import React from 'react'
import { motion } from 'framer-motion'
import { Tooltip } from 'react-tooltip'

interface Props {
  blunderMoveChance: number
  okMoveChance: number
  goodMoveChance: number
}

export const BlunderMeter: React.FC<Props> = ({
  blunderMoveChance,
  okMoveChance,
  goodMoveChance,
}: Props) => {
  console.log(blunderMoveChance, okMoveChance, goodMoveChance)
  return (
    <div className="flex h-full max-h-full min-w-[40%] flex-col gap-2 overflow-hidden rounded bg-background-1/60 p-3">
      <Tooltip id="probability" />
      {/* <p className="text-xs">
        <span className="text-green-500">Good</span> –{' '}
        <span className="text-yellow-500">OK</span> –{' '}
        <span className="text-red-500">Blunder</span> Move Probability
      </p> */}
      <p className="text-lg text-white">Blunder Meter</p>
      <div className="flex h-full w-full flex-col">
        <div className="flex h-full w-8 select-none flex-col overflow-hidden rounded saturate-50">
          <motion.div
            data-tooltip-id="probability"
            data-tooltip-content={`Maia predicts there is a ${Math.round(goodMoveChance)}% chance that the player will make a good move`}
            animate={{ height: goodMoveChance + '%', width: '100%' }}
            className="flex min-h-8 w-full flex-col items-center justify-start rounded-t bg-green-600 py-1"
          >
            <motion.p className="text-xs font-bold text-black text-opacity-50">
              {Math.round(goodMoveChance)}%
            </motion.p>
          </motion.div>
          <motion.div
            data-tooltip-id="probability"
            data-tooltip-content={`Maia predicts there is a ${Math.round(okMoveChance)}% chance that the player will make an OK move`}
            animate={{ height: okMoveChance + '%', width: '100%' }}
            className="flex min-h-8 w-full flex-col items-center justify-start bg-yellow-500 py-1"
          >
            <motion.p className="text-xs font-bold text-black text-opacity-50">
              {Math.round(okMoveChance)}%
            </motion.p>
          </motion.div>
          <motion.div
            data-tooltip-id="probability"
            data-tooltip-content={`Maia predicts there is a ${Math.round(blunderMoveChance)}% chance that the player will blunder next move`}
            animate={{ height: blunderMoveChance + '%', width: '100%' }}
            className="flex min-h-8 w-full flex-col items-center justify-start rounded-b bg-red-600 py-1"
          >
            <motion.p className="text-xs font-bold text-black text-opacity-50">
              {Math.round(blunderMoveChance)}%
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
