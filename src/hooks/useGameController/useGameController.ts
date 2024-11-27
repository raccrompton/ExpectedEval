import { useEffect, useMemo, useState } from 'react'

import { BaseGame, Color } from 'src/types'

export const useGameController = (
  game: BaseGame | undefined,
  initialIndex = 0,
  initialOrientation: Color = 'white',
) => {
  const plyCount = useMemo(() => game?.moves.length ?? 0, [game])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [orientation, setOrientation] = useState<Color>(initialOrientation)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [game?.id, initialIndex])

  return {
    plyCount,
    currentIndex,
    setCurrentIndex,
    orientation,
    setOrientation,
  }
}
