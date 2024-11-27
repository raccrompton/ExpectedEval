/* eslint-disable jsx-a11y/no-static-element-interactions */
import { useContext } from 'react'
import { TuringControllerContext } from 'src/contexts'

export const TuringGames: React.FC = () => {
  const { gameIds, setCurrentId, games } = useContext(TuringControllerContext)
  return (
    <div className="flex flex-row flex-wrap items-start justify-start gap-1 overflow-y-auto">
      {gameIds.map((id) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <span
          key={id}
          onClick={() => setCurrentId(id)}
          className={`${!games[id].result ? 'bg-button-secondary' : games[id].result?.correct ? 'bg-engine-4' : 'bg-human-4'} h-7 w-7 cursor-pointer rounded-sm`}
        />
      ))}
    </div>
  )
}
