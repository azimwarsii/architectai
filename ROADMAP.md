# ArchitectAI Development Roadmap

> **Last Updated:** March 15, 2026
> **Current Status:** Phase 2 Complete, Phase 3 In Progress

---

## Master To-Do Checklist

Use this checklist to track progress. Check off items as they're completed.

### Phase 3: Collaboration & AI Enhancement (Weeks 13-18)

#### 3.1 Collaborator Invite System
- [x] **Database:** Create `project_collaborators` table in Supabase
- [x] **Database:** Create `project_invites` table in Supabase
- [x] **Database:** Add RLS policies for collaborator tables
- [x] **API:** Create `POST /api/projects/[id]/invite` route
- [x] **API:** Create `GET /api/invite/[token]` route for accepting invites
- [ ] **Email:** Set up Resend/SendGrid for invite emails (using link sharing for now)
- [x] **UI:** Create `InviteDialog.tsx` component
- [x] **UI:** Add "Invite" button to canvas topbar
- [x] **UI:** Show pending invites list with revoke option
- [x] **UI:** Show current collaborators with role badges

#### 3.2 Role-Based Permissions
- [ ] **Hook:** Create `usePermissions(projectId)` hook
- [ ] **Logic:** Fetch user role from `project_collaborators` table
- [ ] **UI:** Disable node drag/edit for viewers
- [ ] **UI:** Hide "Add node", "Delete" buttons for viewers
- [ ] **UI:** Hide chat input for viewers (show read-only)
- [ ] **UI:** Hide "Invite" button for non-owners
- [ ] **UI:** Show "View only" badge for viewers

#### 3.3 Real-Time Presence & Cursors
- [x] **Presence:** Add name labels below cursor icons
- [x] **Presence:** Track active node per collaborator
- [x] **UI:** Show colored ring on nodes being edited by others
- [x] **Chat:** Broadcast typing state via presence
- [x] **Chat:** Show "X is typing..." indicator

#### 3.4 Conflict Detection & Resolution
- [ ] **Logic:** Track last editor per node with timestamp
- [ ] **Logic:** Detect simultaneous edits (within 30 seconds)
- [ ] **Logic:** Auto-create conflict node when detected
- [ ] **AI:** Create conflict resolution prompt
- [ ] **UI:** Add "Resolve with AI" button on conflict nodes
- [ ] **UI:** Show AI suggestion with "Accept Resolution" action
- [ ] **Logic:** On accept: update node, mark resolved, log decision

#### 3.5 Decision Log Improvements
- [ ] **UI:** Create expandable decision list in sidebar
- [ ] **UI:** Show author avatar, timestamp, rationale
- [ ] **UI:** Add filter (All / Mine / This week)
- [ ] **UI:** Add search by keyword
- [ ] **UI:** Add "Log Decision" button for manual entries
- [ ] **API:** Create `POST /api/decisions` route
- [ ] **API:** Create `GET /api/projects/[id]/decisions` route

#### 3.6 Chat Message Persistence
- [x] **Database:** Create `node_messages` table in Supabase
- [x] **Database:** Add index on `node_id`
- [x] **Logic:** Save user messages to database on send
- [x] **Logic:** Save assistant messages on completion
- [x] **Logic:** Store parsed suggestions in `suggestion` column
- [x] **Logic:** Load message history when ChatPanel opens
- [x] **Logic:** Initialize useChat with history

---

### Phase 4: Extensions & Integrations (Weeks 19-24)

#### 4.1 Browser Extension
- [ ] **Setup:** Create extension project structure (MV3)
- [ ] **Setup:** Create manifest.json for Chrome
- [ ] **Auth:** Implement OAuth flow for extension
- [ ] **Auth:** Store token in extension storage
- [ ] **API:** Create `GET /api/extension/project/[id]` route
- [ ] **API:** Create `GET /api/extension/tasks/[id]/context` route
- [ ] **API:** Create `POST /api/extension/prompts` route
- [ ] **API:** Create `POST /api/extension/tasks/[id]/complete` route
- [ ] **Content Script:** Cursor integration (detect workspace)
- [ ] **Content Script:** Lovable integration
- [ ] **Content Script:** Bolt integration
- [ ] **Content Script:** Replit integration
- [ ] **UI:** Create popup with project selector
- [ ] **UI:** Create side panel with task context
- [ ] **UI:** Show prompt suggestions based on current task
- [ ] **Logic:** Intercept and log prompts to project memory
- [ ] **Build:** Package for Chrome Web Store
- [ ] **Build:** Package for Firefox Add-ons

#### 4.2 Jira Integration
- [ ] **Setup:** Register Jira OAuth app
- [ ] **UI:** Add Jira connection in Settings > Integrations
- [ ] **API:** Create `POST /api/integrations/jira/connect` route
- [ ] **API:** Create `POST /api/integrations/jira/export` route
- [ ] **Logic:** Map task fields to Jira issue fields
- [ ] **Database:** Add `external_id`, `external_url` to `dev_tasks`
- [ ] **Webhook:** Create `POST /api/webhooks/jira` for status sync
- [ ] **UI:** Show Jira export option in TaskExport component

