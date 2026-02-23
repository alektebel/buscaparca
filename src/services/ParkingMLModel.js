/**
 * ParkingMLModel - Baseline ML model for parking prediction
 * 
 * This is a simple baseline model using statistical analysis and heuristics.
 * Future versions can integrate TensorFlow.js or other ML libraries.
 * 
 * The model uses:
 * 1. Historical parking success rates by location
 * 2. Time-based patterns (day of week, hour)
 * 3. Spatial clustering of successful parking events
 * 4. Distance-weighted probability
 */

import DatabaseService from './DatabaseService';

class ParkingMLModel {
  constructor() {
    this.isInitialized = false;
    this.hotZones = [];
    this.timePatterns = new Map();
  }

  /**
   * Initialize the model by loading historical data
   */
  async initialize() {
    try {
      await DatabaseService.init();
      await this.loadHotZones();
      await this.buildTimePatterns();
      this.isInitialized = true;
      console.log('Parking ML Model initialized');
      return true;
    } catch (error) {
      console.error('Error initializing ML model:', error);
      return false;
    }
  }

  /**
   * Load hot zones from database
   */
  async loadHotZones() {
    try {
      // Get a default center (will be updated with user location)
      const zones = await DatabaseService.getParkingZones(0, 0, 10);
      this.hotZones = zones.map(zone => ({
        latitude: zone.latitude,
        longitude: zone.longitude,
        successRate: zone.success_rate,
        totalCount: zone.total_count,
        radius: zone.radius || 100
      }));
    } catch (error) {
      console.error('Error loading hot zones:', error);
      this.hotZones = [];
    }
  }

  /**
   * Build time-based patterns from historical data
   */
  async buildTimePatterns() {
    try {
      const events = await DatabaseService.getParkingEvents(10000);
      
      // Group by day of week and hour
      const patterns = {};
      
      events.forEach(event => {
        const key = `${event.day_of_week}_${event.hour}`;
        if (!patterns[key]) {
          patterns[key] = {
            successful: 0,
            total: 0,
            avgSearchDuration: 0
          };
        }
        
        patterns[key].total += 1;
        if (event.found_parking) {
          patterns[key].successful += 1;
        }
        patterns[key].avgSearchDuration += event.search_duration || 0;
      });

      // Calculate success rates
      Object.keys(patterns).forEach(key => {
        const pattern = patterns[key];
        pattern.successRate = pattern.successful / pattern.total;
        pattern.avgSearchDuration = pattern.avgSearchDuration / pattern.total;
        this.timePatterns.set(key, pattern);
      });

    } catch (error) {
      console.error('Error building time patterns:', error);
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get time-based probability factor
   */
  getTimeFactor(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const key = `${dayOfWeek}_${hour}`;

    const pattern = this.timePatterns.get(key);
    
    if (pattern && pattern.total >= 5) {
      // Use historical data if we have enough samples
      return pattern.successRate;
    }

    // Fallback to heuristic
    let baseProbability = 0.65;
    
    // Rush hours (7-9 AM, 5-7 PM) - lower probability
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      baseProbability -= 0.25;
    } else if (hour >= 22 || hour <= 6) {
      // Night time - higher probability
      baseProbability += 0.20;
    }
    
    // Weekends - higher probability
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      baseProbability += 0.15;
    }

    return Math.max(0, Math.min(1, baseProbability));
  }

  /**
   * Get spatial factor based on proximity to hot zones
   */
  getSpatialFactor(latitude, longitude) {
    if (this.hotZones.length === 0) {
      return 0.5; // Neutral if no data
    }

    // Find closest hot zones
    let maxFactor = 0;

    this.hotZones.forEach(zone => {
      const distance = this.calculateDistance(
        latitude, longitude,
        zone.latitude, zone.longitude
      );

      // Weight decreases with distance
      if (distance <= zone.radius * 2) {
        const proximityFactor = 1 - (distance / (zone.radius * 2));
        const zoneFactor = zone.successRate * proximityFactor;
        maxFactor = Math.max(maxFactor, zoneFactor);
      }
    });

    return maxFactor || 0.5;
  }

  /**
   * Predict parking probability for a location
   */
  async predictProbability(latitude, longitude, timestamp = Date.now()) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Combine factors
    const timeFactor = this.getTimeFactor(timestamp);
    const spatialFactor = this.getSpatialFactor(latitude, longitude);

    // Get location-specific historical stats
    const locationStats = await DatabaseService.getLocationStats(latitude, longitude, 200);
    
    let locationFactor = 0.5; // Default
    if (locationStats.length > 0) {
      const date = new Date(timestamp);
      const currentHour = date.getHours();
      const currentDay = date.getDay();
      
      // Find matching time slot
      const matchingStat = locationStats.find(
        stat => stat.hour === currentHour && stat.day_of_week === currentDay
      );
      
      if (matchingStat && matchingStat.total_events >= 3) {
        locationFactor = matchingStat.successful_events / matchingStat.total_events;
      }
    }

    // Weighted combination
    // 40% time factor, 30% spatial factor, 30% location-specific
    const probability = (
      timeFactor * 0.4 +
      spatialFactor * 0.3 +
      locationFactor * 0.3
    );

    // Add small random variation to simulate uncertainty
    const variation = (Math.random() - 0.5) * 0.1;
    const finalProbability = Math.max(0, Math.min(1, probability + variation));

    return Math.round(finalProbability * 100);
  }

  /**
   * Find best parking zones near a location
   */
  async findBestParkingZones(centerLat, centerLon, maxDistance = 1000, limit = 10) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Reload hot zones centered on user location
    const zones = await DatabaseService.getParkingZones(centerLat, centerLon, 2);

    // Calculate probabilities and distances
    const rankedZones = await Promise.all(
      zones.map(async (zone) => {
        const distance = this.calculateDistance(
          centerLat, centerLon,
          zone.latitude, zone.longitude
        );

        if (distance > maxDistance) {
          return null;
        }

        const probability = await this.predictProbability(
          zone.latitude,
          zone.longitude
        );

        return {
          latitude: zone.latitude,
          longitude: zone.longitude,
          probability,
          distance: Math.round(distance),
          successRate: zone.success_rate,
          totalCount: zone.total_count
        };
      })
    );

    // Filter out nulls and sort by probability and distance
    const validZones = rankedZones
      .filter(zone => zone !== null)
      .sort((a, b) => {
        // Primarily by probability, secondarily by distance
        const probDiff = b.probability - a.probability;
        if (Math.abs(probDiff) > 5) {
          return probDiff;
        }
        return a.distance - b.distance;
      });

    return validZones.slice(0, limit);
  }

  /**
   * Generate hot zone distribution for map visualization
   */
  async getHotZoneDistribution(centerLat, centerLon, radiusKm = 2) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const zones = await DatabaseService.getParkingZones(centerLat, centerLon, radiusKm);

    return zones.map(zone => ({
      latitude: zone.latitude,
      longitude: zone.longitude,
      weight: zone.success_rate * Math.log(zone.total_count + 1), // Log scale for visualization
      radius: zone.radius || 100,
      successRate: zone.success_rate
    }));
  }

  /**
   * Train/update model with new data
   */
  async updateModel() {
    await this.loadHotZones();
    await this.buildTimePatterns();
    console.log('Model updated with latest data');
  }
}

// Export singleton instance
export default new ParkingMLModel();
