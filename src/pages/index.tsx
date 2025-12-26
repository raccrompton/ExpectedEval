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
        <div className="main-row" data-testid="main-row">
          <aside className="left-sidebar" data-testid="left-sidebar">
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
          </aside>
          <div className="board-section" data-testid="board-section">
            <GameBoard fen={displayedFen} onMove={actions.makeMove} />
            <NavigationControls
              onStart={actions.goToStart}
              onBack={actions.goBack}
              onForward={actions.goForward}
              onEnd={actions.goToEnd}
              isAtStart={isAtStart}
              isAtEnd={isAtEnd}
            />
          </div>
          <div className="eval-panel-wrapper" data-testid="eval-panel">
            <h2>Analysis</h2>
            <EnginePanel
              stockfishEvaluation={stockfishEvaluation}
              maiaEvaluation={maiaEvaluation}
              stockfishStatus={stockfishStatus}
              maiaStatus={maiaStatus}
              isStockfishEvaluating={isStockfishEvaluating}
              isMaiaEvaluating={isMaiaEvaluating}
            />
          </div>
        </div>
        <div className="ew-section-wrapper" data-testid="ew-section">
          <h2>Expected Winrate</h2>
          <EWSection
            fen={currentFen}
            isEngineReady={stockfishStatus === 'ready' && maiaStatus === 'ready'}
            onNavigate={handleEWNavigate}
          />
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
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
          min-height: 0;
        }
        .main-row {
          display: grid;
          grid-template-columns: 220px 1fr 280px;
          gap: var(--space-md);
          flex: 1;
          min-height: 0;
        }
        .left-sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          max-height: 100%;
          overflow: hidden;
        }
        .left-sidebar h2 {
          margin: 0 0 var(--space-xs) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .pgn-section {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .moves-section {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          flex: 1;
          overflow-y: auto;
          min-height: 120px;
        }
        .board-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          align-items: center;
          justify-content: center;
          min-height: 0;
          min-width: 0;
          overflow: hidden;
        }
        .eval-panel-wrapper {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          overflow-y: auto;
        }
        .eval-panel-wrapper h2 {
          margin: 0 0 var(--space-xs) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .ew-section-wrapper {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border: 1px solid var(--color-border);
          flex-shrink: 0;
          min-height: 180px;
          max-height: 250px;
          overflow-y: auto;
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
          .main-row {
            grid-template-columns: 180px 1fr;
          }
          .eval-panel-wrapper {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 768px) {
          .main-container {
            height: auto;
            min-height: 100vh;
            overflow: auto;
          }
          .main-row {
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
