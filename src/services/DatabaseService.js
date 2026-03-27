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
      // For Expo SDK 50, use SQLite.openDatabase (not openDatabaseAsync)
      this.db = SQLite.openDatabase('buscaparca.db');
      
      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            // Create trajectories table
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS trajectories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                timestamp INTEGER NOT NULL,
                speed REAL,
                heading REAL,
                accuracy REAL
              );`
            );

            // Create parking_events table
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS parking_events (
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
              );`
            );

            // Create parking_zones table for hot zones
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS parking_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                radius REAL DEFAULT 100,
                success_count INTEGER DEFAULT 0,
                total_count INTEGER DEFAULT 0,
                last_updated INTEGER
              );`
            );

            // Create indexes for better query performance
            tx.executeSql(
              `CREATE INDEX IF NOT EXISTS idx_trajectories_user_timestamp 
              ON trajectories(user_id, timestamp);`
            );

            tx.executeSql(
              `CREATE INDEX IF NOT EXISTS idx_parking_events_location 
              ON parking_events(latitude, longitude);`
            );

            tx.executeSql(
              `CREATE INDEX IF NOT EXISTS idx_parking_zones_location 
              ON parking_zones(latitude, longitude);`
            );
          },
          error => {
            console.error('Error initializing database:', error);
            reject(error);
          },
          () => {
            this.isInitialized = true;
            console.log('Database initialized successfully');
            resolve(true);
          }
        );
      });
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

    return new Promise((resolve, reject) => {
      try {
        const { latitude, longitude, speed = null, heading = null, accuracy = null } = location;
        const timestamp = Date.now();

        this.db.transaction(
          tx => {
            tx.executeSql(
              `INSERT INTO trajectories (user_id, latitude, longitude, timestamp, speed, heading, accuracy)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [userId, latitude, longitude, timestamp, speed, heading, accuracy]
            );
          },
          error => {
            console.error('Error recording trajectory point:', error);
            resolve(false);
          },
          () => {
            resolve(true);
          }
        );
      } catch (error) {
        console.error('Error recording trajectory point:', error);
        resolve(false);
      }
    });
  }

  /**
   * Record a parking event
   */
  async recordParkingEvent(userId, location, foundParking = true, searchDuration = 0) {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const { latitude, longitude, streetName = null } = location;
        const timestamp = Date.now();
        const date = new Date(timestamp);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();

        this.db.transaction(
          tx => {
            tx.executeSql(
              `INSERT INTO parking_events 
               (user_id, latitude, longitude, timestamp, day_of_week, hour, found_parking, search_duration, street_name)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [userId, latitude, longitude, timestamp, dayOfWeek, hour, foundParking ? 1 : 0, searchDuration, streetName]
            );
          },
          error => {
            console.error('Error recording parking event:', error);
            resolve(false);
          },
          async () => {
            // Update parking zone statistics
            await this.updateParkingZone(latitude, longitude, foundParking);
            resolve(true);
          }
        );
      } catch (error) {
        console.error('Error recording parking event:', error);
        resolve(false);
      }
    });
  }

  /**
   * Update or create parking zone statistics
   */
  async updateParkingZone(latitude, longitude, success) {
    return new Promise((resolve, reject) => {
      try {
        const timestamp = Date.now();

        this.db.transaction(tx => {
          // Check if zone exists within 100m radius
          tx.executeSql(
            `SELECT * FROM parking_zones 
             WHERE ABS(latitude - ?) < 0.001 AND ABS(longitude - ?) < 0.001
             LIMIT 1`,
            [latitude, longitude],
            (_, { rows }) => {
              const zones = rows._array || [];
              
              if (zones.length > 0) {
                // Update existing zone
                const zone = zones[0];
                const newSuccessCount = zone.success_count + (success ? 1 : 0);
                const newTotalCount = zone.total_count + 1;

                tx.executeSql(
                  `UPDATE parking_zones 
                   SET success_count = ?, total_count = ?, last_updated = ?
                   WHERE id = ?`,
                  [newSuccessCount, newTotalCount, timestamp, zone.id]
                );
              } else {
                // Create new zone
                tx.executeSql(
                  `INSERT INTO parking_zones (latitude, longitude, success_count, total_count, last_updated)
                   VALUES (?, ?, ?, 1, ?)`,
                  [latitude, longitude, success ? 1 : 0, timestamp]
                );
              }
            }
          );
        }, 
        error => {
          console.error('Error updating parking zone:', error);
          resolve();
        },
        () => {
          resolve();
        });
      } catch (error) {
        console.error('Error updating parking zone:', error);
        resolve();
      }
    });
  }

  /**
   * Get parking zones (hot zones)
   */
  async getParkingZones(centerLat, centerLon, radiusKm = 2) {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        // Approximate degree delta for radius
        const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111 km
        const lonDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

        this.db.transaction(tx => {
          tx.executeSql(
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
            ],
            (_, { rows }) => {
              resolve(rows._array || []);
            }
          );
        },
        error => {
          console.error('Error getting parking zones:', error);
          resolve([]);
        });
      } catch (error) {
        console.error('Error getting parking zones:', error);
        resolve([]);
      }
    });
  }

  /**
   * Get user trajectory history
   */
  async getUserTrajectories(userId, limit = 1000) {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        this.db.transaction(tx => {
          tx.executeSql(
            `SELECT * FROM trajectories 
             WHERE user_id = ?
             ORDER BY timestamp DESC
             LIMIT ?`,
            [userId, limit],
            (_, { rows }) => {
              resolve(rows._array || []);
            }
          );
        },
        error => {
          console.error('Error getting user trajectories:', error);
          resolve([]);
        });
      } catch (error) {
        console.error('Error getting user trajectories:', error);
        resolve([]);
      }
    });
  }

  /**
   * Get parking events for analysis
   */
  async getParkingEvents(limit = 1000) {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        this.db.transaction(tx => {
          tx.executeSql(
            `SELECT * FROM parking_events 
             ORDER BY timestamp DESC
             LIMIT ?`,
            [limit],
            (_, { rows }) => {
              resolve(rows._array || []);
            }
          );
        },
        error => {
          console.error('Error getting parking events:', error);
          resolve([]);
        });
      } catch (error) {
        console.error('Error getting parking events:', error);
        resolve([]);
      }
    });
  }

  /**
   * Get statistics for a specific location
   */
  async getLocationStats(latitude, longitude, radiusMeters = 200) {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        // Convert meters to approximate degrees
        const radiusDegrees = radiusMeters / 111000;

        this.db.transaction(tx => {
          tx.executeSql(
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
            ],
            (_, { rows }) => {
              resolve(rows._array || []);
            }
          );
        },
        error => {
          console.error('Error getting location stats:', error);
          resolve([]);
        });
      } catch (error) {
        console.error('Error getting location stats:', error);
        resolve([]);
      }
    });
  }

  /**
   * Clear old trajectory data (keep last 30 days)
   */
  async cleanOldTrajectories() {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        this.db.transaction(
          tx => {
            tx.executeSql(
              'DELETE FROM trajectories WHERE timestamp < ?',
              [thirtyDaysAgo]
            );
          },
          error => {
            console.error('Error cleaning old trajectories:', error);
            resolve(false);
          },
          () => {
            console.log('Old trajectories cleaned');
            resolve(true);
          }
        );
      } catch (error) {
        console.error('Error cleaning old trajectories:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const stats = { trajectories: 0, events: 0, zones: 0 };
        
        this.db.transaction(tx => {
          tx.executeSql(
            'SELECT COUNT(*) as count FROM trajectories',
            [],
            (_, { rows }) => {
              stats.trajectories = rows._array[0]?.count || 0;
            }
          );
          
          tx.executeSql(
            'SELECT COUNT(*) as count FROM parking_events',
            [],
            (_, { rows }) => {
              stats.events = rows._array[0]?.count || 0;
            }
          );
          
          tx.executeSql(
            'SELECT COUNT(*) as count FROM parking_zones',
            [],
            (_, { rows }) => {
              stats.zones = rows._array[0]?.count || 0;
            }
          );
        },
        error => {
          console.error('Error getting stats:', error);
          resolve({ trajectories: 0, events: 0, zones: 0 });
        },
        () => {
          resolve(stats);
        });
      } catch (error) {
        console.error('Error getting stats:', error);
        resolve({ trajectories: 0, events: 0, zones: 0 });
      }
    });
  }
}

// Export singleton instance
export default new DatabaseService();
