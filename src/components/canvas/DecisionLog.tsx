'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Decision } from '@/types'
import { ChevronDown, ChevronRight, Search, Plus, X, Filter, Calendar, User, Clock } from 'lucide-react'

interface Props {
  projectId: string
  decisions: Decision[]
  onDecisionAdded?: (decision: Decision) => void
  currentUserId?: string
  canEdit?: boolean
}

type FilterType = 'all' | 'mine' | 'week'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '??'
}

export function DecisionLog({ projectId, decisions: initialDecisions, onDecisionAdded, currentUserId, canEdit = true }: Props) {
  const supabase = createClient()
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions)
  const [isExpanded, setIsExpanded] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null)

  // Form state
  const [newTitle, setNewTitle] = useState('')
  const [newRationale, setNewRationale] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync with initial decisions
  useEffect(() => {
    setDecisions(initialDecisions)
  }, [initialDecisions])

  // Filter and search decisions
  const filteredDecisions = decisions.filter(d => {
    // Apply filter
    if (filter === 'mine' && d.created_by !== currentUserId) return false
    if (filter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      if (new Date(d.created_at) < weekAgo) return false
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchTitle = d.title.toLowerCase().includes(query)
      const matchRationale = d.rationale?.toLowerCase().includes(query)
      if (!matchTitle && !matchRationale) return false
    }

    return true
  })

  const handleAddDecision = useCallback(async () => {
    if (!newTitle.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title: newTitle.trim(),
          rationale: newRationale.trim() || null,
          status: 'approved',
        }),
      })

      if (res.ok) {
        const newDecision = await res.json()
        setDecisions(prev => [newDecision, ...prev])
        onDecisionAdded?.(newDecision)
        setNewTitle('')
        setNewRationale('')
        setShowAddForm(false)
      }
    } catch (err) {
      console.error('Failed to add decision:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [newTitle, newRationale, projectId, isSubmitting, onDecisionAdded])

  return (
    <div
      className="px-4 pt-4 pb-4"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 group"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-zinc-500" />
          )}
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: 'rgba(161,161,170,0.6)' }}>
            Decisions log
          </span>
        </button>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'rgba(161,161,170,0.4)' }}>
            {filteredDecisions.length}
          </span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filter and Search bar */}
          <div className="flex items-center gap-1.5 mb-3">
            {/* Filter dropdown */}
            <div className="relative flex-1">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="w-full text-[11px] px-2 py-1.5 rounded-md appearance-none cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(228,228,231,0.7)',
                }}
              >
                <option value="all">All decisions</option>
                <option value="mine">My decisions</option>
                <option value="week">This week</option>
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>

            {/* Search toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 rounded-md transition-colors"
              style={{
                background: showSearch ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                color: showSearch ? '#a78bfa' : 'rgba(161,161,170,0.6)',
              }}
            >
              <Search className="w-3 h-3" />
            </button>

            {/* Add button */}
            {canEdit && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-1.5 rounded-md transition-colors"
                style={{
                  background: showAddForm ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                  color: showAddForm ? '#34d399' : 'rgba(161,161,170,0.6)',
                }}
                title="Log decision"
              >
                {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decisions..."
                className="w-full text-[11px] px-2.5 py-1.5 rounded-md"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(228,228,231,0.9)',
                }}
                autoFocus
              />
            </div>
          )}

          {/* Add decision form */}
          {showAddForm && canEdit && (
            <div
              className="mb-3 p-2.5 rounded-lg space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Decision title..."
                className="w-full text-[12px] px-2.5 py-1.5 rounded-md"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(228,228,231,0.9)',
                }}
              />
              <textarea
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                placeholder="Rationale (optional)..."
                rows={2}
                className="w-full text-[11px] px-2.5 py-1.5 rounded-md resize-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(228,228,231,0.7)',
                }}
              />
              <button
                onClick={handleAddDecision}
                disabled={!newTitle.trim() || isSubmitting}
                className="w-full text-[11px] font-medium py-1.5 rounded-md transition-colors disabled:opacity-40"
                style={{
                  background: 'rgba(16,185,129,0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}
              >
                {isSubmitting ? 'Logging...' : 'Log Decision'}
              </button>
            </div>
          )}

          {/* Decision list */}
          {filteredDecisions.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'rgba(161,161,170,0.35)' }}>
              {searchQuery ? 'No matching decisions' : 'No decisions logged yet'}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredDecisions.map(d => {
                const isExpandedItem = expandedDecisionId === d.id
                return (
                  <div
                    key={d.id}
                    className="rounded-lg transition-colors cursor-pointer"
                    style={{
                      background: isExpandedItem ? 'rgba(255,255,255,0.04)' : 'transparent',
                    }}
                    onClick={() => setExpandedDecisionId(isExpandedItem ? null : d.id)}
                    onMouseEnter={(e) => {
                      if (!isExpandedItem) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpandedItem) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-2 px-2 py-2">
                      {/* Status dot */}
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0"
                        style={{
                          backgroundColor:
                            d.status === 'approved' ? '#34d399' :
                            d.status === 'rejected' ? '#f87171' :
                            '#fbbf24',
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p className="text-[12px] font-medium leading-snug" style={{ color: 'rgba(228,228,231,0.75)' }}>
                          {d.title}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center gap-2 mt-1">
                          {/* Author avatar */}
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                            style={{
                              background: 'rgba(124,58,237,0.3)',
                              color: '#a78bfa',
                            }}
                            title={d.author_name || d.author_email || 'Unknown'}
                          >
                            {getInitials(d.author_name, d.author_email)}
                          </div>

                          {/* Timestamp */}
                          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgba(161,161,170,0.4)' }}>
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(d.created_at)}
                          </span>
                        </div>

                        {/* Expanded content */}
                        {isExpandedItem && d.rationale && (
                          <p
                            className="text-[11px] leading-relaxed mt-2 pt-2"
                            style={{
                              color: 'rgba(161,161,170,0.6)',
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {d.rationale}
                          </p>
                        )}
                      </div>

                      {/* Expand indicator */}
                      {d.rationale && (
                        <ChevronDown
                          className="w-3 h-3 flex-shrink-0 transition-transform"
                          style={{
                            color: 'rgba(161,161,170,0.3)',
                            transform: isExpandedItem ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
