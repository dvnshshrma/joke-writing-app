-- Add is_draft column to sets table
-- Run this in Supabase SQL Editor

ALTER TABLE sets 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT true;

-- Update existing rows to be drafts by default
UPDATE sets 
SET is_draft = true 
WHERE is_draft IS NULL;

