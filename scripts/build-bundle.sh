#!/bin/bash

echo "Building React Native bundle for testing..."

# Clear caches
rm -rf node_modules/.cache
rm -rf .expo
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Create bundle output directory
mkdir -p bundle-output

# Build the JavaScript bundle
echo "Creating JavaScript bundle..."
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output bundle-output/index.android.bundle \
  --assets-dest bundle-output/assets

echo "Bundle created at bundle-output/index.android.bundle"
echo ""
echo "To test this bundle:"
echo "1. Upload to a hosting service"
echo "2. Use with a React Native test app"
echo "3. Or use Expo Snack online"