#### 4.3 Linear Integration
- [ ] **Setup:** Register Linear OAuth app
- [ ] **UI:** Add Linear connection in Settings > Integrations
- [ ] **API:** Create `POST /api/integrations/linear/connect` route
- [ ] **API:** Create `POST /api/integrations/linear/export` route
- [ ] **Logic:** Create issues via Linear GraphQL API
- [ ] **Webhook:** Create `POST /api/webhooks/linear` for status sync
- [ ] **UI:** Show Linear export option in TaskExport component

#### 4.4 GitHub Issues Integration
- [ ] **Setup:** Create GitHub OAuth app
- [ ] **UI:** Add GitHub connection in Settings > Integrations
- [ ] **API:** Create `POST /api/integrations/github/connect` route
- [ ] **API:** Create `POST /api/integrations/github/export` route
- [ ] **Logic:** Create issues via GitHub REST API
- [ ] **UI:** Show GitHub export option in TaskExport component

#### 4.5 Stripe Billing
- [ ] **Setup:** Create Stripe account and products
- [ ] **Database:** Create `subscriptions` table
- [ ] **Database:** Create `usage` table
- [ ] **API:** Create `POST /api/billing/checkout` route
- [ ] **API:** Create `POST /api/billing/portal` route
- [ ] **Webhook:** Create `POST /api/webhooks/stripe` route
- [ ] **Logic:** Handle checkout.session.completed event
- [ ] **Logic:** Handle subscription.updated event
- [ ] **Logic:** Handle subscription.deleted event
- [ ] **Logic:** Handle invoice.payment_failed event
- [ ] **Logic:** Track usage for TinyFish scans
- [ ] **Logic:** Enforce plan limits before operations
- [ ] **UI:** Create pricing page
- [ ] **UI:** Add billing section to Settings
- [ ] **UI:** Show upgrade prompts when limits reached

#### 4.6 Public Sharing
- [ ] **Database:** Add `public_token`, `is_public` to `projects` table
- [ ] **API:** Create `POST /api/projects/[id]/share` route
- [ ] **Page:** Create `/public/[token]` page (no auth required)
- [ ] **UI:** Render read-only canvas view
- [ ] **UI:** Hide edit controls, chat, export
- [ ] **UI:** Add "Share" button in canvas topbar (owners only)
- [ ] **UI:** Create share modal with toggle and copy link

---

### Phase 5: Polish & Scale (Weeks 25-30)

#### 5.1 Canvas: Zoom & Pan
- [ ] **State:** Add transform state (x, y, scale)
- [ ] **Input:** Mouse wheel for zoom
- [ ] **Input:** Space + drag for pan
- [ ] **UI:** Apply transform to canvas container
- [ ] **UI:** Add zoom controls (+, -, fit, 100%)
- [ ] **Logic:** Clamp zoom between 0.25x and 2x

#### 5.2 Canvas: Minimap
- [ ] **UI:** Create minimap component in corner
- [ ] **UI:** Show all nodes as dots
- [ ] **UI:** Show viewport rectangle
- [ ] **Input:** Click minimap to jump to location
- [ ] **UI:** Add toggle to show/hide

#### 5.3 Canvas: Undo/Redo
- [ ] **State:** Create action history stack
- [ ] **Logic:** Record before/after for node CRUD
- [ ] **Logic:** Record before/after for edge CRUD
- [ ] **Input:** Cmd+Z for undo
- [ ] **Input:** Cmd+Shift+Z for redo
- [ ] **Logic:** Clear future history on new action
- [ ] **UI:** Show undo/redo buttons in toolbar

#### 5.4 Canvas: Node Groups
- [ ] **Type:** Add 'group' node type
- [ ] **UI:** Render group as container with label
- [ ] **Logic:** Track child nodes within group
- [ ] **Input:** Drag group moves all children
- [ ] **UI:** Add collapse/expand toggle
- [ ] **UI:** Add group color picker

#### 5.5 Canvas: Templates
- [ ] **Data:** Create template definitions (User Flow, Data Model, Sprint)
- [ ] **UI:** Show template picker in empty canvas
- [ ] **UI:** Add "Apply template" option
- [ ] **Logic:** Generate nodes/edges from template

#### 5.6 Full Document Export
- [ ] **API:** Create `POST /api/projects/[id]/export/document` route
- [ ] **Logic:** Fetch all project data
- [ ] **Logic:** Generate executive summary with AI
- [ ] **Logic:** Render markdown template
- [ ] **Logic:** Convert to PDF (puppeteer or react-pdf)
- [ ] **UI:** Add "Export Document" option in canvas menu
- [ ] **UI:** Show format picker (PDF / Markdown)

