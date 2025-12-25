import { useEffect, useCallback, useRef } from 'react'
import { GameBoard, NavigationControls } from '@/components/Board'
import { PgnInput, MoveList, EnginePanel } from '@/components/Analysis'
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
      </header>
      <div className="content">
        <aside className="sidebar">
          <section className="pgn-section">
            <h2>Load Game</h2>
            <PgnInput onLoadPgn={actions.loadPgn} />
          </section>
          <section className="moves-section">
            <h2>Moves</h2>
            <MoveList
              moves={displayedMoves}
              movesWithVariations={movesWithVariations}
              currentPath={currentPath}
              onMoveClick={actions.goToPath}
            />
          </section>
        </aside>
        <div className="board-section">
          <div className="board-wrapper">
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
        </div>
        <aside className="engine-sidebar">
          <section className="engine-section">
            <h2>Analysis</h2>
            <EnginePanel
              stockfishEvaluation={stockfishEvaluation}
              maiaEvaluation={maiaEvaluation}
              stockfishStatus={stockfishStatus}
              maiaStatus={maiaStatus}
              isStockfishEvaluating={isStockfishEvaluating}
              isMaiaEvaluating={isMaiaEvaluating}
            />
          </section>
        </aside>
      </div>
      <style jsx>{`
        .main-container {
          min-height: 100vh;
          padding: var(--space-md);
        }
        .header {
          margin-bottom: var(--space-lg);
        }
        .header h1 {
          margin: 0;
        }
        .content {
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          gap: var(--space-lg);
          max-width: 1400px;
          margin: 0 auto;
        }
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .sidebar h2 {
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
          max-height: 400px;
        }
        .board-section {
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .board-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          width: 100%;
          max-width: 560px;
        }
        .engine-sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        .engine-sidebar h2 {
          margin: 0 0 var(--space-sm) 0;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .engine-section {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          border: 1px solid var(--color-border);
        }
        @media (max-width: 1024px) {
          .content {
            grid-template-columns: 280px 1fr;
          }
          .engine-sidebar {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 768px) {
          .content {
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
