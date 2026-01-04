# BuscaParca - Technical Documentation

## Application Architecture

### Overview

BuscaParca is built using React Native with Expo, following a component-based architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│                  App.js                         │
│          (Navigation Container)                 │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┬──────────────┐
        │                   │              │
        ▼                   ▼              ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ LoginScreen  │   │RegisterScreen│   │  MainScreen  │
│              │   │              │   │              │
│ - Email      │   │ - Email      │   │ - Map View   │
│ - Password   │   │ - Username   │   │ - APARCAR    │
│ - Login Btn  │   │ - Password   │   │ - Probability│
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────┬───────┴──────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐   ┌──────────────┐
│ AuthService  │   │ParkingService│
│              │   │              │
│ - Register   │   │ - Calculate  │
│ - Login      │   │ - Find       │
│ - Logout     │   │ - Get Best   │
│ - Session    │   │              │
└──────┬───────┘   └──────────────┘
       │
       ▼
┌──────────────┐
│ AsyncStorage │
│ (Local DB)   │
└──────────────┘
```

## User Flow

### Registration & Login Flow

```
┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│  Login Screen    │
└────┬─────┬───────┘
     │     │
     │     └─────┐
     │           │
Has Account?   No
     │           │
    Yes          ▼
     │     ┌──────────────────┐
     │     │ Register Screen  │
     │     │                  │
     │     │ 1. Enter Email   │
     │     │ 2. Enter Username│
     │     │ 3. Enter Password│
     │     │ 4. Confirm Pass  │
     │     └─────┬────────────┘
     │           │
     │           ▼
     │     ┌──────────────────┐
     │     │  Validation      │
     │     │  - Email format  │
     │     │  - Password len  │
     │     │  - Unique user   │
     │     └─────┬────────────┘
     │           │
     │      Success
     │           │
     │           ▼
     │     [Save to Storage]
     │           │
     │           └──────────┐
     │                      │
     ▼                      │
┌──────────────────┐        │
│ Enter Credentials│        │
│                  │        │
│ 1. Email/User    │        │
│ 2. Password      │        │
└────┬─────────────┘        │
     │                      │
     ▼                      │
┌──────────────────┐        │
│  Authenticate    │        │
└────┬─────────────┘        │
     │                      │
  Success                   │
     │                      │
     ▼                      │
┌──────────────────┐◄───────┘
│  Create Session  │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│   Main Screen    │
└──────────────────┘
```

### Parking Search Flow

```
┌──────────────────┐
│   Main Screen    │
│   (Map Loaded)   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Request Location │
│   Permission     │
└────┬─────────────┘
     │
  Granted
     │
     ▼
┌──────────────────┐
│  Get GPS Coords  │
│  (lat, lng)      │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Display Map     │
│  - User marker   │
│  - Search radius │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ User taps        │
│  "APARCAR"       │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ ParkingService   │
│ .getBestOption() │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Calculate:      │
│  - Time factors  │
│  - Day factors   │
│  - Random vars   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Find Nearby     │
│  Parking Areas   │
│  (Mock data)     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Sort by         │
│  Probability     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Display Result  │
│  - Probability % │
│  - Map marker    │
│  - Distance      │
│  - Name          │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  User reviews    │
│  parking option  │
└──────────────────┘
```

## Data Models

### User Object
```javascript
{
  id: string,           // Unique identifier
  email: string,        // User email
  username: string,     // User username
  password: string,     // Password (hashed in production)
  createdAt: string     // ISO timestamp
}
```

### Session Object
```javascript
{
  userId: string,       // Reference to user ID
  email: string,        // User email
  username: string,     // User username
  loginAt: string       // ISO timestamp
}
```

### Parking Location Object
```javascript
{
  id: string,           // Unique identifier
  name: string,         // Parking area name
  latitude: number,     // GPS latitude
  longitude: number,    // GPS longitude
  distance: number,     // Distance in meters
  probability: number,  // 0-100 percentage
  type: string          // Type of parking
}
```

## Component Specifications

### LoginScreen

**Props**: Navigation object from React Navigation

**State**:
- `emailOrUsername`: string
- `password`: string
- `loading`: boolean
- `checking`: boolean

**Methods**:
- `checkExistingSession()`: Verify if user has active session
- `handleLogin()`: Authenticate user and navigate to Main

**Validations**:
- Non-empty email/username
- Non-empty password

### RegisterScreen

**Props**: Navigation object from React Navigation

**State**:
- `email`: string
- `username`: string
- `password`: string
- `confirmPassword`: string
- `loading`: boolean

**Methods**:
- `handleRegister()`: Create new user account

**Validations**:
- Valid email format
- Password minimum 6 characters
- Passwords match
- Unique email/username

### MainScreen

**Props**: Navigation object from React Navigation

**State**:
- `user`: User object
- `location`: GPS coordinates
- `bestParking`: Parking object
- `loading`: boolean
- `searching`: boolean
- `mapRegion`: Map region object

**Methods**:
- `loadUser()`: Load user from session
- `requestLocationPermission()`: Request GPS access
- `getCurrentLocation()`: Get device GPS coordinates
- `handleFindParking()`: Search for parking
- `handleLogout()`: End session

## Services API

### AuthService

#### `register(email, username, password)`
**Description**: Create a new user account

**Parameters**:
- email: string (valid email format)
- username: string (unique)
- password: string (min 6 chars)

**Returns**:
```javascript
{
  success: boolean,
  user?: { id, email, username },
  error?: string
}
```

#### `login(emailOrUsername, password)`
**Description**: Authenticate user

**Parameters**:
- emailOrUsername: string
- password: string

**Returns**:
```javascript
{
  success: boolean,
  user?: { userId, email, username, loginAt },
  error?: string
}
```

#### `checkSession()`
**Description**: Verify active session

**Returns**:
```javascript
{
  success: boolean,
  user?: { userId, email, username, loginAt }
}
```

#### `logout()`
**Description**: End current session

**Returns**:
```javascript
{
  success: boolean,
  error?: string
}
```

### ParkingService

#### `calculateParkingProbability(location, timeOfDay)`
**Description**: Calculate probability of finding parking

**Parameters**:
- location: { latitude, longitude }
- timeOfDay: Date object (optional, defaults to now)

**Returns**: number (0-100)

**Algorithm**:
```
1. Start with base probability: 65%
2. Apply time factor:
   - Rush hours (7-9 AM, 5-7 PM): -25%
   - Night time (10 PM - 6 AM): +20%
