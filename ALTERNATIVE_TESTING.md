# Alternative Mobile Testing Methods

Since local Expo is having memory issues, here are alternative ways to test your React Native app:

## 1. Expo Snack (Online - Recommended)
Visit: https://snack.expo.dev

1. Create new Snack
2. Copy your code files
3. Test directly on your phone using Expo Go
4. No local server needed!

## 2. CodeSandbox (Online)
Visit: https://codesandbox.io

1. Choose "React Native" template
2. Import your project
3. Test in browser or phone

## 3. Build APK with EAS (Cloud Build)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

This builds in the cloud - no local memory issues!

## 4. Use React Native CLI directly
```bash
# Start Metro with minimal memory
NODE_OPTIONS="--max-old-space-size=512" npx react-native start --reset-cache

# In another terminal
npx react-native run-android
```

## 5. Create Development Build
```bash
# Creates a custom Expo Go app with your dependencies
npx expo install expo-dev-client
eas build --platform android --profile development

# Download and install the APK on your phone
# Connect with: npx expo start --dev-client
```

## 6. Test Critical Components Separately

Create minimal test files to isolate issues:

```javascript
// test-auth.js - Test authentication only
import { AuthProfileProvider, useAuthProfile } from './hooks/useAuthProfile';

// test-navigation.js - Test navigation only
import { Stack } from 'expo-router';

// test-firebase.js - Test Firebase connection
import { auth, db } from './firebase';
```

## 7. Use Android Studio Emulator
If you have Android Studio:
```bash
# Start emulator
emulator -avd Pixel_4_API_30

# Run app
npx expo run:android --device
```

## 8. Web-to-Mobile Bridge
Test on web first, then mobile:
```bash
# Start web version (uses less memory)
npx expo start --web

# Test all functionality on web
# Then try mobile with confidence
```

## Current Issues Fixed:
✅ Removed HTML elements (`<div>` → `<View>`)
✅ Fixed undefined variables (`user` → `userProfile`)
✅ Added React Native imports
✅ Fixed authentication context wrapping

## Quick Debug Checklist:
1. Check `adb logcat` for Android errors
2. Shake device → "Debug JS Remotely" for Chrome debugging
3. Check Metro bundler logs
4. Verify all imports are React Native compatible
5. Ensure no web-only APIs are used

## Memory Optimization:
- Close Chrome tabs
- Stop other Node processes
- Use `NODE_OPTIONS="--max-old-space-size=512"`
- Clear caches: `npx expo start --clear`
- Use production mode: `npx expo start --no-dev --minify`