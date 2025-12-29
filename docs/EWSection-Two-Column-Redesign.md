# EWSection Two-Column Redesign Plan

## Summary
Redesign the EWSection component to display candidates and trees in a two-column layout with interactive branch expand/collapse and enhanced tooltips on every tree node.

## Target File
- [src/components/Analysis/EWSection.tsx](../src/components/Analysis/EWSection.tsx) - Complete refactor of `EWTree` component

## New Layout

```
┌─────────────────┬──────────────────────────────────────────────────┐
│ CANDIDATE       │ TREE                                             │
├─────────────────┼──────────────────────────────────────────────────┤
│ e4   EW: 52%  ◄ │ e4 + Nf6 − Nc3 + Ng8 Ng1 → 52%                   │
│ d4   EW: 51%    │      └─ e5 Nc3 → 48%                             │
│ Nf3  EW: 50%    │           └─ Bc4 d6 Nf3 → 51%                    │
│ c4   EW: 49%    │    └─ c5 Nf3 → 49%                               │
│ e3   EW: 48%    │                                                  │
└─────────────────┴──────────────────────────────────────────────────┘
```

**Key:**
- `+` = collapsed branch (has alternatives, click to expand)
- `−` = expanded branch (showing alternatives below)
- `→` = leaf evaluation
- `◄` = selected candidate (highlighted)

## Implementation Steps

### 1. Create New Component Structure

Replace `EWTree` with `EWCandidateTreeView`:

```tsx
function EWCandidateTreeView({ candidates, evalSource, onNavigate }: EWTreeProps) {
  // State
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)

  return (
    <div className="ew-candidate-tree-view">
      <CandidateColumn ... />
      <TreeColumn ... />
      {tooltipData && <NodeTooltip ... />}
    </div>
  )
}
```

### 2. Candidate Column (Left)

Display all candidates in a vertical list:

```tsx
function CandidateColumn({ candidates, selectedIndex, evalSource, onSelect }) {
  return (
    <div className="candidate-column">
      <div className="column-header">CANDIDATE</div>
      {candidates.map((c, i) => (
        <CandidateRow
          key={c.move}
          candidate={c}
          isSelected={i === selectedIndex}
          evalSource={evalSource}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  )
}

function CandidateRow({ candidate, isSelected, evalSource, onClick }) {
  const ew = evalSource === 'stockfish'
    ? (candidate.expectedWinrateSF ?? candidate.expectedWinrateMaia)
    : candidate.expectedWinrateMaia

  return (
    <div className={`candidate-row ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <span className="move-san">{candidate.san}</span>
      <span className="move-ew">EW: {formatWinrate(ew)}</span>
    </div>
  )
}
```

### 3. Tree Column (Right)

Display the tree for the selected candidate with branch toggles:

```tsx
function TreeColumn({ candidate, expandedNodes, onToggle, onNodeHover, onNavigate }) {
  // Build display structure from candidate.tree
  const { mainline, branchPoints } = buildTreeStructure(candidate.tree)

  return (
    <div className="tree-column">
      <MainlineRow
        moves={mainline}
        branchPoints={branchPoints}
        expandedNodes={expandedNodes}
        onToggle={onToggle}
        onNodeHover={onNodeHover}
        onNavigate={onNavigate}
      />
      {/* Expanded branches render below */}
      {branchPoints.filter(bp => expandedNodes.has(bp.key)).map(bp => (
        <BranchLines key={bp.key} branchPoint={bp} ... />
      ))}
    </div>
  )
}
```

### 4. Mainline Display with Branch Indicators

```tsx
function MainlineRow({ moves, branchPoints, expandedNodes, onToggle, onNodeHover }) {
  return (
    <div className="mainline-row">
      {moves.map((node, idx) => {
        const hasBranch = branchPoints.some(bp => bp.depth === idx)
        const isExpanded = hasBranch && expandedNodes.has(branchPoints.find(bp => bp.depth === idx)!.key)

        return (
          <span key={idx} className="mainline-move">
            <span
              className="move-san"
              onMouseEnter={(e) => onNodeHover(e, node)}
              onMouseLeave={() => onNodeHover(null)}
            >
              {node.san}
            </span>
            {hasBranch && (
              <button className="branch-toggle" onClick={() => onToggle(...)}>
                {isExpanded ? '−' : '+'}
              </button>
            )}
          </span>
        )
      })}
      <span className="leaf-arrow">→</span>
      <span className="leaf-eval">{formatWinrate(leafEval)}</span>
    </div>
  )
}
```

### 5. Branch Lines (Indented)

When a branch point is expanded, show alternative moves indented:

```tsx
function BranchLines({ branchPoint, expandedNodes, onToggle, onNodeHover }) {
  return (
    <div className="branch-lines" style={{ paddingLeft: `${branchPoint.indentChars}ch` }}>
      {branchPoint.alternatives.map(alt => (
        <div key={alt.move} className="branch-line">
          <span className="branch-connector">└─</span>
          {/* Render branch mainline with its own branch toggles */}
          <BranchMainline node={alt} ... />
        </div>
      ))}
    </div>
  )
}
```

### 6. Enhanced Node Tooltip

Show on hover for ANY tree node:

```tsx
function NodeTooltip({ node, x, y }) {
  return (
    <div className="node-tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-header">{node.san}</div>

      <div className="tooltip-row">
        <span>Play rate:</span>
        <span>{formatProbability(node.probability)}</span>
      </div>

      <div className="tooltip-row">
        <span>Cumulative prob:</span>
        <span>{formatProbability(node.cumulativeProbability)}</span>
      </div>

      <div className="tooltip-divider" />

      <div className="tooltip-row">
        <span>Maia eval:</span>
        <span>{formatWinrate(node.maiaWinrate)}</span>
      </div>

      <div className="tooltip-row">
        <span>SF eval:</span>
        <span>{node.sfWinrate !== null ? formatWinrate(node.sfWinrate) : '—'}</span>
      </div>
    </div>
  )
}
```

### 7. Helper Functions

```tsx
/**
 * Generate stable node key for expand/collapse tracking.
 * Uses path of moves from root: "e4-Nf6-Nc3"
 */
