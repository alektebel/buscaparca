# BuscaParca - Parking Prediction App (Client-Server Architecture)

A complete parking prediction system with an Android mobile app and Node.js backend server, similar to Google Maps but specifically for finding parking spaces.

## 🏗️ Architecture

This project uses a **client-server architecture**:

- **Mobile App** (React Native + Expo): Android application that displays maps and communicates with the server
- **Backend Server** (Node.js + Express): Runs on your computer, handles ML predictions and database

```
┌─────────────────┐         API Calls         ┌──────────────────┐
│                 │  ◄────────────────────►   │                  │
│  Android App    │  http://YOUR_IP:3000/api  │  Node.js Server  │
│  (Mobile)       │                            │  (Your Computer) │
│                 │                            │                  │
└─────────────────┘                            └──────────────────┘
                                                        │
                                                        ▼
                                                   SQLite DB
                                                   ML Model
```

## 🚀 Quick Start

### Step 1: Start the Backend Server

```bash
# Navigate to server directory
cd server

# Install dependencies (first time only)
npm install

# Start the server
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

### Step 2: Find Your Computer's IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.120`)

**On Mac/Linux:**
```bash
ifconfig
# or
ip addr
```
Look for your local IP (e.g., `192.168.1.120`)

### Step 3: Update Mobile App Configuration

Edit `src/services/ApiService.js` and update the SERVER_URL with your IP:

```javascript
const SERVER_URL = 'http://192.168.1.120:3000/api';  // Replace with YOUR IP
```

### Step 4: Run the Mobile App

```bash
# In the main project directory
npm start
```

Scan the QR code with Expo Go app on your Android phone.

**Important:** Make sure your phone and computer are on the same WiFi network!

### Step 5: Load Demo Data

1. Open the app on your phone
2. Login (or register if first time)
3. Wait for the map to load
4. Tap the **"Demo"** button in the header
5. Confirm to load sample data
6. Watch the hot zones appear on the map!

## 📱 Mobile App Features

- ✅ **Google Maps-like Interface** with interactive map
- ✅ **Hot Zones Visualization** - Color-coded circles showing parking probability
  - 🟢 Green: High probability (>70%)
  - 🟡 Yellow: Medium probability (40-70%)
  - 🔴 Red: Low probability (<40%)
- ✅ **Smart Parking Search** - Tap "APARCAR" to find best parking
- ✅ **Real-time Location** tracking
- ✅ **User Feedback** - Report if you found parking or not
- ✅ **Server Connection Indicator** - See if connected to your computer

## 🖥️ Server Features

- ✅ **REST API** for all parking operations
- ✅ **ML Model** for intelligent predictions
- ✅ **SQLite Database** for storing parking history
- ✅ **Demo Data Seeding** for testing
- ✅ **Real-time Hot Zone** calculation
- ✅ **Trajectory Tracking** for future ML improvements

## 📡 API Endpoints

The server exposes these endpoints:

```
GET  /api/parking/hot-zones          - Get parking hot zones
GET  /api/parking/find-parking       - Find best parking spot
GET  /api/parking/predict            - Predict parking probability
POST /api/parking/trajectory         - Record user movement
POST /api/parking/parking-event      - Record parking attempt
GET  /api/parking/stats              - Get database statistics
POST /api/seed                       - Load demo data
```

## 🗂️ Project Structure

```
buscaparca/
├── src/                      # Mobile app source
│   ├── screens/             # App screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   └── MainScreen.js    # Main map screen
│   └── services/
│       ├── ApiService.js    # Server communication
│       └── AuthService.js   # Authentication
├── server/                   # Backend server
│   ├── src/
│   │   ├── database/        # SQLite database
│   │   │   └── db.js
│   │   ├── services/        # Business logic
│   │   │   └── ParkingMLModel.js
│   │   ├── routes/          # API routes
│   │   │   └── parking.js
│   │   ├── index.js         # Server entry point
│   │   └── seed-data.js     # Demo data generator
│   ├── package.json
│   └── README.md
├── App.js
├── package.json
└── README.md
```

## 🎯 How It Works

### Finding Parking

1. **User opens app** → App connects to your server
2. **User taps "APARCAR"** → App sends location to server
3. **Server processes request:**
   - Queries database for historical parking events
   - Runs ML model to predict probability
   - Calculates hot zones based on success rates
   - Returns best parking suggestions
4. **App displays results** → Shows hot zones and best parking spot
5. **User provides feedback** → "Estacioné aquí" or "No encontré lugar"
6. **Server learns** → Stores feedback to improve future predictions

