export type EntryPath = 'has_idea' | 'needs_idea'
export type ProjectStatus = 'intake' | 'questioning' | 'canvas' | 'exported'
export type NodeType = 'pain_point' | 'feature' | 'ui_change' | 'data_model' | 'dev_task' | 'conflict' | 'decision' | 'evidence'
export type NodeStatus = 'open' | 'resolved' | 'approved' | 'exported'
export type CollabRole = 'owner' | 'editor' | 'viewer'

export interface Project {
  id: string
  user_id: string
  name: string
  entry_path: EntryPath
  raw_idea?: string
  domain?: string
  status: ProjectStatus
  tinyfish_report?: TinyfishReport
  spec_answers: SpecAnswers
  recommended_stack?: RecommendedStack
  created_at: string
  updated_at: string
}

export interface TinyfishReport {
  type: 'validation' | 'ideation'
  scan_lines: ScanLine[]
  results: ValidationResult[] | Problem[]
  completed_at: string
}

export interface ScanLine {
  text: string
  kind: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
}

export interface ValidationResult {
  tag: 'Validated' | 'Risk' | 'Opportunity' | 'Gap'
  title: string
  body: string
  evidence_count?: number
}

export interface Problem {
  rank: number
  title: string
  mention_count: number
  evidence_quote: string
  sources: string[]
  opportunity_score: number
}

export interface SpecAnswers {
  control?: string
  platform?: string
  users?: string[]
  auth?: string[]
  pages?: string[]
  data?: string
  realtime?: string[]
  payments?: string
  integrations?: string[]
  timeline?: string
}

export interface RecommendedStack {
  frontend: string
  backend: string
  database: string
  auth: string
  hosting: string[]
  extras: string[]
  reasoning: string
}

export interface CanvasNode {
  id: string
  project_id: string
  type: NodeType
  title: string
  body?: string
  evidence: Evidence[]
  status: NodeStatus
  position: { x: number; y: number }
  created_by?: string
  resolved_by?: string
  resolution?: string
  created_at: string
  updated_at: string
}

export interface Evidence {
  quote: string
  source: string
  url?: string
}

export interface CanvasEdge {
  id: string
  project_id: string
  source_id: string
  target_id: string
}

export interface NodeMessage {
  id: string
  node_id: string
  project_id: string
  role: 'user' | 'assistant'
  content: string
  suggestion?: AISuggestion
  created_at: string
}

export interface AISuggestion {
  title: string
  body: string
  action: 'apply_to_canvas' | 'create_task' | 'log_decision' | 'resolve_conflict'
  payload: Record<string, unknown>
}

export interface DevTask {
  id: string
  project_id: string
  node_id?: string
  title: string
  description: string
  acceptance_criteria: string[]
  evidence_refs: Evidence[]
  status: 'pending' | 'exported' | 'done'
  agent_format?: AgentTask
  created_at: string
}

export interface AgentTask {
  title: string
  context: string
  requirements: string[]
  acceptance_criteria: string[]
  evidence: string
  stack_hints: string[]
}

export interface Collaborator {
  user_id: string
  role: CollabRole
  email?: string
  avatar_url?: string
  cursor?: { x: number; y: number }
  color: string
}
