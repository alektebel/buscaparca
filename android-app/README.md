# BuscaParca Android App

Native Android application built with Kotlin for finding parking spots in Madrid, Spain.

## Features

- **Google Maps Integration**: Interactive map with hot zones visualization
- **Real-time Madrid Parking Data**: Integration with Madrid Open Data API
- **ML-Powered Predictions**: Intelligent parking probability calculations
- **GPS Navigation**: Turn-by-turn directions to the best parking spots
- **Location Tracking**: Background service to track movement patterns
- **Offline Support**: Room database for local caching
- **User Feedback**: Report parking success/failure to improve predictions

## Architecture

- **MVVM Pattern**: ViewModel + LiveData/StateFlow
- **Room Database**: Local data persistence
- **Retrofit**: REST API communication
- **Coroutines**: Asynchronous programming
- **Material Design 3**: Modern UI components

## Prerequisites

1. Android Studio (latest version)
2. Android SDK 24+ (Android 7.0+)
3. Google Maps API Key
4. Server running on your PC (see ../server/)

## Setup Instructions

### 1. Configure Google Maps API Key

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - Maps SDK for Android
   - Directions API
3. Open `app/src/main/res/values/strings.xml`
4. Replace `YOUR_API_KEY_HERE` with your actual API key

Alternatively, create a `local.properties` file:
```properties
MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Configure Server Connection

1. Find your PC's local IP address:
   - Linux/Mac: `ifconfig` or `ip addr`
   - Windows: `ipconfig`
   
2. Open `app/src/main/java/com/buscaparca/data/api/ApiClient.kt`
3. Update the `BUSCAPARCA_BASE_URL` with your PC's IP:
   ```kotlin
   private const val BUSCAPARCA_BASE_URL = "http://YOUR_PC_IP:3000/"
   ```

### 3. Start the Server

Make sure your Node.js server is running:
```bash
cd server
npm install
npm start
```

### 4. Build and Run

1. Open the `android-app` folder in Android Studio
2. Sync Gradle files
3. Connect an Android device or start an emulator
4. Click "Run" or press Shift+F10

## Project Structure

```
android-app/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/buscaparca/
│   │       │   ├── data/
│   │       │   │   ├── models/          # Data classes
│   │       │   │   ├── database/        # Room DAOs & Database
│   │       │   │   ├── api/             # Retrofit APIs
│   │       │   │   └── repository/      # Repository pattern
│   │       │   ├── ui/
│   │       │   │   ├── auth/            # Login/Register
│   │       │   │   ├── main/            # Main map screen
│   │       │   │   └── navigation/      # Navigation manager
│   │       │   ├── services/            # Background services
│   │       │   └── utils/               # Utilities
│   │       ├── res/
│   │       │   ├── layout/              # XML layouts
│   │       │   ├── values/              # Strings, colors, themes
│   │       │   ├── drawable/            # Icons
│   │       │   └── xml/                 # Config files
│   │       └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## Key Components

### Data Models
- `ParkingZone`: Hot zone with success rate
- `ParkingEvent`: User parking feedback
- `Trajectory`: GPS tracking point
- `User`: User account
- `MadridParkingData`: Real-time Madrid data

### APIs
- **BuscaParcaApi**: Communication with your server
- **MadridOpenDataApi**: Madrid Open Data integration
- **GoogleDirectionsApi**: Turn-by-turn navigation

### Services
- **LocationTrackingService**: Background GPS tracking

### ViewModels
- **MainViewModel**: Map screen logic
- **AuthViewModel**: Authentication logic

## Madrid Open Data Integration

The app integrates with Madrid's official parking data:
- **Dataset**: Aparcamientos públicos (disponibilidad en tiempo real)
- **API**: `https://datos.madrid.es/`
- **Update Frequency**: Real-time (when available)

## Permissions Required

- `ACCESS_FINE_LOCATION`: GPS tracking
- `ACCESS_COARSE_LOCATION`: Network location
- `INTERNET`: API communication
- `FOREGROUND_SERVICE`: Background tracking
- `FOREGROUND_SERVICE_LOCATION`: Location service

## Usage

1. **Login/Register**: Create an account or login
2. **Grant Permissions**: Allow location access
3. **View Hot Zones**: See color-coded parking probability zones
   - 🟢 Green: High success rate (>70%)
   - 🟡 Yellow: Medium success rate (40-70%)
   - 🔴 Red: Low success rate (<40%)
4. **Find Parking**: Tap "FIND PARKING" button
5. **Navigate**: Follow the blue route to the best spot
6. **Provide Feedback**: Report success or failure

## Building APK

### Debug APK
```bash
./gradlew assembleDebug
```
Output: `app/build/outputs/apk/debug/app-debug.apk`

### Release APK
1. Create a keystore:
   ```bash
   keytool -genkey -v -keystore buscaparca.keystore -alias buscaparca -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add to `local.properties`:
   ```properties
   KEYSTORE_FILE=path/to/buscaparca.keystore
   KEYSTORE_PASSWORD=your_password
   KEY_ALIAS=buscaparca
   KEY_PASSWORD=your_key_password
   ```

3. Build:
   ```bash
   ./gradlew assembleRelease
   ```

## Testing

Run unit tests:
```bash
./gradlew test
```

Run instrumented tests:
```bash
./gradlew connectedAndroidTest
```

## Troubleshooting

### Map not showing
- Check API key in `strings.xml`
- Ensure Maps SDK is enabled in Google Cloud Console

### Cannot connect to server
- Verify PC and phone are on same WiFi network
- Check server is running on port 3000
- Update IP address in `ApiClient.kt`
- Check firewall settings

### Location not working
- Grant location permissions in app settings
- Enable GPS on device
- Check for Google Play Services

### Build errors
- Sync Gradle files (File → Sync Project with Gradle Files)
- Clean and rebuild (Build → Clean Project)
- Invalidate caches (File → Invalidate Caches / Restart)

## Madrid-Specific Configuration

The app is pre-configured for Madrid, Spain:
- Default map center: `40.4168, -3.7038` (Puerta del Sol)
- Default zoom: 12
- Madrid Open Data API integration
- District and neighborhood support

To adapt for another city:
1. Change `madridCenter` in `MainActivity.kt`
2. Update API endpoints in `MadridOpenDataApi.kt`
3. Modify district/neighborhood fields

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License

## Support

For issues or questions:
- Check existing documentation
- Review server logs
- Enable debug logging in `ApiClient.kt`
