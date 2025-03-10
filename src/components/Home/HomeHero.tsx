import Link from 'next/link'
import { useCallback, useContext } from 'react'

import {
  SunIcon,
  UserIcon,
  ArrowIcon,
  TuringIcon,
  TrainIcon,
  RegularPlayIcon,
  ChessboardIcon,
  StarIcon,
} from 'src/components/Icons/icons'
import { PlayType } from 'src/types'
import { AuthContext, ModalContext } from 'src/contexts'

interface Props {
  scrollHandler: () => void
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
  href?: string
  external?: boolean
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  onClick,
  href,
  external,
}) => {
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (onClick) {
      return (
        <button onClick={onClick} className="w-full">
          {children}
        </button>
      )
    }
    if (href) {
      if (external) {
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        )
      }
      return <Link href={href}>{children}</Link>
    }
    return <>{children}</>
  }

  return (
    <CardWrapper>
      <div className="flex h-full min-h-[140px] cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-md border-none bg-background-2 p-4 text-center transition duration-200 hover:bg-human-4/20">
        <i className="w-10">{icon}</i>
        <div className="flex flex-col">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="h-10 text-xs">{description}</p>
        </div>
      </div>
    </CardWrapper>
  )
}

export const HomeHero: React.FC<Props> = ({ scrollHandler }: Props) => {
  const { setPlaySetupModalProps } = useContext(ModalContext)
  const { user, connectLichess } = useContext(AuthContext)

  const startGame = useCallback(
    (playType: PlayType) => {
      setPlaySetupModalProps({ playType: playType })
    },
    [setPlaySetupModalProps],
  )

  return (
    <div className="relative flex flex-col items-center justify-center pb-16 pt-24 md:pb-28 md:pt-36">
      {/* <BetaBlurb /> */}
      <div className="flex w-full max-w-[1200px] flex-col items-center justify-center gap-16 p-4 text-left md:flex-row md:gap-20">
        <div className="flex w-full flex-col items-start justify-center gap-8 md:w-[40%]">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              A human-like chess engine
            </h1>
            <p className="text-xl text-primary/80 md:text-2xl">
              Maia is a neural network chess engine with a more human-like
              style, trained from online human games.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              className="flex items-center justify-center gap-2 rounded-md bg-human-3 px-6 py-3 text-white transition duration-200 hover:bg-opacity-90"
              onClick={scrollHandler}
            >
              <p>Learn More</p>
              <i className="h-4">{ArrowIcon}</i>
            </button>
            {!user?.lichessId && (
              <button
                className="flex items-center justify-center gap-2 rounded-md border border-background-2 bg-background-1 px-6 py-3 transition duration-200 hover:bg-background-2"
                onClick={() => connectLichess()}
              >
                Connect with Lichess
              </button>
            )}
          </div>
        </div>

        <div className="grid w-full flex-1 grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<RegularPlayIcon />}
            title="Play Maia"
            description="Play chess against the human-like Maia engine"
            {...(user?.lichessId
              ? { onClick: () => startGame('againstMaia') }
              : { href: 'https://lichess.org/@/maia1', external: true })}
          />
          <FeatureCard
            icon={<ChessboardIcon />}
            title="Analysis"
            description="Analyze games with Maia's human-like insights"
            href="/analysis"
          />
          <FeatureCard
            icon={<TrainIcon />}
            title="Train"
            description="Improve your skills with Maia's training puzzles"
            href="/train"
          />
          <FeatureCard
            icon={<TuringIcon />}
            title="Hand & Brain"
            description="Play a collaborative chess variant with Maia"
            onClick={() => startGame('handAndBrain')}
          />
          <FeatureCard
            icon={<StarIcon />}
            title="Openings"
            description="Learn and practice chess openings with Maia"
            href="/openings"
          />
          <FeatureCard
            icon={<TuringIcon />}
            title="Bot-or-Not"
            description="Distinguish between human and AI play"
            href="/turing"
          />
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
