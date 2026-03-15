-- Migration: Add node_messages table for chat persistence
-- Run this in Supabase SQL Editor

-- Table for storing chat messages per node
CREATE TABLE IF NOT EXISTS node_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  suggestion JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_node_messages_node ON node_messages(node_id);
CREATE INDEX IF NOT EXISTS idx_node_messages_project ON node_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_node_messages_created ON node_messages(node_id, created_at);

-- Enable RLS
ALTER TABLE node_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view messages for nodes in their projects
CREATE POLICY "View messages for accessible projects" ON node_messages
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()
    )
  );

-- Users can insert messages for nodes in their projects
CREATE POLICY "Insert messages for accessible projects" ON node_messages
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- Users can delete their own messages (optional, for cleanup)
CREATE POLICY "Delete own messages" ON node_messages
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
