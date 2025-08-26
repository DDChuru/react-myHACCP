# Build Troubleshooting Guide

## Common Build Failures & Solutions

### 1. Firebase Configuration Issues
**Error**: Gradle build failed with Firebase-related errors

**Solutions**:
- Ensure `google-services.json` is in `/android/app/`
- Verify package name matches: `com.dachu.myHACCPapp`
- Check Firebase project configuration

### 2. Dependency Conflicts
**Error**: Duplicate classes or dependency resolution failures

**Solutions**:
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo prebuild --clear
```

### 3. Alternative: Local Development Build

If EAS builds continue to fail, try local development:

```bash
# 1. Install dependencies
npm install

# 2. Prebuild native projects
npx expo prebuild --clear

# 3. Run locally
npx expo run:android

# OR for device/emulator
cd android
./gradlew assembleDebug
# Install the APK from android/app/build/outputs/apk/debug/
```

### 4. Minimal Firebase Setup

If Firebase continues to cause issues, temporarily disable it:

1. Remove from `android/app/build.gradle`:
```gradle
// apply plugin: "com.google.gms.google-services"
```

2. Remove Firebase dependencies
3. Build without Firebase first
4. Add Firebase back incrementally

### 5. Using Expo Go (Quick Testing)

For rapid testing without builds:

```bash
# Start with Expo Go
npx expo start

# Scan QR with Expo Go app
# Note: Some features won't work (camera, etc.)
```

### 6. Check Build Logs

Always check the full logs:
```bash
# View build details
eas build:view BUILD_ID

# Check locally
cd android
./gradlew assembleDebug --warning-mode all --stacktrace
```

## Build Configuration Checklist

- [ ] `google-services.json` present and correct
- [ ] Package name consistent everywhere
- [ ] Firebase project exists and is configured
- [ ] Dependencies compatible with React Native version
- [ ] Gradle version compatible
- [ ] Java version correct (17 recommended)
- [ ] Android SDK updated
- [ ] Clear cache before build

## Quick Fixes

### Fix 1: Remove Firebase Temporarily
```javascript
// In firebase.js - comment out temporarily
// const app = initializeApp(firebaseConfig);
// export const auth = {}; // Mock objects
// export const db = {};
// export const storage = {};
```

### Fix 2: Use Mock Data
Create `firebase.mock.js` for testing without Firebase

### Fix 3: Downgrade Dependencies
```json
// If latest versions fail
"firebase": "^10.0.0",  // Instead of 12.x
"@react-native-async-storage/async-storage": "1.19.0"
```

## Emergency Fallback

If all else fails:

1. Create a new Expo project:
```bash
npx create-expo-app myHACCPapp-fresh --template
```

2. Copy only essential code files
3. Add dependencies incrementally
4. Test builds after each addition

## Support Resources

- [EAS Build Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)
- [Firebase Setup Guide](https://rnfirebase.io/)
- [Expo Forums](https://forums.expo.dev/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)