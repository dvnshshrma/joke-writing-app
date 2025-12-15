-- Create sets table for Comedica app
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  header TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'short',
  jokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  joke_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sets_updated_at ON sets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sets_type ON sets(type);

-- Enable Row Level Security
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for development)
CREATE POLICY "Allow all operations on sets" ON sets
  FOR ALL
  USING (true)
  WITH CHECK (true);

