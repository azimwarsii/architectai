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
          className="px-4 py-2 rounded-full border border-border text-sm hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
