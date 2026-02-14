-- Add topic_summaries column for taxonomy-based analysis
-- Run in Supabase SQL Editor if you get "column topic_summaries does not exist"

ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS topic_summaries JSONB DEFAULT '{}'::jsonb;
