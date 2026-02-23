import * as SQLite from 'expo-sqlite';

/**
 * DatabaseService - Manages SQLite database for storing user trajectories
 * and parking events for future ML model training
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database and create tables if they don't exist
   */
  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('buscaparca.db');
      
      // Create trajectories table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS trajectories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          speed REAL,
          heading REAL,
          accuracy REAL
        );
      `);

      // Create parking_events table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS parking_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          day_of_week INTEGER,
          hour INTEGER,
          found_parking INTEGER DEFAULT 1,
          search_duration INTEGER,
          street_name TEXT
        );
      `);

      // Create parking_zones table for hot zones
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS parking_zones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          radius REAL DEFAULT 100,
          success_count INTEGER DEFAULT 0,
          total_count INTEGER DEFAULT 0,
          last_updated INTEGER
        );
      `);

      // Create indexes for better query performance
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_trajectories_user_timestamp 
        ON trajectories(user_id, timestamp);
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_parking_events_location 
        ON parking_events(latitude, longitude);
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_parking_zones_location 
        ON parking_zones(latitude, longitude);
      `);

      this.isInitialized = true;
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Record a trajectory point
   */
  async recordTrajectoryPoint(userId, location) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const { latitude, longitude, speed = null, heading = null, accuracy = null } = location;
      const timestamp = Date.now();

      await this.db.runAsync(
        `INSERT INTO trajectories (user_id, latitude, longitude, timestamp, speed, heading, accuracy)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, latitude, longitude, timestamp, speed, heading, accuracy]
      );

      return true;
    } catch (error) {
      console.error('Error recording trajectory point:', error);
      return false;
    }
  }

  /**
   * Record a parking event
   */
  async recordParkingEvent(userId, location, foundParking = true, searchDuration = 0) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const { latitude, longitude, streetName = null } = location;
      const timestamp = Date.now();
      const date = new Date(timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      await this.db.runAsync(
        `INSERT INTO parking_events 
         (user_id, latitude, longitude, timestamp, day_of_week, hour, found_parking, search_duration, street_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, latitude, longitude, timestamp, dayOfWeek, hour, foundParking ? 1 : 0, searchDuration, streetName]
      );

      // Update parking zone statistics
      await this.updateParkingZone(latitude, longitude, foundParking);

      return true;
    } catch (error) {
      console.error('Error recording parking event:', error);
      return false;
    }
  }

  /**
   * Update or create parking zone statistics
   */
  async updateParkingZone(latitude, longitude, success) {
    try {
      // Check if zone exists within 100m radius
      const zones = await this.db.getAllAsync(
        `SELECT * FROM parking_zones 
         WHERE ABS(latitude - ?) < 0.001 AND ABS(longitude - ?) < 0.001
         LIMIT 1`,
        [latitude, longitude]
      );

      const timestamp = Date.now();

      if (zones.length > 0) {
        // Update existing zone
        const zone = zones[0];
        const newSuccessCount = zone.success_count + (success ? 1 : 0);
        const newTotalCount = zone.total_count + 1;

        await this.db.runAsync(
          `UPDATE parking_zones 
           SET success_count = ?, total_count = ?, last_updated = ?
           WHERE id = ?`,
          [newSuccessCount, newTotalCount, timestamp, zone.id]
        );
      } else {
        // Create new zone
        await this.db.runAsync(
          `INSERT INTO parking_zones (latitude, longitude, success_count, total_count, last_updated)
           VALUES (?, ?, ?, 1, ?)`,
          [latitude, longitude, success ? 1 : 0, timestamp]
        );
      }
    } catch (error) {
      console.error('Error updating parking zone:', error);
    }
  }

  /**
   * Get parking zones (hot zones)
   */
  async getParkingZones(centerLat, centerLon, radiusKm = 2) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Approximate degree delta for radius
      const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111 km
      const lonDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

      const zones = await this.db.getAllAsync(
        `SELECT *, 
         (CAST(success_count AS REAL) / total_count) as success_rate
         FROM parking_zones
         WHERE latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
         AND total_count >= 3
         ORDER BY success_rate DESC, total_count DESC
         LIMIT 50`,
        [
          centerLat - latDelta,
          centerLat + latDelta,
          centerLon - lonDelta,
          centerLon + lonDelta
        ]
      );

      return zones;
    } catch (error) {
      console.error('Error getting parking zones:', error);
      return [];
    }
  }

  /**
   * Get user trajectory history
   */
  async getUserTrajectories(userId, limit = 1000) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const trajectories = await this.db.getAllAsync(
        `SELECT * FROM trajectories 
         WHERE user_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [userId, limit]
      );

      return trajectories;
    } catch (error) {
      console.error('Error getting user trajectories:', error);
      return [];
    }
  }

  /**
   * Get parking events for analysis
   */
  async getParkingEvents(limit = 1000) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const events = await this.db.getAllAsync(
        `SELECT * FROM parking_events 
         ORDER BY timestamp DESC
         LIMIT ?`,
        [limit]
      );

      return events;
    } catch (error) {
      console.error('Error getting parking events:', error);
      return [];
    }
  }

  /**
   * Get statistics for a specific location
   */
  async getLocationStats(latitude, longitude, radiusMeters = 200) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Convert meters to approximate degrees
      const radiusDegrees = radiusMeters / 111000;

      const stats = await this.db.getAllAsync(
        `SELECT 
           COUNT(*) as total_events,
           SUM(found_parking) as successful_events,
           AVG(search_duration) as avg_search_duration,
           day_of_week,
           hour
         FROM parking_events
         WHERE latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
         GROUP BY day_of_week, hour`,
        [
          latitude - radiusDegrees,
          latitude + radiusDegrees,
          longitude - radiusDegrees,
          longitude + radiusDegrees
        ]
      );

      return stats;
    } catch (error) {
      console.error('Error getting location stats:', error);
      return [];
    }
  }

  /**
   * Clear old trajectory data (keep last 30 days)
   */
  async cleanOldTrajectories() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      await this.db.runAsync(
        'DELETE FROM trajectories WHERE timestamp < ?',
        [thirtyDaysAgo]
      );

      console.log('Old trajectories cleaned');
      return true;
    } catch (error) {
      console.error('Error cleaning old trajectories:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const trajectoryCount = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM trajectories'
      );
      
      const eventCount = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM parking_events'
      );
      
      const zoneCount = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM parking_zones'
      );

      return {
        trajectories: trajectoryCount?.count || 0,
        events: eventCount?.count || 0,
        zones: zoneCount?.count || 0
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { trajectories: 0, events: 0, zones: 0 };
    }
  }
}

// Export singleton instance
export default new DatabaseService();
