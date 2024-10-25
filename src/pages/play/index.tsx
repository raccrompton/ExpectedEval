import { NextPage } from 'next'
import Head from 'next/head'
import styles from 'src/styles/App.module.scss'

import { useRouter } from 'next/router'
import { useCallback, useContext, useEffect, useState } from 'react'
import { PlayType } from 'src/types/play'
import { ModalContext } from 'src/contexts'

const PlayPage: NextPage = () => {
  const router = useRouter()
  const { setPlaySetupModalProps } = useContext(ModalContext)
  const [launchedModal, setLaunchedModal] = useState<boolean>(false)

  const { fen } = router.query

  useEffect(() => {
    if (!router.isReady) {
      return
    }

    if (!launchedModal) {
      setPlaySetupModalProps({
        playType: 'againstMaia',
        startFen: typeof fen == 'string' ? fen : undefined,
      })
      setLaunchedModal(true)
    }
  }, [router.isReady, fen, launchedModal, setPlaySetupModalProps])

  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== router.asPath) {
        setPlaySetupModalProps(undefined)
      }
    }
    router.events.on('routeChangeStart', handleStart)

    return () => {
      router.events.off('routeChangeStart', handleStart)
    }
  })

  return (
    <>
      <Head>
        <title>Maia Chess - Play</title>
        <meta name="description" content="Turing survey" />
      </Head>
      <div className={styles.outer}>
        {/* <div className={styles.gameMenu}>
          <button onClick={() => startGame('againstMaia')}>Play Maia</button>
          <a
            href="https://lichess.org/@/maia1"
            target="_blank"
            rel="noreferrer"
          >
            Play Maia on Lichess
          </a>
          <button onClick={() => startGame('handAndBrain')}>
            Play Hand and Brain
          </button>
        </div> */}
      </div>
    </>
  )
}

export default PlayPage
