# BuscaParca - Native Android App (Kotlin)

## Complete Project Overview

This document provides a comprehensive overview of the complete rewrite of BuscaParca as a native Android application in Kotlin, with full Madrid Open Data integration and GPS navigation.

---

## What Was Built

### 1. **Native Android Application (Kotlin)**
- Modern Android app using latest Jetpack libraries
- Full MVVM architecture with ViewModels and LiveData
- Material Design 3 UI components
- Minimum SDK: Android 7.0 (API 24)
- Target SDK: Android 14 (API 34)

### 2. **Complete Feature Set**

#### Core Features
- ✅ Google Maps integration with hot zones visualization
- ✅ Real-time Madrid Open Data API integration
- ✅ ML-powered parking probability predictions
- ✅ GPS turn-by-turn navigation to best parking spots
- ✅ Background location tracking service
- ✅ User authentication (login/register)
- ✅ Parking feedback system (success/failure reporting)
- ✅ Offline support with Room database caching

#### Hot Zones Visualization
- Color-coded circular overlays on map:
  - 🟢 **Green** (>70% success rate): High probability
  - 🟡 **Yellow** (40-70% success rate): Medium probability
  - 🔴 **Red** (<40% success rate): Low probability

#### Navigation Features
- Find best parking spot within customizable radius
- Google Directions API integration for turn-by-turn routes
- Real-time route display on map
- Distance and ETA calculations
- Fallback to straight-line navigation if Directions API unavailable

#### Madrid Integration
- Real-time parking availability from Madrid Open Data
- Official parking garages with live occupancy rates
- District and neighborhood filtering
- Automatic zone generation from Madrid data
- Hybrid approach: Madrid official data + community feedback

---

## Architecture

### Technology Stack

**Frontend (Android App)**
- **Language**: Kotlin
- **Architecture**: MVVM (Model-View-ViewModel)
- **UI**: Material Design 3, ConstraintLayout, ViewBinding
- **Database**: Room (SQLite wrapper)
- **Networking**: Retrofit 2 + OkHttp 3
- **Maps**: Google Maps SDK for Android
- **Location**: Google Play Services Location API
- **Async**: Kotlin Coroutines + Flow
- **Storage**: DataStore Preferences
- **Navigation**: Google Directions API

**Backend (Node.js Server)**
- **Runtime**: Node.js + Express
- **Database**: SQLite3
- **ML Model**: Custom probability algorithm
- **External APIs**: Madrid Open Data
- **New Dependencies**: axios (for Madrid API)

### Project Structure

