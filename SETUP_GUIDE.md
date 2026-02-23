# BuscaParca - Complete Setup Guide

This guide will help you set up and run the BuscaParca parking prediction system with the Android app and backend server.

## What You're Building

A parking finder app similar to Google Maps, but specifically for finding parking spaces. The system consists of:

1. **Android Mobile App** - Shows a map with hot zones for parking
2. **Backend Server** - Runs on your computer, handles ML predictions
3. **Database** - Stores parking data and learns over time

## Prerequisites

- Computer with Node.js installed (Windows, Mac, or Linux)
- Android phone
- Both on the same WiFi network

## Part 1: Server Setup (5 minutes)

### 1. Open Terminal/Command Prompt

Navigate to the project:
```bash
cd /home/diego/Development/archive/buscaparca
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

Wait for installation to complete (~1-2 minutes).

### 3. Start the Server

```bash
npm start
```

You should see:
```
==================================================
BuscaParca Server running on port 3000
API available at: http://localhost:3000
Network access: http://0.0.0.0:3000
==================================================
```

**Keep this terminal window open!** The server needs to stay running.

### 4. Find Your Computer's IP Address

Open a NEW terminal window and run:

**On Linux/Mac:**
```bash
hostname -I | awk '{print $1}'
```

**On Windows (Command Prompt):**
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.

You'll get something like: `192.168.1.120`

**Write this down!** You'll need it in the next step.

## Part 2: Mobile App Configuration (2 minutes)

### 1. Update Server URL

Open this file in a text editor:
```
src/services/ApiService.js
```

Find line 4 and replace `192.168.1.120` with YOUR IP address from Part 1, Step 4:

```javascript
const SERVER_URL = 'http://YOUR_IP_HERE:3000/api';
```

Example:
```javascript
const SERVER_URL = 'http://192.168.1.120:3000/api';  // Use YOUR IP
```

Save the file.

### 2. Install Mobile App Dependencies

In a NEW terminal (keep server running in the other one):

```bash
cd /home/diego/Development/archive/buscaparca
npm install
```

### 3. Start the Mobile App

```bash
npm start
```

You'll see a QR code in the terminal.

## Part 3: Running on Your Android Phone (3 minutes)

### 1. Install Expo Go

On your Android phone:
1. Open Google Play Store
2. Search for "Expo Go"
3. Install the app

### 2. Connect to the App

1. Open Expo Go on your phone
2. Tap "Scan QR code"
3. Point your camera at the QR code in the terminal
4. Wait for the app to load (~30 seconds first time)

## Part 4: Using the App (2 minutes)

### 1. Register/Login

1. The app opens to the login screen
2. Tap "¿No tienes cuenta? Regístrate"
3. Enter:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `123456`
4. Tap "Registrarse"
5. Go back and login with same credentials

### 2. Grant Location Permission

When prompted, tap "Allow" to give location access.

### 3. Load Demo Data

1. Wait for the map to load
2. You'll see a green "Demo" button in the top right
3. Check that the status shows "Servidor conectado" (Server connected)
   - If it shows "Servidor desconectado":
     - Check the server is running
     - Verify you updated the IP address correctly
     - Make sure phone and computer are on same WiFi
4. Tap the "Demo" button
5. Tap "Cargar" to confirm
6. Wait 2-3 seconds

### 4. See the Magic!

You should now see:
- **Colored circles** on the map (hot zones!)
  - Green = High probability of parking (>70%)
  - Yellow = Medium probability (40-70%)
  - Red = Low probability (<40%)
- **Markers** showing specific parking zones

### 5. Find Parking

1. Tap the big blue **"APARCAR"** button at the bottom
2. The app will show you the best parking spot nearby
3. Tap "Estacioné aquí" if you parked successfully
4. Or tap "No encontré lugar" if you didn't find parking

Your feedback helps the system learn and improve!

## Troubleshooting

### Problem: App shows "Servidor desconectado"

**Solution:**
1. Check the server terminal - should say "BuscaParca Server running"
2. Verify IP address in `ApiService.js` matches your computer's IP
3. Make sure phone and computer are on the same WiFi network
4. Try accessing `http://YOUR_IP:3000` from your phone's browser
5. Check your firewall isn't blocking port 3000

### Problem: No hot zones visible after tapping Demo

**Solution:**
1. Check the server terminal for error messages
2. Wait 5 seconds and zoom out/in on the map
3. Try restarting the server:
   - Press Ctrl+C in server terminal
   - Run `npm start` again
4. Reload the app (shake phone and tap "Reload")

### Problem: "Expo Go not installed"

