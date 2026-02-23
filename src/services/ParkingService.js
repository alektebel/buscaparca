// Service to calculate parking probability using ML model
// Integrates with the ParkingMLModel for intelligent predictions

import ParkingMLModel from './ParkingMLModel';
import DatabaseService from './DatabaseService';

export const ParkingService = {
  // Calculate parking probability based on ML model
  async calculateParkingProbability(location, timeOfDay = new Date()) {
    const { latitude, longitude } = location;
    
    try {
      const probability = await ParkingMLModel.predictProbability(
        latitude,
        longitude,
        timeOfDay.getTime()
      );
      return probability;
    } catch (error) {
      console.error('Error calculating parking probability:', error);
      // Fallback to simple heuristic
      return this.calculateFallbackProbability(timeOfDay);
    }
  },

  // Fallback probability calculation (if ML model fails)
  calculateFallbackProbability(timeOfDay = new Date()) {
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
    
    const randomFactor = Math.floor(Math.random() * 20) - 10;
    baseProbability += randomFactor;
    
    baseProbability = Math.max(0, Math.min(100, baseProbability));
    return Math.round(baseProbability);
  },

  // Find nearby parking areas using ML model
  async findNearbyParking(userLocation) {
    if (!userLocation) {
      return [];
    }

    const { latitude, longitude } = userLocation;
    
    try {
      // First, try to get parking zones from ML model
      const mlZones = await ParkingMLModel.findBestParkingZones(
        latitude,
        longitude,
        1000, // 1km radius
        10
      );

      if (mlZones.length > 0) {
        // Use ML-predicted zones
        return mlZones.map((zone, index) => ({
          id: `ml_${index}`,
          name: `Zona de Estacionamiento ${index + 1}`,
          latitude: zone.latitude,
          longitude: zone.longitude,
          distance: zone.distance,
          probability: zone.probability,
          type: zone.successRate > 0.7 ? 'Zona Alta Probabilidad' : 'Zona Probable',
          source: 'ml'
        }));
      }
    } catch (error) {
      console.error('Error getting ML parking zones:', error);
    }

    // Fallback: Generate synthetic parking locations
    const parkingAreas = await Promise.all([
      {
        id: '1',
        name: 'Parking Principal',
        latitude: latitude + 0.002,
        longitude: longitude + 0.002,
        distance: 250,
        type: 'Estacionamiento Público'
      },
      {
        id: '2',
        name: 'Zona Azul Centro',
        latitude: latitude - 0.003,
        longitude: longitude + 0.001,
        distance: 350,
        type: 'Zona Regulada'
      },
      {
        id: '3',
        name: 'Parking Residencial',
        latitude: latitude + 0.001,
        longitude: longitude - 0.002,
        distance: 180,
        type: 'Zona Residencial'
      }
    ].map(async (area) => ({
      ...area,
      probability: await this.calculateParkingProbability({
        latitude: area.latitude,
        longitude: area.longitude
      }),
      source: 'synthetic'
    })));

    return parkingAreas.sort((a, b) => b.probability - a.probability);
  },

  // Get the best parking option
  async getBestParkingOption(userLocation) {
    const nearbyParking = await this.findNearbyParking(userLocation);
    return nearbyParking.length > 0 ? nearbyParking[0] : null;
  },

  // Get hot zones for map visualization
  async getHotZones(centerLat, centerLon, radiusKm = 2) {
    try {
      const hotZones = await ParkingMLModel.getHotZoneDistribution(
        centerLat,
        centerLon,
        radiusKm
      );
      return hotZones;
    } catch (error) {
      console.error('Error getting hot zones:', error);
      return [];
    }
  },

  // Record parking attempt
  async recordParkingAttempt(userId, location, foundParking, searchDuration = 0) {
    try {
      await DatabaseService.recordParkingEvent(
        userId,
        location,
        foundParking,
        searchDuration
      );
      
      // Update ML model with new data periodically
      const stats = await DatabaseService.getStats();
      if (stats.events % 10 === 0) {
        // Update model every 10 events
        await ParkingMLModel.updateModel();
      }
      
      return true;
    } catch (error) {
      console.error('Error recording parking attempt:', error);
      return false;
    }
  },

  // Record trajectory point
  async recordTrajectory(userId, location) {
    try {
      await DatabaseService.recordTrajectoryPoint(userId, location);
      return true;
    } catch (error) {
      console.error('Error recording trajectory:', error);
      return false;
    }
  }
};
