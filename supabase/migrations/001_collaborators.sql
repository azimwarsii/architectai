-- Migration: Add collaborator tables for project sharing
-- Run this in Supabase SQL Editor

-- Table for tracking project collaborators
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'editor' NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

-- Table for pending invites
CREATE TABLE IF NOT EXISTS project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('editor', 'viewer')) DEFAULT 'editor' NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON project_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON project_invites(email);

-- Enable RLS
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_collaborators

-- Users can view collaborators of projects they're part of
CREATE POLICY "View collaborators of accessible projects" ON project_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Only project owners can insert collaborators
CREATE POLICY "Owners can add collaborators" ON project_collaborators
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    -- Allow self-insert when accepting invite
    user_id = auth.uid()
  );

-- Only project owners can delete collaborators (or users can remove themselves)
CREATE POLICY "Owners can remove collaborators" ON project_collaborators
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

-- RLS Policies for project_invites

-- Users can view invites for their projects or invites sent to their email
CREATE POLICY "View relevant invites" ON project_invites
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Only project owners can create invites
CREATE POLICY "Owners can create invites" ON project_invites
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Owners can delete invites, or the system can mark as accepted
CREATE POLICY "Manage invites" ON project_invites
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can delete invites" ON project_invites
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Function to automatically add project owner as collaborator
CREATE OR REPLACE FUNCTION add_owner_as_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_collaborators (project_id, user_id, role, accepted_at)
  VALUES (NEW.id, NEW.user_id, 'owner', now())
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add owner on project creation
DROP TRIGGER IF EXISTS on_project_created ON projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION add_owner_as_collaborator();

-- Backfill existing projects: add owners as collaborators
INSERT INTO project_collaborators (project_id, user_id, role, accepted_at)
SELECT id, user_id, 'owner', created_at
FROM projects
ON CONFLICT (project_id, user_id) DO NOTHING;
