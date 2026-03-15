'use client'
import type { ScanLine } from '@/types'

interface Props {
  lines: ScanLine[]
  scanning: boolean
}

const kindClass: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-teal-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
}

export function ScanLog({ lines, scanning }: Props) {
  return (
    <div className="bg-zinc-950 rounded-xl p-4 font-mono text-sm min-h-48 max-h-72 overflow-y-auto">
      {lines.length === 0 && (
        <span className="text-muted-foreground opacity-50">Waiting to start scan...</span>
      )}
      {lines.map((line, i) => (
        <div key={i} className={`leading-6 ${kindClass[line.kind] || 'text-muted-foreground'}`}>
          {line.text}
        </div>
      ))}
      {scanning && (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
          <span className="text-muted-foreground text-xs">scanning...</span>
        </div>
      )}
    </div>
  )
}
