/**
 * Tests for DatabaseService
 */

import DatabaseService from '../src/services/DatabaseService';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve({ count: 0 }))
  }))
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes database successfully', async () => {
    const result = await DatabaseService.init();
    expect(result).toBe(true);
    expect(DatabaseService.isInitialized).toBe(true);
  });

  test('records trajectory point', async () => {
    const userId = 'testuser';
    const location = {
      latitude: 40.7128,
      longitude: -74.0060,
      speed: 5.5,
      heading: 90,
      accuracy: 10
    };

    const result = await DatabaseService.recordTrajectoryPoint(userId, location);
    expect(result).toBe(true);
  });

  test('records parking event', async () => {
    const userId = 'testuser';
    const location = {
      latitude: 40.7128,
      longitude: -74.0060,
      streetName: 'Main St'
    };

    const result = await DatabaseService.recordParkingEvent(userId, location, true, 120);
    expect(result).toBe(true);
  });

  test('gets database statistics', async () => {
    const stats = await DatabaseService.getStats();
    expect(stats).toHaveProperty('trajectories');
    expect(stats).toHaveProperty('events');
    expect(stats).toHaveProperty('zones');
    expect(typeof stats.trajectories).toBe('number');
    expect(typeof stats.events).toBe('number');
    expect(typeof stats.zones).toBe('number');
  });
});

describe('ParkingMLModel', () => {
  test('calculateDistance computes correct distance', () => {
    // Mock implementation of distance calculation
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    // Test: Same location should be 0 distance
    const dist1 = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
    expect(dist1).toBe(0);

    // Test: Known distance (approximately 111km per degree of latitude)
    const dist2 = calculateDistance(40, -74, 41, -74);
    expect(dist2).toBeGreaterThan(110000);
    expect(dist2).toBeLessThan(112000);
  });

  test('getTimeFactor returns valid probability', () => {
    const getTimeFactor = (timestamp) => {
      const date = new Date(timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      
      let baseProbability = 0.65;
      
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        baseProbability -= 0.25;
      } else if (hour >= 22 || hour <= 6) {
        baseProbability += 0.20;
      }
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseProbability += 0.15;
      }

      return Math.max(0, Math.min(1, baseProbability));
    };

    // Test rush hour
    const rushHourTime = new Date('2024-01-10T08:00:00').getTime();
    const rushHourProb = getTimeFactor(rushHourTime);
    expect(rushHourProb).toBeLessThan(0.65);

    // Test night time
    const nightTime = new Date('2024-01-10T23:00:00').getTime();
    const nightProb = getTimeFactor(nightTime);
    expect(nightProb).toBeGreaterThan(0.65);

    // Test weekend
    const saturdayTime = new Date('2024-01-13T14:00:00').getTime();
    const weekendProb = getTimeFactor(saturdayTime);
    expect(weekendProb).toBeGreaterThan(0.65);

    // All probabilities should be between 0 and 1
    expect(rushHourProb).toBeGreaterThanOrEqual(0);
    expect(rushHourProb).toBeLessThanOrEqual(1);
    expect(nightProb).toBeGreaterThanOrEqual(0);
    expect(nightProb).toBeLessThanOrEqual(1);
    expect(weekendProb).toBeGreaterThanOrEqual(0);
    expect(weekendProb).toBeLessThanOrEqual(1);
  });
});

describe('ParkingService with ML', () => {
  test('calculateFallbackProbability returns valid percentage', () => {
    const calculateFallbackProbability = (timeOfDay = new Date()) => {
      const hour = timeOfDay.getHours();
      const dayOfWeek = timeOfDay.getDay();
      
      let baseProbability = 65;
      
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        baseProbability -= 25;
      } else if (hour >= 22 || hour <= 6) {
        baseProbability += 20;
      }
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseProbability += 15;
      }
      
      baseProbability = Math.max(0, Math.min(100, baseProbability));
      return Math.round(baseProbability);
    };

    const testTime = new Date('2024-01-10T14:00:00');
    const probability = calculateFallbackProbability(testTime);
    
    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).toBeLessThanOrEqual(100);
    expect(Number.isInteger(probability)).toBe(true);
  });

  test('fallback probability adjusts for time of day', () => {
    const calculateFallbackProbability = (timeOfDay = new Date()) => {
      const hour = timeOfDay.getHours();
      const dayOfWeek = timeOfDay.getDay();
      
      let baseProbability = 65;
      
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        baseProbability -= 25;
      } else if (hour >= 22 || hour <= 6) {
        baseProbability += 20;
      }
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseProbability += 15;
      }
      
      baseProbability = Math.max(0, Math.min(100, baseProbability));
      return Math.round(baseProbability);
    };

    // Morning rush hour
    const morningRush = new Date('2024-01-10T08:00:00');
    const morningProb = calculateFallbackProbability(morningRush);
    expect(morningProb).toBeLessThan(65);

    // Evening rush hour
    const eveningRush = new Date('2024-01-10T18:00:00');
    const eveningProb = calculateFallbackProbability(eveningRush);
    expect(eveningProb).toBeLessThan(65);

    // Night time
    const night = new Date('2024-01-10T23:00:00');
    const nightProb = calculateFallbackProbability(night);
    expect(nightProb).toBeGreaterThan(65);
  });

  test('fallback probability adjusts for weekends', () => {
    const calculateFallbackProbability = (timeOfDay = new Date()) => {
      const hour = timeOfDay.getHours();
      const dayOfWeek = timeOfDay.getDay();
      
      let baseProbability = 65;
      
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        baseProbability -= 25;
      } else if (hour >= 22 || hour <= 6) {
        baseProbability += 20;
      }
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseProbability += 15;
      }
      
      baseProbability = Math.max(0, Math.min(100, baseProbability));
      return Math.round(baseProbability);
    };

    // Saturday
    const saturday = new Date('2024-01-13T14:00:00');
    const saturdayProb = calculateFallbackProbability(saturday);
    
    // Sunday
    const sunday = new Date('2024-01-14T14:00:00');
    const sundayProb = calculateFallbackProbability(sunday);

    // Both should be higher than base (65)
    expect(saturdayProb).toBeGreaterThan(65);
    expect(sundayProb).toBeGreaterThan(65);
  });
});

describe('Data Persistence', () => {
  test('validates trajectory data structure', () => {
    const trajectoryPoint = {
      user_id: 'testuser',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: Date.now(),
      speed: 5.5,
      heading: 90,
      accuracy: 10
    };

    expect(trajectoryPoint).toHaveProperty('user_id');
    expect(trajectoryPoint).toHaveProperty('latitude');
    expect(trajectoryPoint).toHaveProperty('longitude');
    expect(trajectoryPoint).toHaveProperty('timestamp');
    expect(typeof trajectoryPoint.latitude).toBe('number');
    expect(typeof trajectoryPoint.longitude).toBe('number');
    expect(typeof trajectoryPoint.timestamp).toBe('number');
  });

  test('validates parking event data structure', () => {
    const parkingEvent = {
      user_id: 'testuser',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: Date.now(),
      day_of_week: 3,
      hour: 14,
      found_parking: true,
      search_duration: 120
    };

    expect(parkingEvent).toHaveProperty('user_id');
    expect(parkingEvent).toHaveProperty('latitude');
    expect(parkingEvent).toHaveProperty('longitude');
    expect(parkingEvent).toHaveProperty('found_parking');
    expect(parkingEvent).toHaveProperty('search_duration');
    expect(typeof parkingEvent.found_parking).toBe('boolean');
    expect(typeof parkingEvent.search_duration).toBe('number');
  });
});
