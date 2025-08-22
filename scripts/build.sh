#!/bin/bash
# Build script for Going Bananas Extension

echo "🍌 Building Going Bananas Extension"

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install

# Install mock API dependencies
echo "Installing mock API dependencies..."
cd ../mock-api && npm install

echo "✅ Build complete!"
echo "Run './scripts/dev.sh' to start development servers"
