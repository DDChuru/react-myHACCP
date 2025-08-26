#!/bin/bash

# Script to start Expo on different ports
# Usage: ./scripts/start-ports.sh [port]

PORT=${1:-8081}  # Default to 8081 if no port specified
WEB_PORT=$((PORT + 1))

echo "Starting Expo on port $PORT (Metro) and $WEB_PORT (Web)..."

# Kill any existing processes on these ports
lsof -ti:$PORT | xargs kill -9 2>/dev/null
lsof -ti:$WEB_PORT | xargs kill -9 2>/dev/null

# Start Expo with custom ports
EXPO_PACKAGER_PORT=$PORT \
EXPO_DEVTOOLS_PORT=$WEB_PORT \
npx expo start --port $PORT --dev-client --offline

# Alternative commands for different scenarios:
# For web development:
# npx expo start --web --port $WEB_PORT

# For specific platform:
# npx expo start --ios --port $PORT
# npx expo start --android --port $PORT