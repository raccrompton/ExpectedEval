import { useContext } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

import { ModalContext, AuthContext } from 'src/contexts'
import { PlayType } from 'src/types'

interface PlaySectionProps {
  id: string
}

export const PlaySection = ({ id }: PlaySectionProps) => {
  const { setPlaySetupModalProps } = useContext(ModalContext)
  const { user } = useContext(AuthContext)

  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  const startGame = () => {
    setPlaySetupModalProps({ playType: 'againstMaia' as PlayType })
  }

  return (
    <section
      id={id}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-1 py-16"
      ref={ref}
    >
      <div className="container mx-auto flex flex-col items-center px-4 md:flex-row md:gap-12 lg:gap-16">
        {/* Content */}
        <motion.div
          className="mb-10 w-full md:mb-0 md:w-1/2"
          initial={{ opacity: 0, x: -50 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="mb-4 inline-block rounded-full bg-human-3/10 px-4 py-1 text-sm font-medium text-human-3">
            Play Against Maia
          </div>
          <h2 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
            Experience human-like chess AI
          </h2>
          <p className="mb-8 text-lg text-primary/80">
            Challenge Maia, a neural network trained to play like humans of
            different ratings. Unlike traditional engines that play the best
            moves, Maia predicts and plays what a human would do.
          </p>
          <div className="flex flex-wrap gap-4">
            {user?.lichessId ? (
              <button
                onClick={startGame}
                className="flex items-center justify-center rounded-md bg-human-3 px-6 py-3 font-medium text-white transition duration-200 hover:bg-opacity-90"
              >
                Play Now
              </button>
            ) : (
              <a
                href="https://lichess.org/@/maia1"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-md bg-human-3 px-6 py-3 font-medium text-white transition duration-200 hover:bg-opacity-90"
              >
                Play on Lichess
              </a>
            )}
            <a
              href="#features"
              className="flex items-center justify-center rounded-md border border-background-2 bg-background-1 px-6 py-3 font-medium transition duration-200 hover:bg-background-2"
            >
              Learn More
            </a>
          </div>
        </motion.div>

        {/* Chessboard Visual */}
        <motion.div
          className="relative w-full md:w-1/2"
          initial={{ opacity: 0, x: 50 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background-2 shadow-xl">
            {/* Chess board visualization */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
              {[...Array(64)].map((_, i) => {
                const isWhite = ((i % 8) + Math.floor(i / 8)) % 2 === 0
                return (
                  <div
                    key={i}
                    className={`${isWhite ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}`}
                  />
                )
              })}
            </div>

            {/* Overlay effect */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background-1/5 via-transparent to-background-1/50">
              <motion.div
                className="h-16 w-16 rounded-full bg-human-3/30"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </div>
          </div>
          <motion.div
            className="absolute -bottom-5 -right-5 rounded-lg bg-human-3/10 p-4 backdrop-blur-md md:p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p className="font-medium text-human-3">
              Models range from 1100-1900 Elo
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Parallax decorative elements */}
      <motion.div
        className="absolute -top-20 left-10 h-40 w-40 rounded-full bg-human-3/5"
        animate={{
          y: inView ? [0, 20, 0] : 0,
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          times: [0, 0.5, 1],
        }}
      />
      <motion.div
        className="absolute bottom-10 right-10 h-60 w-60 rounded-full bg-engine-3/5"
        animate={{
          y: inView ? [0, -20, 0] : 0,
        }}
        transition={{
          repeat: Infinity,
          duration: 4,
          times: [0, 0.5, 1],
          delay: 1,
        }}
      />
    </section>
  )
}
