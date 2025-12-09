/**
 * Progressive Calculation Orchestrator for Expected Winrate Analysis
 *
 * Orchestrates the multi-phase Expected Winrate calculation process, coordinating
 * engine evaluations and tree generation while providing progress updates.
 * Integrates with existing analysis infrastructure and follows established patterns.
 */

import { Chess } from 'chess.ts'
import {
  ExpectedWinRateParams,
  ExpectedWinRateResult,
  ExpectedWinrateProgress,
  ExpectedWinRateNode,
  TreeGenerationRequest,
} from 'src/types/expectedWinrate'
import {
  coordinateStockfishBatch,
  coordinateMaiaBatch,
  generateLegalMoves,
  filterMovesByWinrateLoss,
  extractMoveProbabilities,
  convertCpToWinrate,
  isValidPosition,
  createPositionRequest,
} from './engineCoordination'

/**
 * Main orchestrator class for Expected Winrate calculation
 */
export class ExpectedWinrateCalculationOrchestrator {
  private stockfish: any
  private maia: any
  private abortSignal: AbortSignal
  private onProgress: (progress: ExpectedWinrateProgress) => void

  constructor(
    stockfish: any,
    maia: any,
    abortSignal: AbortSignal,
    onProgress: (progress: ExpectedWinrateProgress) => void,
  ) {
    this.stockfish = stockfish
    this.maia = maia
    this.abortSignal = abortSignal
    this.onProgress = onProgress
  }

  /**
   * Execute full Expected Winrate calculation following the algorithm steps
   *
   * The Expected Winrate algorithm proceeds in four phases:
   * 1. Filter candidate moves using Stockfish winrate loss threshold
   * 2. Generate probability trees using Maia move predictions
   * 3. Evaluate leaf positions with Stockfish
   * 4. Calculate weighted expected winrate for each candidate move
   *
   * @param rootFen - Starting position in FEN notation
   * @param params - Configuration parameters for the calculation
   * @returns Array of results sorted by expected winrate (best first)
   */
  async calculateExpectedWinrate(
    rootFen: string,
    params: ExpectedWinRateParams,
  ): Promise<ExpectedWinRateResult[]> {
    console.log(
      `[Expected Winrate Orchestrator] Starting calculation for position`,
    )
    this.checkAbort()

    // Phase 1: Initial Move Filtering
    // Also evaluate the root position to get base winrate for uncovered probability mass
    this.updateProgress({
      currentPhase: 'filtering',
      phaseProgress: 0,
      overallProgress: 0.05,
      currentMove: 'Evaluating base position...',
    })

    // First, evaluate the root position itself to get base winrate
    // This is used for any probability mass not covered by explored trees
    const basePositionWinrate = await this.evaluateRootPosition(rootFen, params)
    console.log(
      `[Expected Winrate Orchestrator] Base position winrate: ${(basePositionWinrate * 100).toFixed(1)}%`,
    )

    this.updateProgress({
      currentPhase: 'filtering',
      phaseProgress: 0.1,
      overallProgress: 0.1,
      currentMove: 'Filtering candidate moves...',
    })

    const candidateMoves = await this.filterInitialMoves(rootFen, params)
    console.log(
      `[Expected Winrate Orchestrator] Phase 1: Found ${candidateMoves.length} candidate moves:`,
      candidateMoves.map((m) => m.san),
    )

    if (candidateMoves.length === 0) {
      throw new Error('No candidate moves found after filtering')
    }

    this.updateProgress({
      currentPhase: 'filtering',
      phaseProgress: 1,
      overallProgress: 0.2,
      totalMoves: candidateMoves.length,
    })

    // Phase 2: Tree Generation for each candidate move
    this.updateProgress({
      currentPhase: 'tree_generation',
      phaseProgress: 0,
      overallProgress: 0.2,
    })

    const trees = await this.generateProbabilityTrees(
      candidateMoves,
      rootFen,
      params,
    )
    console.log(
      `[Expected Winrate Orchestrator] Phase 2: Generated ${trees.length} trees with total nodes:`,
      trees.map((t) => ({ move: t.san, nodes: this.countNodes(t) })),
    )

    this.updateProgress({
      currentPhase: 'tree_generation',
      phaseProgress: 1,
      overallProgress: 0.5,
    })

    // Phase 3: Stockfish Evaluation of leaf positions
    this.updateProgress({
      currentPhase: 'evaluation',
      phaseProgress: 0,
      overallProgress: 0.5,
    })

    const evaluatedTrees = await this.evaluateTreePositions(trees, params)

    this.updateProgress({
      currentPhase: 'evaluation',
      phaseProgress: 1,
      overallProgress: 0.8,
    })

    // Phase 4: Expected Winrate Calculation
    // Pass the base position winrate for handling uncovered probability mass
    this.updateProgress({
      currentPhase: 'calculation',
      phaseProgress: 0,
      overallProgress: 0.8,
    })

    const results = await this.calculateFinalResults(
      evaluatedTrees,
      rootFen,
      basePositionWinrate,
    )

    this.updateProgress({
      currentPhase: 'complete',
      phaseProgress: 1,
      overallProgress: 1,
      isCalculating: false,
    })

    return results
  }

