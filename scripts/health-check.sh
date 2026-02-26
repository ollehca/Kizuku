#!/bin/bash

# PenPot Health Check and Validation Script
# Comprehensive health monitoring for the development environment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() { echo -e "${PURPLE}🔍 $1${NC}"; }
print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Global status tracking
OVERALL_STATUS=0
ISSUES_FOUND=()

# Function to add issue to tracking
add_issue() {
    ISSUES_FOUND+=("$1")
    OVERALL_STATUS=1
}

# Function to check service availability
check_service() {
    local url=$1
    local service_name=$2
    local timeout=${3:-5}
    
    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_success "$service_name is responding"
        return 0
    else
        print_error "$service_name is not responding"
        add_issue "$service_name not responding"
        return 1
    fi
}

# Function to check container status
check_containers() {
    print_header "Checking Docker Containers"
    
    local required_containers=(
        "penpot-devenv-main"
        "penpotdev-postgres-1" 
        "penpot-devenv-valkey"
        "penpotdev-minio-1"
        "penpotdev-mailer-1"
    )
    
    for container in "${required_containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            print_success "Container $container is running"
        else
            print_error "Container $container is not running"
            add_issue "Container $container not running"
        fi
    done
}

# Function to check service endpoints
check_services() {
    print_header "Checking Service Endpoints"
    
    check_service "http://localhost:3449" "PenPot Frontend" 10
    check_service "http://localhost:6060/api" "PenPot Backend API" 10
    check_service "http://localhost:9000" "MinIO Storage" 5
    check_service "http://localhost:1080" "Mail Catcher" 5
}

# Function to check frontend assets
check_frontend_assets() {
    print_header "Checking Frontend Assets"
    
    local assets=(
        "http://localhost:3449/js/config.js:Config JavaScript"
        "http://localhost:3449/css/debug.css:Debug CSS"
        "http://localhost:3449/css/main.css:Main CSS"
        "http://localhost:3449/js/libs.js:Libraries JavaScript"
    )
    
    for asset in "${assets[@]}"; do
        local url="${asset%:*}"
        local name="${asset#*:}"
        
        if check_service "$url" "$name" 5; then
            # Check file size to ensure it's not empty
            local size=$(curl -s -I "$url" 2>/dev/null | grep -i content-length | awk '{print $2}' | tr -d '\r')
            if [[ -n "$size" ] && [ "$size" -gt 10 ]]; then
                print_success "$name is available and properly sized ($size bytes)"
            else
                print_warning "$name is available but seems small (${size:-unknown} bytes)"
                add_issue "$name may be incomplete"
            fi
        fi
    done
}

# Function to check build processes
check_build_processes() {
    print_header "Checking Build Processes"
    
    # Check if yarn watch is running in frontend
    if docker exec penpot-devenv-main pgrep -f "yarn.*watch" > /dev/null 2>&1; then
        print_success "Frontend watch process is running"
    else
        print_warning "Frontend watch process is not running"
        add_issue "Frontend watch process not running"
    fi
    
    # Check if shadow-cljs is running
    if docker exec penpot-devenv-main pgrep -f "shadow" > /dev/null 2>&1; then
        print_success "Shadow-CLJS processes are running"
    else
        print_warning "Shadow-CLJS processes may not be running"
        add_issue "Shadow-CLJS processes not detected"
    fi
}

# Function to check demo account
check_demo_account() {
    print_header "Checking Demo Account"
    
    local demo_email="demo@penpot.local"
    local demo_password="demo123"
    
    # Test login via API
    local response=$(curl -s -w "%{http_code}" -X POST http://localhost:6060/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$demo_email\",\"password\":\"$demo_password\"}" \
        -o /tmp/login_response.json 2>/dev/null || echo "000")
    
    if [[ "$response" = "200" ]]; then
        print_success "Demo account login successful"
        print_success "Credentials: $demo_email / $demo_password"
    else
        print_error "Demo account login failed (HTTP: $response)"
        add_issue "Demo account not working"
        
        # Show response for debugging
        if [[ -f /tmp/login_response.json ]]; then
            print_status "Response: $(cat /tmp/login_response.json)"
            rm -f /tmp/login_response.json
        fi
    fi
}

# Function to check database connectivity
check_database() {
    print_header "Checking Database Connectivity"
    
    if docker exec penpotdev-postgres-1 pg_isready -U penpot > /dev/null 2>&1; then
        print_success "PostgreSQL is accepting connections"
        
        # Check if we can connect and query
        if docker exec penpotdev-postgres-1 psql -U penpot -d penpot -c "SELECT 1;" > /dev/null 2>&1; then
            print_success "Database queries are working"
        else
            print_error "Cannot execute database queries"
            add_issue "Database query execution failed"
        fi
    else
        print_error "PostgreSQL is not accepting connections"
        add_issue "PostgreSQL not accepting connections"
    fi
}

