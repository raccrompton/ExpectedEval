import { Chess } from 'chess.ts'
import StockfishWeb from 'lila-stockfish-web'

import { StockfishEvaluation } from 'src/types'

class Engine {
  private fen: string
  private stockfish: StockfishWeb | null
  private moves: string[]
  private moveIndex: number
  private store: {
    [key: string]: StockfishEvaluation
  }
  private legalMoveCount: number
  private callback: (data: StockfishEvaluation, index: number) => void

  constructor(callback: (data: StockfishEvaluation, index: number) => void) {
    this.fen = ''
    this.store = {}
    this.moves = []
    this.moveIndex = 0
    this.legalMoveCount = 0
    this.callback = callback
    this.stockfish = null
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

  evaluatePosition(fen: string, legalMoveCount: number, index: number) {
    if (this.stockfish) {
      if (typeof global.gc === 'function') {
        global.gc()
      }

      this.store = {}
      this.legalMoveCount = legalMoveCount
      const board = new Chess(fen)
      this.moves = board.moves({ verbose: true }).map((x) => x.from + x.to)
      this.moveIndex = index
      this.fen = fen

      this.sendMessage('stop')
      this.sendMessage('ucinewgame')
      this.sendMessage(`position fen ${fen}`)
      this.sendMessage('go depth 18')
    }
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
      if (this.fen.includes(' w ')) {
        cp = mate > 0 ? 10000 : -10000
      } else {
        cp = mate > 0 ? -10000 : 10000
      }
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
      this.callback(this.store[depth], this.moveIndex)
    }
  }

  private onError(msg: string) {
    console.error(msg)
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
