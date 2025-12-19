/**
 * EngineContext - Global Engine State Management
 *
 * This React context provides engine instances (Stockfish and Maia)
 * to all components in the application. It manages:
 * - Engine initialization (one-time loading of WASM/ONNX)
 * - Engine lifecycle (creation and cleanup)
 * - Loading status for UI feedback
 *
 * Why use a context?
 * - Engines are expensive to initialize (download large files)
 * - We want ONE instance shared across all components
 * - Multiple components need access (EnginePanel, EWTree, etc.)
 *
 * Architecture:
 * - Provider wraps the app (in _app.tsx or layout.tsx)
 * - Child components use useEngine() hook to access engines
 * - Engines are lazily initialized on first use
 *
 * @example
 * ```tsx
 * // In _app.tsx or layout.tsx:
 * <EngineProvider>
 *   <App />
 * </EngineProvider>
 *
 * // In any component:
 * function AnalysisPanel() {
 *   const { stockfish, maia, status } = useEngine()
 *
 *   if (status.stockfish !== 'ready') {
 *     return <div>Loading Stockfish...</div>
 *   }
 *
 *   // Use engines...
 * }
 * ```
 *
 * Dependencies:
 * - React: createContext, useContext, useState, useEffect, useRef
 * - @/core/engine: Engine adapters and types
 */

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import type {
  StockfishAdapter,
  MaiaAdapter,
  EngineStatus,
  StockfishEvaluation,
  MaiaEvaluation,
} from '@/core/engine'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Status of each engine.
 */
export interface EngineStatusState {
  /**
   * Stockfish engine status.
   */
  stockfish: EngineStatus

  /**
   * Maia engine status.
   */
  maia: EngineStatus
}

/**
 * Error state for each engine.
 */
export interface EngineErrors {
  /**
   * Error message from Stockfish initialization, if any.
   */
  stockfish: string | null

  /**
   * Error message from Maia initialization, if any.
   */
  maia: string | null
}

/**
 * Context value provided to child components.
 */
export interface EngineContextValue {
  // ---------------------------------------------------------------------------
  // ENGINE INSTANCES
  // ---------------------------------------------------------------------------

  /**
   * Stockfish engine instance.
   * Null until initialization is attempted.
   */
  stockfish: StockfishAdapter | null

  /**
   * Maia engine instance.
   * Null until initialization is attempted.
   */
  maia: MaiaAdapter | null

  // ---------------------------------------------------------------------------
  // STATUS
  // ---------------------------------------------------------------------------

  /**
   * Current status of each engine.
   */
  status: EngineStatusState

  /**
   * Error messages from engine initialization.
   */
  errors: EngineErrors

  /**
   * Whether both engines are ready for use.
   */
  isReady: boolean

  /**
   * Whether engines are currently loading.
   */
  isLoading: boolean

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Initialize engines. Called automatically, but can be retried on error.
   */
  initializeEngines: () => Promise<void>

  /**
   * Evaluate a position with Stockfish.
   * Returns null if Stockfish is not ready.
   *
   * @param fen - Position to evaluate
   * @param depth - Search depth (optional, defaults to 14)
   * @returns Evaluation result or null
   */
  evaluateWithStockfish: (
    fen: string,
    depth?: number
  ) => Promise<StockfishEvaluation | null>

  /**
   * Predict moves with Maia.
   * Returns null if Maia is not ready.
   *
   * @param fen - Position to analyze
   * @param eloLevel - Maia level (optional, defaults to 1500)
   * @returns Move predictions or null
   */
  predictWithMaia: (
    fen: string,
    eloLevel?: number
  ) => Promise<MaiaEvaluation | null>
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

/**
 * The React context for engine state.
 *
 * Default value is null - components must be wrapped in EngineProvider.
 */
const EngineContext = createContext<EngineContextValue | null>(null)

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * Props for the EngineProvider component.
 */
export interface EngineProviderProps {
  /**
   * Child components that will have access to engines.
   */
  children: ReactNode

