# BuscaParca Server

Backend server for the BuscaParca parking prediction system. This server handles all ML predictions, database operations, and provides a REST API for the mobile app.

## Features

- **REST API** for parking predictions and hot zones
- **SQLite Database** for storing trajectories and parking events
- **ML Model** for intelligent parking predictions
- **Real-time Data** processing and zone updates
- **Demo Data** seeding for testing

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

```bash
cd server
npm install
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3000 by default.

## API Endpoints

### GET /
Health check and API information

### GET /api/parking/hot-zones
Get hot zones for a location

**Query Parameters:**
- `latitude` (required): Center latitude
- `longitude` (required): Center longitude  
- `radius` (optional): Search radius in km (default: 2)

**Response:**
```json
{
  "success": true,
  "zones": [
    {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "weight": 0.85,
      "radius": 100,
      "successRate": 0.85
    }
  ],
  "count": 10
}
```

### GET /api/parking/find-parking
Find best parking zones near a location

**Query Parameters:**
- `latitude` (required): Your latitude
- `longitude` (required): Your longitude
- `maxDistance` (optional): Max distance in meters (default: 1000)

**Response:**
```json
{
  "success": true,
  "parkingZones": [...],
  "bestOption": {
    "id": "best_0",
    "name": "Mejor Opción",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "distance": 250,
    "probability": 85,
    "type": "Zona Alta Probabilidad"
  }
}
```

### GET /api/parking/predict
Predict parking probability for a specific location

**Query Parameters:**
- `latitude` (required)
- `longitude` (required)
- `timestamp` (optional): Unix timestamp

**Response:**
```json
{
  "success": true,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "probability": 75,
  "timestamp": 1234567890
}
```

### POST /api/parking/trajectory
Record a trajectory point

**Body:**
```json
{
  "userId": "user123",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed": 5.5,
  "heading": 90,
  "accuracy": 10
}
```

### POST /api/parking/parking-event
Record a parking event

**Body:**
```json
{
  "userId": "user123",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "foundParking": true,
  "searchDuration": 120,
  "streetName": "Main St"
}
```

### GET /api/parking/stats
Get database statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "trajectories": 1000,
    "events": 500,
    "zones": 50
  }
}
```

### POST /api/seed
Seed demo data (for testing)

**Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "userId": "demo"
}
```

## Project Structure

```
server/
├── src/
│   ├── database/
│   │   └── db.js              # SQLite database operations
│   ├── services/
│   │   └── ParkingMLModel.js  # ML prediction model
│   ├── routes/
│   │   └── parking.js         # API routes
│   ├── seed-data.js           # Demo data generator
│   └── index.js               # Server entry point
├── package.json
└── README.md
```

## Database Schema

### trajectories
- `id`: INTEGER PRIMARY KEY
- `user_id`: TEXT
- `latitude`: REAL
- `longitude`: REAL
- `timestamp`: INTEGER
- `speed`: REAL
- `heading`: REAL
- `accuracy`: REAL

### parking_events
- `id`: INTEGER PRIMARY KEY
- `user_id`: TEXT
- `latitude`: REAL
- `longitude`: REAL
- `timestamp`: INTEGER
- `day_of_week`: INTEGER
- `hour`: INTEGER
- `found_parking`: INTEGER (0 or 1)
- `search_duration`: INTEGER
- `street_name`: TEXT

### parking_zones
- `id`: INTEGER PRIMARY KEY
- `latitude`: REAL
- `longitude`: REAL
- `radius`: REAL (default: 100)
- `success_count`: INTEGER
- `total_count`: INTEGER
- `last_updated`: INTEGER

## Testing

Test individual endpoints with curl:

```bash
# Health check
curl http://localhost:3000/

# Get hot zones
curl "http://localhost:3000/api/parking/hot-zones?latitude=40.7128&longitude=-74.0060"

# Find parking
curl "http://localhost:3000/api/parking/find-parking?latitude=40.7128&longitude=-74.0060"

# Seed demo data
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7128, "longitude": -74.0060, "userId": "demo"}'
```

## Configuration

The server runs on `0.0.0.0:3000` by default, making it accessible from your local network.

To change the port, set the `PORT` environment variable:
```bash
PORT=8080 npm start
```

## Connecting from Mobile App

1. Find your computer's local IP address:
   - **Windows**: `ipconfig`
   - **Mac/Linux**: `ifconfig` or `ip addr`

2. Update the `SERVER_URL` in `src/services/ApiService.js` on the mobile app:
   ```javascript
   const SERVER_URL = 'http://YOUR_IP_ADDRESS:3000/api';
   ```

3. Make sure both devices are on the same WiFi network

4. Start the server: `npm start`

5. Run the mobile app

## Troubleshooting

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use a different port
PORT=3001 npm start
```

**Mobile app can't connect:**
- Verify server is running: Check console output
- Check firewall settings on your computer
- Ensure both devices are on same network
- Try accessing `http://YOUR_IP:3000` from mobile browser first

**Database locked:**
- Only one server instance should run at a time
- Delete `buscaparca.db` and restart if corrupted

## License

MIT
