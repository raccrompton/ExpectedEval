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
      {/* Decorative grid overlay */}
      <div className="grid-overlay" aria-hidden="true" />

      <header className="header">
        <div className="header-title">
          <span className="title-prefix">{'//'}</span>
          <h1>EXPECTED<span className="title-accent">EVAL</span></h1>
          <span className="title-version">v0.1</span>
        </div>
        <SettingsDropdown />
      </header>

      <div className="content">
        {/* Middle row: PgnInput | MoveList | EnginePanel (fixed height) */}
        <div className="middle-row stagger-children" data-testid="main-row">
          <section className="pgn-section" data-testid="pgn-section">
            <h2>Load Game</h2>
            <PgnInput onLoadPgn={actions.loadPgn} />
          </section>
          <section className="moves-section" data-testid="moves-section">
            <h2>Game Moves</h2>
            <MoveList
              moves={displayedMoves}
              movesWithVariations={movesWithVariations}
              currentPath={currentPath}
              onMoveClick={actions.goToPath}
            />
          </section>
          <div className="eval-panel-wrapper no-header" data-testid="eval-panel">
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
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* Decorative grid overlay */
        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
          background-image:
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 64px 64px;
        }

        /* Header - Brutalist typography */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .header-title {
          display: flex;
          align-items: baseline;
          gap: var(--space-sm);
        }

        .title-prefix {
          font-family: var(--font-mono);
          font-size: var(--font-lg);
          color: var(--color-text-muted);
          font-weight: 400;
        }

        .header h1 {
          margin: 0;
          font-size: var(--font-2xl);
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .title-accent {
          color: var(--color-primary);
        }

        .title-version {
          font-family: var(--font-mono);
          font-size: var(--font-xs);
          color: var(--color-text-dim);
          font-weight: 500;
          margin-left: var(--space-xs);
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
          position: relative;
          z-index: 1;
        }

        /* Middle row - Brutalist panels */
        .middle-row {
          display: grid;
          grid-template-columns: 220px 1fr 440px;
          gap: var(--space-md);
          height: 200px;
          flex-shrink: 0;
        }

        .pgn-section,
        .moves-section,
        .eval-panel-wrapper {
          background: var(--color-surface);
          padding: var(--space-md);
          border: var(--border-medium) solid var(--color-border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* Yellow accent corners */
        .pgn-section::before,
        .moves-section::before,
        .eval-panel-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 32px;
          height: var(--border-thick);
          background: var(--color-primary);
        }

        .pgn-section h2,
        .moves-section h2,
        .eval-panel-wrapper h2 {
          margin: 0 0 var(--space-sm) 0;
          flex-shrink: 0;
        }

        .eval-panel-wrapper.no-header {
          padding: 0;
        }

        .eval-panel-wrapper.no-header::before {
          display: none;
        }

        /* Bottom row: Board + Nav | EW Section */
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
          height: calc(100% - 56px);
          aspect-ratio: 1;
        }

        .ew-section-wrapper {
          background: var(--color-surface);
          padding: var(--space-md);
          border: var(--border-medium) solid var(--color-border);
          overflow-y: auto;
          min-height: 0;
          position: relative;
        }

        .ew-section-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 48px;
          height: var(--border-thick);
          background: var(--color-primary);
        }

        .ew-section-wrapper h2 {
          margin: 0 0 var(--space-sm) 0;
        }

        @media (max-width: 1024px) {
          .middle-row {
            grid-template-columns: 160px 1fr 340px;
            height: 180px;
          }
          .header h1 {
            font-size: var(--font-xl);
          }
        }

        @media (max-width: 768px) {
          .main-container {
            height: auto;
            min-height: 100vh;
            overflow: auto;
            padding: var(--space-md);
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
          .header h1 {
            font-size: var(--font-lg);
          }
        }
      `}</style>
    </main>
  )
}
