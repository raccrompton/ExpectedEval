import type { StockfishEvaluation, MaiaEvaluation, EngineStatus } from '@/core/engine'
import { uciToSan } from '@/core/analysis'

interface EnginePanelProps {
  stockfishEvaluation: StockfishEvaluation | null
  maiaEvaluation: MaiaEvaluation | null
  stockfishStatus: EngineStatus
  maiaStatus: EngineStatus
  isStockfishEvaluating: boolean
  isMaiaEvaluating: boolean
  currentFen: string
}

function formatCp(cp: number): string {
  const sign = cp >= 0 ? '+' : ''
  return `${sign}${(cp / 100).toFixed(2)}`
}

function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

function formatMove(uciMove: string): string {
  if (uciMove.length < 4) return uciMove
  const from = uciMove.slice(0, 2)
  const to = uciMove.slice(2, 4)
  const promotion = uciMove.slice(4)
  return promotion ? `${from}-${to}=${promotion.toUpperCase()}` : `${from}-${to}`
}

function getStatusText(status: EngineStatus): string {
  switch (status) {
    case 'not_initialized':
      return 'Not initialized'
    case 'loading':
      return 'Loading...'
    case 'ready':
      return 'Ready'
    case 'error':
      return 'Error'
    case 'analyzing':
      return 'Analyzing...'
    default:
      return 'Unknown'
  }
}

function getStatusColor(status: EngineStatus): string {
  switch (status) {
    case 'ready':
      return 'var(--color-success, #22c55e)'
    case 'error':
      return 'var(--color-error, #ef4444)'
    case 'analyzing':
    case 'loading':
      return 'var(--color-warning, #f59e0b)'
    default:
      return 'var(--color-text-muted, #6b7280)'
  }
}

export function EnginePanel({
  stockfishEvaluation,
  maiaEvaluation,
  stockfishStatus,
  maiaStatus,
  isStockfishEvaluating,
  isMaiaEvaluating,
  currentFen,
}: EnginePanelProps) {
  // Show only top 3 moves for compact display
  const topMoves = maiaEvaluation
    ? Object.entries(maiaEvaluation.policy)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : []

  return (
    <div className="engine-panel" data-testid="engine-panel">
      {/* Stockfish section - left column */}
      <section className="engine-section" data-testid="stockfish-section">
        <div className="engine-header">
          <h3>Stockfish</h3>
          <span
            className="engine-status"
            data-testid="sf-status"
            style={{ color: getStatusColor(stockfishStatus) }}
          >
            {getStatusText(stockfishStatus)}
          </span>
        </div>

        <div className="engine-content" data-testid="sf-eval">
          {isStockfishEvaluating ? (
            <div className="loading">Evaluating...</div>
          ) : stockfishEvaluation ? (
            <>
              <div className="eval-main">
                <span className="eval-cp" data-testid="sf-cp">
                  {stockfishEvaluation.isMate
                    ? `M${stockfishEvaluation.mateIn}`
                    : formatCp(stockfishEvaluation.cp)}
                </span>
                <span className="eval-winrate" data-testid="sf-winrate">
                  {formatWinrate(stockfishEvaluation.winrate)}
                </span>
              </div>
              <div className="eval-best">
                <span className="eval-label">Best:</span>
                <span className="best-move" data-testid="sf-best-move">
                  {formatMove(stockfishEvaluation.bestMove)}
                </span>
              </div>
            </>
          ) : (
            <div className="no-eval">No evaluation yet</div>
          )}
        </div>
      </section>

      {/* Maia section - right column */}
      <section className="engine-section" data-testid="maia-section">
        <div className="engine-header">
          <h3>Maia {maiaEvaluation?.eloLevel || ''}</h3>
          <span
            className="engine-status"
            data-testid="maia-status"
            style={{ color: getStatusColor(maiaStatus) }}
          >
            {getStatusText(maiaStatus)}
          </span>
        </div>

        <div className="engine-content">
          {isMaiaEvaluating ? (
            <div className="loading">Predicting...</div>
          ) : maiaEvaluation ? (
            <>
              <div className="eval-main">
                <span className="eval-winrate" data-testid="maia-value">
                  {formatWinrate(maiaEvaluation.value)}
                </span>
              </div>
              <div className="maia-moves" data-testid="maia-moves">
                {topMoves.map(([move, prob]) => (
                  <div key={move} className="move-item">
                    {uciToSan(currentFen, move) || formatMove(move)} {formatWinrate(prob)}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-eval">No predictions yet</div>
          )}
        </div>
      </section>

      <style jsx>{`
        .engine-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm, 8px);
          height: 100%;
          min-height: 0;
        }

        .engine-section {
          background: var(--color-surface-alt, #1a1a1a);
          border-radius: var(--radius-sm, 4px);
          padding: var(--space-sm, 8px);
          border: 1px solid var(--color-border, #333);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .engine-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-xs, 4px);
          padding-bottom: var(--space-xs, 4px);
          border-bottom: 1px solid var(--color-border, #333);
          flex-shrink: 0;
        }

        .engine-header h3 {
          margin: 0;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .engine-status {
          font-size: 0.625rem;
          font-weight: 500;
        }

        .engine-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs, 4px);
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .eval-main {
          display: flex;
          align-items: baseline;
          gap: var(--space-sm, 8px);
        }

        .eval-cp {
          font-size: 1rem;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
        }

        .eval-winrate {
          font-size: 0.8125rem;
          font-weight: 500;
          font-family: var(--font-mono, monospace);
          color: var(--color-text-muted, #888);
        }

        .eval-best {
          display: flex;
          align-items: center;
          gap: var(--space-xs, 4px);
          font-size: 0.75rem;
        }

        .eval-label {
          color: var(--color-text-muted, #888);
        }

        .best-move {
          font-family: var(--font-mono, monospace);
          font-weight: 500;
          color: var(--color-primary, #3b82f6);
        }

        .loading,
        .no-eval {
          color: var(--color-text-muted, #888);
          font-size: 0.75rem;
          font-style: italic;
        }

        .maia-moves {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.75rem;
        }

        .move-item {
          font-family: var(--font-mono, monospace);
          color: var(--color-text-muted, #888);
        }
      `}</style>
    </div>
  )
}
