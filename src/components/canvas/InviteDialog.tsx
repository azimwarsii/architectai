'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Copy, Check, Loader2, UserPlus, Trash2, Crown, Edit3, Eye } from 'lucide-react'
import type { ProjectCollaborator } from '@/types'

interface Props {
  projectId: string
  projectName: string
  onClose: () => void
}

interface InviteData {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

interface CollaboratorData {
  id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  email?: string
  accepted_at?: string
}

export function InviteDialog({ projectId, projectName, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([])
  const [invites, setInvites] = useState<InviteData[]>([])
  const [isOwner, setIsOwner] = useState(false)

  // Fetch collaborators and invites
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/projects/${projectId}/collaborators`)
        const data = await res.json()

        if (res.ok) {
          setCollaborators(data.collaborators || [])
          setInvites(data.invites || [])
          setIsOwner(data.isOwner)
        }
      } catch {
        console.error('Failed to fetch collaborators')
      } finally {
        setFetchingData(false)
      }
    }

    fetchData()
  }, [projectId])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)
    setInviteUrl(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invite')
        setLoading(false)
        return
      }

      setSuccess(`Invite sent to ${email}`)
      setInviteUrl(data.inviteUrl)
      setEmail('')

      // Refresh invites list
      setInvites(prev => [...prev, {
        id: data.invite.id,
        email: email.trim().toLowerCase(),
        role,
        created_at: new Date().toISOString(),
        expires_at: data.invite.expires_at
      }])
    } catch {
      setError('Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  async function revokeInvite(inviteId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators?inviteId=${inviteId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== inviteId))
      }
    } catch {
      console.error('Failed to revoke invite')
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators?collaboratorId=${collaboratorId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setCollaborators(prev => prev.filter(c => c.id !== collaboratorId))
      }
    } catch {
      console.error('Failed to remove collaborator')
    }
  }

  function copyInviteUrl() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner': return <Crown className="w-3.5 h-3.5 text-amber-400" />
      case 'editor': return <Edit3 className="w-3.5 h-3.5 text-violet-400" />
      case 'viewer': return <Eye className="w-3.5 h-3.5 text-zinc-400" />
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-[#161720] rounded-2xl w-full max-w-lg mx-4 overflow-hidden border border-white/10"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Invite Collaborators</h2>
            <p className="text-sm text-zinc-500">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Invite Form */}
          {isOwner && (
            <form onSubmit={handleInvite} className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Invite by email
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                  className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-100 focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}

              {success && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm text-emerald-400 mb-2">{success}</p>
                  {inviteUrl && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-xs text-zinc-300 font-mono"
                      />
                      <button
                        type="button"
                        onClick={copyInviteUrl}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-zinc-200 transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* Current Collaborators */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">
              Team Members ({collaborators.length})
            </h3>
            {fetchingData ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-zinc-500 py-3">No collaborators yet</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-medium text-violet-300">
                        {(collab.email || collab.user_id).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {collab.email || `User ${collab.user_id.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          {getRoleIcon(collab.role)}
                          <span className="capitalize">{collab.role}</span>
                        </div>
                      </div>
                    </div>
                    {isOwner && collab.role !== 'owner' && (
                      <button
                        onClick={() => removeCollaborator(collab.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Remove collaborator"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invites */}
          {isOwner && invites.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-3">
                Pending Invites ({invites.length})
              </h3>
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{invite.email}</p>
                        <p className="text-xs text-zinc-500">
                          Invited as {invite.role} &middot; Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeInvite(invite.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Revoke invite"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Descriptions */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Role Permissions
            </h4>
            <div className="space-y-2 text-xs text-zinc-500">
              <div className="flex items-start gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-400 mt-0.5" />
                <p><span className="text-zinc-300">Owner</span> - Full access, can invite/remove members, delete project</p>
              </div>
              <div className="flex items-start gap-2">
                <Edit3 className="w-3.5 h-3.5 text-violet-400 mt-0.5" />
                <p><span className="text-zinc-300">Editor</span> - Can edit nodes, use AI chat, export tasks</p>
              </div>
              <div className="flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-zinc-400 mt-0.5" />
                <p><span className="text-zinc-300">Viewer</span> - Read-only access, can view canvas and export</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
