import Head from 'next/head'
import { NextPage } from 'next'
import { useContext, useState } from 'react'
import Chessground from '@react-chess/chessground'

import { WindowSizeContext } from 'src/contexts'
import { Opening, OpeningVariation } from 'src/types'
import openings from 'src/utils/openings/openings.json'
import { OpeningBook, OpeningDetails, PlayOpening } from 'src/components'

const OpeningsPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Openings – Maia Chess</title>
        <meta name="description" content="Practice openings" />
      </Head>
      <div className="flex h-full w-full flex-col items-center py-4 md:py-10">
        <Openings />
      </div>
    </>
  )
}

const Openings: React.FC = () => {
  const { isMobile } = useContext(WindowSizeContext)

  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [selectedOpening, setSelectedOpening] = useState<Opening>(openings[0])
  const [selectedVariation, setSelectedVariation] =
    useState<OpeningVariation | null>(null)

  const desktopLayout = () => (
    <div className="flex h-full w-[90%] flex-row items-center justify-between gap-4">
      <OpeningBook
        openings={openings}
        selectedOpening={selectedOpening}
        selectedVariation={selectedVariation}
        setSelectedOpening={setSelectedOpening}
        setSelectedVariation={setSelectedVariation}
      />
      <div className="relative aspect-square w-[75vh]">
        <Chessground
          contained
          config={{
            orientation,
            viewOnly: true,
            fen: selectedVariation
              ? selectedVariation.fen
              : selectedOpening.fen,
          }}
        />
      </div>
      <div className="flex min-h-[75vh] flex-1 flex-col justify-between gap-4 md:min-w-[40vh] md:max-w-[30%]">
        <OpeningDetails
          selectedOpening={selectedOpening}
          selectedVariation={selectedVariation}
        />
        <PlayOpening
          setOrientation={setOrientation}
          selectedOpening={selectedOpening}
          selectedVariation={selectedVariation}
        />
      </div>
    </div>
  )

  const mobileLayout = () => (
    <div className="flex h-full w-full flex-col items-center justify-between gap-2">
      <OpeningBook
        openings={openings}
        selectedOpening={selectedOpening}
        selectedVariation={selectedVariation}
        setSelectedOpening={setSelectedOpening}
        setSelectedVariation={setSelectedVariation}
      />
      <div className="relative aspect-square h-[100vw] w-[100vw]">
        <Chessground
          contained
          config={{
            orientation,
            viewOnly: true,
            fen: selectedVariation
              ? selectedVariation.fen
              : selectedOpening.fen,
          }}
        />
      </div>
      <div className="flex h-[75vh] flex-1 flex-col justify-between gap-2">
        <OpeningDetails
          selectedOpening={selectedOpening}
          selectedVariation={selectedVariation}
        />
        <PlayOpening
          setOrientation={setOrientation}
          selectedOpening={selectedOpening}
          selectedVariation={selectedVariation}
        />
      </div>
    </div>
  )

  return <>{isMobile ? mobileLayout() : desktopLayout()}</>
}

export default OpeningsPage
