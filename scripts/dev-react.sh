#!/bin/bash
# Development script for React + TypeScript extension

echo "🍌 Starting Going Bananas Development (React + TypeScript)"

# Build extension in watch mode
echo "Building extension with Webpack..."
cd extension && npm run dev &
WEBPACK_PID=$!

# Start backend in background
echo "Starting backend API..."
cd ../backend && npm run dev &
BACKEND_PID=$!

# Start mock API in background
echo "Starting mock API..."
cd ../mock-api && npm start &
MOCK_PID=$!

echo "✅ Development environment started!"
echo "Backend API: http://localhost:3000"
echo "Mock API: http://localhost:3001"
echo "Extension: Load from ./extension/dist folder in Chrome"
echo ""
echo "Webpack is watching for changes..."
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap "kill $WEBPACK_PID $BACKEND_PID $MOCK_PID; exit" INT
wait
