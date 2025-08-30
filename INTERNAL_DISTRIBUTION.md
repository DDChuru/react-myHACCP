# Internal Distribution Guide for myHACCPapp

## Current Builds

### Latest Builds (v1.0.1)
- **Production Build (AAB)**: [Building...](https://expo.dev/accounts/dachu/projects/myHACCPapp/builds/efcf9ad5-c327-490f-a5ce-1e2ff058a15f)
- **Preview Build (APK)**: [Building...](https://expo.dev/accounts/dachu/projects/myHACCPapp/builds/2084d0f1-2a37-4e42-bbdc-e60b29db5149)

### Previous Stable Builds (v1.0.0)
- **Preview APK**: https://expo.dev/artifacts/eas/sVBDuAaTXPeqtD2x7XLETa.apk
- **Development APK**: https://expo.dev/artifacts/eas/g4VFVZ4xc7oCQHss4Cen6K.apk

## Distribution Methods

### 1. Direct APK Installation (Android)
Share the APK link with testers. They need to:
1. Enable "Install from Unknown Sources" in Android settings
2. Download the APK from the link
3. Install the APK

### 2. QR Code Distribution
Generate QR code for easy installation:
```bash
# Once build is complete, generate QR code
eas build:view <build-id> --qr
```

### 3. Expo Internal Distribution Portal
Access the internal distribution page:
https://expo.dev/accounts/dachu/projects/myHACCPapp/builds

### 4. Google Play Internal Testing (Recommended for larger teams)
1. Upload the AAB to Google Play Console
2. Create an Internal Testing release
3. Add testers by email
4. Testers get official Google Play installation

### 5. Firebase App Distribution (Alternative)
```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Distribute APK via Firebase
firebase appdistribution:distribute path/to/app.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups "internal-testers"
```

## Testing Groups Setup

### Create Testing Groups in EAS
1. Go to https://expo.dev/accounts/dachu/projects/myHACCPapp
2. Navigate to "Settings" → "Credentials"
3. Set up internal testing groups

### Current Testing Channels
- **internal**: For internal team testing
- **preview**: For stakeholder preview
- **development**: For developers with hot reload

## Build Commands

### Build for Internal Distribution
```bash
# APK for easy installation
eas build --platform android --profile internal

# With specific message
eas build --platform android --profile internal --message "Fix: iClean verification navigation"
```

### Check Build Status
```bash
# List recent builds
eas build:list --platform android --limit 5

# View specific build
eas build:view <build-id>
```

### Download Build Artifacts
```bash
# Download APK when ready
eas build:download --platform android --id <build-id>
```

## Installation Instructions for Testers

### Android Installation
1. Download the APK from the provided link
2. Open Settings → Security → Enable "Unknown Sources"
3. Open the downloaded APK file
4. Tap "Install"
5. Open the app

### Troubleshooting
- **"App not installed" error**: Uninstall previous version first
- **Security warning**: Normal for APKs not from Play Store
- **Crashes on startup**: Check Android version compatibility (minimum API 21)

## Version History
- **v1.0.1** (Current): Fixed iClean verification, photo capture, navigation
- **v1.0.0**: Initial release with core HACCP features

## Contact
For issues or access requests, contact the development team.