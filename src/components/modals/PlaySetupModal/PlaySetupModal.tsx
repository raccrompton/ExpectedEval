import Image from 'next/image'
import { useRouter } from 'next/router'
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
import styles from './PlaySetupModal.module.scss'
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
    <div className={styles.optionSelect}>
      {options.map((option, index) => {
        return (
          <button
            key={index}
            className={option == selected ? styles.selected : ''}
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
  const [isBrain, setIsBrain] = useState<boolean>(props.isBrain || true)
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
    <ModalContainer dismiss={() => setPlaySetupModalProps(undefined)}>
      <div className={styles.playSetup}>
        <button
          className={styles.close}
          title="Close"
          onClick={() => setPlaySetupModalProps(undefined)}
        >
          {CloseIcon}
        </button>
        <h2>
          {props.playType == 'againstMaia'
            ? 'Play Maia'
            : 'Play Hand and Brain'}
        </h2>
        {props.playType == 'handAndBrain' ? (
          <>
            <div className={styles.option}>
              Play as:{' '}
              <OptionSelect
                options={[true, false]}
                labels={['Brain', 'Hand']}
                selected={isBrain}
                onChange={setIsBrain}
              />
            </div>
            <div className={styles.selectParent}>
              Partner:{' '}
              <select
                value={maiaPartnerVersion}
                className={styles.select}
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

        <div className={styles.selectParent}>
          Opponent:{' '}
          <select
            value={maiaVersion}
            className={styles.select}
            onChange={(e) => setMaiaVersion(e.target.value)}
          >
            {maiaOptions.map((maia) => (
              <option key={`opponent_${maia}`} value={maia}>
                {maia.replace('maia_kdd_', 'Maia ')}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.option}>
          Time control:{' '}
          <OptionSelect
            options={TimeControlOptions}
            labels={TimeControlOptionNames}
            selected={timeControl}
            onChange={setTimeControl}
          />
        </div>
        {/* {typeToPlay == 'handAndBrain' ? (
          <div className={styles.selectParent}>
            Friendly Maia model:{' '}
            <select
              className={styles.select}
              value={friendlyMaiaVersion}
              onChange={(e) => setFriendlyMaiaVersion(e.target.value)}
            >
              {maiaOptions.map((maia) => (
                <option key={maia} value={maia}>
                  {maia.replace('maia_kdd_', 'Maia ')}
                </option>
              ))}
            </select>
          </div>
        ) : null} */}
        {/* <button
          className={styles.moreOptionsButton}
          onClick={() => setMoreOptionsOpen(!openMoreOptions)}
        >
          {openMoreOptions ? <>&#9660;</> : <>&#9654;</>} More options
        </button> */}
        {openMoreOptions ? (
          <div className={styles.moreOptions}>
            {/* <div>
              <input
                type="checkbox"
                id="simulateMaiaTime"
                checked={simulateMaiaTime}
                onChange={() => setSimulateMaiaTime(!simulateMaiaTime)}
              />
              <label htmlFor="simulateMaiaTime">
                Simulate human move times{' '}
                <abbr title="Disable to have Maia move instantly">?</abbr>
              </label>
            </div> */}
            <div>
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
          </div>
        ) : null}
        {fen !== undefined ? (
          <div className={styles.fen}>
            <input
              type="text"
              value={fen}
              placeholder="Starting position"
              onChange={(e) => setFen(e.target.value)}
            />
          </div>
        ) : null}
        <div className={styles.playButtons}>
          <button onClick={() => start('black')} title="Play as black">
            <div>
              <Image src={bK} fill={true} alt="" />
            </div>
          </button>
          <button
            onClick={() => start(undefined)}
            title="Play as random colour"
          >
            <div>
              <Image src={wbK} fill={true} alt="" />
            </div>
          </button>
          <button onClick={() => start('white')} title="Play as white">
            <div>
              <Image src={wK} fill={true} alt="" />
            </div>
          </button>
        </div>
      </div>
    </ModalContainer>
  )
}
