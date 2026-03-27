# BuscaParca v1.1.0 Release Notes

## Enhanced Mock Data & Improved Predictions

This release brings significant improvements to the parking prediction system with realistic mock data and better UI/UX.

## What's New

### Enhanced Mock Data System
- **12 Zone Types**: Residential, Downtown, Business, Shopping, Nightlife, University, Hospital, Transit Hub, Park, Mixed Use, Commercial, and Entertainment zones
- **Time-Based Patterns**: Realistic parking difficulty variations based on:
  - Time of day (rush hour, business hours, night time)
  - Day of week (weekdays vs weekends)  
  - Zone-specific patterns (e.g., downtown harder during business hours, nightlife areas harder at night)
- **600+ Parking Events**: More historical data for better ML predictions
- **300 Trajectory Points**: Enhanced GPS tracking data for model training

### Improved Predictions
- ML model now considers 12 different zone types with unique characteristics
- Time-aware predictions that change based on current time and day
- Better statistical significance with 40-70 events per zone
- More varied and interesting map visualizations

### New Tools
- **Clear and Reseed Script**: `server/src/clear-and-seed.js` - Easy way to regenerate mock data
  ```bash
  cd server/src
  node clear-and-seed.js [latitude] [longitude]
  ```
- **Mock Data Documentation**: See `MOCK_DATA.md` for detailed information

### Developer Experience
- Improved seed data with realistic patterns
- Better documentation for mock data generation
- Easy-to-use reseeding script for testing

## Technical Details

### Zone Success Rates
- **High Success (70-90%)**: Residential areas, parks
- **Medium Success (60-75%)**: Mixed use, shopping, commercial areas
- **Lower Success (45-60%)**: Downtown, business districts, entertainment zones

### Time Modifiers
Each zone type has realistic time-based modifiers:
- **Business districts**: -40% during rush hour, +30% on weekends
- **Residential areas**: -25% during day, +15% at night
- **Shopping areas**: -20% on weekends, +20% late night
- **Nightlife**: -45% on weekend nights, +20% during business hours

### Database Statistics
- 691 parking events across 12 zones
- 300 GPS trajectory points
- 60 days of historical data
- Success rates ranging from 44% to 90%

## Installation

### Option 1: Download APK (Recommended)
1. Download `buscaparca-release.apk` from the releases page
2. Enable "Install from Unknown Sources" on your Android device
3. Install the APK
4. Grant location permissions when prompted

### Option 2: Build from Source
```bash
git clone https://github.com/alektebel/buscaparca.git
cd buscaparca
npm install
cd android && ./gradlew assembleRelease
```

## Getting Started

1. **Start the Backend Server**:
   ```bash
   cd server
   npm install
   node src/clear-and-seed.js  # Load mock data
   npm start
   ```

2. **Configure the App**:
   - Update `src/services/ApiService.js` with your computer's IP address (line 4)
   - Ensure phone and computer are on the same WiFi network

3. **Use the App**:
   - Open BuscaParca on your phone
   - Register/login
   - Grant location permissions
   - See hot zones appear on the map
   - Tap "APARCAR" to find parking

## What's Fixed

- More realistic parking patterns
- Better zone diversity for interesting map visualization  
- Improved ML model predictions with more training data
- Time-aware predictions that match real-world parking behavior

## Known Issues

- Google Maps API key needs to be configured for maps to work
- Server must be running on local network for app to function
- Mock data is centered around New York City by default (configurable)

## Documentation

- `MOCK_DATA.md` - Comprehensive guide to the mock data system
- `README.md` - General usage and setup
- `SETUP_GUIDE.md` - Detailed setup instructions
- `CLIENT_SERVER_README.md` - Architecture documentation

## System Requirements

- Android 5.0 (Lollipop) or higher
- Location services enabled
- Internet connection
- Computer running the backend server on same WiFi network

## APK Details

- **Package**: com.buscaparca.app
- **Version**: 1.0.0
- **Version Code**: 1
- **Size**: ~75 MB
- **Signed**: Debug signing (for testing only)

## Contributors

- Enhanced mock data system
- Improved ML predictions
- Better documentation
- Release automation

---

**Full Changelog**: https://github.com/alektebel/buscaparca/compare/v1.0.0...v1.1.0
