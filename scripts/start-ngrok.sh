#!/bin/bash

# Install ngrok if not present
if ! command -v ngrok &> /dev/null; then
    echo "Installing ngrok..."
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
    sudo apt update && sudo apt install ngrok
fi

# Start Metro first
echo "Starting Metro bundler..."
npx expo start --lan &
METRO_PID=$!

# Wait for Metro to start
sleep 10

# Start ngrok tunnel
echo "Starting ngrok tunnel..."
ngrok http 8081 --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 5

# Get the public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
    echo "Failed to get ngrok URL. Check ngrok.log for details"
else
    # Convert https to exp URL
    EXP_URL=$(echo $NGROK_URL | sed 's/https:/exp:/g')
    echo ""
    echo "========================================="
    echo "Your app is available at:"
    echo "Expo URL: $EXP_URL"
    echo "Web URL: $NGROK_URL"
    echo "========================================="
    echo ""
    echo "Enter this URL in Expo Go app: $EXP_URL"
fi

# Keep running
wait $METRO_PID