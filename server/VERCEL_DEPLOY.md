# 🚀 Deploy to Vercel - Updated Guide

## Fixed Configuration

The `builds` field has been removed. Vercel will now auto-detect your Node.js setup.

## Step 1: Add Environment Variables

**Via Dashboard (Recommended):**

1. Go to: https://vercel.com/dashboard
2. Click on your **server** project
3. Go to **Settings** → **Environment Variables**
4. Add these two:

   **SUPABASE_URL:**
   - Value: `https://puwglzsacsilwbzvvsgr.supabase.co`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **SUPABASE_KEY:**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d2dsenNhY3NpbHdienZ2c2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDY4MzYsImV4cCI6MjA4MTMyMjgzNn0.C1ryFY97Y-ibPD4OtMtCB4QuSEFQ8GwbLyXO0AGeyN0`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

5. Click **Save**

## Step 2: Deploy

```bash
cd server
vercel --prod
```

## Step 3: Get Your Backend URL

After deployment, you'll get a URL like:
`https://server-xxxxx.vercel.app`

Your API will be at: `https://server-xxxxx.vercel.app/api`

## Step 4: Deploy Frontend

```bash
cd ..

# Deploy frontend
vercel

# After deployment, add environment variable in Vercel dashboard:
# VITE_API_URL = https://your-backend-url.vercel.app/api
```

## Project Structure for Vercel

- `server/api/index.js` - Serverless function (auto-detected by Vercel)
- `server/vercel.json` - Configuration (no builds field)
- `server/server-supabase.js` - Still used for local development

Vercel will automatically:
- Detect the `api/` folder
- Deploy it as serverless functions
- Route `/api/*` to the functions

## No More Warnings! ✅

The configuration is now modern and won't show the `builds` warning.