function generateNodeKey(node: TreeNode, ancestorPath: string[] = []): string {
  return [...ancestorPath, node.san].filter(Boolean).join('-')
}

/**
 * Build tree structure for display.
 * Returns mainline nodes and branch points.
 */
function buildTreeStructure(root: TreeNode): {
  mainline: TreeNode[]
  branchPoints: BranchPoint[]
} {
  const mainline: TreeNode[] = []
  const branchPoints: BranchPoint[] = []
  let current = root
  let depth = 0

  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    const mainChild = sorted[0]
    const alternatives = sorted.slice(1)

    mainline.push(mainChild)

    if (alternatives.length > 0) {
      branchPoints.push({
        depth,
        key: generateNodeKey(mainChild, mainline.slice(0, -1).map(n => n.san!)),
        alternatives,
        indentChars: mainline.slice(0, depth).reduce((sum, n) => sum + (n.san?.length || 0) + 1, 0)
      })
    }

    current = mainChild
    depth++
  }

  return { mainline, branchPoints }
}
```

### 8. CSS Layout

```css
.ew-candidate-tree-view {
  display: grid;
  grid-template-columns: minmax(120px, 160px) 1fr;
  gap: var(--space-md);
  border: var(--border-thin) solid var(--color-border);
}

.candidate-column {
  border-right: var(--border-medium) solid var(--color-border);
  padding: var(--space-sm);
}

.column-header {
  font-size: var(--font-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  padding-bottom: var(--space-xs);
  border-bottom: var(--border-thin) solid var(--color-border);
  margin-bottom: var(--space-sm);
}

.candidate-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  border-left: 3px solid transparent;
}

.candidate-row.selected {
  border-left-color: var(--color-primary);
  background: rgba(255, 224, 0, 0.1);
}

.tree-column {
  padding: var(--space-sm);
  font-family: var(--font-mono);
  overflow-x: auto;
}

.mainline-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.branch-toggle {
  background: transparent;
  border: var(--border-thin) solid var(--color-border);
  color: var(--color-text-muted);
  width: 16px;
  height: 16px;
  font-size: 12px;
  cursor: pointer;
  margin: 0 2px;
}

.branch-toggle:hover {
  background: var(--color-primary);
  color: var(--color-background);
}

.branch-lines {
  margin-top: var(--space-xs);
  color: var(--color-text-muted);
}

.branch-connector {
  color: var(--color-border);
}
```

## Data TestIDs

| Element | TestID |
|---------|--------|
| Container | `ew-candidate-tree-view` |
| Candidate column | `ew-candidate-column` |
| Candidate row | `ew-candidate-{index}` |
| Tree column | `ew-tree-column` |
| Mainline move | `ew-mainline-{depth}` |
| Branch toggle | `ew-branch-toggle-{key}` |
| Branch line | `ew-branch-{key}` |
| Node tooltip | `ew-node-tooltip` |

## E2E Test Updates

Update `src/__tests__/e2e/06-ew-mock.spec.ts`:
1. Update selectors for new testids
2. Add test for candidate selection changes tree
3. Add test for branch expand/collapse
4. Add test for tooltip appearing on tree nodes (not just candidates)

## Summary of Changes

1. **Layout**: Single-column → Two-column (candidates | tree)
2. **Candidate display**: Move from inline mainline to separate clickable list
3. **Tree display**: Selected candidate's tree with +/− toggles at branch points
4. **Branch behavior**: Click +/− to show/hide alternative continuations
5. **Tooltip**: Now works on ANY tree node, shows play rate + cumulative prob + both evals
6. **Navigation**: Click any move to navigate board to that position