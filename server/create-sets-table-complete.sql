-- Create sets table for Comedica app (Complete Version)
-- Run this in Supabase SQL Editor
-- This includes all columns: transitions and is_draft

-- Drop table if exists (optional - remove if you want to keep existing data)
-- DROP TABLE IF EXISTS sets CASCADE;

-- Create the sets table with all columns
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  header TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'short',
  jokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  joke_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  transitions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sets_updated_at ON sets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sets_type ON sets(type);
CREATE INDEX IF NOT EXISTS idx_sets_is_draft ON sets(is_draft);

-- Enable Row Level Security
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations on sets" ON sets;

-- Create policy to allow all operations (for development)
CREATE POLICY "Allow all operations on sets" ON sets
  FOR ALL
  USING (true)
  WITH CHECK (true);

