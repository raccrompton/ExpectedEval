import React from 'react'
import { PositionEvaluation } from 'src/types'

import styles from './PositionEvaluationContainer.module.scss'

interface Props {
  positionEvaluation?: PositionEvaluation
  moveEvaluation: { maia: number; stockfish?: number } | null
}

export const PositionEvaluationContainer: React.FC<Props> = ({
  moveEvaluation,
}: Props) => {
  return (
    <div className={styles.container}>
      <div className={styles.evaluations}>
        <div className={styles.evaluation}>
          <span>Maia eval:</span>{' '}
          <span className={styles.maia} key={moveEvaluation?.maia}>
            {moveEvaluation ? moveEvaluation.maia.toFixed(3) : '-'}
          </span>
        </div>
        <div className={styles.evaluation}>
          <span>SF eval:</span>{' '}
          <span className={styles.sf} key={moveEvaluation?.stockfish}>
            {moveEvaluation?.stockfish
              ? moveEvaluation.stockfish.toFixed(3)
              : '-'}
          </span>
        </div>
      </div>
    </div>
  )
}
