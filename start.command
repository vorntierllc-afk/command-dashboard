#!/bin/bash
# Double-click this file in Finder to launch Command Dashboard

cd "$(dirname "$0")"

echo ""
echo "  Starting Command Dashboard..."
echo ""

# Kill anything already on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start server
node server.js &
SERVER_PID=$!

# Wait for server to be ready
sleep 1

# Open in browser
open http://localhost:3000

echo ""
echo "  Dashboard open at http://localhost:3000"
echo "  Press Ctrl+C to stop the server."
echo ""

# Keep terminal open and server running
wait $SERVER_PID
