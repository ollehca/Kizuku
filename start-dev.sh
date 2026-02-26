#!/bin/bash

# PenPot Desktop Development Startup Script
# Handles backend and frontend startup in one command

echo "🚀 Starting PenPot Desktop Development Environment..."

# Check if we're in the right directory
if [[ ! -f "package.json" ] || [ ! -d "src" ]]; then
    echo "❌ Error: Run this script from the PenPotDesktop directory"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down..."
    if [[ ! -z "$ELECTRON_PID" ]]; then
        kill $ELECTRON_PID 2>/dev/null
    fi
    exit 0
}
trap cleanup INT TERM

# Start PenPot backend containers
echo "🐳 Starting PenPot backend containers..."
cd ../penpot
./manage.sh start-devenv

# Wait for containers to be ready
echo "⏳ Waiting for containers to start..."
sleep 5

# Start the development environment in the background
echo "🔧 Starting PenPot development environment..."
# Use script to provide a pseudo-TTY
script -q /dev/null ./manage.sh run-devenv &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for PenPot backend to be ready..."
cd ../PenPotDesktop

# Poll until backend responds
for i in {1..30}; do
    if curl -s http://localhost:3449 > /dev/null 2>&1; then
        echo "✅ PenPot backend is ready!"
        break
    fi
    echo "⏳ Waiting for backend... ($i/30)"
    sleep 2
done

# Check if backend is ready
if ! curl -s http://localhost:3449 > /dev/null 2>&1; then
    echo "❌ Backend failed to start. Check the logs."
    exit 1
fi

# Start Electron app
echo "⚡ Starting PenPot Desktop app..."
npm start &
ELECTRON_PID=$!

echo "🎉 PenPot Desktop is starting!"
echo "📝 Press Ctrl+C to stop everything"
echo ""

# Wait for Electron to exit or user interrupt
wait $ELECTRON_PID