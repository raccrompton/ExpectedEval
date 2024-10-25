import {
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  Dispatch,
  SetStateAction,
} from 'react'
import { motion } from 'framer-motion'

import Tournament from './Tournament'
import { AnalysisListContext, GameControllerContext } from 'src/contexts'

interface AnalysisGameListProps {
  currentId: string[] | null
  loadNewTournamentGame: (
    newId: string[],
    setCurrentMove: Dispatch<SetStateAction<number>>,
  ) => Promise<void>
  loadNewLichessGames: (
    id: string,
    pgn: string,
    setCurrentMove: Dispatch<SetStateAction<number>>,
  ) => Promise<void>
}

const AnalysisGameList: React.FC<AnalysisGameListProps> = ({
  currentId,
  loadNewTournamentGame,
  loadNewLichessGames,
}) => {
  const [selected, setSelected] = useState<'tournament' | 'lichess'>('lichess')

  const controller = useContext(GameControllerContext)
  const { analysisTournamentList, analysisLichessList } =
    useContext(AnalysisListContext)
  const listKeys = useMemo(() => {
    return analysisTournamentList
      ? Array.from(analysisTournamentList.keys()).sort((a, b) =>
          b.split('---')[1].localeCompare(a.split('---')[1]),
        )
      : []
  }, [analysisTournamentList])

  const initialOpenIndex = useMemo(() => {
    if (analysisTournamentList && currentId) {
      return listKeys.map((m) => m.split('---')[0]).indexOf(currentId[0])
    } else {
      return null
    }
  }, [analysisTournamentList, currentId, listKeys])

  const [openIndex, setOpenIndex] = useState<number | null>(initialOpenIndex)
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null)

  const openElement = useRef<HTMLDivElement>(null)
  const selectedGameElement = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selectedGameElement.current) {
      selectedGameElement.current.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      })
    } else if (openElement.current) {
      openElement.current.scrollIntoView({
        behavior: 'auto',
        block: 'start',
        inline: 'center',
      })
    }
  }),
    [selectedGameElement, openElement]

  useEffect(() => {
    setLoadingIndex(null)
  }, [selected])

  return analysisTournamentList ? (
    <div className="flex flex-col items-start justify-start overflow-hidden rounded bg-background-1">
      <div className="flex min-h-12 w-full items-center justify-center overflow-hidden bg-background-2">
        <button
          onClick={() => setSelected('lichess')}
          className={`relative z-10 flex h-full w-full items-center justify-center py-2 pb-3 transition duration-300 hover:bg-background-3 ${selected === 'lichess' && 'bg-background-5'}`}
        >
          <p className="z-10 font-medium text-primary">Your Games</p>
          {selected === 'lichess' && (
            <motion.div
              layoutId="selected-highlight"
              className="absolute bottom-0 left-0 h-1 w-full rounded bg-primary"
            />
          )}
        </button>
        <button
          onClick={() => setSelected('tournament')}
          className={`relative z-10 flex h-full w-full items-center justify-center py-2 pb-3 transition duration-300 hover:bg-background-3 ${selected === 'tournament' && 'bg-background-5'}`}
        >
          <p className="z-10 font-medium text-primary">WC Matches</p>
          {selected === 'tournament' && (
            <motion.div
              layoutId="selected-highlight"
              className="absolute bottom-0 left-0 h-1 w-full rounded bg-primary"
            />
          )}
        </button>
      </div>
      {selected === 'tournament' ? (
        <div className="flex w-full flex-col justify-start overflow-y-scroll">
          {listKeys.map((id, i) => (
            <Tournament
              key={i}
              id={id}
              index={i}
              openIndex={openIndex}
              currentId={currentId}
              openElement={openElement}
              setOpenIndex={setOpenIndex}
              loadingIndex={loadingIndex}
              setLoadingIndex={setLoadingIndex}
              selectedGameElement={selectedGameElement}
              loadNewTournamentGame={loadNewTournamentGame}
              analysisTournamentList={analysisTournamentList}
              setCurrentMove={controller.setCurrentIndex}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-full w-full flex-col justify-start overflow-y-scroll">
          {analysisLichessList.map((game, index) => {
            const selected =
              currentId && currentId[1] === 'lichess'
                ? currentId[0] === game.id
                : false

            return (
              <button
                key={index}
                onClick={async () => {
                  setLoadingIndex(index)
                  await loadNewLichessGames(
                    game.id,
                    game.pgn,
                    controller.setCurrentIndex,
                  )
                  setLoadingIndex(null)
                }}
                className={`group flex w-full cursor-pointer items-center gap-2 ${selected ? 'bg-background-2 font-bold' : 'hover:bg-background-2'}`}
              >
                <div
                  className={`flex h-full w-10 items-center justify-center ${selected ? 'bg-background-3' : 'bg-background-2 group-hover:bg-background-3'}`}
                >
                  {loadingIndex === index ? (
                    <div className="spinner" />
                  ) : (
                    <p className="text-muted">{index + 1}</p>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between py-1">
                  <p className="text-primary">
                    {game.white} vs. {game.black}
                  </p>
                  <p className="text-muted">{game.result}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  ) : null
}

export default AnalysisGameList