### ML Prediction Model

The server uses a baseline ML model that combines:

- **40% Time Factor** - Rush hours, weekends, time of day
- **30% Spatial Factor** - Proximity to successful parking zones
- **30% Location History** - Past success rates at exact location

### Hot Zones

Hot zones are calculated by:
1. Aggregating parking events in the database
2. Calculating success rate per zone (successful/total attempts)
3. Filtering zones with at least 3 data points
4. Displaying as colored circles on the map

## 📊 Database

The server stores three types of data:

### trajectories
User movement data for future ML training
- User ID, location, speed, heading, timestamp

### parking_events
Parking search attempts and outcomes
- Location, time, success/failure, search duration

### parking_zones
Aggregated statistics per location
- Location, success count, total count, success rate

## 🧪 Testing

### Test Server API

```bash
# Health check
curl http://localhost:3000/

# Load demo data
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7128, "longitude": -74.0060}'

# Get hot zones
curl "http://localhost:3000/api/parking/hot-zones?latitude=40.7128&longitude=-74.0060"

# Find parking
curl "http://localhost:3000/api/parking/find-parking?latitude=40.7128&longitude=-74.0060"

# Get stats
curl http://localhost:3000/api/parking/stats
```

### Test Mobile App

```bash
# Run tests
npm test
```

## 🔧 Troubleshooting

### App shows "Servidor desconectado"

1. Check server is running: Look for console output
2. Verify your IP address in `ApiService.js`
3. Ensure phone and computer on same WiFi
4. Check firewall isn't blocking port 3000
5. Try accessing `http://YOUR_IP:3000` from phone's browser

### No hot zones visible

1. Tap the "Demo" button to load sample data
2. Wait a few seconds for data to load
3. Check server console for errors

### Package version warnings

```bash
npx expo install --fix
```

### Port 3000 already in use

```bash
# Find and kill the process
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Or use a different port
PORT=8080 npm start
```

### Can't build Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build -p android --profile preview
```

## 📱 Building for Android

### Method 1: Expo Go (Development)
1. Install "Expo Go" from Google Play Store
2. Run `npm start` on your computer
3. Scan QR code with Expo Go app

### Method 2: Standalone APK (Production)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build APK
eas build -p android --profile preview

# Download and install APK on your phone
```

## 🎨 Customization

### Change Server Port

Edit `server/src/index.js`:
```javascript
const PORT = process.env.PORT || 3000;  // Change 3000 to your port
```

### Change Hot Zone Colors

Edit `src/screens/MainScreen.js`:
```javascript
let color = 'rgba(255, 193, 7, 0.3)'; // yellow (medium)
if (zone.successRate > 0.7) {
  color = 'rgba(76, 175, 80, 0.4)'; // green (high)
} else if (zone.successRate < 0.4) {
  color = 'rgba(244, 67, 54, 0.3)'; // red (low)
}
```

### Adjust Trajectory Recording Interval

Edit `src/screens/MainScreen.js`:
```javascript
}, 30000); // 30 seconds - change this value
```

## 🚧 Future Enhancements

- [ ] Real-time parking sensor integration
- [ ] Navigation to parking spot
- [ ] Payment integration
- [ ] Multi-city support
- [ ] Advanced ML models (TensorFlow.js)
- [ ] Push notifications
- [ ] Parking history
- [ ] User preferences
- [ ] Offline mode

## 📝 License

MIT

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server console logs
3. Check mobile app console in Expo
4. Ensure all dependencies are installed
5. Try restarting both server and app

## 🎓 How to Use

### For First-Time Users

1. **Start the server** on your computer
2. **Find your IP address** and update `ApiService.js`
3. **Run the mobile app** with `npm start`
4. **Register** a new account in the app
5. **Grant location permissions** when prompted
6. **Tap "Demo" button** to load sample data
7. **See hot zones** appear as colored circles
8. **Tap "APARCAR"** to find best parking spot
9. **Provide feedback** to help improve predictions

### Understanding the Map

- **Blue circle**: Your location (500m radius)
- **Green zones**: High success rate (>70%)
- **Yellow zones**: Medium success rate (40-70%)
- **Red zones**: Lower success rate (<40%)
- **Blue marker**: Best recommended parking spot
- **Yellow/Green markers**: Other good parking options

### Tips

- The more you use the app and provide feedback, the better it gets!
- Hot zones update in real-time as new data is collected
- The ML model learns from your parking patterns
- Demo data is just for testing - real data builds up over time
