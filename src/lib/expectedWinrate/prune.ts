export const playerAwareShouldStop = (
  isAnalyzingPlayersTurn: boolean,
  winrate: number,
  minWin: number,
) => {
  if (isAnalyzingPlayersTurn && winrate < minWin) return true
  return false
}
