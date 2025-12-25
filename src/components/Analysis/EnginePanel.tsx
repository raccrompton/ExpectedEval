import type { StockfishEvaluation, MaiaEvaluation, EngineStatus } from '@/core/engine'

interface EnginePanelProps {
  stockfishEvaluation: StockfishEvaluation | null
  maiaEvaluation: MaiaEvaluation | null
  stockfishStatus: EngineStatus
  maiaStatus: EngineStatus
  isStockfishEvaluating: boolean
  isMaiaEvaluating: boolean
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
}: EnginePanelProps) {
  const topMoves = maiaEvaluation
    ? Object.entries(maiaEvaluation.policy)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : []

  return (
    <div className="engine-panel" data-testid="engine-panel">
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
              <div className="eval-row">
                <span className="eval-label">Evaluation:</span>
                <span className="eval-value" data-testid="sf-cp">
                  {stockfishEvaluation.isMate
                    ? `M${stockfishEvaluation.mateIn}`
                    : formatCp(stockfishEvaluation.cp)}
                </span>
              </div>
              <div className="eval-row">
                <span className="eval-label">Win rate:</span>
                <span className="eval-value" data-testid="sf-winrate">
                  {formatWinrate(stockfishEvaluation.winrate)}
                </span>
              </div>
              <div className="eval-row">
                <span className="eval-label">Best:</span>
                <span className="eval-value best-move" data-testid="sf-best-move">
                  {formatMove(stockfishEvaluation.bestMove)}
                </span>
              </div>
              {stockfishEvaluation.depth > 0 && (
                <div className="eval-row depth">
                  <span className="eval-label">Depth:</span>
                  <span className="eval-value">{stockfishEvaluation.depth}</span>
                </div>
              )}
            </>
          ) : (
            <div className="no-eval">No evaluation yet</div>
          )}
        </div>
      </section>

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
              <div className="eval-row">
                <span className="eval-label">Value:</span>
                <span className="eval-value" data-testid="maia-value">
                  {formatWinrate(maiaEvaluation.value)}
                </span>
              </div>
              <div className="maia-moves" data-testid="maia-moves">
                <span className="eval-label">Predicted moves:</span>
                <div className="move-list">
                  {topMoves.map(([move, prob]) => (
                    <div key={move} className="move-item">
                      <span className="move-name">{formatMove(move)}</span>
                      <div className="move-bar-container">
                        <div
                          className="move-bar"
                          style={{ width: `${prob * 100}%` }}
                        />
                      </div>
                      <span className="move-prob">{formatWinrate(prob)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="no-eval">No predictions yet</div>
          )}
        </div>
      </section>

      <style jsx>{`
        .engine-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-md, 16px);
        }

        .engine-section {
          background: var(--color-surface, #1f1f1f);
          border-radius: var(--radius-md, 8px);
          padding: var(--space-md, 16px);
          border: 1px solid var(--color-border, #333);
        }

        .engine-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm, 8px);
          padding-bottom: var(--space-sm, 8px);
          border-bottom: 1px solid var(--color-border, #333);
        }

        .engine-header h3 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .engine-status {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .engine-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs, 4px);
        }

        .eval-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .eval-label {
          color: var(--color-text-muted, #888);
        }

        .eval-value {
          font-weight: 500;
          font-family: var(--font-mono, monospace);
        }

        .eval-value.best-move {
          color: var(--color-primary, #3b82f6);
        }

        .depth {
          font-size: 0.75rem;
          color: var(--color-text-muted, #888);
        }

        .loading,
        .no-eval {
          color: var(--color-text-muted, #888);
          font-size: 0.875rem;
          font-style: italic;
        }

        .maia-moves {
          margin-top: var(--space-sm, 8px);
        }

        .maia-moves .eval-label {
          display: block;
          margin-bottom: var(--space-xs, 4px);
        }

        .move-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs, 4px);
        }

        .move-item {
          display: grid;
          grid-template-columns: 60px 1fr 45px;
          align-items: center;
          gap: var(--space-sm, 8px);
          font-size: 0.8125rem;
        }

        .move-name {
          font-family: var(--font-mono, monospace);
          font-weight: 500;
        }

        .move-bar-container {
          height: 8px;
          background: var(--color-border, #333);
          border-radius: 4px;
          overflow: hidden;
        }

        .move-bar {
          height: 100%;
          background: var(--color-primary, #3b82f6);
          border-radius: 4px;
          transition: width 0.2s ease;
        }

        .move-prob {
          text-align: right;
          font-family: var(--font-mono, monospace);
          color: var(--color-text-muted, #888);
        }
      `}</style>
    </div>
  )
}