#### 5.7 Account Management
- [ ] **API:** Create `POST /api/account/delete` route
- [ ] **Logic:** Confirm with password
- [ ] **Logic:** Transfer/delete owned projects
- [ ] **Logic:** Delete all user data
- [ ] **Logic:** Cancel Stripe subscription
- [ ] **Logic:** Delete Supabase auth user
- [ ] **UI:** Add account deletion in Settings
- [ ] **API:** Create `GET /api/account/export` route
- [ ] **Logic:** Generate ZIP with all user data
- [ ] **UI:** Add "Export my data" button in Settings

#### 5.8 Notifications
- [ ] **Database:** Create `notifications` table
- [ ] **Types:** Define notification types (invite, conflict, mention, etc.)
- [ ] **Logic:** Create notifications on relevant events
- [ ] **UI:** Add bell icon in navbar with unread count
- [ ] **UI:** Create notification dropdown
- [ ] **Logic:** Mark as read on click
- [ ] **Email:** Set up email digest (daily/weekly)
- [ ] **UI:** Add notification preferences in Settings

---

### Technical Debt & Infrastructure

#### Code Quality
- [ ] Add error boundaries to all pages
- [ ] Implement loading skeletons for async operations
- [ ] Enable TypeScript strict mode
- [ ] Set up Vitest for unit tests
- [ ] Write tests for critical API routes
- [ ] Set up Playwright for E2E tests
- [ ] Write E2E tests for main user flows
- [ ] Add Sentry for error tracking

#### Performance
- [ ] Implement virtual scrolling for >100 nodes
- [ ] Add service worker for offline support
- [ ] Set up code splitting for large components
- [ ] Add Redis caching for TinyFish results

#### Security
- [ ] Audit all RLS policies
- [ ] Add rate limiting to API routes
- [ ] Implement CSRF protection
- [ ] Add input sanitization
- [ ] Configure security headers (CSP, HSTS)

#### DevOps
- [ ] Set up GitHub Actions CI/CD
- [ ] Configure preview deployments for PRs
- [ ] Create staging environment
- [ ] Set up database backup automation
- [ ] Add monitoring (Datadog/Grafana)
- [ ] Set up alerting for errors

---

## Progress Summary

| Phase | Total Tasks | Completed | Remaining |
|-------|-------------|-----------|-----------|
| Phase 3 | 45 | 21 | 24 |
| Phase 4 | 58 | 0 | 58 |
| Phase 5 | 48 | 0 | 48 |
| Tech Debt | 22 | 0 | 22 |
| **Total** | **173** | **21** | **152** |

---

## Executive Summary

This roadmap identifies all features required to complete ArchitectAI based on the project brief. Features are organized by priority and phase, with detailed implementation specifications for each.

### Current State vs Target State

| Module | Target | Current | Gap |
|--------|--------|---------|-----|
| Authentication | Full OAuth + Email | Done | - |
| TinyFish Integration | Validation + Ideation | Done | - |
| Spec Builder | 10 adaptive questions | Done | - |
| Canvas Board | Collaborative editing | 70% | Permissions, conflicts |
| AI Chat Panel | Per-node assistant | 80% | Message persistence |
| Task Export | Multi-format | 60% | Jira/Linear/GitHub |
| Collaboration | Real-time multi-user | 30% | Invites, roles, presence |
| Browser Extension | Builder context | 0% | Not started |
| Payments | Stripe billing | 0% | Not started |

---

## Detailed Specifications

### Phase 3: Collaboration & AI Enhancement

**Timeline:** Weeks 13-18
**Status:** In Progress

### 3.1 Collaborator Invite System

**Priority:** High
**Effort:** 3-4 days

#### What It Does
Allow project owners to invite team members via email. Invitees receive an email with a magic link that adds them to the project with a specified role.

#### Database Changes

```sql
-- Add to Supabase
CREATE TABLE project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'editor',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

CREATE TABLE project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('editor', 'viewer')) DEFAULT 'editor',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view collaborators of their projects" ON project_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (SELECT project_id FROM project_collaborators WHERE user_id = auth.uid())
  );
```

#### API Routes

**POST `/api/projects/[id]/invite`**
```typescript
// Request
{ email: string, role: 'editor' | 'viewer' }

// Response
{ invite_id: string, expires_at: string }

// Logic:
// 1. Verify caller is owner/editor of project
// 2. Generate unique token
// 3. Insert into project_invites
// 4. Send email via Resend/SendGrid with magic link
// 5. Link format: /invite/[token]
```

**GET `/api/invite/[token]`**
```typescript
// Logic:
// 1. Look up invite by token
// 2. Check not expired
// 3. If user logged in, add to project_collaborators
// 4. If not logged in, redirect to signup with returnUrl
// 5. Mark invite as accepted
```

#### UI Components