  /**
   * Whether to automatically initialize engines on mount.
   * Defaults to true.
   */
  autoInitialize?: boolean
}

/**
 * Provider component that manages engine lifecycle.
 *
 * Wrap your app with this to provide engine access to all components.
 */
export function EngineProvider({
  children,
  autoInitialize = true,
}: EngineProviderProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Stockfish engine instance.
   */
  const [stockfish, setStockfish] = useState<StockfishAdapter | null>(null)

  /**
   * Maia engine instance.
   */
  const [maia, setMaia] = useState<MaiaAdapter | null>(null)

  /**
   * Status of each engine.
   */
  const [status, setStatus] = useState<EngineStatusState>({
    stockfish: 'not_initialized',
    maia: 'not_initialized',
  })

  /**
   * Error messages.
   */
  const [errors, setErrors] = useState<EngineErrors>({
    stockfish: null,
    maia: null,
  })

  /**
   * Track if initialization has been attempted.
   * Prevents double-initialization in React StrictMode.
   */
  const initAttempted = useRef(false)

  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------

  /**
   * Both engines ready.
   */
  const isReady = status.stockfish === 'ready' && status.maia === 'ready'

  /**
   * Either engine loading.
   */
  const isLoading = status.stockfish === 'loading' || status.maia === 'loading'

  // ---------------------------------------------------------------------------
  // ENGINE INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize Stockfish engine.
   */
  const initializeStockfish = useCallback(async () => {
    try {
      // Update status to loading
      setStatus((prev) => ({ ...prev, stockfish: 'loading' }))
      setErrors((prev) => ({ ...prev, stockfish: null }))

      // Dynamic import to avoid SSR issues
      // Stockfish uses WASM which only works in browser
      const { createStockfish } = await import('@/core/engine')

      // Create and initialize the engine
      const sfEngine = createStockfish()
      await sfEngine.init()

      // Store the engine and update status
      setStockfish(sfEngine)
      setStatus((prev) => ({ ...prev, stockfish: 'ready' }))
    } catch (e) {
      // Handle initialization error
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to initialize Stockfish'
      setErrors((prev) => ({ ...prev, stockfish: errorMessage }))
      setStatus((prev) => ({ ...prev, stockfish: 'error' }))
      console.error('Stockfish initialization failed:', e)
    }
  }, [])

  /**
   * Initialize Maia engine.
   */
  const initializeMaia = useCallback(async () => {
    try {
      // Update status to loading
      setStatus((prev) => ({ ...prev, maia: 'loading' }))
      setErrors((prev) => ({ ...prev, maia: null }))

      // Dynamic import to avoid SSR issues
      // Maia uses ONNX Runtime which only works in browser
      const { createMaia } = await import('@/core/engine')

      // Create and initialize the engine
      const maiaEngine = createMaia()
      await maiaEngine.init()

      // Store the engine and update status
      setMaia(maiaEngine)
      setStatus((prev) => ({ ...prev, maia: 'ready' }))
    } catch (e) {
      // Handle initialization error
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to initialize Maia'
      setErrors((prev) => ({ ...prev, maia: errorMessage }))
      setStatus((prev) => ({ ...prev, maia: 'error' }))
      console.error('Maia initialization failed:', e)
    }
  }, [])

  /**
   * Initialize both engines.
   */
  const initializeEngines = useCallback(async () => {
    // Initialize both engines in parallel
    await Promise.all([initializeStockfish(), initializeMaia()])
  }, [initializeStockfish, initializeMaia])

  // ---------------------------------------------------------------------------
  // ENGINE EVALUATION HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Evaluate position with Stockfish.
   */
  const evaluateWithStockfish = useCallback(
    async (
      fen: string,
      depth: number = 14
    ): Promise<StockfishEvaluation | null> => {
      // Check if Stockfish is ready
      if (!stockfish || status.stockfish !== 'ready') {
        return null
      }

      try {
        // Update status to analyzing
        setStatus((prev) => ({ ...prev, stockfish: 'analyzing' }))

        // Run evaluation
        const result = await stockfish.evaluate(fen, { depth })

        // Update status back to ready
        setStatus((prev) => ({ ...prev, stockfish: 'ready' }))

        return result
      } catch (e) {
        console.error('Stockfish evaluation failed:', e)
        setStatus((prev) => ({ ...prev, stockfish: 'ready' }))
        return null
      }
    },
    [stockfish, status.stockfish]
  )

  /**
   * Predict moves with Maia.
   */
  const predictWithMaia = useCallback(
    async (
      fen: string,
      eloLevel: number = 1500
    ): Promise<MaiaEvaluation | null> => {
      // Check if Maia is ready
      if (!maia || status.maia !== 'ready') {
        return null
      }

      try {
        // Update status to analyzing
        setStatus((prev) => ({ ...prev, maia: 'analyzing' }))

        // Run prediction
        const result = await maia.predict(fen, { eloLevel })

        // Update status back to ready
        setStatus((prev) => ({ ...prev, maia: 'ready' }))

        return result
      } catch (e) {
        console.error('Maia prediction failed:', e)
        setStatus((prev) => ({ ...prev, maia: 'ready' }))
        return null
      }
    },
    [maia, status.maia]
  )

  // ---------------------------------------------------------------------------
  // AUTO-INITIALIZATION EFFECT
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Only run once, even in StrictMode
    if (autoInitialize && !initAttempted.current) {
      initAttempted.current = true
      initializeEngines()
    }

    // Cleanup function - destroy engines when provider unmounts
    return () => {
      if (stockfish) {
        stockfish.destroy()
      }
      if (maia) {
        maia.destroy()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - run only on mount

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const contextValue: EngineContextValue = {
    // Instances
    stockfish,
    maia,
    // Status
    status,
    errors,
    isReady,
    isLoading,
    // Actions
    initializeEngines,
    evaluateWithStockfish,
    predictWithMaia,
  }

  return (
    <EngineContext.Provider value={contextValue}>
      {children}
    </EngineContext.Provider>
  )
}

// ============================================================================
// CONSUMER HOOK
// ============================================================================

/**
 * Hook to access engine context from any component.
 *
 * Must be used within an EngineProvider.
 *
 * @throws Error if used outside of EngineProvider
 * @returns Engine context value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { stockfish, status, evaluateWithStockfish } = useEngine()
 *
 *   if (status.stockfish !== 'ready') {
 *     return <div>Loading...</div>
 *   }
 *
 *   const handleAnalyze = async () => {
 *     const result = await evaluateWithStockfish(fen)
 *     console.log(result)
 *   }
 * }
 * ```
 */
export function useEngine(): EngineContextValue {
  const context = useContext(EngineContext)

  if (!context) {
    throw new Error('useEngine must be used within an EngineProvider')
  }

  return context
}
