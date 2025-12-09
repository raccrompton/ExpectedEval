/**
 * Export Game Component
 *
 * Provides FEN and PGN export functionality for analyzed chess games.
 * Displays the current position FEN and full game PGN with copy-to-clipboard
 * buttons for easy sharing.
 *
 * Used in the ExpectedEval MVP analysis interface.
 */

/* eslint-disable jsx-a11y/click-events-have-key-events */
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'

import { AnalyzedGame, GameTree, GameNode } from 'src/types'

/**
 * Props for the ExportGame component
 * Simplified for MVP to only support analysis mode
 */
interface Props {
  game: AnalyzedGame
  whitePlayer: string
  blackPlayer: string
  event: string
  type: 'analysis'
  currentNode: GameNode
}

export const ExportGame: React.FC<Props> = (props) => {
  // Destructure props for easier access
  const { game, whitePlayer, blackPlayer, event, currentNode } = props

  // State for the displayed FEN and PGN strings
  const [fen, setFen] = useState('')
  const [pgn, setPgn] = useState('')

  // Get the game tree from the analyzed game
  const gameTree = game.tree

  useEffect(() => {
    const tree = new GameTree(gameTree.getRoot().fen)
    tree.setHeader('ID', game.id)
    tree.setHeader('Event', event)
    tree.setHeader('Site', 'https://maiachess.com/')
    tree.setHeader('White', whitePlayer)
    tree.setHeader('Black', blackPlayer)
    if (game.termination) {
      tree.setHeader('Result', game.termination.result)
      if (game.termination.condition) {
        tree.setHeader('Termination', game.termination.condition)
      }
    }

    const originalMoves = gameTree.toMoveArray()
    const originalTimes = gameTree.toTimeArray()
    tree.addMovesToMainLine(originalMoves, originalTimes)

    setPgn(tree.toPGN())
    setFen(currentNode.fen)
  }, [
    currentNode,
    game.moves,
    game.id,
    game.termination,
    whitePlayer,
    blackPlayer,
    event,
    gameTree,
  ])

  // Copy content to clipboard and show success toast
  const copy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-0.5">
        <div className="flex w-full items-center justify-between">
          <p className="select-none text-xs font-semibold tracking-wider text-secondary">
            FEN
          </p>
          <i
            tabIndex={0}
            role="button"
            onClick={() => copy(fen)}
            className="material-symbols-outlined select-none !text-xs text-secondary hover:text-primary"
          >
            content_copy
          </i>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => copy(fen)}
          className="border-1 group flex w-full cursor-pointer overflow-x-hidden rounded border border-white/5 bg-background-1/50 p-1"
        >
          <p className="whitespace-nowrap text-xxs text-secondary group-hover:text-secondary/80">
            {fen}
          </p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-0.5">
        <div className="flex w-full items-center justify-between">
          <div className="flex w-full items-center">
            <p className="select-none text-xs font-semibold tracking-wider text-secondary">
              PGN
            </p>
          </div>
          <i
            tabIndex={0}
            role="button"
            onClick={() => copy(pgn)}
            className="material-symbols-outlined select-none !text-xs text-secondary hover:text-primary"
          >
            content_copy
          </i>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => copy(pgn)}
          className="group flex w-full cursor-pointer overflow-x-hidden overflow-y-scroll rounded border border-white/5 bg-background-1/50 p-1"
        >
          <p className="whitespace-pre-wrap text-xxs text-secondary group-hover:text-secondary/80">
            {pgn}
          </p>
        </div>
      </div>
    </div>
  )
}
