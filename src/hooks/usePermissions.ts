'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CollabRole } from '@/types'

export interface Permissions {
  role: CollabRole | null
  isOwner: boolean
  isEditor: boolean
  isViewer: boolean
  canEdit: boolean      // owner or editor
  canInvite: boolean    // owner only
  canDelete: boolean    // owner or editor
  canChat: boolean      // owner or editor
  loading: boolean
}

export function usePermissions(projectId: string): Permissions {
  const [role, setRole] = useState<CollabRole | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRole() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRole(null)
        setLoading(false)
        return
      }

      // Check if user is the project owner
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single()

      if (project?.user_id === user.id) {
        setRole('owner')
        setLoading(false)
        return
      }

      // Check collaborator role
      const { data: collab } = await supabase
        .from('project_collaborators')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (collab) {
        setRole(collab.role as CollabRole)
      } else {
        // User has no access (shouldn't happen if they're on the page)
        setRole(null)
      }

      setLoading(false)
    }

    fetchRole()
  }, [projectId, supabase])

  const isOwner = role === 'owner'
  const isEditor = role === 'editor'
  const isViewer = role === 'viewer'

  return {
    role,
    isOwner,
    isEditor,
    isViewer,
    canEdit: isOwner || isEditor,
    canInvite: isOwner,
    canDelete: isOwner || isEditor,
    canChat: isOwner || isEditor,
    loading,
  }
}
