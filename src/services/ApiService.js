// API Service to communicate with backend server
// Replace SERVER_URL with your computer's IP address

const SERVER_URL = 'http://192.168.1.120:3000/api';

export const ApiService = {
  /**
   * Get hot zones for a location
   */
  async getHotZones(latitude, longitude, radius = 2) {
    try {
      const response = await fetch(
        `${SERVER_URL}/parking/hot-zones?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.zones || [];
    } catch (error) {
      console.error('Error fetching hot zones:', error);
      return [];
    }
  },

  /**
   * Find best parking zones near location
   */
  async findParking(latitude, longitude, maxDistance = 1000) {
    try {
      const response = await fetch(
        `${SERVER_URL}/parking/find-parking?latitude=${latitude}&longitude=${longitude}&maxDistance=${maxDistance}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        parkingZones: data.parkingZones || [],
        bestOption: data.bestOption
      };
    } catch (error) {
      console.error('Error finding parking:', error);
      return { parkingZones: [], bestOption: null };
    }
  },

  /**
   * Predict parking probability for a location
   */
  async predictProbability(latitude, longitude, timestamp = Date.now()) {
    try {
      const response = await fetch(
        `${SERVER_URL}/parking/predict?latitude=${latitude}&longitude=${longitude}&timestamp=${timestamp}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.probability || 50;
    } catch (error) {
      console.error('Error predicting probability:', error);
      return 50;
    }
  },

  /**
   * Record trajectory point
   */
  async recordTrajectory(userId, location) {
    try {
      const response = await fetch(`${SERVER_URL}/parking/trajectory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error recording trajectory:', error);
      return false;
    }
  },

  /**
   * Record parking event
   */
  async recordParkingEvent(userId, location, foundParking, searchDuration) {
    try {
      const response = await fetch(`${SERVER_URL}/parking/parking-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          latitude: location.latitude,
          longitude: location.longitude,
          foundParking,
          searchDuration,
          streetName: location.streetName
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error recording parking event:', error);
      return false;
    }
  },

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const response = await fetch(`${SERVER_URL}/parking/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.stats || { trajectories: 0, events: 0, zones: 0 };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { trajectories: 0, events: 0, zones: 0 };
    }
  },

  /**
   * Seed demo data on server
   */
  async seedDemoData(latitude, longitude, userId = 'demo') {
    try {
      const response = await fetch(`${SERVER_URL.replace('/api', '')}/api/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          userId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error seeding demo data:', error);
      throw error;
    }
  },

  /**
   * Test server connection
   */
  async testConnection() {
    try {
      const response = await fetch(SERVER_URL.replace('/api', '/'));
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.status === 'running';
    } catch (error) {
      console.error('Server connection failed:', error);
      return false;
    }
  }
};
