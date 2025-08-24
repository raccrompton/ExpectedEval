// Define footer data structure
interface FooterLink {
  href: string
  text: string
  icon?: string
}

interface FooterSection {
  title: string
  links: FooterLink[]
}

export const Footer: React.FC = () => {
  const footerSections: FooterSection[] = [
    {
      title: 'Opensource',
      links: [
        {
          href: 'https://github.com/CSSLab/maia2',
          text: 'Maia-2 Model',
        },
        {
          href: 'https://github.com/raccrompton/ExpectedEval',
          text: 'ExpectedEval Platform',
        },
        {
          href: 'https://github.com/csslab/maia-platform-frontend',
          text: 'Maia Chess',
        },
      ],
    },
    {
      title: 'Contact',
      links: [
        {
          href: 'mailto:alex@alexcrompton.com',
          text: 'alex@alexcrompton.com',
          icon: 'mail',
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col items-start justify-center gap-8 bg-background-1/60 px-6 py-8 md:items-center md:px-4">
      <div className="flex w-full max-w-4xl flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-center md:gap-8">
        <div className="mb-2 flex flex-col items-start gap-1 md:mb-0 md:items-center md:gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-primary">ExpectedEval</p>
          </div>
          <p className="max-w-[200px] text-left text-sm text-secondary md:max-w-[160px] md:text-center md:text-xs">
            Based on MaiaChess by the{' '}
            <a
              target="_blank"
              rel="noreferrer"
              href="http://csslab.cs.toronto.edu/"
              className="text-primary"
            >
              University of Toronto CSSLab
            </a>
          </p>
        </div>
        <div className="hidden h-10 w-[1px] rounded-full bg-white opacity-20 md:block" />
        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          {footerSections.map((section, index) => (
            <div
              key={index}
              className="flex flex-col items-start justify-start gap-1.5 md:gap-0.5"
            >
              <p className="text-base font-medium md:text-sm">
                {section.title}
              </p>
              {section.links.map((link, linkIndex) => (
                <a
                  key={linkIndex}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 md:mt-0.5"
                >
                  {link.icon ? (
                    <div className="flex items-center gap-1.5 text-secondary transition duration-200 hover:text-primary/80">
                      <span className="material-symbols-outlined !text-sm md:!text-xs">
                        {link.icon}
                      </span>
                      <p className="text-sm md:text-xs">{link.text}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-secondary transition duration-200 hover:text-primary/80 md:text-xs">
                      {link.text}
                    </p>
                  )}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="text-left text-sm text-secondary md:text-center md:text-xs">
        © 2025 ExpectedEval. All rights reserved.
      </p>
    </div>
  )
}
