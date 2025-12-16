# 🗄️ Setup Sets Table - Complete Guide

## The Problem
You're getting the error: `relation "sets" not found` - this means the `sets` table doesn't exist in your Supabase database yet.

## Solution: Create the Table

### Step 1: Go to Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Complete SQL Script
Copy and paste this **complete SQL script** into the SQL Editor:

```sql
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
```

### Step 3: Execute
1. Click the **Run** button (or press Ctrl+Enter / Cmd+Enter)
2. You should see "Success. No rows returned" - this means the table was created!

### Step 4: Verify
1. Go to **Table Editor** in the left sidebar
2. You should now see the `sets` table listed
3. Click on it to see the columns

### Step 5: Test
Try saving a set as draft again - it should work now! ✅

## What This Creates

The `sets` table with these columns:
- `id` - Unique identifier for each set
- `header` - The "bigger idea" / set header
- `type` - Either "short" or "long"
- `jokes` - Array of joke IDs (JSONB)
- `joke_details` - Full joke objects (JSONB)
- `transitions` - Array of transitions between jokes (JSONB)
- `is_draft` - Boolean flag (true for drafts, false for finalized)
- `created_at` - Timestamp when created
- `updated_at` - Timestamp when last updated

## Alternative: Use the SQL File

You can also use the complete SQL file:
- File: `server/create-sets-table-complete.sql`
- Copy its contents and run in Supabase SQL Editor

## Troubleshooting

**If you get "relation already exists":**
- The table might already exist but missing columns
- Run the migration scripts instead:
  1. `server/add-transitions-column.sql`
  2. `server/add-is-draft-column.sql`

**If you get permission errors:**
- Make sure you're logged into Supabase
- Make sure you're in the correct project

**Still having issues?**
- Check the browser console for detailed errors
- Check backend server logs
- Make sure your backend is running: `cd server && npm start`