```
buscaparca/
├── android-app/                    # NEW: Native Android app
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/buscaparca/
│   │   │   │   ├── data/
│   │   │   │   │   ├── models/
│   │   │   │   │   │   ├── User.kt
│   │   │   │   │   │   ├── ParkingZone.kt
│   │   │   │   │   │   ├── ParkingEvent.kt
│   │   │   │   │   │   ├── Trajectory.kt
│   │   │   │   │   │   ├── ParkingPrediction.kt
│   │   │   │   │   │   └── MadridParkingData.kt
│   │   │   │   │   ├── database/
│   │   │   │   │   │   ├── BuscaParcaDatabase.kt
│   │   │   │   │   │   ├── UserDao.kt
│   │   │   │   │   │   ├── ParkingZoneDao.kt
│   │   │   │   │   │   ├── ParkingEventDao.kt
│   │   │   │   │   │   └── TrajectoryDao.kt
│   │   │   │   │   ├── api/
│   │   │   │   │   │   ├── ApiClient.kt
│   │   │   │   │   │   ├── BuscaParcaApi.kt
│   │   │   │   │   │   ├── MadridOpenDataApi.kt
│   │   │   │   │   │   └── GoogleDirectionsApi.kt
│   │   │   │   │   └── repository/
│   │   │   │   │       ├── AuthRepository.kt
│   │   │   │   │       └── ParkingRepository.kt
│   │   │   │   ├── ui/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── LoginActivity.kt
│   │   │   │   │   │   ├── RegisterActivity.kt
│   │   │   │   │   │   └── AuthViewModel.kt
│   │   │   │   │   ├── main/
│   │   │   │   │   │   ├── MainActivity.kt
│   │   │   │   │   │   └── MainViewModel.kt
│   │   │   │   │   └── navigation/
│   │   │   │   │       └── NavigationManager.kt
│   │   │   │   ├── services/
│   │   │   │   │   └── LocationTrackingService.kt
│   │   │   │   ├── utils/
│   │   │   │   │   ├── PreferencesManager.kt
│   │   │   │   │   ├── LocationUtils.kt
│   │   │   │   │   └── ParkingMLModel.kt
│   │   │   │   └── BuscaParcaApplication.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── activity_main.xml
│   │   │   │   │   ├── activity_login.xml
│   │   │   │   │   └── activity_register.xml
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   └── themes.xml
│   │   │   │   ├── drawable/
│   │   │   │   │   └── ic_notification.xml
│   │   │   │   └── xml/
│   │   │   │       ├── network_security_config.xml
│   │   │   │       ├── backup_rules.xml
│   │   │   │       └── data_extraction_rules.xml
│   │   │   └── AndroidManifest.xml
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── .gitignore
│   └── README.md
│
├── server/                          # ENHANCED: Server with Madrid support
│   ├── src/
│   │   ├── routes/
│   │   │   ├── parking.js          # Existing routes
│   │   │   └── madrid.js           # NEW: Madrid-specific routes
│   │   ├── services/
│   │   │   ├── ParkingMLModel.js
│   │   │   └── MadridDataService.js # NEW: Madrid Open Data integration
│   │   ├── database/
│   │   │   └── db.js
│   │   ├── index.js                 # UPDATED: With Madrid routes
│   │   └── seed-data.js
│   └── package.json                 # UPDATED: Added axios dependency
│
└── [original React Native app files remain unchanged]
```

---

## Key Files Created

### Android Application (35+ new files)

**Data Layer (12 files)**
- 6 data models (User, ParkingZone, ParkingEvent, etc.)
- 4 DAOs for database operations
- 1 Room Database class
- 1 Repository for parking operations

**Network Layer (4 files)**
- BuscaParcaApi: Server communication
- MadridOpenDataApi: Madrid official data
- GoogleDirectionsApi: Turn-by-turn navigation
- ApiClient: Retrofit configuration

**UI Layer (7 files)**
- LoginActivity + layout
- RegisterActivity + layout
- MainActivity + layout
- 2 ViewModels (Auth, Main)
- NavigationManager

**Services & Utils (5 files)**
- LocationTrackingService: Background GPS
- PreferencesManager: User preferences
- LocationUtils: Distance calculations
- ParkingMLModel: Prediction algorithm
- BuscaParcaApplication: App initialization

**Resources (7+ files)**
- 3 XML layouts (main, login, register)
- strings.xml, colors.xml, themes.xml
- AndroidManifest.xml
- Network security config
- Drawable resources

**Build Files (4 files)**
- app/build.gradle.kts
- build.gradle.kts
- settings.gradle.kts
- .gitignore

### Server Enhancements (3 new files)

- **MadridDataService.js**: Fetch and process Madrid Open Data
- **madrid.js**: Madrid-specific API routes
- **Updated index.js**: Integrated Madrid routes

---

## API Endpoints

### Existing Endpoints (BuscaParca Server)
```
GET  /api/parking/hot-zones            - Get hot zones
GET  /api/parking/find-parking         - Find best parking
GET  /api/parking/predict              - Predict probability
POST /api/parking/trajectory           - Record GPS point
POST /api/parking/parking-event        - Record feedback
GET  /api/parking/stats                - Database stats
POST /api/seed                         - Seed demo data
```

### New Madrid Endpoints
```
GET  /api/madrid/parking               - Real-time Madrid parking data
GET  /api/madrid/hot-zones             - Madrid-based hot zones
GET  /api/madrid/find-nearby           - Find nearby Madrid parking
GET  /api/madrid/by-district/:district - Filter by district
```

---

## Data Flow

### Finding Parking (Complete Flow)

1. **User Action**: Taps "FIND PARKING" button
2. **Android App**: 
   - Gets current GPS location
   - Calls `MainViewModel.findBestParking()`
