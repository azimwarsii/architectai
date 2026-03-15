-- GitHub Integrations table
-- Stores OAuth tokens and GitHub user info for each user

CREATE TABLE IF NOT EXISTS github_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  github_user_id BIGINT NOT NULL,
  github_username TEXT NOT NULL,
  github_avatar_url TEXT,
  scopes TEXT[] DEFAULT ARRAY['repo'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE github_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own integrations
CREATE POLICY "Users can view own integrations"
  ON github_integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own integrations
CREATE POLICY "Users can create own integrations"
  ON github_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations"
  ON github_integrations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON github_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_github_integrations_user_id ON github_integrations(user_id);

-- Add GitHub issue tracking fields to dev_tasks
ALTER TABLE dev_tasks
  ADD COLUMN IF NOT EXISTS github_issue_url TEXT,
  ADD COLUMN IF NOT EXISTS github_issue_number INTEGER;

-- Create index for GitHub issue lookups
CREATE INDEX IF NOT EXISTS idx_dev_tasks_github_issue ON dev_tasks(github_issue_number) WHERE github_issue_number IS NOT NULL;
