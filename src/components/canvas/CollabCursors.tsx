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
        return (
          <div
            key={c.user_id}
            className="absolute pointer-events-none z-30"
            style={{
              left: c.cursor.x,
              top: c.cursor.y,
              transition: 'all 80ms linear',
            }}
          >
            {/* Cursor SVG */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M0 0L0 16L4.5 11.5L7 18L9 17.5L6.5 11L12 11L0 0Z"
                fill={c.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            {/* Name label */}
            <div
              className="absolute left-4 top-0 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap"
              style={{ background: c.color }}
            >
              {c.email?.split('@')[0] || c.user_id.slice(0, 6)}
            </div>
          </div>
        )
      })}
    </>
  )
}