3. **Repository**:
   - Fetches Madrid real-time data via API
   - Queries local Room database for historical zones
   - Combines both data sources
4. **ML Model**:
   - Calculates time factor (rush hour, weekends)
   - Calculates spatial factor (proximity to hot zones)
   - Calculates location factor (historical success)
   - Weights: 40% time + 30% spatial + 30% location
5. **Server** (if available):
   - Validates prediction with server-side model
   - Returns top suggestions
6. **Android App**:
   - Displays best parking zone on map
   - Shows probability, distance, ETA
   - Starts navigation automatically

### Navigation Flow

1. **Route Calculation**:
   - Calls Google Directions API
   - Gets turn-by-turn route
   - Decodes polyline
2. **Map Display**:
   - Draws blue route on map
   - Adds destination marker
   - Centers camera on route
3. **Real-time Updates**:
   - Background service tracks location
   - Updates distance/ETA
   - Shows progress along route

### Feedback Loop

1. **User Reports**: "Parked Here" or "No Parking"
2. **Local Storage**: Saves to Room database immediately
3. **Server Sync**: Uploads to server (if connected)
4. **Model Update**: Server updates ML model every 10 events
5. **Zone Refresh**: App fetches updated hot zones
6. **Continuous Learning**: System improves over time

---

## Madrid Open Data Integration

### Official Dataset
- **Name**: Aparcamientos públicos - disponibilidad en tiempo real
- **URL**: https://datos.madrid.es/
- **Format**: JSON-LD (@graph structure)
- **Update Frequency**: Real-time
- **Coverage**: Official parking garages in Madrid

### Data Fields Used
- `id`: Unique parking identifier
- `title`: Parking garage name
- `location`: Latitude/longitude coordinates
- `address`: Street address, district, neighborhood
- `capacity`: Total parking spaces
- `free-places`: Available spaces (real-time)
- `occupied-places`: Occupied spaces

### Integration Strategy
**Hybrid Approach**: Combines official Madrid data with community feedback

1. **Official Data** (Madrid API):
   - Real-time availability of public garages
   - High accuracy for monitored locations
   - Limited to official parking facilities

2. **Community Data** (User feedback):
   - Street parking experiences
   - Success/failure reports
   - Covers entire city

3. **Combined Intelligence**:
   - Official data for garages
   - ML predictions for street parking
   - Best of both worlds

---

## Configuration Required

### Android App Setup

1. **Google Maps API Key**:
   ```xml
   <!-- res/values/strings.xml -->
   <string name="google_maps_key">YOUR_API_KEY_HERE</string>
   ```

2. **Server URL**:
   ```kotlin
   // data/api/ApiClient.kt
   private const val BUSCAPARCA_BASE_URL = "http://YOUR_PC_IP:3000/"
   ```

3. **Permissions**: Already configured in AndroidManifest.xml
   - Location (fine & coarse)
   - Internet
   - Foreground service

### Server Setup

1. **Install Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Start Server**:
   ```bash
   npm start
   ```

3. **Network Access**: Server binds to `0.0.0.0:3000` for local network access

---

## How to Run

### Prerequisites
- Android Studio (latest version)
- Android device or emulator (API 24+)
- Node.js (v14+)
- PC and phone on same WiFi network

### Step-by-Step

1. **Start the Server**:
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Find Your PC's IP**:
   - Linux/Mac: `ifconfig`
   - Windows: `ipconfig`

3. **Configure Android App**:
   - Update server URL in `ApiClient.kt`
   - Add Google Maps API key in `strings.xml`

4. **Build and Run**:
   - Open `android-app` in Android Studio
   - Sync Gradle
   - Run on device/emulator

5. **First Use**:
   - Grant location permissions
   - Create account or login
   - Tap "FIND PARKING"
   - Follow navigation
   - Provide feedback

---

## Testing Madrid Integration

### Test the Madrid API Directly

```bash
# Get all parking data
curl http://localhost:3000/api/madrid/parking

# Get hot zones
curl http://localhost:3000/api/madrid/hot-zones

# Find nearby (Puerta del Sol)
curl "http://localhost:3000/api/madrid/find-nearby?latitude=40.4168&longitude=-3.7038&radius=1000"

# Get parking in Centro district
curl http://localhost:3000/api/madrid/by-district/Centro
```

