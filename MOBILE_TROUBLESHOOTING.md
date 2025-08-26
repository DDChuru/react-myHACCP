# Mobile Device Connection Troubleshooting

## Current Setup
- Metro bundler running on: `http://localhost:8081`
- Your computer's IP: `192.168.10.19`
- Status: Metro is running successfully

## Fix Steps for Mobile Devices

### 1. Expo Go App Issues
If using Expo Go app:

**On your phone:**
1. Clear Expo Go app cache:
   - Android: Settings → Apps → Expo Go → Storage → Clear Cache & Clear Data
   - iOS: Delete and reinstall Expo Go

2. Connect to the server manually:
   - Open Expo Go
   - Instead of scanning QR, type manually: `exp://192.168.10.19:8081`

### 2. Network Configuration
Make sure:
- Phone and computer are on the SAME WiFi network
- No VPN is active on either device
- Firewall isn't blocking port 8081

Test connection from phone:
- Open phone browser
- Navigate to: `http://192.168.10.19:8081`
- You should see "React Native packager is running"

### 3. Alternative Connection Methods

**Method A: Use Tunnel (slower but reliable)**
```bash
# Kill current process first
pkill -f "expo start"
# Start with tunnel
npx expo start --tunnel
```

**Method B: Use LAN with explicit host**
```bash
# Kill current process
pkill -f "expo start"
# Start with your IP
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.10.19 npx expo start
```

### 4. Android Specific Issues

**USB Debugging (if using physical device):**
```bash
# Check if device is connected
adb devices

# Reverse port for USB connection
adb reverse tcp:8081 tcp:8081

# Then try connecting
```

**Clear React Native cache on device:**
1. Shake device or press Menu button
2. Select "Settings" 
3. Change "Debug server host" to: `192.168.10.19:8081`
4. Reload the app

### 5. Build Issues

If the app won't build/bundle, try:

```bash
# Clear all caches
npx expo start --clear
rm -rf node_modules/.cache
rm -rf .expo
npx react-native start --reset-cache
```

### 6. Check for JavaScript Errors

Open the developer menu on device (shake or Cmd+D):
- Enable "JS Dev Mode"
- Enable "Hot Reloading"
- Check the console for specific errors

### 7. Memory/Performance Issues on Device

For older/lower-spec devices:
```bash
# Start in production mode (faster, less memory)
npx expo start --no-dev --minify
```

## Current Known Issues in Your App

1. **AuthProfileProvider wrapping** - Fixed ✓
2. **Firebase Auth hanging** - Has 5-second timeout ✓
3. **Push notifications disabled** - Won't affect basic functionality ✓

## Test the Connection

1. First verify Metro is accessible:
```bash
curl http://192.168.10.19:8081/status
```

2. From your phone's browser:
- Navigate to: `http://192.168.10.19:8081`
- Should show packager status

3. Try the direct Expo link:
- In Expo Go, enter: `exp://192.168.10.19:8081`

## If Nothing Works

Try the tunnel method (works through firewalls/network issues):
```bash
npm install -g localtunnel  # Install once
npx expo start --tunnel
```

This will give you a public URL that works from anywhere.