/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Tooltip } from 'react-tooltip'
import { useContext, useMemo } from 'react'
import { ClientGameControllerContext, WindowSizeContext } from 'src/contexts'
import { GameNode, AnalyzedGame, Termination, ClientBaseGame } from 'src/types'

interface Props {
  game: ClientBaseGame | AnalyzedGame
  highlightIndices?: number[]
  termination?: Termination
}

export const ClientMovesContainer: React.FC<Props> = ({
  game,
  highlightIndices,
  termination,
}: Props) => {
  const { currentNode, goToNode } = useContext(ClientGameControllerContext)

  const { isMobile } = useContext(WindowSizeContext)

  const mainLineNodes = useMemo(() => {
    if (!game.tree) return []
    return game.tree.getMainLine()
  }, [game.tree])

  const moves = useMemo(() => {
    return mainLineNodes.slice(1).reduce((rows: GameNode[][], node, index) => {
      index % 2 === 0 ? rows.push([node]) : rows[rows.length - 1].push(node)
      return rows
    }, [])
  }, [mainLineNodes])

  const highlightSet = useMemo(
    () => new Set(highlightIndices ?? []),
    [highlightIndices],
  )

  const container = (
    <div className="red-scrollbar flex h-64 flex-col overflow-y-auto overflow-x-hidden whitespace-nowrap rounded-sm bg-background-1/60 md:h-full md:w-full">
      <Tooltip id="check" />
      {moves.map(([whiteNode, blackNode], index) => {
        return (
          <div key={index} className="flex w-full flex-row">
            <span className="flex w-1/6 items-center justify-center bg-background-2 py-1 text-sm text-secondary">
              {index + 1}
            </span>
            <div
              onClick={() => {
                goToNode(whiteNode)
              }}
              data-index={index * 2 + 1}
              className={`flex flex-1 cursor-pointer flex-row items-center justify-between px-2 hover:bg-background-2 ${currentNode === whiteNode && 'bg-engine-3/90'} ${highlightSet.has(index * 2 + 1) && 'bg-human-3/80'}`}
            >
              {whiteNode?.san ?? whiteNode?.move}
            </div>
            <div
              onClick={() => {
                if (blackNode) goToNode(blackNode)
              }}
              data-index={index * 2 + 2}
              className={`flex flex-1 cursor-pointer flex-row items-center justify-between px-2 hover:bg-background-2 ${currentNode === blackNode && 'bg-engine-3/90'} ${highlightSet.has(index * 2 + 2) && 'bg-human-3/80'}`}
            >
              {blackNode?.san ?? blackNode?.move}
            </div>
          </div>
        )
      })}
      {termination && !isMobile && (
        <div
          className="cursor-pointer rounded-sm border border-primary/10 bg-background-1/90 p-5 text-center opacity-90"
          onClick={() => goToNode(mainLineNodes[mainLineNodes.length - 1])}
        >
          {termination.result}
          {', '}
          {termination.winner !== 'none'
            ? `${termination.winner} is victorious`
            : 'draw'}
        </div>
      )}
    </div>
  )

  return container
}
