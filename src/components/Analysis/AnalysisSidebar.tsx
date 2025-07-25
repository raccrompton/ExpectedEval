import {
  MoveMap,
  Highlight,
  BlunderMeter,
  MovesByRating,
} from 'src/components/Analysis'
import { motion } from 'framer-motion'
import type { DrawShape } from 'chessground/draw'
import { Dispatch, SetStateAction, useCallback, useMemo } from 'react'
import { useAnalysisController } from 'src/hooks/useAnalysisController'
import type { MaiaEvaluation, StockfishEvaluation } from 'src/types'

interface Props {
  hover: (move?: string) => void
  makeMove: (move: string) => void
  setHoverArrow: Dispatch<SetStateAction<DrawShape | null>>
  analysisEnabled: boolean
  controller: ReturnType<typeof useAnalysisController>
  handleToggleAnalysis: () => void
  itemVariants?: {
    hidden: {
      opacity: number
      y: number
    }
    visible: {
      opacity: number
      y: number
      transition: {
        duration: number
        ease: number[]
        type: string
      }
    }
    exit: {
      opacity: number
      y: number
      transition: {
        duration: number
        ease: number[]
        type: string
      }
    }
  }
}

export const AnalysisSidebar: React.FC<Props> = ({
  hover,
  makeMove,
  controller,
  setHoverArrow,
  analysisEnabled,
  handleToggleAnalysis,
  itemVariants,
}) => {
  // Mock handlers for when analysis is disabled
  const emptyBlunderMeterData = useMemo(
    () => ({
      goodMoves: { moves: [], probability: 0 },
      okMoves: { moves: [], probability: 0 },
      blunderMoves: { moves: [], probability: 0 },
    }),
    [],
  )

  const emptyRecommendations = useMemo(
    () => ({
      maia: undefined,
      stockfish: undefined,
    }),
    [],
  )
  const mockHover = useCallback(() => void 0, [])
  const mockSetHoverArrow = useCallback(() => void 0, [])
  const mockMakeMove = useCallback(() => void 0, [])

  return (
    <motion.div
      id="analysis"
      variants={itemVariants ?? {}}
      className="flex h-[calc(85vh)] w-full flex-col gap-2 xl:h-[calc(55vh+5rem)]"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Analysis Toggle Bar */}
      <div className="flex items-center justify-between rounded bg-background-1 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">analytics</span>
          <h3 className="font-semibold">Analysis</h3>
        </div>
        <button
          onClick={handleToggleAnalysis}
          className={`flex items-center gap-2 rounded px-3 py-1 text-sm transition-colors ${
            analysisEnabled
              ? 'bg-human-4 text-white hover:bg-human-4/80'
              : 'bg-background-2 text-secondary hover:bg-background-3'
          }`}
        >
          <span className="material-symbols-outlined !text-sm">
            {analysisEnabled ? 'visibility' : 'visibility_off'}
          </span>
          {analysisEnabled ? 'Visible' : 'Hidden'}
        </button>
      </div>

      {/* Large screens (xl+): Side by side layout */}
      <div className="hidden xl:flex xl:h-full xl:flex-col xl:gap-2">
        <div className="relative flex h-[calc((55vh+4.5rem)/2)] gap-2">
          {/* Combined Highlight + MovesByRating container */}
          <div className="flex h-full w-full overflow-hidden rounded border-[0.5px] border-white/40">
            <div className="flex h-full w-auto min-w-[40%] max-w-[40%] border-r-[0.5px] border-white/40">
              <Highlight
                hover={analysisEnabled ? hover : mockHover}
                makeMove={analysisEnabled ? makeMove : mockMakeMove}
                currentMaiaModel={controller.currentMaiaModel}
                setCurrentMaiaModel={controller.setCurrentMaiaModel}
                recommendations={
                  analysisEnabled
                    ? controller.moveRecommendations
                    : emptyRecommendations
                }
                moveEvaluation={
                  analysisEnabled
                    ? (controller.moveEvaluation as {
                        maia?: MaiaEvaluation
                        stockfish?: StockfishEvaluation
                      })
                    : {
                        maia: undefined,
                        stockfish: undefined,
                      }
                }
                colorSanMapping={
                  analysisEnabled ? controller.colorSanMapping : {}
                }
                boardDescription={
                  analysisEnabled
                    ? controller.boardDescription
                    : {
                        segments: [
                          {
                            type: 'text',
                            content:
                              'Analysis is disabled. Enable analysis to see detailed move evaluations and recommendations.',
                          },
                        ],
                      }
                }
                currentNode={controller.currentNode}
              />
            </div>
            <div className="flex h-full w-full bg-background-1">
              <MovesByRating
                moves={analysisEnabled ? controller.movesByRating : undefined}
                colorSanMapping={
                  analysisEnabled ? controller.colorSanMapping : {}
                }
              />
            </div>
          </div>
          {!analysisEnabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
              <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                  lock
                </span>
                <p className="font-medium text-primary">Analysis Disabled</p>
                <p className="text-sm text-secondary">
                  Enable analysis to see move evaluations
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="relative flex h-[calc((55vh+4.5rem)/2)] flex-row gap-2">
          <div className="flex h-full w-full flex-col">
            <MoveMap
              moveMap={analysisEnabled ? controller.moveMap : undefined}
              colorSanMapping={
                analysisEnabled ? controller.colorSanMapping : {}
              }
              setHoverArrow={
                analysisEnabled ? setHoverArrow : mockSetHoverArrow
              }
              makeMove={analysisEnabled ? makeMove : mockMakeMove}
            />
          </div>
          <BlunderMeter
            hover={analysisEnabled ? hover : mockHover}
            makeMove={analysisEnabled ? makeMove : mockMakeMove}
            data={
              analysisEnabled ? controller.blunderMeter : emptyBlunderMeterData
            }
            colorSanMapping={analysisEnabled ? controller.colorSanMapping : {}}
            moveEvaluation={
              analysisEnabled ? controller.moveEvaluation : undefined
            }
          />
          {!analysisEnabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
              <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                  lock
                </span>
                <p className="font-medium text-primary">Analysis Disabled</p>
                <p className="text-sm text-secondary">
                  Enable analysis to see position evaluation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smaller screens (below xl): 3-row stacked layout */}
      <div className="flex h-full flex-col gap-2 xl:hidden">
        {/* Row 1: Combined Highlight + BlunderMeter container */}
        <div className="relative flex h-[calc((85vh)*0.4)] overflow-hidden rounded border-[0.5px] border-white/40 bg-background-1">
          <div className="flex h-full w-full border-r-[0.5px] border-white/40">
            <Highlight
              hover={analysisEnabled ? hover : mockHover}
              makeMove={analysisEnabled ? makeMove : mockMakeMove}
              currentMaiaModel={controller.currentMaiaModel}
              setCurrentMaiaModel={controller.setCurrentMaiaModel}
              recommendations={
                analysisEnabled
                  ? controller.moveRecommendations
                  : emptyRecommendations
              }
              moveEvaluation={
                analysisEnabled
                  ? (controller.moveEvaluation as {
                      maia?: MaiaEvaluation
                      stockfish?: StockfishEvaluation
                    })
                  : {
                      maia: undefined,
                      stockfish: undefined,
                    }
              }
              colorSanMapping={
                analysisEnabled ? controller.colorSanMapping : {}
              }
              boardDescription={
                analysisEnabled
                  ? controller.boardDescription
                  : {
                      segments: [
                        {
                          type: 'text',
                          content:
                            'Analysis is disabled. Enable analysis to see detailed move evaluations and recommendations.',
                        },
                      ],
                    }
              }
              currentNode={controller.currentNode}
            />
          </div>
          <div className="flex h-full w-auto min-w-[40%] max-w-[40%] bg-background-1 p-3">
            <div className="h-full w-full">
              <BlunderMeter
                hover={analysisEnabled ? hover : mockHover}
                makeMove={analysisEnabled ? makeMove : mockMakeMove}
                data={
                  analysisEnabled
                    ? controller.blunderMeter
                    : emptyBlunderMeterData
                }
                colorSanMapping={
                  analysisEnabled ? controller.colorSanMapping : {}
                }
                moveEvaluation={
                  analysisEnabled ? controller.moveEvaluation : undefined
                }
                showContainer={false}
              />
            </div>
          </div>
          {!analysisEnabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
              <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                  lock
                </span>
                <p className="font-medium text-primary">Analysis Disabled</p>
                <p className="text-sm text-secondary">
                  Enable analysis to see move evaluations
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: MoveMap */}
        <div className="relative flex h-[calc((85vh)*0.3)] w-full">
          <div className="h-full w-full">
            <MoveMap
              moveMap={analysisEnabled ? controller.moveMap : undefined}
              colorSanMapping={
                analysisEnabled ? controller.colorSanMapping : {}
              }
              setHoverArrow={
                analysisEnabled ? setHoverArrow : mockSetHoverArrow
              }
              makeMove={analysisEnabled ? makeMove : mockMakeMove}
            />
          </div>
          {!analysisEnabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
              <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                  lock
                </span>
                <p className="font-medium text-primary">Analysis Disabled</p>
                <p className="text-sm text-secondary">
                  Enable analysis to see position evaluation
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: MovesByRating */}
        <div className="relative flex h-[calc((85vh)*0.3)] w-full">
          <div className="h-full w-full">
            <MovesByRating
              moves={analysisEnabled ? controller.movesByRating : undefined}
              colorSanMapping={
                analysisEnabled ? controller.colorSanMapping : {}
              }
            />
          </div>
          {!analysisEnabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
              <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                  lock
                </span>
                <p className="font-medium text-primary">Analysis Disabled</p>
                <p className="text-sm text-secondary">
                  Enable analysis to see move evaluations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