3. Apply day factor:
   - Weekend (Sat, Sun): +15%
4. Add random variation: ±10%
5. Clamp to 0-100 range
6. Round to integer
```

#### `findNearbyParking(userLocation)`
**Description**: Find parking areas near user

**Parameters**:
- userLocation: { latitude, longitude }

**Returns**: Array of Parking objects

#### `getBestParkingOption(userLocation)`
**Description**: Get highest probability parking

**Parameters**:
- userLocation: { latitude, longitude }

**Returns**: Parking object or null

## Storage Schema

### AsyncStorage Keys

#### `@buscaparca_users`
Stores array of user objects:
```json
[
  {
    "id": "1704398400000",
    "email": "user@example.com",
    "username": "user123",
    "password": "hashed_password",
    "createdAt": "2024-01-04T12:00:00.000Z"
  }
]
```

#### `@buscaparca_session`
Stores current session:
```json
{
  "userId": "1704398400000",
  "email": "user@example.com",
  "username": "user123",
  "loginAt": "2024-01-04T12:00:00.000Z"
}
```

## Security Considerations

### Current Implementation (Demo)
- Passwords stored in plain text
- No encryption
- Local storage only
- No backend validation

### Production Requirements
1. **Backend API**:
   - RESTful API for authentication
   - Database (PostgreSQL, MongoDB)
   - Secure password hashing (bcrypt)

2. **Authentication**:
   - JWT tokens
   - Refresh tokens
   - OAuth integration
   - 2FA support

3. **Data Protection**:
   - HTTPS only
   - Secure storage (Keychain/Keystore)
   - Certificate pinning
   - Encrypted AsyncStorage

4. **API Security**:
   - Rate limiting
   - CORS configuration
   - Input sanitization
   - SQL injection prevention

## Performance Considerations

### Current Performance
- Fast local authentication (< 100ms)
- Instant map rendering
- Minimal network requests
- Small bundle size (~50MB)

### Optimization Opportunities
1. **Lazy Loading**: Load screens on demand
2. **Image Optimization**: Compress assets
3. **Caching**: Cache map tiles
4. **Code Splitting**: Separate vendor bundles
5. **Memory Management**: Proper cleanup in useEffect

## Testing Strategy

### Unit Tests
- Service methods (Auth, Parking)
- Input validation
- Probability calculations
- Edge cases

### Integration Tests
- Screen navigation
- Form submissions
- API calls
- Storage operations

### E2E Tests (Future)
- User registration flow
- Login flow
- Parking search flow
- Logout flow

## Future Enhancements

### Phase 2
- Real-time parking data integration
- Backend API implementation
- User profiles
- Parking history

### Phase 3
- Navigation to parking spot
- Payment integration
- Parking reservations
- Push notifications

### Phase 4
- Community features
- Parking sharing
- Reviews and ratings
- Social integration

## Dependencies

### Core Dependencies
- `expo`: ~50.0.0 - Expo SDK
- `react`: 18.2.0 - React library
- `react-native`: 0.73.0 - React Native framework

### Navigation
- `@react-navigation/native`: ^6.1.9
- `@react-navigation/stack`: ^6.3.20
- `react-native-screens`: ~3.29.0
- `react-native-safe-area-context`: 4.8.2
- `react-native-gesture-handler`: ~2.14.0
- `react-native-reanimated`: ~3.6.0

### Features
- `react-native-maps`: 1.10.0 - Map display
- `expo-location`: ~16.5.0 - GPS location
- `@react-native-async-storage/async-storage`: 1.21.0 - Storage

### Development
- `@babel/core`: ^7.20.0 - Babel transpiler
- `jest`: ^29.7.0 - Testing framework

## Build Configuration

### iOS (app.json)
```json
{
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "com.buscaparca.app",
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "..."
    }
  }
}
```

### Android (app.json)
```json
{
  "android": {
    "package": "com.buscaparca.app",
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ],
    "config": {
      "googleMaps": {
        "apiKey": "YOUR_API_KEY"
      }
    }
  }
}
```

## Deployment

### Development
```bash
npm start        # Start dev server
npm run ios      # Run on iOS simulator
npm run android  # Run on Android emulator
```

### Production
```bash
npx eas build --platform ios     # Build iOS
npx eas build --platform android # Build Android
npx eas submit                   # Submit to stores
```

## Version History

### v1.0.0 (Current)
- Initial release
- Basic authentication
- Map integration
- Parking search
- Probability calculation

---

**Last Updated**: January 4, 2024
