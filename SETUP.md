# 🚀 Comedica Setup Guide

## Quick Start

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
```

### 2. Set Up Supabase Database

1. Create a free account at https://supabase.com/dashboard
2. Create a new project
3. Get your Project URL and anon key from Settings > API
4. Create the database tables (see below)

### 3. Configure Environment

Create `server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here
DB_NAME=comedica
PORT=3001
```

### 4. Create Database Tables

Run the SQL scripts in Supabase SQL Editor:

**Jokes table:**
```sql
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

CREATE INDEX IF NOT EXISTS idx_jokes_updated_at ON jokes(updated_at DESC);
ALTER TABLE jokes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON jokes FOR ALL USING (true) WITH CHECK (true);
```

**Sets table:**
```sql
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  header TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'short',
  jokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  joke_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sets_updated_at ON sets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sets_type ON sets(type);
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on sets" ON sets FOR ALL USING (true) WITH CHECK (true);
```

### 5. Start the Servers

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Open the App

Navigate to: http://localhost:5173

## Detailed Setup

See `server/SUPABASE_SETUP.md` for detailed Supabase setup instructions.

## Features

- ✅ Joke writing with version control
- ✅ Line-by-line commenting
- ✅ Strike-through and replacement text
- ✅ Short sets for open mics
- ✅ Cloud database (Supabase)
- 🚧 Long sets (coming soon)

