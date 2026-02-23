/**
 * Seed utility to populate initial demo data for testing hot zones
 * This helps demonstrate the parking prediction features
 */

import DatabaseService from './DatabaseService';

export const seedDemoData = async (centerLat, centerLon, userId = 'demo_user') => {
  try {
    await DatabaseService.init();

    console.log('Seeding demo data...');

    // Generate some realistic parking events around the center location
    const demoEvents = [];
    
    // Create a grid of parking zones
    const offsets = [
      { lat: 0.002, lon: 0.002, success: 0.85 },   // High success zone
      { lat: -0.003, lon: 0.001, success: 0.75 },  // Good zone
      { lat: 0.001, lon: -0.002, success: 0.90 },  // Excellent zone
      { lat: -0.001, lon: -0.003, success: 0.60 }, // Medium zone
      { lat: 0.004, lon: 0.001, success: 0.50 },   // Lower success zone
      { lat: -0.002, lon: 0.003, success: 0.80 },  // High success zone
      { lat: 0.003, lon: -0.001, success: 0.70 },  // Good zone
      { lat: -0.004, lon: -0.001, success: 0.55 }, // Medium zone
    ];

    // Generate events for the past 30 days
    const now = Date.now();
    const daysBack = 30;

    for (const offset of offsets) {
      const lat = centerLat + offset.lat;
      const lon = centerLon + offset.lon;

      // Generate 20-40 events per zone
      const eventCount = Math.floor(Math.random() * 20) + 20;

      for (let i = 0; i < eventCount; i++) {
        // Random day in the past 30 days
        const daysAgo = Math.floor(Math.random() * daysBack);
        const timestamp = now - (daysAgo * 24 * 60 * 60 * 1000);
        const date = new Date(timestamp);
        
        // Random hour (weighted towards common search times)
        const hourWeights = [
          2, 1, 1, 1, 1, 2,     // 0-5 (night/early morning)
          5, 8, 8, 6, 4, 3,     // 6-11 (morning rush)
          3, 3, 3, 3, 4, 5,     // 12-17 (afternoon)
          8, 8, 6, 5, 4, 3      // 18-23 (evening)
        ];
        
        const randomValue = Math.random() * hourWeights.reduce((a, b) => a + b, 0);
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
        
        // Determine if parking was found based on zone success rate
        const foundParking = Math.random() < offset.success;
        
        // Search duration varies
        const searchDuration = foundParking 
          ? Math.floor(Math.random() * 300) + 60  // 1-5 minutes
          : Math.floor(Math.random() * 900) + 300; // 5-20 minutes

        // Small random variation in location
        const latVar = (Math.random() - 0.5) * 0.0002;
        const lonVar = (Math.random() - 0.5) * 0.0002;

        demoEvents.push({
          lat: lat + latVar,
          lon: lon + lonVar,
          timestamp: date.getTime(),
          foundParking,
          searchDuration
        });
      }
    }

    // Insert demo events
    console.log(`Inserting ${demoEvents.length} demo parking events...`);
    
    for (const event of demoEvents) {
      await DatabaseService.recordParkingEvent(
        userId,
        {
          latitude: event.lat,
          longitude: event.lon
        },
        event.foundParking,
        event.searchDuration
      );
    }

    // Add some trajectory points
    console.log('Generating demo trajectories...');
    for (let i = 0; i < 100; i++) {
      const trajLat = centerLat + (Math.random() - 0.5) * 0.01;
      const trajLon = centerLon + (Math.random() - 0.5) * 0.01;
      const trajTime = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      await DatabaseService.recordTrajectoryPoint(userId, {
        latitude: trajLat,
        longitude: trajLon,
        speed: Math.random() * 20,
        heading: Math.random() * 360,
        accuracy: Math.random() * 20 + 5
      });
    }

    const stats = await DatabaseService.getStats();
    console.log('Demo data seeded successfully!');
    console.log('Database stats:', stats);

    return stats;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
};

export const clearDemoData = async () => {
  try {
    await DatabaseService.init();
    
    // Note: In a real app, you'd want to be more selective
    // This is just for demo purposes
    console.log('Clearing demo data...');
    
    // Clear all data (use with caution!)
    await DatabaseService.db.execAsync('DELETE FROM trajectories');
    await DatabaseService.db.execAsync('DELETE FROM parking_events');
    await DatabaseService.db.execAsync('DELETE FROM parking_zones');
    
    console.log('Demo data cleared');
    return true;
  } catch (error) {
    console.error('Error clearing demo data:', error);
    return false;
  }
};
