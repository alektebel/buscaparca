const db = require('../database/db');

class ParkingMLModel {
  constructor() {
    this.hotZones = [];
    this.timePatterns = new Map();
  }

  async initialize() {
    try {
      await this.loadHotZones();
      await this.buildTimePatterns();
      console.log('ML Model initialized');
      return true;
    } catch (error) {
      console.error('Error initializing ML model:', error);
      return false;
    }
  }

  async loadHotZones() {
    try {
      const zones = await db.getParkingZones(0, 0, 10);
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

  async buildTimePatterns() {
    try {
      const events = await db.getParkingEvents(10000);
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

  calculateDistance(lat1, lon1, lat2, lon2) {
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
  }

  getTimeFactor(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const key = `${dayOfWeek}_${hour}`;

    const pattern = this.timePatterns.get(key);
    
    if (pattern && pattern.total >= 5) {
      return pattern.successRate;
    }

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
  }

  getSpatialFactor(latitude, longitude) {
    if (this.hotZones.length === 0) {
      return 0.5;
    }

    let maxFactor = 0;

    this.hotZones.forEach(zone => {
      const distance = this.calculateDistance(
        latitude, longitude,
        zone.latitude, zone.longitude
      );

      if (distance <= zone.radius * 2) {
        const proximityFactor = 1 - (distance / (zone.radius * 2));
        const zoneFactor = zone.successRate * proximityFactor;
        maxFactor = Math.max(maxFactor, zoneFactor);
      }
    });

    return maxFactor || 0.5;
  }

  async predictProbability(latitude, longitude, timestamp = Date.now()) {
    const timeFactor = this.getTimeFactor(timestamp);
    const spatialFactor = this.getSpatialFactor(latitude, longitude);

    const locationStats = await db.getLocationStats(latitude, longitude, 200);
    
    let locationFactor = 0.5;
    if (locationStats.length > 0) {
      const date = new Date(timestamp);
      const currentHour = date.getHours();
      const currentDay = date.getDay();
      
      const matchingStat = locationStats.find(
        stat => stat.hour === currentHour && stat.day_of_week === currentDay
      );
      
      if (matchingStat && matchingStat.total_events >= 3) {
        locationFactor = matchingStat.successful_events / matchingStat.total_events;
      }
    }

    const probability = (
      timeFactor * 0.4 +
      spatialFactor * 0.3 +
      locationFactor * 0.3
    );

    const variation = (Math.random() - 0.5) * 0.1;
    const finalProbability = Math.max(0, Math.min(1, probability + variation));

    return Math.round(finalProbability * 100);
  }

  async findBestParkingZones(centerLat, centerLon, maxDistance = 1000, limit = 10) {
    const zones = await db.getParkingZones(centerLat, centerLon, 2);

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

    const validZones = rankedZones
      .filter(zone => zone !== null)
      .sort((a, b) => {
        const probDiff = b.probability - a.probability;
        if (Math.abs(probDiff) > 5) {
          return probDiff;
        }
        return a.distance - b.distance;
      });

    return validZones.slice(0, limit);
  }

  async getHotZoneDistribution(centerLat, centerLon, radiusKm = 2) {
    const zones = await db.getParkingZones(centerLat, centerLon, radiusKm);

    return zones.map(zone => ({
      latitude: zone.latitude,
      longitude: zone.longitude,
      weight: zone.success_rate * Math.log(zone.total_count + 1),
      radius: zone.radius || 100,
      successRate: zone.success_rate
    }));
  }

  async updateModel() {
    await this.loadHotZones();
    await this.buildTimePatterns();
    console.log('Model updated');
  }
}

module.exports = new ParkingMLModel();
