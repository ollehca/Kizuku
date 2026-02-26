#!/bin/bash

# Simple Demo Account Creation using PenPot API
# This creates a demo account using the registration API

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { local msg="$1"; echo -e "${GREEN}✅ ${msg}${NC}"; return 0; }
print_warning() { local msg="$1"; echo -e "${YELLOW}⚠️  ${msg}${NC}"; return 0; }
print_error() { local msg="$1"; echo -e "${RED}❌ ${msg}${NC}" >&2; return 0; }

# Demo account details
DEMO_EMAIL="demo@penpot.local"
DEMO_PASSWORD="demo123"
DEMO_FULLNAME="Demo User"

# Wait for backend to be ready
echo "Waiting for PenPot backend to be ready..."
for i in {1..30}; do
    if curl -f -s http://localhost:6060/api >/dev/null 2>&1; then
        print_success "Backend is ready"
        break
    fi
    if [[ $i -eq 30 ]]; then
        print_error "Backend not responding after 30 attempts"
        exit 1
    fi
    sleep 2
done

# Try to register the demo account
echo "Creating demo account via registration API..."

# Create the registration payload
REGISTRATION_DATA=$(cat <<EOF
{
  "email": "$DEMO_EMAIL",
  "password": "$DEMO_PASSWORD",
  "fullname": "$DEMO_FULLNAME",
  "invitation-token": null,
  "accept-terms-and-privacy": true
}
EOF
)

# Attempt registration
RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:6060/api/auth/register \
  -H "Content-Type: application/json" \
  -d "$REGISTRATION_DATA" \
  -o /tmp/registration_response.json 2>/dev/null || echo "000")

if [[ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "201" ]]; then
    print_success "Demo account created successfully!"
    print_success "Email: $DEMO_EMAIL"
    print_success "Password: $DEMO_PASSWORD"
    
    # Test login
    echo "Testing login..."
    LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:6060/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" \
      -o /tmp/login_response.json 2>/dev/null || echo "000")
    
    if [[ "$LOGIN_RESPONSE" = "200" ]]; then
        print_success "Demo account login test successful!"
    else
        print_warning "Demo account created but login test failed"
    fi
    
elif [[ "$RESPONSE" = "409" ] || [ "$RESPONSE" = "400" ]]; then
    print_warning "Demo account may already exist"
    
    # Test login to verify
    echo "Testing existing account..."
    LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:6060/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" \
      -o /tmp/login_response.json 2>/dev/null || echo "000")
    
    if [[ "$LOGIN_RESPONSE" = "200" ]]; then
        print_success "Existing demo account is working!"
        print_success "Email: $DEMO_EMAIL"
        print_success "Password: $DEMO_PASSWORD"
    else
        print_error "Demo account exists but credentials don't work"
        print_error "You may need to manually reset the account"
    fi
    
else
    print_error "Failed to create demo account (HTTP: $RESPONSE)"
    if [[ -f /tmp/registration_response.json ]]; then
        echo "Response: $(cat /tmp/registration_response.json)"
    fi
    exit 1
fi

# Cleanup temp files
rm -f /tmp/registration_response.json /tmp/login_response.json