# 🚀 Supabase Setup Guide (Easier than MongoDB!)

Supabase is a free, open-source Firebase alternative with PostgreSQL. It's much easier to set up!

## Step 1: Create Supabase Account (2 minutes)

1. **Go to:** https://supabase.com/dashboard
2. Click **"Start your project"** or **"Sign Up"**
3. Sign up with GitHub (easiest) or email
4. Verify your email if needed

## Step 2: Create a New Project (3 minutes)

1. Click **"New Project"**
2. Fill in:
   - **Name:** `comedica` (or any name)
   - **Database Password:** Create a strong password (SAVE IT!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** **Free** (should be selected by default)
3. Click **"Create new project"**
4. ⏳ Wait 2-3 minutes for project to be ready

## Step 3: Get API Credentials (1 minute)

1. Once project is ready, go to **Settings** (gear icon in left sidebar)
2. Click **"API"** in the settings menu
3. You'll see:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

**Copy both of these!** You'll need them for the `.env` file.

## Step 4: Create Database Table (2 minutes)

1. In your Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Create jokes table
CREATE TABLE IF NOT EXISTS jokes (
  id TEXT PRIMARY KEY,
  header TEXT NOT NULL DEFAULT '',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  comments JSONB NOT NULL DEFAULT '{}'::jsonb,
  strikethrough_texts JSONB NOT NULL DEFAULT '[]'::jsonb,
  replacements JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_jokes_updated_at ON jokes(updated_at DESC);

-- Enable Row Level Security (optional, for future security)
ALTER TABLE jokes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now)
CREATE POLICY "Allow all operations" ON jokes
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see: "Success. No rows returned"

## Step 5: Configure Environment

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   DB_NAME=comedica
   PORT=3001
   ```

   Replace:
   - `SUPABASE_URL` with your Project URL
   - `SUPABASE_KEY` with your anon public key

## Step 6: Install Dependencies

```bash
npm install
```

## Step 7: Test Connection

```bash
npm run test-connection
```

Should see: `✅ Successfully connected to Supabase!`

## Step 8: Migrate Your Jokes

```bash
npm run migrate-cloud
```

Should see your 2 jokes migrated!

## Step 9: Start the Server

```bash
npm start
```

You should see:
```
✅ Supabase connection successful
🚀 Comedica server running on http://localhost:3001
☁️  Using Supabase cloud database
```

## ✅ Done!

Your jokes are now in the cloud! 🎉

## Benefits of Supabase

- ✅ **Free tier:** 500MB database, 2GB bandwidth
- ✅ **Easy setup:** No complex configuration
- ✅ **Real-time:** Can add real-time features later
- ✅ **PostgreSQL:** Industry-standard database
- ✅ **Dashboard:** Easy to view/edit data
- ✅ **Auto backups:** Automatic daily backups

## View Your Data

You can view your jokes in the Supabase dashboard:
1. Go to **"Table Editor"** (left sidebar)
2. Click on **"jokes"** table
3. See all your migrated jokes!

