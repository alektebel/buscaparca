const db = require('./database/db');

async function seedDemoData(centerLat, centerLon, userId = 'demo_user') {
  try {
    console.log('Seeding demo data...');

    const offsets = [
      { lat: 0.002, lon: 0.002, success: 0.85 },
      { lat: -0.003, lon: 0.001, success: 0.75 },
      { lat: 0.001, lon: -0.002, success: 0.90 },
      { lat: -0.001, lon: -0.003, success: 0.60 },
      { lat: 0.004, lon: 0.001, success: 0.50 },
      { lat: -0.002, lon: 0.003, success: 0.80 },
      { lat: 0.003, lon: -0.001, success: 0.70 },
      { lat: -0.004, lon: -0.001, success: 0.55 },
    ];

    const now = Date.now();
    const daysBack = 30;
    let eventCount = 0;

    for (const offset of offsets) {
      const lat = centerLat + offset.lat;
      const lon = centerLon + offset.lon;

      const eventsPerZone = Math.floor(Math.random() * 20) + 20;

      for (let i = 0; i < eventsPerZone; i++) {
        const daysAgo = Math.floor(Math.random() * daysBack);
        const timestamp = now - (daysAgo * 24 * 60 * 60 * 1000);
        const date = new Date(timestamp);
        
        const hourWeights = [
          2, 1, 1, 1, 1, 2,
          5, 8, 8, 6, 4, 3,
          3, 3, 3, 3, 4, 5,
          8, 8, 6, 5, 4, 3
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
        
        const foundParking = Math.random() < offset.success;
        const searchDuration = foundParking 
          ? Math.floor(Math.random() * 300) + 60
          : Math.floor(Math.random() * 900) + 300;

        const latVar = (Math.random() - 0.5) * 0.0002;
        const lonVar = (Math.random() - 0.5) * 0.0002;

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

    console.log(`Inserted ${eventCount} demo parking events`);
    
    // Add trajectory points
    for (let i = 0; i < 100; i++) {
      const trajLat = centerLat + (Math.random() - 0.5) * 0.01;
      const trajLon = centerLon + (Math.random() - 0.5) * 0.01;
      
      await db.recordTrajectory(userId, {
        latitude: trajLat,
        longitude: trajLon,
        speed: Math.random() * 20,
        heading: Math.random() * 360,
        accuracy: Math.random() * 20 + 5
      });
    }

    console.log('Added 100 trajectory points');

    const stats = await db.getStats();
    console.log('Demo data seeded successfully!');
    console.log('Database stats:', stats);

    return stats;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
}

module.exports = seedDemoData;
