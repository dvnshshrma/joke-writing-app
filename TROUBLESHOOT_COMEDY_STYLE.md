# Troubleshooting "Find Your Style" Analysis

## Error: "Failed to check analysis status"

This error occurs when the polling endpoint can't be reached or returns an error.

### Common Causes & Solutions

#### 1. **Local Development - Endpoint Missing**

If running locally, the Express server (`server/server-supabase.js`) may not have the comedy-style endpoints.

**Solution:** The endpoints are only in the Vercel serverless function (`api/index.js`). For local development, you have two options:

**Option A: Use Production (Recommended)**
- Deploy to Vercel
- Use the deployed URL
- All endpoints are available

**Option B: Add to Local Server (Advanced)**
- Copy the comedy-style endpoint code from `api/index.js` to `server/server-supabase.js`
- Add multer handling for file uploads in local dev

#### 2. **API URL Mismatch**

The frontend determines the API URL based on hostname. Check:

```javascript
// In ComedyStyle.jsx
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
const apiUrl = isProduction ? '/api' : 'http://localhost:3001/api'
```

**Check:**
- Are you accessing via `localhost`? → Uses `http://localhost:3001/api`
- Are you accessing via Vercel URL? → Uses `/api` (same origin)

#### 3. **AssemblyAI API Key Missing**

The endpoint requires `ASSEMBLYAI_API_KEY` to be set.

**Check Server Logs:**
```
✅ OpenAI API key found - will use GPT for style classification
```

**Solution:**
- Add `ASSEMBLYAI_API_KEY` to Vercel environment variables
- For local dev, add to `.env` file in project root

#### 4. **CORS Issues**

If polling fails with network errors, check browser console for CORS errors.

**Solution:**
- Ensure API URL matches the origin
- Check that CORS headers are set correctly in API

#### 5. **Job ID Format Issues**

AssemblyAI job IDs might contain special characters that break the URL.

**Check:**
- Open browser DevTools → Network tab
- Look for the polling request: `/api/comedy-style/job/[jobId]`
- Check the response status and error message

### Debugging Steps

1. **Open Browser Console (F12)**
   - Look for error messages
   - Check network requests
   - See polling attempts

2. **Check Network Tab**
   - Find the request to `/api/comedy-style/job/[jobId]`
   - Check:
     - Status code (200 = success, 404 = endpoint not found, 500 = server error)
     - Response body (should contain `status` field)
     - Request URL (should be correct)

3. **Check Server Logs**
   - Vercel: Go to Dashboard → Your Project → Logs
   - Local: Check terminal where server is running
   - Look for error messages

4. **Test the Endpoint Directly**

Use curl to test:

```bash
# Get a job ID from the initial analyze request first
curl -X GET "https://your-app.vercel.app/api/comedy-style/job/YOUR_JOB_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Flow

1. **Upload File** → File uploaded to Supabase Storage
2. **Start Analysis** → POST `/api/comedy-style/analyze`
   - Returns: `{ status: 'processing', jobId: '...' }`
3. **Poll for Results** → GET `/api/comedy-style/job/[jobId]`
   - While processing: `{ status: 'queued' | 'processing', jobId: '...' }`
   - When completed: `{ status: 'completed', result: { ... } }`
   - If failed: `{ status: 'failed', error: '...' }`

### Quick Fix Checklist

- [ ] AssemblyAI API key is set in environment variables
- [ ] You're accessing via the correct URL (localhost vs Vercel)
- [ ] Check browser console for specific error messages
- [ ] Check Network tab to see what the polling request returns
- [ ] Verify the job ID is valid (from initial analyze response)
- [ ] Check server logs for backend errors

### Still Having Issues?

1. Check the browser console for detailed error messages
2. Look at the Network tab to see the exact HTTP status and response
3. Share:
   - The error message from console
   - The HTTP status code from Network tab
   - Whether you're on localhost or deployed URL
   - Server logs if available

The improved error handling should now show more specific error messages to help identify the exact issue!

