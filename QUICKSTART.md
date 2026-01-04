# BuscaParca Mobile App - Quick Start Guide

## What is BuscaParca?

BuscaParca is a cross-platform mobile application (Android & iOS) that helps users find parking spots near their location with probability indicators. The app features:

- 🔐 User authentication (email, username, password)
- 🗺️ Interactive map with real-time location
- 🅿️ Large "APARCAR" button for easy parking search
- 📊 Parking probability calculation
- 📍 Location-based parking recommendations

## Prerequisites

Before running the app, ensure you have:

1. **Node.js** (v14 or higher) - Check with `node --version`
2. **npm** or **yarn** - Check with `npm --version`
3. **Mobile device** with Expo Go app installed OR
4. **iOS Simulator** (macOS only) with Xcode installed OR
5. **Android Emulator** with Android Studio installed

## Installation Steps

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/alektebel/buscaparca.git
cd buscaparca

# Install dependencies
npm install
```

### 2. Start the Development Server

```bash
npm start
```

This will start the Expo development server and display a QR code in your terminal.

### 3. Run on Your Device

#### Option A: Using Expo Go (Easiest)

1. Install **Expo Go** from:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Open Expo Go app

3. Scan the QR code displayed in your terminal:
   - **iOS**: Use the Camera app
   - **Android**: Use the QR scanner in Expo Go

#### Option B: Using Simulator/Emulator

For iOS (macOS only):
```bash
npm run ios
```

For Android:
```bash
npm run android
```

## Using the App

### First Time Setup

1. **Register an Account**:
   - Tap "¿No tienes cuenta? Regístrate"
   - Enter your email (must be valid format)
   - Choose a username
   - Create a password (minimum 6 characters)
   - Tap "Registrarse"

2. **Login**:
   - Enter your email or username
   - Enter your password
   - Tap "Iniciar Sesión"

### Finding Parking

1. **Grant Location Permission**:
   - When prompted, allow the app to access your location
   - The map will load showing your current position

2. **Search for Parking**:
   - Tap the large blue "APARCAR" button
   - Wait for the search to complete
   - View the results:
     - Probability percentage (0-100%)
     - Parking location on map
     - Distance from your location
     - Type of parking area

3. **View Details**:
   - Tap the marker on the map to see more information
   - The probability card shows:
     - Percentage chance of finding parking
     - Name of parking area
     - Distance in meters

### Logging Out

- Tap "Salir" in the top right corner
- Confirm logout

## Features Explained

### Authentication System

The app uses a secure local storage system for user data:

- **Email validation**: Must be valid email format (user@domain.com)
- **Password requirements**: Minimum 6 characters
- **Session persistence**: Automatic login on app restart
- **Data storage**: Uses AsyncStorage for local persistence

**Note**: This is a demo implementation. In production, you would use a real backend API with encrypted passwords and secure authentication tokens.

### Parking Probability Algorithm

The algorithm calculates parking availability based on:

1. **Time of Day**:
   - Rush hours (7-9 AM, 5-7 PM): Lower probability (-25%)
   - Night time (10 PM - 6 AM): Higher probability (+20%)
   - Regular hours: Base probability (65%)

2. **Day of Week**:
   - Weekends: Higher probability (+15%)
   - Weekdays: Base probability

3. **Random Factors**:
   - Adds realistic variation (±10%)

**Example Calculations**:
- Wednesday 2 PM: ~65% probability
- Monday 8 AM (rush hour): ~40% probability
- Saturday 2 PM (weekend): ~80% probability
- Tuesday 11 PM (night): ~85% probability

**Note**: In production, this would be replaced with:
- Real-time parking sensor data
- Historical parking patterns
- Live traffic data
- Weather conditions
- Event schedules

### Maps Integration

The app uses React Native Maps to display:

- Your current location (blue dot)
- Search radius (circle around your location)
- Nearby parking spots (markers)
- Interactive map controls (zoom, pan)

## Troubleshooting

### "Location permission denied"

**Solution**: 
1. Go to your device Settings
2. Find "BuscaParca" app
3. Enable Location permissions

### "Maps not showing on Android"

**Solution**:
1. You need a Google Maps API key for Android
2. Get one from [Google Cloud Console](https://console.cloud.google.com/)
3. Update `app.json`:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_ACTUAL_API_KEY"
       }
     }
   }
   ```

### "Cannot find module" errors

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### App crashes on startup

**Solution**:
1. Check you granted all permissions
2. Restart the Expo development server
3. Clear Expo cache:
   ```bash
   npm start -- --clear
   ```

## Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- Parking probability calculations
- Email validation
- Password requirements
- Edge cases and boundary conditions

## Building for Production

### iOS

1. Configure iOS settings in `app.json`
2. Run:
   ```bash
   npx eas build --platform ios
   ```
3. Follow Expo's build service instructions

### Android

1. Configure Android settings in `app.json`
2. Add your Google Maps API key
3. Run:
   ```bash
   npx eas build --platform android
   ```
4. Follow Expo's build service instructions

**Note**: You'll need an Expo account. Sign up at [expo.dev](https://expo.dev)

## Project Structure

```
buscaparca/
├── assets/                     # App icons and images
│   ├── icon.png               # App icon (1024x1024)
│   ├── splash.png             # Splash screen
│   └── ...
├── src/
│   ├── screens/               # UI screens
│   │   ├── LoginScreen.js    # Login interface
│   │   ├── RegisterScreen.js # Registration interface
│   │   └── MainScreen.js     # Main app with map & button
│   └── services/              # Business logic
│       ├── AuthService.js    # Authentication logic
│       └── ParkingService.js # Parking search logic
├── __tests__/                 # Test files
│   └── services.test.js      # Service tests
├── App.js                     # Root component
├── app.json                   # Expo configuration
├── package.json               # Dependencies
└── README.md                  # Documentation
```

## API Keys and Configuration

### Required for Production

1. **Google Maps API Key** (Android):
   - Get from: https://console.cloud.google.com/
   - Enable: Maps SDK for Android
   - Update in `app.json`

2. **Backend API** (Optional):
   - For real parking data
   - For user authentication
   - For analytics

## Technologies Used

- **React Native**: Cross-platform mobile framework
- **Expo**: Development and build tools
- **React Navigation**: Screen navigation
- **React Native Maps**: Map display
- **Expo Location**: GPS and location services
- **AsyncStorage**: Local data storage
- **Jest**: Testing framework

## Development Tips

1. **Hot Reload**: Changes to code automatically update in the app
2. **Debug Menu**: Shake device to open developer menu
3. **Console Logs**: View in terminal running `npm start`
4. **Inspect Element**: Use React Native Debugger

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Expo documentation](https://docs.expo.dev/)
- Check [React Native Maps docs](https://github.com/react-native-maps/react-native-maps)

## License

MIT License - See LICENSE file for details

## Version

Current version: 1.0.0

---

**Happy Parking! 🚗🅿️**
