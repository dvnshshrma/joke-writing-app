# 📱 Fix: Accessing Saved Jokes on Phone

## The Problem
When accessing the app on your phone, it was trying to connect to `localhost:3001`, which doesn't work because `localhost` on your phone refers to the phone itself, not your computer.

## The Solution
I've updated the app to automatically detect the correct API URL based on how you're accessing it.

## Steps to Fix

### 1. Make sure backend is running
```bash
cd server
npm start
```
The backend should be running on port 3001.

### 2. Restart the frontend dev server
Stop the current frontend server (Ctrl+C) and restart it:
```bash
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app
npm run dev
```

### 3. Access from your phone
On your phone (same WiFi network), open:
```
http://192.168.2.98:5173
```

**Important:** Use your computer's IP address (`192.168.2.98`), NOT `localhost`.

### 4. Verify it's working
- The app should now connect to the backend automatically
- Your saved jokes should load from the Supabase database
- No more "localStorage only" warnings!

## How It Works Now

The app automatically detects:
- **If you access via `localhost`** → Uses `http://localhost:3001/api`
- **If you access via IP address** → Uses `http://YOUR_IP:3001/api`
- **If deployed to Vercel** → Uses the Vercel backend URL (set in environment variables)

## If Your IP Address Changes

If your computer gets a new IP address:
1. Find your new IP: `ipconfig getifaddr en0`
2. Update `.env` file: `VITE_API_URL=http://NEW_IP:3001/api`
3. Restart the frontend dev server

## Troubleshooting

**Still seeing "localStorage only" error?**
1. Check backend is running: `curl http://192.168.2.98:3001/api/jokes`
2. Check you're accessing via IP, not localhost
3. Check both devices are on the same WiFi network
4. Check firewall isn't blocking port 3001

**Backend not accessible?**
- Make sure backend is running: `cd server && npm start`
- Check the port: Should be `3001`
- Try accessing from your computer's browser: `http://localhost:3001/api/jokes`

