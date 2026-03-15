-- Migration: Add created_by column to decisions table
-- Run this in Supabase SQL Editor

-- Add created_by column to track who created each decision
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for filtering by author
CREATE INDEX IF NOT EXISTS idx_decisions_created_by ON decisions(created_by);

-- Create index for date-based filtering
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);

-- Create index for text search
CREATE INDEX IF NOT EXISTS idx_decisions_title_search ON decisions USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_decisions_rationale_search ON decisions USING gin(to_tsvector('english', COALESCE(rationale, '')));
