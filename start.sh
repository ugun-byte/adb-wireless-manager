#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "===================================================="
echo "  ADB Wireless Debugging Manager (macOS / Linux)"
echo "===================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

# Open browser in background after short delay
(
    sleep 1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "http://localhost:4567"
    else
        xdg-open "http://localhost:4567" 2>/dev/null || sensible-browser "http://localhost:4567" 2>/dev/null
    fi
) &

node server.js
