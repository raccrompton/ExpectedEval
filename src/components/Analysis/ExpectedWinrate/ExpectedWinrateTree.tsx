import { ExpectedWinrateMoveResult, ExpectedWinrateNode } from 'src/lib/expectedWinrate/types'

const NodeRow: React.FC<{ node: ExpectedWinrateNode }> = ({ node }) => {
  return (
    <div className="ml-3 border-l border-white/10 pl-3">
      <div className="flex items-center gap-2 text-xs text-secondary">
        <span>p={(node.cumulativeProb * 100).toFixed(2)}%</span>
        {node.leaf ? <span>wr={Math.round(node.leaf.winrate * 100)}%</span> : null}
      </div>
      {node.children?.map((c) => (
        <NodeRow key={c.fen + c.cumulativeProb} node={c} />
      ))}
    </div>
  )
}

export const ExpectedWinrateTree: React.FC<{
  move: ExpectedWinrateMoveResult | null
}> = ({ move }) => {
  if (!move) return null
  return (
    <div className="red-scrollbar max-h-64 overflow-y-auto px-3 py-2">
      <div className="mb-2 text-xs text-secondary">
        Branches: {move.tree.children?.length || 0} • Coverage:{' '}
        {Math.round(move.coverage * 100)}% • Elapsed: {Math.round(move.elapsedMs)}ms
      </div>
      {move.tree.children?.map((c) => (
        <NodeRow key={c.fen + c.cumulativeProb} node={c} />
      ))}
    </div>
  )
}