  /**
   * Evaluate the root position with Stockfish to get base winrate
   *
   * This value is crucial for the Expected Winrate calculation:
   * Any probability mass not covered by our explored trees (due to
   * pruning or probability thresholds) is assumed to maintain this
   * base evaluation. This prevents artificially skewing results.
   *
   * @param rootFen - The starting position FEN
   * @param params - Parameters including Stockfish depth
   * @returns Winrate from the side to move's perspective (0.0 to 1.0)
   */
  private async evaluateRootPosition(
    rootFen: string,
    params: ExpectedWinRateParams,
  ): Promise<number> {
    this.checkAbort()

    // Create a single position request for the root position
    const positionRequest = createPositionRequest(
      rootFen,
      'root_position',
      params.stockfishDepth,
    )

    // Evaluate with Stockfish
    const stockfishResults = await coordinateStockfishBatch(
      this.stockfish,
      {
        positions: [positionRequest],
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onProgress: () => {},
      },
      this.abortSignal,
    )

    const evaluation = stockfishResults.get('root_position')
    if (!evaluation) {
      // If evaluation fails, assume equal position (50% winrate)
      console.warn(
        '[Expected Winrate Orchestrator] Failed to evaluate root position, using 0.5',
      )
      return 0.5
    }

    // Convert centipawn score to winrate, accounting for side to move
    const chess = new Chess(rootFen)
    return convertCpToWinrate(evaluation.model_optimal_cp, chess.turn() === 'b')
  }

  /**
   * Phase 1: Filter initial moves by winrate loss threshold
   */
  private async filterInitialMoves(
    rootFen: string,
    params: ExpectedWinRateParams,
  ): Promise<Array<{ uci: string; san: string }>> {
    this.checkAbort()

    const legalMoves = generateLegalMoves(rootFen)
    if (legalMoves.length === 0) {
      return []
    }

    // Generate positions after each legal move
    const chess = new Chess(rootFen)
    const moveEvaluations = []

    for (const move of legalMoves) {
      const tempChess = new Chess(rootFen)
      try {
        tempChess.move(move.uci)
        moveEvaluations.push({
          ...move,
          fen: tempChess.fen(),
        })
      } catch (error) {
        console.warn(`Invalid move ${move.uci} for position ${rootFen}`)
      }
    }

    // Batch evaluate all moves with Stockfish
    const positionRequests = moveEvaluations.map((move, index) =>
      createPositionRequest(move.fen, `move_${index}`, params.stockfishDepth),
    )

    const stockfishResults = await coordinateStockfishBatch(
      this.stockfish,
      {
        positions: positionRequests,
        onProgress: (completed, total) => {
          this.updateProgress({
            phaseProgress: completed / total,
          })
        },
      },
      this.abortSignal,
    )

    // Apply winrate loss filtering
    const movesWithEvaluations = moveEvaluations.map((move, index) => ({
      uci: move.uci,
      san: move.san,
      evaluation: stockfishResults.get(`move_${index}`),
    }))

    const filteredMoves = filterMovesByWinrateLoss(
      movesWithEvaluations,
      params.winrateLossThreshold,
    )

    return filteredMoves.map((move) => ({ uci: move.uci, san: move.san }))
  }

