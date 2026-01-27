# 🔍 Debug Deployment Issues - Topic Modeling

## The Problem
Topic modeling is not working on the deployed app even after redeployment.

## Most Common Causes

### 1. ❌ OPENAI_API_KEY Not Set in Vercel (MOST LIKELY)
The topic modeling requires `OPENAI_API_KEY` to be set in Vercel environment variables.

**How to Fix:**
1. Go to https://vercel.com/dashboard
2. Select your project (usually `joke-writing-app` or similar)
3. Go to **Settings** → **Environment Variables**
4. Look for `OPENAI_API_KEY` - if it doesn't exist, add it:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: your OpenAI key (starts with `sk-`)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development (check ALL)
5. Click **Save**
6. **Important**: After adding, you MUST redeploy:
   - Go to **Deployments** tab
   - Click the **⋯** (three dots) on the latest deployment
   - Click **Redeploy** OR just push a new commit

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
   - `✅ OpenAI API key found` - Good!
   - `❌ OpenAI API key NOT FOUND` - Bad! Need to add env var
   - `🎯 Starting topic modeling` - Topic modeling is running
   - `✅ Topic modeling completed` - Success!
   - `❌ Topic modeling failed` - Check error message

### 3. 📦 Verify Dependencies

Make sure `ml-kmeans` is in `package.json` (it should be):
```json
{
  "dependencies": {
    "ml-kmeans": "^7.0.0"
  }
}
```

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
- `import { kmeans } from 'ml-kmeans';` at the top
- `performTopicModeling` function
- `classifyJokesWithAI` calls `performTopicModeling`

You can check this in the Vercel dashboard:
1. Go to your project
2. Click on a deployment
3. Click **Source** tab
4. Navigate to `api/index.js`
5. Search for "kmeans" or "performTopicModeling"

## Expected Behavior

When working correctly, you should see these logs in Vercel:
```
✅ OpenAI API key found - will use GPT for style classification
✅ OpenAI API key length: 164
🎯 Starting topic modeling for X segments...
🔍 OPENAI_API_KEY available: true (length: 164)
🔍 Getting embeddings for X segments...
📤 Sending X texts to OpenAI embeddings API...
✅ Received X embeddings from OpenAI
📊 K=2: Silhouette score = X.XXXX
...
✅ Best clustering: K=X (score: X.XXXX)
✅ Topic modeling completed. Clusters assigned.
🤖 Using OpenAI to classify X segments into topics...
✅ AI classified X segments into Y topics
```

## Quick Test

1. Upload an audio file in your app
2. Wait for analysis
3. Check Vercel function logs
4. Look for the log messages above

If you see `❌ OpenAI API key NOT FOUND`, that's the issue - add it to Vercel env vars!

## Still Not Working?

If you've done all the above and it's still not working:

1. **Check the exact error** in Vercel function logs
2. **Share the error message** - it will tell us exactly what's wrong
3. **Verify the API key** is correct (should start with `sk-`)
