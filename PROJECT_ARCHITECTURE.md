# Architect AI — Project Architecture

Reference: Architect AI Team Brief v1.0 (March 2026). This document maps the product vision to the codebase and serves as the single source of truth for architecture.

---

## 1. Vision and positioning

- **Product:** AI-native product management intelligence platform — the layer between product discovery and implementation.
- **One-liner:** Cursor tells the coding agent *how* to build; Architect AI tells it *what* to build — and *why*.
- **Core loop:** Ingest signals → Synthesise problems → Make decisions collaboratively → Hand off to coding agent with full context.

---

## 2. High-level modules (brief → codebase)

| Brief module | Purpose | Implementation |
|--------------|---------|----------------|
| **Module 1 — TinyFish** | Signal engine: validate ideas, surface problems, evidence-backed | `src/lib/tinyfish.ts`, `src/app/api/tinyfish/validate/route.ts`, `src/app/api/tinyfish/ideate/route.ts`, `ScanLog`, `ValidationReport`, `ProblemList` |
| **Module 2 — Cross-question intake** | Adaptive spec builder, 80% confidence, minimal questions | `src/lib/questions.ts`, `QuestionEngine`, `QuestionsShell`, `SpecSummary`, `/project/[id]/questions` |
| **Module 3 — Collaborative canvas** | Figma-style workspace, nodes, edges, evidence, presence | `CanvasBoard`, `SpecNode`, `CanvasSidebar`, `EvidenceDrawer`, `CollabCursors`, `/project/[id]/canvas`, Supabase Realtime + Presence |
| **Module 4 — AI spec assistant** | Node-scoped chat, suggestions, conflict resolution | `ChatPanel`, `src/app/api/ai/chat/route.ts`, suggestion parsing and apply in `ChatPanel` |
| **Module 5 — Agent task export** | Cursor/Claude-ready tasks with evidence | `TaskExport`, `src/app/api/tasks/export/route.ts`, `dev_tasks` table |
| **Module 6 — Builder extension** | Browser extension (Lovable, Cursor, Bolt) | Not yet implemented (Phase 4) |

---

## 3. User entry paths

- **Path A — I have an idea:** `entry_path: 'has_idea'`. Flow: New project → Validate (TinyFish) → Spec builder → Canvas → Export. Entry: `/new` → validate step.
- **Path B — I need an idea:** `entry_path: 'needs_idea'`. Flow: New project → Ideate (TinyFish) → Pick problem → Spec builder → Canvas → Export. Entry: `/new` → ideate step.

Routes:

- `/` — Landing
- `/login`, `/signup`, `/auth/callback` — Auth (Supabase Auth)
- `/new` — Entry path chooser + validate/ideate flows (single page)
- `/project/[id]/validate` — Validate idea (if entered from elsewhere)
- `/project/[id]/ideate` — Ideate / pick problem
- `/project/[id]/questions` — Spec builder (adaptive questions)
- `/project/[id]/canvas` — Collaborative spec canvas
- `/dashboard` — Project list
- `/settings` — User settings

---

## 4. Data model (Supabase / PostgreSQL)

- **projects** — One per product. `entry_path`, `raw_idea`, `domain`, `status`, `tinyfish_report` (JSONB), `spec_answers` (JSONB), `recommended_stack` (JSONB).
- **canvas_nodes** — One per card. `type` (pain_point, feature, ui_change, data_model, dev_task, conflict, decision, evidence), `title`, `body`, `evidence` (JSONB), `status`, `position` (JSONB), `created_by`, `resolved_by`, `resolution`.
- **canvas_edges** — Directed links between nodes. `source_id`, `target_id`, `project_id`.
- **project_collaborators** — Many-to-many projects ↔ users. `role`: owner | editor | viewer. (RLS ready; invite UI not yet built.)
- **node_messages** — Chat history per node. `role`, `content`, `suggestion` (JSONB). Used by AI chat.
- **dev_tasks** — Exportable tasks. `title`, `description`, `acceptance_criteria`, `evidence_refs`, `agent_format` (JSONB), optional `node_id`.
- **decisions** — Immutable log. `node_id`, `title`, `rationale`, `made_by`, `created_at`.

