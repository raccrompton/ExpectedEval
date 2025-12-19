/**
 * EnginePanel Component - Engine Evaluation Display
 *
 * This component displays evaluation results from both Stockfish and Maia
 * engines, as well as Expected Winrate calculations.
 *
 * Features:
 * - Stockfish evaluation (centipawns and win percentage)
 * - Stockfish best moves
 * - Maia move predictions with probabilities
 * - Maia win percentage
 * - Expected Winrate results (SF and Maia variants)
 * - Engine loading status
 *
 * Architecture:
 * - Receives evaluation data from parent component
 * - Pure presentation component (no internal data fetching)
 * - Uses EngineContext for status display only
 *
 * @example
 * ```tsx
 * function Analysis() {
 *   return (
 *     <EnginePanel
 *       stockfishEval={sfEval}
 *       maiaEval={maiaEval}
 *       ewResult={ewResult}
 *     />
 *   )
 * }
 * ```
 *
 * Dependencies:
 * - React
 * - @/core/engine: Type definitions
 * - @/core/analysis: EW result types
 */

'use client'

import type { StockfishEvaluation, MaiaEvaluation, EngineStatus } from '@/core/engine'
import type { EWResult } from '@/core/analysis'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the EnginePanel component.
 */
export interface EnginePanelProps {
  /**
   * Stockfish evaluation for the current position.
   * Null if not yet evaluated.
   */
  stockfishEval?: StockfishEvaluation | null

  /**
   * Maia evaluation for the current position.
   * Null if not yet evaluated.
   */
  maiaEval?: MaiaEvaluation | null

  /**
   * Expected Winrate calculation result.
   * Null if not yet calculated.
   */
  ewResult?: EWResult | null

  /**
   * Stockfish engine status.
   */
  stockfishStatus?: EngineStatus

  /**
   * Maia engine status.
   */
  maiaStatus?: EngineStatus

  /**
   * Whether Stockfish is currently analyzing.
   */
  isStockfishAnalyzing?: boolean

  /**
   * Whether Maia is currently analyzing.
   */
  isMaiaAnalyzing?: boolean

  /**
   * Optional: CSS class name for custom styling.
   */
  className?: string

