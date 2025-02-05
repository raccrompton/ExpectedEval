import Link from 'next/link'
import { useCallback, useContext, useEffect, useState } from 'react'

import {
  SunIcon,
  UserIcon,
  ArrowIcon,
  TuringIcon,
  TrainIcon,
  RegularPlayIcon,
} from 'src/components/Icons/icons'
import { PlayType } from 'src/types'
import { getPlayerStats } from 'src/api/home'
import { AuthContext, ModalContext } from 'src/contexts'

interface Props {
  scrollHandler: () => void
}

export const HomeHero: React.FC<Props> = ({ scrollHandler }: Props) => {
  const { setPlaySetupModalProps } = useContext(ModalContext)

  const startGame = useCallback(
    (playType: PlayType) => {
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
      <div className="flex flex-row items-center gap-2">
        <i className="*:h-7 *:w-7 *:fill-primary">{UserIcon}</i>
        <p>{user?.displayName || 'Guest'}</p>
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
        <div className="flex flex-col items-center justify-center">
          <button
            className="rounded-sm bg-[#629924] px-2 py-1 text-sm text-white transition duration-200 hover:bg-opacity-80"
            onClick={() => connectLichess()}
          >
            Connect with Lichess
          </button>
          <p className="text-sm">to save your stats and more!</p>
        </div>
      )}
    </>
  )

  return (
    <div className="relative flex flex-col items-center justify-center">
      <BetaBlurb />
      <div className="flex w-full max-w-[1200px] flex-col items-center justify-center gap-16 p-4 text-left md:flex-row">
        <div className="flex w-full flex-col items-start justify-center gap-2 md:w-[40%]">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold leading-relaxed">
              A human-like chess engine
            </h1>
            <p className="text-2xl">
              Maia is a neural network chess engine with a more human-like
              style, trained from online human games.
            </p>
          </div>
          <button
            className="flex items-center gap-4 rounded-sm bg-background-2 px-4 py-3 hover:bg-human-4/30"
            onClick={scrollHandler}
          >
            <p>More about Maia</p>
            <i className="h-4">{ArrowIcon}</i>
          </button>
        </div>
        <div className="grid w-full flex-1 grid-cols-1 gap-5 pb-4 md:w-auto md:grid-cols-2">
          {user?.lichessId ? (
            <button
              onClick={() => startGame('againstMaia')}
              className="flex cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-sm border-none bg-[#7095c7] py-6 text-center text-white transition duration-200 hover:bg-opacity-80"
            >
              <i className="w-12">
                <RegularPlayIcon />
              </i>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold">Play Maia</h2>
                <p className="text-xs">Classic chess versus human-like Maia</p>
              </div>
            </button>
          ) : (
            <a
              href="https://lichess.org/@/maia1"
              target="_blank"
              rel="noreferrer"
              className="flex cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-sm border-none bg-[#7095c7] py-6 text-center text-white transition duration-200 hover:bg-opacity-80"
            >
              <i className="w-12">
                <RegularPlayIcon />
              </i>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold">Play Maia</h2>
                <p className="text-xs">Classic chess versus human-like Maia</p>
              </div>
            </a>
          )}
          <button
            onClick={() => startGame('handAndBrain')}
            className="flex cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-sm border-none bg-[#6e879c] py-6 text-center text-white transition duration-200 hover:bg-opacity-80"
          >
            <i className="w-12">
              <TuringIcon />
            </i>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold">Play Hand and Brain</h2>
              <p className="text-xs">A chess variant with Maia on your team</p>
            </div>
          </button>
          <Link
            href="/train"
            className="flex cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-sm border-none bg-[#958a6d] py-6 text-center text-white transition duration-200 hover:bg-opacity-80"
          >
            <i className="w-12">
              <TrainIcon />
            </i>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold">Train</h2>
              <p className="text-xs">Solve puzzles with Maia</p>
            </div>
          </Link>
          <Link
            href="/turing"
            className="flex cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-sm border-none bg-[#a3a6a1] py-6 text-center text-white transition duration-200 hover:bg-opacity-80"
          >
            <i className="w-12">
              <TuringIcon />
            </i>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold">Bot-or-Not</h2>
              <p className="text-xs">Distinguish human from machine play</p>
            </div>
          </Link>
          {user?.lichessId ? (
            <Link
              href="/profile"
              className="flex w-full flex-col items-start justify-between gap-4 rounded-sm bg-background-2 px-6 py-4 transition duration-200 hover:bg-human-4/20 md:col-span-2 md:h-20 md:flex-row md:items-center md:gap-0 md:py-0"
            >
              {profileContent}
            </Link>
          ) : (
            <div className="flex w-full flex-row items-center justify-between rounded-sm bg-background-2 px-6 py-4 md:col-span-2 md:h-20 md:py-0">
              {profileContent}
            </div>
          )}
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
        <div className="my-4 flex w-screen flex-col items-start bg-engine-1 p-3 transition md:mt-0 md:w-auto md:rounded">
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
        <div className="my-4 flex w-screen flex-col items-start bg-human-4 p-3 transition md:mt-0 md:w-auto md:rounded">
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
