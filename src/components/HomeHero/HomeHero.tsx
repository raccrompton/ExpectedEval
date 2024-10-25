import Link from 'next/link'
import classNames from 'classnames'
import { useCallback, useContext, useEffect, useState } from 'react'

import {
  SunIcon,
  UserIcon,
  ArrowIcon,
  TuringIcon,
  TrainIcon,
  RegularPlayIcon,
} from 'src/components/Icons/icons'
import { getPlayerStats } from 'src/api/home'
import styles from 'src/styles/Home.module.scss'
import { AuthContext, ModalContext } from 'src/contexts'

interface Props {
  scrollHandler: () => void
}

export const HomeHero: React.FC<Props> = ({ scrollHandler }: Props) => {
  const { setPlaySetupModalProps } = useContext(ModalContext)

  const startGame = useCallback(
    (playType) => {
      setPlaySetupModalProps({ playType: playType })
    },
    [setPlaySetupModalProps],
  )

  const { user, connectLichess } = useContext(AuthContext)

  const [stats, setStats] = useState({
    regularRating: 1500,
    handRating: 1500,
    brainRating: 1500,
    trainRating: 1500,
    botNotRating: 1500,
  })
  useEffect(() => {
    ;(async () => {
      setStats(await getPlayerStats())
    })()
  }, [])

  const profileContent = (
    <>
      <div className={styles.username}>
        {UserIcon}
        {user?.displayName || 'Guest'}
      </div>
      {user?.lichessId ? (
        <div className="flex flex-row items-center gap-6">
          {[
            ['Regular', stats.regularRating || '...'],
            ['Hand', stats.handRating || '...'],
            ['Brain', stats.brainRating || '...'],
            ['Puzzles', stats.trainRating || '...'],
            ['Bot/Not', stats.botNotRating || '...'],
          ].map(([title, rating]) => (
            <div key={title} className="flex flex-col items-center gap-0.5">
              <div className="text-xs uppercase">{title}</div>
              <div className="text-xl">{rating}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.guestOverlay}>
          <button
            className={styles.connectButton}
            onClick={() => connectLichess()}
          >
            Connect with Lichess
          </button>
          <div>to save your stats and more!</div>
        </div>
      )}
    </>
  )

  const profile = user?.lichessId ? (
    <Link href="/profile" className={styles.userProfile}>
      {profileContent}
    </Link>
  ) : (
    <div className={styles.userProfile}>{profileContent}</div>
  )

  return (
    <div className="relative flex flex-col items-center justify-center">
      <BetaBlurb />
      <div className={styles.container}>
        <div className={styles.blurb}>
          <h1>A human-like chess engine</h1>
          <p className="intro-text">
            Maia is a neural network chess engine with a more human-like style,
            trained from online human games.
          </p>
          <button className={styles.moreButton} onClick={scrollHandler}>
            More about Maia <div className={styles.downArrow}>{ArrowIcon}</div>
          </button>
        </div>
        <div className={styles.actionButtons}>
          {user?.lichessId ? (
            <button
              onClick={() => startGame('againstMaia')}
              className={styles.actionButton}
            >
              <RegularPlayIcon />
              <div className={styles.title}>Play Maia</div>
              <div className={styles.subtitle}>
                Classic chess versus human-like Maia
              </div>
            </button>
          ) : (
            <a
              href="https://lichess.org/@/maia1"
              target="_blank"
              rel="noreferrer"
              className={styles.actionButton}
            >
              <RegularPlayIcon />
              <div className={styles.title}>Play Maia</div>
              <div className={styles.subtitle}>
                Classic chess versus human-like Maia
              </div>
            </a>
          )}
          <button
            onClick={() => startGame('handAndBrain')}
            className={classNames([styles.actionButton, styles.hasNewBadge])}
          >
            <TuringIcon />
            <div className={styles.title}>Play Hand and Brain</div>
            <div className={styles.subtitle}>
              A chess variant with Maia on your team
            </div>
          </button>
          <Link href="/train" className={styles.actionButton}>
            <TrainIcon />
            <div className={styles.title}>Train</div>
            <div className={styles.subtitle}>Solve puzzles with Maia</div>
          </Link>
          <Link href="/turing" className={styles.actionButton}>
            <TuringIcon />
            <div className={styles.title}>Bot-or-Not</div>
            <div className={styles.subtitle}>
              Distinguish human from machine play
            </div>
          </Link>
          {profile}
        </div>
      </div>
    </div>
  )
}

function BetaBlurb() {
  const { user, connectLichess } = useContext(AuthContext)

  return (
    <>
      {user?.lichessId ? (
        <div className="my-4 mt-20 flex w-screen flex-col items-start bg-engine-1 p-3 transition md:mt-0 md:w-auto md:rounded">
          <div className="flex items-center gap-2">
            <div className="*:h-5 *:w-5">{SunIcon}</div>
            <p className="text-lg font-medium">Maia Chess is in private beta</p>
          </div>
          <p className="max-w-2xl text-left text-sm">
            You are logged in to the new Beta Maia Chess platform! Report any
            bugs using the Feedback form in the header, and{' '}
            <a
              target="_blank"
              rel="noreferrer"
              className="underline"
              href="https://discord.gg/Az93GqEAs7"
            >
              join our Discord
            </a>{' '}
            and stay tuned for our full release in the upcoming weeks.
          </p>
        </div>
      ) : (
        <div className="my-4 mt-20 flex w-screen flex-col items-start bg-human-4 p-3 transition md:mt-0 md:w-auto md:rounded">
          <div className="flex items-center gap-2">
            <div className="*:h-5 *:w-5">{SunIcon}</div>
            <p className="text-lg font-medium">Maia Chess is in private beta</p>
          </div>
          <p className="max-w-4xl text-left text-sm">
            We are currently beta testing the new Maia Chess platform! If you
            were invited to test the Beta launch, please{' '}
            <button onClick={connectLichess} className="underline">
              sign in with Lichess
            </button>{' '}
            before proceeding. Otherwise, you can{' '}
            <a
              target="_blank"
              rel="noreferrer"
              className="underline"
              href="https://forms.gle/VAUKap4uwMGXJH3N8"
            >
              sign up for the beta
            </a>{' '}
            or play{' '}
            <a
              target="_blank"
              rel="noreferrer"
              className="underline"
              href="https://lichess.org/@/maia1"
            >
              Maia on Lichess
            </a>
            !{' '}
            <a
              target="_blank"
              rel="noreferrer"
              className="underline"
              href="https://discord.gg/Az93GqEAs7"
            >
              Join our Discord
            </a>{' '}
            and stay tuned for our full release in the upcoming weeks.
          </p>
        </div>
      )}
    </>
  )
}
