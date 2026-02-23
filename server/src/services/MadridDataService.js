// Madrid Open Data Integration Module
const axios = require('axios');

const MADRID_PARKING_API = 'https://datos.madrid.es/egob/catalogo/208862-0-aparcamientos-publicos.json';

/**
 * Fetch real-time parking data from Madrid Open Data API
 */
async function fetchMadridParkingData() {
  try {
    const response = await axios.get(MADRID_PARKING_API, {
      timeout: 10000
    });

    if (response.data && response.data['@graph']) {
      const parkingData = response.data['@graph']
        .map(item => {
          const location = item.location;
          const address = item.address;
          
          if (!location || !location.latitude || !location.longitude) {
            return null;
          }

          return {
            id: item.id || item['@id'],
            name: item.title || 'Unknown',
            latitude: location.latitude,
            longitude: location.longitude,
            address: address?.['street-address'] || '',
            district: address?.district?.['title'] || '',
            neighborhood: address?.area?.['title'] || '',
            totalSpaces: item.capacity || 0,
            freeSpaces: item['free-places'] || 0,
            occupiedSpaces: item['occupied-places'] || 0,
            occupancyRate: item.capacity ? (item['occupied-places'] || 0) / item.capacity : 0,
            lastUpdate: Date.now()
          };
        })
        .filter(item => item !== null);

      return parkingData;
    }

    return [];
  } catch (error) {
    console.error('Error fetching Madrid parking data:', error.message);
    return [];
  }
}

/**
 * Convert Madrid parking data to parking zones format
 */
function convertToZones(madridData) {
  return madridData.map(parking => {
    // Free spaces indicate higher success rate
    const successRate = parking.freeSpaces / Math.max(parking.totalSpaces, 1);
    
    return {
      latitude: parking.latitude,
      longitude: parking.longitude,
      radius: 100, // 100 meter radius
      successCount: parking.freeSpaces,
      totalCount: parking.totalSpaces,
      weight: successRate,
      district: parking.district,
      neighborhood: parking.neighborhood,
      source: 'madrid_open_data',
      name: parking.name
    };
  });
}

/**
 * Get Madrid-specific parking zones with real-time data
 */
async function getMadridHotZones() {
  try {
    const madridData = await fetchMadridParkingData();
    const zones = convertToZones(madridData);
    
    // Filter for zones with reasonable data
    return zones.filter(zone => zone.totalCount > 0);
  } catch (error) {
    console.error('Error getting Madrid hot zones:', error);
    return [];
  }
}

/**
 * Find parking near a location using Madrid data
 */
async function findMadridParkingNear(latitude, longitude, radiusMeters = 1000) {
  try {
    const madridData = await fetchMadridParkingData();
    
    // Calculate distance and filter by radius
    const nearbyParking = madridData
      .map(parking => {
        const distance = calculateDistance(
          latitude,
          longitude,
          parking.latitude,
          parking.longitude
        );
        
        return {
          ...parking,
          distance
        };
      })
      .filter(p => p.distance <= radiusMeters)
      .sort((a, b) => {
        // Sort by availability first, then by distance
        const aScore = (a.freeSpaces / Math.max(a.totalSpaces, 1)) * 1000 - a.distance;
        const bScore = (b.freeSpaces / Math.max(b.totalSpaces, 1)) * 1000 - b.distance;
        return bScore - aScore;
      });

    return nearbyParking;
  } catch (error) {
    console.error('Error finding Madrid parking:', error);
    return [];
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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

module.exports = {
  fetchMadridParkingData,
  getMadridHotZones,
  findMadridParkingNear,
  convertToZones
};
