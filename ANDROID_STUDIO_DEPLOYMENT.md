# Android Studio Deployment Guide - Complete Setup

## Current Status ✅
- ✅ Android SDK installed at `/home/dachu/Android/Sdk`
- ✅ Android project generated
- ✅ Gradle wrapper available
- ⚠️ Java 21 installed (need Java 17 for build)

## Step 1: Fix Java Version Issue

### Install Java 17 (Required)
```bash
# Install Java 17
sudo apt update
sudo apt install openjdk-17-jdk

# Set Java 17 as default
sudo update-alternatives --config java
# Select Java 17 from the list

# Verify
java -version
# Should show: openjdk version "17.x.x"
```

### Alternative: Set JAVA_HOME for this project only
```bash
# Add to your ~/.bashrc or project script
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

## Step 2: Set Up Environment Variables

```bash
# Add to ~/.bashrc
export ANDROID_HOME=/home/dachu/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Apply changes
source ~/.bashrc
```

## Step 3: Connect Device or Start Emulator

### Option A: Physical Device
```bash
# 1. Enable Developer Mode on phone
#    Settings → About → Tap "Build Number" 7 times

# 2. Enable USB Debugging
#    Settings → Developer Options → USB Debugging ON

# 3. Connect via USB and verify
adb devices
# Should show your device
```

### Option B: Android Emulator
```bash
# List available emulators
$ANDROID_HOME/emulator/emulator -list-avds

# If none, create in Android Studio:
# Tools → AVD Manager → Create Virtual Device

# Start emulator
$ANDROID_HOME/emulator/emulator -avd Pixel_4_API_30
```

## Step 4: Build and Deploy

### Quick Build (Command Line)
```bash
cd /home/dachu/Documents/projects/react-native/myHACCPapp

# Clean previous builds
cd android && ./gradlew clean && cd ..

# Build and install on device
npx react-native run-android

# OR build APK only
cd android && ./gradlew assembleDebug
```

### Using Android Studio (GUI)
1. Open Android Studio
2. File → Open → Select `/home/dachu/Documents/projects/react-native/myHACCPapp/android`
3. Wait for sync to complete
4. Click "Run" button (green play icon)

## Step 5: APK Output Locations

### Debug APK (for testing)
```bash
# Location after build
android/app/build/outputs/apk/debug/app-debug.apk

# Install manually
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (for distribution)
```bash
# First, create signing key
keytool -genkey -v -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Build release
cd android && ./gradlew assembleRelease

# Location
android/app/build/outputs/apk/release/app-release.apk
```

## Step 6: Distribution Options

### Direct APK Sharing
```bash
# Build APK
cd android && ./gradlew assembleDebug

# Share via:
# - Email
# - Google Drive
# - WhatsApp
# - Company website
```

### Firebase App Distribution
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Upload APK
firebase appdistribution:distribute \
  android/app/build/outputs/apk/debug/app-debug.apk \
  --app YOUR_APP_ID \
  --groups "testers"
```

## Troubleshooting

### Error: Java 17 required
```bash
# Quick fix
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew assembleDebug
```

### Error: SDK location not found
```bash
echo "sdk.dir=/home/dachu/Android/Sdk" > android/local.properties
```

### Error: Device not found
```bash
# Check device connection
adb devices

# For wireless debugging
adb tcpip 5555
adb connect DEVICE_IP:5555
```

### Error: Build failed with network timeout
```bash
# Use offline mode
cd android
./gradlew assembleDebug --offline
```

### Error: Out of memory
```bash
# Increase heap size
echo "org.gradle.jvmargs=-Xmx2048m" >> android/gradle.properties
```

## Quick Commands Reference

```bash
# Navigate to project
cd /home/dachu/Documents/projects/react-native/myHACCPapp

# Check device connection
adb devices

# Build and run
npx react-native run-android

# Build APK only
cd android && ./gradlew assembleDebug

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat | grep ReactNative

# Clear app data
adb shell pm clear com.dachu.myHACCPapp
```

## Next Steps

1. **Install Java 17** (current issue)
   ```bash
   sudo apt install openjdk-17-jdk
   ```

2. **Connect your device**
   - Enable USB debugging
   - Run: `adb devices`

3. **Build the app**
   ```bash
   npx react-native run-android
   ```

4. **Share APK**
   - Location: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Size: ~30-40MB
   - Install: Enable "Unknown Sources" on target device

## Success Indicators

✅ `adb devices` shows your device
✅ Build completes without errors
✅ APK file generated in output folder
✅ App launches on device/emulator

## Estimated Time

- First build: 10-15 minutes (downloading dependencies)
- Subsequent builds: 2-3 minutes
- APK installation: 30 seconds

---

**Ready to Deploy!** Just need to install Java 17 and you're all set.