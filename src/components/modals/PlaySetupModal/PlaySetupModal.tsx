import Image from 'next/image'
import { useRouter } from 'next/router'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useContext, useState } from 'react'

import {
  Color,
  PlayType,
  TimeControl,
  TimeControlOptionNames,
  TimeControlOptions,
} from 'src/types'
import bK from './bK.svg'
import wK from './wK.svg'
import wbK from './wbK.svg'
import { ModalContext } from 'src/contexts'
import { ModalContainer } from '../ModalContainer'
import { CloseIcon } from 'src/components/Icons/icons'

const maiaOptions = [
  'maia_kdd_1100',
  'maia_kdd_1200',
  'maia_kdd_1300',
  'maia_kdd_1400',
  'maia_kdd_1500',
  'maia_kdd_1600',
  'maia_kdd_1700',
  'maia_kdd_1800',
  'maia_kdd_1900',
]

interface OptionSelectProps<T> {
  options: T[]
  labels: string[]
  selected: T
  onChange: (selected: T) => void
}

function OptionSelect<T>({
  options,
  labels,
  selected,
  onChange,
}: OptionSelectProps<T>) {
  return (
    <div className="flex flex-row items-center overflow-hidden rounded-sm">
      {options.map((option, index) => {
        return (
          <button
            key={index}
            className={`cursor-pointer bg-background-2 px-4 py-1 text-primary ${option === selected ? 'bg-human-4' : 'hover:bg-human-4/80'} transition duration-200`}
            onClick={() => onChange(option)}
          >
            {labels[index]}
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  playType: PlayType
  player?: Color
  timeControl?: TimeControl
  maiaPartnerVersion?: string
  maiaVersion?: string
  isBrain?: boolean
  sampleMoves?: boolean
  simulateMaiaTime?: boolean
  startFen?: string
}

export const PlaySetupModal: React.FC<Props> = (props: Props) => {
  const { setPlaySetupModalProps } = useContext(ModalContext)
  const { push } = useRouter()

  const [timeControl, setTimeControl] = useState<TimeControl>(
    props.timeControl || TimeControlOptions[0],
  )
  const [isBrain, setIsBrain] = useState<boolean>(props.isBrain || false)
  const [sampleMoves, setSampleMoves] = useState<boolean>(
    props.sampleMoves || true,
  )
  const [simulateMaiaTime, setSimulateMaiaTime] = useState<boolean>(
    props.simulateMaiaTime || true,
  )

  const [maiaPartnerVersion, setMaiaPartnerVersion] = useState<string>(
    props.maiaPartnerVersion || maiaOptions[0],
  )
  const [maiaVersion, setMaiaVersion] = useState<string>(
    props.maiaVersion || maiaOptions[0],
  )
  const [fen, setFen] = useState<string | undefined>(
    props.startFen ? props.startFen : undefined,
  )

  const [openMoreOptions, setMoreOptionsOpen] = useState<boolean>(true)

  const start = useCallback(
    (color: Color | undefined) => {
      setPlaySetupModalProps(undefined)

      const player = color ?? ['white', 'black'][Math.floor(Math.random() * 2)]

      if (props.playType == 'againstMaia') {
        push({
          pathname: '/play/maia',
          query: {
            player: player,
            //maiaPartnerVersion: maiaPartnerVersion,
            maiaVersion: maiaVersion,
            timeControl: timeControl,
            sampleMoves: sampleMoves,
            simulateMaiaTime: simulateMaiaTime,
            startFen: fen,
          },
        })
      } else {
        push({
          pathname: '/play/hb',
          query: {
            player: player,
            maiaPartnerVersion: maiaPartnerVersion,
            maiaVersion: maiaVersion,
            timeControl: timeControl,
            isBrain: isBrain,
            sampleMoves: sampleMoves,
            simulateMaiaTime: simulateMaiaTime,
            startFen: fen,
          },
        })
      }
    },
    [
      setPlaySetupModalProps,
      props.playType,
      push,
      maiaPartnerVersion,
      maiaVersion,
      timeControl,
      sampleMoves,
      simulateMaiaTime,
      fen,
      isBrain,
    ],
  )

  return (
    <AnimatePresence>
      <ModalContainer dismiss={() => setPlaySetupModalProps(undefined)}>
        <div className="relative flex flex-col justify-center gap-6 text-left">
          <button
            className="absolute -right-4 -top-2 cursor-pointer border-none bg-none opacity-50 transition duration-200 *:text-primary hover:opacity-100"
            title="Close"
            onClick={() => setPlaySetupModalProps(undefined)}
          >
            {CloseIcon}
          </button>
          <h2 className="text-center text-2xl font-bold">
            {props.playType == 'againstMaia'
              ? 'Play Maia'
              : 'Play Hand and Brain'}
          </h2>
          <div className="flex flex-col items-start gap-4">
            {props.playType == 'handAndBrain' ? (
              <>
                <div className="flex items-center justify-center gap-2">
                  Play as:{' '}
                  <OptionSelect
                    options={[false, true]}
                    labels={['Hand', 'Brain']}
                    selected={isBrain}
                    onChange={setIsBrain}
                  />
                </div>
                <div className="flex items-center justify-start gap-2">
                  Partner:{' '}
                  <select
                    value={maiaPartnerVersion}
                    className="overflow-hidden rounded-sm bg-background-2 px-2 py-1 focus:outline-none"
                    onChange={(e) => setMaiaPartnerVersion(e.target.value)}
                  >
                    {maiaOptions.map((maia) => (
                      <option key={`partner_${maia}`} value={maia}>
                        {maia.replace('maia_kdd_', 'Maia ')}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
            <div className="flex items-center justify-start gap-2">
              Opponent:
              <select
                value={maiaVersion}
                className="overflow-hidden rounded-sm bg-background-2 px-2 py-1 focus:outline-none"
                onChange={(e) => setMaiaVersion(e.target.value)}
              >
                {maiaOptions.map((maia) => (
                  <option key={`opponent_${maia}`} value={maia}>
                    {maia.replace('maia_kdd_', 'Maia ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-row items-center justify-start gap-2">
              Time control:{' '}
              <OptionSelect
                options={TimeControlOptions}
                labels={TimeControlOptionNames}
                selected={timeControl}
                onChange={setTimeControl}
              />
            </div>
            {openMoreOptions ? (
              <div className="flex cursor-pointer flex-row items-center justify-start gap-1 text-sm">
                <input
                  type="checkbox"
                  id="sample"
                  checked={fen !== undefined}
                  onChange={() => setFen(fen === undefined ? '' : undefined)}
                />
                <label htmlFor="sample">
                  Start from position{' '}
                  <abbr title="Start game at a custom position">?</abbr>
                </label>
              </div>
            ) : null}
            {fen !== undefined ? (
              <div>
                <input
                  type="text"
                  value={fen}
                  placeholder="Starting FEN position"
                  onChange={(e) => setFen(e.target.value)}
                  className="rounded-sm bg-background-2 px-1 py-1 text-sm text-secondary placeholder:text-secondary focus:outline-none"
                />
              </div>
            ) : null}
            <div className="flex w-full items-end justify-center gap-2">
              <button
                onClick={() => start('black')}
                title="Play as black"
                className="flex cursor-pointer select-none items-center justify-center rounded-sm border-none bg-background-2 p-2 text-center text-xl outline-none transition duration-200 hover:bg-human-4"
              >
                <div className="relative h-16 w-16">
                  <Image src={bK} fill={true} alt="" />
                </div>
              </button>
              <button
                onClick={() => start(undefined)}
                title="Play as random colour"
                className="flex cursor-pointer select-none items-center justify-center rounded-sm border-none bg-background-2 p-4 text-center text-xl outline-none transition duration-200 hover:bg-human-4"
              >
                <div className="relative h-20 w-20">
                  <Image src={wbK} fill={true} alt="" />
                </div>
              </button>
              <button
                onClick={() => start('white')}
                title="Play as white"
                className="flex cursor-pointer select-none items-center justify-center rounded-sm border-none bg-background-2 p-2 text-center text-xl outline-none transition duration-200 hover:bg-human-4"
              >
                <div className="relative h-16 w-16">
                  <Image src={wK} fill={true} alt="" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </ModalContainer>
    </AnimatePresence>
  )
}
