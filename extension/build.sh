#!/bin/bash

# ArchitectAI Extension Build Script
# Creates a packaged .zip file for Chrome Web Store submission

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}ArchitectAI Extension Build Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Get version from manifest
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
echo -e "Building version: ${YELLOW}${VERSION}${NC}"

# Create build directory
BUILD_DIR="build"
DIST_DIR="dist"
PACKAGE_NAME="architectai-extension-v${VERSION}.zip"

echo -e "\n${YELLOW}Step 1: Cleaning previous builds...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo -e "${YELLOW}Step 2: Copying extension files...${NC}"

# Copy manifest
cp manifest.json "$BUILD_DIR/"

# Copy source files
mkdir -p "$BUILD_DIR/src"
cp -r src/background "$BUILD_DIR/src/"
cp -r src/content "$BUILD_DIR/src/"
cp -r src/popup "$BUILD_DIR/src/"
cp -r src/sidepanel "$BUILD_DIR/src/"
cp -r src/utils "$BUILD_DIR/src/"

# Copy dist (bundled content script)
mkdir -p "$BUILD_DIR/dist"
cp dist/content.bundle.js "$BUILD_DIR/dist/"

# Copy assets
mkdir -p "$BUILD_DIR/assets"
if [ -d "assets" ]; then
  cp -r assets/* "$BUILD_DIR/assets/" 2>/dev/null || true
fi

echo -e "${YELLOW}Step 3: Validating required files...${NC}"

# Check for required files
REQUIRED_FILES=(
  "$BUILD_DIR/manifest.json"
  "$BUILD_DIR/src/popup/popup.html"
  "$BUILD_DIR/src/popup/popup.js"
  "$BUILD_DIR/src/popup/popup.css"
  "$BUILD_DIR/src/sidepanel/sidepanel.html"
  "$BUILD_DIR/src/sidepanel/sidepanel.js"
  "$BUILD_DIR/src/sidepanel/sidepanel.css"
  "$BUILD_DIR/src/background/service-worker.js"
  "$BUILD_DIR/src/content/content.css"
  "$BUILD_DIR/dist/content.bundle.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}Missing required file: $file${NC}"
    exit 1
  fi
done

echo -e "${GREEN}All required files present${NC}"

echo -e "${YELLOW}Step 4: Creating icon placeholders (if missing)...${NC}"

# Create placeholder icons if they don't exist
for size in 16 32 48 128; do
  icon_file="$BUILD_DIR/assets/icon-${size}.png"
  if [ ! -f "$icon_file" ]; then
    echo "  Creating placeholder icon-${size}.png"
    # Create a simple placeholder SVG and convert to PNG would require imagemagick
    # For now, just warn
    echo -e "  ${YELLOW}Warning: Missing icon-${size}.png - please add before submission${NC}"
  fi
done

echo -e "${YELLOW}Step 5: Removing development files...${NC}"

# Remove any development-only files
find "$BUILD_DIR" -name "*.map" -delete 2>/dev/null || true
find "$BUILD_DIR" -name ".DS_Store" -delete 2>/dev/null || true
find "$BUILD_DIR" -name "*.log" -delete 2>/dev/null || true

echo -e "${YELLOW}Step 6: Creating zip package...${NC}"

cd "$BUILD_DIR"
zip -r "../$PACKAGE_NAME" . -x "*.DS_Store" -x "__MACOSX/*"
cd ..

# Get package size
PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Package: ${YELLOW}$PACKAGE_NAME${NC}"
echo -e "Size: ${YELLOW}$PACKAGE_SIZE${NC}"
echo -e "\nNext steps:"
echo "1. Review the package contents"
echo "2. Add production API URLs to src/utils/config.js"
echo "3. Add proper icon files (icon-16.png, icon-32.png, icon-48.png, icon-128.png)"
echo "4. Upload to Chrome Web Store Developer Dashboard"
echo -e "\n${YELLOW}Remember to update the OAuth client ID in manifest.json!${NC}"
