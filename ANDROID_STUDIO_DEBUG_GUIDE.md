# Using Android Studio to Debug for Expo

## How Android Studio Helps Fix Expo Issues

### 1. Better Error Messages
**Expo says:** "Build failed"
**Android Studio says:** 
```
Error: Package com.facebook.react does not exist
Line 25: import com.facebook.react.ReactActivity;
       ^
Solution: Add missing dependency to package.json
```

### 2. Logcat (Real-time logs)
```bash
# In Android Studio terminal or command line:
adb logcat *:E  # Show only errors

# Filter for React Native:
adb logcat ReactNative:V ReactNativeJS:V *:S

# Save to file for analysis:
adb logcat > debug.log
```

### 3. Common Issues Found via Android Studio

#### Issue: "undefined is not an object"
**Logcat shows:**
```
E/ReactNativeJS: TypeError: undefined is not an object (evaluating 'user.role')
    at new.tsx:208
```
**Fix:** Change `user?.role` to `userProfile?.role`

#### Issue: App crashes on launch
**Logcat shows:**
```
E/AndroidRuntime: FATAL EXCEPTION: main
java.lang.NoClassDefFoundError: com.swmansion.gesturehandler.GestureHandler
```
**Fix:** Link library: `npx react-native link react-native-gesture-handler`

#### Issue: Firebase not connecting
**Logcat shows:**
```
W/Firebase: No Firebase App '[DEFAULT]' has been created
```
**Fix:** Ensure Firebase is initialized before use

### 4. Debugging Workflow

```bash
# Step 1: Build with Android Studio to see errors
./android/gradlew assembleDebug

# Step 2: Check specific error
adb logcat | grep -i error

# Step 3: Fix issue in code

# Step 4: Test in Expo again
npx expo start
```

### 5. Memory & Performance Profiling

Android Studio shows:
- Memory usage graphs
- CPU usage
- Network requests
- Bundle size analysis

This helps identify why Expo might be crashing!

## Quick Debug Commands

```bash
# Check for missing native modules
npx react-native doctor

# Verify all dependencies
npm ls

# Check for duplicate packages
npm dedupe

# Clear all caches
npx expo start --clear
cd android && ./gradlew clean
npx react-native start --reset-cache

# See what's actually running
adb shell ps | grep -i expo
```

## Translating Android Studio Fixes to Expo

| Android Studio Error | Expo Fix |
|---------------------|----------|
| Missing native module | Run `npx expo install [module]` |
| Version conflict | Update package.json versions |
| Memory overflow | Add to metro.config.js: `maxWorkers: 2` |
| Bundle too large | Enable minification in app.json |
| Signing issues | Use EAS Build instead |

## When to Use Each Tool

### Use Web (`npx expo start --web`):
- UI/UX development
- Form logic
- Navigation testing
- API integration
- Quick iterations

### Use Android Studio:
- Finding crash causes
- Memory profiling
- Native module issues
- Performance optimization
- Generating APKs

### Use Expo:
- Cross-platform testing
- OTA updates
- Quick sharing
- Final deployment

The key is: **Android Studio finds the problems, then you fix them for Expo!**