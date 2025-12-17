# Authentication Setup Guide

## 1. Supabase Configuration

### Enable Google OAuth
1. Go to your Supabase Dashboard → Authentication → Providers
2. Enable **Google** provider
3. Go to [Google Cloud Console](https://console.cloud.google.com/)
4. Create OAuth 2.0 credentials:
   - Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret to Supabase

### Enable Facebook OAuth
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Facebook** provider
3. Go to [Facebook Developers](https://developers.facebook.com/)
4. Create a new app and get App ID/Secret
5. Add redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
6. Copy App ID and Secret to Supabase

### Configure Redirect URLs
In Supabase → Authentication → URL Configuration:
- Site URL: `https://your-vercel-app.vercel.app` (or `http://localhost:5173` for dev)
- Redirect URLs: Add your production and development URLs

## 2. Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=https://your-vercel-app.vercel.app/api
```

### Backend (server/.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_key
PORT=3001
```

## 3. Database Migration

Run this SQL in Supabase SQL Editor to add user support:

```sql
-- Add user_id to all tables
ALTER TABLE jokes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE sets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jokes_user_id ON jokes(user_id);
CREATE INDEX IF NOT EXISTS idx_sets_user_id ON sets(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);

-- Enable RLS
ALTER TABLE jokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Jokes policies
CREATE POLICY "Users can view own jokes" ON jokes FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own jokes" ON jokes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jokes" ON jokes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jokes" ON jokes FOR DELETE USING (auth.uid() = user_id);

-- Sets policies
CREATE POLICY "Users can view own sets" ON sets FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own sets" ON sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sets" ON sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sets" ON sets FOR DELETE USING (auth.uid() = user_id);

-- Analysis policies
CREATE POLICY "Users can view own analyses" ON analysis_results FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own analyses" ON analysis_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON analysis_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON analysis_results FOR DELETE USING (auth.uid() = user_id);
```

## 4. Vercel Deployment

### Environment Variables in Vercel
Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| VITE_SUPABASE_URL | https://your-project.supabase.co |
| VITE_SUPABASE_ANON_KEY | your_anon_key |
| VITE_API_URL | https://your-app.vercel.app/api |
| SUPABASE_URL | https://your-project.supabase.co |
| SUPABASE_KEY | your_service_role_key |
| ASSEMBLYAI_API_KEY | your_assemblyai_key |

### Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 5. Testing Locally

1. Copy environment variables to `.env` files
2. Run database migration
3. Start backend: `cd server && npm start`
4. Start frontend: `npm run dev`
5. Open http://localhost:5173