**InviteDialog.tsx** (new component)
```
Location: src/components/canvas/InviteDialog.tsx

- Modal triggered from canvas topbar "Invite" button
- Email input field with validation
- Role dropdown (Editor/Viewer)
- "Send Invite" button
- List of pending invites with "Revoke" option
- List of current collaborators with role badges
```

**CollaboratorAvatars.tsx** (enhance existing)
```
- Show all collaborators in topbar (not just online ones)
- Tooltip with name and role
- Click to open collaborator management panel
```

---

### 3.2 Role-Based Permissions

**Priority:** High
**Effort:** 2-3 days

#### What It Does
Enforce different capabilities based on collaborator role: Owner (full control), Editor (edit nodes/chat), Viewer (read-only).

#### Permission Matrix

| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View canvas | Yes | Yes | Yes |
| Add/edit nodes | Yes | Yes | No |
| Delete nodes | Yes | Yes | No |
| Create edges | Yes | Yes | No |
| Use AI chat | Yes | Yes | No |
| Export tasks | Yes | Yes | Yes |
| Invite collaborators | Yes | No | No |
| Remove collaborators | Yes | No | No |
| Delete project | Yes | No | No |

#### Implementation

**usePermissions hook** (new)
```typescript
// src/hooks/usePermissions.ts
export function usePermissions(projectId: string) {
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('viewer')

  // Fetch role from project_collaborators or projects table
  // Owner = projects.user_id === currentUser
  // Others = project_collaborators.role

  return {
    role,
    canEdit: role === 'owner' || role === 'editor',
    canInvite: role === 'owner',
    canDelete: role === 'owner',
  }
}
```

**UI Changes**
- Disable node drag/edit for viewers
- Hide "Add node", "Delete" buttons for viewers
- Hide chat input for viewers (show messages read-only)
- Hide "Invite" button for non-owners
- Show "View only" badge in topbar for viewers

---

### 3.3 Real-Time Presence & Cursors

**Priority:** Medium
**Effort:** 2 days

#### What It Does
Show live cursor positions of all collaborators on the canvas with name labels. Show typing indicators in chat.

#### Current State
- Supabase Presence channel exists
- Cursor positions tracked
- CollabCursors component renders cursors

#### Enhancements Needed

**Cursor Labels**
```typescript
// CollabCursors.tsx enhancement
// Add name label below cursor icon
<div style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}>
  <CursorIcon color={collaborator.color} />
  <span className="text-[10px] bg-black/80 px-1.5 py-0.5 rounded mt-1">
    {collaborator.name || collaborator.email?.split('@')[0]}
  </span>
</div>
```

**Active Node Indicator**
```typescript
// Track which node each user is viewing/editing
channel.track({
  cursor: { x, y },
  activeNodeId: selectedNodeId,
  isTyping: false
})

// Show colored ring around node being edited by others
// In SpecNode.tsx:
{editingBy && editingBy !== currentUserId && (
  <div
    className="absolute inset-0 rounded-2xl pointer-events-none"
    style={{ border: `2px solid ${collaboratorColor}` }}
  />
)}
```

**Typing Indicator in Chat**
```typescript
// ChatPanel.tsx
// Broadcast typing state
onInput={() => channel.track({ ...state, isTyping: true })}
onBlur={() => channel.track({ ...state, isTyping: false })}

// Show indicator
{collaborators.filter(c => c.isTyping).map(c => (
  <div className="text-xs text-zinc-500 italic">
    {c.name} is typing...
  </div>
))}
```

---

### 3.4 Conflict Detection & Resolution

**Priority:** High
**Effort:** 3-4 days

#### What It Does
When two users edit the same node simultaneously, automatically create a Conflict node. AI suggests resolution with tradeoffs explained.

#### Detection Logic

```typescript
// In CanvasBoard.tsx realtime subscription
// Track last editor per node
const nodeEditors = useRef<Map<string, { userId: string, timestamp: number }>>()

// On node UPDATE event:
if (payload.eventType === 'UPDATE') {
  const lastEditor = nodeEditors.current.get(payload.new.id)
  const currentUserId = getCurrentUserId()

  // If different user edited within 30 seconds, it's a conflict
  if (lastEditor &&
      lastEditor.userId !== payload.new.updated_by &&
      Date.now() - lastEditor.timestamp < 30000) {
    createConflictNode(payload.new.id, lastEditor.userId, payload.new.updated_by)
  }

  nodeEditors.current.set(payload.new.id, {
    userId: payload.new.updated_by,
    timestamp: Date.now()
  })
}
```

#### Conflict Node Structure

```typescript
// When conflict detected:
await supabase.from('canvas_nodes').insert({
  project_id,
  type: 'conflict',
  title: `Edit conflict on "${originalNode.title}"`,
  body: JSON.stringify({
    original_node_id: originalNode.id,
    editor_a: { userId, changes: oldValue },
    editor_b: { userId, changes: newValue },
  }),
  status: 'open',
  position: { x: originalNode.position.x + 230, y: originalNode.position.y }
})
```

#### AI Resolution

