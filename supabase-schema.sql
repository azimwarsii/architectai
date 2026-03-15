-- Run this SQL in your Supabase SQL editor

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  entry_path text check (entry_path in ('has_idea', 'needs_idea')),
  raw_idea text,
  domain text,
  status text default 'intake' check (status in ('intake', 'questioning', 'canvas', 'exported')),
  tinyfish_report jsonb,
  spec_answers jsonb default '{}',
  recommended_stack jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Canvas nodes
create table canvas_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  type text check (type in ('pain_point','feature','ui_change','data_model','dev_task','conflict','decision','evidence')),
  title text not null,
  body text,
  evidence jsonb default '[]',
  status text default 'open' check (status in ('open','resolved','approved','exported')),
  position jsonb default '{"x":0,"y":0}',
  created_by uuid references auth.users,
  resolved_by uuid references auth.users,
  resolution text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Canvas connections
create table canvas_edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  source_id uuid references canvas_nodes on delete cascade not null,
  target_id uuid references canvas_nodes on delete cascade not null
);

-- Collaborators
create table project_collaborators (
  project_id uuid references projects on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text default 'editor' check (role in ('owner','editor','viewer')),
  primary key (project_id, user_id)
);

-- Chat messages per node
create table node_messages (
  id uuid primary key default gen_random_uuid(),
  node_id uuid references canvas_nodes on delete cascade not null,
  project_id uuid references projects not null,
  role text check (role in ('user','assistant')),
  content text not null,
  suggestion jsonb,
  created_at timestamptz default now()
);

-- Dev tasks (exported to agents)
create table dev_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  node_id uuid references canvas_nodes,
  title text not null,
  description text,
  acceptance_criteria text[],
  evidence_refs jsonb default '[]',
  status text default 'pending' check (status in ('pending','exported','done')),
  agent_format jsonb,
  created_at timestamptz default now()
);

-- Decisions log
create table decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  node_id uuid references canvas_nodes,
  title text not null,
  rationale text,
  made_by uuid references auth.users,
  created_at timestamptz default now()
);

-- Enable RLS
alter table projects enable row level security;
alter table canvas_nodes enable row level security;
alter table canvas_edges enable row level security;
alter table project_collaborators enable row level security;
alter table node_messages enable row level security;
alter table dev_tasks enable row level security;
alter table decisions enable row level security;

-- RLS policies
create policy "Users own their projects"
  on projects for all using (auth.uid() = user_id);

create policy "Collaborators can access canvas nodes"
  on canvas_nodes for all using (
    project_id in (
      select project_id from project_collaborators where user_id = auth.uid()
      union
      select id from projects where user_id = auth.uid()
    )
  );

create policy "Collaborators can access edges"
  on canvas_edges for all using (
    project_id in (
      select project_id from project_collaborators where user_id = auth.uid()
      union
      select id from projects where user_id = auth.uid()
    )
  );

create policy "Node messages accessible to collaborators"
  on node_messages for all using (
    project_id in (
      select project_id from project_collaborators where user_id = auth.uid()
      union
      select id from projects where user_id = auth.uid()
    )
  );

create policy "Dev tasks accessible to collaborators"
  on dev_tasks for all using (
    project_id in (
      select project_id from project_collaborators where user_id = auth.uid()
      union
      select id from projects where user_id = auth.uid()
    )
  );

-- Realtime
alter publication supabase_realtime add table canvas_nodes;
alter publication supabase_realtime add table node_messages;
alter publication supabase_realtime add table canvas_edges;
alter publication supabase_realtime add table decisions;
