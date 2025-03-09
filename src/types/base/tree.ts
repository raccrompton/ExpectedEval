import { Chess, Color } from 'chess.ts'
import { StockfishEvaluation, MaiaEvaluation } from '..'

// Constants for move classification based on winrate
export const MOVE_CLASSIFICATION = {
  BLUNDER_THRESHOLD: 0.1, // 10% winrate drop - Blunder moves
  INACCURACY_THRESHOLD: 0.05, // 5% winrate drop - Meh moves
  GOOD_MOVE_THRESHOLD: 0.05, // 5% winrate increase
  EXCELLENT_MOVE_THRESHOLD: 0.1, // 10% winrate increase
}

interface NodeAnalysis {
  maia?: { [rating: string]: MaiaEvaluation }
  stockfish?: StockfishEvaluation
}

export class GameTree {
  private root: GameNode
  private headers: Map<string, string>

  constructor(initialFen: string) {
    this.root = new GameNode(initialFen)
    this.headers = new Map<string, string>()

    if (
      initialFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    ) {
      this.headers.set('SetUp', '1')
      this.headers.set('FEN', initialFen)
    }
  }

  setHeader(key: string, value: string): void {
    this.headers.set(key, value)
  }

  getHeader(key: string): string | undefined {
    return this.headers.get(key)
  }

  toPGN(): string {
    const chess = new Chess()

    if (this.root.fen !== chess.fen()) {
      chess.load(this.root.fen)
    }

    this.headers.forEach((value, key) => {
      chess.addHeader(key, value)
      chess.addHeader(key, value)
    })

    let complete = false
    let node = this.root
    while (!complete) {
      if (node.mainChild) {
        node = node.mainChild
        chess.move(node.san || node.move || '')
      } else {
        complete = true
      }
    }

    return chess.pgn()
  }

  getRoot(): GameNode {
    return this.root
  }

  getMainLine(): GameNode[] {
    return this.root.getMainLine()
  }

  addMainMove(
    node: GameNode,
    fen: string,
    move: string,
    san: string,
  ): GameNode {
    return node.addChild(fen, move, san, true)
  }

  addVariation(
    node: GameNode,
    fen: string,
    move: string,
    san: string,
  ): GameNode {
    if (node.findVariation(move)) {
      return node.findVariation(move) as GameNode
    }
    return node.addChild(fen, move, san, false)
  }
}

export class GameNode {
  private _fen: string
  private _move: string | null
  private _san: string | null
  private _parent: GameNode | null
  private _children: GameNode[]
  private _mainChild: GameNode | null
  private _mainline: boolean
  private _analysis: NodeAnalysis
  private _turn: Color
  private _check: boolean
  private _blunder: boolean
  private _inaccuracy: boolean
  private _goodMove: boolean
  private _excellentMove: boolean
  private _bestMove: boolean
  private _moveNumber: number

  private static readonly BLUNDER_THRESHOLD =
    MOVE_CLASSIFICATION.BLUNDER_THRESHOLD
  private static readonly INACCURACY_THRESHOLD =
    MOVE_CLASSIFICATION.INACCURACY_THRESHOLD
  private static readonly GOOD_MOVE_THRESHOLD =
    MOVE_CLASSIFICATION.GOOD_MOVE_THRESHOLD
  private static readonly EXCELLENT_MOVE_THRESHOLD =
    MOVE_CLASSIFICATION.EXCELLENT_MOVE_THRESHOLD

  constructor(
    fen: string,
    move: string | null = null,
    san: string | null = null,
    parent: GameNode | null = null,
    mainline = true,
  ) {
    this._fen = fen
    this._move = move
    this._san = san
    this._parent = parent
    this._children = []
    this._mainChild = null
    this._mainline = mainline
    this._analysis = {}
    this._blunder = false
    this._inaccuracy = false
    this._goodMove = false
    this._excellentMove = false
    this._bestMove = false
    this._turn = this.parseTurn(fen)
    this._check = fen.includes('+')
    this._moveNumber = this.parseMoveNumber(fen, this._turn)
  }