  /**
   * Phase 2: Generate probability trees for candidate moves
   */
  private async generateProbabilityTrees(
    candidateMoves: Array<{ uci: string; san: string }>,
    rootFen: string,
    params: ExpectedWinRateParams,
  ): Promise<ExpectedWinRateNode[]> {
    this.checkAbort()

    const trees: ExpectedWinRateNode[] = []

    for (let i = 0; i < candidateMoves.length; i++) {
      const move = candidateMoves[i]

      this.updateProgress({
        currentMove: move.san,
        movesProcessed: i,
        totalMoves: candidateMoves.length,
        phaseProgress: i / candidateMoves.length,
      })

      const tree = await this.generateSingleTree(move, rootFen, params)
      trees.push(tree)

      this.checkAbort()
    }

    return trees
  }

  /**
   * Generate probability tree for a single candidate move
   */
  private async generateSingleTree(
    candidateMove: { uci: string; san: string },
    rootFen: string,
    params: ExpectedWinRateParams,
  ): Promise<ExpectedWinRateNode> {
    // Create root node
    const chess = new Chess(rootFen)
    chess.move(candidateMove.uci)

    const rootNode: ExpectedWinRateNode = {
      id: `root_${candidateMove.uci}`,
      move: candidateMove.uci,
      san: candidateMove.san,
      fen: chess.fen(),
      probability: 1.0, // Root move has 100% probability
      cumulativeProbability: 1.0,
      parent: null,
      children: [],
      depth: 0,
      isLeafNode: false,
      isPruned: false,
    }

    // Recursively build tree
    await this.buildTreeRecursive(rootNode, params, 1)

    return rootNode
  }

  /**
   * Recursively build probability tree using Maia
   */
  private async buildTreeRecursive(
    parentNode: ExpectedWinRateNode,
    params: ExpectedWinRateParams,
    currentDepth: number,
  ): Promise<void> {
    this.checkAbort()

    if (currentDepth >= params.maxDepth) {
      parentNode.isLeafNode = true
      return
    }

    // Get Maia evaluation for this position
    const maiaBatch = await coordinateMaiaBatch(
      this.maia,
      {
        positions: [{ fen: parentNode.fen, id: parentNode.id }],
        maiaLevel: params.maiaLevel,
      },
      this.abortSignal,
    )

    const maiaEval = maiaBatch.get(parentNode.id)
    if (!maiaEval) {
      parentNode.isLeafNode = true
      return
    }

    // Generate legal moves and extract probabilities
    const legalMoves = generateLegalMoves(parentNode.fen)
    const moveProbabilities = extractMoveProbabilities(maiaEval, legalMoves)

    // Filter moves by probability threshold
    const viableMoves = Array.from(moveProbabilities.entries())
      .filter(([_, probability]) => probability >= params.probabilityThreshold)
      .sort(([_, a], [__, b]) => b - a) // Sort by probability descending

    if (viableMoves.length === 0) {
      parentNode.isLeafNode = true
      return
    }

    // Create child nodes
    const chess = new Chess(parentNode.fen)

    for (const [moveUci, probability] of viableMoves) {
      const moveInfo = legalMoves.find((m) => m.uci === moveUci)
      if (!moveInfo) continue

      const tempChess = new Chess(parentNode.fen)
      try {
        tempChess.move(moveUci)

        const childNode: ExpectedWinRateNode = {
          id: `${parentNode.id}_${moveUci}`,
          move: moveUci,
          san: moveInfo.san,
          fen: tempChess.fen(),
          probability,
          cumulativeProbability: parentNode.cumulativeProbability * probability,
          parent: parentNode.id,
          children: [],
          depth: currentDepth,
          isLeafNode: false,
          isPruned: false,
        }

        parentNode.children.push(childNode)

        // Recursively build child tree (with pruning consideration)
        if (this.shouldContinueTreeBuilding(childNode, params)) {
          await this.buildTreeRecursive(childNode, params, currentDepth + 1)
        } else {
          childNode.isLeafNode = true
          childNode.isPruned = true
        }
      } catch (error) {
        console.warn(`Failed to make move ${moveUci} from ${parentNode.fen}`)
      }
    }

    if (parentNode.children.length === 0) {
      parentNode.isLeafNode = true
    }
  }

