import { motion } from 'framer-motion'

export const PageNavigation = () => {
  return (
    <motion.div
      className="sticky top-0 z-20 flex flex-row items-center justify-center gap-6 border-y border-background-3/20 bg-background-2 py-4 text-sm uppercase tracking-wider backdrop-blur-md"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <NavLink href="#play-section" label="Play" />
      <NavLink href="#analysis-section" label="Analysis" />
      <NavLink href="#train-section" label="Train" />
      <NavLink href="#more-features" label="Features" />
      <NavLink href="#main_info" label="Project" />
      <NavLink href="#team_info" label="Team" />
    </motion.div>
  )
}

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const targetId = href.substring(1)
    const targetElement = document.getElementById(targetId)

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className="relative px-2 !text-primary"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
      <motion.div
        className="absolute -bottom-1 left-0 h-0.5 w-0 bg-human-3"
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.2 }}
      />
    </motion.a>
  )
}
