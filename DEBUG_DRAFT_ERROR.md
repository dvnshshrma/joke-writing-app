# 🔍 Debug: Draft Saving Not Working

## Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Try saving a draft again
4. Look for any red error messages
5. **Copy the exact error message** you see

## Step 2: Check Backend Logs
1. Look at your terminal where the backend server is running
2. Try saving a draft again
3. Look for error messages in the terminal
4. **Copy any error messages** you see

## Step 3: Verify Database Table Exists
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor**
4. Check if you see a `sets` table
5. If not, run the SQL script from `SETUP_SETS_TABLE.md`

## Step 4: Verify Table Has All Columns
1. In Supabase, click on the `sets` table
2. Check if these columns exist:
   - `id`
   - `header`
   - `type`
   - `jokes`
   - `joke_details`
   - `transitions`
   - `is_draft` ⚠️ **This is important!**
   - `created_at`
   - `updated_at`

## Step 5: Test the API Directly
Open your browser console and run this:

```javascript
fetch('http://localhost:3001/api/sets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'test-' + Date.now(),
    header: 'Test Set',
    type: 'short',
    jokes: [],
    jokeDetails: [],
    transitions: [],
    isDraft: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**What error do you get?** Copy it here.

## Common Issues & Fixes

### Issue 1: "relation sets does not exist"
**Fix:** Run the SQL script from `SETUP_SETS_TABLE.md`

### Issue 2: "column is_draft does not exist"
**Fix:** Run this SQL:
```sql
ALTER TABLE sets ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT true;
```

### Issue 3: "permission denied" or "policy"
**Fix:** Run this SQL:
```sql
DROP POLICY IF EXISTS "Allow all operations on sets" ON sets;
CREATE POLICY "Allow all operations on sets" ON sets
  FOR ALL USING (true) WITH CHECK (true);
```

### Issue 4: Backend not running
**Fix:** Start the backend:
```bash
cd server
npm start
```

## What I Changed
I've improved error handling to show more detailed error messages. The errors will now tell you exactly what's wrong:
- Missing table
- Missing column
- Permission issues
- Other database errors

**Please share the exact error message you see** so I can help you fix it!