```typescript
// When user clicks "Resolve with AI" on conflict node:
const prompt = `
Two team members made conflicting edits to this spec item:

Original: "${originalValue}"
Edit A by ${userA}: "${editA}"
Edit B by ${userB}: "${editB}"

Analyze both edits and suggest a resolution that:
1. Preserves the intent of both editors
2. Maintains technical consistency
3. Explains the tradeoffs

Return a suggested merged version and rationale.
`

// AI returns suggestion card with "Accept Resolution" action
// On accept: update original node, mark conflict as resolved, log decision
```

---

### 3.5 Decision Log

**Priority:** Medium
**Effort:** 1-2 days

#### What It Does
Maintain an append-only log of all decisions made on the canvas. Every resolved conflict, approved suggestion, and explicit decision is recorded with author, rationale, and timestamp.

#### Current State
- `decisions` table exists
- Decisions created when conflicts resolved via AI
- Shown in CanvasSidebar

#### Enhancements Needed

**Decision List UI** (in CanvasSidebar.tsx)
```
- Expandable section showing all decisions
- Each decision shows:
  - Title
  - Author avatar + name
  - Timestamp (relative: "2 hours ago")
  - Linked node (click to select)
  - Rationale (expandable)
- Filter by: All / Mine / This week
- Search by keyword
```

**Manual Decision Creation**
```
- "Log Decision" button in node actions
- Opens modal:
  - Title (required)
  - Rationale (optional textarea)
  - Link to node (auto-filled)
- Useful for documenting discussions that happened outside the tool
```

**Decision API**

```typescript
// POST /api/decisions
{
  project_id: string,
  node_id?: string,
  title: string,
  rationale?: string
}

// GET /api/projects/[id]/decisions
// Returns paginated decision list with author info
```

---

### 3.6 Chat Message Persistence

**Priority:** Medium
**Effort:** 1-2 days

#### What It Does
Save all AI chat messages to the database so conversation history persists across sessions.

#### Current State
- `node_messages` table defined in types
- Chat uses Vercel AI SDK useChat hook
- Messages not persisted to database

#### Implementation

**Save Messages on Send/Receive**
```typescript
// ChatPanel.tsx modifications

// After user sends message:
await supabase.from('node_messages').insert({
  node_id: node.id,
  project_id: project.id,
  role: 'user',
  content: userMessage
})

// After AI responds (in onFinish callback):
await supabase.from('node_messages').insert({
  node_id: node.id,
  project_id: project.id,
  role: 'assistant',
  content: assistantMessage,
  suggestion: parsedSuggestion // if any
})
```

**Load History on Mount**
```typescript
// Fetch existing messages when ChatPanel opens
const { data: history } = await supabase
  .from('node_messages')
  .select('*')
  .eq('node_id', node.id)
  .order('created_at', { ascending: true })

// Initialize useChat with history
const { messages, ... } = useChat({
  initialMessages: history?.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content
  }))
})
```

**Database Migration**
```sql
CREATE TABLE node_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  suggestion JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_node_messages_node ON node_messages(node_id);
```

---

## Phase 4: Extensions & Integrations

**Timeline:** Weeks 19-24
**Status:** Planned

### 4.1 Browser Extension

**Priority:** High
**Effort:** 2-3 weeks

#### What It Does
A Chrome/Firefox extension that runs inside coding tools (Cursor, Lovable, Bolt, Replit) to surface spec context and suggest prompts.

#### Architecture

```
Extension Structure:
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker
├── content-scripts/
│   ├── cursor.js          # Cursor-specific DOM integration
│   ├── lovable.js         # Lovable-specific
│   ├── bolt.js            # Bolt-specific
│   └── replit.js          # Replit-specific
├── popup/
│   ├── popup.html         # Extension popup UI
│   └── popup.js           # Popup logic
├── sidepanel/
│   ├── panel.html         # Side panel UI
│   └── panel.js           # Panel logic
└── shared/
    ├── api.js             # ArchitectAI API client
    └── auth.js            # Authentication handling
```

#### Core Features

**1. Project Sync**
```javascript
// Detect active project from URL or localStorage
// Cursor: .cursor-tutor files in workspace
// Lovable: URL pattern /projects/[id]
// Bolt: URL pattern /~/[project]

// Fetch project spec from ArchitectAI API
const project = await api.getProject(projectId)
const tasks = await api.getTasks(projectId, { status: 'pending' })
```

**2. Context Panel**
```
Side panel shows:
- Current project name
- Active task (if detected from code context)
- Task details: title, description, acceptance criteria
- Evidence quotes from TinyFish
- Stack hints
- "Mark Complete" button
```

**3. Prompt Suggestions**
```javascript
// Analyze current file/cursor position
// Match against dev_tasks by keywords
// Suggest next prompt based on:
// - Current task requirements
// - Acceptance criteria not yet met
// - Related evidence

// Show floating suggestion:
"Based on your current task, try:
'Add validation for email field with error messages from the spec'"
```

