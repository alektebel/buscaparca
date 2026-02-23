const express = require('express');
const router = express.Router();
const mlModel = require('../services/ParkingMLModel');
const db = require('../database/db');

// Get hot zones for a location
router.get('/hot-zones', async (req, res) => {
  try {
    const { latitude, longitude, radius = 2 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters: latitude and longitude' 
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    const hotZones = await mlModel.getHotZoneDistribution(lat, lon, radiusKm);
    
    res.json({
      success: true,
      zones: hotZones,
      count: hotZones.length
    });
  } catch (error) {
    console.error('Error getting hot zones:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find best parking zones
router.get('/find-parking', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 1000 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters: latitude and longitude' 
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const maxDist = parseFloat(maxDistance);

    const zones = await mlModel.findBestParkingZones(lat, lon, maxDist, 10);
    
    res.json({
      success: true,
      parkingZones: zones.map((zone, index) => ({
        id: `zone_${index}`,
        name: `Zona de Estacionamiento ${index + 1}`,
        latitude: zone.latitude,
        longitude: zone.longitude,
        distance: zone.distance,
        probability: zone.probability,
        type: zone.successRate > 0.7 ? 'Zona Alta Probabilidad' : 'Zona Probable',
        source: 'ml'
      })),
      bestOption: zones.length > 0 ? {
        id: 'best_0',
        name: 'Mejor Opción',
        latitude: zones[0].latitude,
        longitude: zones[0].longitude,
        distance: zones[0].distance,
        probability: zones[0].probability,
        type: zones[0].successRate > 0.7 ? 'Zona Alta Probabilidad' : 'Zona Probable'
      } : null
    });
  } catch (error) {
    console.error('Error finding parking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predict probability for a specific location
router.get('/predict', async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters: latitude and longitude' 
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const ts = timestamp ? parseInt(timestamp) : Date.now();

    const probability = await mlModel.predictProbability(lat, lon, ts);
    
    res.json({
      success: true,
      latitude: lat,
      longitude: lon,
      probability,
      timestamp: ts
    });
  } catch (error) {
    console.error('Error predicting probability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record trajectory point
router.post('/trajectory', async (req, res) => {
  try {
    const { userId, latitude, longitude, speed, heading, accuracy } = req.body;
    
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters: userId, latitude, and longitude' 
      });
    }

    await db.recordTrajectory(userId, {
      latitude,
      longitude,
      speed,
      heading,
      accuracy
    });
    
    res.json({
      success: true,
      message: 'Trajectory recorded'
    });
  } catch (error) {
    console.error('Error recording trajectory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record parking event
router.post('/parking-event', async (req, res) => {
  try {
    const { userId, latitude, longitude, foundParking, searchDuration, streetName } = req.body;
    
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters: userId, latitude, and longitude' 
      });
    }

    await db.recordParkingEvent(userId, {
      latitude,
      longitude,
      streetName
    }, foundParking !== false, searchDuration || 0);

    // Check if we should update the model
    const stats = await db.getStats();
    if (stats.events % 10 === 0) {
      await mlModel.updateModel();
    }
    
    res.json({
      success: true,
      message: 'Parking event recorded'
    });
  } catch (error) {
    console.error('Error recording parking event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
