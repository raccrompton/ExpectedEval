/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useContext, useMemo, useEffect } from 'react'
import { TuringTreeControllerContext, WindowSizeContext } from 'src/contexts'
import { GameNode, Termination } from 'src/types'
import { TuringGame } from 'src/types/turing'

interface Props {
  game: TuringGame
  highlightIndices?: number[]
  termination?: Termination
}

export const TuringMovesContainer: React.FC<Props> = ({
  game,
  highlightIndices,
  termination,
}: Props) => {
  const { currentNode, goToNode, gameTree } = useContext(
    TuringTreeControllerContext,
  )
  const { isMobile } = useContext(WindowSizeContext)

  const mainLineNodes = useMemo(() => {
    return gameTree.getMainLine()
  }, [gameTree])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentNode) return

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          if (currentNode.mainChild) {
            goToNode(currentNode.mainChild)
          }
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (currentNode.parent) {
            goToNode(currentNode.parent)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentNode, goToNode])

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
      <div className="w-full overflow-x-auto px-2">
        <div className="flex flex-row items-center gap-1">
          {mobileMovePairs.map((pair, pairIndex) => (
            <React.Fragment key={pairIndex}>
              <div className="flex min-w-fit items-center rounded px-1 py-1 text-xs text-secondary">
                {pair.moveNumber}.{!pair.whiteMove ? '..' : ''}
              </div>
              {pair.whiteMove && (
                <div
                  onClick={() => goToNode(pair.whiteMove as GameNode)}
                  className={`flex min-w-fit cursor-pointer flex-row items-center rounded px-2 py-1 text-sm ${
                    currentNode === pair.whiteMove
                      ? 'bg-engine-3/90'
                      : 'hover:bg-background-2'
                  } ${highlightSet.has(pairIndex * 2 + 1) ? 'bg-human-3/80' : ''}`}
                >
                  <span>{pair.whiteMove.san ?? pair.whiteMove.move}</span>
                </div>
              )}
              {pair.blackMove && (
                <div
                  onClick={() => goToNode(pair.blackMove as GameNode)}
                  className={`flex min-w-fit cursor-pointer flex-row items-center rounded px-2 py-1 text-sm ${
                    currentNode === pair.blackMove
                      ? 'bg-engine-3/90'
                      : 'hover:bg-background-2'
                  } ${highlightSet.has(pairIndex * 2 + 2) ? 'bg-human-3/80' : ''}`}
                >
                  <span>{pair.blackMove.san ?? pair.blackMove.move}</span>
                </div>
              )}
            </React.Fragment>
          ))}
          {termination && (
            <div
              className="min-w-fit cursor-pointer border border-primary/10 bg-background-1/90 px-4 py-1 text-sm opacity-90"
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
      </div>
    )
  }

  return (
    <div className="flex flex-row overflow-x-auto overflow-y-auto whitespace-nowrap rounded-sm bg-background-1/60 md:h-full md:w-full md:flex-col md:overflow-x-hidden">
      {moves.map(([whiteNode, blackNode], index) => {
        return (
          <div key={index} className="flex w-full flex-row">
            <span className="flex items-center justify-center bg-background-2 px-2 py-1 text-sm text-secondary md:w-1/6 md:px-0">
              {(whiteNode || blackNode)?.moveNumber}
            </span>
            <div
              onClick={() => {
                if (whiteNode) goToNode(whiteNode)
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
}
