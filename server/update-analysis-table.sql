-- Run this in Supabase SQL Editor to add advanced analytics columns
-- to the existing analysis_results table

-- Add new columns for advanced analytics
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS speaking_pace DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS silence_count INTEGER,
ADD COLUMN IF NOT EXISTS positive_moments INTEGER,
ADD COLUMN IF NOT EXISTS chapters JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_mock_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS excluded_start INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excluded_end INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS effective_duration INTEGER,
ADD COLUMN IF NOT EXISTS full_duration INTEGER;

-- Add columns for transcript-based analysis
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS transcript_text TEXT,
ADD COLUMN IF NOT EXISTS extracted_jokes JSONB DEFAULT '[]';

-- Make set_id optional (nullable) for transcript-based analysis
ALTER TABLE analysis_results
ALTER COLUMN set_id DROP NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analysis_category ON analysis_results(category);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_results(created_at DESC);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'analysis_results' 
ORDER BY ordinal_position;

