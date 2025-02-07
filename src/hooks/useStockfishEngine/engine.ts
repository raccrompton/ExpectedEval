import { Chess } from 'chess.ts'
import StockfishWeb from 'lila-stockfish-web'

import { StockfishEvaluation } from 'src/types'

class Engine {
  private fen: string
  private moves: string[]
  private isEvaluating: boolean
  private stockfish: StockfishWeb | null = null

  private store: {
    [key: string]: StockfishEvaluation
  }
  private legalMoveCount: number
  private evaluationResolver: ((value: StockfishEvaluation) => void) | null
  private evaluationRejecter: ((reason?: unknown) => void) | null
  private evaluationPromise: Promise<StockfishEvaluation> | null
  private evaluationGenerator: AsyncGenerator<StockfishEvaluation> | null

  constructor() {
    this.fen = ''
    this.store = {}
    this.moves = []
    this.isEvaluating = false

    this.legalMoveCount = 0
    this.evaluationResolver = null
    this.evaluationRejecter = null
    this.evaluationPromise = null
    this.evaluationGenerator = null

    this.onMessage = this.onMessage.bind(this)

    setupStockfish().then((stockfish: StockfishWeb) => {
      this.stockfish = stockfish
      stockfish.uci('uci')
      stockfish.uci('isready')
      stockfish.uci('setoption name MultiPV value 100')
      stockfish.onError = this.onError
      stockfish.listen = this.onMessage
    })
  }

  async *streamEvaluations(
    fen: string,
    legalMoveCount: number,
  ): AsyncGenerator<StockfishEvaluation> {
    if (this.stockfish) {
      if (typeof global.gc === 'function') {
        global.gc()
      }

      this.store = {}
      this.legalMoveCount = legalMoveCount
      const board = new Chess(fen)
      this.moves = board.moves({ verbose: true }).map((x) => x.from + x.to)
      this.fen = fen
      this.isEvaluating = true
      this.evaluationGenerator = this.createEvaluationGenerator()

      this.sendMessage('stop')
      this.sendMessage('ucinewgame')
      this.sendMessage(`position fen ${fen}`)
      this.sendMessage('go depth 18')

      while (this.isEvaluating) {
        try {
          const evaluation = await this.getNextEvaluation()
          if (evaluation) {
            yield evaluation
          } else {
            break
          }
        } catch (error) {
          console.error('Error in evaluation stream:', error)
          break
        }
      }
    }
  }

  private async getNextEvaluation(): Promise<StockfishEvaluation | null> {
    return new Promise((resolve, reject) => {
      this.evaluationResolver = resolve
      this.evaluationRejecter = reject
    })
  }

  private createEvaluationGenerator(): AsyncGenerator<StockfishEvaluation> | null {
    return null
  }

  private sendMessage(message: string) {
    if (this.stockfish) {
      this.stockfish.uci(message)
    }
  }

  private onMessage(msg: string) {
    const matches = [
      ...msg.matchAll(
        /info depth (\d+) seldepth (\d+) multipv (\d+) score (?:cp (-?\d+)|mate (-?\d+)).+ pv ((?:\S+\s*)+)/g,
      ),
    ][0]

    if (!matches || !matches.length) {
      return
    }

    const depth = parseInt(matches[1], 10)
    const multipv = parseInt(matches[3], 10)
    let cp = parseInt(matches[4], 10)
    const mate = parseInt(matches[5], 10)
    const pv = matches[6]
    const move = pv.split(' ')[0]

    if (!this.moves.includes(move)) {
      return
    }

    if (!isNaN(mate) && isNaN(cp)) {
      cp = mate > 0 ? 10000 : -10000
    }

    const board = new Chess(this.fen)
    const isWhiteTurn = board.turn() === 'w'
    if (!isWhiteTurn) {
      cp *= -1
    }

    if (this.store[depth]) {
      this.store[depth].cp_vec[move] = cp
      this.store[depth].cp_relative_vec[move] =
        this.store[depth].model_optimal_cp - cp
    } else {
      this.store[depth] = {
        depth: depth,
        model_move: move,
        model_optimal_cp: cp,
        cp_vec: { [move]: cp },
        cp_relative_vec: { [move]: 0 },
        sent: false,
      }
    }

    if (!this.store[depth].sent && multipv === this.legalMoveCount) {
      this.store[depth].sent = true

      if (this.evaluationResolver) {
        this.evaluationResolver(this.store[depth])
        this.evaluationResolver = null
        this.evaluationRejecter = null
      }
    }
  }

  private onError(msg: string) {
    console.error(msg)
    if (this.evaluationRejecter) {
      this.evaluationRejecter(msg)
      this.evaluationResolver = null
      this.evaluationRejecter = null
    }
    this.isEvaluating = false
  }
  stopEvaluation() {
    this.isEvaluating = false
    this.sendMessage('stop')
  }
}

const sharedWasmMemory = (lo: number, hi = 32767): WebAssembly.Memory => {
  let shrink = 4 // 32767 -> 24576 -> 16384 -> 12288 -> 8192 -> 6144 -> etc
  while (true) {
    try {
      return new WebAssembly.Memory({ shared: true, initial: lo, maximum: hi })
    } catch (e) {
      if (hi <= lo || !(e instanceof RangeError)) throw e
      hi = Math.max(lo, Math.ceil(hi - hi / shrink))
      shrink = shrink === 4 ? 3 : 4
    }
  }
}

const setupStockfish = (): Promise<StockfishWeb> => {
  return new Promise<StockfishWeb>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('lila-stockfish-web/sf17-79.js').then((makeModule: any) => {
      makeModule
        .default({
          wasmMemory: sharedWasmMemory(2560),
          onError: (msg: string) => reject(new Error(msg)),
          locateFile: (name: string) => `/stockfish/${name}`,
        })
        .then(async (instance: StockfishWeb) => {
          instance
          Promise.all([
            fetch(`/stockfish/${instance.getRecommendedNnue(0)}`),
            fetch(`/stockfish/${instance.getRecommendedNnue(1)}`),
          ]).then((responses) => {
            Promise.all([
              responses[0].arrayBuffer(),
              responses[1].arrayBuffer(),
            ]).then((buffers) => {
              instance.setNnueBuffer(new Uint8Array(buffers[0]), 0)
              instance.setNnueBuffer(new Uint8Array(buffers[1]), 1)
            })
          })
          resolve(instance)
        })
    })
  })
}

export default Engine
