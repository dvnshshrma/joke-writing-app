# 🚀 Deployment Guide

Deploy Comedica so you can access it on your phone and any device!

## Option 1: Vercel (Recommended - Easiest)

Vercel provides free hosting for both frontend and backend.

### Deploy Frontend

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy Frontend:**
   ```bash
   # In the root directory
   vercel
   ```
   - Follow prompts
   - It will detect Vite and configure automatically

### Deploy Backend

1. **Deploy Backend:**
   ```bash
   cd server
   vercel
   ```
   - Follow prompts
   - When asked for environment variables, add:
     - `SUPABASE_URL` = your Supabase URL
     - `SUPABASE_KEY` = your Supabase service role key
     - `GROQ_API_KEY` = free at [console.groq.com/keys](https://console.groq.com/keys)

2. **Get Backend URL:**
   - After deployment, Vercel will give you a URL like: `https://your-backend.vercel.app`
   - Copy this URL

3. **Update Frontend API URL:**
   - Go to your Vercel dashboard
   - Select your frontend project
   - Go to Settings > Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend.vercel.app/api`

4. **Redeploy Frontend:**
   ```bash
   vercel --prod
   ```

### Access on Mobile

Once deployed, you'll get a URL like: `https://comedica.vercel.app`

Open this URL on your phone's browser - it will work perfectly!

## Option 2: Netlify (Frontend) + Railway (Backend)

### Deploy Frontend to Netlify

1. Go to https://netlify.com
2. Sign up/login
3. Click "Add new site" > "Import an existing project"
4. Connect your GitHub repo
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variable: `VITE_API_URL` = your backend URL

### Deploy Backend to Railway

1. Go to https://railway.app
2. Sign up/login
3. Click "New Project" > "Deploy from GitHub"
4. Select your repo
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `PORT` = 3001
6. Railway will give you a URL like: `https://your-app.railway.app`

## Option 3: Render (Full Stack)

1. Go to https://render.com
2. Create account
3. Deploy both frontend and backend as separate services
4. Configure environment variables

## Mobile Optimization

The app is already mobile-responsive! Features:
- ✅ Touch-friendly buttons
- ✅ Responsive layouts
- ✅ Mobile-optimized text sizes
- ✅ Works on all screen sizes

## PWA (Progressive Web App) - Optional

To make it installable on your phone like an app:

1. Add to `index.html`:
   ```html
   <link rel="manifest" href="/manifest.json">
   ```

2. Create `public/manifest.json` (see below)

3. The app can then be "Add to Home Screen" on mobile devices

## Quick Deploy Script

```bash
# Deploy everything to Vercel
npm install -g vercel
vercel login

# Deploy backend
cd server
vercel
# Note the URL it gives you

# Deploy frontend
cd ..
vercel
# Add VITE_API_URL environment variable in Vercel dashboard
```

## Environment Variables Needed

### Backend (Vercel/Railway/Render):
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `PORT` (optional, defaults to 3001)

### Frontend (Vercel/Netlify):
- `VITE_API_URL` = your backend URL (e.g., `https://your-backend.vercel.app/api`)
- `VITE_COMPRESSION_URL` = your compression backend URL (e.g., `https://your-compression-backend.railway.app`)

## Testing on Mobile

1. Deploy the app
2. Get the public URL
3. Open on your phone's browser
4. Test all features
5. Optionally "Add to Home Screen" for app-like experience

