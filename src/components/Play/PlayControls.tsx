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
    <div>
      {gameOver ? (
        <div className="flex flex-col gap-2 p-4 text-center">
          {game.id ? (
            <button
              onClick={() => {
                window.open(`/analysis/${game.id}/play`, '_blank')
              }}
              className="flex items-center justify-center rounded bg-engine-3 py-2 transition duration-200 hover:bg-engine-4"
            >
              <p className="font-medium uppercase tracking-wide">
                Analyze game
              </p>
            </button>
          ) : null}
          {playAgain ? (
            <button
              onClick={playAgain}
              className="flex items-center justify-center rounded bg-human-3 py-2 transition duration-200 hover:bg-human-4"
            >
              <p className="font-medium uppercase tracking-wide">Play again</p>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4 text-center">
          <div className="text-sm font-medium">
            {playerActive ? 'Your turn' : 'Waiting for opponent'}
          </div>

          {/* Maia timing toggle */}
          {simulateMaiaTime !== undefined && setSimulateMaiaTime && (
            <div className="w-full">
              <div className="mb-2 text-xs font-medium text-primary/70">
                Maia thinking time
              </div>
              <div className="flex w-full overflow-hidden rounded border border-primary/10">
                <button
                  className={`flex-1 px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    !simulateMaiaTime
                      ? 'bg-human-3 text-white'
                      : 'bg-background-1 text-primary hover:bg-background-2'
                  }`}
                  onClick={() => setSimulateMaiaTime(false)}
                >
                  Instant
                </button>
                <button
                  className={`flex-1 px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    simulateMaiaTime
                      ? 'bg-human-3 text-white'
                      : 'bg-background-1 text-primary hover:bg-background-2'
                  }`}
                  onClick={() => setSimulateMaiaTime(true)}
                >
                  Human-like
                </button>
              </div>
            </div>
          )}

          {offerDraw ? (
            <button
              onClick={offerDraw}
              className="flex w-full items-center justify-center rounded bg-engine-3 py-2 transition duration-200 hover:bg-engine-4"
            >
              <p className="font-medium uppercase tracking-wide">Offer draw</p>
            </button>
          ) : null}
          {resign ? (
            <button
              onClick={resign}
              className="flex items-center justify-center rounded bg-human-3 px-4 py-1.5 transition duration-200 hover:bg-human-4"
            >
              <p className="text-sm font-medium">Resign</p>
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