All tables use RLS; policies allow access for project owner and collaborators.

---

## 5. Technology stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Frontend | Next.js (App Router) | File-based routes, RSC, API routes |
| Styling | Tailwind + shadcn/ui | Dark canvas theme in components |
| Database | PostgreSQL (Supabase) | Schema in `supabase-schema.sql` |
| Auth | Supabase Auth | Email/password, OAuth, magic link |
| Realtime | Supabase Realtime + Presence | Nodes/edges/decisions; cursor tracking |
| AI — product | Vercel AI SDK + Google (Gemini) | Spec generation, chat, suggestions |
| AI — research | TinyFish API | Validation + ideation; mock fallback in `tinyfish.ts` |
| State | Zustand (`store/canvas.ts`, `store/project.ts`) | Canvas store currently unused; project store for app state |
| Hosting | Vercel | Frontend + serverless API |

---

## 6. Key flows (brief → implementation)

- **Idea → spec (Path A):** Create project (`has_idea`) → `/new` validate → TinyFish scan → Validation report → Continue to spec builder → `/project/[id]/questions` → On completion, `POST /api/ai/spec` (stack + initial nodes + dev_tasks) → Redirect to canvas.
- **Discovery (Path B):** Create project (`needs_idea`) → `/new` ideate → TinyFish scan → Problem list → Select problem → Spec builder (problem pre-loaded) → same as Path A from there.
- **Canvas:** Load nodes, edges, tasks, decisions → Realtime for nodes/edges/decisions → Presence for cursors → Node CRUD, edge create/delete, evidence drawer, AI chat, task export.

---

## 7. Canvas-specific architecture

- **Board:** `CanvasBoard` — layout (sidebar, topbar, canvas area, Evidence drawer, Chat panel, Task export modal). State: nodes, edges, tasks, decisions, selection, evidence drawer, connecting-from, collaborators.
- **Nodes:** `SpecNode` — draggable card, type badge, title/body (inline edit), evidence count, delete, connect handles, conflict resolve (when type is conflict). Realtime updates position and content.
- **Edges:** Rendered as SVG; create by drag from handle to another node; select and delete (keyboard or topbar). API: `POST/DELETE /api/edges`.
- **Sidebar:** `CanvasSidebar` — project info, node list (with selection), evidence summary, decisions log.
- **Evidence:** `EvidenceDrawer` — list + add evidence for one node; updates `canvas_nodes.evidence` (JSONB).
- **Chat:** `ChatPanel` — `useChat` with `/api/ai/chat`; body includes node + project context; parses `<suggestion>` and applies (apply_to_canvas, log_decision, resolve_conflict; create_task to be wired).
- **Export:** `TaskExport` — list of `dev_tasks`, download as .md (Cursor) or copy JSON; uses `/api/tasks/export`.

---

## 8. Glossary (from brief)

- **TinyFish** — Web research API; validation + ideation paths.
- **Spec builder** — Adaptive 10-step interview; output in `spec_answers` and drives stack + initial nodes.
- **Canvas node** — Single decision card; typed; can have evidence and status.
- **Conflict node** — Created when collaborators clash on same node; resolved via AI or manual resolution; logged in decisions.
- **Decision log** — Append-only; author, rationale, timestamp, optional node link.
- **Agent-ready task** — Structured task for Cursor/Claude; includes context, criteria, evidence.
- **Evidence package** — TinyFish signals attached to a node or task; travels to the agent on export.
- **Presence** — Supabase Realtime presence; cursor position and optional identity.

---

## 9. Out of scope / future

- Browser extension (Phase 4).
- Stripe billing, team plans, invite-by-email (Phase 3–4).
- Public share / read-only canvas link (Phase 4).
- CRDT or OT for rich concurrent editing (brief mentions CRDT; current design is last-write-wins with conflict detection).