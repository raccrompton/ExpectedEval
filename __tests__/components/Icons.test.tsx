import { render, screen } from '@testing-library/react'
import {
  RegularPlayIcon,
  BrainIcon,
  BotOrNotIcon,
  TrainIcon,
  HandIcon,
  StarIcon,
  ChessboardIcon,
  GithubIcon,
  DiscordIcon,
  FlipIcon,
} from '../../src/components/Common/Icons'

describe('Icons Component', () => {
  describe('SVG Icons', () => {
    it('should render RegularPlayIcon with correct src and alt', () => {
      render(<RegularPlayIcon />)
      const icon = screen.getByAltText('Regular Play Icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('src', '/assets/icons/regular_play_icon.svg')
    })

    it('should render BrainIcon with correct src and alt', () => {
      render(<BrainIcon />)
      const icon = screen.getByAltText('Brain Icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('src', '/assets/icons/brain_icon.svg')
    })

    it('should render BotOrNotIcon with correct src and alt', () => {
      render(<BotOrNotIcon />)
      const icon = screen.getByAltText('Bot-or-Not Icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('src', '/assets/icons/turing_icon.svg')
    })

    it('should render TrainIcon with correct src and alt', () => {
      render(<TrainIcon />)
      const icon = screen.getByAltText('Train Icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('src', '/assets/icons/train_icon.svg')
    })

    it('should render HandIcon with correct src and alt', () => {
      render(<HandIcon />)
      const icon = screen.getByAltText('Hand Icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('src', '/assets/icons/hand_icon.svg')
    })

    it('should render StarIcon with correct src and alt', () => {
      render(<StarIcon />)
      const icon = screen.getByAltText('Star Icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('src', '/assets/icons/star_icon.svg')
    })

    it('should render ChessboardIcon with correct src and alt', () => {
      render(<ChessboardIcon />)
      const icon = screen.getByAltText('Chessboard Icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('src', '/assets/icons/chessboard_icon.svg')
    })
  })

  describe('SVG Component Icons', () => {
    it('should render GithubIcon as SVG element', () => {
      const { container } = render(<div>{GithubIcon}</div>)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
      expect(svg).toHaveAttribute('height', '1em')
      expect(svg).toHaveAttribute('viewBox', '0 0 496 512')
    })

    it('should render DiscordIcon as SVG element', () => {
      const { container } = render(<div>{DiscordIcon}</div>)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 127.14 96.36')
    })

    it('should render FlipIcon as SVG element', () => {
      const { container } = render(<div>{FlipIcon}</div>)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('fill', 'white')
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
      expect(svg).toHaveAttribute('viewBox', '1 1 22 22')
      expect(svg).toHaveAttribute('width', '14px')
      expect(svg).toHaveAttribute('height', '14px')
    })
  })

  describe('Icon accessibility', () => {
    it('should have alt text for all image icons', () => {
      const imageIcons = [
        { component: <RegularPlayIcon />, alt: 'Regular Play Icon' },
        { component: <BrainIcon />, alt: 'Brain Icon' },
        { component: <BotOrNotIcon />, alt: 'Bot-or-Not Icon' },
        { component: <TrainIcon />, alt: 'Train Icon' },
        { component: <HandIcon />, alt: 'Hand Icon' },
        { component: <StarIcon />, alt: 'Star Icon' },
        { component: <ChessboardIcon />, alt: 'Chessboard Icon' },
      ]

      imageIcons.forEach(({ component, alt }) => {
        render(component)
        expect(screen.getByAltText(alt)).toBeInTheDocument()
      })
    })
  })
})
