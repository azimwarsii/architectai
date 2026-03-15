'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface Props {
  options: string[]
  onConfirm: (values: string[]) => void
  disabled?: boolean
}

export function MultiSelect({ options, onConfirm, disabled }: Props) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(opt: string) {
    setSelected(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isSelected = selected.includes(opt)
          return (
            <button
              key={opt}
              disabled={disabled}
              onClick={() => toggle(opt)}
              className={`px-4 py-2 rounded-full border text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-purple-400 bg-purple-50 text-purple-700'
                  : 'border-border hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              {isSelected && <Check className="w-3 h-3" />}
              {opt}
            </button>
          )
        })}
      </div>
      <Button
        size="sm"
        disabled={selected.length === 0 || disabled}
        onClick={() => onConfirm(selected)}
        className="mt-1"
      >
        Confirm ({selected.length} selected)
      </Button>
    </div>
  )
}
