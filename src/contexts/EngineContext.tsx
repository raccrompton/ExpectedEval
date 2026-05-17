import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import {
  RealStockfish,
  RealMaia,
  type StockfishAdapter,
  type MaiaAdapter,
  type StockfishEvaluation,
  type MaiaEvaluation,
  type EngineStatus,
  logEngineMemory,
} from '@/core/engine'

/**
 * Get Stockfish depth from URL params for faster E2E tests.
 * Uses sfDepth query param if present, otherwise default of 10.
 */
function getStockfishDepth(): number {
  if (typeof window === 'undefined' || !window.location) {
    return 10
  }
  const params = new URLSearchParams(window.location.search)
  const sfDepth = params.get('sfDepth')
  if (sfDepth) {
    return parseInt(sfDepth, 10)
  }
  return 10
}

interface EngineInstanceContextValue {
  stockfish: StockfishAdapter | null
  maia: MaiaAdapter | null
  /**
   * True once Maia is ready. Reflects that the Maia-first experience is
   * usable. Stockfish is lazy — its readiness is tracked separately by
   * stockfishStatus (starts as 'not_initialized').
   */
  isInitialized: boolean
  /**
   * Idempotent: initialises Stockfish on first call, returns the same
   * promise on subsequent calls while loading, resolves immediately once
   * already ready.
   */
  ensureStockfish: () => Promise<void>
}

interface EngineEvaluationContextValue {
  stockfishStatus: EngineStatus
  maiaStatus: EngineStatus
  stockfishEvaluation: StockfishEvaluation | null
  maiaEvaluation: MaiaEvaluation | null
  isStockfishEvaluating: boolean
  isMaiaEvaluating: boolean
  evaluatePosition: (_fen: string) => Promise<void>
}

const EngineInstanceContext = createContext<EngineInstanceContextValue | null>(null)
const EngineEvaluationContext = createContext<EngineEvaluationContextValue | null>(null)

interface EngineProviderProps {
  children: ReactNode
}

