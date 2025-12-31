# OpenAI API Key Setup for Comedy Style Analysis

The "Find Your Style" feature can use OpenAI's GPT model for more accurate comedy style classification. Here's how to set it up:

## Why Use OpenAI?

- ✅ **More Accurate**: GPT analyzes context and meaning, not just keywords
- ✅ **Better Classification**: Understands nuance and subtle comedy styles
- ✅ **Automatic Fallback**: If no key is set, the system uses keyword-based classification (still works!)

## Setup Instructions

### For Vercel Deployment (Production)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Add the following:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-your-actual-openai-api-key-here`
   - **Environment:** Production, Preview, Development (check all)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

### For Local Development

#### Option 1: Environment Variable (Recommended)

**On macOS/Linux:**
```bash
export OPENAI_API_KEY="sk-your-actual-openai-api-key-here"
```

**On Windows (Command Prompt):**
```cmd
set OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**On Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-your-actual-openai-api-key-here"
```

#### Option 2: .env File

Create a `.env` file in your project root:

```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**Note:** The serverless function (`api/index.js`) reads from `process.env.OPENAI_API_KEY` directly. For local development with the Express server, you might need to use `dotenv`.

### For Local Express Server (server/server-supabase.js)

If you're running the local Express server, create a `.env` file in the `server/` directory:

```bash
cd server
echo "OPENAI_API_KEY=sk-your-actual-openai-api-key-here" >> .env
```

Make sure your server code loads it:
```javascript
require('dotenv').config();
```

## Getting an OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys** section (left sidebar)
4. Click **Create new secret key**
5. Give it a name (e.g., "Comedica Style Analysis")
6. Copy the key (it starts with `sk-`)
7. **Save it securely** - you won't be able to see it again!

## API Costs

- **Model Used:** `gpt-3.5-turbo` (cheapest option)
- **Cost:** ~$0.001-0.002 per analysis (very cheap!)
- **Usage:** Only called once per transcript analysis
- **Fallback:** If key is missing, uses free keyword-based classification

## Testing if It Works

1. Upload an audio file in "Find Your Style"
2. Check the server logs (Vercel logs or local terminal)
3. You should see: `✅ OpenAI API key found - will use GPT for style classification`
4. After analysis, styles should be more accurately classified

## Troubleshooting

### "OpenAI API key not found"
- Make sure the key is set in environment variables
- For Vercel: Redeploy after adding the variable
- For local: Restart your server after setting the variable

### "OpenAI API error: 401"
- Your API key is invalid or expired
- Generate a new key from OpenAI dashboard

### "OpenAI API error: 429"
- You've hit rate limits (unlikely with normal usage)
- Check your OpenAI account usage/billing

### Classification Still Using Keywords
- Check server logs for error messages
- Verify the key is correct
- Make sure you redeployed (Vercel) or restarted server (local)

## Without OpenAI (Still Works!)

If you don't want to use OpenAI:
- ✅ The analyzer still works perfectly with keyword-based classification
- ✅ All 18 comedy styles are detected
- ✅ Adam Bloom tools analysis works regardless
- ✅ Writing elements detection works regardless
- ✅ You just get slightly less nuanced style scores

The system automatically falls back to keyword matching if OpenAI isn't available!

