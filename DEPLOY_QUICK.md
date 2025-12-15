# ⚡ Quick Deploy to Vercel

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Login

```bash
vercel login
```

## Step 3: Deploy Backend

```bash
cd server
vercel
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name: **comedica-server** (or any name)
- Directory: **./server**
- Override settings? **No**

After deployment, **copy the URL** (e.g., `https://comedica-server.vercel.app`)

## Step 4: Add Environment Variables (Backend)

1. Go to https://vercel.com/dashboard
2. Select your backend project
3. Go to **Settings** > **Environment Variables**
4. Add:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_KEY` = your Supabase key
5. **Redeploy** (or it will auto-redeploy)

## Step 5: Deploy Frontend

```bash
cd ..
vercel
```

When prompted:
- Set up and deploy? **Yes**
- Link to existing project? **No**
- Project name: **comedica** (or any name)
- Directory: **./**
- Override settings? **No**

## Step 6: Configure Frontend Environment

1. Go to Vercel dashboard
2. Select your frontend project
3. Go to **Settings** > **Environment Variables**
4. Add:
   - `VITE_API_URL` = `https://your-backend-url.vercel.app/api`
5. **Redeploy** frontend

## Step 7: Access on Mobile! 📱

Your app will be live at: `https://your-frontend.vercel.app`

Open this URL on your phone - it works perfectly!

## Testing Locally on Mobile

While developing, you can test on your phone:

1. Find your computer's IP address:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or
   ipconfig getifaddr en0
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. On your phone (same WiFi), open:
   `http://YOUR_IP:5173`

Example: `http://192.168.1.100:5173`

