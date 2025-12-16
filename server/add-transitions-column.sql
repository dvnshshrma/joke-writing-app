-- Add transitions column to sets table
-- Run this in Supabase SQL Editor

ALTER TABLE sets 
ADD COLUMN IF NOT EXISTS transitions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Update existing rows to have empty transitions array
UPDATE sets 
SET transitions = '[]'::jsonb 
WHERE transitions IS NULL;

