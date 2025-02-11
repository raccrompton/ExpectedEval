import { Chess, Color } from 'chess.ts'
import { StockfishEvaluation, MaiaEvaluation } from '..'

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

  toPGN(includeVariations = true): string {
    const chess = new Chess()

    if (this.root.fen !== chess.fen()) {
      chess.load(this.root.fen)
    }

    this.headers.forEach((value, key) => {
      chess.addHeader(key, value)
    })

    const buildLine = (node: GameNode): string => {
      let line = ''

      if (node.san) {
        chess.move(node.san)
        line += ' ' + node.san
      }

      if (includeVariations) {
        const variations = node.getVariations()
        if (variations.length > 0) {
          variations.forEach((variation) => {
            const boardState = chess.fen()
            line += ' ('
            line += buildLine(variation)
            line += ')'
            chess.load(boardState)
          })
        }
      }

      if (node.mainChild) {
        line += buildLine(node.mainChild)
      }

      return line
    }

    const result = this.headers.get('Result')
    if (result) {
      chess.addHeader('Result', result)
    }

    return chess
      .pgn()
      .replace(/\s{2,}/g, ' ')
      .trim()
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
  private _moveNumber: number

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
    this._turn = this.parseTurn(fen)
    this._check = false
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

  addChild(fen: string, move: string, san: string, mainline = false): GameNode {
    const child = new GameNode(fen, move, san, this, mainline)
    this._children.push(child)
    if (mainline) {
      this._mainChild = child
    }
    return child
  }

  addMaiaAnalysis(maiaEval: { [rating: string]: MaiaEvaluation }): void {
    this._analysis.maia = maiaEval
  }

  addStockfishAnalysis(stockfishEval: StockfishEvaluation): void {
    this._analysis.stockfish = stockfishEval
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
