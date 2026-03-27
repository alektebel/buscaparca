# Enhanced Mock Data

This document describes the improved mock data generation system for BuscaParca.

## Overview

The enhanced seed data creates a realistic parking scenario with 12 different zone types, time-based patterns, and statistical significance for better ML predictions.

## Quick Start

### Clear and Reseed Database

```bash
cd server/src
node clear-and-seed.js [latitude] [longitude]
```

Example:
```bash
# New York City
node clear-and-seed.js 40.7128 -74.0060

# Los Angeles
node clear-and-seed.js 34.0522 -118.2437

# Default (NYC if no coords provided)
node clear-and-seed.js
```

## Zone Types

The system generates 12 different parking zone types with realistic characteristics:

### High Success Zones (70-90% success rate)
1. **Residential North** - 85% base success
2. **Residential East** - 80% base success  
3. **Park Area** - 90% base success

### Medium Success Zones (60-75% success rate)
4. **Mixed Use South** - 65% base success
5. **Shopping District** - 70% base success
6. **Commercial Center** - 60% base success

### Lower Success Zones (45-60% success rate)
7. **Downtown Core** - 45% base success
8. **Business District** - 50% base success
9. **Entertainment Zone** - 55% base success

### Variable Zones (60-75% base, varies by time)
10. **University Area** - 75% base success
11. **Medical District** - 68% base success
12. **Transit Hub** - 72% base success

## Time-Based Patterns

Each zone type has realistic time-based modifiers:

### Residential Areas
- **Easier**: Nighttime (10pm-6am), weekends
- **Harder**: Business hours (9am-5pm)
- **Modifier**: -25% during day, +15% at night

### Downtown/Business Districts
- **Easier**: Weekends, nighttime
- **Harder**: Business hours, rush hour
- **Modifier**: -40% rush hour, +30% weekends

### Commercial/Shopping
- **Easier**: Late night
- **Harder**: Weekends, lunch time, shopping hours
- **Modifier**: -20% weekends, +20% night

### Nightlife/Entertainment
- **Easier**: Business hours
- **Harder**: Nights (especially weekends)
- **Modifier**: -45% weekend nights, +20% during day

### University Areas
- **Easier**: Weekends, nighttime
- **Harder**: Weekday business hours
- **Modifier**: -30% weekday mornings, +25% weekends

### Transit Hubs
- **Easier**: Weekends, off-peak hours
- **Harder**: Rush hour (7-9am, 5-7pm)
- **Modifier**: -35% rush hour, +15% weekends

## Data Statistics

### Per Seeding Session
- **Events per zone**: 40-70 (randomized for variability)
- **Total events**: ~600-700 parking events
- **Trajectory points**: 300
- **Parking zones**: 12
- **Historical range**: 60 days back

### Event Distribution
- **Hour weights**: Realistic distribution matching actual traffic patterns
  - Low traffic: 0-6am (weight: 1-2)
  - Morning rush: 7-9am (weight: 8-10)
  - Midday: 10am-5pm (weight: 4-6)
  - Evening rush: 6-7pm (weight: 9-10)
  - Evening: 8-11pm (weight: 3-7)

### Search Durations
- **Found parking**: 1-8 minutes (60-480 seconds)
- **Not found**: 5-20 minutes (300-1200 seconds)

## Geographic Distribution

Zones are distributed around a center point:
- **Spread**: ±0.004 degrees (~440m radius)
- **Variation**: Small random offsets (±30m per event)
- **Coverage**: Full 360° around center

## Using the Mock Data

### In the Mobile App
1. Start the server: `cd server && npm start`
2. Start the app: `npm start`
3. Log in to the app
4. The hot zones will automatically appear on the map
5. Tap "APARCAR" to see ML predictions based on current time and location

### Via API
```bash
# Get hot zones
curl "http://localhost:3000/api/parking/hot-zones?latitude=40.7128&longitude=-74.0060&radius=2"

# Get statistics
curl "http://localhost:3000/api/parking/stats"

# Find best parking
curl "http://localhost:3000/api/parking/find-parking?latitude=40.7128&longitude=-74.0060"
```

## Benefits of Enhanced Data

1. **Time-aware predictions**: The ML model learns different patterns for different times of day and days of week
2. **Zone diversity**: 12 different zone types provide varied training data
3. **Statistical significance**: 40-70 events per zone ensure reliable statistics
4. **Realistic patterns**: Time modifiers match real-world parking behavior
5. **Better UI/UX**: More zones and varied probabilities make the map visually interesting

## Customization

To customize the seed data, edit `server/src/seed-data.js`:

```javascript
// Add new zone types
const zoneTypes = [
  { 
    lat: 0.003, 
    lon: 0.003, 
    baseSuccess: 0.85, 
    type: 'residential',
    name: 'My Custom Zone'
  },
  // ... more zones
];
```

To adjust time patterns, modify the `getTimeModifier()` function.

## Troubleshooting

**No zones appearing on map?**
- Ensure server is running
- Check console for database stats after seeding
- Verify app is connected to server (green indicator)

**All zones have same color?**
- The zones have varying success rates, but similar ones may appear similar
- Try moving around the map to see different zones

**Want fresh data?**
```bash
cd server/src
node clear-and-seed.js
```

This will clear the old data and generate new random patterns.