  get fen(): string {
    return this._fen
  }
  get move(): string | null {
    return this._move
  }
  get san(): string | null {
    return this._san
  }
  get parent(): GameNode | null {
    return this._parent
  }
  get children(): GameNode[] {
    return this._children
  }
  get isMainline(): boolean {
    return this._mainline
  }
  get mainChild(): GameNode | null {
    return this._mainChild
  }
  get analysis(): NodeAnalysis {
    return this._analysis
  }
  get turn(): Color {
    return this._turn
  }
  get check(): boolean {
    return this._check
  }
  get blunder(): boolean {
    return this._blunder
  }
  get inaccuracy(): boolean {
    return this._inaccuracy
  }
  get goodMove(): boolean {
    return this._goodMove
  }
  get excellentMove(): boolean {
    return this._excellentMove
  }
  get bestMove(): boolean {
    return this._bestMove
  }
  get moveNumber(): number {
    return this._moveNumber
  }

  private parseTurn(fen: string): Color {
    const parts = fen.split(' ')
    return parts[1] as Color
  }

  private parseMoveNumber(fen: string, turn: string): number {
    const parts = fen.split(' ')
    return parseInt(parts[5]) - (turn === 'w' ? 1 : 0)
  }

  // Helper method to classify a move based on winrate
  private classifyMoveByWinrate(
    node: GameNode,
    move: string,
    stockfishEval: StockfishEvaluation,
  ): void {
    // Check if this is the best move
    const best_move = stockfishEval.model_move
    node._bestMove = move === best_move

    if (stockfishEval.winrate_loss_vec && stockfishEval.winrate_vec) {
      const winrate_loss = stockfishEval.winrate_loss_vec[move]

      // Classify based on winrate loss
      if (winrate_loss !== undefined) {
        node._blunder = winrate_loss <= -GameNode.BLUNDER_THRESHOLD
        node._inaccuracy =
          !node._blunder && winrate_loss <= -GameNode.INACCURACY_THRESHOLD

        // For good/excellent moves, we need to compare to the average winrate
        // A move is good/excellent if it's better than the average of all moves
        const winrates = Object.values(stockfishEval.winrate_vec)
        if (winrates.length > 0) {
          const avgWinrate =
            winrates.reduce((a, b) => a + b, 0) / winrates.length
          const moveWinrate = stockfishEval.winrate_vec[move]

          if (moveWinrate !== undefined) {
            const winrateImprovement = moveWinrate - avgWinrate
            node._goodMove = winrateImprovement >= GameNode.GOOD_MOVE_THRESHOLD
            node._excellentMove =
              winrateImprovement >= GameNode.EXCELLENT_MOVE_THRESHOLD
          }
        }
      }
    } else {
      // Fallback to CP-based classification if winrate not available
      const relative_eval = stockfishEval.cp_relative_vec[move]
      node._blunder = relative_eval < -150
    }
  }

  addChild(fen: string, move: string, san: string, mainline = false): GameNode {
    const child = new GameNode(fen, move, san, this, mainline)
    this._children.push(child)
    if (mainline) {
      this._mainChild = child
    }

    if (
      this._analysis.stockfish &&
      this._analysis.stockfish.depth >= 15 &&
      move
    ) {
      this.classifyMoveByWinrate(child, move, this._analysis.stockfish)
    }

    return child
  }

  addMaiaAnalysis(maiaEval: { [rating: string]: MaiaEvaluation }): void {
    this._analysis.maia = maiaEval
  }

  addStockfishAnalysis(stockfishEval: StockfishEvaluation): void {
    this._analysis.stockfish = stockfishEval

    if (stockfishEval.depth >= 15) {
      for (const child of this._children) {
        if (child.move) {
          this.classifyMoveByWinrate(child, child.move, stockfishEval)
        }
      }
    }
  }

  getMainLine(): GameNode[] {
    if (!this._mainChild) {
      return [this]
    }
    return [this, ...this._mainChild.getMainLine()]
  }

  getVariations(): GameNode[] {
    return this._children.filter((child) => !child.isMainline)
  }

  findVariation(move: string): GameNode | null {
    return (
      this._children.find(
        (child) => child.move === move && !child.isMainline,
      ) || null
    )
  }

  getPath(): GameNode[] {
    if (!this._parent) {
      return [this]
    }

    return [...this._parent.getPath(), this]
  }

  removeVariation(move: string): boolean {
    const index = this._children.findIndex(
      (child) => child.move === move && !child.isMainline,
    )
    if (index !== -1) {
      this._children.splice(index, 1)
      return true
    }
    return false
  }

  promoteVariation(move: string): boolean {
    const variation = this.findVariation(move)
    if (!variation) return false

    if (this._mainChild) {
      this._mainChild._mainline = false
    }

    this._mainChild = variation
    variation._mainline = true
    return true
  }
}
