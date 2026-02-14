# 🔍 Debug Deployment Issues - Topic Modeling

## The Problem
Topic modeling is not working on the deployed app even after redeployment.

## Most Common Causes

### 1. ❌ Topic Modeling API Key Not Set in Vercel (MOST LIKELY)
Topic modeling uses **taxonomy-based classification** and requires:

- **GROQ_API_KEY** – for AI classification into comedy topics (free at [console.groq.com/keys](https://console.groq.com/keys))

**How to Fix:**
1. Go to https://vercel.com/dashboard
2. Select your project (usually `joke-writing-app` or similar)
3. Go to **Settings** → **Environment Variables**
4. Add the key if missing:
   - **Name**: `GROQ_API_KEY`  
     **Value**: your Groq key (starts with `gsk_`)
5. **Environments**: ✅ Production, ✅ Preview, ✅ Development (check ALL)
6. Click **Save**
7. **Important**: After adding, you MUST redeploy

### 2. 🔍 Check Vercel Function Logs

**How to Check:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Click on **Functions** tab
6. Look for `/api/index` function
7. Click on it to see logs
8. Look for these log messages:
   - `✅ Groq API key found` - Taxonomy classification OK
   - `⚠️ GROQ_API_KEY not set` - Will use keyword fallback
   - `🎯 Starting topic modeling` - Topic modeling is running
   - `✅ Topic modeling completed` - Success!
   - `❌ Topic modeling failed` - Check error message

### 3. 📦 Verify Dependencies

Topic modeling uses Groq (taxonomy-based classification). No embeddings or clustering libraries required.

### 4. 🔄 Force Redeploy

Sometimes Vercel doesn't pick up changes. Force a redeploy:

**Option A: Via CLI**
```bash
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app
vercel --prod --force
```

**Option B: Via Dashboard**
1. Go to Vercel Dashboard → Your Project
2. Deployments tab
3. Click **⋯** on latest deployment
4. Click **Redeploy**

**Option C: Push empty commit**
```bash
git commit --allow-empty -m "Force redeploy"
git push
```

### 5. ✅ Verify Code is Deployed

Check that `api/index.js` has:
- `import { COMEDY_TAXONOMY, buildSubtopicToTopicMap } from '../comedyTaxonomy.js'`
- `classifyJokesWithTaxonomy` function

You can check this in the Vercel dashboard:
1. Go to your project
2. Click on a deployment
3. Click **Source** tab
4. Navigate to `api/index.js`
5. Search for "kmeans" or "performTopicModeling"

## Expected Behavior

When working correctly, you should see these logs in Vercel:
```
✅ Groq API key found - taxonomy-based topic classification
🤖 Classifying segments 0-11 with Groq (taxonomy)...
✅ Taxonomy classified X segments: { Relationships_and_Dating: 3, Work_and_Career: 2, ... }
```

## Quick Test

1. Upload an audio file in your app
2. Wait for analysis
3. Check Vercel function logs
4. Look for the log messages above

If you see `⚠️ GROQ_API_KEY not set`, add it to Vercel env vars (free at console.groq.com)!

## Still Not Working?

If you've done all the above and it's still not working:

1. **Check the exact error** in Vercel function logs
2. **Share the error message** - it will tell us exactly what's wrong
3. **Verify Groq key**: starts with `gsk_`
