import { useEffect, useCallback, useRef } from 'react'
import { GameBoard, NavigationControls } from '@/components/Board'
import { PgnInput, MoveList, EnginePanel, EWSection } from '@/components/Analysis'
import { SettingsDropdown } from '@/components/Settings'
import { useChessGame } from '@/hooks'
import { useEngines, useSettingsContext } from '@/contexts'

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
        <div className="right-area" data-testid="right-area">
          <div className="top-row" data-testid="top-row">
            <div className="board-section" data-testid="board-section">
              <GameBoard fen={currentFen} onMove={actions.makeMove} />
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
          <div className="ew-section-wrapper">
            <h2>Expected Winrate</h2>
            <EWSection
              fen={currentFen}
              isEngineReady={stockfishStatus === 'ready' && maiaStatus === 'ready'}
            />
          </div>
        </div>
      </div>
      <style jsx>{`
        .main-container {
          min-height: 100vh;
          padding: var(--space-md);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
        }
        .header h1 {
          margin: 0;
        }
        .content {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: var(--space-lg);
          max-width: 1400px;
          margin: 0 auto;
        }
        .left-sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .left-sidebar h2 {
          margin: 0 0 var(--space-sm) 0;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .pgn-section,
        .moves-section {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          border: 1px solid var(--color-border);
        }
        .moves-section {
          flex: 1;
          overflow-y: auto;
          max-height: calc(100vh - 400px);
          min-height: 200px;
        }
        .right-area {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .top-row {
          display: flex;
          gap: var(--space-lg);
          align-items: stretch;
        }
        .board-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          flex: 0 0 auto;
          width: min(65%, 600px);
        }
        .eval-panel-wrapper {
          flex: 1;
          min-width: 280px;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          border: 1px solid var(--color-border);
          overflow-y: auto;
        }
        .eval-panel-wrapper h2 {
          margin: 0 0 var(--space-sm) 0;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .ew-section-wrapper {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          border: 1px solid var(--color-border);
        }
        .ew-section-wrapper h2 {
          margin: 0 0 var(--space-sm) 0;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        @media (max-width: 1024px) {
          .top-row {
            flex-direction: column;
          }
          .eval-panel-wrapper {
            width: 100%;
          }
        }
        @media (max-width: 768px) {
          .content {
            grid-template-columns: 1fr;
          }
          .right-area {
            order: -1;
          }
        }
      `}</style>
    </main>
  )
}
