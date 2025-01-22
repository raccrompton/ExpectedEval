import {
  useRef,
  useMemo,
  Dispatch,
  useState,
  useEffect,
  useContext,
  SetStateAction,
} from 'react'
import { motion } from 'framer-motion'

import { Tournament } from 'src/components'
import { AnalysisListContext, GameControllerContext } from 'src/contexts'

interface ClientAnalysisGameListProps {
  currentId: string[] | null
  currentMaiaModel: string
  loadNewTournamentGame: (
    newId: string[],
    setCurrentMove: Dispatch<SetStateAction<number>>,
  ) => Promise<void>
  loadNewLichessGames: (
    id: string,
    pgn: string,
    setCurrentMove: Dispatch<SetStateAction<number>>,
    currentMaiaModel: string,
  ) => Promise<void>
  loadNewUserGames: (
    id: string,
    type: 'play' | 'hand' | 'brain',
    setCurrentMove: Dispatch<SetStateAction<number>>,
    currentMaiaModel: string,
  ) => Promise<void>
}

export const ClientAnalysisGameList: React.FC<ClientAnalysisGameListProps> = ({
  currentId,
  currentMaiaModel,
  loadNewTournamentGame,
  loadNewLichessGames,
  loadNewUserGames,
}) => {
  const controller = useContext(GameControllerContext)
  const {
    analysisPlayList,
    analysisHandList,
    analysisBrainList,
    analysisLichessList,
    analysisTournamentList,
  } = useContext(AnalysisListContext)

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

  const [selected, setSelected] = useState<
    'tournament' | 'pgn' | 'play' | 'hand' | 'brain'
  >('pgn')
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(initialOpenIndex)

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
      <div className="flex w-full flex-col">
        <div className="grid select-none grid-cols-5 border-b-2 border-white border-opacity-10">
          <Header
            label="Play"
            name="play"
            selected={selected}
            setSelected={setSelected}
          />
          <Header
            label="Hand"
            name="hand"
            selected={selected}
            setSelected={setSelected}
          />
          <Header
            label="Brain"
            name="brain"
            selected={selected}
            setSelected={setSelected}
          />
          <Header
            label="Lichess"
            name="pgn"
            selected={selected}
            setSelected={setSelected}
          />
          <Header
            label="WC Matches"
            name="tournament"
            selected={selected}
            setSelected={setSelected}
          />
        </div>
        <div className="red-scrollbar flex max-h-64 flex-col overflow-y-scroll md:max-h-[60vh]">
          {selected === 'tournament' ? (
            <>
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
            </>
          ) : (
            <>
              {(selected === 'play'
                ? analysisPlayList
                : selected === 'hand'
                  ? analysisHandList
                  : selected === 'brain'
                    ? analysisBrainList
                    : analysisLichessList
              ).map((game, index) => {
                const selectedGame = currentId && currentId[0] === game.id
                return (
                  <button
                    key={index}
                    onClick={async () => {
                      setLoadingIndex(index)
                      if (game.type === 'pgn') {
                        await loadNewLichessGames(
                          game.id,
                          game.pgn as string,
                          controller.setCurrentIndex,
                          currentMaiaModel,
                        )
                      } else {
                        await loadNewUserGames(
                          game.id,
                          game.type as 'play' | 'hand' | 'brain',
                          controller.setCurrentIndex,
                          currentMaiaModel,
                        )
                      }
                      setLoadingIndex(null)
                    }}
                    className={`group flex w-full cursor-pointer items-center gap-2 pr-2 ${selectedGame ? 'bg-background-2 font-bold' : index % 2 === 0 ? 'bg-background-1/30 hover:bg-background-2' : 'bg-background-1/10 hover:bg-background-2'}`}
                  >
                    <div
                      className={`flex h-full w-10 items-center justify-center py-1 ${selectedGame ? 'bg-background-3' : 'bg-background-2 group-hover:bg-white/5'}`}
                    >
                      <p className="text-secondary">{index + 1}</p>
                    </div>
                    <div className="flex flex-1 items-center justify-between overflow-hidden py-1">
                      <p className="overflow-hidden text-ellipsis whitespace-nowrap text-primary">
                        {game.label}
                      </p>
                      <p className="whitespace-nowrap text-secondary">
                        {game.result}
                      </p>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  ) : null
}

function Header({
  name,
  label,
  selected,
  setSelected,
}: {
  label: string
  name: 'tournament' | 'play' | 'hand' | 'brain' | 'pgn'
  selected: 'tournament' | 'play' | 'hand' | 'brain' | 'pgn'
  setSelected: (name: 'tournament' | 'play' | 'hand' | 'brain' | 'pgn') => void
}) {
  return (
    <button
      onClick={() => setSelected(name)}
      className={`relative flex items-center justify-center py-0.5 ${selected === name ? 'bg-human-4/30' : 'bg-background-1/80 hover:bg-background-2'} transition duration-200`}
    >
      <div className="flex items-center justify-start gap-1">
        <p
          className={`text-sm transition duration-200 ${selected === name ? 'text-human-2' : 'text-primary'}`}
        >
          {label}
        </p>
        <i
          className={`material-symbols-outlined text-base transition duration-200 ${selected === name ? 'text-human-2/80' : 'text-primary/80'}`}
        >
          keyboard_arrow_down
        </i>
      </div>
      {selected === name && (
        <motion.div
          layoutId="underline"
          className="absolute -bottom-0.5 h-0.5 w-full bg-human-2/80"
        ></motion.div>
      )}
    </button>
  )
}
