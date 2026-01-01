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
    case 'ready':
      return 'ready'
    case 'error':
      return 'error'
    case 'analyzing':
      return 'analyzing'
    case 'loading':
      return 'loading'
    default:
      return 'init'
  }
}

function getStatusColor(status: EngineStatus): string {
  switch (status) {
    case 'ready':
      return '#22c55e'
    case 'error':
      return '#ef4444'
    case 'analyzing':
    case 'loading':
      return '#f59e0b'
    default:
      return '#6b7280'
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
  // Determine whose turn it is for sorting
  const isBlackTurn = currentFen.split(' ')[1] === 'b'

  // Top 3 moves for Stockfish
  // Sort descending for White (higher cp = better), ascending for Black (lower cp = better)
  const sfTopMoves = stockfishEvaluation?.moveEvaluations
    ? Object.entries(stockfishEvaluation.moveEvaluations)
        .sort(([, a], [, b]) => isBlackTurn ? a - b : b - a)
        .slice(0, 3)
    : stockfishEvaluation
      ? [[stockfishEvaluation.bestMove, stockfishEvaluation.cp]] as [string, number][]
      : []

  // Top 3 moves for Maia
  const topMoves = maiaEvaluation
    ? Object.entries(maiaEvaluation.policy)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : []

  return (
    <div className="engine-panel" data-testid="engine-panel">
      {/* Stockfish Section */}
      <div className="engine-section" data-testid="stockfish-section">
        <div className="section-header">
          <span className="section-name">SF</span>
          <span className="section-status" style={{ color: getStatusColor(stockfishStatus) }} data-testid="sf-status">
            {getStatusText(stockfishStatus)}
          </span>
        </div>
        <div className="section-content" data-testid="sf-eval">
          {isStockfishEvaluating ? (
            <div className="loading">...</div>
          ) : stockfishEvaluation ? (
            <>
              <div className="eval-row">
                <span className="eval-value" data-testid="sf-cp">
                  {stockfishEvaluation.isMate
                    ? `M${stockfishEvaluation.mateIn}`
                    : formatCp(stockfishEvaluation.cp)}
                </span>
                {stockfishEvaluation.wdl && (
                  <span className="wdl-values" data-testid="sf-winrate">
                    {Math.round(stockfishEvaluation.wdl.win)}/{Math.round(stockfishEvaluation.wdl.draw)}/{Math.round(stockfishEvaluation.wdl.loss)}
                  </span>
                )}
              </div>
              <div className="eval-row secondary">
                <span className="eval-depth">d{stockfishEvaluation.depth}</span>
                {stockfishEvaluation.wdl && (
                  <span className="wdl-label">W/D/L%</span>
                )}
              </div>
              <div className="moves-list" data-testid="sf-best-move">
                <div className="moves-header">
                  <span>Best Move</span>
                  <span>Eval</span>
                </div>
                {sfTopMoves.map(([move, cp], idx) => (
                  <div key={move} className={`move-item ${idx === 0 ? 'best' : ''}`}>
                    <span className="move-name">{uciToSan(currentFen, move) || formatMove(move)}</span>
                    <span className="move-eval">{formatCp(cp)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-eval">—</div>
          )}
        </div>
      </div>

      {/* Maia Section */}
      <div className="engine-section" data-testid="maia-section">
        <div className="section-header">
          <span className="section-name">Maia</span>
          <span className="section-status" style={{ color: getStatusColor(maiaStatus) }} data-testid="maia-status">
            {getStatusText(maiaStatus)}
          </span>
        </div>
        <div className="section-content">
          {isMaiaEvaluating ? (
            <div className="loading">...</div>
          ) : maiaEvaluation ? (
            <>
              <div className="eval-row">
                <span className="eval-value maia" data-testid="maia-value">{formatWinrate(maiaEvaluation.value)}</span>
                <span className="eval-depth">{maiaEvaluation.eloLevel}</span>
              </div>
              <div className="moves-list" data-testid="maia-moves">
                <div className="moves-header">
                  <span>Likely Move</span>
                  <span>Played</span>
                </div>
                {topMoves.map(([move, prob], idx) => (
                  <div key={move} className={`move-item ${idx === 0 ? 'best' : ''}`}>
                    <span className="move-name">{uciToSan(currentFen, move) || formatMove(move)}</span>
                    <span className="move-prob">{(prob * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-eval">—</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .engine-panel {
          display: flex;
          height: 100%;
          background: var(--color-background, #0a0a0a);
          border: var(--border-medium, 2px) solid var(--color-border, #333);
        }

        .engine-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 8px 10px;
        }

        .engine-section:first-child {
          border-right: 1px solid var(--color-border, #333);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .section-name {
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono, monospace);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text, #fff);
        }

        .section-status {
          font-size: 9px;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
          text-transform: uppercase;
        }

        .section-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 0;
        }

        .loading,
        .no-eval {
          color: var(--color-text-dim, #666);
          font-size: 11px;
          font-family: var(--font-mono, monospace);
        }

        .eval-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 6px;
        }

        .eval-row.secondary {
          margin-top: -2px;
        }

        .eval-value {
          font-size: 20px;
          font-weight: 700;
          font-family: var(--font-mono, monospace);
          color: var(--color-text, #fff);
          line-height: 1;
        }

        .eval-value.maia {
          color: var(--color-primary, #FFE000);
        }

        .wdl-values {
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
          color: var(--color-text, #fff);
        }

        .eval-depth {
          font-size: 9px;
          font-family: var(--font-mono, monospace);
          color: var(--color-text-dim, #666);
        }

        .wdl-label {
          font-size: 9px;
          font-family: var(--font-mono, monospace);
          color: var(--color-text-dim, #666);
        }

        .moves-header {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          font-family: var(--font-mono, monospace);
          color: var(--color-text-dim, #666);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding-bottom: 2px;
          border-bottom: 1px solid var(--color-border, #333);
          margin-bottom: 2px;
        }

        .moves-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
        }

        .move-item {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-family: var(--font-mono, monospace);
        }

        .move-item .move-name {
          color: var(--color-text-muted, #888);
        }

        .move-item.best .move-name {
          color: var(--color-secondary, #00D4FF);
          font-weight: 700;
        }

        .move-item .move-eval,
        .move-item .move-prob {
          color: var(--color-text-dim, #666);
        }

        .move-item.best .move-eval,
        .move-item.best .move-prob {
          color: var(--color-secondary, #00D4FF);
        }
      `}</style>
    </div>
  )
}
