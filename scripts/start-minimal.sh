#!/bin/bash

# Kill any existing processes
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:19000 | xargs kill -9 2>/dev/null
lsof -ti:19001 | xargs kill -9 2>/dev/null

# Clear caches
echo "Clearing caches..."
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear

echo "Starting Expo with minimal resources..."

# Set Node memory limit to 1GB
export NODE_OPTIONS="--max-old-space-size=1024"

# Start with minimal features
npx expo start \
  --offline \
  --no-dev \
  --minify \
  --max-workers 2 \
  --port 8081