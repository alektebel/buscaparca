#!/bin/bash
# BuscaParca Native Android Build Script
# This script uses the portable JDK 17 installed in ~/.local/jdk

set -e

JAVA_HOME_PATH="$HOME/.local/jdk/jdk-17.0.13+11"

if [ ! -d "$JAVA_HOME_PATH" ]; then
    echo "❌ Error: JDK 17 not found at $JAVA_HOME_PATH"
    echo "Please ensure the portable JDK is installed"
    exit 1
fi

echo "✓ Using JDK at: $JAVA_HOME_PATH"

cd "$(dirname "$0")/android-app"

export JAVA_HOME="$JAVA_HOME_PATH"

# Run the command passed as arguments, or default to assembleDebug
if [ $# -eq 0 ]; then
    echo "Running: ./gradlew assembleDebug"
    ./gradlew assembleDebug --no-configuration-cache
else
    echo "Running: ./gradlew $@"
    ./gradlew "$@" --no-configuration-cache
fi

echo ""
echo "✓ Build completed successfully!"
echo ""

# If assembleDebug was run, show APK location
if [ $# -eq 0 ] || [[ " $@ " =~ " assembleDebug " ]]; then
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo "📦 APK created: $APK_PATH ($APK_SIZE)"
        echo ""
        echo "To install on a connected device:"
        echo "  adb install $APK_PATH"
    fi
fi
