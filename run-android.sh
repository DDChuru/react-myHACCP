#!/bin/bash

# Run Android App Script
echo "==================================="
echo "HACCP App - Android Runner"
echo "==================================="

# Go to project directory
cd /home/dachu/Documents/projects/react-native/myHACCPapp

# Set Android environment
export ANDROID_HOME=/home/dachu/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$ANDROID_HOME/emulator

# Check if device is connected
echo "Checking for connected devices..."
adb devices

# Run the app
echo "Building and installing app..."
npx react-native run-android

# If successful, show APK location
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
    ls -lh android/app/build/outputs/apk/debug/app-debug.apk 2>/dev/null
else
    echo ""
    echo "❌ Build failed. Check the error messages above."
    echo ""
    echo "Common fixes:"
    echo "1. Connect a device: Enable USB debugging"
    echo "2. Start emulator: Android Studio → AVD Manager"
    echo "3. Check Metro: npx react-native start"
fi