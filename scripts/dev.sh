#!/bin/bash
# Development startup script

echo "🍌 Starting Going Bananas Development Environment"

# Start backend in background
echo "Starting backend API..."
cd backend && npm run dev &
BACKEND_PID=$!

# Start mock API in background
echo "Starting mock API..."
cd ../mock-api && npm start &
MOCK_PID=$!

echo "✅ Servers started!"
echo "Backend API: http://localhost:3000"
echo "Mock API: http://localhost:3001"
echo "Extension: Load from ./extension folder in Chrome"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap "kill $BACKEND_PID $MOCK_PID; exit" INT
wait
