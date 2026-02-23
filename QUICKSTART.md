# 🚗 BuscaParca - Quick Start Guide

**IMPORTANT:** BuscaParca uses a client-server architecture. You need BOTH the backend server AND mobile app running.

---

## ✅ Everything is Working!

The system has been verified and is ready to use.

---

## Method 1: Automated Startup (Recommended)

Just run this single command:

```bash
./start-buscaparca.sh
```

This will:
- ✓ Start the backend server
- ✓ Verify everything is working
- ✓ Start the mobile app
- ✓ Show you the QR code

---

## Method 2: Manual Startup

### Step 1: Start Backend Server

```bash
cd server
npm start
```

Keep this terminal open.

### Step 2: Start Mobile App (in new terminal)

```bash
npm start
```

Wait for the QR code to appear.

---

## Connect Your Phone

### Option A: Use Expo Go (Easy, for testing)

1. **Install Expo Go** from Google Play Store
2. **Connect to WiFi** - Same network as your computer
3. **Scan QR code** from terminal with Expo Go app

OR manually enter: `exp://192.168.1.120:8081`

### Option B: Test Server First (Recommended)

Before using the mobile app, test the server from your phone:

1. Open browser on your phone
2. Go to: `http://192.168.1.120:3000/test/test.html`
3. Click "Probar Conexión"
4. If it works ✓, proceed to use mobile app

---

## Using the App

1. **Register** - Create account (any email/username/password)
2. **Login** - Sign in
3. **Grant Permissions** - Allow location access
4. **Load Demo Data** - Tap "Demo" button
5. **View Hot Zones** - Colored circles show parking probability
6. **Find Parking** - Tap "APARCAR" button
7. **Provide Feedback** - "Estacioné aquí" or "No encontré lugar"

---

## System Status

Run this anytime to check if everything is working:

```bash
./check-system.sh
```

You should see all green ✓ checkmarks.

---

## Current Configuration

- **Server IP:** 192.168.1.120
- **Server Port:** 3000
- **Server URL:** http://192.168.1.120:3000
- **API Endpoint:** http://192.168.1.120:3000/api
- **Test Page:** http://192.168.1.120:3000/test/test.html
- **Demo Data:** 100 trajectories, 256 events, 8 zones
- **All Tests:** Passing (30/30)

---

## Troubleshooting

### "Can't connect to server"

1. Check server is running:
   ```bash
   curl http://192.168.1.120:3000/
   ```

2. Test from phone browser:
   ```
   http://192.168.1.120:3000/test/test.html
   ```

3. Verify same WiFi network on phone and computer

### "No QR code appears"

Wait 30-60 seconds. If still nothing, try:

```bash
# Kill old processes
pkill -f expo
pkill -f node

# Restart
./start-buscaparca.sh
```

### "Port already in use"

```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8081 | xargs kill -9

# Restart
./start-buscaparca.sh
```

---

## What's Next?

After testing with Expo Go, you can:

### Build Production APK

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

This creates a standalone APK you can install without Expo Go.

---

## Need Help?

- **Server logs:** Check `server.log` file
- **System check:** Run `./check-system.sh`
- **Full docs:** See `SETUP_GUIDE.md`
- **API docs:** See `server/README.md`

---

## Files Created

- ✅ `start-buscaparca.sh` - One-command startup
- ✅ `check-system.sh` - System verification
- ✅ `server/public/test.html` - Browser-based server test
- ✅ `server.log` - Server logs (auto-generated)

---

**You're all set! Run `./start-buscaparca.sh` to begin.**
