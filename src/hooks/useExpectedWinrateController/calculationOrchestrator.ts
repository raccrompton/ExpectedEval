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
    this.updateProgress({
      currentPhase: 'filtering',
      phaseProgress: 0,
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
    this.updateProgress({
      currentPhase: 'calculation',
      phaseProgress: 0,
      overallProgress: 0.8,
    })

    const results = await this.calculateFinalResults(evaluatedTrees, rootFen)

    this.updateProgress({
      currentPhase: 'complete',
      phaseProgress: 1,
      overallProgress: 1,
      isCalculating: false,
    })

    return results
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
   */
  private async calculateFinalResults(
    trees: ExpectedWinRateNode[],
    rootFen: string,
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

      const expectedWinrate = this.calculateTreeExpectedWinrate(tree)
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

    // Sort by expected winrate (descending)
    results.sort((a, b) => b.expectedWinrate - a.expectedWinrate)

    return results
  }

  /**
   * Calculate expected winrate for a tree using weighted average
   */
  private calculateTreeExpectedWinrate(tree: ExpectedWinRateNode): number {
    let weightedSum = 0
    let totalWeight = 0

    this.traverseLeafNodes(tree, (leafNode) => {
      if (leafNode.stockfishWinrate !== undefined) {
        const weight = leafNode.cumulativeProbability
        weightedSum += leafNode.stockfishWinrate * weight
        totalWeight += weight
      }
    })

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5
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
