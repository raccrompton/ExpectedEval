import { useChessSoundManager } from 'src/lib/chessSoundManager'

/**
 * @deprecated Use useChessSoundManager directly instead
 * This hook is kept for backward compatibility and will be removed
 */
export const useChessSound = () => {
  const { playMoveSound } = useChessSoundManager()

  return {
    playSound: playMoveSound,
  }
}
