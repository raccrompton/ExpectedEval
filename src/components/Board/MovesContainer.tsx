/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useContext, useMemo, Fragment, useEffect, useRef } from 'react'
import { WindowSizeContext } from 'src/contexts'
import { GameNode, AnalyzedGame, Termination, BaseGame } from 'src/types'
import { TuringGame } from 'src/types/turing'
import { useBaseTreeController } from 'src/hooks/useBaseTreeController'
import { MoveClassificationIcon } from 'src/components/Common/MoveIcons'

interface AnalysisProps {
  game: BaseGame | AnalyzedGame
  highlightIndices?: number[]
  termination?: Termination
  type: 'analysis'
  showAnnotations?: boolean
  showVariations?: boolean
}

interface TuringProps {
  game: TuringGame
  highlightIndices?: number[]
  termination?: Termination
  type: 'turing'
  showAnnotations?: boolean
  showVariations?: boolean
}

interface PlayProps {
  game: BaseGame
  highlightIndices?: number[]
  termination?: Termination
  type: 'play'
  showAnnotations?: boolean
  showVariations?: boolean
}

type Props = AnalysisProps | TuringProps | PlayProps

// Helper function to get move classification for display
const getMoveClassification = (
  node: GameNode | null,
  currentMaiaModel?: string,
) => {
  if (!node) {
    return {
      blunder: false,
      inaccuracy: false,
      excellent: false,
      bestMove: false,
    }
  }

  return {
    blunder: node.blunder,
    inaccuracy: node.inaccuracy,
    excellent: node.excellentMove,
    bestMove: node.bestMove,
  }
}

