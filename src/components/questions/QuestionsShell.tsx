'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PanelLeft, ArrowLeft, Settings, LogOut, ExternalLink } from 'lucide-react'
import { QuestionEngine } from './QuestionEngine'
import type { Project } from '@/types'

interface UserInfo { email: string; name: string; initials: string }

interface Props {
  project: Project
}

export function QuestionsShell({ project }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sb = supabase
    sb.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return
      const email = u.email ?? ''
      const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || email.split('@')[0]
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      setUser({ email, name, initials })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    if (userMenuOpen) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [userMenuOpen])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const STATUS_COLOR: Record<string, string> = {
    intake: '#9ca3af', questioning: '#f59e0b', canvas: '#a78bfa', exported: '#34d399',
  }
  const STATUS_LABEL: Record<string, string> = {
    intake: 'Intake', questioning: 'Spec', canvas: 'Canvas', exported: 'Done',
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: 'var(--font-host-grotesk), ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* ═══ SIDEBAR ═══ */}
      <div
        className="flex-shrink-0 flex flex-col h-full transition-all duration-200 ease-in-out"
        style={{
          width: collapsed ? 56 : 240,
          background: '#171718',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center h-14 px-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {collapsed ? (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={() => setCollapsed(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
                title="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" style={{ transform: 'scaleX(-1)' }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#F5E642' }}
              >
                <span className="text-[10px] font-black text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>A</span>
              </div>
              <span className="text-[13px] font-bold text-white truncate flex-1">ArchitectAI</span>
              <button
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)' }}
                title="Collapse sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Back to projects */}
        <div className="px-2 pt-3 pb-1 flex-shrink-0">
          <button
            onClick={() => router.push('/new')}
            className="w-full flex items-center rounded-lg transition-colors"
            style={{
              gap: collapsed ? 0 : 8,
              padding: collapsed ? '7px 0' : '7px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'rgba(255,255,255,0.45)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
            title="All projects"
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            {!collapsed && <span className="text-[12px] font-medium">All projects</span>}
          </button>
        </div>

        {/* Project info */}
        {!collapsed && (
          <div className="px-3 py-3 mx-2 mt-1 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLOR[project.status] || '#9ca3af' }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ color: STATUS_COLOR[project.status] || '#9ca3af', fontFamily: 'var(--font-geist-mono)' }}
              >
                {STATUS_LABEL[project.status] || project.status}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{project.name}</p>
          </div>
        )}

        {/* Canvas link (if available) */}
        {project.status === 'canvas' && !collapsed && (
          <div className="px-2 mt-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/project/${project.id}/canvas`)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
              style={{ color: '#a78bfa' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[12px] font-semibold">Open canvas</span>
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* User section */}
        <div
          className="flex-shrink-0 px-2 py-3 relative"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          ref={userMenuRef}
        >
          {/* User menu popup */}
          {userMenuOpen && user && (
            <div
              className="absolute bottom-16 left-2 w-52 rounded-xl overflow-hidden z-50"
              style={{
                background: '#252528',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[13px] font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-geist-mono)' }}>{user.email}</p>
              </div>
              <div className="p-1">
                <a
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <Settings className="w-4 h-4" /> Settings
                </a>
              </div>
              <div className="p-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="w-full flex items-center rounded-xl transition-colors"
            style={{
              gap: collapsed ? 0 : 8,
              padding: collapsed ? '6px 0' : '6px 8px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: userMenuOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
            onMouseEnter={e => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {user ? (
              <>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: '#34d399', color: '#000' }}
                >
                  {user.initials}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-semibold text-white truncate leading-tight">{user.name}</p>
                    <p className="text-[10px] truncate leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="w-7 h-7 rounded-full animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
            )}
          </button>
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <QuestionEngine projectId={project.id} tinyfishReport={project.tinyfish_report} />
      </div>
    </div>
  )
}
