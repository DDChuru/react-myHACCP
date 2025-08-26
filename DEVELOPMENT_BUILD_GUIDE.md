# Development Build Guide

## Build Information
- **Build Profile**: Development
- **Platform**: Android
- **Build URL**: https://expo.dev/accounts/dachu/projects/myHACCPapp/builds/968d1024-57bf-44f2-8604-e9aa1e764817

## What's Included in Development Build

### Development Features
- **Expo Dev Client** - Enhanced debugging capabilities
- **Hot Reloading** - See code changes instantly without rebuild
- **Developer Menu** - Shake device to access developer tools
- **Remote Debugging** - Connect Chrome DevTools for debugging
- **Better Error Messages** - Detailed stack traces and error overlays

### Firebase Integration
- ✅ Firebase Auth configured
- ✅ Firebase Firestore connected
- ✅ Firebase Storage ready
- ✅ google-services.json included

### iCleanVerification Features
- ✅ QR Scanner with bypass option
- ✅ Schedule-based verification (Daily/Weekly/Monthly)
- ✅ Pass/Fail verification system
- ✅ Auto-pass for daily items
- ✅ High-contrast UI (addresses white-cards issue)
- ✅ Offline support with sync queue
- ✅ Photo evidence with annotation overlay (ready to integrate)

## Installation Instructions

### 1. Download APK
Once the build is complete:
1. Go to the build URL above
2. Click "Download" to get the APK file
3. Transfer to your Android device

### 2. Install on Device
1. Enable "Install from Unknown Sources" in Android settings
2. Open the APK file on your device
3. Follow installation prompts

### 3. Connect to Development Server

#### Start Metro bundler:
```bash
npx expo start --dev-client
```

#### Connect device:
1. Ensure device and computer are on same network
2. Open the installed app
3. Enter development server URL (shown in terminal)
4. App will reload with your local code

## Testing iCleanVerification

### Access the Feature
1. Login with your credentials
2. Open drawer menu
3. Select "iClean Verification"

### Test Workflows

#### QR Scanning
1. Tap "Scan QR Code"
2. Allow camera permissions
3. Test with sample QR: `{"type":"area","siteId":"YOUR_SITE_ID","areaId":"AREA_ID","areaName":"Test Area"}`
4. Or use "Bypass QR" for manual selection

#### Area Verification
1. Select an area from the list
2. View items grouped by schedule (Daily/Weekly/Monthly)
3. Expand item cards to verify
4. Test Pass/Fail buttons
5. Add photo evidence (optional)

#### Complete Inspection
1. On Daily tab, verify some items
2. Tap "Complete Inspection" FAB
3. Review auto-pass summary
4. Confirm to complete

### Offline Testing
1. Enable airplane mode
2. Perform verifications
3. Check offline indicator
4. Re-enable network
5. Verify automatic sync

## Debugging Tips

### View Console Logs
```bash
# In terminal where Metro is running
# Logs will appear in real-time
```

### Remote JS Debugging
1. Shake device to open dev menu
2. Select "Debug JS Remotely"
3. Chrome will open with DevTools

### Check Firebase Connection
```javascript
// In app console
console.log('Firebase connected:', auth.currentUser);
```

### Monitor Sync Status
- Check for cloud-off icon on items
- View sync status in AsyncStorage

## Known Issues & Solutions

### Build Errors
- **Camera not working**: Ensure camera permissions are granted in device settings
- **Firebase connection failed**: Check network connection and Firebase configuration
- **Sync not working**: Clear AsyncStorage and restart app

### Performance
- **Slow with 5000+ items**: Pagination is implemented, check virtual scrolling
- **Memory issues**: Clear cache in app settings

## Environment Variables
The build includes:
- `EXPO_PUBLIC_API_URL`: https://iclean-field-service-4bddd.firebaseapp.com

## Support Resources
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Console](https://console.firebase.google.com/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## Next Steps
1. Test all verification workflows
2. Verify Firebase data persistence
3. Test offline/online sync
4. Check performance with large datasets
5. Gather user feedback on UI/UX