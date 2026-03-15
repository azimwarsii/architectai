'use client'
import Link from 'next/link'
import { UserAvatar } from './UserAvatar'

interface Props {
  title?: string
}

export function Navbar({ title }: Props) {
  return (
    <header className="h-12 border-b bg-background flex items-center px-4 gap-4">
      <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        ArchitectAI
      </Link>
      {title && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{title}</span>
        </>
      )}
      <div className="ml-auto">
        <UserAvatar />
      </div>
    </header>
  )
}
