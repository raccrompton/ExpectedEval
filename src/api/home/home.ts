import { buildUrl } from 'src/api'

const getPlayerStats = async () => {
  const res = await fetch(buildUrl('/auth/get_player_stats'))
  const data = await res.json()
  return {
    regularRating: data.play_elo as number,
    handRating: data.hand_elo as number,
    brainRating: data.brain_elo as number,
    trainRating: data.puzzles_elo as number,
    botNotRating: data.turing_elo as number,
  }
}

export { getPlayerStats }
