# BuscaParca 🚗

A fully standalone mobile application for Android that helps you find parking spots near your location with ML-powered probability predictions and hot zone visualization.

**✨ v1.2.0 - Now Fully Standalone!** No server required! The app runs completely offline with local database and ML predictions built-in. Just download the APK and start using it immediately.

## Features

- ✅ **Fully Standalone**: No server setup required - everything runs locally on your device
- ✅ **One-Tap Demo Data**: Load realistic parking data instantly with the "Demo" button
- ✅ **Local ML Predictions**: Machine learning model runs directly on your device
- ✅ **SQLite Database**: All data stored locally using expo-sqlite
- ✅ **User Authentication**: Secure login and registration system
- ✅ **Large APARCAR Button**: One-tap parking search functionality
- ✅ **Interactive Maps**: Google Maps-like interface showing your location and parking zones
- ✅ **Hot Zones Visualization**: Color-coded circular overlays showing parking probability zones
  - Green zones: High probability (>70%)
  - Yellow zones: Medium probability (40-70%)
  - Red zones: Low probability (<40%)
- ✅ **Real-time Location**: GPS tracking with trajectory recording
- ✅ **Smart Probability**: Algorithm that calculates parking probability based on:
  - Historical parking success rates at specific locations
  - Time-based patterns (day of week, hour)
  - Spatial clustering of successful parking events
  - Distance-weighted probability scoring
- ✅ **Realistic Mock Data**: 12 zone types with time-based patterns (rush hour, weekends, etc.)
  - Downtown, residential, business districts, universities, shopping, nightlife, etc.
  - 600+ events and 300 trajectories for meaningful predictions

## Technology Stack

- **React Native** with **Expo SDK 50** for cross-platform development
- **React Navigation** for screen navigation
- **React Native Maps** for Google Maps-like interface
- **Expo Location** for GPS and location services
- **Expo SQLite** for local database storage
- **AsyncStorage** for session persistence
- **Custom ML Model** for parking predictions (runs locally)
- **Jest** for comprehensive testing

## Quick Start - Download APK

**The easiest way to use BuscaParca:**

1. **Download the APK** from the [latest release](https://github.com/alektebel/buscaparca/releases/latest)
2. **Install on your Android device** (enable "Install from unknown sources" if prompted)
3. **Open the app** and register/login
4. **Tap "Demo"** to load sample parking data
5. **Start finding parking!** No server setup needed

That's it! The app works completely offline with local database and ML predictions.

## Architecture

BuscaParca v1.2.0+ is a **fully standalone mobile application**:

- **All-in-One**: Everything runs locally on your device - no server required
- **Local Database**: SQLite database stores all data on-device using expo-sqlite
- **Local ML**: Machine learning predictions run directly on your device
- **Offline-First**: Works without internet connection (except for initial map tiles)
- **Demo Data**: Built-in realistic mock data for instant testing

### Local Services (All on Device)

1. **DatabaseService** (`src/services/DatabaseService.js`)
   - SQLite database management using expo-sqlite
   - Tables: users, trajectories, parking_events, parking_zones
   - Automatic zone statistics calculation
   - Query optimization with indexes

2. **ParkingMLModel** (`src/services/ParkingMLModel.js`)
   - Baseline ML model using statistical analysis
   - Time-based probability factors (rush hour, weekends, etc.)
   - Spatial clustering analysis
   - Distance calculations using Haversine formula
   - Hot zone distribution generation

3. **ParkingService** (`src/services/ParkingService.js`)
   - High-level parking operations
   - Coordinates database and ML model
   - Hot zone generation and caching
   - Best parking spot recommendations

4. **SeedService** (`src/services/SeedService.js`)
   - Generates realistic demo data
   - 12 zone types (downtown, residential, business, etc.)
   - Time-based patterns (rush hour, weekends)
   - 600+ events, 300 trajectories

5. **AuthService** (`src/services/AuthService.js`)
   - Local user authentication
   - Session management with AsyncStorage
   - Login/register functionality

**Note:** The `server/` directory contains the legacy backend server from v1.1.0 and earlier. It is no longer needed for the app to function, but is kept for reference.

## Prerequisites

**For using the APK:**
- Android device (Android 6.0+)
- ~100MB free storage space

**For development:**
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for emulator) or Android device for testing

