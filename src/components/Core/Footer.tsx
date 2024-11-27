export const Footer: React.FC = () => {
  const dot = ' · '

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-1 py-4">
        <p className="text-center text-sm">
          <a
            className="opacity-70 transition duration-300 hover:opacity-90"
            href="mailto:maiachess@cs.toronto.edu"
            target="_blank"
            rel="noreferrer"
          >
            maiachess@cs.toronto.edu
          </a>
          {dot}
          <a
            className="opacity-70 transition duration-300 hover:opacity-90"
            href="https://twitter.com/maiachess"
            target="_blank"
            rel="noreferrer"
          >
            @maiachess
          </a>
          {dot}A project by the{' '}
          <a
            className="opacity-70 transition duration-300 hover:opacity-90"
            href="http://csslab.cs.toronto.edu/"
            target="_blank"
            rel="noreferrer"
          >
            University of Toronto CSSLab
          </a>
        </p>
        <p className="text-center text-sm">
          © 2024 Maia Chess. All rights reserved.
          {/* {dot}
          <a
            href="/privacy"
            className="opacity-70 transition duration-300 hover:opacity-90"
          >
            Privacy Policy
          </a>
          {dot}
          <a
            href="/tos"
            className="opacity-70 transition duration-300 hover:opacity-90"
          >
            TOS
          </a> */}
        </p>
      </div>
    </>
  )
}
