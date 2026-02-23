#!/bin/bash

# BuscaParca Android - Build Verification and Test Suite
# This script verifies the build configuration and runs all tests

set -e  # Exit on error

echo "=================================================="
echo "BuscaParca Android - Build & Test Suite"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to android-app directory
cd "$(dirname "$0")/android-app"

echo "Step 1: Checking build configuration..."
echo "=================================================="

# Check if Gradle wrapper exists
if [ ! -f "gradlew" ]; then
    echo -e "${RED}✗ Gradle wrapper not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Gradle wrapper found${NC}"

# Check if build.gradle.kts exists
if [ ! -f "app/build.gradle.kts" ]; then
    echo -e "${RED}✗ build.gradle.kts not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ build.gradle.kts found${NC}"

# Check if AndroidManifest.xml exists
if [ ! -f "app/src/main/AndroidManifest.xml" ]; then
    echo -e "${RED}✗ AndroidManifest.xml not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AndroidManifest.xml found${NC}"

echo ""
echo "Step 2: Verifying source code structure..."
echo "=================================================="

# Count Kotlin files
KOTLIN_FILES=$(find app/src/main/java -name "*.kt" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Found $KOTLIN_FILES Kotlin source files${NC}"

# Count XML layout files
LAYOUT_FILES=$(find app/src/main/res/layout -name "*.xml" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Found $LAYOUT_FILES XML layout files${NC}"

# Count test files
TEST_FILES=$(find app/src/test -name "*.kt" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Found $TEST_FILES unit test files${NC}"

ANDROID_TEST_FILES=$(find app/src/androidTest -name "*.kt" 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Found $ANDROID_TEST_FILES instrumented test files${NC}"

echo ""
echo "Step 3: Checking required files..."
echo "=================================================="

# Check critical source files
CRITICAL_FILES=(
    "app/src/main/java/com/buscaparca/BuscaParcaApplication.kt"
    "app/src/main/java/com/buscaparca/ui/main/MainActivity.kt"
    "app/src/main/java/com/buscaparca/ui/main/MainViewModel.kt"
    "app/src/main/java/com/buscaparca/data/database/BuscaParcaDatabase.kt"
    "app/src/main/java/com/buscaparca/data/api/ApiClient.kt"
    "app/src/main/java/com/buscaparca/utils/ParkingMLModel.kt"
    "app/src/main/res/values/strings.xml"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
        exit 1
    fi
done

echo ""
echo "Step 4: Validating configuration..."
echo "=================================================="

# Check if Google Maps API key is configured
if grep -q "YOUR_API_KEY_HERE" app/src/main/res/values/strings.xml 2>/dev/null; then
    echo -e "${YELLOW}⚠ Warning: Google Maps API key not configured (still has placeholder)${NC}"
    echo -e "${YELLOW}  Update app/src/main/res/values/strings.xml${NC}"
else
    echo -e "${GREEN}✓ Google Maps API key appears to be configured${NC}"
fi

# Check server URL configuration
if grep -q "YOUR_PC_IP" app/src/main/java/com/buscaparca/data/api/ApiClient.kt 2>/dev/null; then
    echo -e "${YELLOW}⚠ Warning: Server URL not configured (still has placeholder)${NC}"
    echo -e "${YELLOW}  Update app/src/main/java/com/buscaparca/data/api/ApiClient.kt${NC}"
else
    echo -e "${GREEN}✓ Server URL appears to be configured${NC}"
fi

echo ""
echo "Step 5: Cleaning previous builds..."
echo "=================================================="
./gradlew clean --quiet
echo -e "${GREEN}✓ Clean successful${NC}"

echo ""
echo "Step 6: Running unit tests..."
echo "=================================================="
./gradlew test --console=plain || {
    echo -e "${RED}✗ Unit tests failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ All unit tests passed${NC}"

echo ""
echo "Step 7: Compiling debug build..."
echo "=================================================="
./gradlew assembleDebug --console=plain || {
    echo -e "${RED}✗ Debug build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Debug build successful${NC}"

# Check if APK was created
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    APK_SIZE=$(du -h app/build/outputs/apk/debug/app-debug.apk | cut -f1)
    echo -e "${GREEN}✓ APK created: app-debug.apk (${APK_SIZE})${NC}"
else
    echo -e "${RED}✗ APK not found${NC}"
    exit 1
fi

echo ""
echo "Step 8: Build summary..."
echo "=================================================="
echo "Source files:"
echo "  - Kotlin files: $KOTLIN_FILES"
echo "  - Layout files: $LAYOUT_FILES"
echo "  - Unit tests: $TEST_FILES"
echo "  - Instrumented tests: $ANDROID_TEST_FILES"
echo ""
echo "Build artifacts:"
echo "  - Debug APK: app/build/outputs/apk/debug/app-debug.apk ($APK_SIZE)"
echo ""

echo ""
echo -e "${GREEN}=================================================="
echo "✓ ALL CHECKS PASSED"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Google Maps API key (if not done)"
echo "2. Configure server URL (if not done)"
echo "3. Install APK on device: ./gradlew installDebug"
echo "4. Or run directly: ./gradlew run"
echo ""
echo "To run instrumented tests (requires device/emulator):"
echo "  ./gradlew connectedAndroidTest"
echo ""
