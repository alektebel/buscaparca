# BuscaParca Android - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Android Studio installed
- Android device/emulator (Android 7.0+)
- Node.js installed
- PC and phone on same WiFi

---

## Step 1: Start the Server

```bash
cd server
npm install
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

---

## Step 2: Find Your PC's IP Address

**Linux/Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```cmd
ipconfig
```

Look for something like: `192.168.1.120`

---

## Step 3: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs:
   - Maps SDK for Android
   - Directions API
4. Go to "Credentials" → Create API Key
5. Copy your API key

---

## Step 4: Configure Android App

1. Open `android-app` folder in Android Studio
2. Wait for Gradle sync to complete

3. **Add your API key:**
   
   Open `app/src/main/res/values/strings.xml`:
   ```xml
   <string name="google_maps_key">PASTE_YOUR_API_KEY_HERE</string>
   ```

4. **Set server URL:**
   
   Open `app/src/main/java/com/buscaparca/data/api/ApiClient.kt`:
   ```kotlin
   private const val BUSCAPARCA_BASE_URL = "http://YOUR_PC_IP:3000/"
   ```
   Replace `YOUR_PC_IP` with the IP from Step 2.

---

## Step 5: Build and Run

1. Connect Android device via USB (or start emulator)
2. Enable USB debugging on device
3. In Android Studio, click the green "Run" button (or press Shift+F10)
4. Select your device
5. Wait for build to complete

---

## Step 6: Use the App

1. **First Launch:**
   - Grant location permissions when prompted
   - Create an account (username, email, password)
   - Login

2. **Find Parking:**
   - Tap "FIND PARKING" button
   - App will show best parking spot with blue route
   - Follow the navigation

3. **Provide Feedback:**
   - When you arrive, tap "PARKED HERE" if you found parking
   - Or tap "NO PARKING" to try another spot

4. **View Hot Zones:**
   - See color-coded circles on map:
     - 🟢 Green = High success rate
     - 🟡 Yellow = Medium success rate
     - 🔴 Red = Low success rate

---

## Troubleshooting

### Map is blank
→ Check that you added the correct Google Maps API key

### "Cannot connect to server"
→ Make sure PC and phone are on same WiFi network
→ Verify server is running on port 3000
→ Check firewall isn't blocking port 3000

### Location not working
→ Grant location permissions in phone settings
→ Enable GPS/Location services
→ Make sure Google Play Services is installed

### Build errors
→ In Android Studio: File → Invalidate Caches / Restart
→ Or: Build → Clean Project, then Build → Rebuild Project

---

## Testing the Madrid Integration

Once running, the app will:
- Automatically fetch real-time Madrid parking data
- Display official parking garages with live availability
- Show as green (available) or red (occupied) zones
- Combine with community-reported street parking

To test Madrid endpoints directly:
```bash
# Get real-time Madrid parking
curl http://localhost:3000/api/madrid/parking

# Find parking near Puerta del Sol
curl "http://localhost:3000/api/madrid/find-nearby?latitude=40.4168&longitude=-3.7038&radius=1000"
```

---

## Next Steps

- Read `android-app/README.md` for detailed documentation
- Read `ANDROID_APP_COMPLETE.md` for complete project overview
- Explore the code structure
- Customize for your needs
- Build release APK for distribution

---

## Quick Commands

**Server:**
```bash
npm start              # Start server
npm run dev            # Start with auto-reload
npm run seed           # Seed demo data
```

**Android:**
```bash
./gradlew assembleDebug      # Build debug APK
./gradlew assembleRelease    # Build release APK
./gradlew clean              # Clean build
```

---

## Key Files to Know

- `MainActivity.kt` - Main map screen
- `ApiClient.kt` - Server configuration
- `strings.xml` - API key location
- `AndroidManifest.xml` - Permissions

---

## Getting Help

1. Check logs:
   - Android: View → Tool Windows → Logcat
   - Server: Check console output

2. Common issues documented in:
   - `android-app/README.md`
   - `ANDROID_APP_COMPLETE.md`

3. Verify setup:
   - Server running? Visit http://localhost:3000
   - API key valid? Check Google Cloud Console
   - Correct IP? Ping from phone

---

**That's it! You're ready to find parking in Madrid! 🎉**
