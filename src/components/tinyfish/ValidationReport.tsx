'use client'
import type { ValidationResult } from '@/types'

interface Props {
  results: ValidationResult[]
}

const tagConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Validated: { bg: 'bg-teal-50', text: 'text-teal-800', dot: 'bg-teal-500' },
  Risk: { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
  Opportunity: { bg: 'bg-purple-50', text: 'text-purple-800', dot: 'bg-purple-500' },
  Gap: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
}

export function ValidationReport({ results }: Props) {
  return (
    <div className="grid gap-3 mt-4">
      {results.map((r, i) => {
        const cfg = tagConfig[r.tag] || tagConfig.Gap
        return (
          <div key={i} className={`rounded-xl p-4 ${cfg.bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{r.tag}</span>
              {r.evidence_count && (
                <span className={`text-xs ml-auto opacity-70 ${cfg.text}`}>{r.evidence_count} signals</span>
              )}
            </div>
            <p className={`text-sm font-medium mb-1 ${cfg.text}`}>{r.title}</p>
            <p className={`text-xs leading-relaxed opacity-80 ${cfg.text}`}>{r.body}</p>
          </div>
        )
      })}
    </div>
  )
}
