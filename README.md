# BuscaParca 🚗

A cross-platform mobile application (Android/iOS) to help you find parking spots near your location with ML-powered probability predictions and hot zone visualization.

**Note:** BuscaParca uses a **client-server architecture**. The mobile app communicates with a Node.js backend server running on your computer for ML predictions and data storage. See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete setup instructions.

## Features

- ✅ **User Authentication**: Secure login and registration system with email, username, and password
- ✅ **Session Management**: Persistent user sessions with automatic login
- ✅ **Large APARCAR Button**: One-tap parking search functionality
- ✅ **Interactive Maps**: Google Maps-like interface showing your location and parking zones
- ✅ **Hot Zones Visualization**: Color-coded circular overlays showing parking probability zones
  - Green zones: High probability (>70%)
  - Yellow zones: Medium probability (40-70%)
  - Red zones: Low probability (<40%)
- ✅ **ML-Powered Predictions**: Baseline machine learning model for intelligent parking predictions
- ✅ **Real-time Location**: GPS tracking with trajectory recording for future model training
- ✅ **Database Storage**: SQLite database for storing user trajectories and parking events
- ✅ **Smart Probability**: Algorithm that calculates parking probability based on:
  - Historical parking success rates at specific locations
  - Time-based patterns (day of week, hour)
  - Spatial clustering of successful parking events
  - Distance-weighted probability scoring
- ✅ **User Feedback Loop**: Records parking attempts to continuously improve predictions
- ✅ **Demo Data**: Seed utility to populate sample data for testing and visualization

## Technology Stack

### Mobile App (Client)
- **React Native** with **Expo SDK 50** for cross-platform development
- **React Navigation** for screen navigation
- **React Native Maps** for Google Maps-like interface
- **Expo Location** for GPS and location services
- **AsyncStorage** for session persistence
- **Jest** for comprehensive testing

### Backend Server
- **Node.js** with **Express.js** for REST API
- **SQLite** for database storage
- **Custom ML Model** for parking predictions
- **CORS** enabled for mobile app communication

## Architecture

BuscaParca uses a **client-server architecture**:

- **Mobile App (Client)**: React Native/Expo app running on Android/iOS
- **Backend Server**: Node.js server running on your local computer
- **Communication**: REST API over WiFi (both devices on same network)
- **Data Storage**: SQLite database on the server
- **ML Processing**: Server-side parking predictions

For detailed architecture documentation, see [CLIENT_SERVER_README.md](CLIENT_SERVER_README.md).

### Mobile App Services

1. **ApiService** (`src/services/ApiService.js`)
   - Communicates with backend server via REST API
   - Handles hot zones, predictions, trajectory recording
   - Server connection testing and health checks

2. **AuthService** (`src/services/AuthService.js`)
   - Local user authentication
   - Session management with AsyncStorage
   - Login/register functionality

### Backend Server Services

1. **DatabaseService** (`server/src/database/db.js`)
   - SQLite database management
   - Tables: trajectories, parking_events, parking_zones
   - Automatic zone statistics calculation
   - Query optimization with indexes

2. **ParkingMLModel** (`server/src/services/ParkingMLModel.js`)
   - Baseline ML model using statistical analysis
   - Time-based probability factors
   - Spatial clustering analysis
   - Distance calculations using Haversine formula
   - Hot zone distribution generation

3. **REST API** (`server/src/routes/parking.js`)
   - 7 endpoints for parking operations
   - POST /api/parking/trajectory - Record movement
   - POST /api/parking/parking-event - Record parking attempt
   - GET /api/parking/hot-zones - Get visualization zones
   - GET /api/parking/find-parking - Find best spots
   - GET /api/parking/predict - Get parking probability
   - GET /api/parking/stats - Database statistics
   - POST /api/seed - Load demo data

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Android phone or emulator
- WiFi network (same network for phone and computer)
- For iOS: Xcode (macOS only) and iOS device
- For Android: Android Studio (for emulator) or Android device

## Quick Start

**Important:** BuscaParca requires both the backend server AND the mobile app to be running. Follow these steps in order:

### 1. Start the Backend Server

```bash
# Navigate to server directory
cd server

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

The server will start on `http://192.168.1.120:3000` (using your actual IP).

### 2. Configure Mobile App

The app is already configured for IP `192.168.1.120`. If your computer has a different IP:

1. Find your computer's IP address:
   - Linux/Mac: `hostname -I | awk '{print $1}'`
   - Windows: `ipconfig` (look for IPv4 Address)

2. Update `src/services/ApiService.js` line 4 with your IP address

### 3. Start the Mobile App

```bash
# From project root
npm install  # First time only
npm start
```

Then scan the QR code with Expo Go app on your phone.

### 4. Load Demo Data

1. Open the app and register/login
2. Tap "Demo" button in the header
3. Hot zones will appear on the map

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

## Installation

### Backend Server Setup

### Backend Server Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install server dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will run on port 3000 and display your IP address.