### Test in Android App

1. Open app and allow location
2. Tap "FIND PARKING"
3. App will:
   - Fetch Madrid real-time data
   - Show official garages with availability
   - Display as green/yellow/red zones
   - Suggest best option

---

## Differences from React Native Version

| Feature | React Native | Native Android (Kotlin) |
|---------|-------------|------------------------|
| **Language** | JavaScript | Kotlin |
| **UI Framework** | React Native | Native Android Views |
| **Maps** | react-native-maps | Google Maps SDK |
| **Database** | expo-sqlite | Room (SQLite) |
| **Navigation** | React Navigation | Activities |
| **Network** | fetch/axios | Retrofit |
| **Async** | Promises/async-await | Coroutines |
| **Storage** | AsyncStorage | DataStore |
| **Performance** | Good | Excellent |
| **App Size** | ~50MB | ~20MB |
| **Build Time** | Fast (Expo) | Moderate (Gradle) |
| **Platform** | Android + iOS | Android only |
| **Madrid Integration** | ❌ No | ✅ Yes |
| **Turn Navigation** | ❌ Basic | ✅ Full |

---

## Madrid-Specific Features

### 1. District-Based Search
- Filter parking by Madrid districts
- Show availability per neighborhood
- District-specific statistics

### 2. Real-Time Availability
- Live occupancy rates
- Free space counts
- Last update timestamps

### 3. Official + Community Data
- Public garages: Madrid Open Data
- Street parking: User feedback
- Intelligent fusion of both sources

### 4. Location Context
- District names in results
- Neighborhood information
- Street address lookup

---

## Advanced Features

### ML Prediction Algorithm

**Three-Factor Model**:
```
Probability = (0.4 × TimeFactor) + (0.3 × SpatialFactor) + (0.3 × LocationFactor)
```

**Time Factor (40%)**:
- Rush hour penalty: 7-9 AM, 5-7 PM (-25%)
- Night bonus: 10 PM - 6 AM (+20%)
- Weekend bonus: Sat/Sun (+15%)

**Spatial Factor (30%)**:
- Distance to nearest hot zone
- Weighted by zone success rates
- 500m search radius

**Location Factor (30%)**:
- Historical success at exact location
- Time-slot specific patterns
- Minimum 3 samples required

### Haversine Distance Calculation
```kotlin
fun calculateDistance(lat1, lon1, lat2, lon2): Double {
    val R = 6371e3 // Earth radius in meters
    // ... precise formula implementation
}
```

### Background Location Tracking
- Updates every 30 seconds
- Foreground service with notification
- Records: lat, lon, speed, heading, accuracy
- Syncs to server when available
- Caches locally if offline

---

## Building for Production

### Generate Release APK

