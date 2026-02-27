#!/bin/bash

# PenPot Backend Health Check and Recovery Script
# This script ensures the backend API is fully operational

set -e

BACKEND_URL="http://localhost:6060"
FRONTEND_URL="http://localhost:3449"
MAX_RETRIES=30
RETRY_INTERVAL=5
HTTP_CODE_FORMAT='%{http_code}'

echo "🔍 Checking PenPot backend health..."

# Function to check if backend is responding with valid routes
check_backend_health() {
    # Test a basic endpoint that should exist
    local response=$(curl -s -w "$HTTP_CODE_FORMAT" -X POST "$BACKEND_URL/api/rpc/query/profile" \
        -H "Content-Type: application/json" \
        -d "{}" || echo "000")

    # A 401 or 403 is actually good - it means the route exists but needs auth
    # A 404 means the route doesn't exist (backend not fully initialized)
    if [[ "$response" =~ (401|403|200) ]]; then
        return 0
    else
        return 1
    fi
    return 0
}

# Function to check if frontend proxy is working
check_frontend_proxy() {
    local response=$(curl -s -w "$HTTP_CODE_FORMAT" -X POST "$FRONTEND_URL/api/rpc/query/profile" \
        -H "Content-Type: application/json" \
        -d "{}" || echo "000")

    # Same logic - 401/403/200 means working, 404 means broken
    if [[ "$response" =~ (401|403|200) ]]; then
        return 0
    else
        return 1
    fi
    return 0
}

# Function to restart backend if needed
restart_backend() {
    echo "🔄 Backend not responding properly, attempting restart..."
    docker exec penpot-devenv-main pkill -f "clojure.main -m app.main" || true
    sleep 5
    echo "⏳ Waiting for backend to restart..."
    sleep 10
    return 0
}

# Function to restart nginx
restart_nginx() {
    echo "🔄 Restarting nginx proxy..."
    docker exec penpot-devenv-main service nginx restart
    return 0
}

# Main health check loop
echo "🚀 Starting backend health monitoring..."

for ((i=1; i<=MAX_RETRIES; i++)); do
    echo "📊 Health check attempt $i/$MAX_RETRIES..."

    if check_backend_health; then
        echo "✅ Backend is responding correctly"

        if check_frontend_proxy; then
            echo "✅ Frontend proxy is working"
            echo "🎉 All systems operational!"
            exit 0
        else
            echo "⚠️  Frontend proxy failing, restarting nginx..."
            restart_nginx
            sleep $RETRY_INTERVAL
        fi
    else
        echo "❌ Backend API routes not responding"

        if [[ $i -le 3 ]]; then
            echo "🔄 Restarting nginx (attempt $i)..."
            restart_nginx
        elif [[ $i -eq 10 ]]; then
            echo "🔄 Major restart - restarting backend process..."
            restart_backend
        fi

        sleep $RETRY_INTERVAL
    fi
done

echo "💥 Health check failed after $MAX_RETRIES attempts"
echo "🔍 Final diagnosis:"
echo "   Backend port 6060: $(curl -s -w "$HTTP_CODE_FORMAT" $BACKEND_URL/ || echo "unreachable")"
echo "   Frontend port 3449: $(curl -s -w "$HTTP_CODE_FORMAT" $FRONTEND_URL/ || echo "unreachable")"
exit 1