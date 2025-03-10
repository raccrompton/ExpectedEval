import Image, { StaticImageData } from 'next/image'
import { EnvelopeSquareIcon, GithubIcon } from 'src/components/Icons/icons'

interface TeamMemberProps {
  image: StaticImageData
  name: string
  website?: string
  institution: string
  role: string
  email?: string
  github?: string
}

export const TeamMember = ({
  image,
  name,
  website,
  institution,
  role,
  email,
  github,
}: TeamMemberProps) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <Image
        src={image}
        className="h-48 w-48 rounded-full"
        alt={`Picture of ${name}`}
      />
      <div className="flex flex-col">
        {website ? (
          <a
            target="_blank"
            rel="noreferrer"
            href={website}
            className="text-2xl"
          >
            {name}
          </a>
        ) : (
          <span className="text-2xl">{name}</span>
        )}
        <p>{institution}</p>
      </div>
      <p className="font-semibold">{role}</p>
      {(email || github) && (
        <div className="flex items-center justify-center space-x-4">
          {email && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`mailto:${email}`}
              className="*:h-5 *:w-5 *:fill-human-3"
            >
              {EnvelopeSquareIcon}
            </a>
          )}
          {github && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/${github}`}
              className="*:h-5 *:w-5 *:fill-human-3"
            >
              {GithubIcon}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
