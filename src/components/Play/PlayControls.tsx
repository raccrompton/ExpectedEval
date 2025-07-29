import { BaseGame } from 'src/types'

interface Props {
  game: BaseGame
  playerActive: boolean
  gameOver: boolean
  resign?: () => void
  offerDraw?: () => void
  playAgain?: () => void
  simulateMaiaTime?: boolean
  setSimulateMaiaTime?: (value: boolean) => void
}

export const PlayControls: React.FC<Props> = ({
  game,
  playerActive,
  gameOver,
  resign,
  offerDraw,
  playAgain,
  simulateMaiaTime,
  setSimulateMaiaTime,
}: Props) => {
  return (
    <div className="flex h-full w-full flex-col border-white/40 bg-background-1">
      {gameOver ? (
        <div className="flex flex-col gap-2 p-4">
          {game.id ? (
            <button
              onClick={() => {
                window.open(`/analysis/${game.id}/play`, '_blank')
              }}
              className="flex items-center justify-center rounded border border-engine-2/20 bg-engine-3/5 px-4 py-2 text-sm font-semibold text-engine-1 transition-colors duration-200 hover:border-engine-2/50 hover:bg-engine-3/10"
            >
              ANALYZE GAME
            </button>
          ) : null}
          {playAgain ? (
            <button
              onClick={playAgain}
              className="flex items-center justify-center rounded border border-human-2/20 bg-human-3/5 px-4 py-2 text-sm font-semibold tracking-wider text-human-1 transition-colors duration-200 hover:border-human-2/50 hover:bg-human-3/10"
            >
              PLAY AGAIN
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Game Status Header */}
          <div className="border-b border-white/10 bg-background-1 p-3">
            <div className="text-center">
              <p
                className={`text-sm font-semibold uppercase tracking-wider ${
                  playerActive ? 'text-human-1' : 'text-secondary'
                }`}
              >
                {playerActive ? 'Your Turn' : 'Waiting for Opponent'}
              </p>
            </div>
          </div>

          {/* Maia Timing Controls */}
          {simulateMaiaTime !== undefined && setSimulateMaiaTime && (
            <div className="border-b border-white/5 bg-human-3/5 p-3">
              <div className="flex flex-col gap-2">
                <p className="text-center text-xs font-semibold tracking-wider text-human-2">
                  MAIA THINKING TIME
                </p>
                <div className="flex overflow-hidden border border-white/10 bg-background-1">
                  <button
                    className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                      !simulateMaiaTime
                        ? 'bg-human-3 text-white'
                        : 'text-primary hover:bg-background-2'
                    }`}
                    onClick={() => setSimulateMaiaTime(false)}
                  >
                    Instant
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                      simulateMaiaTime
                        ? 'bg-human-3 text-white'
                        : 'text-primary hover:bg-background-2'
                    }`}
                    onClick={() => setSimulateMaiaTime(true)}
                  >
                    Human-like
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-3">
            <div className="flex flex-col gap-2">
              {offerDraw && (
                <button
                  onClick={offerDraw}
                  disabled={!playerActive}
                  className={`w-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                    playerActive
                      ? 'border-white/10 bg-engine-3/5 text-engine-1 hover:border-white/20 hover:bg-engine-3/10'
                      : 'cursor-not-allowed border-white/5 bg-background-2 text-secondary/40'
                  }`}
                >
                  OFFER DRAW
                </button>
              )}

              {/* Resign Button - Smaller and Less Prominent */}
              <div className="flex justify-center">
                <button
                  onClick={resign}
                  disabled={!resign || !playerActive}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                    resign && playerActive
                      ? 'text-red-400/80 hover:bg-red-500/5 hover:text-red-300'
                      : 'cursor-not-allowed text-secondary/30'
                  }`}
                >
                  Resign
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