  /**
   * Optional: data-testid for testing.
   */
  'data-testid'?: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format centipawn evaluation for display.
 *
 * @param cp - Centipawn value
 * @param isMate - Whether this is a mate score
 * @param mateIn - Moves until mate (if isMate)
 * @returns Formatted string like "+0.35" or "#5"
 */
function formatEval(cp: number, isMate?: boolean, mateIn?: number): string {
  if (isMate && mateIn !== undefined) {
    // Mate score: #5 means checkmate in 5 moves
    const sign = mateIn > 0 ? '+' : '-'
    return `#${sign}${Math.abs(mateIn)}`
  }

  // Regular centipawn score
  const pawns = cp / 100
  const sign = pawns >= 0 ? '+' : ''
  return `${sign}${pawns.toFixed(2)}`
}

/**
 * Format win percentage for display.
 *
 * @param winrate - Win probability (0.0 to 1.0)
 * @returns Formatted string like "54.2%"
 */
function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

/**
 * Get color for evaluation bar.
 *
 * @param winrate - Win probability (0.0 to 1.0)
 * @returns CSS color string
 */
function getEvalColor(winrate: number): string {
  // Gradient from red (0%) to white (50%) to green (100%)
  if (winrate < 0.5) {
    // Losing - red tint
    const intensity = Math.round((1 - winrate * 2) * 200)
    return `rgb(${200 + intensity * 0.3}, ${200 - intensity * 0.5}, ${200 - intensity * 0.5})`
  } else {
    // Winning - green tint
    const intensity = Math.round((winrate - 0.5) * 2 * 200)
    return `rgb(${200 - intensity * 0.5}, ${200 + intensity * 0.3}, ${200 - intensity * 0.5})`
  }
}

/**
 * Get engine status text and color.
 */
function getStatusDisplay(status: EngineStatus): { text: string; color: string } {
  switch (status) {
    case 'not_initialized':
      return { text: 'Not loaded', color: '#666' }
    case 'loading':
      return { text: 'Loading...', color: '#f39c12' }
    case 'ready':
      return { text: 'Ready', color: '#27ae60' }
    case 'analyzing':
      return { text: 'Analyzing...', color: '#3498db' }
    case 'error':
      return { text: 'Error', color: '#e74c3c' }
    default:
      return { text: 'Unknown', color: '#666' }
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Evaluation bar showing win probability visually.
 */
function EvalBar({ winrate }: { winrate: number }) {
  const whiteWidth = `${winrate * 100}%`
  const blackWidth = `${(1 - winrate) * 100}%`

  return (
    <div
      style={{
        display: 'flex',
        height: '20px',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #ccc',
      }}
    >
      <div
        style={{
          width: whiteWidth,
          backgroundColor: '#f8f8f8',
          transition: 'width 0.3s ease',
        }}
      />
      <div
        style={{
          width: blackWidth,
          backgroundColor: '#333',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

/**
 * Status indicator for an engine.
 */
function EngineStatusBadge({ status }: { status: EngineStatus }) {
  const { text, color } = getStatusDisplay(status)

  return (
    <span
      style={{
        fontSize: '11px',
        color: color,
        fontWeight: 500,
      }}
      data-testid="engine-status"
    >
      {text}
    </span>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Engine evaluation panel showing Stockfish and Maia results.
 */
export function EnginePanel({
  stockfishEval,
  maiaEval,
  ewResult,
  stockfishStatus = 'not_initialized',
  maiaStatus = 'not_initialized',
  isStockfishAnalyzing = false,
  isMaiaAnalyzing = false,
  className = '',
  'data-testid': testId = 'engine-panel',
}: EnginePanelProps) {
  // ---------------------------------------------------------------------------
  // RENDER: STOCKFISH SECTION
  // ---------------------------------------------------------------------------

  const renderStockfishSection = () => {
    const effectiveStatus = isStockfishAnalyzing ? 'analyzing' : stockfishStatus

    return (
      <div
        className="stockfish-section"
        style={{
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '12px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Stockfish 17
          </span>
          <EngineStatusBadge status={effectiveStatus} />
        </div>

        {/* Evaluation display */}
        {stockfishEval ? (
          <>
            {/* Main eval and bar */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span
                  data-testid="sf-eval"
                  style={{ fontSize: '20px', fontWeight: 'bold' }}
                >
                  {formatEval(
                    stockfishEval.cp,
                    stockfishEval.isMate,
                    stockfishEval.mateIn
                  )}
                </span>
                <span style={{ fontSize: '16px', color: '#666' }}>
                  {formatWinrate(stockfishEval.winrate)}
                </span>
              </div>
              <EvalBar winrate={stockfishEval.winrate} />
            </div>

            {/* Best move */}
            <div style={{ fontSize: '13px', color: '#555' }}>
              <span style={{ fontWeight: 500 }}>Best:</span>{' '}
              <span data-testid="sf-best-move">{stockfishEval.bestMove}</span>
              <span style={{ color: '#999', marginLeft: '8px' }}>
                Depth: {stockfishEval.depth}
              </span>
            </div>
          </>
        ) : (
          <div style={{ color: '#999', fontSize: '13px' }}>
            {effectiveStatus === 'ready'
              ? 'No evaluation yet'
              : effectiveStatus === 'loading'
              ? 'Loading engine...'
              : effectiveStatus === 'analyzing'
              ? 'Analyzing...'
              : 'Engine not ready'}
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIA SECTION
  // ---------------------------------------------------------------------------

  const renderMaiaSection = () => {
    const effectiveStatus = isMaiaAnalyzing ? 'analyzing' : maiaStatus

    return (
      <div
        className="maia-section"
        style={{
          padding: '12px',
          backgroundColor: '#f0f7ff',
          borderRadius: '8px',
          marginBottom: '12px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Maia {maiaEval?.eloLevel || 1500}
          </span>
          <EngineStatusBadge status={effectiveStatus} />
        </div>

        {/* Maia evaluation */}
        {maiaEval ? (
          <>
            {/* Win probability */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '14px', color: '#555' }}>
                  Win Probability
                </span>
                <span
                  data-testid="maia-winrate"
                  style={{ fontSize: '16px', fontWeight: 'bold' }}
                >
                  {formatWinrate(maiaEval.value)}
                </span>
              </div>
              <EvalBar winrate={maiaEval.value} />
            </div>

            {/* Predicted moves */}
            <div data-testid="maia-moves">
              <span
                style={{ fontSize: '13px', fontWeight: 500, color: '#555' }}
              >
                Predicted moves:
              </span>
              <div style={{ marginTop: '4px' }}>
                {Object.entries(maiaEval.policy)
                  // Sort by probability descending
                  .sort(([, a], [, b]) => b - a)
                  // Take top 5
                  .slice(0, 5)
                  .map(([move, prob]) => (
                    <div
                      key={move}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '2px',
                      }}
                    >
                      <span
                        style={{
                          width: '50px',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                        }}
                      >
                        {move}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '12px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '2px',
                          marginRight: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: `${prob * 100}%`,
                            height: '100%',
                            backgroundColor: '#3498db',
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {formatWinrate(prob)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: '#999', fontSize: '13px' }}>
            {effectiveStatus === 'ready'
              ? 'No prediction yet'
              : effectiveStatus === 'loading'
              ? 'Loading model...'
              : effectiveStatus === 'analyzing'
              ? 'Analyzing...'
              : 'Model not ready'}
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: EXPECTED WINRATE SECTION
  // ---------------------------------------------------------------------------

  const renderEWSection = () => {
    if (!ewResult) return null

    return (
      <div
        className="ew-section"
        style={{
          padding: '12px',
          backgroundColor: '#fff8e6',
          borderRadius: '8px',
        }}
      >
        {/* Header */}
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
          Expected Winrate
        </div>

        {/* Summary */}
        <div style={{ marginBottom: '8px' }}>
          {/* EW using SF at leaves */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '13px' }}>Using SF evaluations:</span>
            <span
              data-testid="ew-sf"
              style={{ fontWeight: 'bold', fontSize: '14px' }}
            >
              {ewResult.candidates[0]
                ? formatWinrate(ewResult.candidates[0].expectedWinrateSF)
                : 'N/A'}
            </span>
          </div>

          {/* EW using Maia at leaves */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px' }}>Using Maia evaluations:</span>
            <span
              data-testid="ew-maia"
              style={{ fontWeight: 'bold', fontSize: '14px' }}
            >
              {ewResult.candidates[0]
                ? formatWinrate(ewResult.candidates[0].expectedWinrateMaia)
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Best moves by EW */}
        {ewResult.candidates.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            Best by EW: {ewResult.candidates[0]?.san || 'N/A'}
            <span style={{ marginLeft: '8px' }}>
              ({ewResult.candidates.length} candidates analyzed)
            </span>
          </div>
        )}

        {/* Calculation time */}
        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
          Calculated in {ewResult.calculationTimeMs}ms
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`engine-panel ${className}`}
      data-testid={testId}
      style={{
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {renderStockfishSection()}
      {renderMaiaSection()}
      {renderEWSection()}
    </div>
  )
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default EnginePanel
