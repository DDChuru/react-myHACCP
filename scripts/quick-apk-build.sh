#!/bin/bash

# Quick APK Build Script - Uses React Native CLI directly
echo "==================================="
echo "Quick APK Builder for HACCP App"
echo "==================================="

# Set Android environment
export ANDROID_HOME=/home/dachu/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools

# Check if Gradle is ready
if [ ! -f ~/.gradle/wrapper/dists/gradle-8.13-bin/*/gradle-8.13-bin.zip ]; then
    echo "⏳ Gradle still downloading..."
    echo "Alternative: Use npx react-native run-android (will download automatically)"
    exit 1
fi

# Option 1: Try React Native CLI (handles Gradle automatically)
echo "Building with React Native CLI..."
cd /home/dachu/Documents/projects/react-native/myHACCPapp
npx react-native run-android --variant=debug

# If that fails, try direct Gradle
if [ $? -ne 0 ]; then
    echo "Trying direct Gradle build..."
    cd android
    ./gradlew assembleDebug --offline
    
    if [ $? -eq 0 ]; then
        echo "✅ Build successful!"
        echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
        ls -lh app/build/outputs/apk/debug/app-debug.apk
    fi
fi