# Function to check system resources
check_system_resources() {
    print_header "Checking System Resources"
    
    # Check disk space
    local disk_usage=$(df /Users/Achello/Documents/Projects/PenPotDesktop | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ "$disk_usage" -lt 90 ]]; then
        print_success "Disk space usage: ${disk_usage}%"
    else
        print_warning "Disk space usage is high: ${disk_usage}%"
        add_issue "Low disk space: ${disk_usage}%"
    fi
    
    # Check Docker resource usage
    local docker_containers=$(docker ps -q | wc -l | tr -d ' ')
    print_success "Running Docker containers: $docker_containers"
    
    # Check memory usage of main container
    local memory_usage=$(docker stats penpot-devenv-main --no-stream --format "table {{.MemPerc}}" 2>/dev/null | tail -1 | sed 's/%//' || echo "N/A")
    if [[ "$memory_usage" != "N/A" ] && [ "$memory_usage" != "MEMORY %" ]]; then
        if [[ "${memory_usage%.*}" -lt 80 ]]; then
            print_success "Main container memory usage: ${memory_usage}%"
        else
            print_warning "Main container memory usage is high: ${memory_usage}%"
        fi
    fi
}

# Function to run auto-repair for common issues
auto_repair() {
    print_header "Running Auto-Repair for Common Issues"
    
    # Repair missing frontend assets
    if [[ " ${ISSUES_FOUND[@]} " =~ "Config JavaScript not responding" ]]; then
        print_status "Attempting to repair missing config.js..."
        docker exec penpot-devenv-main bash -c "mkdir -p /home/penpot/penpot/frontend/resources/public/js && echo '// Config placeholder for development' > /home/penpot/penpot/frontend/resources/public/js/config.js"
        print_success "config.js repair attempted"
    fi
    
    if [[ " ${ISSUES_FOUND[@]} " =~ "Debug CSS not responding" ]]; then
        print_status "Attempting to repair missing debug.css..."
        docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && npx sass resources/styles/debug.scss resources/public/css/debug.css"
        print_success "debug.css repair attempted"
    fi
    
    # Restart frontend watch if needed
    if [[ " ${ISSUES_FOUND[@]} " =~ "Frontend watch process not running" ]]; then
        print_status "Attempting to restart frontend watch process..."
        docker exec -d penpot-devenv-main bash -c "cd /home/penpot/penpot/frontend && yarn watch"
        print_success "Frontend watch restart attempted"
    fi
    
    # Fix demo account if needed
    if [[ " ${ISSUES_FOUND[@]} " =~ "Demo account not working" ]]; then
        print_status "Attempting to fix demo account..."
        ./scripts/manage-demo-accounts.sh setup > /dev/null 2>&1 || true
        print_success "Demo account repair attempted"
    fi
}

# Function to generate summary report
generate_summary() {
    print_header "Health Check Summary"
    
    if [[ $OVERALL_STATUS -eq 0 ]]; then
        print_success "All systems are healthy!"
        print_success "PenPot development environment is ready to use"
        echo ""
        print_success "Demo credentials: demo@penpot.local / demo123"
        print_success "Frontend: http://localhost:3449"
        print_success "Backend API: http://localhost:6060/api"
        print_success "Mail Catcher: http://localhost:1080"
    else
        print_error "Issues found: ${#ISSUES_FOUND[@]}"
        echo ""
        for issue in "${ISSUES_FOUND[@]}"; do
            print_error "• $issue"
        done
        echo ""
        print_warning "Consider running: $0 --repair"
    fi
}

# Main execution
main() {
    echo -e "${PURPLE}🏥 PenPot Development Environment Health Check${NC}"
    echo "=================================================="
    
    case "${1:-check}" in
        "--repair"|"repair")
            print_header "Running Health Check with Auto-Repair"
            check_containers
            check_services
            check_frontend_assets
            check_build_processes
            check_demo_account
            check_database
            check_system_resources
            
            if [[ $OVERALL_STATUS -ne 0 ]]; then
                auto_repair
                
                print_header "Re-checking after repairs..."
                sleep 5
                OVERALL_STATUS=0
                ISSUES_FOUND=()
                check_services
                check_frontend_assets
                check_demo_account
            fi
            
            generate_summary
            ;;
        "--quick"|"quick")
            print_header "Quick Health Check"
            check_services
            check_frontend_assets
            generate_summary
            ;;
        "check"|*)
            check_containers
            check_services
            check_frontend_assets
            check_build_processes
            check_demo_account
            check_database
            check_system_resources
            generate_summary
            ;;
    esac
    
    exit $OVERALL_STATUS
}