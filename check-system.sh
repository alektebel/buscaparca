#!/bin/bash

# BuscaParca System Check
# Verifies everything is configured correctly

echo "=================================="
echo "   BuscaParca System Check"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Not installed"
    ERRORS=$((ERRORS+1))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} Not installed"
    ERRORS=$((ERRORS+1))
fi

# Check IP address
echo -n "Computer IP address... "
IP=$(hostname -I | awk '{print $1}')
if [ -n "$IP" ]; then
    echo -e "${GREEN}✓${NC} $IP"
else
    echo -e "${RED}✗${NC} Could not determine IP"
    ERRORS=$((ERRORS+1))
fi

# Check server dependencies
echo -n "Server dependencies... "
if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}⚠${NC} Not installed (run: cd server && npm install)"
fi

# Check mobile app dependencies
echo -n "Mobile app dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}⚠${NC} Not installed (run: npm install)"
fi

# Check if server is running
echo -n "Backend server... "
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Running on port 3000"
    
    # Check database
    STATS=$(curl -s http://localhost:3000/api/parking/stats 2>/dev/null)
    if [ -n "$STATS" ]; then
        echo "  └─ Database stats: $STATS"
    fi
else
    echo -e "${YELLOW}⚠${NC} Not running (start with: cd server && npm start)"
fi

# Check ApiService configuration
echo -n "Mobile app API config... "
CONFIGURED_IP=$(grep "const SERVER_URL" src/services/ApiService.js | sed "s/.*http:\/\/\([^:]*\).*/\1/")
if [ "$CONFIGURED_IP" == "$IP" ]; then
    echo -e "${GREEN}✓${NC} Configured for $CONFIGURED_IP"
else
    echo -e "${YELLOW}⚠${NC} Configured for $CONFIGURED_IP (your IP is $IP)"
    echo "  └─ Update src/services/ApiService.js line 4"
fi

# Check if Expo server is running
echo -n "Expo dev server... "
if lsof -ti:8081 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Running on port 8081"
else
    echo -e "${YELLOW}⚠${NC} Not running (start with: npm start)"
fi

# Run tests
echo ""
echo "Running tests..."
if npm test > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} All tests passed"
else
    echo -e "${RED}✗${NC} Some tests failed"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "=================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ System check passed!${NC}"
    echo ""
    echo "Ready to run BuscaParca:"
    echo "  ./start-buscaparca.sh"
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    echo "Fix the errors above before starting"
fi
echo "=================================="
