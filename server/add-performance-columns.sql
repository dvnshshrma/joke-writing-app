-- Run this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → paste → Run

ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS performance_profile TEXT,
  ADD COLUMN IF NOT EXISTS performance_dimensions JSONB;
