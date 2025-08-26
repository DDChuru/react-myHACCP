#!/bin/bash

# Visual Development Server Launcher
# This script starts the comprehensive visual development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Visual Development Server${NC}"
echo -e "${BLUE}===============================${NC}"
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if dev-server directory exists
if [[ ! -d "dev-server" ]]; then
    echo -e "${RED}❌ Error: dev-server directory not found${NC}"
    echo -e "${YELLOW}   Make sure the visual development server is properly installed${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [[ -z "$NODE_VERSION" ]] || [[ "$NODE_VERSION" -lt 16 ]]; then
    echo -e "${RED}❌ Error: Node.js 16+ required${NC}"
    echo -e "${YELLOW}   Current version: $(node -v 2>/dev/null || echo 'Not installed')${NC}"
    echo -e "${YELLOW}   Please install Node.js 16 or higher${NC}"
    exit 1
fi

# Check if dependencies are installed
if [[ ! -d "dev-server/node_modules" ]]; then
    echo -e "${YELLOW}📦 Installing development server dependencies...${NC}"
    cd dev-server
    npm install
    cd ..
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
fi

# Display startup information
echo -e "${GREEN}🔧 Starting Visual Development Server${NC}"
echo -e "${BLUE}   • Project: HACCP App Development${NC}"
echo -e "${BLUE}   • Server: http://localhost:3000${NC}"
echo -e "${BLUE}   • Features:${NC}"
echo -e "${BLUE}     - Real-time AI agent conversations${NC}"
echo -e "${BLUE}     - Live file editing and monitoring${NC}"
echo -e "${BLUE}     - Terminal integration${NC}"
echo -e "${BLUE}     - Task queue and progress tracking${NC}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}🔍 Pre-flight checks:${NC}"

# Check if ports are available
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${RED}   ❌ Port 3000 is already in use${NC}"
    echo -e "${YELLOW}      Please stop the service using port 3000 or modify the PORT in server.js${NC}"
    exit 1
else
    echo -e "${GREEN}   ✅ Port 3000 is available${NC}"
fi

# Check if Gemini CLI is available (for agent integration)
if command -v gemini >/dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Gemini CLI is available${NC}"
else
    echo -e "${YELLOW}   ⚠️  Gemini CLI not found - some agent features may be limited${NC}"
    echo -e "${YELLOW}      Install Gemini CLI for full agent collaboration features${NC}"
fi

# Check if agent-workflow.js exists
if [[ -f "scripts/agent-workflow.js" ]]; then
    echo -e "${GREEN}   ✅ Agent workflow integration ready${NC}"
else
    echo -e "${YELLOW}   ⚠️  Agent workflow script not found${NC}"
fi

echo ""

# Start the server
echo -e "${GREEN}🚀 Launching Visual Development Server...${NC}"
echo -e "${BLUE}   Browser will open automatically${NC}"
echo -e "${BLUE}   Press Ctrl+C to stop the server${NC}"
echo ""

# Change to dev-server directory and start
cd dev-server
exec node server.js