#!/bin/bash

echo "🔧 Setting up Chrome for debugging..."

# Kill all Chrome processes
echo "🛑 Closing all Chrome processes..."
pkill -f "Google Chrome" 2>/dev/null || true
sleep 2

# Create a debug profile directory that copies your login data
DEBUG_DIR="$HOME/Library/Application Support/Google/Chrome-Debug"
ORIGINAL_DIR="$HOME/Library/Application Support/Google/Chrome"

echo "📁 Setting up debug profile..."
if [ -d "$ORIGINAL_DIR" ]; then
  # Copy your login data to debug profile
  mkdir -p "$DEBUG_DIR"
  if [ -f "$ORIGINAL_DIR/Default/Cookies" ]; then
    mkdir -p "$DEBUG_DIR/Default"
    cp -r "$ORIGINAL_DIR/Default/Cookies" "$DEBUG_DIR/Default/" 2>/dev/null || true
    cp -r "$ORIGINAL_DIR/Default/Login Data" "$DEBUG_DIR/Default/" 2>/dev/null || true
    cp -r "$ORIGINAL_DIR/Default/Preferences" "$DEBUG_DIR/Default/" 2>/dev/null || true
    echo "✅ Copied login data to debug profile"
  fi
fi

# Start Chrome with debug profile and remote debugging
echo "🚀 Starting Chrome with debugging enabled..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$DEBUG_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-web-security \
  --disable-features=VizDisplayCompositor &

echo "⏳ Waiting for Chrome to start..."
sleep 4

echo "✅ Chrome started with debugging on port 9222"
echo "💡 You can now run: node test-existing-chrome.js"
echo "💡 Chrome should have your login sessions available"
