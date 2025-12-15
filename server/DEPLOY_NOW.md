# 🚀 Deploy Backend Now

## Step 1: Add Environment Variables

Run these commands (you'll be prompted to paste values):

```bash
cd server

# Add SUPABASE_URL
vercel env add SUPABASE_URL
# When prompted, paste: https://puwglzsacsilwbzvvsgr.supabase.co
# Select: Production, Preview, Development (all three)

# Add SUPABASE_KEY  
vercel env add SUPABASE_KEY
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d2dsenNhY3NpbHdienZ2c2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDY4MzYsImV4cCI6MjA4MTMyMjgzNn0.C1ryFY97Y-ibPD4OtMtCB4QuSEFQ8GwbLyXO0AGeyN0
# Select: Production, Preview, Development (all three)
```

## Step 2: Deploy

```bash
vercel --prod
```

## Step 3: Get Your Backend URL

After deployment, Vercel will show you a URL like:
`https://server-xxxxx.vercel.app`

**Copy this URL!** You'll need it for the frontend.

## Step 4: Deploy Frontend

```bash
cd ..

# Deploy frontend
vercel

# After deployment, go to Vercel dashboard and add:
# VITE_API_URL = https://your-backend-url.vercel.app/api
```

## Alternative: Add Variables via Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your **server** project
3. Settings → Environment Variables
4. Add both variables (see values above)
5. Redeploy

