'use client'

interface Props {
  role: 'ai' | 'user'
  text: string
}

export function ChatBubble({ role, text }: Props) {
  const isAI = role === 'ai'

  // Basic markdown bold support
  const formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAI
            ? 'bg-muted text-foreground rounded-tl-sm'
            : 'bg-purple-500 text-white rounded-tr-sm'
        }`}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    </div>
  )
}