## Installation & Usage

### Option 1: Install APK (Recommended)

1. **Download** the latest APK from [Releases](https://github.com/alektebel/buscaparca/releases/latest)
2. **Transfer** the APK to your Android device
3. **Enable** "Install from unknown sources" in Settings if prompted
4. **Install** by opening the APK file
5. **Open** the app and create an account
6. **Tap "Demo"** button to load realistic parking data
7. **Start using!** Explore hot zones and tap "APARCAR" to find parking

### Option 2: Development Setup

If you want to modify the code or build from source:

1. **Clone the repository:**
```bash
git clone https://github.com/alektebel/buscaparca.git
cd buscaparca
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm start
```

4. **Run on device/emulator:**
   - Scan QR code with Expo Go app (Android/iOS)
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator (macOS only)

5. **Build APK (optional):**
```bash
# Build for Android
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK will be in `android/app/build/outputs/apk/release/`.

## Testing

Run the comprehensive test suite:
```bash
npm test
```

Test coverage includes:
- Database operations (local SQLite)
- ML model predictions
- Parking service logic
- Authentication flows
- UI components

All tests should pass.

## Configuration

### Google Maps API Key (Android)

The app includes a placeholder API key. For production use:

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
3. Rebuild the APK

### Location Permissions

The app automatically requests location permissions when needed. Grant them for full functionality.

## Project Structure

```
buscaparca/
├── src/
│   ├── screens/             # Application screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   └── MainScreen.js    # Map with hot zones (standalone)
│   └── services/            # Local services (all run on device)
│       ├── DatabaseService.js    # Local SQLite operations
│       ├── ParkingMLModel.js     # Local ML predictions
│       ├── ParkingService.js     # High-level parking logic
│       ├── SeedService.js        # Demo data generation
│       └── AuthService.js        # Authentication
├── __tests__/              # Comprehensive test suites
├── assets/                 # App images and icons
├── android/                # Android native build
├── server/                 # Legacy backend (v1.1.0, no longer needed)
├── App.js                  # Main application component
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── MOCK_DATA.md            # Mock data documentation
└── README.md              # This file
```

## How It Works

### Local Database Schema

All data stored locally on your device using expo-sqlite:

**users** table:
- User credentials and session data
- Fields: id, email, username, password_hash, created_at

**trajectories** table:
- User movement data for ML training
- Fields: user_id, latitude, longitude, timestamp, speed, heading, accuracy

**parking_events** table:
- Records parking search attempts and outcomes
- Fields: user_id, location, timestamp, day_of_week, hour, found_parking, search_duration

**parking_zones** table:
- Aggregates parking success rates by location
- Fields: latitude, longitude, radius, success_count, total_count, success_rate
- Updated automatically when events are recorded
- Used for hot zone visualization

### ML Model (Runs Locally on Device)

The ML model runs entirely on your device and combines three factors:

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

All calculations happen locally on your device - no network required.

### Hot Zones Visualization

- Circular overlays on map show probability zones
- Color-coded by success rate:
  - Green: >70% success rate
  - Yellow: 40-70% success rate
  - Red: <40% success rate
- Radius based on data density
- Real-time updates as new data is collected

### Parking Search Flow (Fully Local)

1. User grants location permissions
2. App obtains current GPS coordinates
3. App initializes local SQLite database
4. Background trajectory recording starts (stored locally)
5. App queries local database for parking zones
6. ML model calculates hot zones on device
7. Hot zones displayed on map
8. When "APARCAR" button is pressed:
   - App gets current location
   - Local ML model predicts best parking zones
   - Results sorted by probability and distance
   - Best option shown with marker on map
9. User provides feedback on success/failure
10. Feedback stored in local database
11. Future predictions improve based on accumulated local data

**Everything happens on your device - no internet required (except for map tiles).**

## User Guide

### First Time Setup

1. Install the APK on your Android device
2. Open the app
3. Tap "¿No tienes cuenta? Regístrate"
4. Fill in email, username, and password
5. Tap "Registrarse"
6. You'll be automatically logged in

### Loading Demo Data

After login, tap the "Demo" button in the top right corner. This will:
- Load 600+ parking events across 12 realistic zone types
- Create 300 trajectory points
- Generate hot zones with time-based patterns
- Show downtown, residential, business, university, and other zones
- Demonstrate ML predictions with meaningful data

Demo zones include:
- Downtown Core (high density, rush hour effects)
- Residential areas (weekend/evening patterns)
- Business District (weekday rush hour)
- University Campus (semester patterns)
- Shopping District (weekend peaks)
- Nightlife Zone (late night patterns)
- And 6 more realistic zone types!

See [MOCK_DATA.md](MOCK_DATA.md) for complete details.

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

## Demo Data Details

BuscaParca v1.2.0 includes rich, realistic demo data with 12 zone types:

1. **Downtown Core** - High density, rush hour penalties, business hours
2. **Residential North/South** - Weekend bonuses, evening availability
3. **Business District** - Weekday focus, lunch hour peaks
4. **University Campus** - Semester patterns, class schedules
5. **Shopping District** - Weekend peaks, retail hours
6. **Nightlife Zone** - Late night patterns, weekend focus
7. **Sports Complex** - Event-based patterns
8. **Medical District** - Consistent demand, minimal time patterns
9. **Tech Campus** - Weekday focus, flexible hours
10. **Airport Nearby** - 24/7 demand, higher turnover

Each zone has realistic time-based modifiers (rush hour: -40%, weekends: +30%, night: +20%, etc.) and generates events with natural variability.

For complete details, see [MOCK_DATA.md](MOCK_DATA.md).

## Releases

### v1.2.0 - Fully Standalone App (Latest)
- Removed all server dependencies
- All data and ML runs locally on device
- One-tap "Demo" button for instant data loading
- Works completely offline (except map tiles)
- Download: [buscaparca-v1.2.0-standalone.apk](https://github.com/alektebel/buscaparca/releases/tag/v1.2.0)

### v1.1.0 - Enhanced Mock Data
- 12 realistic zone types with time-based patterns
- 600+ events, 300 trajectories
- Rush hour, weekend, and time-of-day modifiers
- Requires backend server (deprecated)

### v1.0.0 - Initial Release
- Basic client-server architecture
- 8 simple parking zones
- Requires backend server (deprecated)

## Legacy Server Documentation

The `server/` directory contains the backend server from v1.1.0 and earlier. **It is no longer needed for the app to function.** 

If you need to run the legacy server version:
- See [CLIENT_SERVER_README.md](CLIENT_SERVER_README.md) for v1.0.0-v1.1.0 architecture
- See [SETUP_GUIDE.md](SETUP_GUIDE.md) for server setup instructions
- See [server/README.md](server/README.md) for API documentation

The standalone app (v1.2.0+) is recommended for all users.

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

**Maps not loading on Android**: 
- Ensure you have a valid Google Maps API key in `app.json`
- Check internet connection for map tiles

**Location permission denied**: 
- Go to device Settings > Apps > BuscaParca > Permissions
- Enable location permissions

**No hot zones visible**: 
- Tap the "Demo" button to load sample data
- Check that database initialization completed
- Look for green "Database Ready" status

**App crashes on startup**:
- Clear app data in device settings
- Reinstall the APK
- Ensure Android 6.0+ is installed

**Demo button not working**:
- Wait a few seconds after first launch for database to initialize
- Check device has enough storage space (~100MB free)
- Try restarting the app

## Performance

- **Fully local**: No network latency for predictions
- **Fast startup**: Database initializes in <1 second
- **Efficient storage**: SQLite database typically <10MB
- **Low battery usage**: GPS polling only during active use
- **Smooth maps**: Optimized rendering of hot zones
- **Quick predictions**: ML calculations complete in <100ms
- **Offline capable**: Works without internet (except map tiles)

## Privacy & Data

- **All local**: All data stored on YOUR device only
- **No cloud**: Data never leaves your device
- **No tracking**: No analytics or telemetry
- **Offline-first**: Works without internet connection
- **Your control**: Uninstall app to delete all data
- **Location privacy**: GPS data only used for local predictions
- **User credentials**: Stored securely in local SQLite database

## License

MIT License

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Acknowledgments

- Google Maps for mapping functionality
- Expo team for excellent development tools
- React Native community for comprehensive libraries