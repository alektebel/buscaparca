const db = require('./database/db');

async function seedDemoData(centerLat, centerLon, userId = 'demo_user') {
  try {
    console.log('Seeding enhanced demo data with realistic patterns...');

    // Define zones with varied characteristics:
    // - Different success rates
    // - Time-specific patterns (business district, residential, nightlife areas)
    // - Variety of parking difficulty levels
    const zoneTypes = [
      // High success zones (easier parking)
      { lat: 0.003, lon: 0.003, baseSuccess: 0.85, type: 'residential', name: 'Residential North' },
      { lat: -0.003, lon: 0.003, baseSuccess: 0.80, type: 'residential', name: 'Residential East' },
      { lat: 0.003, lon: -0.003, baseSuccess: 0.90, type: 'park', name: 'Park Area' },
      
      // Medium success zones
      { lat: -0.003, lon: -0.003, baseSuccess: 0.65, type: 'mixed', name: 'Mixed Use South' },
      { lat: 0.001, lon: 0.004, baseSuccess: 0.70, type: 'shopping', name: 'Shopping District' },
      { lat: -0.001, lon: -0.004, baseSuccess: 0.60, type: 'commercial', name: 'Commercial Center' },
      
      // Lower success zones (harder parking)
      { lat: 0.000, lon: 0.001, baseSuccess: 0.45, type: 'downtown', name: 'Downtown Core' },
      { lat: 0.001, lon: -0.001, baseSuccess: 0.50, type: 'business', name: 'Business District' },
      { lat: -0.002, lon: 0.001, baseSuccess: 0.55, type: 'nightlife', name: 'Entertainment Zone' },
      
      // Variability zones (changes by time)
      { lat: 0.002, lon: -0.002, baseSuccess: 0.75, type: 'university', name: 'University Area' },
      { lat: -0.004, lon: 0.000, baseSuccess: 0.68, type: 'hospital', name: 'Medical District' },
      { lat: 0.004, lon: 0.000, baseSuccess: 0.72, type: 'transit', name: 'Transit Hub' },
    ];

    const now = Date.now();
    const daysBack = 60; // More historical data
    let eventCount = 0;

    // Generate time-based patterns for each zone type
    const getTimeModifier = (type, hour, dayOfWeek) => {
      // Base modifiers by zone type and time
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isBusinessHours = hour >= 9 && hour <= 17;
      const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
      const isNightTime = hour >= 22 || hour <= 6;
      const isLunchTime = hour >= 12 && hour <= 14;

      switch (type) {
        case 'residential':
          // Harder during day, easier at night and weekends
          if (isNightTime) return 0.15;
          if (isWeekend) return 0.10;
          if (isBusinessHours) return -0.25;
          return 0;
        
        case 'downtown':
        case 'business':
          // Much harder during business hours, easier on weekends
          if (isWeekend) return 0.30;
          if (isBusinessHours) return -0.35;
          if (isRushHour) return -0.40;
          if (isNightTime) return 0.25;
          return 0;
        
        case 'commercial':
        case 'shopping':
          // Harder during shopping hours and weekends
          if (isWeekend) return -0.20;
          if (isLunchTime) return -0.15;
          if (isBusinessHours) return -0.10;
          if (isNightTime) return 0.20;
          return 0;
        
        case 'nightlife':
          // Much harder at night, especially weekends
          if (isNightTime && isWeekend) return -0.45;
          if (isNightTime) return -0.30;
          if (isBusinessHours) return 0.20;
          return 0;
        
        case 'university':
          // Harder during semester weekdays
          if (isWeekend) return 0.25;
          if (isBusinessHours && !isWeekend) return -0.30;
          if (isNightTime) return 0.15;
          return 0;
        
        case 'hospital':
          // Consistently moderate difficulty, slightly worse during day
          if (isBusinessHours) return -0.10;
          if (isNightTime) return 0.05;
          return 0;
        
        case 'transit':
          // Harder during commute times
          if (isRushHour) return -0.35;
          if (isBusinessHours) return -0.15;
          if (isWeekend) return 0.15;
          return 0;
        
        case 'park':
          // Harder on nice weather days (weekends)
          if (isWeekend && hour >= 10 && hour <= 18) return -0.25;
          if (isNightTime) return 0.20;
          return 0.10;
        
        case 'mixed':
        default:
          // Moderate variation
          if (isRushHour) return -0.15;
          if (isWeekend) return 0.05;
          return 0;
      }
    };

    for (const zone of zoneTypes) {
      const lat = centerLat + zone.lat;
      const lon = centerLon + zone.lon;

      // More events per zone for better statistics (40-70 events per zone)
      const eventsPerZone = Math.floor(Math.random() * 30) + 40;

      for (let i = 0; i < eventsPerZone; i++) {
        const daysAgo = Math.floor(Math.random() * daysBack);
        const timestamp = now - (daysAgo * 24 * 60 * 60 * 1000);
        const date = new Date(timestamp);
        
        // Weighted hour selection (more realistic distribution)
        const hourWeights = [
          1, 1, 1, 1, 1, 2,   // 0-5 AM: Very light
          4, 8, 10, 8, 6, 5,  // 6-11 AM: Morning rush and mid-morning
          6, 5, 5, 4, 5, 7,   // 12-5 PM: Lunch and afternoon
          10, 9, 7, 5, 3, 2   // 6-11 PM: Evening rush and night
        ];
        
        const totalWeight = hourWeights.reduce((a, b) => a + b, 0);
        const randomValue = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        let selectedHour = 0;
        
        for (let h = 0; h < hourWeights.length; h++) {
          cumulativeWeight += hourWeights[h];
          if (randomValue <= cumulativeWeight) {
            selectedHour = h;
            break;
          }
        }
        
        date.setHours(selectedHour);
        const dayOfWeek = date.getDay();
        
        // Calculate success rate with time modifier
        const timeModifier = getTimeModifier(zone.type, selectedHour, dayOfWeek);
        const adjustedSuccess = Math.max(0.05, Math.min(0.95, zone.baseSuccess + timeModifier));
        
        const foundParking = Math.random() < adjustedSuccess;
        
        // Realistic search durations
        // Found: 1-8 minutes, Not found: 5-20 minutes
        const searchDuration = foundParking 
          ? Math.floor(Math.random() * 420) + 60      // 60-480 seconds (1-8 min)
          : Math.floor(Math.random() * 900) + 300;    // 300-1200 seconds (5-20 min)

        // Small random variation in exact location
        const latVar = (Math.random() - 0.5) * 0.0003;
        const lonVar = (Math.random() - 0.5) * 0.0003;

        await db.recordParkingEvent(
          userId,
          {
            latitude: lat + latVar,
            longitude: lon + lonVar
          },
          foundParking,
          searchDuration
        );
        
        eventCount++;
      }
    }

    console.log(`Inserted ${eventCount} demo parking events across ${zoneTypes.length} zones`);
    
    // Add more trajectory points for ML training (300 points)
    console.log('Adding trajectory points...');
    for (let i = 0; i < 300; i++) {
      const trajLat = centerLat + (Math.random() - 0.5) * 0.012;
      const trajLon = centerLon + (Math.random() - 0.5) * 0.012;
      
      await db.recordTrajectory(userId, {
        latitude: trajLat,
        longitude: trajLon,
        speed: Math.random() * 40,          // 0-40 m/s
        heading: Math.random() * 360,       // 0-360 degrees
        accuracy: Math.random() * 15 + 5    // 5-20 meters
      });
    }

    console.log('Added 300 trajectory points');

    const stats = await db.getStats();
    console.log('Enhanced demo data seeded successfully!');
    console.log('Database stats:', stats);
    console.log(`Zone types: ${zoneTypes.map(z => z.name).join(', ')}`);

    return stats;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
}

module.exports = seedDemoData;
