import Image, { StaticImageData } from 'next/image'
import { motion } from 'framer-motion'
import { EnvelopeSquareIcon, GithubIcon } from 'src/components/Icons/icons'

interface TeamMemberProps {
  image: StaticImageData
  name: string
  website?: string
  institution: string
  role: string
  email?: string
  github?: string
  index?: number
}

export const TeamMember = ({
  image,
  name,
  website,
  institution,
  role,
  email,
  github,
  index = 0,
}: TeamMemberProps) => {
  return (
    <motion.div
      className="flex flex-col items-center space-y-4"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.3,
        delay: 0.1 + ((index * 0.05) % 0.5), // Stagger effect but cap at 0.5s
        ease: 'easeOut',
      }}
    >
      <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
        <Image
          src={image}
          className="h-48 w-48 rounded-full"
          alt={`Picture of ${name}`}
        />
      </motion.div>
      <motion.div
        className="flex flex-col"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.2 + ((index * 0.05) % 0.5) }}
      >
        {website ? (
          <motion.a
            target="_blank"
            rel="noreferrer"
            href={website}
            className="text-2xl"
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
          >
            {name}
          </motion.a>
        ) : (
          <span className="text-2xl">{name}</span>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.3 + ((index * 0.05) % 0.5) }}
        >
          {institution}
        </motion.p>
      </motion.div>
      <motion.p
        className="font-semibold"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.3 + ((index * 0.05) % 0.5) }}
      >
        {role}
      </motion.p>
      {(email || github) && (
        <motion.div
          className="flex items-center justify-center space-x-4"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.4 + ((index * 0.05) % 0.5) }}
        >
          {email && (
            <motion.a
              target="_blank"
              rel="noreferrer"
              href={`mailto:${email}`}
              className="*:h-5 *:w-5 *:fill-human-3"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {EnvelopeSquareIcon}
            </motion.a>
          )}
          {github && (
            <motion.a
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/${github}`}
              className="*:h-5 *:w-5 *:fill-human-3"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {GithubIcon}
            </motion.a>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