  /**
   * Player-aware pruning logic
   */
  private shouldContinueTreeBuilding(
    node: ExpectedWinRateNode,
    params: ExpectedWinRateParams,
  ): boolean {
    if (!params.playerAwarePruning) {
      return true
    }

    // Prune if cumulative probability is too low
    if (node.cumulativeProbability < params.pruningThreshold) {
      return false
    }

    return true
  }

  /**
   * Phase 3: Evaluate all leaf positions with Stockfish
   */
  private async evaluateTreePositions(
    trees: ExpectedWinRateNode[],
    params: ExpectedWinRateParams,
  ): Promise<ExpectedWinRateNode[]> {
    this.checkAbort()

    // Collect all leaf positions across all trees
    const leafPositions: Array<{ node: ExpectedWinRateNode; id: string }> = []

    trees.forEach((tree) => {
      this.collectLeafNodes(tree, leafPositions)
    })

    if (leafPositions.length === 0) {
      return trees
    }

    // Batch evaluate with Stockfish
    const positionRequests = leafPositions.map(({ node, id }) =>
      createPositionRequest(node.fen, id, params.stockfishDepth),
    )

    const stockfishResults = await coordinateStockfishBatch(
      this.stockfish,
      {
        positions: positionRequests,
        onProgress: (completed, total) => {
          this.updateProgress({
            phaseProgress: completed / total,
            nodesEvaluated: completed,
          })
        },
      },
      this.abortSignal,
    )

    // Apply evaluations to leaf nodes
    leafPositions.forEach(({ node, id }) => {
      const evaluation = stockfishResults.get(id)
      if (evaluation) {
        const chess = new Chess(node.fen)
        node.stockfishWinrate = convertCpToWinrate(
          evaluation.model_optimal_cp,
          chess.turn() === 'b',
        )
      }
    })

    return trees
  }

  /**
   * Collect all leaf nodes from a tree
   */
  private collectLeafNodes(
    node: ExpectedWinRateNode,
    leafPositions: Array<{ node: ExpectedWinRateNode; id: string }>,
  ): void {
    if (node.isLeafNode) {
      leafPositions.push({ node, id: `leaf_${node.id}` })
      return
    }

    node.children.forEach((child) => {
      this.collectLeafNodes(child, leafPositions)
    })
  }

  /**
   * Phase 4: Calculate final Expected Winrate results
   *
   * For each candidate move's probability tree, compute the Expected Winrate
   * by weighting leaf positions by their probability of being reached.
   * The basePositionWinrate is used for any probability mass not covered
   * by the explored tree (this handles pruned branches correctly).
   *
   * @param trees - Array of probability trees, one per candidate move
   * @param rootFen - The starting position FEN (unused, kept for potential future use)
   * @param basePositionWinrate - Stockfish winrate at the root position
   * @returns Sorted array of Expected Winrate results (highest first)
   */
  private async calculateFinalResults(
    trees: ExpectedWinRateNode[],
    rootFen: string,
    basePositionWinrate: number,
  ): Promise<ExpectedWinRateResult[]> {
    this.checkAbort()

    const results: ExpectedWinRateResult[] = []

    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i]

      this.updateProgress({
        currentMove: tree.san,
        movesProcessed: i,
        totalMoves: trees.length,
        phaseProgress: i / trees.length,
      })

