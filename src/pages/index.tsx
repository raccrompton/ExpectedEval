import { useEffect, useCallback } from 'react'
import { GameBoard, NavigationControls } from '@/components/Board'
import { PgnInput, MoveList } from '@/components/Analysis'
import { useChessGame } from '@/hooks'

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
          grid-template-columns: 280px 1fr;
          gap: var(--space-lg);
          max-width: 1200px;
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
