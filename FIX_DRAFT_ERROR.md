# 🔧 Fix: "Failed to save the draft" Error

## The Problem
When trying to save a set as draft, you're getting an error. This is likely because the `is_draft` column doesn't exist in your Supabase database yet.

## Solution: Add the Database Column

### Step 1: Go to Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Migration SQL
Copy and paste this SQL into the SQL Editor:

```sql
ALTER TABLE sets 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT true;

UPDATE sets 
SET is_draft = true 
WHERE is_draft IS NULL;
```

### Step 3: Click "Run" or press Ctrl+Enter
The SQL will add the `is_draft` column to your `sets` table.

### Step 4: Test Again
Try saving a set as draft again - it should work now!

## What Changed

I've improved error handling to:
1. Show more detailed error messages
2. Detect if the issue is a missing database column
3. Provide helpful instructions in the error message

## Alternative: Use the Migration File

You can also use the migration file I created:
- File: `server/add-is-draft-column.sql`
- Copy its contents and run in Supabase SQL Editor

## Still Having Issues?

If you still get errors after adding the column:
1. Check the browser console (F12) for detailed error messages
2. Check the backend server logs for database errors
3. Make sure your backend server is running: `cd server && npm start`

