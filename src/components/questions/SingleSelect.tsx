'use client'

interface Props {
  options: string[]
  onSelect: (value: string) => void
  disabled?: boolean
}

export function SingleSelect({ options, onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          disabled={disabled}
          onClick={() => onSelect(opt)}
          className="px-4 py-2.5 text-[13px] font-semibold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            border: '2px solid #000',
            borderRadius: '10px',
            background: '#fff',
            boxShadow: '3px 3px 0 0 #000',
          }}
          onMouseEnter={e => {
            if (!disabled) {
              (e.currentTarget as HTMLElement).style.background = '#F5E642'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #000'
              ;(e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)'
            }
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = '#fff'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #000'
            ;(e.currentTarget as HTMLElement).style.transform = 'none'
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