**4. Prompt Logging**
```javascript
// Intercept prompts sent to AI in the builder
// Log to ArchitectAI project memory
await api.logPrompt({
  project_id,
  task_id,
  prompt: interceptedPrompt,
  timestamp: Date.now(),
  builder: 'cursor' // or 'lovable', 'bolt', etc.
})
```

#### API Endpoints Needed

```typescript
// GET /api/extension/project/[id]
// Returns: project + spec + active tasks

// GET /api/extension/tasks/[id]/context
// Returns: task + evidence + related nodes

// POST /api/extension/prompts
// Logs prompt to project memory

// POST /api/extension/tasks/[id]/complete
// Marks task as done
```

#### Installation Flow
1. User installs extension from Chrome Web Store
2. Extension popup shows "Connect to ArchitectAI"
3. OAuth flow opens ArchitectAI login
4. Token stored in extension storage
5. Extension now syncs with user's projects

---

### 4.2 Export Integrations

**Priority:** High
**Effort:** 1 week per integration

#### 4.2.1 Jira Integration

**What It Does**
Export dev tasks directly to Jira as issues, maintaining the link for status sync.

**Setup Flow**
```
1. Settings > Integrations > Jira
2. "Connect Jira" button → OAuth flow
3. Select default project + issue type
4. Save configuration
```

**Export Flow**
```typescript
// POST /api/integrations/jira/export
{
  task_ids: string[],
  jira_project: string,
  issue_type: 'Story' | 'Task' | 'Bug'
}

// For each task:
// 1. Create Jira issue via API
// 2. Map fields:
//    - Summary = task.title
//    - Description = task.description + acceptance criteria + evidence
//    - Labels = ['architectai', task.node_type]
// 3. Store jira_issue_id in dev_tasks table
// 4. Return created issue URLs
```

**Status Sync (Webhook)**
```typescript
// POST /api/webhooks/jira
// Jira sends issue updates
// Update dev_tasks.status based on Jira status mapping:
// - To Do → pending
// - In Progress → pending
// - Done → done
```

#### 4.2.2 Linear Integration

**Similar to Jira but with Linear API**
```typescript
// Linear uses GraphQL API
// Issue creation mutation
// Webhook for status updates
// Simpler field mapping (Linear is more modern)
```

#### 4.2.3 GitHub Issues Integration

**Export as GitHub Issues**
```typescript
// POST /api/integrations/github/export
{
  task_ids: string[],
  repo: 'owner/repo',
  labels: string[]
}

// Uses GitHub REST API
// Creates issues with:
// - Title = task.title
// - Body = markdown formatted spec
// - Labels = architectai + custom
// - Optionally creates milestone for project
```

---

### 4.3 Stripe Billing

**Priority:** Medium
**Effort:** 1-2 weeks

#### What It Does
Enable team billing with per-seat pricing. Free tier includes limited TinyFish scans.

#### Pricing Model (Example)
```
Free Tier:
- 1 user
- 3 projects
- 10 TinyFish scans/month
- Basic export (Markdown)

Pro ($29/user/month):
- Unlimited projects
- 100 TinyFish scans/month
- All export formats
- Priority support

Team ($49/user/month):
- Everything in Pro
- Unlimited TinyFish scans
- Role-based permissions
- SSO (future)
- Dedicated support
```

#### Database Changes

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT CHECK (plan IN ('free', 'pro', 'team')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end TIMESTAMPTZ,
  seats INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('tinyfish_scan', 'ai_chat', 'export')),
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Implementation

**1. Stripe Setup**
```typescript
// lib/stripe.ts
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Products and prices created in Stripe dashboard
// Store price IDs in env vars
```

**2. Checkout Flow**
```typescript
// POST /api/billing/checkout
// Create Stripe Checkout session
// Redirect to Stripe-hosted payment page
// On success, webhook creates subscription record
```

**3. Billing Portal**
```typescript
// POST /api/billing/portal
// Create Stripe Customer Portal session
// User can update payment method, cancel, view invoices
```

**4. Usage Tracking**
```typescript
// Before TinyFish scan:
const usage = await getMonthlyUsage(userId, 'tinyfish_scan')
const limit = getPlanLimit(userPlan, 'tinyfish_scan')
if (usage >= limit) {
  throw new Error('Scan limit reached. Upgrade to continue.')
}

// After scan completes:
await recordUsage(userId, 'tinyfish_scan', projectId)
```

**5. Webhook Handler**
```typescript
// POST /api/webhooks/stripe
// Handle events:
// - checkout.session.completed → create subscription
// - customer.subscription.updated → update status
// - customer.subscription.deleted → mark canceled
// - invoice.payment_failed → mark past_due
```

---

### 4.4 Public Sharing

**Priority:** Medium
**Effort:** 2-3 days

#### What It Does
Generate a public read-only link to share canvas with stakeholders who don't have accounts.

