# Deployment Guide - Without App Store

## Direct APK Distribution (Simplest)

### 1. Debug APK (For Testing)
```bash
cd android
./gradlew assembleDebug
# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```
- ✅ Quick to build
- ✅ No signing needed
- ⚠️ Shows "debug" banner
- ⚠️ Larger file size

### 2. Release APK (For Production)
```bash
# First, create a signing key (one time only)
keytool -genkeypair -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Configure signing in android/app/build.gradle
# Then build:
cd android
./gradlew assembleRelease
# APK location: android/app/build/outputs/apk/release/app-release.apk
```
- ✅ Optimized size (smaller)
- ✅ No debug banner
- ✅ Ready for distribution
- ⚠️ Needs signing certificate

### 3. AAB (Android App Bundle) - Recommended
```bash
cd android
./gradlew bundleRelease
# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```
- ✅ 15% smaller than APK
- ✅ Google Play ready (if needed later)
- ✅ Optimized for each device
- ⚠️ Needs bundletool to convert to APK

## Distribution Methods

### Method 1: Direct Share (Simplest)
1. Build APK: `./gradlew assembleRelease`
2. Share via:
   - Email attachment
   - Google Drive/Dropbox link
   - WhatsApp/Telegram
   - USB transfer
3. Users enable "Install from Unknown Sources" and install

### Method 2: Firebase App Distribution (Best for Testing)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Setup
firebase login
firebase init hosting

# Upload APK
firebase appdistribution:distribute android/app/build/outputs/apk/release/app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups "testers"
```
- ✅ Manages tester lists
- ✅ Automatic updates
- ✅ Analytics included
- ✅ No "Unknown Sources" needed

### Method 3: Self-Hosted (Professional)
Create a simple website:
```html
<!DOCTYPE html>
<html>
<head>
    <title>HACCP App Download</title>
</head>
<body>
    <h1>HACCP Mobile App</h1>
    <a href="https://yourserver.com/app-release.apk" download>
        Download APK (Android)
    </a>
    <p>Version: 1.0.0 | Size: 25MB</p>
    
    <!-- QR Code for easy mobile download -->
    <img src="qr-code.png" alt="QR Code">
    
    <h2>Installation Instructions:</h2>
    <ol>
        <li>Download APK</li>
        <li>Open Downloads folder</li>
        <li>Tap the APK file</li>
        <li>Allow "Install from Unknown Sources" if prompted</li>
        <li>Install and Open</li>
    </ol>
</body>
</html>
```

### Method 4: Microsoft App Center (Enterprise)
```bash
# Install App Center CLI
npm install -g appcenter-cli

# Login and setup
appcenter login
appcenter apps create -d "HACCP App" -o Android -p React-Native

# Upload APK
appcenter distribute release -f android/app/build/outputs/apk/release/app-release.apk -g "Internal"
```
- ✅ Enterprise features
- ✅ Crash reporting
- ✅ Analytics
- ✅ Over-the-air updates

### Method 5: GitHub Releases (Open Source)
```bash
# Create release
gh release create v1.0.0 android/app/build/outputs/apk/release/app-release.apk \
  --title "HACCP App v1.0.0" \
  --notes "Initial release"
```
Users download from: `https://github.com/yourrepo/releases`

## Build Configuration

### Optimize APK Size
In `android/app/build.gradle`:
```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
    
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a'
            universalApk false
        }
    }
}
```

### Version Management
In `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 1  // Increment for each release
        versionName "1.0.0"  // User-visible version
    }
}
```

## Quick Commands

```bash
# Development
npx react-native run-android  # Install on connected device/emulator

# Testing APK
./gradlew assembleDebug
adb install app-debug.apk

# Production APK
./gradlew assembleRelease
# Share: app-release.apk

# Check APK size
ls -lh android/app/build/outputs/apk/release/

# Install on device via USB
adb install android/app/build/outputs/apk/release/app-release.apk

# Multiple devices
adb devices  # List all
adb -s DEVICE_ID install app-release.apk
```

## Signing for Production

1. Create keystore (one time):
```bash
keytool -genkey -v -keystore haccp-release-key.keystore \
  -alias haccp-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Add to `android/gradle.properties`:
```
MYAPP_RELEASE_STORE_FILE=haccp-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=haccp-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_password
MYAPP_RELEASE_KEY_PASSWORD=your_password
```

3. Configure `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file(MYAPP_RELEASE_STORE_FILE)
        storePassword MYAPP_RELEASE_STORE_PASSWORD
        keyAlias MYAPP_RELEASE_KEY_ALIAS
        keyPassword MYAPP_RELEASE_KEY_PASSWORD
    }
}
```

## Advantages of Direct APK Distribution

✅ **No app store fees** ($25 Google Play, $99 Apple)
✅ **Instant updates** - No review process
✅ **Private distribution** - Control who gets it
✅ **No store policies** - Your rules
✅ **Faster deployment** - Build and share immediately
✅ **Beta testing** - Easy test groups
✅ **Internal apps** - Perfect for company-only apps

## For Your HACCP App

Since it's for food service companies:
1. Build release APK: `./gradlew assembleRelease`
2. Host on company server or Firebase
3. Share download link with QR code
4. Users scan QR code and install
5. Updates: Just replace APK and notify users

No app store needed! 🎉