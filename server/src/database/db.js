const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, '../../buscaparca.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS trajectories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        speed REAL,
        heading REAL,
        accuracy REAL
      )`,
      
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS parking_zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius REAL DEFAULT 100,
        success_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        last_updated INTEGER
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_trajectories_user_timestamp 
       ON trajectories(user_id, timestamp)`,
      
      `CREATE INDEX IF NOT EXISTS idx_parking_events_location 
       ON parking_events(latitude, longitude)`,
      
      `CREATE INDEX IF NOT EXISTS idx_parking_zones_location 
       ON parking_zones(latitude, longitude)`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }
    
    console.log('Database tables created');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async recordTrajectory(userId, location) {
    const { latitude, longitude, speed = null, heading = null, accuracy = null } = location;
    const timestamp = Date.now();

    return this.run(
      `INSERT INTO trajectories (user_id, latitude, longitude, timestamp, speed, heading, accuracy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, latitude, longitude, timestamp, speed, heading, accuracy]
    );
  }

  async recordParkingEvent(userId, location, foundParking = true, searchDuration = 0) {
    const { latitude, longitude, streetName = null } = location;
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    const result = await this.run(
      `INSERT INTO parking_events 
       (user_id, latitude, longitude, timestamp, day_of_week, hour, found_parking, search_duration, street_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, latitude, longitude, timestamp, dayOfWeek, hour, foundParking ? 1 : 0, searchDuration, streetName]
    );

    await this.updateParkingZone(latitude, longitude, foundParking);
    return result;
  }

  async updateParkingZone(latitude, longitude, success) {
    const zones = await this.all(
      `SELECT * FROM parking_zones 
       WHERE ABS(latitude - ?) < 0.001 AND ABS(longitude - ?) < 0.001
       LIMIT 1`,
      [latitude, longitude]
    );

    const timestamp = Date.now();

    if (zones.length > 0) {
      const zone = zones[0];
      const newSuccessCount = zone.success_count + (success ? 1 : 0);
      const newTotalCount = zone.total_count + 1;

      return this.run(
        `UPDATE parking_zones 
         SET success_count = ?, total_count = ?, last_updated = ?
         WHERE id = ?`,
        [newSuccessCount, newTotalCount, timestamp, zone.id]
      );
    } else {
      return this.run(
        `INSERT INTO parking_zones (latitude, longitude, success_count, total_count, last_updated)
         VALUES (?, ?, ?, 1, ?)`,
        [latitude, longitude, success ? 1 : 0, timestamp]
      );
    }
  }

  async getParkingZones(centerLat, centerLon, radiusKm = 2) {
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

    return this.all(
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
  }

  async getLocationStats(latitude, longitude, radiusMeters = 200) {
    const radiusDegrees = radiusMeters / 111000;

    return this.all(
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
  }

  async getParkingEvents(limit = 1000) {
    return this.all(
      `SELECT * FROM parking_events 
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    );
  }

  async getStats() {
    const trajectoryCount = await this.get('SELECT COUNT(*) as count FROM trajectories');
    const eventCount = await this.get('SELECT COUNT(*) as count FROM parking_events');
    const zoneCount = await this.get('SELECT COUNT(*) as count FROM parking_zones');

    return {
      trajectories: trajectoryCount?.count || 0,
      events: eventCount?.count || 0,
      zones: zoneCount?.count || 0
    };
  }
}

module.exports = new Database();
