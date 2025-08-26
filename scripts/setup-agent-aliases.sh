#!/bin/bash

# Setup script for agent workflow aliases
# This script adds the aliases to your shell configuration

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ALIAS_FILE="$SCRIPT_DIR/agent-aliases.sh"

# Detect shell configuration file
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    echo "Unsupported shell. Please manually source $ALIAS_FILE in your shell configuration."
    exit 1
fi

# Check if aliases are already installed
if grep -q "agent-aliases.sh" "$SHELL_CONFIG" 2>/dev/null; then
    echo "✓ Agent aliases already installed in $SHELL_CONFIG"
    echo "  To reload: source $SHELL_CONFIG"
else
    # Add source command to shell config
    echo "" >> "$SHELL_CONFIG"
    echo "# Agent-to-Agent Workflow Aliases" >> "$SHELL_CONFIG"
    echo "[ -f \"$ALIAS_FILE\" ] && source \"$ALIAS_FILE\"" >> "$SHELL_CONFIG"
    
    echo "✓ Agent aliases installed in $SHELL_CONFIG"
    echo ""
    echo "To activate the aliases, run:"
    echo "  source $SHELL_CONFIG"
    echo ""
    echo "Or open a new terminal window."
fi

echo ""
echo "Available commands after activation:"
echo "  agt <task>   - Collaborative task planning"
echo "  agb <topic>  - Brainstorm ideas"
echo "  agr <code>   - Code review"
echo "  agl          - List recent outputs"
echo "  agv          - View latest output"
echo "  ago          - Open outputs directory"
echo "  agh          - Show help"