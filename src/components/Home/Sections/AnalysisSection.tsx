import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

interface AnalysisSectionProps {
  id: string
}

export const AnalysisSection = ({ id }: AnalysisSectionProps) => {
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  return (
    <section
      id={id}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-1 py-16"
      ref={ref}
    >
      <div className="container mx-auto flex flex-col-reverse items-center px-4 md:flex-row md:gap-12 lg:gap-16">
        {/* Image/Visual - Left side for this section */}
        <motion.div
          className="relative mt-10 w-full md:mt-0 md:w-1/2"
          initial={{ opacity: 0, x: -50 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-lg shadow-xl">
            {/* Placeholder for analysis interface image */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-background-2 via-human-3/20 to-background-2">
              <div className="grid h-full w-full grid-cols-2 gap-4 p-6">
                <div className="rounded-lg bg-background-3"></div>
                <div className="flex flex-col gap-2">
                  <div className="h-1/2 rounded-lg bg-background-3"></div>
                  <div className="h-1/2 rounded-lg bg-background-3"></div>
                </div>
                <div className="col-span-2 h-24 rounded-lg bg-background-3"></div>
              </div>
            </div>
          </div>
          <motion.div
            className="absolute -bottom-5 -left-5 rounded-lg bg-engine-3/10 p-4 backdrop-blur-md md:p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p className="font-medium text-engine-3">
              Understand your mistakes
            </p>
          </motion.div>
        </motion.div>

        {/* Content - Right side for this section */}
        <motion.div
          className="w-full md:w-1/2"
          initial={{ opacity: 0, x: 50 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="mb-4 inline-block rounded-full bg-engine-3/10 px-4 py-1 text-sm font-medium text-engine-3">
            Game Analysis
          </div>
          <h2 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
            Analyze games with human-like insights
          </h2>
          <p className="mb-8 text-lg text-primary/80">
            Upload your games and get unique human-centered analysis. Unlike
            traditional engines that focus on perfect play, Maia shows you how
            humans of different strengths would approach your position.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/analysis"
              className="flex items-center justify-center rounded-md bg-engine-3 px-6 py-3 font-medium text-white transition duration-200 hover:bg-opacity-90"
            >
              Try Analysis
            </Link>
            <a
              href="#features"
              className="flex items-center justify-center rounded-md border border-background-2 bg-background-1 px-6 py-3 font-medium transition duration-200 hover:bg-background-2"
            >
              Learn More
            </a>
          </div>
        </motion.div>
      </div>

      {/* Parallax decorative elements */}
      <motion.div
        className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-engine-3/5"
        animate={{
          y: inView ? [0, -20, 0] : 0,
        }}
        transition={{
          repeat: Infinity,
          duration: 4,
          times: [0, 0.5, 1],
        }}
      />
      <motion.div
        className="absolute right-10 top-10 h-60 w-60 rounded-full bg-human-3/5"
        animate={{
          y: inView ? [0, 20, 0] : 0,
        }}
        transition={{
          repeat: Infinity,
          duration: 5,
          times: [0, 0.5, 1],
          delay: 0.5,
        }}
      />
    </section>
  )
}
