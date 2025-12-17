-- Migration: Add user_id column to all tables for multi-user support
-- Run this in your Supabase SQL Editor

-- 1. Add user_id to jokes table
ALTER TABLE jokes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Add user_id to sets table  
ALTER TABLE sets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Add user_id to analysis_results table
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 4. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_jokes_user_id ON jokes(user_id);
CREATE INDEX IF NOT EXISTS idx_sets_user_id ON sets(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE jokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for jokes
DROP POLICY IF EXISTS "Users can view own jokes" ON jokes;
CREATE POLICY "Users can view own jokes" ON jokes
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own jokes" ON jokes;
CREATE POLICY "Users can insert own jokes" ON jokes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own jokes" ON jokes;
CREATE POLICY "Users can update own jokes" ON jokes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own jokes" ON jokes;
CREATE POLICY "Users can delete own jokes" ON jokes
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create RLS policies for sets
DROP POLICY IF EXISTS "Users can view own sets" ON sets;
CREATE POLICY "Users can view own sets" ON sets
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own sets" ON sets;
CREATE POLICY "Users can insert own sets" ON sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sets" ON sets;
CREATE POLICY "Users can update own sets" ON sets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sets" ON sets;
CREATE POLICY "Users can delete own sets" ON sets
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for analysis_results
DROP POLICY IF EXISTS "Users can view own analyses" ON analysis_results;
CREATE POLICY "Users can view own analyses" ON analysis_results
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own analyses" ON analysis_results;
CREATE POLICY "Users can insert own analyses" ON analysis_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own analyses" ON analysis_results;
CREATE POLICY "Users can update own analyses" ON analysis_results
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own analyses" ON analysis_results;
CREATE POLICY "Users can delete own analyses" ON analysis_results
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Grant service role bypass for backend operations
-- (The backend uses service role key which bypasses RLS)