export function EngineProvider({ children }: EngineProviderProps) {
  const [stockfish, setStockfish] = useState<StockfishAdapter | null>(null)
  const [maia, setMaia] = useState<MaiaAdapter | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [stockfishStatus, setStockfishStatus] = useState<EngineStatus>('not_initialized')
  const [maiaStatus, setMaiaStatus] = useState<EngineStatus>('not_initialized')
  const [stockfishEvaluation, setStockfishEvaluation] = useState<StockfishEvaluation | null>(null)
  const [maiaEvaluation, setMaiaEvaluation] = useState<MaiaEvaluation | null>(null)
  const [isStockfishEvaluating, setIsStockfishEvaluating] = useState(false)
  const [isMaiaEvaluating, setIsMaiaEvaluating] = useState(false)
  const currentEvalFen = useRef<string | null>(null)

  // Holds a ref to the engine instances so ensureStockfish can access them
  // without being recreated every render.
  const sfEngineRef = useRef<StockfishAdapter | null>(null)

  // Memoised promise for the lazy Stockfish init — mirrors how RealMaia
  // memoises initPromise internally.
  const stockfishInitPromiseRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    // Create Stockfish instance immediately so the adapter object exists,
    // but do NOT call init() — that happens lazily via ensureStockfish().
    const sfEngine = new RealStockfish()
    const maiaEngine = new RealMaia()
    let cancelled = false

    sfEngineRef.current = sfEngine
    setStockfish(sfEngine)

    setMaiaStatus('loading')

    // Only initialise Maia at mount. Stockfish is initialised on first use
    // via ensureStockfish(), keeping peak memory lower for iOS Safari.
    maiaEngine
      .init()
      .then(() => {
        logEngineMemory('maia-init')
        if (cancelled) return
        setMaia(maiaEngine)
        setIsInitialized(true)
        setMaiaStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Failed to initialize Maia:', error)
        setMaiaStatus('error')
      })

    return () => {
      cancelled = true
      sfEngineRef.current = null
      stockfishInitPromiseRef.current = null
      sfEngine.destroy()
      maiaEngine.destroy()
    }
  }, [])

  /**
   * Idempotent lazy Stockfish initialiser.
   *
   * - First call: sets status → 'loading', calls sfEngine.init(), then
   *   sets status → 'ready' (or 'error' on failure).
   * - Concurrent calls while loading: return the same in-flight promise.
   * - Subsequent calls once ready: resolve immediately.
   * - On error: clears the cached promise so the next call retries.
   */
  const ensureStockfish = useCallback(async (): Promise<void> => {
    const sfEngine = sfEngineRef.current
    if (!sfEngine) {
      throw new Error('Stockfish engine not available')
    }

    // Already ready — fast path.
    if (sfEngine.isReady()) {
      return
    }

    // Return the in-flight promise if init is already running.
    if (stockfishInitPromiseRef.current) {
      return stockfishInitPromiseRef.current
    }

    setStockfishStatus('loading')

    const initPromise = sfEngine
      .init()
      .then(() => {
        logEngineMemory('stockfish-init')
        setStockfishStatus('ready')
      })
      .catch((error) => {
        // Clear so a retry is possible.
        stockfishInitPromiseRef.current = null
        setStockfishStatus('error')
        console.error('Failed to initialize Stockfish:', error)
        throw error
      })

    stockfishInitPromiseRef.current = initPromise
    return initPromise
  }, [])

  const evaluatePosition = useCallback(
    async (fen: string) => {
      if (!maia) return

      currentEvalFen.current = fen
      setIsMaiaEvaluating(true)
      setMaiaStatus('analyzing')

      // Kick off Maia immediately; Stockfish is initialised lazily in parallel.
      // We do NOT await ensureStockfish() before starting Maia so Maia results
      // appear as quickly as possible even on the first evaluation.
      const sfEngine = sfEngineRef.current

      const sfPromise: Promise<StockfishEvaluation | null> = sfEngine
        ? ensureStockfish()
            .then(() => {
              if (currentEvalFen.current !== fen) return null
              setIsStockfishEvaluating(true)
              setStockfishStatus('analyzing')
              const depth = getStockfishDepth()
              return sfEngine.evaluate(fen, { depth })
            })
            .catch((error) => {
              console.error('Stockfish evaluation error:', error)
              // Don't crash — surface the error status but let Maia succeed.
              if (currentEvalFen.current === fen) {
                setStockfishStatus('error')
                setIsStockfishEvaluating(false)
              }
              return null
            })
        : Promise.resolve(null)

      const maiaPromise = maia.predict(fen).catch((error) => {
        console.error('Maia evaluation error:', error)
        return null
      })

      try {
        const [sfResult, maiaResult] = await Promise.all([sfPromise, maiaPromise])

        if (currentEvalFen.current !== fen) {
          return
        }

        if (maiaResult !== null) {
          setMaiaEvaluation(maiaResult)
          setMaiaStatus('ready')
        } else {
          setMaiaStatus('error')
        }

        if (sfResult !== null) {
          setStockfishEvaluation(sfResult)
          setStockfishStatus('ready')
        }
        // If sfResult is null, status was already set inside sfPromise's catch.
      } catch (error) {
        if (currentEvalFen.current !== fen) {
          return
        }
        console.error('Evaluation error:', error)
        setStockfishStatus('error')
        setMaiaStatus('error')
      } finally {
        if (currentEvalFen.current === fen) {
          setIsStockfishEvaluating(false)
          setIsMaiaEvaluating(false)
        }
      }
    },
    [maia, ensureStockfish]
  )

  const instanceValue = useMemo<EngineInstanceContextValue>(
    () => ({
      stockfish,
      maia,
      isInitialized,
      ensureStockfish,
    }),
    [stockfish, maia, isInitialized, ensureStockfish]
  )

  const evaluationValue = useMemo<EngineEvaluationContextValue>(
    () => ({
      stockfishStatus,
      maiaStatus,
      stockfishEvaluation,
      maiaEvaluation,
      isStockfishEvaluating,
      isMaiaEvaluating,
      evaluatePosition,
    }),
    [
      stockfishStatus,
      maiaStatus,
      stockfishEvaluation,
      maiaEvaluation,
      isStockfishEvaluating,
      isMaiaEvaluating,
      evaluatePosition,
    ]
  )

  return (
    <EngineInstanceContext.Provider value={instanceValue}>
      <EngineEvaluationContext.Provider value={evaluationValue}>
        {children}
      </EngineEvaluationContext.Provider>
    </EngineInstanceContext.Provider>
  )
}

export function useEngineInstances() {
  const context = useContext(EngineInstanceContext)
  if (!context) {
    throw new Error('useEngineInstances must be used within an EngineProvider')
  }
  return context
}

export function useEngineEvaluation() {
  const context = useContext(EngineEvaluationContext)
  if (!context) {
    throw new Error('useEngineEvaluation must be used within an EngineProvider')
  }
  return context
}

export function useEngines() {
  const instances = useEngineInstances()
  const evaluation = useEngineEvaluation()
  return { ...instances, ...evaluation }
}
