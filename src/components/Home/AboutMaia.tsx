import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

import personJon from './people/jon.jpg'
import personSid from './people/sid.jpeg'
import personReid from './people/reid.jpg'
import personIsaac from './people/isaac.jpg'
import personKevin from './people/kevin.jpg'
import personJoseph from './people/joseph.jpg'
import personAshton from './people/ashton.jpeg'
import personDmitriy from './people/dmitriy.jpg'
import { EnvelopeSquareIcon, GithubIcon } from 'src/components/Icons/icons'
import { TeamMember } from './TeamMember'

const teamMembers = [
  {
    image: personAshton,
    name: 'Ashton Anderson',
    website: 'http://www.cs.toronto.edu/~ashton/',
    institution: 'University of Toronto',
    role: 'Principal Investigator',
    email: 'ashton@cs.toronto.edu',
    github: 'ashtona',
  },
  {
    image: personJon,
    name: 'Jon Kleinberg',
    website: 'https://www.cs.cornell.edu/home/kleinber/',
    institution: 'Cornell University',
    role: 'Principal Investigator',
    email: 'kleinber@cs.cornell.edu',
  },
  {
    image: personReid,
    name: 'Reid McIlroy-Young',
    website: 'https://reidmcy.com/',
    institution: 'University of Toronto',
    role: 'Graduate Student',
    email: 'reid@cs.toronto.edu',
    github: 'reidmcy',
  },
  {
    image: personSid,
    name: 'Siddhartha Sen',
    website: 'https://www.microsoft.com/en-us/research/people/sidsen/',
    institution: 'Microsoft Research',
    role: 'Principal Investigator',
    email: 'sidsen@microsoft.com',
    github: 'sidsen',
  },
  {
    image: personDmitriy,
    name: 'Dmitriy Ostrovsky',
    website: 'https://github.com/dostro',
    institution: 'Independent Researcher',
    role: 'Research Engineer',
    github: 'dostro',
  },
  {
    image: personJoseph,
    name: 'Joseph Benton',
    website: 'https://github.com/jpbenton',
    institution: 'University of Toronto',
    role: 'Data Scientist',
  },
  {
    image: personIsaac,
    name: 'Isaac Tamblyn',
    website: 'https://github.com/tamblyne',
    institution: 'National Research Council Canada',
    role: 'Principal Investigator',
  },
  {
    image: personKevin,
    name: 'Kevin Thomas',
    website: 'https://kevinjosethomas.com/',
    institution: 'Burnaby South Secondary',
    role: 'Web Developer',
  },
]

export const AboutMaia = () => {
  const [projectRef, projectInView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  const [teamRef, teamInView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  const [acknowledgementsRef, acknowledgementsInView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  return (
    <div className="font-helvetica [&_a]:text-human-3">
      <section
        id="main_info"
        className="relative flex items-center justify-center bg-background-1 py-20 text-center"
        ref={projectRef}
      >
        <div className="z-10 mx-auto my-0 max-w-[1170px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <motion.h3
              className="text-xl font-bold uppercase"
              initial={{ opacity: 0, y: 20 }}
              animate={
                projectInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3 }}
            >
              Human-AI Collaboration for Chess
            </motion.h3>
            <motion.h2
              className="mx-auto my-8 text-center text-4xl font-bold"
              initial={{ opacity: 0, y: 20 }}
              animate={
                projectInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              What is Maia Chess?
            </motion.h2>
            <motion.p
              className="text-primary/90"
              initial={{ opacity: 0, y: 20 }}
              animate={
                projectInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              Maia is a human-like chess engine, designed to play like a human
              instead of playing the strongest moves. Maia uses the same deep
              learning techniques that power superhuman chess engines, but with
              a novel approach: Maia is trained to play like a human rather than
              to win.
            </motion.p>
            <br />
            <br />
            <motion.p
              className="text-primary/90"
              initial={{ opacity: 0, y: 20 }}
              animate={
                projectInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              Maia is trained to predict human moves rather than to find the
              optimal move in a position. As a result, Maia exhibits common
              human biases and makes many of the same mistakes that humans make.
              We have trained a set of nine neural network engines, each
              targeting a specific rating level on the Lichess.org rating scale,
              from 1100 to 1900.
            </motion.p>
            <br />
            <br />
            <motion.p
              className="text-primary/90"
              initial={{ opacity: 0, y: 20 }}
              animate={
                projectInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              We introduced Maia in our paper that appeared at NeurIPS 2020.
            </motion.p>
            <br />
            <motion.div
              className="mx-auto flex items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={
                projectInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/"
                  className="rounded bg-human-3 p-4 !text-white transition-opacity hover:opacity-90"
                >
                  Play Maia Chess
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://maiachess.com/maia-paper.pdf"
                  className="rounded bg-engine-3 p-4 !text-white transition-opacity hover:opacity-90"
                >
                  Read Paper
                </a>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section
        id="team_info"
        className="relative overflow-hidden bg-background-2 py-20"
        ref={teamRef}
      >
        <div className="relative z-10 mx-auto my-0 max-w-[1170px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <motion.h3
              className="text-center text-xl font-bold uppercase"
              initial={{ opacity: 0, y: 20 }}
              animate={
                teamInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3 }}
            >
              Team
            </motion.h3>
            <motion.p
              className="mb-10 mt-2 text-center text-primary/90"
              initial={{ opacity: 0, y: 20 }}
              animate={
                teamInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              The Maia team consists of students, postdocs, and faculty spanning
              Cornell University and the University of Toronto.
            </motion.p>
          </div>
          <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-10 px-4 text-center md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member, index) => (
              <TeamMember key={member.name} {...member} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative flex flex-col justify-evenly overflow-hidden bg-background-1 py-20"
        ref={acknowledgementsRef}
      >
        <div className="z-10 mx-auto my-0 max-w-[1170px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <motion.h3
              className="text-center text-xl font-bold uppercase"
              initial={{ opacity: 0, y: 20 }}
              animate={
                acknowledgementsInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3 }}
            >
              Acknowledgments
            </motion.h3>
            <motion.p
              className="text-center text-primary/90"
              initial={{ opacity: 0, y: 20 }}
              animate={
                acknowledgementsInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              Many thanks to Lichess.org for providing the human games that we
              trained on and hosting our Maia models that you can play against.
              Ashton Anderson was supported in part by an NSERC grant, a
              Microsoft Research gift, and a CFI grant. Jon Kleinberg was
              supported in part by a Simons Investigator Award, a Vannevar Bush
              Faculty Fellowship, a MURI grant, and a MacArthur Foundation
              grant.
            </motion.p>
          </div>
        </div>
      </section>
    </div>
  )
}
