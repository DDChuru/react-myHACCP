#!/bin/bash

# Internal Distribution Script for myHACCPapp
# Usage: ./scripts/distribute-internal.sh

echo "🚀 myHACCPapp Internal Distribution"
echo "===================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Function to check build status
check_build_status() {
    local build_id=$1
    echo "Checking build status for: $build_id"
    eas build:view "$build_id" --json 2>/dev/null | grep -o '"status":"[^"]*' | sed 's/"status":"//'
}

# Function to get artifact URL
get_artifact_url() {
    local build_id=$1
    eas build:view "$build_id" --json 2>/dev/null | grep -o '"artifactUrl":"[^"]*' | sed 's/"artifactUrl":"//'
}

# Menu
echo ""
echo "Select an option:"
echo "1) Build new internal APK"
echo "2) Check latest build status"
echo "3) Download latest APK"
echo "4) Generate QR code for distribution"
echo "5) List recent builds"
echo "6) Share existing APK link"
echo ""

read -p "Enter option (1-6): " option

case $option in
    1)
        echo "Building new internal APK..."
        eas build --platform android --profile internal
        ;;
    
    2)
        echo "Fetching latest build status..."
        eas build:list --platform android --limit 1
        ;;
    
    3)
        echo "Enter build ID (or press Enter for latest):"
        read build_id
        if [ -z "$build_id" ]; then
            echo "Downloading latest APK..."
            eas build:download --platform android
        else
            echo "Downloading APK for build $build_id..."
            eas build:download --platform android --id "$build_id"
        fi
        ;;
    
    4)
        echo "Enter build ID for QR code:"
        read build_id
        if [ -z "$build_id" ]; then
            echo "❌ Build ID required for QR code generation"
        else
            echo "Generating QR code for build $build_id..."
            # Get the artifact URL
            artifact_url=$(get_artifact_url "$build_id")
            if [ -n "$artifact_url" ]; then
                echo "📱 APK Download URL: $artifact_url"
                echo ""
                echo "QR Code (scan with phone to download):"
                # Generate QR code in terminal
                qrencode -t UTF8 "$artifact_url" 2>/dev/null || echo "Install qrencode: brew install qrencode"
            else
                echo "❌ Could not get artifact URL. Build may still be in progress."
            fi
        fi
        ;;
    
    5)
        echo "Recent builds:"
        eas build:list --platform android --limit 5
        ;;
    
    6)
        echo "Available APK Links:"
        echo ""
        echo "📦 Latest Preview (v1.0.0):"
        echo "   https://expo.dev/artifacts/eas/sVBDuAaTXPeqtD2x7XLETa.apk"
        echo ""
        echo "🔧 Development Build (v1.0.0):"
        echo "   https://expo.dev/artifacts/eas/g4VFVZ4xc7oCQHss4Cen6K.apk"
        echo ""
        echo "Share these links with testers for direct download"
        ;;
    
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"