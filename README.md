# BuscaParca 🚗

A cross-platform mobile application (Android/iOS) to help you find parking spots near your location with probability indicators.

## Features

- ✅ **User Authentication**: Secure login and registration system with email, username, and password
- ✅ **Session Management**: Persistent user sessions with automatic login
- ✅ **Large APARCAR Button**: One-tap parking search functionality
- ✅ **Maps Integration**: Interactive map showing your location and nearby parking areas
- ✅ **Parking Probability**: Algorithm that calculates and displays the probability of finding parking
- ✅ **Location Services**: Real-time location tracking to find parking near you

## Technology Stack

- **React Native** with **Expo** for cross-platform development
- **React Navigation** for screen navigation
- **React Native Maps** for map functionality
- **Expo Location** for GPS and location services
- **AsyncStorage** for local data persistence

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (optional, for easier development)
- For iOS: Xcode (macOS only)
- For Android: Android Studio

## Installation

1. Clone the repository:
```bash
git clone https://github.com/alektebel/buscaparca.git
cd buscaparca
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Install Expo CLI globally:
```bash
npm install -g expo-cli
```

## Running the App

### Using Expo Go (Recommended for Development)

1. Start the development server:
```bash
npm start
```

2. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

### Running on Emulator/Simulator

**iOS Simulator** (macOS only):
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

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
├── assets/                 # App images and icons
├── src/
│   ├── screens/           # Application screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   └── MainScreen.js
│   └── services/          # Business logic services
│       ├── AuthService.js
│       └── ParkingService.js
├── App.js                 # Main application component
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── babel.config.js       # Babel configuration
```

## How It Works

### Authentication System
- Users can register with email, username, and password
- Passwords must be at least 6 characters
- Email validation ensures proper format
- Sessions are stored locally using AsyncStorage
- Automatic login on app restart if session exists

### Parking Search
1. User grants location permissions
2. App obtains current GPS coordinates
3. When "APARCAR" button is pressed:
   - Algorithm calculates parking probability based on:
     - Time of day (rush hours have lower probability)
     - Day of week (weekends have higher probability)
     - Random factors to simulate real-world variation
4. Map shows nearby parking locations with markers
5. Probability percentage is displayed prominently

### Parking Probability Algorithm
The algorithm considers:
- **Base probability**: 65%
- **Time factors**:
  - Rush hours (7-9 AM, 5-7 PM): -25%
  - Night time (10 PM - 6 AM): +20%
- **Day factors**:
  - Weekends: +15%
- **Random variation**: ±10%

Note: In production, this would be replaced with real-time data from parking sensors, APIs, or historical data.

## User Guide

1. **First Time Setup**:
   - Open the app
   - Tap "¿No tienes cuenta? Regístrate"
   - Fill in email, username, and password
   - Tap "Registrarse"
   - Return to login and enter credentials

2. **Finding Parking**:
   - After login, grant location permissions when prompted
   - Wait for map to load with your current location
   - Tap the large "APARCAR" button
   - View the probability percentage and parking location on the map
   - Tap the marker for more details

3. **Logout**:
   - Tap "Salir" button in the top right
   - Confirm logout

## Future Enhancements

- Real-time parking availability data integration
- Navigation to selected parking spot
- Parking history and favorites
- Push notifications for parking availability
- Payment integration for paid parking
- Community-driven parking reports
- Offline mode with cached data

## Troubleshooting

**"Location permission denied"**: Go to device settings and enable location permissions for the app.

**Maps not loading on Android**: Ensure you have a valid Google Maps API key in `app.json`.

**Build errors**: Try:
```bash
rm -rf node_modules
npm install
```

## License

MIT License

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.