### Mobile App Setup

1. Clone the repository (if not done already):
```bash
git clone https://github.com/alektebel/buscaparca.git
cd buscaparca
```

2. Install mobile app dependencies:
```bash
npm install
```

3. Update server IP in `src/services/ApiService.js` if needed

4. Start the development server:
4. Start the development server:
```bash
npm start
```

## Running the App

**IMPORTANT:** Make sure the backend server is running first!

### Using Expo Go (Recommended for Development)

1. **Start backend server:**
```bash
cd server && npm start
```

2. **In a new terminal, start mobile app:**
```bash
npm start
```

3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

4. **Ensure phone and computer are on the same WiFi network**

### Running on Emulator/Simulator

**iOS Simulator** (macOS only):
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

## Testing

### Mobile App Tests

Run the comprehensive test suite:
```bash
npm test
```

Test coverage includes:
- Database operations
- ML model predictions
- Parking service logic
- Authentication flows
- UI components

All 30 tests should pass.

### Backend Server Tests

```bash
cd server
npm test
```

### Manual Testing

1. Start both server and mobile app
2. Check server connection indicator in app (green = connected)
3. Tap "Demo" button to load sample data
4. Verify hot zones appear on map
5. Tap "APARCAR" to test parking predictions

## Configuration

### Google Maps API Key (Android)

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Update `app.json`:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ACTUAL_API_KEY"
    }
  }
}
```

### Location Permissions

The app automatically requests location permissions when needed. Make sure to grant them for full functionality.

## Project Structure

```
buscaparca/
├── server/                    # Backend Node.js server
│   ├── src/
│   │   ├── index.js          # Express server entry point
│   │   ├── database/
│   │   │   └── db.js         # SQLite database operations
│   │   ├── services/
│   │   │   └── ParkingMLModel.js  # ML prediction model
│   │   ├── routes/
│   │   │   └── parking.js    # API endpoints
│   │   └── seed-data.js      # Demo data generator
│   ├── package.json
│   ├── README.md             # Server API documentation
│   └── buscaparca.db         # SQLite database (auto-created)
├── __tests__/                # Mobile app test suites
│   ├── app.test.js
│   ├── database.test.js
│   ├── screens.test.js
│   └── services.test.js
├── assets/                   # App images and icons
├── src/
│   ├── screens/             # Application screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   └── MainScreen.js    # Map with hot zones
│   └── services/            # Client services
│       ├── ApiService.js    # Server communication
│       └── AuthService.js   # Authentication
├── App.js                   # Main application component
├── app.json                 # Expo configuration
├── package.json             # Mobile app dependencies
├── SETUP_GUIDE.md           # Complete setup instructions
├── CLIENT_SERVER_README.md  # Architecture documentation
└── README.md               # This file
```

## How It Works

### Database Schema

**trajectories** table (on server):
- Stores user movement data for future ML training
- Fields: user_id, latitude, longitude, timestamp, speed, heading, accuracy
- Sent to server every 30 seconds from mobile app

**parking_events** table (on server):
- Records parking search attempts and outcomes
- Fields: user_id, location, timestamp, day_of_week, hour, found_parking, search_duration
- Used to build time-based patterns

**parking_zones** table (on server):
- Aggregates parking success rates by location
- Fields: latitude, longitude, radius, success_count, total_count, success_rate
- Updated automatically when events are recorded
- Used for hot zone visualization

### ML Model

The baseline ML model (running on server) combines three factors:

1. **Time Factor (40% weight)**
   - Historical patterns by hour and day of week
   - Rush hour penalties
   - Weekend bonuses
   - Night time adjustments

2. **Spatial Factor (30% weight)**
   - Proximity to known hot zones
   - Distance-weighted probability
   - Success rate of nearby zones

3. **Location-Specific Factor (30% weight)**
   - Exact location historical data
   - Time-slot specific patterns
   - Minimum sample size requirements

Results are sent back to mobile app via REST API.

### Hot Zones Visualization

- Circular overlays on map show probability zones
- Color-coded by success rate:
  - Green: >70% success rate
  - Yellow: 40-70% success rate
  - Red: <40% success rate
- Radius based on data density
- Real-time updates as new data is collected

### Parking Search Flow

1. User grants location permissions in mobile app
2. App obtains current GPS coordinates
3. Background trajectory recording starts (every 30s, sent to server)
4. App requests hot zones from server via API
5. Server queries database and calculates zones
6. Hot zones are displayed on map
7. When "APARCAR" button is pressed:
   - App sends request to server with current location
   - Server ML model predicts best parking zones
   - Results sorted by probability and distance
   - Server returns predictions to app
   - Best option shown with marker on map
8. User provides feedback on success/failure
9. Feedback sent to server and updates database
10. Future predictions improve based on new data

## User Guide

### First Time Setup

1. Open the app
2. Tap "¿No tienes cuenta? Regístrate"
3. Fill in email, username, and password
4. Tap "Registrarse"
5. Return to login and enter credentials

### Loading Demo Data

**Option 1: Via Mobile App (Recommended)**
1. After login, tap the "Demo" button in the header
2. Confirm to load sample parking data
3. Data is sent to server and stored in database
4. Hot zones will appear on the map
5. This demonstrates the ML prediction features

**Option 2: Via Server API**
```bash
curl -X POST http://192.168.1.120:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "userId": "demo"
  }'
