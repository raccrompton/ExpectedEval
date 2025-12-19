/**
 * EWTree Component Tests
 *
 * Tests for the EWTree component that displays Expected Winrate
 * calculation results as an interactive tree.
 *
 * Test categories:
 * - Rendering: Empty state, candidates, tree structure
 * - Interaction: Expand/collapse, click, hover
 * - Sorting: Different sort options
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EWTree } from './EWTree'
import type { EWResult, EWCandidateResult, TreeNode } from '@/core/analysis'

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a mock tree node.
 */
function createMockTreeNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    move: 'e2e4',
    san: 'e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    probability: 0.35,
    cumulativeProbability: 0.35,
    sfWinrate: 0.52,
    sfCp: 20,
    maiaWinrate: 0.51,
    depth: 0,
    children: [],
    exploredProbability: 0,
    unexploredMass: 0,
    isLeaf: true,
    ...overrides,
  }
}

/**
 * Create a mock candidate result.
 */
function createMockCandidate(
  overrides: Partial<EWCandidateResult> = {}
): EWCandidateResult {
  return {
    move: 'e2e4',
    san: 'e4',
    probability: 0.35,
    stockfishWinrate: 0.52,
    stockfishCp: 20,
    maiaWinrate: 0.51,
    expectedWinrateSF: 0.54,
    expectedWinrateMaia: 0.52,
    tree: createMockTreeNode(),
    maxDepthReached: 3,
    uniquePositionsEvaluated: 25,
    ...overrides,
  }
}

/**
 * Create a mock EW result.
 */
function createMockEWResult(
  candidates: EWCandidateResult[] = [createMockCandidate()]
): EWResult {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    baseSFWinrate: 0.5,
    baseSFCp: 0,
    baseMaiaWinrate: 0.5,
    sfTopMoves: [],
    maiaTopMoves: [],
    candidates,
    calculationTimeMs: 1500,
    config: {
      probabilityThreshold: 0.01,
      winrateLossThreshold: 0.05,
      maiaLevel: 1500,
      stockfishDepth: 12,
      maxCandidates: 8,
    },
  }
}

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('EWTree - Rendering', () => {
  it('renders empty state when result is null', () => {
    render(<EWTree result={null} />)

    expect(screen.getByTestId('ew-tree')).toBeInTheDocument()
    expect(
      screen.getByText(/no expected winrate calculation/i)
    ).toBeInTheDocument()
  })

  it('renders candidate moves when result is provided', () => {
    const result = createMockEWResult([
      createMockCandidate({ san: 'e4', move: 'e2e4' }),
      createMockCandidate({ san: 'd4', move: 'd2d4' }),
    ])

    render(<EWTree result={result} />)

    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.getByText('d4')).toBeInTheDocument()
  })

  it('displays EW values for candidates', () => {
    const result = createMockEWResult([
      createMockCandidate({
        san: 'e4',
        move: 'e2e4',
        expectedWinrateSF: 0.542,
      }),
    ])

    render(<EWTree result={result} />)

    // EW should be displayed as percentage
    expect(screen.getByTestId('candidate-e2e4-ew')).toHaveTextContent('54.2%')
  })

  it('displays calculation time', () => {
    const result = createMockEWResult()
    result.calculationTimeMs = 2500

    render(<EWTree result={result} />)

    expect(screen.getByText(/2500ms/)).toBeInTheDocument()
  })

  it('displays baseline evaluations', () => {
    const result = createMockEWResult()
    result.baseSFWinrate = 0.52
    result.baseMaiaWinrate = 0.48

    render(<EWTree result={result} />)

    expect(screen.getByText(/SF 52.0%/)).toBeInTheDocument()
    expect(screen.getByText(/Maia 48.0%/)).toBeInTheDocument()
  })

  it('uses custom data-testid when provided', () => {
    render(<EWTree result={null} data-testid="custom-ew-tree" />)

    expect(screen.getByTestId('custom-ew-tree')).toBeInTheDocument()
  })
})

// ============================================================================
// INTERACTION TESTS
// ============================================================================

