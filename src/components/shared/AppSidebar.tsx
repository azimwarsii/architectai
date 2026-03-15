'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, PanelLeft, Settings, LogOut, Search,
  MoreHorizontal, Trash2, ExternalLink,
} from 'lucide-react'
import type { Project } from '@/types'

const STATUS_DOT: Record<string, string> = {
  intake: '#9ca3af', questioning: '#f59e0b', canvas: '#a78bfa', exported: '#34d399',
}

interface UserInfo { email: string; name: string; initials: string }

interface Props {
  /** Highlight the currently active project in the list */
  currentProjectId?: string
  /** Called when user clicks "New project". Defaults to router.push('/new') */
  onNewProject?: () => void
}

export function AppSidebar({ currentProjectId, onNewProject }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const [newProjectIds, setNewProjectIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const sb = supabase
    let channel: ReturnType<typeof sb.channel> | null = null

    sb.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return
      const email = u.email ?? ''
      const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || email.split('@')[0]
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      setUser({ email, name, initials })
      sb.from('projects').select('*').eq('user_id', u.id)
        .order('updated_at', { ascending: false })
        .then(({ data }) => setProjects(data || []))

      // Realtime: projects appear in sidebar only once they have a name
      channel = sb.channel(`sidebar-projects-${u.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${u.id}` }, (payload) => {
          const p = payload.new as Project
          if (!p.name?.trim()) return // don't show nameless draft projects
          setProjects(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev])
          setNewProjectIds(ids => new Set([...ids, p.id]))
          setTimeout(() => setNewProjectIds(ids => { const n = new Set(ids); n.delete(p.id); return n }), 2500)
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `user_id=eq.${u.id}` }, (payload) => {
          const p = payload.new as Project
          if (!p.name?.trim()) return
          setProjects(prev => {
            const exists = prev.some(x => x.id === p.id)
            if (exists) return prev.map(x => x.id === p.id ? p : x)
            // Project just got named — gently prepend with highlight
            setNewProjectIds(ids => new Set([...ids, p.id]))
            setTimeout(() => setNewProjectIds(ids => { const n = new Set(ids); n.delete(p.id); return n }), 2500)
            return [p, ...prev]
          })
        })
        .subscribe()
    })

    return () => { if (channel) supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    if (userMenuOpen) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [userMenuOpen])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenProjectMenu(null)
    }
    if (openProjectMenu) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openProjectMenu])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function navigateToProject(p: Project) {
    if (p.status === 'canvas') router.push(`/project/${p.id}/canvas`)
    else if (p.status === 'intake') router.push(`/project/${p.id}/ideate`)
    else router.push(`/project/${p.id}/canvas`)
  }

  function openMenuAt(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left - 120 })
    setOpenProjectMenu(id)
  }

  async function deleteProject(id: string) {
    setOpenProjectMenu(null)
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  function handleNewProject() {
    if (onNewProject) onNewProject()
    else router.push('/new')
  }

  const filtered = projects.filter(p => p.name?.trim() && p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* ═══ SIDEBAR ═══ */}
      <div
        className="flex-shrink-0 flex flex-col h-full transition-all duration-200 ease-in-out"
        style={{
          width: collapsed ? 64 : 260,
          background: '#171718',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
          cursor: collapsed ? 'pointer' : 'default',
        }}
        onClick={() => { if (collapsed) setCollapsed(false) }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', minHeight: 56 }}
        >
          {collapsed ? (
            <div className="flex items-center justify-center h-14">
              <button
                onClick={(e) => { e.stopPropagation(); setCollapsed(false) }}
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
            <div className="flex items-center gap-2.5 px-3 h-14">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#F5E642', boxShadow: '0 0 0 1.5px rgba(245,230,66,0.3)' }}
              >
                <span className="text-[10px] font-black text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>A</span>
              </div>
              <span className="text-[13px] font-bold text-white truncate flex-1">ArchitectAI</span>
              <button
                onClick={(e) => { e.stopPropagation(); setCollapsed(true) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
                title="Collapse sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* New project */}
        <div className="px-2 pt-3 pb-2 flex-shrink-0">
          {collapsed ? (
            <div
              className="flex items-center justify-center w-full py-2 rounded-xl"
              title="New project (click to expand)"
              style={{ cursor: 'inherit' }}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#F5E642' }}>
                <Plus className="w-3.5 h-3.5 text-black" strokeWidth={3} />
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleNewProject() }}
              className="w-full flex items-center gap-2.5 rounded-xl transition-colors"
              style={{ padding: '9px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#F5E642' }}>
                <Plus className="w-3 h-3 text-black" strokeWidth={3} />
              </div>
              <span className="text-[13px] font-semibold text-white">New project</span>
            </button>
          )}
        </div>

        {/* Search */}
        {collapsed ? (
          <div className="flex items-center justify-center px-2 pb-2 flex-shrink-0" title="Search (click to expand)">
            <Search className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
          </div>
        ) : (
          <div className="px-2 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="bg-transparent outline-none text-[12.5px] flex-1 min-w-0"
                style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'inherit' }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Projects list */}
        {!collapsed && (
          <div
            className="flex-1 overflow-y-auto px-2 pb-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
          >
            <p
              className="px-2 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-geist-mono)' }}
            >
              Your projects
            </p>

            {filtered.length === 0 && (
              <p className="px-2 py-3 text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {search ? 'No matches' : 'No projects yet'}
              </p>
            )}

            <div className="space-y-0.5">
              {filtered.map(p => {
                const isActive = p.id === currentProjectId
                return (
                  <div
                    key={p.id}
                    className="relative flex items-center gap-2 rounded-lg transition-all group"
                    style={{
                      padding: '6px 6px 6px 10px',
                      background: isActive ? 'rgba(255,255,255,0.1)' : newProjectIds.has(p.id) ? 'rgba(245,230,66,0.12)' : 'transparent',
                      transition: 'background 0.6s ease',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = newProjectIds.has(p.id) ? 'rgba(245,230,66,0.12)' : 'transparent' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STATUS_DOT[p.status] || '#9ca3af' }}
                    />
                    <button
                      onClick={() => navigateToProject(p)}
                      className="flex-1 min-w-0 text-left text-[13px] font-medium truncate"
                      style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.75)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {p.name}
                    </button>
                    <button
                      onClick={(e) => openMenuAt(e, p.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'rgba(255,255,255,0.45)', background: 'transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
                      title="Options"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {collapsed && <div className="flex-1" />}

        {/* User section */}
        <div
          className="flex-shrink-0 px-2 py-3 relative"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          ref={userMenuRef}
        >
          {userMenuOpen && user && (
            <div
              className="absolute bottom-16 left-2 w-56 rounded-xl overflow-hidden z-50"
              style={{ background: '#252528', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
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
            onClick={(e) => { e.stopPropagation(); setUserMenuOpen(v => !v) }}
            className="w-full flex items-center rounded-xl transition-colors"
            style={{
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '6px 0' : '6px 8px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: userMenuOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
            onMouseEnter={e => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {user ? (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: '#34d399', color: '#000' }}>
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

      {/* Project three-dot menu (fixed, avoids overflow clipping) */}
      {openProjectMenu && (
        <div
          ref={menuRef}
          className="rounded-xl overflow-hidden"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: 168,
            zIndex: 9999,
            background: '#252528',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div className="p-1">
            <button
              onClick={() => {
                const p = projects.find(x => x.id === openProjectMenu)
                setOpenProjectMenu(null)
                if (p) navigateToProject(p)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium"
              style={{ color: 'rgba(255,255,255,0.8)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> Open project
            </button>
          </div>
          <div className="p-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => deleteProject(openProjectMenu)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium"
              style={{ color: '#f87171' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete project
            </button>
          </div>
        </div>
      )}
    </>
  )
}
