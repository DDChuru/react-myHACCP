#!/bin/bash

# Agent-to-Agent Workflow Aliases
# Add these aliases to your shell for quick access to agent workflows

# Get the absolute path to the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AGENT_SCRIPT="$SCRIPT_DIR/agent-workflow.js"

# Function-based aliases for better argument handling
agt() {
    if [ $# -eq 0 ]; then
        echo "Usage: agt <task description>"
        echo "Example: agt 'implement user authentication'"
        return 1
    fi
    node "$AGENT_SCRIPT" task "$*"
}

agb() {
    if [ $# -eq 0 ]; then
        echo "Usage: agb <topic>"
        echo "Example: agb 'innovative UI patterns'"
        return 1
    fi
    node "$AGENT_SCRIPT" brainstorm "$*"
}

agr() {
    if [ $# -eq 0 ]; then
        echo "Usage: agr <code>"
        echo "Example: agr 'function getName() { return name; }'"
        return 1
    fi
    node "$AGENT_SCRIPT" review "$*"
}

# List recent agent outputs
agl() {
    local OUTPUT_DIR="$SCRIPT_DIR/agent-outputs"
    if [ -d "$OUTPUT_DIR" ]; then
        echo "Recent agent sessions:"
        ls -lt "$OUTPUT_DIR"/*.md 2>/dev/null | head -10 | awk '{print $9}' | xargs -n1 basename
    else
        echo "No agent outputs found"
    fi
}

# View the latest agent output
agv() {
    local OUTPUT_DIR="$SCRIPT_DIR/agent-outputs"
    if [ -d "$OUTPUT_DIR" ]; then
        local LATEST=$(ls -t "$OUTPUT_DIR"/*.md 2>/dev/null | head -1)
        if [ -n "$LATEST" ]; then
            cat "$LATEST"
        else
            echo "No agent outputs found"
        fi
    else
        echo "Output directory not found"
    fi
}

# Open agent output directory
ago() {
    local OUTPUT_DIR="$SCRIPT_DIR/agent-outputs"
    if [ -d "$OUTPUT_DIR" ]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$OUTPUT_DIR"
        elif command -v open &> /dev/null; then
            open "$OUTPUT_DIR"
        else
            echo "Output directory: $OUTPUT_DIR"
        fi
    else
        echo "Output directory not found"
    fi
}

# Help function
agh() {
    echo "Agent-to-Agent Workflow Commands:"
    echo "  agt <task>   - Collaborative task planning"
    echo "  agb <topic>  - Brainstorm ideas"
    echo "  agr <code>   - Code review"
    echo "  agl          - List recent outputs"
    echo "  agv          - View latest output"
    echo "  ago          - Open outputs directory"
    echo "  agh          - Show this help"
    echo ""
    echo "Examples:"
    echo "  agt 'implement REST API with authentication'"
    echo "  agb 'mobile app performance optimization'"
    echo "  agr 'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }'"
}

echo "Agent workflow aliases loaded! Type 'agh' for help."