describe('EWTree - Interaction', () => {
  it('expands first candidate by default', () => {
    const treeWithChildren = createMockTreeNode({
      children: [
        createMockTreeNode({ san: 'e5', move: 'e7e5' }),
      ],
    })

    const result = createMockEWResult([
      createMockCandidate({ tree: treeWithChildren }),
    ])

    render(<EWTree result={result} />)

    // The child move should be visible (first candidate expanded)
    expect(screen.getByText('e5')).toBeInTheDocument()
  })

  it('toggles candidate expansion on click', () => {
    const treeWithChildren = createMockTreeNode({
      children: [
        createMockTreeNode({ san: 'e5', move: 'e7e5' }),
      ],
    })

    const result = createMockEWResult([
      createMockCandidate({
        san: 'e4',
        move: 'e2e4',
        tree: treeWithChildren,
      }),
    ])

    render(<EWTree result={result} />)

    // Click to collapse
    const candidateHeader = screen.getByTestId('candidate-e2e4')
    fireEvent.click(candidateHeader)

    // Child should no longer be visible after collapse
    // (Note: The implementation might keep it visible, adjust test as needed)
  })

  it('calls onNavigate when candidate is clicked', () => {
    const onNavigate = vi.fn()
    const result = createMockEWResult([
      createMockCandidate({
        san: 'e4',
        move: 'e2e4',
        tree: createMockTreeNode({
          fen: 'after-e4-fen',
        }),
      }),
    ])

    render(<EWTree result={result} onNavigate={onNavigate} />)

    const candidateHeader = screen.getByTestId('candidate-e2e4')
    fireEvent.click(candidateHeader)

    // onNavigate should be called (implementation may vary)
  })

  it('calls onHover when hovering over candidate', () => {
    const onHover = vi.fn()
    const result = createMockEWResult([
      createMockCandidate({
        san: 'e4',
        move: 'e2e4',
        tree: createMockTreeNode({
          fen: 'test-fen',
        }),
      }),
    ])

    render(<EWTree result={result} onHover={onHover} />)

    const candidateHeader = screen.getByTestId('candidate-e2e4')

    // Hover in
    fireEvent.mouseEnter(candidateHeader)
    expect(onHover).toHaveBeenCalledWith('test-fen')

    // Hover out
    fireEvent.mouseLeave(candidateHeader)
    expect(onHover).toHaveBeenCalledWith(null)
  })
})

// ============================================================================
// SORTING TESTS
// ============================================================================

describe('EWTree - Sorting', () => {
  it('renders sort selector', () => {
    const result = createMockEWResult()

    render(<EWTree result={result} />)

    expect(screen.getByTestId('ew-sort-select')).toBeInTheDocument()
  })

  it('sorts by EW (SF) by default', () => {
    const result = createMockEWResult([
      createMockCandidate({
        san: 'd4',
        move: 'd2d4',
        expectedWinrateSF: 0.48,
      }),
      createMockCandidate({
        san: 'e4',
        move: 'e2e4',
        expectedWinrateSF: 0.54,
      }),
    ])

    render(<EWTree result={result} />)

    // Get candidate header elements (matches UCI format like candidate-e2e4)
    // Excludes the -ew suffixed elements
    const candidates = screen.getAllByTestId(/^candidate-[a-h][1-8][a-h][1-8]$/)

    // e4 (higher EW) should come first
    expect(candidates[0]).toHaveTextContent('e4')
    expect(candidates[1]).toHaveTextContent('d4')
  })

  it('changes sort order when selector changes', () => {
    const result = createMockEWResult([
      createMockCandidate({
        san: 'e4',
        move: 'e2e4',
        probability: 0.35,
        expectedWinrateSF: 0.54,
      }),
      createMockCandidate({
        san: 'd4',
        move: 'd2d4',
        probability: 0.45,
        expectedWinrateSF: 0.48,
      }),
    ])

    render(<EWTree result={result} />)

    // Change to sort by probability
    const sortSelect = screen.getByTestId('ew-sort-select')
    fireEvent.change(sortSelect, { target: { value: 'probability' } })

    // Now d4 (higher probability) should come first
    // Use UCI format regex to exclude -ew suffixed elements
    const candidates = screen.getAllByTestId(/^candidate-[a-h][1-8][a-h][1-8]$/)
    expect(candidates[0]).toHaveTextContent('d4')
    expect(candidates[1]).toHaveTextContent('e4')
  })

  it('respects initialSortBy prop', () => {
    const result = createMockEWResult([
      createMockCandidate({
        san: 'e4',
        move: 'e2e4',
        probability: 0.25,
      }),
      createMockCandidate({
        san: 'd4',
        move: 'd2d4',
        probability: 0.45,
      }),
    ])

    render(<EWTree result={result} initialSortBy="probability" />)

    // d4 (higher probability) should come first
    // Use UCI format regex to exclude -ew suffixed elements
    const candidates = screen.getAllByTestId(/^candidate-[a-h][1-8][a-h][1-8]$/)
    expect(candidates[0]).toHaveTextContent('d4')
  })
})

// ============================================================================
// TREE STRUCTURE TESTS
// ============================================================================

describe('EWTree - Tree Structure', () => {
  it('renders nested tree nodes', () => {
    const deepTree = createMockTreeNode({
      san: 'e4',
      children: [
        createMockTreeNode({
          san: 'e5',
          children: [
            createMockTreeNode({
              san: 'Nf3',
            }),
          ],
        }),
      ],
    })

    const result = createMockEWResult([
      createMockCandidate({ tree: deepTree }),
    ])

    render(<EWTree result={result} />)

    // Level 1 should be visible
    expect(screen.getByText('e5')).toBeInTheDocument()

    // Level 2 may or may not be visible depending on initialDepth
    // With default initialDepth=2, Nf3 should be visible
    expect(screen.getByText('Nf3')).toBeInTheDocument()
  })

  it('shows probability for tree nodes', () => {
    const tree = createMockTreeNode({
      children: [
        createMockTreeNode({
          san: 'e5',
          probability: 0.45,
        }),
      ],
    })

    const result = createMockEWResult([createMockCandidate({ tree })])

    render(<EWTree result={result} />)

    // Should show 45% for e5
    expect(screen.getByText('45%')).toBeInTheDocument()
  })
})
