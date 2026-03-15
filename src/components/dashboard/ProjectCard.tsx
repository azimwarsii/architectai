'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Props {
  id: string
  name: string
  description: string
  status: string
  href: string
  cardBg: string
  statusBg: string
  statusColor: string
  statusLabel: string
}

export function ProjectCard({ id, name, description, href, cardBg, statusBg, statusColor, statusLabel }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={href} className="block group">
      <div
        className="p-6 rounded-2xl transition-transform duration-150"
        style={{
          background: cardBg,
          border: '2px solid #000',
          boxShadow: hovered ? '6px 6px 0px 0px #000' : '4px 4px 0px 0px #000',
          transform: hovered ? 'translate(-1px, -1px)' : 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-[17px] font-bold text-black leading-snug">{name}</h2>
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex-shrink-0"
            style={{
              background: statusBg,
              color: statusColor,
              border: '1.5px solid #000',
              fontFamily: 'var(--font-geist-mono)',
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p className="text-[13px] text-black/55 font-medium leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-black/70">
          Open project
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  )
}
