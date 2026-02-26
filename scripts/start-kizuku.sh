#!/bin/bash
# =============================================================================
# Kizuku Development Startup Script
#
# This script ensures all required services are running before starting Kizu:
# 1. PenPot Docker containers (frontend, backend, database)
# 2. Shadow-cljs watch (for ClojureScript hot-reload - eliminates console errors)
# 3. Kizuku Electron app
#
# Usage: ./scripts/start-kizuku.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIZUKU_DIR="$(dirname "$SCRIPT_DIR")"
PENPOT_DIR="$KIZUKU_DIR/penpot"
SEPARATOR="=========================================="

echo "$SEPARATOR"
echo "  Kizuku Development Environment Startup"
echo "$SEPARATOR"

# Step 1: Check if PenPot containers are running
echo ""
echo "[1/4] Checking PenPot Docker containers..."
if ! docker ps | grep -q "penpot-devenv-main"; then
    echo "  -> PenPot containers not running. Starting..."
    cd "$PENPOT_DIR" && ./manage.sh start-devenv
    echo "  -> Waiting for containers to initialize (10s)..."
    sleep 10
else
    echo "  -> PenPot containers already running"
fi

# Step 2: Check if shadow-cljs is running (port 3448)
echo ""
echo "[2/4] Checking shadow-cljs (ClojureScript hot-reload)..."
if ! curl -s -o /dev/null -w "" http://localhost:3448/ 2>/dev/null; then
    echo "  -> Shadow-cljs not running. Starting..."
    docker exec -d penpot-devenv-main bash -c \
        "cd /home/penpot/penpot/frontend && yarn run watch:app:main"
    echo "  -> Waiting for shadow-cljs to initialize (20s)..."
    sleep 20

    # Verify it started
    if curl -s -o /dev/null http://localhost:3448/ 2>/dev/null; then
        echo "  -> Shadow-cljs started successfully"
    else
        echo "  -> WARNING: Shadow-cljs may not have started properly"
    fi
else
    echo "  -> Shadow-cljs already running"
fi

# Step 3: Check frontend is accessible
echo ""
echo "[3/4] Verifying PenPot frontend..."
if curl -s -o /dev/null http://localhost:3449/ 2>/dev/null; then
    echo "  -> Frontend accessible at http://localhost:3449"
else
    echo "  -> ERROR: Frontend not accessible. Check Docker containers." >&2
    exit 1
fi

# Step 4: Start Kizu
echo ""
echo "[4/4] Starting Kizu..."
cd "$KIZUKU_DIR"
echo "  -> Working directory: $KIZUKU_DIR"
echo ""
echo "$SEPARATOR"
echo "  All services ready. Launching Kizu..."
echo "$SEPARATOR"
echo ""

npm start
