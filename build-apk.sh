#!/bin/bash

# BuscaParca Android APK Build Script
# This script builds a standalone Android APK

set -e

echo "=================================="
echo "   BuscaParca APK Builder"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Important:${NC} This requires an Expo account to build the APK."
echo ""
echo "You have 3 options:"
echo ""
echo "Option 1: Build with EAS (Cloud build - Recommended)"
echo "  1. Create a free Expo account at https://expo.dev"
echo "  2. Run: npx eas-cli login"
echo "  3. Run: npx eas-cli build --platform android --profile preview"
echo "  4. Wait ~15-20 minutes for the build"
echo "  5. Download the APK from the link provided"
echo ""
echo "Option 2: Use Expo Go (No build needed - Quick testing)"
echo "  1. Install 'Expo Go' from Play Store"
echo "  2. Run: ./start-buscaparca.sh"
echo "  3. Scan QR code with Expo Go"
echo "  4. Test immediately (no waiting)"
echo ""
echo "Option 3: Local build with Android Studio (Advanced)"
echo "  1. Install Android Studio and Android SDK"
echo "  2. Run: npx expo prebuild"
echo "  3. Run: cd android && ./gradlew assembleRelease"
echo "  4. APK will be in android/app/build/outputs/apk/"
echo ""
echo "=================================="
echo ""
read -p "Which option do you want? (1/2/3): " choice

case $choice in
  1)
    echo -e "${GREEN}Starting EAS cloud build...${NC}"
    echo ""
    echo "First, let's log in to Expo:"
    npx eas-cli login
    echo ""
    echo "Now building APK (this takes 15-20 minutes)..."
    npx eas-cli build --platform android --profile preview
    ;;
  2)
    echo -e "${GREEN}Starting Expo Go development server...${NC}"
    ./start-buscaparca.sh
    ;;
  3)
    echo -e "${GREEN}Starting local Android build...${NC}"
    echo ""
    echo "This will create native Android code..."
    npx expo prebuild --platform android
    echo ""
    echo "Building APK with Gradle..."
    cd android && ./gradlew assembleRelease
    echo ""
    echo -e "${GREEN}✓ APK built successfully!${NC}"
    echo "Location: android/app/build/outputs/apk/release/app-release.apk"
    ;;
  *)
    echo -e "${RED}Invalid option${NC}"
    exit 1
    ;;
esac
