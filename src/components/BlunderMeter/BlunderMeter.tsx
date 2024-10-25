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
  return (
    <div className="flex flex-col gap-1 bg-background-1 p-4">
      <Tooltip id="probability" />
      <p className="text-sm">
        <span className="text-green-500">Good</span> –{' '}
        <span className="text-yellow-500">OK</span> –{' '}
        <span className="text-red-500">Blunder</span> Move Probability
      </p>
      <div className="flex h-6 w-full select-none overflow-hidden rounded">
        <motion.div
          data-tooltip-id="probability"
          data-tooltip-content={`Maia predicts there is a ${Math.round(goodMoveChance)}% chance that the player will make a good move`}
          animate={{ width: goodMoveChance + '%' }}
          className="flex h-full min-w-8 flex-row items-center rounded-l bg-green-600 px-1"
        >
          <motion.p className="text-xs font-bold text-black text-opacity-50">
            {Math.round(goodMoveChance)}%
          </motion.p>
        </motion.div>
        <motion.div
          data-tooltip-id="probability"
          data-tooltip-content={`Maia predicts there is a ${Math.round(okMoveChance)}% chance that the player will make an OK move`}
          animate={{ width: okMoveChance + '%' }}
          className="flex h-full min-w-8 flex-row items-center bg-yellow-500 px-1"
        >
          <motion.p className="text-xs font-bold text-black text-opacity-50">
            {Math.round(okMoveChance)}%
          </motion.p>
        </motion.div>
        <motion.div
          data-tooltip-id="probability"
          data-tooltip-content={`Maia predicts there is a ${Math.round(blunderMoveChance)}% chance that the player will blunder next move`}
          animate={{ width: blunderMoveChance + '%' }}
          className="flex h-full min-w-8 flex-row items-center justify-start rounded-r bg-red-600 px-1"
        >
          <motion.p className="text-xs font-bold text-black text-opacity-50">
            {Math.round(blunderMoveChance)}%
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
