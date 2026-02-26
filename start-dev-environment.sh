#!/bin/bash

# PenPot Development Environment Startup Script
# This script ensures all services are properly initialized and ready

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local msg="$1"
    echo -e "${BLUE}🚀 ${msg}${NC}"
    return 0
}

print_success() {
    local msg="$1"
    echo -e "${GREEN}✅ ${msg}${NC}"
    return 0
}

print_warning() {
    local msg="$1"
    echo -e "${YELLOW}⚠️  ${msg}${NC}"
    return 0
}

print_error() {
    local msg="$1"
    echo -e "${RED}❌ ${msg}${NC}" >&2
    return 0
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within timeout"
    return 1
}

# Function to check if containers are running
check_containers() {
    local containers=("penpot-devenv-main" "penpotdev-postgres-1" "penpot-devenv-valkey")
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            print_success "Container $container is running"
        else
            print_error "Container $container is not running"
            return 1
        fi
    done
}

# Function to ensure frontend assets are built
ensure_frontend_assets() {
    print_status "Checking frontend assets..."
    
    # Check if config.js exists
    if docker exec penpot-devenv-main test -f /home/penpot/penpot/frontend/resources/public/js/config.js; then
        print_success "config.js exists"
    else
        print_warning "config.js missing, creating placeholder..."
        docker exec penpot-devenv-main bash -c "mkdir -p /home/penpot/penpot/frontend/resources/public/js && echo '// Config placeholder for development' > /home/penpot/penpot/frontend/resources/public/js/config.js"
    fi
    
    # Check if debug.css exists
    if docker exec penpot-devenv-main test -f /home/penpot/penpot/frontend/resources/public/css/debug.css; then
        print_success "debug.css exists"
    else
        print_warning "debug.css missing, compiling from SCSS..."
        docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && npx sass resources/styles/debug.scss resources/public/css/debug.css"
    fi
    
    # Ensure frontend build process is running
    if docker exec penpot-devenv-main pgrep -f "yarn.*watch" > /dev/null; then
        print_success "Frontend watch process is running"
    else
        print_warning "Starting frontend watch process..."
        docker exec -d penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"
        sleep 10
    fi
}

# Function to create persistent demo account
create_demo_account() {
    print_status "Setting up persistent demo account..."
    
    # Create a simple demo account creation script
    docker exec penpot-devenv-main bash -c "cat > /tmp/create-demo.clj << 'EOF'
(ns create-demo
  (:require [app.common.uuid :as uuid]
            [app.db :as db]
            [app.util.time :as dt]
            [buddy.hashers :as hashers]))

(defn create-demo-user []
  (let [email \"demo@penpot.local\"
        password \"demo123\"
        fullname \"Demo User\"
        id (uuid/next)]
    (db/insert! db/pool :profile
                {:id id
                 :email email
                 :password (hashers/derive password)
                 :fullname fullname
                 :is-active true
                 :is-demo true
                 :created-at (dt/now)
                 :modified-at (dt/now)})
    (println \"Demo user created:\")
    (println \"Email:\" email)
    (println \"Password:\" password)))

(create-demo-user)
EOF"
    
    # Try to create the demo account (ignore if already exists)
    docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/backend && timeout 30 clojure -M:dev /tmp/create-demo.clj 2>/dev/null || echo 'Demo account setup attempted (may already exist)'"
}

# Main execution
main() {
    print_status "Starting PenPot Development Environment..."
    
    # Step 1: Check if we're in the right directory
    if [[ ! -f "../penpot/manage.sh" ]]; then
        print_error "PenPot directory not found. Please ensure this script is run from the Kizuku directory."
        exit 1
    fi
    
    # Step 2: Start containers
    print_status "Starting PenPot containers..."
    cd ../penpot
    ./manage.sh start-devenv
    cd - > /dev/null
    
    # Step 3: Wait for containers to be ready
    print_status "Waiting for containers to initialize..."
    sleep 5
    check_containers
    
    # Step 4: Start PenPot services inside container
    print_status "Starting PenPot backend service..."
    docker exec -d penpot-devenv-main bash -c "cd /home/penpot/penpot/backend && clojure -M:dev -m app.main"
    
    print_status "Starting PenPot frontend build process..."
    docker exec -d penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"
    
    # Step 5: Wait for services to be available
    wait_for_service "http://localhost:3449" "PenPot Frontend"
    wait_for_service "http://localhost:6060/api" "PenPot Backend" 
    
    # Step 6: Ensure frontend assets are built
    ensure_frontend_assets
    
    # Step 7: Wait for frontend to serve assets properly
    wait_for_service "http://localhost:3449/js/config.js" "Frontend Assets"
    
    # Step 8: Create demo account
    create_demo_account
    
    # Step 9: Final health check
    print_status "Running final health checks..."
    if curl -f -s http://localhost:3449/css/debug.css > /dev/null && \
       curl -f -s http://localhost:3449/js/config.js > /dev/null; then
        print_success "All services are ready!"
        print_success "Demo credentials: demo@penpot.local / demo123"
        print_status "Starting desktop application..."
        npm start
    else
        print_error "Health check failed. Please check the logs."
        exit 1
    fi
}

# Run main function
main "$@"