#!/bin/bash

# Ensure we're running from the chrome-extension directory
cd "$(dirname "$0")"

# Get version from manifest.json
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')

# Package Chrome Extension for Release
echo "Packaging Emoji Studio Chrome Extension v${VERSION}..."

# Create a clean dist directory
rm -rf dist
mkdir -p dist

# Create the zip file excluding unnecessary files
zip -r dist/emoji-studio-extension-v${VERSION}.zip . \
  -x ".*" \
  -x "*.sh" \
  -x "*.md" \
  -x "dist/*" \
  -x ".git/*" \
  -x "node_modules/*" \
  -x "test-*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "*.zip" \
  -x "package.json" \
  -x "package-lock.json"

echo "Extension packaged successfully!"
echo "Output: dist/emoji-studio-extension-v${VERSION}.zip"
echo ""
echo "Next steps:"
echo "1. Upload to Chrome Web Store Developer Dashboard"
echo "2. Update the listing with release notes"
echo "3. Submit for review"
