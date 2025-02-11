/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Tooltip } from 'react-tooltip'
import { useContext, useMemo, Fragment } from 'react'
import { AnalysisGameControllerContext, WindowSizeContext } from 'src/contexts'
import { GameNode, AnalyzedGame, Termination, ClientBaseGame } from 'src/types'

interface Props {
  game: ClientBaseGame | AnalyzedGame
  highlightIndices?: number[]
  termination?: Termination
}

export const AnalysisMovesContainer: React.FC<Props> = ({
  game,
  highlightIndices,
  termination,
}: Props) => {
  const { currentNode, goToNode } = useContext(AnalysisGameControllerContext)

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

  return (
    <div className="red-scrollbar grid h-64 grid-cols-5 overflow-y-auto overflow-x-hidden whitespace-nowrap rounded-sm bg-background-1/60 md:h-full md:w-full">
      <Tooltip id="check" />
      {moves.map(([whiteNode, blackNode], index) => {
        return (
          <>
            <span className="flex h-7 items-center justify-center bg-background-2 text-sm text-secondary">
              {index + 1}
            </span>
            <div
              onClick={() => {
                goToNode(whiteNode)
              }}
              data-index={index * 2 + 1}
              className={`col-span-2 flex h-7 flex-1 cursor-pointer flex-row items-center justify-between px-2 text-sm hover:bg-background-2 ${currentNode === whiteNode && 'bg-background-2'} ${highlightSet.has(index * 2 + 1) && 'bg-human-3/80'}`}
            >
              {whiteNode?.san ?? whiteNode?.move}
            </div>
            {whiteNode.getVariations().length ? (
              <FirstVariation
                node={whiteNode}
                currentNode={currentNode}
                goToNode={goToNode}
              />
            ) : null}
            <div
              onClick={() => {
                if (blackNode) goToNode(blackNode)
              }}
              data-index={index * 2 + 2}
              className={`col-span-2 flex h-7 flex-1 cursor-pointer flex-row items-center justify-between px-2 text-sm hover:bg-background-2 ${currentNode === blackNode && 'bg-background-2'} ${highlightSet.has(index * 2 + 2) && 'bg-human-3/80'}`}
            >
              {blackNode?.san ?? blackNode?.move}
            </div>
          </>
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
}
function FirstVariation({
  node,
  currentNode,
  goToNode,
}: {
  node: GameNode
  currentNode: GameNode | undefined
  goToNode: (node: GameNode) => void
}) {
  return (
    <>
      <div className="col-span-2"></div>
      <div className="col-span-5 py-1">
        <ul className="root list-none pl-6">
          {node.getVariations().map((n) => (
            <VariationTree
              key={n.move}
              node={n}
              currentNode={currentNode}
              goToNode={goToNode}
              level={0}
            />
          ))}
        </ul>
      </div>
      <div className="col-span-3"></div>
    </>
  )
}

function VariationTree({
  node,
  currentNode,
  goToNode,
  level,
}: {
  node: GameNode
  currentNode: GameNode | undefined
  goToNode: (node: GameNode) => void
  level: number
}) {
  const variations = node.getVariations()
  return (
    <li className={`tree-li ${level === 0 ? 'no-tree-connector' : ''}`}>
      <span
        onClick={() => goToNode(node)}
        className={`cursor-pointer text-xs ${
          currentNode?.fen === node?.fen ? 'text-primary' : 'text-secondary'
        }`}
      >
        {node.moveNumber}. {node.turn === 'w' ? '...' : ''} {node.san}
      </span>
      {variations.length === 1 ? (
        <span className="inline">
          <InlineChain
            node={node}
            currentNode={currentNode}
            goToNode={goToNode}
            level={level}
          />
        </span>
      ) : variations.length > 1 ? (
        <ul className="tree-ul list-none">
          {variations.map((child) => (
            <VariationTree
              key={child.move}
              node={child}
              currentNode={currentNode}
              goToNode={goToNode}
              level={level + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
function InlineChain({
  node,
  currentNode,
  goToNode,
  level,
}: {
  node: GameNode
  currentNode: GameNode | undefined
  goToNode: (node: GameNode) => void
  level: number
}) {
  const chain: GameNode[] = []
  let current = node

  while (current.getVariations().length === 1) {
    const child = current.getVariations()[0]
    chain.push(child)
    current = child
  }

  return (
    <>
      <span className="inline whitespace-normal break-words">
        {chain.map((child, index) => (
          <Fragment key={child.move}>
            <span
              onClick={() => goToNode(child)}
              className={`cursor-pointer text-xs ${
                currentNode?.fen === child?.fen
                  ? 'text-primary'
                  : 'text-secondary'
              }`}
            >
              {child.moveNumber}. {child.turn === 'w' ? '...' : ''} {child.san}
            </span>
          </Fragment>
        ))}
      </span>
      {current.getVariations().length > 1 && (
        <ul className="tree-ul list-none">
          {current.getVariations().map((child) => (
            <VariationTree
              key={child.move}
              node={child}
              currentNode={currentNode}
              goToNode={goToNode}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </>
  )
}
