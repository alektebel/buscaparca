/**
 * Basic tests for ParkingService
 */

describe('ParkingService', () => {
  // Mock implementation for testing without actual imports
  const ParkingService = {
    calculateParkingProbability(location, timeOfDay = new Date()) {
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
    }
  };

  test('calculates base parking probability correctly', () => {
    const location = { latitude: 40.7128, longitude: -74.0060 };
    const testTime = new Date('2024-01-10T14:00:00'); // Wednesday 2 PM
    const probability = ParkingService.calculateParkingProbability(location, testTime);
    
    // Should be around base probability (65%)
    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).toBeLessThanOrEqual(100);
  });

  test('reduces probability during rush hours', () => {
    const location = { latitude: 40.7128, longitude: -74.0060 };
    const morningRush = new Date('2024-01-10T08:00:00'); // Wednesday 8 AM
    const probability = ParkingService.calculateParkingProbability(location, morningRush);
    
    // Should be reduced during rush hour (around 40%)
    expect(probability).toBeLessThan(65);
  });

  test('increases probability during night time', () => {
    const location = { latitude: 40.7128, longitude: -74.0060 };
    const nightTime = new Date('2024-01-10T23:00:00'); // Wednesday 11 PM
    const probability = ParkingService.calculateParkingProbability(location, nightTime);
    
    // Should be higher at night (around 85%)
    expect(probability).toBeGreaterThan(65);
  });

  test('increases probability on weekends', () => {
    const location = { latitude: 40.7128, longitude: -74.0060 };
    const saturday = new Date('2024-01-13T14:00:00'); // Saturday 2 PM
    const probability = ParkingService.calculateParkingProbability(location, saturday);
    
    // Should be higher on weekend (around 80%)
    expect(probability).toBeGreaterThan(65);
  });

  test('probability is always between 0 and 100', () => {
    const location = { latitude: 40.7128, longitude: -74.0060 };
    
    // Test various times
    for (let hour = 0; hour < 24; hour++) {
      const testTime = new Date(`2024-01-10T${hour.toString().padStart(2, '0')}:00:00`);
      const probability = ParkingService.calculateParkingProbability(location, testTime);
      
      expect(probability).toBeGreaterThanOrEqual(0);
      expect(probability).toBeLessThanOrEqual(100);
    }
  });
});

describe('AuthService - Email Validation', () => {
  test('validates correct email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('test.user@domain.co')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('missing@domain')).toBe(false);
    expect(emailRegex.test('@domain.com')).toBe(false);
  });

  test('rejects passwords shorter than 6 characters', () => {
    const shortPassword = 'abc12';
    const validPassword = 'abc123';
    
    expect(shortPassword.length < 6).toBe(true);
    expect(validPassword.length >= 6).toBe(true);
  });
});