#### Implementation

```sql
-- Add to projects table
ALTER TABLE projects ADD COLUMN public_token TEXT UNIQUE;
ALTER TABLE projects ADD COLUMN is_public BOOLEAN DEFAULT false;
```

```typescript
// POST /api/projects/[id]/share
// Generate unique token, set is_public = true
// Return: https://architectai.com/public/[token]

// GET /public/[token] (new page)
// No auth required
// Render canvas in read-only mode
// Hide: chat, edit controls, export
// Show: nodes, edges, decisions, evidence
```

**UI**
```
- "Share" button in canvas topbar (owners only)
- Modal with toggle: "Enable public link"
- Copy link button
- Option to disable/regenerate link
```

---

## Phase 5: Polish & Scale

**Timeline:** Weeks 25-30
**Status:** Future

### 5.1 Canvas Enhancements

#### 5.1.1 Zoom & Pan

**Effort:** 2-3 days

```typescript
// Add transform state to canvas
const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })

// Mouse wheel = zoom
onWheel={(e) => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  setTransform(t => ({ ...t, scale: clamp(t.scale * delta, 0.25, 2) }))
}}

// Middle mouse drag = pan
// Or: hold Space + drag

// Apply transform to canvas container
style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}

// Zoom controls in corner: +, -, fit, 100%
```

#### 5.1.2 Minimap

**Effort:** 1-2 days

```typescript
// Small overview in corner showing all nodes
// Current viewport indicated by rectangle
// Click to jump to location
// Toggle visibility
```

#### 5.1.3 Undo/Redo

**Effort:** 3-4 days

```typescript
// Track action history
interface Action {
  type: 'node_create' | 'node_update' | 'node_delete' | 'edge_create' | 'edge_delete'
  before: any
  after: any
  timestamp: number
}

const history = useRef<Action[]>([])
const historyIndex = useRef(0)

// Cmd+Z = undo (revert to before state)
// Cmd+Shift+Z = redo (apply after state)
// Clear future history on new action
```

#### 5.1.4 Node Groups / Swim Lanes

**Effort:** 1 week

```typescript
// New node type: 'group'
// Contains child nodes
// Drag group = move all children
// Collapse/expand
// Color coding

// Swim lanes = horizontal/vertical groups
// Auto-layout nodes within lane
// Labels on lane headers
```

#### 5.1.5 Canvas Templates

**Effort:** 2-3 days

```typescript
// Pre-built node arrangements:
// - "User Flow" - pain points → features → tasks
// - "Data Model" - entities with relationships
// - "Sprint Planning" - backlog → doing → done lanes

// "New from template" option in empty canvas
// Or: "Apply template" to overlay on existing
```

---

### 5.2 Full Document Export

**Priority:** Medium
**Effort:** 3-4 days

#### What It Does
Export the entire project as a formatted document (PDF or Markdown) suitable for stakeholder review.

#### Output Structure

```markdown
# [Project Name] - Product Specification

Generated by ArchitectAI on [date]

## Executive Summary
[AI-generated summary of the product based on spec answers]

## Market Validation
[TinyFish report: validated points, risks, opportunities]

## Technical Specification

### Platform & Stack
- Platform: [Web/Mobile/Desktop]
- Frontend: [recommendation]
- Backend: [recommendation]
- Database: [recommendation]

### User Roles & Authentication
[From spec answers]

### Core Features
[List of feature nodes with descriptions]

### Data Model
[Data model nodes with schema details]

## Development Tasks

### Phase 1: Foundation
[Tasks with acceptance criteria]

### Phase 2: Core Features
[Tasks...]

## Decision Log
[All decisions with rationale]

## Evidence & Research
[TinyFish sources and quotes]
```

#### Implementation

```typescript
// POST /api/projects/[id]/export/document
{ format: 'pdf' | 'markdown' }

// 1. Fetch all project data
// 2. Use AI to generate executive summary
// 3. Render markdown template
// 4. For PDF: use puppeteer or react-pdf to render

// Return: file download
```

---

### 5.3 Account Management

**Priority:** Low
**Effort:** 1-2 days

#### Account Deletion
```typescript
// POST /api/account/delete
// 1. Confirm with password
// 2. Transfer ownership of shared projects or delete
// 3. Delete all user data (projects, nodes, etc.)
// 4. Delete Supabase auth user
// 5. Cancel Stripe subscription if exists
// 6. Sign out and redirect to goodbye page
```

#### Data Export
```typescript
// GET /api/account/export
// Return ZIP file with:
// - projects.json (all projects)
// - nodes.json (all canvas nodes)
// - tasks.json (all dev tasks)
// - decisions.json (all decisions)
// GDPR compliance
```

---

### 5.4 Notifications

**Priority:** Low
**Effort:** 1 week

#### In-App Notifications
```typescript
// Notification types:
// - Invited to project
// - Collaborator joined
// - Node conflict detected
// - Task exported
// - Mentioned in decision

// Bell icon in navbar with unread count
// Dropdown with notification list
// Mark as read on click
// "Mark all read" button
```