      // Pass base position winrate to handle uncovered probability mass correctly
      const expectedWinrate = this.calculateTreeExpectedWinrate(
        tree,
        basePositionWinrate,
      )
      const confidence = this.calculateConfidence(tree)
      const nodeCount = this.countNodes(tree)
      const leafNodeCount = this.countLeafNodes(tree)

      results.push({
        move: tree.move,
        san: tree.san,
        expectedWinrate,
        confidence,
        tree,
        nodeCount,
        leafNodeCount,
        calculationTime: 0, // Will be set by caller
      })
    }

    // Sort by expected winrate (descending) - best moves first
    results.sort((a, b) => b.expectedWinrate - a.expectedWinrate)

    return results
  }

  /**
   * Calculate expected winrate for a tree using weighted average
   *
   * The Expected Winrate formula weights each leaf position's winrate by
   * the probability of reaching that position (cumulative probability).
   * Crucially, any probability mass not covered by the tree (moves we didn't
   * explore) is assumed to result in the base position's winrate - this
   * prevents artificially inflating or deflating results from incomplete trees.
   *
   * @param tree - The probability tree for a candidate move
   * @param basePositionWinrate - Winrate at the starting position (fallback for uncovered mass)
   * @returns The expected winrate as a weighted sum
   */
  private calculateTreeExpectedWinrate(
    tree: ExpectedWinRateNode,
    basePositionWinrate: number,
  ): number {
    // Sum of (leaf_winrate * probability_of_reaching_leaf) for all explored leaves
    let weightedSum = 0
    // Total probability mass covered by our tree exploration
    let totalWeight = 0

    // Traverse all leaf nodes and accumulate weighted winrates
    this.traverseLeafNodes(tree, (leafNode) => {
      if (leafNode.stockfishWinrate !== undefined) {
        const weight = leafNode.cumulativeProbability
        weightedSum += leafNode.stockfishWinrate * weight
        totalWeight += weight
      }
    })

    // Calculate the probability mass we didn't explore (due to pruning/thresholds)
    // This uncovered mass is treated as maintaining the base position's evaluation
    const uncoveredMass = 1.0 - totalWeight
    return weightedSum + uncoveredMass * basePositionWinrate
  }

  /**
   * Calculate confidence based on tree coverage
   */
  private calculateConfidence(tree: ExpectedWinRateNode): number {
    let totalProbability = 0

    this.traverseLeafNodes(tree, (leafNode) => {
      totalProbability += leafNode.cumulativeProbability
    })

    return Math.min(totalProbability, 1.0)
  }

  /**
   * Count total nodes in tree
   */
  private countNodes(node: ExpectedWinRateNode): number {
    let count = 1
    node.children.forEach((child) => {
      count += this.countNodes(child)
    })
    return count
  }

  /**
   * Count leaf nodes in tree
   */
  private countLeafNodes(node: ExpectedWinRateNode): number {
    if (node.isLeafNode) {
      return 1
    }

    let count = 0
    node.children.forEach((child) => {
      count += this.countLeafNodes(child)
    })
    return count
  }

  /**
   * Traverse all leaf nodes in tree
   */
  private traverseLeafNodes(
    node: ExpectedWinRateNode,
    callback: (leafNode: ExpectedWinRateNode) => void,
  ): void {
    if (node.isLeafNode) {
      callback(node)
      return
    }

    node.children.forEach((child) => {
      this.traverseLeafNodes(child, callback)
    })
  }

  /**
   * Update progress state
   */
  private updateProgress(update: Partial<ExpectedWinrateProgress>): void {
    const currentTime = Date.now()
    this.onProgress({
      isCalculating: true,
      currentPhase: 'filtering',
      phaseProgress: 0,
      overallProgress: 0,
      movesProcessed: 0,
      totalMoves: 0,
      warnings: [],
      ...update,
    })
  }

  /**
   * Check if calculation should be aborted
   */
  private checkAbort(): void {
    if (this.abortSignal.aborted) {
      throw new Error('Calculation aborted')
    }
  }
}
