# 📱 BuscaParca - Phone Testing Guide

## ✅ Server is Running and Tested!

The backend server is confirmed working on:
- **URL:** http://192.168.1.120:3000

---

## 🧪 Test from Your Phone (3 Easy Steps)

### **Step 1: Simple Connection Test**

Open your phone's browser and go to:

```
http://192.168.1.120:3000/test/index.html
```

**What you should see:**
- ✅ Green checkmark saying "Si ves esta página, el servidor está funcionando!"
- Links to test different features
- Your IP address displayed

**If you DON'T see this:**
- Your phone is not on the same WiFi network as your computer
- The server is not running (run `cd server && npm start`)
- Check firewall settings

---

### **Step 2: Interactive Test Page**

On your phone browser, go to:

```
http://192.168.1.120:3000/test/test.html
```

**Then tap these buttons in order:**

1. **🔌 Probar Conexión** - Should show green "Servidor conectado correctamente!"
2. **📊 Estadísticas** - Should show 100 trajectories, 256 events, 8 zones
3. **🗺️ Zonas Calientes** - Should show 8 colored parking zones
4. **🎯 Probar Predicción** - Should show a parking probability percentage

**All 4 buttons should work!** If they do, your server is 100% working.

---

### **Step 3: Test Mobile App**

Now that the server works, test the mobile app:

1. **Install Expo Go** from Google Play Store
2. On your computer, run: `./start-buscaparca.sh`
3. **Scan QR code** with Expo Go app
4. **Register/Login** in the app
5. **Tap "Demo"** button to load data
6. **Tap "APARCAR"** to test parking search

---

## 🔧 What Each Test Does

### Test 1: index.html (Basic HTML)
- Tests if your phone can reach the server at all
- No JavaScript required
- Simplest possible test
- Shows clickable links to API endpoints

### Test 2: test.html (Interactive JavaScript)
- Tests AJAX calls from browser to server
- Tests all 4 main API endpoints
- Shows formatted results
- Proves the server API is responding correctly

### Test 3: Mobile App (Full Integration)
- Tests the React Native app
- Tests location services
- Tests map rendering
- Tests full parking prediction workflow

---

## ❌ Troubleshooting

### "Can't load the page" (Test 1 fails)

**Problem:** Phone can't reach server

**Solutions:**
1. Check WiFi - Phone and computer must be on SAME network
2. Check server is running:
   ```bash
   curl http://192.168.1.120:3000/
   ```
3. Check firewall:
   ```bash
   sudo ufw allow 3000
   # or on some systems:
   sudo firewall-cmd --add-port=3000/tcp
   ```

### "Buttons don't work" (Test 2 fails)

**Problem:** JavaScript can't fetch API data

**Solutions:**
1. Check CORS is enabled (already done)
2. Check API endpoints manually:
   ```bash
   curl http://192.168.1.120:3000/api/parking/stats
   ```
3. Look at browser console for errors (open developer tools on phone)

### "Expo Go won't connect" (Test 3 fails)

**Problem:** Mobile app can't reach server

**Solutions:**
1. First, make sure Test 1 and Test 2 work!
2. Check IP in `src/services/ApiService.js` matches 192.168.1.120
3. Restart Expo server:
   ```bash
   pkill -f expo
   ./start-buscaparca.sh
   ```

---

## 📊 Expected Test Results

### ✅ Success Looks Like:

**Test 1 (index.html):**
```
✓ Si ves esta página, el servidor está funcionando!
```

**Test 2 (test.html):**
```
Button 1: ✅ ¡Servidor conectado correctamente!
Button 2: 📊 100 trayectorias, 256 eventos, 8 zonas
Button 3: 🗺️ 8 zonas encontradas (with colored boxes)
Button 4: 🎯 Probability: XX.X% (a percentage number)
```

**Test 3 (Mobile App):**
```
- Login screen appears
- After login, map loads
- "Demo" button loads data successfully
- Hot zones (colored circles) appear on map
- "APARCAR" button shows parking predictions
```

---

## 🎯 Quick Command Reference

**Test server from computer:**
```bash
curl http://192.168.1.120:3000/
curl http://192.168.1.120:3000/api/parking/stats
```

**Check if server is running:**
```bash
lsof -i:3000
```

**Start server:**
```bash
cd server && npm start
```

**Start mobile app:**
```bash
./start-buscaparca.sh
```

**Check system:**
```bash
./check-system.sh
```

---

## 📱 Phone URLs Bookmark These!

Save these URLs on your phone for quick testing:

1. **Simple Test:** http://192.168.1.120:3000/test/index.html
2. **Interactive Test:** http://192.168.1.120:3000/test/test.html
3. **API Status:** http://192.168.1.120:3000/
4. **Statistics:** http://192.168.1.120:3000/api/parking/stats

---

**Start with Test 1, then Test 2, then Test 3. Good luck! 🚀**
