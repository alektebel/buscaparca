const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database/db');
const mlModel = require('./services/ParkingMLModel');
const parkingRoutes = require('./routes/parking');
const madridRoutes = require('./routes/madrid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
const path = require('path');
app.use('/test', express.static(path.join(__dirname, '../public')));

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'BuscaParca API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'GET /api/parking/hot-zones': 'Get hot zones for a location',
      'GET /api/parking/find-parking': 'Find best parking zones',
      'GET /api/parking/predict': 'Predict parking probability',
      'POST /api/parking/trajectory': 'Record trajectory point',
      'POST /api/parking/parking-event': 'Record parking event',
      'GET /api/parking/stats': 'Get database statistics',
      'GET /api/madrid/parking': 'Get real-time Madrid parking data',
      'GET /api/madrid/hot-zones': 'Get Madrid hot zones',
      'GET /api/madrid/find-nearby': 'Find Madrid parking nearby',
      'GET /api/madrid/by-district/:district': 'Get parking by district',
      'POST /api/seed': 'Seed demo data'
    }
  });
});

app.use('/api/parking', parkingRoutes);
app.use('/api/madrid', madridRoutes);

// Seed demo data endpoint
app.post('/api/seed', async (req, res) => {
  try {
    const { latitude, longitude, userId = 'demo' } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters: latitude and longitude' 
      });
    }

    const seedData = require('./seed-data');
    const stats = await seedData(parseFloat(latitude), parseFloat(longitude), userId);
    
    await mlModel.initialize();
    
    res.json({
      success: true,
      message: 'Demo data seeded successfully',
      stats
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function start() {
  try {
    console.log('Initializing database...');
    await db.init();
    
    console.log('Initializing ML model...');
    await mlModel.initialize();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(50));
      console.log(`BuscaParca Server running on port ${PORT}`);
      console.log(`API available at: http://localhost:${PORT}`);
      console.log(`Network access: http://0.0.0.0:${PORT}`);
      console.log('='.repeat(50));
      console.log('\nAvailable endpoints:');
      console.log(`  GET  http://localhost:${PORT}/`);
      console.log(`  GET  http://localhost:${PORT}/api/parking/hot-zones?latitude=X&longitude=Y`);
      console.log(`  GET  http://localhost:${PORT}/api/parking/find-parking?latitude=X&longitude=Y`);
      console.log(`  POST http://localhost:${PORT}/api/seed`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