**Solution:**
1. Open Google Play Store on your phone
2. Search "Expo Go"
3. Install it
4. Try scanning QR code again

### Problem: QR code not scanning

**Solution:**
1. In the terminal with QR code, press `w` to open in web browser
2. Or press `a` to open Android emulator if you have Android Studio

### Problem: Package version warnings

**Solution:**
```bash
cd /home/diego/Development/archive/buscaparca
npx expo install --fix
```

### Problem: Port 3000 already in use

**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use different port
PORT=8080 npm start
```
Then update `ApiService.js` to use port 8080.

## Testing the System

### Test 1: Server API

In a new terminal:
```bash
# Health check
curl http://localhost:3000/

# Should return server information
```

### Test 2: Hot Zones

```bash
curl "http://localhost:3000/api/parking/hot-zones?latitude=40.7128&longitude=-74.0060"

# Should return JSON with parking zones
```

### Test 3: Mobile App Tests

```bash
cd /home/diego/Development/archive/buscaparca
npm test

# Should show: "Tests: 30 passed, 30 total"
```

## Understanding What You See

### Map Elements

- **Blue circle around your location**: 500-meter search radius
- **Green zones**: 70%+ success rate finding parking
- **Yellow zones**: 40-70% success rate  
- **Red zones**: Below 40% success rate
- **Markers with numbers**: Specific parking zones ranked by probability

### How It Works

1. Server stores parking events in a database
2. ML model analyzes:
   - Time patterns (rush hours, weekends)
   - Location history (where people successfully parked)
   - Distance from your location
3. Calculates probability for each zone
4. Displays as colored circles and markers
5. Learns from your feedback to improve predictions

## Next Steps

### Use Real Data

After testing with demo data:
1. Drive around your neighborhood
2. Use the app to find parking
3. Always provide feedback (found parking or not)
4. The system learns from your real usage
5. After 50+ parking attempts, predictions become very accurate

### Share with Friends

1. Friends install Expo Go
2. Scan the same QR code
3. Everyone's data helps improve predictions
4. More users = better accuracy!

### Build Production APK

To create an installable APK file:

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build APK
eas build -p android --profile preview

# Download APK and install on phone
```

## Server Management

### Starting the Server

```bash
cd /home/diego/Development/archive/buscaparca/server
npm start
```

### Stopping the Server

Press `Ctrl+C` in the server terminal.

### Viewing Server Logs

All requests appear in the server terminal:
```
2024-01-15T10:30:00.000Z - GET /api/parking/hot-zones
2024-01-15T10:30:05.000Z - GET /api/parking/find-parking
2024-01-15T10:30:10.000Z - POST /api/parking/parking-event
```

### Database Location

The database file is created at:
```
/home/diego/Development/archive/buscaparca/server/buscaparca.db
```

You can view it with any SQLite browser.

## Quick Reference Commands

### Start Everything

Terminal 1 (Server):
```bash
cd /home/diego/Development/archive/buscaparca/server
npm start
```

Terminal 2 (Mobile App):
```bash
cd /home/diego/Development/archive/buscaparca
npm start
```

### Find Your IP
```bash
hostname -I | awk '{print $1}'  # Linux/Mac
ipconfig                         # Windows
```

### Test Server
```bash
curl http://localhost:3000/
```

### Run Tests
```bash
npm test
```

### Clear Demo Data

If you want to start fresh:
```bash
cd server
rm buscaparca.db
npm start  # Database recreates automatically
```

## Tips for Best Results

1. **Always provide feedback** - Tap "Estacioné aquí" or "No encontré lugar"
2. **Use in different areas** - The more locations, the better
3. **Try different times** - Morning, evening, weekends
4. **Keep server running** - Leave it on your computer
5. **Same WiFi network** - Phone and computer must be connected to same network

## Success Checklist

- [ ] Server installed and running (see "BuscaParca Server running" message)
- [ ] Got your computer's IP address
- [ ] Updated `ApiService.js` with your IP
- [ ] Mobile app dependencies installed
- [ ] Expo Go installed on phone
- [ ] Phone and computer on same WiFi
- [ ] App running and showing "Servidor conectado"
- [ ] Demo data loaded successfully
- [ ] Can see colored hot zones on map
- [ ] "APARCAR" button finds parking spots

If all checkboxes are checked, you're ready to go! 🎉

## Questions?

Common issues are covered in the Troubleshooting section above. If you're still stuck:

1. Check both terminal windows for error messages
2. Verify all steps in Part 1-4 were completed
3. Try restarting both server and app
4. Make sure no firewall is blocking the connection

Good luck finding parking! 🚗🅿️
