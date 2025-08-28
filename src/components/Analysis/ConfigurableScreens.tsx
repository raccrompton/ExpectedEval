import { motion } from 'framer-motion'
import React, { useState } from 'react'
import { ConfigureAnalysis } from 'src/components/Analysis/ConfigureAnalysis'
import { LearnFromMistakes } from 'src/components/Analysis/LearnFromMistakes'
import { ExportGame } from 'src/components/Common/ExportGame'
import {
  AnalyzedGame,
  GameNode,
  LearnFromMistakesState,
  MistakePosition,
} from 'src/types'
import { EXPECTED_WINRATE_ENABLED } from 'src/constants/expectedWinrate'
import { ExpectedWinratePanel } from 'src/components/Analysis/ExpectedWinrate/Panel'

interface Props {
  currentMaiaModel: string
  setCurrentMaiaModel: (model: string) => void
  launchContinue: () => void
  MAIA_MODELS: string[]
  game: AnalyzedGame
  currentNode: GameNode
  onDeleteCustomGame?: () => void
  onAnalyzeEntireGame?: () => void
  onLearnFromMistakes?: () => void
  isAnalysisInProgress?: boolean
  isLearnFromMistakesActive?: boolean
  autoSave?: {
    hasUnsavedChanges: boolean
    isSaving: boolean
    status: 'saving' | 'unsaved' | 'saved'
  }
  // Learn from mistakes props
  learnFromMistakesState?: LearnFromMistakesState
  learnFromMistakesCurrentInfo?: {
    mistake: MistakePosition
    progress: string
    isLastMistake: boolean
  } | null
  onShowSolution?: () => void
  onNextMistake?: () => void
  onStopLearnFromMistakes?: () => void
  onSelectPlayer?: (color: 'white' | 'black') => void
  lastMoveResult?: 'correct' | 'incorrect' | 'not-learning'
}

export const ConfigurableScreens: React.FC<Props> = ({
  currentMaiaModel,
  setCurrentMaiaModel,
  launchContinue,
  MAIA_MODELS,
  game,
  currentNode,
  onDeleteCustomGame,
  onAnalyzeEntireGame,
  onLearnFromMistakes,
  isAnalysisInProgress,
  isLearnFromMistakesActive,
  autoSave,
  learnFromMistakesState,
  learnFromMistakesCurrentInfo,
  onShowSolution,
  onNextMistake,
  onStopLearnFromMistakes,
  onSelectPlayer,
  lastMoveResult,
}) => {
  const screens = [
    {
      id: 'configure',
      name: 'Configure',
    },
    {
      id: 'export',
      name: 'Export',
    },
  ]

  const dynamicScreens = [...screens]
  if (EXPECTED_WINRATE_ENABLED) {
    dynamicScreens.push({ id: 'expected-winrate', name: 'Expected Winrate' })
  }

  const [screen, setScreen] = useState((EXPECTED_WINRATE_ENABLED ? { id: 'expected-winrate', name: 'Expected Winrate' } : dynamicScreens[0]))

  // If learn from mistakes is active, show only the learning interface
  if (
    isLearnFromMistakesActive &&
    learnFromMistakesState &&
    (learnFromMistakesCurrentInfo || learnFromMistakesState.showPlayerSelection)
  ) {
    return (
      <div className="flex w-full flex-1 flex-col overflow-hidden bg-background-1/60 md:w-auto md:rounded">
        <div className="red-scrollbar background-1/60 flex flex-1 flex-col items-start justify-start overflow-y-scroll">
          <LearnFromMistakes
            state={learnFromMistakesState}
            currentInfo={learnFromMistakesCurrentInfo || null}
            onShowSolution={
              onShowSolution ||
              (() => {
                /* no-op */
              })
            }
            onNext={
              onNextMistake ||
              (() => {
                /* no-op */
              })
            }
            onStop={
              onStopLearnFromMistakes ||
              (() => {
                /* no-op */
              })
            }
            onSelectPlayer={
              onSelectPlayer ||
              (() => {
                /* no-op */
              })
            }
            lastMoveResult={lastMoveResult || 'not-learning'}
          />
        </div>
      </div>
    )
  }

  // Normal state with configure/export tabs
  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden bg-background-1/60 md:w-auto md:rounded">
      <div className="flex flex-row border-b border-white/10">
        {dynamicScreens.map((s) => {
          const selected = s.id === screen.id
          return (
            <div
              key={s.id}
              tabIndex={0}
              role="button"
              onKeyPress={(e) => {
                if (e.key === 'Enter') setScreen(s)
              }}
              onClick={() => setScreen(s)}
              className={`relative flex cursor-pointer select-none flex-row px-3 py-1.5 transition duration-200 ${selected ? 'bg-white/5' : 'hover:bg-white hover:bg-opacity-[0.02]'}`}
            >
              <p
                className={`text-xs transition duration-200 2xl:text-sm ${selected ? 'text-primary' : 'text-secondary'} `}
              >
                {s.name}
              </p>
              {selected ? (
                <motion.div
                  layoutId="selectedScreen"
                  className="absolute bottom-0 left-0 h-[1px] w-full bg-white"
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="red-scrollbar flex flex-1 flex-col items-start justify-start overflow-y-scroll bg-backdrop/30">
        {screen.id === 'configure' ? (
          <ConfigureAnalysis
            currentMaiaModel={currentMaiaModel}
            setCurrentMaiaModel={setCurrentMaiaModel}
            launchContinue={launchContinue}
            MAIA_MODELS={MAIA_MODELS}
            game={game}
            onDeleteCustomGame={onDeleteCustomGame}
            onAnalyzeEntireGame={onAnalyzeEntireGame}
            onLearnFromMistakes={onLearnFromMistakes}
            isAnalysisInProgress={isAnalysisInProgress}
            isLearnFromMistakesActive={isLearnFromMistakesActive}
            autoSave={autoSave}
          />
        ) : screen.id === 'export' ? (
          <div className="flex w-full flex-col p-3">
            <ExportGame
              game={game}
              currentNode={currentNode}
              whitePlayer={game.whitePlayer.name}
              blackPlayer={game.blackPlayer.name}
              event="Analysis"
              type="analysis"
            />
          </div>
        ) : screen.id === 'expected-winrate' ? (
          <ExpectedWinratePanel
            game={game}
            currentMaiaModel={currentMaiaModel}
          />
        ) : null}
      </div>
    </div>
  )
}
