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
  isInitialized: boolean
}

interface EngineEvaluationContextValue {
  stockfishStatus: EngineStatus
  maiaStatus: EngineStatus
  stockfishEvaluation: StockfishEvaluation | null
  maiaEvaluation: MaiaEvaluation | null
  isStockfishEvaluating: boolean
  isMaiaEvaluating: boolean
  evaluatePosition: (fen: string) => Promise<void>
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

  useEffect(() => {
    let mounted = true
    let sfEngine: RealStockfish | null = null
    let maiaEngine: RealMaia | null = null

    // Cleanup helper that handles async destroy
    const cleanupEngines = async () => {
      if (maiaEngine) {
        try {
          await maiaEngine.destroy()
        } catch (e) {
          console.warn('Error destroying Maia:', e)
        }
      }
      if (sfEngine) {
        sfEngine.destroy()
      }
    }

    // Initialize engines sequentially to avoid memory pressure
    // Both engines together need ~325MB+ of WASM memory
    const initEngines = async () => {
      try {
        // Initialize Stockfish first (larger memory footprint: 160MB + 75MB NNUE)
        sfEngine = new RealStockfish()
        setStockfishStatus('loading')
        await sfEngine.init()

        if (!mounted) {
          sfEngine.destroy()
          return
        }
        setStockfishStatus('ready')

        // Then initialize Maia (89MB ONNX model)
        maiaEngine = new RealMaia()
        setMaiaStatus('loading')
        await maiaEngine.init()

        if (!mounted) {
          await cleanupEngines()
          return
        }

        setStockfish(sfEngine)
        setMaia(maiaEngine)
        setIsInitialized(true)
        setMaiaStatus('ready')
      } catch (error) {
        console.error('Failed to initialize engines:', error)
        if (mounted) {
          setStockfishStatus('error')
          setMaiaStatus('error')
        }
        // Clean up any partially initialized engines
        await cleanupEngines()
      }
    }

    initEngines()

    return () => {
      mounted = false
      cleanupEngines()
    }
  }, [])

  const evaluatePosition = useCallback(
    async (fen: string) => {
      if (!stockfish || !maia) return

      currentEvalFen.current = fen
      setIsStockfishEvaluating(true)
      setIsMaiaEvaluating(true)
      setStockfishStatus('analyzing')
      setMaiaStatus('analyzing')

      try {
        const depth = getStockfishDepth()
        const [sfResult, maiaResult] = await Promise.all([
          stockfish.evaluate(fen, { depth }),
          maia.predict(fen),
        ])

        if (currentEvalFen.current !== fen) {
          return
        }

        setStockfishEvaluation(sfResult)
        setMaiaEvaluation(maiaResult)
        setStockfishStatus('ready')
        setMaiaStatus('ready')
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
    [stockfish, maia]
  )

  const instanceValue = useMemo<EngineInstanceContextValue>(
    () => ({
      stockfish,
      maia,
      isInitialized,
    }),
    [stockfish, maia, isInitialized]
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
