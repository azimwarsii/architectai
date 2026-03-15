'use client'
import type { Collaborator } from '@/types'

interface Props {
  collaborators: Collaborator[]
}

export function CollabCursors({ collaborators }: Props) {
  return (
    <>
      {collaborators.map(c => {
        if (!c.cursor) return null

        // Determine display name
        const displayName = c.name || c.email?.split('@')[0] || `User ${c.user_id.slice(0, 4)}`

        // Check if user has been inactive (no cursor movement for 30s)
        const isInactive = c.lastActivity && Date.now() - c.lastActivity > 30000

        return (
          <div
            key={c.user_id}
            className="absolute pointer-events-none z-30"
            style={{
              left: c.cursor.x,
              top: c.cursor.y,
              transition: 'all 50ms linear',
              opacity: isInactive ? 0.4 : 1,
            }}
          >
            {/* Cursor SVG */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="drop-shadow-lg">
              <path
                d="M0 0L0 16L4.5 11.5L7 18L9 17.5L6.5 11L12 11L0 0Z"
                fill={c.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            {/* Name label with status */}
            <div
              className="absolute left-4 top-3 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-white whitespace-nowrap shadow-lg"
              style={{ background: c.color }}
            >
              {/* Typing indicator dot */}
              {c.isTyping && (
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                    style={{ background: 'white' }}
                  />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
              )}
              {displayName}
            </div>
          </div>
        )
      })}
    </>
  )
}
