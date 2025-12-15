# 🔧 Fix Vercel Deployment

## The Issue

Vercel is looking for environment variables that don't exist yet. We need to add them.

## Solution: Add Environment Variables

### Option 1: Via Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Click on your **comedica** project
3. Go to **Settings** > **Environment Variables**
4. Add these variables:

   **For Production:**
   - Name: `SUPABASE_URL`
   - Value: `https://puwglzsacsilwbzvvsgr.supabase.co`
   - Environment: Production, Preview, Development (check all)

   - Name: `SUPABASE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d2dsenNhY3NpbHdienZ2c2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDY4MzYsImV4cCI6MjA4MTMyMjgzNn0.C1ryFY97Y-ibPD4OtMtCB4QuSEFQ8GwbLyXO0AGeyN0`
   - Environment: Production, Preview, Development (check all)

5. Click **Save**
6. Go to **Deployments** tab
7. Click the **⋯** menu on the latest deployment
8. Click **Redeploy**

### Option 2: Via CLI

```bash
cd server

# Add environment variables
vercel env add SUPABASE_URL
# When prompted, paste: https://puwglzsacsilwbzvvsgr.supabase.co
# Select: Production, Preview, Development

vercel env add SUPABASE_KEY
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d2dsenNhY3NpbHdienZ2c2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDY4MzYsImV4cCI6MjA4MTMyMjgzNn0.C1ryFY97Y-ibPD4OtMtCB4QuSEFQ8GwbLyXO0AGeyN0
# Select: Production, Preview, Development

# Redeploy
vercel --prod
```

## After Adding Variables

Once you've added the environment variables, redeploy:

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard.

## Next: Deploy Frontend

After backend is working:

1. Go back to root directory:
   ```bash
   cd ..
   ```

2. Deploy frontend:
   ```bash
   vercel
   ```

3. Add environment variable in Vercel dashboard:
   - `VITE_API_URL` = your backend URL (e.g., `https://comedica.vercel.app/api`)

4. Redeploy frontend

## Test Your Deployment

Once deployed, visit your Vercel URL on your phone - it should work perfectly! 📱

