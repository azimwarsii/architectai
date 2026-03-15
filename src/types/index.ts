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
  name?: string
  avatar_url?: string
  cursor?: { x: number; y: number }
  color: string
  activeNodeId?: string | null
  isTyping?: boolean
  lastActivity?: number
}

export interface Decision {
  id: string
  project_id: string
  node_id?: string
  title: string
  rationale?: string
  status?: 'pending' | 'approved' | 'rejected'
  created_at: string
  created_by?: string
  // Joined fields for display
  author_name?: string
  author_email?: string
  author_avatar_url?: string
}

export interface ProjectCollaborator {
  id: string
  project_id: string
  user_id: string
  role: CollabRole
  invited_by?: string
  invited_at: string
  accepted_at?: string
  // Joined fields from auth.users
  email?: string
  full_name?: string
  avatar_url?: string
}

export interface ProjectInvite {
  id: string
  project_id: string
  email: string
  role: 'editor' | 'viewer'
  token: string
  invited_by: string
  created_at: string
  expires_at: string
  accepted_at?: string
  // Joined fields
  project_name?: string
  inviter_name?: string
}

// GitHub Integration Types
export interface GitHubIntegration {
  id: string
  user_id: string
  access_token: string
  refresh_token?: string
  github_user_id: number
  github_username: string
  github_avatar_url?: string
  scopes: string[]
  created_at: string
  updated_at: string
}

export interface GitHubRepo {
  id: number
  full_name: string
  name: string
  owner: string
  private: boolean
  html_url: string
  default_branch: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string
  html_url: string
  state: 'open' | 'closed'
  labels: { name: string; color: string }[]
  created_at: string
}

export interface GitHubExportResult {
  success: boolean
  issues: GitHubIssue[]
  errors?: { taskId: string; error: string }[]
}
