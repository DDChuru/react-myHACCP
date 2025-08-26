# Android Debugging Guide for HACCP App

## Quick Start - USB Debugging

### 1. Enable Developer Mode on Android
1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times
3. You'll see "You are now a developer!"

### 2. Enable USB Debugging
1. Go to **Settings → Developer Options**
2. Enable **USB Debugging**
3. Enable **Install via USB** (if available)

### 3. Connect Phone to Computer
```bash
# Check if device is connected
adb devices

# You should see something like:
# List of devices attached
# ABC123456    device
```

### 4. Start Expo for USB Connection
```bash
# Kill any existing Expo processes
npx kill-port 8081

# Start with localhost (for USB)
npx expo start --localhost --clear

# Or start with tunnel (for network issues)
npx expo start --tunnel --clear
```

## Viewing Logs

### Method 1: Terminal Logs
```bash
# View Android logs
adb logcat | grep -i "react"

# View specific app logs
adb logcat *:S ReactNative:V ReactNativeJS:V
```

### Method 2: Chrome DevTools
1. Open Chrome: `chrome://inspect`
2. Click "inspect" under your app
3. View Console tab for logs

### Method 3: In-App Debugging
Shake device or press `Cmd+M` (Mac) / `Ctrl+M` (Windows) in emulator:
- **Debug JS Remotely** - Opens Chrome DevTools
- **Show Inspector** - Visual element inspector
- **Show Perf Monitor** - FPS and memory usage

## Common Issues & Solutions

### Issue: "Failed to download remote update"
```bash
# Solution 1: Clear cache
npx expo start --clear

# Solution 2: Use tunnel mode
npx expo start --tunnel

# Solution 3: Check network
adb shell ping google.com
```

### Issue: "Metro bundler not found"
```bash
# Reset Metro cache
npx react-native start --reset-cache

# Or with Expo
npx expo start -c
```

### Issue: "Could not connect to development server"
```bash
# Forward port manually
adb reverse tcp:8081 tcp:8081

# Check IP address
ifconfig | grep inet
# Update device settings with computer's IP
```

## Debug Logging in Code

### Using Our Debug Utility
```typescript
import { debug, PerfTimer } from '../utils/debug';

// Log different types
debug.log('Normal log', data);
debug.error('Error occurred', error);
debug.warn('Warning', data);
debug.success('Operation successful');
debug.network('API call', { url, payload });
debug.firestore('Database operation', result);

// Performance timing
const timer = new PerfTimer('Fetch Documents');
// ... do work ...
timer.end(); // Logs: "Fetch Documents completed in 234ms"
```

### Console Methods
```typescript
// Group related logs
console.group('SCI Documents');
console.log('Loading...', documents);
console.table(documents); // Table format
console.groupEnd();

// Conditional logging
console.assert(user != null, 'User should be logged in');

// Stack trace
console.trace('Function call trace');
```

## Network Debugging

### Monitor Firebase/Firestore
```typescript
// Enable Firestore debugging
import { setLogLevel } from 'firebase/firestore';
setLogLevel('debug');
```

### Monitor HTTP Requests
```typescript
// Add to app startup
if (__DEV__) {
  global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
  global.FormData = global.originalFormData || global.FormData;
  
  fetch = global.originalFetch || fetch;
  
  if (!global.originalFetch) {
    global.originalFetch = fetch;
    global.fetch = (url, options) => {
      console.log('Fetch:', url, options);
      return global.originalFetch(url, options);
    };
  }
}
```

## Performance Profiling

### React DevTools Profiler
1. Install React DevTools
2. Enable "Record why each component rendered"
3. Look for unnecessary re-renders

### Memory Profiling
```bash
# Dump memory info
adb shell dumpsys meminfo com.yourpackagename

# Monitor in real-time
adb shell top | grep com.yourpackagename
```

## Useful ADB Commands

```bash
# Install APK
adb install app.apk

# Clear app data
adb shell pm clear com.yourpackagename

# Take screenshot
adb shell screencap /sdcard/screen.png
adb pull /sdcard/screen.png

# Record video
adb shell screenrecord /sdcard/demo.mp4
# Press Ctrl+C to stop
adb pull /sdcard/demo.mp4

# Open deep link
adb shell am start -W -a android.intent.action.VIEW -d "yourapp://path" com.yourpackagename

# Simulate poor network
adb shell settings put global airplane_mode_on 1
```

## VS Code Debugging Setup

### launch.json
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Android",
      "type": "reactnative",
      "request": "launch",
      "platform": "android",
      "sourceMaps": true,
      "outDir": "${workspaceRoot}/.vscode/.react"
    }
  ]
}
```

## Environment-Specific Logging

```typescript
// Only log in development
if (__DEV__) {
  console.log('Debug info:', data);
}

// Different log levels
const LOG_LEVEL = __DEV__ ? 'debug' : 'error';

const log = (level: string, ...args: any[]) => {
  const levels = ['debug', 'info', 'warn', 'error'];
  if (levels.indexOf(level) >= levels.indexOf(LOG_LEVEL)) {
    console[level](...args);
  }
};
```

## Quick Debug Checklist

- [ ] Device connected (`adb devices`)
- [ ] USB debugging enabled
- [ ] Metro bundler running
- [ ] Correct IP/port configuration
- [ ] Cache cleared (`npx expo start -c`)
- [ ] Network connectivity working
- [ ] Firebase configured correctly
- [ ] Console logs visible