export const MovesContainer: React.FC<Props> = (props) => {
  const {
    game,
    highlightIndices,
    termination,
    type,
    showAnnotations = true,
    showVariations = true,
  } = props
  const { isMobile } = useContext(WindowSizeContext)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentMoveRef = useRef<HTMLDivElement>(null)

  // Helper function to determine if move indicators should be shown
  const shouldShowIndicators = (node: GameNode | null) => {
    if (!node || !showAnnotations) return false

    // Calculate ply from start: (moveNumber - 1) * 2 + (turn === 'b' ? 1 : 0)
    const moveNumber = node.moveNumber
    const turn = node.turn
    const plyFromStart = (moveNumber - 1) * 2 + (turn === 'b' ? 1 : 0)

    // Only show indicators after the first 6 ply (moves 1, 2, and 3)
    return plyFromStart >= 6
  }

  const baseController = useBaseTreeController(type)

  const mainLineNodes = useMemo(() => {
    return baseController.gameTree.getMainLine() ?? game.tree.getMainLine()
  }, [game, type, baseController.gameTree, baseController.currentNode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!baseController.currentNode) return

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          if (baseController.currentNode.mainChild) {
            baseController.goToNode(baseController.currentNode.mainChild)
          }
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (baseController.currentNode.parent) {
            baseController.goToNode(baseController.currentNode.parent)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [baseController.currentNode, baseController.goToNode])

  // Auto-scroll to current move
  useEffect(() => {
    if (currentMoveRef.current && containerRef.current) {
      currentMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [baseController.currentNode])

  const moves = useMemo(() => {
    const nodes = mainLineNodes.slice(1)
    const rows: (GameNode | null)[][] = []

    const firstNode = nodes[0]

    if (firstNode && firstNode.turn === 'w') {
      rows.push([null, firstNode])
      for (let i = 1; i < nodes.length; i += 2) {
        rows.push([nodes[i], nodes[i + 1]].filter(Boolean))
      }
    } else {
      return nodes.reduce((rows: (GameNode | null)[][], node, index) => {
        index % 2 === 0 ? rows.push([node]) : rows[rows.length - 1].push(node)
        return rows
      }, [])
    }

    return rows
  }, [mainLineNodes])

  const highlightSet = useMemo(
    () => new Set(highlightIndices ?? []),
    [highlightIndices],
  )

  interface MovePair {
    moveNumber: number
    whiteMove: GameNode | null
    blackMove: GameNode | null
  }

  const mobileMovePairs = useMemo(() => {
    if (!isMobile) return []

    const nodes = mainLineNodes.slice(1)
    const pairs: MovePair[] = []
    let currentPair: MovePair | null = null

    nodes.forEach((node) => {
      if (!currentPair) {
        currentPair = {
          moveNumber: node.moveNumber,
          whiteMove: null,
          blackMove: null,
        }
      } else {
        if (currentPair.moveNumber !== node.moveNumber) {
          pairs.push(currentPair)
          currentPair = {
            moveNumber: node.moveNumber,
            whiteMove: null,
            blackMove: null,
          }
        }
      }

      if (node.turn === 'b') {
        currentPair.whiteMove = node
      } else {
        currentPair.blackMove = node
      }
    })

    if (currentPair) {
      pairs.push(currentPair)
    }

    return pairs
  }, [mainLineNodes, isMobile])

  if (isMobile) {
    return (
      <div ref={containerRef} className="w-full overflow-x-auto px-2">
        <div className="flex flex-row items-center gap-1">
          {mobileMovePairs.map((pair, pairIndex) => (
            <React.Fragment key={pairIndex}>
              <div className="flex min-w-fit items-center rounded px-1 py-1 text-xs text-secondary">
                {pair.moveNumber}.{!pair.whiteMove ? '..' : ''}
              </div>
              {pair.whiteMove && (
                <div
                  ref={
                    baseController.currentNode === pair.whiteMove
                      ? currentMoveRef
                      : null
                  }
                  onClick={() =>
                    baseController.goToNode(pair.whiteMove as GameNode)
                  }
                  className={`flex min-w-fit cursor-pointer flex-row items-center rounded px-2 py-1 text-sm ${
                    baseController.currentNode === pair.whiteMove
                      ? 'bg-human-4/20'
                      : 'hover:bg-background-2'
                  } ${highlightSet.has(pairIndex * 2 + 1) ? 'bg-human-3/80' : ''}`}
                >
                  <span
                    style={{
                      color: showAnnotations
                        ? pair.whiteMove.color || 'inherit'
                        : 'inherit',
                    }}
                  >
                    {pair.whiteMove.san ?? pair.whiteMove.move}
                  </span>
                  {shouldShowIndicators(pair.whiteMove) && (
                    <MoveClassificationIcon
                      classification={getMoveClassification(pair.whiteMove)}
                      size="medium"
                      onClick={() => {
                        if (pair.whiteMove?.parent) {
                          baseController.goToNode(pair.whiteMove.parent)
                        }
                      }}
                    />
                  )}
                </div>
              )}
              {pair.blackMove && (
                <div
                  ref={
                    baseController.currentNode === pair.blackMove
                      ? currentMoveRef
                      : null
                  }
                  onClick={() =>
                    baseController.goToNode(pair.blackMove as GameNode)
                  }
                  className={`flex min-w-fit cursor-pointer flex-row items-center rounded px-2 py-1 text-sm ${
                    baseController.currentNode === pair.blackMove
                      ? 'bg-human-4/20'
                      : 'hover:bg-background-2'
                  } ${highlightSet.has(pairIndex * 2 + 2) ? 'bg-human-3/80' : ''}`}
                >
                  <span
                    style={{
                      color: showAnnotations
                        ? pair.blackMove.color || 'inherit'
                        : 'inherit',
                    }}
                  >
                    {pair.blackMove.san ?? pair.blackMove.move}
                  </span>
                  {shouldShowIndicators(pair.blackMove) && (
                    <MoveClassificationIcon
                      classification={getMoveClassification(pair.blackMove)}
                      size="medium"
                      onClick={() => {
                        if (pair.blackMove?.parent) {
                          baseController.goToNode(pair.blackMove.parent)
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
          {termination && (
            <div
              className="min-w-fit cursor-pointer border border-primary/10 bg-background-1/90 px-4 py-1 text-sm opacity-90"
              onClick={() =>
                baseController.goToNode(mainLineNodes[mainLineNodes.length - 1])
              }
            >
              {termination.result}
              {', '}
              {termination.winner !== 'none'
                ? `${termination.winner} is victorious`
                : 'draw'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="red-scrollbar grid h-48 auto-rows-min grid-cols-5 overflow-y-auto overflow-x-hidden whitespace-nowrap rounded-sm bg-background-1/60 md:h-full md:w-full"
    >
      {moves.map(([whiteNode, blackNode], index) => {
        return (
          <>
            <span className="flex h-7 items-center justify-center bg-background-2 text-sm text-secondary">
              {(whiteNode || blackNode)?.moveNumber}
            </span>
            <div
              ref={
                baseController.currentNode === whiteNode ? currentMoveRef : null
              }
              onClick={() => {
                if (whiteNode) baseController.goToNode(whiteNode)
              }}
              data-index={index * 2 + 1}
              className={`col-span-2 flex h-7 flex-1 cursor-pointer flex-row items-center justify-between px-2 text-sm hover:bg-background-2 ${baseController.currentNode === whiteNode && 'bg-human-4/10'} ${highlightSet.has(index * 2 + 1) && 'bg-human-3/80'}`}
            >
              <span
                style={{
                  color: showAnnotations
                    ? whiteNode?.color || 'inherit'
                    : 'inherit',
                }}
              >
                {whiteNode?.san ?? whiteNode?.move}
              </span>
              {shouldShowIndicators(whiteNode) && (
                <MoveClassificationIcon
                  classification={getMoveClassification(whiteNode)}
                  size="medium"
                  onClick={() => {
                    if (whiteNode?.parent) {
                      baseController.goToNode(whiteNode.parent)
                    }
                  }}
                />
              )}
            </div>
            {showVariations && whiteNode?.getVariations().length ? (
              <FirstVariation
                color="white"
                node={whiteNode}
                currentNode={baseController.currentNode}
                goToNode={baseController.goToNode}
                showAnnotations={showAnnotations}
              />
            ) : null}
            <div
              ref={
                baseController.currentNode === blackNode ? currentMoveRef : null
              }
              onClick={() => {
                if (blackNode) baseController.goToNode(blackNode)
              }}
              data-index={index * 2 + 2}
              className={`col-span-2 flex h-7 flex-1 cursor-pointer flex-row items-center justify-between px-2 text-sm hover:bg-background-2 ${baseController.currentNode === blackNode && 'bg-human-4/10'} ${highlightSet.has(index * 2 + 2) && 'bg-human-3/80'}`}
            >
              <span
                style={{
                  color: showAnnotations
                    ? blackNode?.color || 'inherit'
                    : 'inherit',
                }}
              >
                {blackNode?.san ?? blackNode?.move}
              </span>
              {shouldShowIndicators(blackNode) && (
                <MoveClassificationIcon
                  classification={getMoveClassification(blackNode)}
                  size="medium"
                  onClick={() => {
                    if (blackNode?.parent) {
                      baseController.goToNode(blackNode.parent)
                    }
                  }}
                />
              )}
            </div>
            {showVariations && blackNode?.getVariations().length ? (
              <FirstVariation
                color="black"
                node={blackNode}
                currentNode={baseController.currentNode}
                goToNode={baseController.goToNode}
                showAnnotations={showAnnotations}
              />
            ) : null}
          </>
        )
      })}
      {termination && !isMobile && (
        <div
          className="col-span-5 cursor-pointer rounded-sm border border-primary/10 bg-background-1/90 p-5 text-center opacity-90"
          onClick={() =>
            baseController.goToNode(mainLineNodes[mainLineNodes.length - 1])
          }
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
  color,
  currentNode,
  goToNode,
  showAnnotations,
}: {
  node: GameNode
  color: 'white' | 'black'
  currentNode: GameNode | undefined
  goToNode: (node: GameNode) => void
  showAnnotations: boolean
}) {
  return (
    <>
      {color === 'white' ? <div className="col-span-2"></div> : null}
      <div className="col-span-5 py-1">
        <ul className="root list-none pl-6">
          {node.getVariations().map((n) => (
            <VariationTree
              key={n.move}
              node={n}
              currentNode={currentNode}
              goToNode={goToNode}
              level={0}
              showAnnotations={showAnnotations}
            />
          ))}
        </ul>
      </div>
      {color === 'white' ? <div className="col-span-3"></div> : null}
    </>
  )
}

function VariationTree({
  node,
  currentNode,
  goToNode,
  level,
  showAnnotations,
}: {
  node: GameNode
  currentNode: GameNode | undefined
  goToNode: (node: GameNode) => void
  level: number
  showAnnotations: boolean
}) {
  const variations = node.getVariations()

  // Helper function to determine if move indicators should be shown in variations
  const shouldShowVariationIndicators = (node: GameNode) => {
    if (!showAnnotations) return false
    const moveNumber = node.moveNumber
    const turn = node.turn
    const plyFromStart = (moveNumber - 1) * 2 + (turn === 'b' ? 1 : 0)
    return plyFromStart >= 6
  }
  return (
    <li className={`tree-li ${level === 0 ? 'no-tree-connector' : ''}`}>
      <span
        onClick={() => goToNode(node)}
        className={`cursor-pointer px-0.5 text-xs ${
          currentNode?.fen === node?.fen
            ? 'rounded bg-human-4/20 text-primary'
            : 'text-secondary'
        }`}
        style={{ color: showAnnotations ? node.color || 'inherit' : 'inherit' }}
      >
        {node.moveNumber}. {node.turn === 'w' ? '...' : ''}
        <span>{node.san}</span>
        <span className="inline-flex items-center">
          {shouldShowVariationIndicators(node) && (
            <MoveClassificationIcon
              classification={getMoveClassification(node)}
              size="small"
              className="ml-0.5"
              onClick={() => {
                if (node.parent) {
                  goToNode(node.parent)
                }
              }}
            />
          )}
        </span>
      </span>
      {variations.length === 1 ? (
        <span className="inline">
          <InlineChain
            node={node}
            currentNode={currentNode}
            goToNode={goToNode}
            level={level}
            showAnnotations={showAnnotations}
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
              showAnnotations={showAnnotations}
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
  showAnnotations,
}: {
  node: GameNode
  currentNode: GameNode | undefined
  goToNode: (node: GameNode) => void
  level: number
  showAnnotations: boolean
}) {
  const chain: GameNode[] = []
  let current = node

  // Helper function to determine if move indicators should be shown in inline chains
  const shouldShowInlineIndicators = (node: GameNode) => {
    if (!showAnnotations) return false
    const moveNumber = node.moveNumber
    const turn = node.turn
    const plyFromStart = (moveNumber - 1) * 2 + (turn === 'b' ? 1 : 0)
    return plyFromStart >= 6
  }

  while (current.getVariations().length === 1) {
    const child = current.getVariations()[0]
    chain.push(child)
    current = child
  }

  return (
    <>
      <span className="inline whitespace-normal break-words">
        {chain.map((child) => (
          <Fragment key={child.move}>
            <span
              onClick={() => goToNode(child)}
              className={`cursor-pointer px-0.5 text-xs ${
                currentNode?.fen === child?.fen
                  ? 'rounded bg-human-4/50 text-primary'
                  : 'text-secondary'
              }`}
              style={{
                color: showAnnotations ? child.color || 'inherit' : 'inherit',
              }}
            >
              {child.moveNumber}. {child.turn === 'w' ? '...' : ''}
              <span>{child.san}</span>
              <span className="inline-flex items-center">
                {shouldShowInlineIndicators(child) && (
                  <MoveClassificationIcon
                    classification={getMoveClassification(child)}
                    size="small"
                    className="ml-0.5"
                    onClick={() => {
                      if (child.parent) {
                        goToNode(child.parent)
                      }
                    }}
                  />
                )}
              </span>
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
              showAnnotations={showAnnotations}
            />
          ))}
        </ul>
      )}
    </>
  )
}