#### Email Notifications
```typescript
// Digest emails (configurable frequency):
// - Daily summary of project activity
// - Immediate for mentions/invites

// Settings page toggle for each type
// Unsubscribe link in emails
```

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Collaborator Invites | High | Medium | P0 |
| Role-Based Permissions | High | Low | P0 |
| Conflict Detection | High | Medium | P0 |
| Chat Persistence | Medium | Low | P1 |
| Decision Log UI | Medium | Low | P1 |
| Real-time Presence Polish | Medium | Low | P1 |
| Browser Extension | High | High | P1 |
| Jira Integration | High | Medium | P1 |
| Stripe Billing | High | Medium | P2 |
| Public Sharing | Medium | Low | P2 |
| Zoom/Pan | Medium | Low | P2 |
| Undo/Redo | Medium | Medium | P2 |
| Full Document Export | Medium | Medium | P2 |
| Account Deletion | Low | Low | P3 |
| Notifications | Low | Medium | P3 |
| Node Groups | Low | High | P3 |
| Canvas Templates | Low | Medium | P3 |

---

## Technical Debt & Improvements

### Code Quality
- [ ] Add comprehensive error boundaries
- [ ] Implement proper loading states for all async operations
- [ ] Add TypeScript strict mode
- [ ] Set up unit tests (Vitest) for critical paths
- [ ] Set up E2E tests (Playwright) for user flows
- [ ] Add Sentry for error tracking

### Performance
- [ ] Implement virtual scrolling for large node counts (>100)
- [ ] Add service worker for offline support
- [ ] Optimize bundle size (code splitting)
- [ ] Add Redis caching for TinyFish results

### Security
- [ ] Audit all RLS policies
- [ ] Add rate limiting to API routes
- [ ] Implement CSRF protection
- [ ] Add input sanitization for all user content
- [ ] Security headers (CSP, HSTS)

### DevOps
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add preview deployments for PRs
- [ ] Set up staging environment
- [ ] Database backup automation
- [ ] Monitoring and alerting (Datadog/Grafana)

---

## Appendix: Database Schema (Complete)

```sql
-- Core tables
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entry_path TEXT CHECK (entry_path IN ('has_idea', 'needs_idea')),
  raw_idea TEXT,
  domain TEXT,
  status TEXT CHECK (status IN ('intake', 'questioning', 'canvas', 'exported')) DEFAULT 'intake',
  tinyfish_report JSONB,
  spec_answers JSONB DEFAULT '{}',
  recommended_stack JSONB,
  public_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE canvas_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('pain_point', 'feature', 'ui_change', 'data_model', 'dev_task', 'conflict', 'decision', 'evidence')),
  title TEXT NOT NULL,
  body TEXT,
  evidence JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('open', 'resolved', 'approved', 'exported')) DEFAULT 'open',
  position JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE canvas_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_id UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  target_id UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dev_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID REFERENCES canvas_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria JSONB DEFAULT '[]',
  evidence_refs JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending', 'exported', 'done')) DEFAULT 'pending',
  agent_format JSONB,
  assignee_id UUID REFERENCES auth.users(id),
  external_id TEXT, -- Jira/Linear/GitHub issue ID
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID REFERENCES canvas_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  rationale TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE node_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  suggestion JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'editor',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

CREATE TABLE project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('editor', 'viewer')) DEFAULT 'editor',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT CHECK (plan IN ('free', 'pro', 'team')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due')) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  seats INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('tinyfish_scan', 'ai_chat', 'export')) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_canvas_nodes_project ON canvas_nodes(project_id);
CREATE INDEX idx_canvas_edges_project ON canvas_edges(project_id);
CREATE INDEX idx_dev_tasks_project ON dev_tasks(project_id);
CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_node_messages_node ON node_messages(node_id);
CREATE INDEX idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX idx_collaborators_user ON project_collaborators(user_id);
CREATE INDEX idx_invites_token ON project_invites(token);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_usage_user ON usage(user_id, type, created_at);
```

---

## Quick Start for Developers

### To work on a feature:

1. Check the priority matrix above
2. Read the detailed spec in the relevant section
3. Create a branch: `feature/[feature-name]`
4. Implement database changes first (if any)
5. Build API routes
6. Build UI components
7. Test locally with `npm run dev`
8. Create PR with screenshots/recordings

### Key files to understand:

- `src/components/canvas/CanvasBoard.tsx` - Main canvas logic
- `src/components/canvas/SpecNode.tsx` - Node rendering
- `src/components/canvas/ChatPanel.tsx` - AI chat
- `src/lib/supabase/client.ts` - Database client
- `src/types/index.ts` - All TypeScript interfaces
- `src/app/api/` - All backend routes

---

*This roadmap is a living document. Update as features are completed or requirements change.*
