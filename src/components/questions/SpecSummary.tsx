'use client'
import type { SpecAnswers } from '@/types'

interface Props {
  answers: SpecAnswers
}

const LABELS: Record<keyof SpecAnswers, string> = {
  control: 'Tech control',
  platform: 'Platform',
  users: 'User roles',
  auth: 'Authentication',
  pages: 'Core pages',
  data: 'Data & storage',
  realtime: 'Real-time features',
  payments: 'Payments',
  integrations: 'Integrations',
  timeline: 'Timeline',
}

export function SpecSummary({ answers }: Props) {
  const entries = Object.entries(answers).filter(([, v]) => v !== undefined && v !== null)

  return (
    <div className="mt-4 p-4 border rounded-xl bg-muted/30">
      <p className="text-sm font-medium mb-3">Spec summary</p>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{LABELS[key as keyof SpecAnswers] || key}</p>
            <div className="flex flex-wrap gap-1">
              {Array.isArray(value) ? (
                value.map((v, i) => (
                  <span key={i} className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {v}
                  </span>
                ))
              ) : (
                <span className="text-xs font-medium">{value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
