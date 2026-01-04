// Service to calculate parking probability
// This is a simplified algorithm for demo purposes
// In production, this would use real-time data from parking APIs, sensors, etc.

export const ParkingService = {
  // Calculate parking probability based on various factors
  calculateParkingProbability(location, timeOfDay = new Date()) {
    const hour = timeOfDay.getHours();
    const dayOfWeek = timeOfDay.getDay();
    
    let baseProbability = 65; // Base probability of 65%
    
    // Time of day factor
    // Rush hours (7-9 AM, 5-7 PM) have lower probability
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      baseProbability -= 25;
    } else if (hour >= 22 || hour <= 6) {
      // Night time - higher probability
      baseProbability += 20;
    }
    
    // Weekend factor
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      baseProbability += 15;
    }
    
    // Add some randomness to simulate real-world variation
    const randomFactor = Math.floor(Math.random() * 20) - 10;
    baseProbability += randomFactor;
    
    // Ensure probability is between 0 and 100
    baseProbability = Math.max(0, Math.min(100, baseProbability));
    
    return Math.round(baseProbability);
  },

  // Find nearby parking areas
  // This returns mock data - in production, this would query a real API
  findNearbyParking(userLocation) {
    if (!userLocation) {
      return [];
    }

    const { latitude, longitude } = userLocation;
    
    // Generate some nearby parking locations (within ~500m)
    const parkingAreas = [
      {
        id: '1',
        name: 'Parking Principal',
        latitude: latitude + 0.002,
        longitude: longitude + 0.002,
        distance: 250, // meters
        probability: this.calculateParkingProbability(userLocation),
        type: 'Estacionamiento Público'
      },
      {
        id: '2',
        name: 'Zona Azul Centro',
        latitude: latitude - 0.003,
        longitude: longitude + 0.001,
        distance: 350,
        probability: this.calculateParkingProbability(userLocation),
        type: 'Zona Regulada'
      },
      {
        id: '3',
        name: 'Parking Residencial',
        latitude: latitude + 0.001,
        longitude: longitude - 0.002,
        distance: 180,
        probability: this.calculateParkingProbability(userLocation),
        type: 'Zona Residencial'
      }
    ];

    // Sort by probability (highest first)
    return parkingAreas.sort((a, b) => b.probability - a.probability);
  },

  // Get the best parking option
  getBestParkingOption(userLocation) {
    const nearbyParking = this.findNearbyParking(userLocation);
    return nearbyParking.length > 0 ? nearbyParking[0] : null;
  }
};
