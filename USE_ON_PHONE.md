# 📱 Use Comedica on Your Phone

## Option 1: Test Locally (Quick - Same WiFi Required)

### Step 1: Find Your Computer's IP Address

**On Mac:**
```bash
ipconfig getifaddr en0
```

Or check: System Preferences → Network → WiFi → Advanced → TCP/IP

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter

**On Linux:**
```bash
hostname -I
```

### Step 2: Start Backend Server

```bash
cd server
npm start
```

Keep this running! Backend will be on: `http://YOUR_IP:3001`

### Step 3: Start Frontend Server

**In a NEW terminal:**
```bash
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app
npm run dev -- --host
```

The `--host` flag makes it accessible on your network.

### Step 4: Open on Your Phone

1. Make sure your phone is on the **same WiFi network** as your computer
2. Open your phone's browser
3. Go to: `http://YOUR_IP:5173`

**Example:** If your IP is `192.168.1.100`, go to:
```
http://192.168.1.100:5173
```

### Troubleshooting Local Access

**Can't connect?**
- Make sure both devices are on the same WiFi
- Check firewall settings (may need to allow port 5173)
- Try using your computer's local IP (not localhost)

---

## Option 2: Deploy to Vercel (Access from Anywhere!)

Once deployed, you can access the app from anywhere - no WiFi needed!

### Step 1: Deploy Backend

```bash
cd server

# Add environment variables first (via Vercel dashboard or CLI)
# Then deploy:
vercel --prod
```

After deployment, you'll get a URL like: `https://server-xxxxx.vercel.app`

### Step 2: Deploy Frontend

```bash
cd ..

# Deploy frontend
vercel

# Add environment variable in Vercel dashboard:
# VITE_API_URL = https://your-backend-url.vercel.app/api
```

### Step 3: Access on Phone

Open your phone's browser and go to your Vercel frontend URL!

**Example:** `https://comedica.vercel.app`

---

## Quick Start (Local Testing)

1. **Get your IP:**
   ```bash
   ipconfig getifaddr en0
   ```

2. **Start backend** (Terminal 1):
   ```bash
   cd server
   npm start
   ```

3. **Start frontend** (Terminal 2):
   ```bash
   npm run dev -- --host
   ```

4. **On your phone:** Open `http://YOUR_IP:5173`

---

## Make it Installable (PWA)

The app is already set up as a Progressive Web App (PWA)!

**On iPhone:**
1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. It will appear like a native app!

**On Android:**
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Tap "Add to Home Screen" or "Install App"
4. It will appear like a native app!

---

## Tips

- **Local testing:** Only works on same WiFi network
- **Vercel deployment:** Works from anywhere, anytime
- **PWA:** Can be installed like a native app
- **Offline:** Once loaded, works offline (data syncs when online)

