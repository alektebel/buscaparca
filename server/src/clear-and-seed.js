#!/usr/bin/env node

/**
 * Clear database and reseed with enhanced mock data
 * Usage: node clear-and-seed.js [latitude] [longitude]
 * Example: node clear-and-seed.js 40.7128 -74.0060
 */

const db = require('./database/db');
const seedDemoData = require('./seed-data');

async function clearAndSeed() {
  try {
    // Get coordinates from command line or use defaults (New York City)
    const lat = parseFloat(process.argv[2]) || 40.7128;
    const lon = parseFloat(process.argv[3]) || -74.0060;

    console.log('========================================');
    console.log('Clear and Reseed Database');
    console.log('========================================');
    console.log(`Center location: ${lat}, ${lon}`);
    console.log('');

    // Initialize database
    console.log('Step 1: Initializing database...');
    await db.init();
    console.log('✓ Database initialized');
    console.log('');

    // Clear existing data
    console.log('Step 2: Clearing existing data...');
    await db.run('DELETE FROM parking_events');
    await db.run('DELETE FROM parking_zones');
    await db.run('DELETE FROM trajectories');
    console.log('✓ Database cleared');
    console.log('');

    // Reseed with enhanced data
    console.log('Step 3: Seeding enhanced mock data...');
    const stats = await seedDemoData(lat, lon, 'demo_user');
    console.log('✓ Seeding complete');
    console.log('');

    // Show final statistics
    console.log('========================================');
    console.log('Final Database Statistics:');
    console.log('========================================');
    console.log(`Parking Events: ${stats.events}`);
    console.log(`Parking Zones: ${stats.zones}`);
    console.log(`Trajectories: ${stats.trajectories}`);
    console.log('');
    console.log('✓ Ready to use!');
    console.log('');
    console.log('The database now contains realistic mock data with:');
    console.log('- 12 different zone types (residential, downtown, nightlife, etc.)');
    console.log('- Time-based patterns (rush hour, weekends, etc.)');
    console.log('- 40-70 events per zone for statistical significance');
    console.log('- 300 trajectory points for ML training');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearAndSeed();