```

Demo data includes:
- 100 trajectory points
- 256 parking events (mix of successes and failures)
- 8 parking zones with varying success rates

### Finding Parking

1. After login, grant location permissions when prompted
2. Wait for map to load with your current location
3. Hot zones (colored circles) will appear showing parking probability
4. Tap the large "APARCAR" button
5. View the best parking suggestion with probability
6. Provide feedback: "Estacioné aquí" or "No encontré lugar"
7. Your feedback improves future predictions

### Understanding the Map

- **Blue circle**: Your current location (500m radius)
- **Green zones**: High parking probability (>70%)
- **Yellow zones**: Medium parking probability (40-70%)
- **Red zones**: Lower parking probability (<40%)
- **Markers**: Specific parking zone suggestions
- **Blue marker**: Best recommended parking spot

## API Reference

### Server API Endpoints

See [server/README.md](server/README.md) for complete API documentation.

**Base URL:** `http://YOUR_IP:3000/api`

**Endpoints:**
- `GET /` - Health check
- `GET /api/parking/hot-zones` - Get visualization zones
- `GET /api/parking/find-parking` - Find best parking spots
- `GET /api/parking/predict` - Predict parking probability
- `POST /api/parking/trajectory` - Record movement point
- `POST /api/parking/parking-event` - Record parking attempt
- `GET /api/parking/stats` - Get database statistics
- `POST /api/seed` - Load demo data

### ApiService (Mobile App)

```javascript
import { ApiService } from './src/services/ApiService';

// Get hot zones
const zones = await ApiService.getHotZones(lat, lon, radiusKm);

// Find best parking
const result = await ApiService.findParking(lat, lon, maxDistance);

// Predict probability
const prob = await ApiService.predictProbability(lat, lon, timestamp);

// Record trajectory
await ApiService.recordTrajectory(userId, location);

// Record parking event
await ApiService.recordParkingEvent(userId, location, foundParking, duration);

// Get statistics
const stats = await ApiService.getStats();

// Test server connection
const isConnected = await ApiService.testConnection();
```

## Future Enhancements

- **Advanced ML Models**: Integration with TensorFlow.js for deep learning
- **Real-time Data**: Integration with parking sensors and APIs
- **Navigation**: Turn-by-turn directions to parking spots
- **Parking Timers**: Reminders for parking meter expiration
- **Payment Integration**: In-app payment for paid parking
- **Social Features**: Community-driven parking reports
- **Offline Mode**: Cached predictions when offline
- **Analytics Dashboard**: User statistics and insights
- **Multi-city Support**: Expand beyond current location
- **Calendar Integration**: Predict parking needs based on events

## Troubleshooting

**"Server connection failed"**: 
- Ensure backend server is running (`cd server && npm start`)
- Verify phone and computer are on same WiFi network
- Check IP address in `src/services/ApiService.js` matches your computer's IP
- Test server with: `curl http://YOUR_IP:3000/`

**"Location permission denied"**: Go to device settings and enable location permissions for Expo Go.

**Maps not loading on Android**: Ensure you have a valid Google Maps API key in `app.json`.

**No hot zones visible**: 
- Check server connection indicator (should be green)
- Tap the "Demo" button to load sample data
- Verify server has data: `curl http://YOUR_IP:3000/api/parking/stats`

**Build errors**: Try:
```bash
rm -rf node_modules
npm install
```

**Server errors**: Check server logs in the terminal where you ran `npm start`

**Tests failing**: Ensure all dependencies are installed:
```bash
npm install
npm test
```

## Performance Considerations

- **Network latency**: API calls to server typically <100ms on local WiFi
- **Trajectory recording**: Every 30 seconds (configurable)
- **Hot zone refresh**: On location change, cached for 60 seconds
- **ML model update**: Every 10 new parking events
- **Database cleanup**: 30-day trajectory retention on server
- **Optimal zone count**: 10 markers max on map
- **Server resources**: Minimal CPU/memory usage, runs on any modern computer

## Privacy & Data

- **Server data**: All data stored on YOUR local server (SQLite database)
- **No cloud storage**: Data never leaves your local network
- **Network security**: Ensure you're on a trusted WiFi network
- **Data retention**: Server stores trajectories for 30 days
- **User control**: You can delete the database file at any time
- **Location data**: Used only for parking predictions
- **Trajectory data**: Helps improve accuracy over time
- **Local authentication**: User credentials stored locally on device

## License

MIT License

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Acknowledgments

- Google Maps for mapping functionality
- Expo team for excellent development tools
- React Native community for comprehensive libraries