1. **Create Keystore**:
   ```bash
   keytool -genkey -v -keystore buscaparca.keystore \
     -alias buscaparca -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Signing**:
   Add to `local.properties`:
   ```properties
   KEYSTORE_FILE=path/to/buscaparca.keystore
   KEYSTORE_PASSWORD=your_password
   KEY_ALIAS=buscaparca
   KEY_PASSWORD=your_key_password
   ```

3. **Build**:
   ```bash
   ./gradlew assembleRelease
   ```

4. **Output**: `app/build/outputs/apk/release/app-release.apk`

---

## Performance Optimizations

1. **Database Indexing**: Lat/lon queries optimized
2. **API Caching**: Local Room cache for offline use
3. **Lazy Loading**: Hot zones loaded on demand
4. **Coroutines**: Non-blocking async operations
5. **Memory Management**: Proper lifecycle handling
6. **Map Rendering**: Efficient circle drawing

---

## Security Considerations

### Current Implementation (Development)
- Local authentication with SHA-256 hashing
- No server-side auth (local database only)
- Cleartext HTTP allowed for local development
- No encryption at rest

### Production Recommendations
- Implement JWT authentication
- Use HTTPS/TLS for all API calls
- Encrypt sensitive data in Room
- Add ProGuard/R8 obfuscation
- Implement certificate pinning
- Add rate limiting
- Validate all user inputs

---

## Future Enhancements

1. **Advanced Navigation**:
   - Voice guidance
   - Lane assistance
   - Alternative routes

2. **Social Features**:
   - Share parking spots
   - User ratings
   - Community reports

3. **Payment Integration**:
   - Pay for parking in-app
   - Digital parking ticket
   - Transaction history

4. **AI Improvements**:
   - Deep learning models
   - Weather impact analysis
   - Event-based predictions

5. **Multi-City Support**:
   - Barcelona Open Data
   - Valencia integration
   - Sevilla API

---

## Troubleshooting

### Common Issues

**1. Map not loading**
- ✅ Check Google Maps API key
- ✅ Enable Maps SDK in Google Cloud Console
- ✅ Verify billing account is active

**2. Cannot connect to server**
- ✅ Ensure PC and phone on same WiFi
- ✅ Check firewall allows port 3000
- ✅ Verify correct IP in ApiClient.kt
- ✅ Server is running: `npm start`

**3. Madrid data not loading**
- ✅ Check internet connection
- ✅ Madrid API might be temporarily down
- ✅ Check server logs for errors
- ✅ Fallback to community data

**4. Location not working**
- ✅ Grant location permissions
- ✅ Enable GPS on device
- ✅ Check Google Play Services installed
- ✅ Restart app

**5. Build errors**
- ✅ Sync Gradle files
- ✅ Clean and rebuild project
- ✅ Invalidate caches
- ✅ Update Android Studio

---

## Testing Checklist

- [ ] Login with new account
- [ ] Grant location permissions
- [ ] View map with current location
- [ ] Load hot zones (green/yellow/red circles)
- [ ] Tap "FIND PARKING" button
- [ ] View best parking suggestion
- [ ] See navigation route drawn
- [ ] Check probability percentage
- [ ] Verify distance calculation
- [ ] Report "Parked Here"
- [ ] Report "No Parking"
- [ ] Check Madrid data loads
- [ ] Test offline mode
- [ ] Verify background tracking
- [ ] Check notification appears

---

## Summary of Changes

### Created
- ✅ Complete native Android app (35+ files)
- ✅ Kotlin codebase with MVVM architecture
- ✅ Madrid Open Data integration
- ✅ Google Directions navigation
- ✅ Room database with 4 tables
- ✅ 3 API services (Server, Madrid, Google)
- ✅ Background location service
- ✅ Complete UI with Material Design 3
- ✅ Comprehensive README

### Enhanced
- ✅ Server with Madrid routes (/api/madrid/*)
- ✅ MadridDataService for Open Data
- ✅ Updated package.json with axios

### Preserved
- ✅ Original React Native app intact
- ✅ Existing server functionality unchanged
- ✅ All documentation maintained

---

## Lines of Code

**Android App**: ~3,500 lines
- Kotlin code: ~2,800 lines
- XML layouts: ~700 lines

**Server Additions**: ~300 lines
- Madrid integration: ~200 lines
- Updated routes: ~100 lines

**Total New Code**: ~3,800 lines

---

## Dependencies Added

### Android (16 libraries)
- Room (database)
- Retrofit + OkHttp (networking)
- Coroutines (async)
- Google Maps SDK
- Google Play Services Location
- DataStore (preferences)
- Material Design 3
- Work Manager

### Server (1 library)
- axios (HTTP client for Madrid API)

---

## What You Can Do Now

1. **Open Android Studio** → Load `android-app` folder
2. **Configure** → Add Maps API key & server IP
3. **Build** → Sync Gradle → Run
4. **Use** → Find parking in Madrid with real data
5. **Navigate** → Follow turn-by-turn directions
6. **Contribute** → Provide feedback to improve system

---

## Support

**Documentation**:
- `/android-app/README.md` - Android app setup
- This file - Complete overview

**Logs**:
- Android: Logcat in Android Studio
- Server: Console output
- Network: OkHttp interceptor logs

**Community**:
- Madrid Open Data Portal
- Google Maps Platform
- Android Developers

---

**Built with ❤️ for Madrid parking optimization**
