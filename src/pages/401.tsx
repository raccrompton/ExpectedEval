import Link from 'next/link'
import Head from 'next/head'
import { useContext } from 'react'
import { useRouter } from 'next/router'
import Chessground from '@react-chess/chessground'

import { AuthContext } from 'src/contexts'

export default function Error401Page() {
  const router = useRouter()
  const { user, connectLichess } = useContext(AuthContext)

  if (user?.lichessId) {
    router.push('/')
  }

  return (
    <div className="absolute flex h-full w-full flex-col items-center justify-center gap-8 px-4 md:flex-row md:px-0">
      <Head>
        <title>Beta Access – Maia Chess</title>
        <meta
          name="description"
          content="Maia Chess is in beta! Sign up to get access"
        />
      </Head>
      <div
        style={{
          width: 'min(40vw, 40vh)',
          height: 'min(40vw, 40vh)',
        }}
      >
        <Chessground
          contained
          config={{
            fen: 'rn1qkb1r/ppp1pBpp/5n2/4N3/8/2N5/PPPP1PPP/R1BbK2R b KQkq - 0 7',
            check: 'black',
          }}
        />
      </div>
      <div className="flex flex-col items-center gap-2 md:items-start md:gap-3">
        <h2 className="text-2xl md:text-3xl">Log in or sign up!</h2>
        <p className="max-w-md text-center text-secondary md:text-left md:text-lg">
          We are currently beta testing the new Maia Chess platform! If you part
          of the beta, please{' '}
          <button onClick={connectLichess} className="underline">
            sign in with Lichess
          </button>
          . Otherwise,{' '}
          <a
            target="_blank"
            href="https://forms.gle/VAUKap4uwMGXJH3N8"
            className="underline"
            rel="noreferrer"
          >
            sign up for the beta
          </a>{' '}
          or{' '}
          <a
            target="_blank"
            href="https://lichess.org/@/maia1"
            className="underline"
            rel="noreferrer"
          >
            play Maia on Lichess
          </a>
          ! Join our{' '}
          <a
            target="_blank"
            rel="noreferrer"
            className="underline"
            href="https://discord.gg/Az93GqEAs7"
          >
            Discord
          </a>{' '}
          and stay tuned for our full release
        </p>
        <div className="flex items-center gap-4">
          <a
            target="_blank"
            href="https://forms.gle/VAUKap4uwMGXJH3N8"
            className="rounded bg-blue-400 px-4 py-2 text-lg hover:bg-blue-500 md:px-6 md:py-3 md:text-xl"
            rel="noreferrer"
          >
            Sign up for the BETA
          </a>
          <Link href="/">
            <button className="rounded bg-blue-400 px-4 py-2 text-lg hover:bg-blue-500 md:px-6 md:py-3 md:text-xl">
              Go home
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
