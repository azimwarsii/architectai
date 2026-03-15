'use client'
import type { Problem } from '@/types'
import { Badge } from '@/components/ui/badge'

interface Props {
  problems: Problem[]
  onSelect: (problem: Problem) => void
  selected?: number
}

export function ProblemList({ problems, onSelect, selected }: Props) {
  return (
    <div className="grid gap-3 mt-4">
      {problems.map((p) => (
        <button
          key={p.rank}
          onClick={() => onSelect(p)}
          className={`w-full text-left rounded-xl border p-4 transition-all hover:border-teal-400 ${
            selected === p.rank ? 'border-teal-500 bg-teal-50' : 'border-border bg-background'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0 mt-0.5">
              #{p.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-medium text-sm">{p.title}</p>
                <Badge className="bg-teal-100 text-teal-800 text-xs ml-auto">
                  Score: {p.opportunity_score}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground italic mb-2">{p.evidence_quote}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{p.mention_count.toLocaleString()} mentions</span>
                <span>·</span>
                <span>{p.sources.join(', ')}</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
