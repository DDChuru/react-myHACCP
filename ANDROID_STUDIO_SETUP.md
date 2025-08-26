# Android Studio Setup for HACCP App

## Quick Setup (5-10 minutes)

### 1. Wait for SDK Installation to Complete
The SDK is installing at `/home/dachu/Android/Sdk` - let it finish downloading.

### 2. Set Environment Variables
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=/home/dachu/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.bashrc
```

### 3. Open Project in Android Studio
1. Open Android Studio
2. File → Open → Select `/home/dachu/Documents/projects/react-native/myHACCPapp/android`
3. Let it sync (will download Gradle dependencies)

### 4. Run the App

#### Option A: Using Emulator (Easier)
1. In Android Studio: Tools → AVD Manager
2. Create Virtual Device → Choose Pixel 4 → Next
3. Select system image (API 30+ recommended) → Download if needed
4. Finish and Launch emulator
5. In terminal:
```bash
cd /home/dachu/Documents/projects/react-native/myHACCPapp
npx react-native run-android
```

#### Option B: Using Physical Device (Faster)
1. Enable Developer Mode on phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging ON
3. Connect phone via USB
4. Run:
```bash
adb devices  # Should show your device
npx react-native run-android
```

### 5. Start Metro Bundler
In a separate terminal:
```bash
npx react-native start
# OR with memory limit:
NODE_OPTIONS="--max-old-space-size=512" npx react-native start
```

## Benefits of Android Studio

✅ **Built-in Emulator** - No need for Expo Go
✅ **Better Debugging** - Logcat, profiler, layout inspector
✅ **Faster Performance** - Native build, no Expo overhead
✅ **Hot Reload Works** - Changes appear instantly
✅ **No Network Issues** - Emulator runs locally

## Common Issues & Fixes

### Issue: "SDK location not found"
```bash
echo "sdk.dir=/home/dachu/Android/Sdk" > android/local.properties
```

### Issue: "Failed to install APK"
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Issue: Metro connection failed
```bash
# For emulator:
adb reverse tcp:8081 tcp:8081

# For physical device on same network:
# Shake device → Settings → Debug server: 192.168.10.19:8081
```

### Issue: Build fails with memory error
```bash
# Add to android/gradle.properties:
org.gradle.jvmargs=-Xmx1024m -XX:MaxPermSize=512m
```

## Quick Commands

```bash
# Build & Install
npx react-native run-android

# Just build APK
cd android && ./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk

# Install existing APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat *:S ReactNative:V ReactNativeJS:V

# Clear app data
adb shell pm clear com.dachu.myHACCPapp
```

## Advantages Over Expo

1. **No Expo Go needed** - Direct APK installation
2. **Better performance** - Native build without Expo wrapper
3. **Full debugging** - Chrome DevTools + Android Studio tools
4. **No memory issues** - Gradle handles build separately
5. **Works offline** - No tunnel/network issues

## Next Steps

Once SDK installs:
1. Run: `adb devices` to verify installation
2. Start emulator or connect device
3. Run: `npx react-native run-android`
4. App will build and install automatically!

This is actually EASIER than fighting with Expo's memory/network issues!