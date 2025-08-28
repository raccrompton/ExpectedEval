import { ExpectedWinrateMoveResult } from 'src/lib/expectedWinrate/types'

export const ExpectedWinrateList: React.FC<{
  moves: ExpectedWinrateMoveResult[]
  onSelect?: (move: ExpectedWinrateMoveResult) => void
}> = ({ moves, onSelect }) => {
  return (
    <div className="flex w-full flex-col">
      <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs text-secondary">
        <div>Move</div>
        <div>Expected winrate</div>
        <div>Confidence</div>
        <div>Avg depth</div>
      </div>
      <div className="flex flex-col">
        {moves.map((m) => (
          <button
            key={m.move}
            className="grid grid-cols-4 gap-2 px-3 py-2 text-left hover:bg-white/5"
            onClick={() => onSelect && onSelect(m)}
          >
            <div className="text-white">{m.san}</div>
            <div className="text-white">{Math.round(m.expectedWinrate * 100)}%</div>
            <div className="text-white">{m.confidence}</div>
            <div className="text-white">{m.avgDepth.toFixed(1)}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
