# Troubleshooting Guide

## White Screen Issue

If the app shows a white screen with only the title:

### 1. Check Metro Bundler
```bash
# Verify Metro is running
curl http://localhost:8081/status
# Should return: packager-status:running

# Restart with cache clear
npx expo start --clear

# Or try offline mode if network issues
npx expo start --offline
```

### 2. Common Causes & Fixes

#### Auth Loading Stuck
- **Issue**: Firebase auth not responding
- **Fix**: Added 5-second timeout in `hooks/useAuth.js`
- **Check logs**: Look for `[AuthProvider]` messages

#### Push Notifications Error
- **Issue**: Missing Expo project ID for push tokens
- **Fix**: Push token registration disabled in `services/NotificationService.ts`
- **To enable**: Add your project ID in the service

#### Missing Dependencies
- **Check all installed**:
```bash
npm list @react-native-async-storage/async-storage \
  @react-native-community/datetimepicker \
  @react-native-community/slider \
  react-native-signature-canvas \
  react-native-view-shot \
  expo-notifications \
  expo-device
```

### 3. Debug Steps

1. **Check console logs**:
   - Open developer tools in browser
   - Look for error messages
   - Check for `[RootLayout]`, `[AuthProvider]`, `[InitialLayout]` logs

2. **Verify Firebase**:
   - Check `firebase.js` has correct config
   - Ensure Firebase project is active
   - Check network connectivity

3. **Clear all caches**:
```bash
# Clear Metro cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

### 4. Quick Fixes Applied

1. **Notification Service**: 
   - Wrapped in try-catch blocks
   - Push tokens disabled (no project ID)
   - Won't crash if permissions denied

2. **Auth Provider**:
   - Added error handler
   - 5-second timeout fallback
   - Logs auth state changes

3. **Theme Colors**:
   - Fixed non-existent color references
   - Using Material Design 3 colors only

## Build Errors

### TypeScript Errors
```bash
# Check for errors
npx tsc --noEmit

# Common fixes:
# - Replace theme.colors.success with theme.colors.primary
# - Replace theme.colors.warning with theme.colors.secondary
# - Replace theme.colors.info with theme.colors.tertiary
```

### Metro Bundler Issues
```bash
# Kill all expo processes
pkill -f expo

# Start fresh
npx expo start --offline --clear
```

## Testing the App

### Login Credentials
- Create a test account in Firebase Auth
- Or use existing credentials

### Test Flow
1. Login → Dashboard
2. Open drawer → Self Inspection
3. Tap "New Inspection"
4. Select site and areas
5. Add issues with photos
6. Complete with signature

### Features to Test
- [ ] Site selection (role-based)
- [ ] Area multi-select
- [ ] Issue creation
- [ ] Image annotation
- [ ] Signature capture
- [ ] Dashboard views
- [ ] Notifications (bell icon)

## Network Issues

If getting network errors:
```bash
# Start in offline mode
npx expo start --offline

# Disable version checking
export EXPO_OFFLINE=1
npx expo start
```

## Performance Issues

### Slow Loading
- Clear caches (see above)
- Reduce image quality in settings
- Disable animations temporarily

### Memory Issues
- Close other apps
- Restart development server
- Use production build for testing

## Contact Support

For additional help:
- Check logs in terminal
- Review error messages
- File issue with error details