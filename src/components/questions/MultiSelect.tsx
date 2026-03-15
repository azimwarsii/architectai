'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'

interface Props {
  options: string[]
  onConfirm: (values: string[]) => void
  disabled?: boolean
}

export function MultiSelect({ options, onConfirm, disabled }: Props) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(opt: string) {
    setSelected(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt])
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
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                border: '2px solid #000',
                borderRadius: '10px',
                background: isSelected ? '#F5E642' : '#fff',
                boxShadow: isSelected ? '4px 4px 0 0 #000' : '3px 3px 0 0 #000',
                transform: isSelected ? 'translate(-1px,-1px)' : 'none',
                color: '#000',
              }}
              onMouseEnter={e => {
                if (!disabled && !isSelected) {
                  (e.currentTarget as HTMLElement).style.background = '#FAFAF0'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #000'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)'
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = '#fff'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #000'
                  ;(e.currentTarget as HTMLElement).style.transform = 'none'
                }
              }}
            >
              {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              {opt}
            </button>
          )
        })}
      </div>
      <button
        disabled={selected.length === 0 || disabled}
        onClick={() => onConfirm(selected)}
        className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: '#F4520E', border: '2px solid #000',
          borderRadius: '10px', boxShadow: '3px 3px 0 0 #000',
        }}
        onMouseEnter={e => {
          if (selected.length > 0 && !disabled) {
            (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 0 #000'
            ;(e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)'
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #000'
          ;(e.currentTarget as HTMLElement).style.transform = 'none'
        }}
      >
        Confirm {selected.length > 0 && `(${selected.length} selected)`}
      </button>
    </div>
  )
}
