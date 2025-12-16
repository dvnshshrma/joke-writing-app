-- Create analysis_results table for Comedica app
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  set_name TEXT NOT NULL DEFAULT '',
  audio_file_name TEXT,
  laughs_per_minute NUMERIC(10, 2) NOT NULL DEFAULT 0,
  avg_laughs_per_joke NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'average',
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  joke_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analysis_set_id ON analysis_results(set_id);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_category ON analysis_results(category);

-- Enable Row Level Security
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations on analysis_results" ON analysis_results;

-- Create policy to allow all operations (for development)
CREATE POLICY "Allow all operations on analysis_results" ON analysis_results
  FOR ALL
  USING (true)
  WITH CHECK (true);

