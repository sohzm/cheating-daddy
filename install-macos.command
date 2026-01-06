#!/bin/bash
#
# Cheating Daddy On Steroids - macOS Installer
# This script removes the quarantine attribute and opens the app
#
# Double-click this file to run, or run in Terminal:
#   chmod +x install-macos.command && ./install-macos.command
#

echo "=========================================="
echo "  Cheating Daddy On Steroids - Installer"
echo "=========================================="
echo ""

APP_PATH="/Applications/Cheating Daddy On Steroids.app"

# Check if the app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found at: $APP_PATH"
    echo ""
    echo "Please drag the app to your Applications folder first."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "📦 Found app at: $APP_PATH"
echo ""

# Remove quarantine attribute
echo "🔓 Removing quarantine attribute (requires password)..."
sudo xattr -dr com.apple.quarantine "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Quarantine attribute removed!"
else
    echo "❌ Failed to remove quarantine. Try running manually:"
    echo "   sudo xattr -dr com.apple.quarantine \"$APP_PATH\""
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "🚀 Opening the app..."
open "$APP_PATH"

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "If the app still won't open:"
echo "  1. Right-click the app → Open → Click 'Open'"
echo ""
echo "If permissions don't work, run in Terminal:"
echo "  tccutil reset Microphone"
echo "  tccutil reset ScreenCapture"
echo ""
read -p "Press Enter to close this window..."
