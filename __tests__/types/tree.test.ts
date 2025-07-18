import { GameNode } from 'src/types/base/tree'
import { StockfishEvaluation, MaiaEvaluation } from 'src/types'

describe('GameNode Move Classification', () => {
  describe('Excellent Move Criteria', () => {
    it('should classify move as excellent when Maia probability < 10% and winrate is 10% higher than weighted average', () => {
      const parentNode = new GameNode(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )

      // Mock Stockfish evaluation with winrate vectors
      const stockfishEval: StockfishEvaluation = {
        sent: true,
        depth: 15,
        model_move: 'e2e4',
        model_optimal_cp: 50,
        cp_vec: { e2e4: 50, d2d4: 40, g1f3: 30 },
        cp_relative_vec: { e2e4: 0, d2d4: -10, g1f3: -20 },
        winrate_vec: { e2e4: 0.6, d2d4: 0.58, g1f3: 0.4 },
        winrate_loss_vec: { e2e4: 0, d2d4: -0.02, g1f3: -0.2 },
      }

      // Mock Maia evaluation with policy probabilities
      const maiaEval: { [rating: string]: MaiaEvaluation } = {
        maia_kdd_1500: {
          policy: {
            e2e4: 0.5, // 50% probability - most likely move
            d2d4: 0.3, // 30% probability
            g1f3: 0.05, // 5% probability - less than 10% threshold
          },
          value: 0.6,
        },
      }

      // Add analysis to parent node
      parentNode.addStockfishAnalysis(stockfishEval, 'maia_kdd_1500')
      parentNode.addMaiaAnalysis(maiaEval, 'maia_kdd_1500')

      // Calculate weighted average manually for verification:
      // weighted_avg = (0.5 * 0.6 + 0.3 * 0.58 + 0.05 * 0.4) / (0.5 + 0.3 + 0.05)
      // weighted_avg = (0.3 + 0.174 + 0.02) / 0.85 = 0.494 / 0.85 ≈ 0.581
      // g1f3 winrate (0.4) is NOT 10% higher than weighted average (0.581)
      // So g1f3 should NOT be excellent despite low Maia probability

      // Test move with low Maia probability but not high enough winrate
      const classificationG1f3 = GameNode.classifyMove(
        parentNode,
        'g1f3',
        'maia_kdd_1500',
      )
      expect(classificationG1f3.excellent).toBe(false)

      // Now test with a different scenario where a move has both low probability and high winrate
      const stockfishEval2: StockfishEvaluation = {
        sent: true,
        depth: 15,
        model_move: 'e2e4',
        model_optimal_cp: 50,
        cp_vec: { e2e4: 50, d2d4: 40, b1c3: 45 },
        cp_relative_vec: { e2e4: 0, d2d4: -10, b1c3: -5 },
        winrate_vec: { e2e4: 0.6, d2d4: 0.45, b1c3: 0.7 },
        winrate_loss_vec: { e2e4: 0, d2d4: -0.15, b1c3: 0.1 },
      }

      const maiaEval2: { [rating: string]: MaiaEvaluation } = {
        maia_kdd_1500: {
          policy: {
            e2e4: 0.6, // 60% probability
            d2d4: 0.35, // 35% probability
            b1c3: 0.05, // 5% probability - less than 10% threshold
          },
          value: 0.6,
        },
      }

      const parentNode2 = new GameNode(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )
      parentNode2.addStockfishAnalysis(stockfishEval2, 'maia_kdd_1500')
      parentNode2.addMaiaAnalysis(maiaEval2, 'maia_kdd_1500')

      // Calculate weighted average: (0.6 * 0.6 + 0.35 * 0.45 + 0.05 * 0.7) / 1.0
      // = (0.36 + 0.1575 + 0.035) / 1.0 = 0.5525
      // b1c3 winrate (0.7) is about 14.75% higher than weighted average (0.5525)
      // So b1c3 should be excellent (low Maia probability AND high relative winrate)

      const classificationB1c3 = GameNode.classifyMove(
        parentNode2,
        'b1c3',
        'maia_kdd_1500',
      )
      expect(classificationB1c3.excellent).toBe(true)
    })

    it('should not classify move as excellent when Maia probability >= 10%', () => {
      const parentNode = new GameNode(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )

      const stockfishEval: StockfishEvaluation = {
        sent: true,
        depth: 15,
        model_move: 'e2e4',
        model_optimal_cp: 50,
        cp_vec: { e2e4: 50, d2d4: 40 },
        cp_relative_vec: { e2e4: 0, d2d4: -10 },
        winrate_vec: { e2e4: 0.6, d2d4: 0.7 },
        winrate_loss_vec: { e2e4: 0, d2d4: 0.1 },
      }

      const maiaEval: { [rating: string]: MaiaEvaluation } = {
        maia_kdd_1500: {
          policy: {
            e2e4: 0.8, // 80% probability - above 10% threshold
            d2d4: 0.2, // 20% probability - above 10% threshold
          },
          value: 0.6,
        },
      }

      parentNode.addStockfishAnalysis(stockfishEval, 'maia_kdd_1500')
      parentNode.addMaiaAnalysis(maiaEval, 'maia_kdd_1500')

      // Even though d2d4 has higher winrate than weighted average,
      // it should not be excellent because Maia probability > 10%
      const classification = GameNode.classifyMove(
        parentNode,
        'd2d4',
        'maia_kdd_1500',
      )
      expect(classification.excellent).toBe(false)
    })

    it('should not classify move as excellent when winrate advantage < 10%', () => {
      const parentNode = new GameNode(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )

      const stockfishEval: StockfishEvaluation = {
        sent: true,
        depth: 15,
        model_move: 'e2e4',
        model_optimal_cp: 50,
        cp_vec: { e2e4: 50, d2d4: 40, a2a3: 20 },
        cp_relative_vec: { e2e4: 0, d2d4: -10, a2a3: -30 },
        winrate_vec: { e2e4: 0.6, d2d4: 0.55, a2a3: 0.62 },
        winrate_loss_vec: { e2e4: 0, d2d4: -0.05, a2a3: 0.02 },
      }

      const maiaEval: { [rating: string]: MaiaEvaluation } = {
        maia_kdd_1500: {
          policy: {
            e2e4: 0.7, // 70% probability
            d2d4: 0.25, // 25% probability
            a2a3: 0.05, // 5% probability - below 10% threshold
          },
          value: 0.6,
        },
      }

      parentNode.addStockfishAnalysis(stockfishEval, 'maia_kdd_1500')
      parentNode.addMaiaAnalysis(maiaEval, 'maia_kdd_1500')

      // Weighted average: (0.7 * 0.6 + 0.25 * 0.55 + 0.05 * 0.62) / 1.0
      // = (0.42 + 0.1375 + 0.031) / 1.0 = 0.5885
      // a2a3 winrate (0.62) is only about 3.15% higher than weighted average
      // So a2a3 should NOT be excellent (advantage < 10%)

      const classification = GameNode.classifyMove(
        parentNode,
        'a2a3',
        'maia_kdd_1500',
      )
      expect(classification.excellent).toBe(false)
    })
  })
})
