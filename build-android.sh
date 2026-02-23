#!/bin/bash

# BuscaParca EAS Build Script
# Automates the Android APK build process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo "=================================="
echo "   🚗 BuscaParca APK Builder"
echo "=================================="
echo ""
echo -e "${BLUE}This will build a professional Android APK using Expo EAS${NC}"
echo ""

# Check if logged in
echo -e "${YELLOW}Checking EAS login status...${NC}"
if npx eas-cli whoami > /dev/null 2>&1; then
    USERNAME=$(npx eas-cli whoami)
    echo -e "${GREEN}✓ Already logged in as: $USERNAME${NC}"
    echo ""
    read -p "Continue with this account? (y/n): " continue_choice
    if [[ ! $continue_choice =~ ^[Yy]$ ]]; then
        echo "Logging out..."
        npx eas-cli logout
        echo "Please run this script again to login with different account"
        exit 0
    fi
else
    echo -e "${YELLOW}⚠ Not logged in to EAS${NC}"
    echo ""
    echo "You need an Expo account to build. It's FREE!"
    echo ""
    echo "Options:"
    echo "1. I have an Expo account - Let me login"
    echo "2. I need to create an account first"
    echo ""
    read -p "Choose (1 or 2): " account_choice
    
    if [ "$account_choice" = "2" ]; then
        echo ""
        echo -e "${BLUE}Creating an Expo account:${NC}"
        echo "1. Go to: https://expo.dev/signup"
        echo "2. Sign up with your email"
        echo "3. Verify your email"
        echo "4. Come back and run this script again"
        echo ""
        read -p "Press Enter to open signup page..."
        xdg-open "https://expo.dev/signup" 2>/dev/null || open "https://expo.dev/signup" 2>/dev/null || echo "Open https://expo.dev/signup in your browser"
        exit 0
    fi
    
    echo ""
    echo -e "${BLUE}Logging in to Expo...${NC}"
    npx eas-cli login
    
    if npx eas-cli whoami > /dev/null 2>&1; then
        USERNAME=$(npx eas-cli whoami)
        echo -e "${GREEN}✓ Successfully logged in as: $USERNAME${NC}"
    else
        echo -e "${RED}✗ Login failed${NC}"
        exit 1
    fi
fi

echo ""
echo "=================================="
echo "   Starting Build"
echo "=================================="
echo ""
echo -e "${YELLOW}Build profile:${NC} preview (APK format)"
echo -e "${YELLOW}Platform:${NC} Android"
echo -e "${YELLOW}Estimated time:${NC} 15-20 minutes"
echo ""
echo "The build will happen in the cloud. You can:"
echo "- Close this terminal (build continues)"
echo "- Watch progress at: https://expo.dev"
echo "- Get a notification when done"
echo ""
read -p "Press Enter to start the build..."

echo ""
echo -e "${GREEN}🚀 Starting build...${NC}"
echo ""

# Start the build
npx eas-cli build --platform android --profile preview

echo ""
echo "=================================="
echo -e "${GREEN}✓ Build submitted!${NC}"
echo "=================================="
echo ""
echo "What happens next:"
echo "1. ⏱️  Wait 15-20 minutes for build to complete"
echo "2. 📥 Download the APK from the link above"
echo "3. 📲 Transfer APK to your Android phone"
echo "4. 📱 Install and run!"
echo ""
echo "To check build status:"
echo "  npx eas-cli build:list"
echo ""
echo "To view builds online:"
echo "  https://expo.dev/accounts/$USERNAME/projects/buscaparca/builds"
echo ""
echo -e "${BLUE}Tip: You'll get an email when the build is ready!${NC}"
echo ""
