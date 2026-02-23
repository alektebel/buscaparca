const express = require('express');
const router = express.Router();
const madridService = require('../services/MadridDataService');

/**
 * Get real-time Madrid parking data
 * GET /api/madrid/parking
 */
router.get('/parking', async (req, res) => {
  try {
    const parkingData = await madridService.fetchMadridParkingData();
    
    res.json({
      success: true,
      count: parkingData.length,
      data: parkingData,
      lastUpdate: Date.now()
    });
  } catch (error) {
    console.error('Error fetching Madrid parking data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch Madrid parking data' 
    });
  }
});

/**
 * Get Madrid hot zones
 * GET /api/madrid/hot-zones
 */
router.get('/hot-zones', async (req, res) => {
  try {
    const zones = await madridService.getMadridHotZones();
    
    res.json({
      success: true,
      zones,
      count: zones.length
    });
  } catch (error) {
    console.error('Error getting Madrid hot zones:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch Madrid hot zones' 
    });
  }
});

/**
 * Find parking near a location in Madrid
 * GET /api/madrid/find-nearby?latitude=40.4168&longitude=-3.7038&radius=1000
 */
router.get('/find-nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required parameters: latitude and longitude' 
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusMeters = parseFloat(radius);

    const nearbyParking = await madridService.findMadridParkingNear(lat, lon, radiusMeters);
    
    res.json({
      success: true,
      location: { latitude: lat, longitude: lon },
      radius: radiusMeters,
      results: nearbyParking,
      count: nearbyParking.length
    });
  } catch (error) {
    console.error('Error finding nearby Madrid parking:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to find nearby parking' 
    });
  }
});

/**
 * Get parking availability by district
 * GET /api/madrid/by-district/:district
 */
router.get('/by-district/:district', async (req, res) => {
  try {
    const { district } = req.params;
    const parkingData = await madridService.fetchMadridParkingData();
    
    const districtParking = parkingData.filter(p => 
      p.district.toLowerCase().includes(district.toLowerCase())
    );
    
    res.json({
      success: true,
      district,
      count: districtParking.length,
      data: districtParking
    });
  } catch (error) {
    console.error('Error fetching district parking:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch district parking data' 
    });
  }
});

module.exports = router;
