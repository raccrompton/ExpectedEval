import { TourStep } from 'src/contexts'

export const analysisTourSteps: TourStep[] = [
  {
    id: 'analysis-overview',
    title: 'Welcome to Analysis',
    description:
      'This analysis page merges engine-like insights with human-like move patterns from Maia models. Here you can see how better players approach different moves, understand which positions are more challenging for players at different skill levels, and discover many more metrics that help improve your chess understanding. The interface combines the best of both worlds: optimal moves from Stockfish and realistic human patterns from Maia.',
    targetId: 'analysis',
    placement: 'left',
  },
  {
    id: 'analysis-game-list',
    title: 'Game Selection',
    description:
      'This component allows you to select games to analyze. You can load your Maia or Hand & Brain games on this platform, your Lichess games, World Championship games, or custom PGN/FEN positions.',
    targetId: 'analysis-game-list',
    placement: 'right',
  },
  {
    id: 'analysis-highlight',
    title: 'Analysis Panel',
    description:
      "This panel shows Maia and Stockfish's perspectives on the current position. The left section displays Maia's predicted win probability and the most likely moves at your selected rating level. The right section displays Stockfish's evaluation of the position and the best engine moves. The bottom section shows a textual description of the position.",
    targetId: 'analysis-highlight',
    placement: 'bottom',
  },
  {
    id: 'analysis-moves-by-rating',
    title: 'Moves by Rating',
    description:
      'This chart shows how players different moves as they get stronger. The X-axis shows rating levels, Y-axis shows probability, and each line represents a different move. This helps you understand which moves are typical at different skill levels, and how moves improve as players get stronger.',
    targetId: 'analysis-moves-by-rating',
    placement: 'left',
  },
  {
    id: 'analysis-move-map',
    title: 'Move Map',
    description:
      'This scatter plot visualizes all legal moves on two dimensions: better moves (according to Stockfish) are further right, and more likely moves (according to Maia) are further up. This blends engine accuracy with human-like play patterns, and helps you understand the relationship between engine accuracy and human-like play patterns.',
    targetId: 'analysis-move-map',
    placement: 'left',
  },
  {
    id: 'analysis-blunder-meter',
    title: 'Blunder Meter',
    description:
      'This stacked bar chart shows the probability of good moves, okay moves, and blunders for a player at your configured Maia rating level in the current position. It helps you understand the difficulty of the position, while also showing you how a player of the specified rating level makes good, okay, and bad moves.',
    targetId: 'analysis-blunder-meter',
    placement: 'left',
  },
]

export const tourConfigs = {
  analysis: {
    id: 'analysis',
    name: 'Analysis Page Tour',
    steps: analysisTourSteps,
  },
}
