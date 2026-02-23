#!/bin/bash

# BuscaParca Startup Script
# This script starts both the backend server and mobile app

set -e

echo "=================================="
echo "   BuscaParca Startup Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get IP address
IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}✓${NC} Computer IP Address: ${YELLOW}$IP${NC}"
echo ""

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}⚠${NC} Installing server dependencies..."
    cd server && npm install && cd ..
    echo -e "${GREEN}✓${NC} Server dependencies installed"
fi

# Check if mobile app dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠${NC} Installing mobile app dependencies..."
    npm install
    echo -e "${GREEN}✓${NC} Mobile app dependencies installed"
fi

echo ""
echo "=================================="
echo "   Starting Backend Server"
echo "=================================="
echo ""

# Kill any existing server on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start server in background
cd server
npm start > ../server.log 2>&1 &
SERVER_PID=$!
cd ..

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Test server
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend server is running on port 3000"
    echo -e "${GREEN}✓${NC} Server URL: ${YELLOW}http://$IP:3000${NC}"
    
    # Get stats
    STATS=$(curl -s http://localhost:3000/api/parking/stats)
    echo -e "${GREEN}✓${NC} Database stats: $STATS"
else
    echo -e "${RED}✗${NC} Server failed to start!"
    echo "Check server.log for errors"
    exit 1
fi

echo ""
echo "=================================="
echo "   Server is Ready!"
echo "=================================="
echo ""
echo "Backend Server: ${GREEN}RUNNING${NC}"
echo "Server URL: http://$IP:3000"
echo "API Endpoint: http://$IP:3000/api"
echo "Server Logs: server.log"
echo ""

# Check ApiService.js configuration
CONFIGURED_IP=$(grep "const SERVER_URL" src/services/ApiService.js | sed "s/.*http:\/\/\([^:]*\).*/\1/")
echo "Mobile app configured for IP: $CONFIGURED_IP"

if [ "$CONFIGURED_IP" != "$IP" ]; then
    echo -e "${YELLOW}⚠ WARNING:${NC} Mobile app is configured for $CONFIGURED_IP but your IP is $IP"
    echo "You may need to update src/services/ApiService.js"
    echo ""
fi

echo "=================================="
echo "   Starting Mobile App"
echo "=================================="
echo ""

# Kill any existing Expo server
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true
lsof -ti:19001 | xargs kill -9 2>/dev/null || true

echo "Starting Expo development server..."
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Wait for QR code to appear below"
echo "2. Install 'Expo Go' from Play Store on your Android phone"
echo "3. Make sure phone is on WiFi: ${YELLOW}same network as this computer${NC}"
echo "4. Scan QR code with Expo Go app"
echo ""
echo "Or connect manually in Expo Go:"
echo "  • Tap 'Enter URL manually'"
echo "  • Type: ${YELLOW}exp://$IP:8081${NC}"
echo ""
echo "=================================="
echo ""

# Start Expo
npx expo start

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null || true" EXIT
