import { useState, useEffect, useCallback, useRef } from 'react'
import { GameBoard, NavigationControls } from '@/components/Board'
import { PgnInput, MoveList, EnginePanel, EWSection } from '@/components/Analysis'
import { SettingsDropdown } from '@/components/Settings'
import { useChessGame } from '@/hooks'
import { useEngines } from '@/contexts'

export default function Home() {
  const {
    currentFen,
    currentPath,
    displayedMoves,
    movesWithVariations,
    isAtStart,
    isAtEnd,
    actions,
  } = useChessGame()

  // Preview FEN for EW tree node clicks (overrides currentFen temporarily)
  const [previewFen, setPreviewFen] = useState<string | null>(null)

  const {
    stockfishEvaluation,
    maiaEvaluation,
    stockfishStatus,
    maiaStatus,
    isStockfishEvaluating,
    isMaiaEvaluating,
    evaluatePosition,
  } = useEngines()

  const lastEvaluatedFen = useRef<string | null>(null)

  // Clear preview when user navigates via game controls
  useEffect(() => {
    setPreviewFen(null)
  }, [currentPath])

  // FEN to display on board (preview overrides current)
  const displayedFen = previewFen ?? currentFen

  // Handle EW tree node click - show position on board
  const handleEWNavigate = useCallback((fen: string) => {
    setPreviewFen(fen)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          actions.goBack()
          break
        case 'ArrowRight':
          actions.goForward()
          break
        case 'Home':
          actions.goToStart()
          break
        case 'End':
          actions.goToEnd()
          break
      }
    },
    [actions]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  useEffect(() => {
    if (
      currentFen &&
      stockfishStatus === 'ready' &&
      maiaStatus === 'ready' &&
      currentFen !== lastEvaluatedFen.current
    ) {
      lastEvaluatedFen.current = currentFen
      evaluatePosition(currentFen)
    }
  }, [currentFen, stockfishStatus, maiaStatus, evaluatePosition])

  return (
    <main className="main-container">
      <header className="header">
        <h1>ExpectedEval</h1>
        <SettingsDropdown />
      </header>
      <div className="content">
        {/* Middle row: PgnInput | MoveList | EnginePanel (fixed height) */}
        <div className="middle-row" data-testid="main-row">
          <section className="pgn-section" data-testid="pgn-section">
            <h2>Load Game</h2>
            <PgnInput onLoadPgn={actions.loadPgn} />
          </section>
          <section className="moves-section" data-testid="moves-section">
            <h2>Moves</h2>
            <MoveList
              moves={displayedMoves}
              movesWithVariations={movesWithVariations}
              currentPath={currentPath}
              onMoveClick={actions.goToPath}
            />
          </section>
          <div className="eval-panel-wrapper" data-testid="eval-panel">
            <h2>Analysis</h2>
            <EnginePanel
              stockfishEvaluation={stockfishEvaluation}
              maiaEvaluation={maiaEvaluation}
              stockfishStatus={stockfishStatus}
              maiaStatus={maiaStatus}
              isStockfishEvaluating={isStockfishEvaluating}
              isMaiaEvaluating={isMaiaEvaluating}
              currentFen={currentFen}
            />
          </div>
        </div>
        {/* Bottom row: Board + Nav (left) | EW Section (right, fills remaining) */}
        <div className="bottom-row" data-testid="bottom-row">
          <div className="board-section" data-testid="board-section">
            <div className="board-container">
              <GameBoard fen={displayedFen} onMove={actions.makeMove} />
            </div>
            <NavigationControls
              onStart={actions.goToStart}
              onBack={actions.goBack}
              onForward={actions.goForward}
              onEnd={actions.goToEnd}
              isAtStart={isAtStart}
              isAtEnd={isAtEnd}
            />
          </div>
          <div className="ew-section-wrapper" data-testid="ew-section-wrapper">
            <h2>Expected Winrate</h2>
            <EWSection
              fen={currentFen}
              isEngineReady={stockfishStatus === 'ready' && maiaStatus === 'ready'}
              onNavigate={handleEWNavigate}
            />
          </div>
        </div>
      </div>
      <style jsx>{`
        .main-container {
          height: 100vh;
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
          flex-shrink: 0;
        }
        .header h1 {
          margin: 0;
        }
        .content {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          max-width: 1600px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
          min-height: 0;
        }
        /* Middle row: PgnInput | MoveList | EnginePanel - fixed height */
        .middle-row {
          display: grid;
          grid-template-columns: 200px 1fr 400px;
          gap: var(--space-md);
          height: 140px;
          flex-shrink: 0;
        }
        .pgn-section {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pgn-section h2 {
          margin: 0 0 var(--space-xs) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        .moves-section {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .moves-section h2 {
          margin: 0 0 var(--space-xs) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        .eval-panel-wrapper {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .eval-panel-wrapper h2 {
          margin: 0 0 var(--space-xs) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        /* Bottom row: Board + Nav | EW Section - fills remaining height */
        .bottom-row {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: var(--space-md);
          flex: 1;
          min-height: 0;
        }
        .board-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          align-items: center;
          min-height: 0;
          min-width: 0;
          height: 100%;
        }
        .board-container {
          width: auto;
          height: calc(100% - 50px);
          aspect-ratio: 1;
        }
        .ew-section-wrapper {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          overflow-y: auto;
          min-height: 0;
        }
        .ew-section-wrapper h2 {
          margin: 0 0 var(--space-xs) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        @media (max-width: 1024px) {
          .middle-row {
            grid-template-columns: 150px 1fr 280px;
            height: 120px;
          }
          .bottom-row {
            grid-template-columns: auto 1fr;
          }
        }
        @media (max-width: 768px) {
          .main-container {
            height: auto;
            min-height: 100vh;
            overflow: auto;
          }
          .middle-row {
            grid-template-columns: 1fr;
            height: auto;
          }
          .bottom-row {
            grid-template-columns: 1fr;
          }
          .board-section {
            order: -1;
          }
        }
      `}</style>
    </main>
  )
}
