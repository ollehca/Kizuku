#!/bin/bash

# Demo Account Management Script for PenPot
# Handles creation, validation, and maintenance of demo accounts

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { local msg="$1"; echo -e "${BLUE}ℹ️  ${msg}${NC}"; return 0; }
print_success() { local msg="$1"; echo -e "${GREEN}✅ ${msg}${NC}"; return 0; }
print_warning() { local msg="$1"; echo -e "${YELLOW}⚠️  ${msg}${NC}"; return 0; }
print_error() { local msg="$1"; echo -e "${RED}❌ ${msg}${NC}"; return 0; }

# Demo account credentials
DEMO_EMAIL="demo@penpot.local"
DEMO_PASSWORD="demo123"
DEMO_FULLNAME="Demo User"

# Function to create demo account
create_demo_account() {
    print_status "Creating persistent demo account..."
    
    # Create Clojure script for account creation
    docker exec penpot-devenv-main bash -c "cat > /tmp/create-demo-account.clj << 'EOF'
(require '[app.db :as db])
(require '[app.common.uuid :as uuid])
(require '[app.util.time :as dt])
(require '[buddy.hashers :as hashers])

(try
  (let [email \"$DEMO_EMAIL\"
        password \"$DEMO_PASSWORD\"
        fullname \"$DEMO_FULLNAME\"
        id (uuid/next)
        now (dt/now)]
    
    ;; Check if user already exists
    (let [existing (db/get-by-params db/pool :profile {:email email})]
      (if existing
        (println \"Demo account already exists:\")
        (do
          ;; Create new demo account
          (db/insert! db/pool :profile
                      {:id id
                       :email email
                       :password (hashers/derive password)
                       :fullname fullname
                       :is-active true
                       :is-demo true
                       :is-muted false
                       :created-at now
                       :modified-at now})
          (println \"Demo account created:\"))))
    
    (println \"Email:\" email)
    (println \"Password:\" password)
    (println \"Full Name:\" fullname))
  (catch Exception e
    (println \"Error creating demo account:\" (.getMessage e))))
EOF"
    
    # Execute the script
    if docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/backend && timeout 60 clojure -M:dev -i /tmp/create-demo-account.clj"; then
        print_success "Demo account setup completed"
        print_success "Credentials: $DEMO_EMAIL / $DEMO_PASSWORD"
    else
        print_warning "Demo account creation may have failed, but might already exist"
    fi
    return 0
}

# Function to validate demo account
validate_demo_account() {
    print_status "Validating demo account credentials..."
    
    # Test login via API
    local response=$(curl -s -w "%{http_code}" -X POST http://localhost:6060/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" \
        -o /dev/null 2>/dev/null || echo "000")
    
    if [[ "$response" = "200" ]]; then
        print_success "Demo account credentials are valid"
        return 0
    else
        print_error "Demo account validation failed (HTTP: $response)"
        return 1
    fi
    return 0
}

# Function to reset demo account password
reset_demo_password() {
    print_status "Resetting demo account password..."
    
    docker exec penpot-devenv-main bash -c "cat > /tmp/reset-demo-password.clj << 'EOF'
(require '[app.db :as db])
(require '[buddy.hashers :as hashers])

(try
  (let [email \"$DEMO_EMAIL\"
        new-password \"$DEMO_PASSWORD\"]
    
    (db/update! db/pool :profile
                {:password (hashers/derive new-password)}
                {:email email})
    
    (println \"Password reset for:\" email)
    (println \"New password:\" new-password))
  (catch Exception e
    (println \"Error resetting password:\" (.getMessage e))))
EOF"
    
    if docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/backend && timeout 30 clojure -M:dev -i /tmp/reset-demo-password.clj"; then
        print_success "Demo account password reset"
    else
        print_error "Failed to reset demo account password"
    fi
    return 0
}

# Function to list all demo accounts
list_demo_accounts() {
    print_status "Listing all demo accounts..."
    
    docker exec penpot-devenv-main bash -c "cat > /tmp/list-demo-accounts.clj << 'EOF'
(require '[app.db :as db])

(try
  (let [demo-accounts (db/query db/pool [\"SELECT email, fullname, created_at, is_active FROM profile WHERE is_demo = true ORDER BY created_at DESC\"])]
    (if (empty? demo-accounts)
      (println \"No demo accounts found\")
      (do
        (println \"Demo accounts:\")
        (doseq [account demo-accounts]
          (println (format \"- %s (%s) - Created: %s - Active: %s\"
                          (:email account)
                          (:fullname account)
                          (:created-at account)
                          (:is-active account)))))))
  (catch Exception e
    (println \"Error listing demo accounts:\" (.getMessage e))))
EOF"
    
    docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/backend && timeout 30 clojure -M:dev -i /tmp/list-demo-accounts.clj"
    return 0
}

# Function to clean up old demo accounts
cleanup_old_demos() {
    print_status "Cleaning up old temporary demo accounts..."
    
    docker exec penpot-devenv-main bash -c "cat > /tmp/cleanup-demo-accounts.clj << 'EOF'
(require '[app.db :as db])

(try
  ;; Delete old demo accounts that match the temporary pattern
  (let [result (db/delete! db/pool :profile [\"email LIKE ? AND email != ?\", \"demo-%.demo@example.com\", \"$DEMO_EMAIL\"])]
    (println \"Cleaned up\" (:next.jdbc/update-count result) \"old temporary demo accounts\"))
  (catch Exception e
    (println \"Error cleaning up demo accounts:\" (.getMessage e))))
EOF"
    
    if docker exec penpot-devenv-main bash -c "cd /home/penpot/penpot/backend && timeout 30 clojure -M:dev -i /tmp/cleanup-demo-accounts.clj"; then
        print_success "Old demo accounts cleaned up"
    else
        print_warning "Cleanup may have failed"
    fi
    return 0
}

# Main function
main() {
    local command="${1:-help}"
    case "$command" in
        "create")
            create_demo_account
            ;;
        "validate")
            validate_demo_account
            ;;
        "reset")
            reset_demo_password
            ;;
        "list")
            list_demo_accounts
            ;;
        "cleanup")
            cleanup_old_demos
            ;;
        "setup")
            create_demo_account
            validate_demo_account || reset_demo_password
            cleanup_old_demos
            ;;
        "help"|*)
            echo "Demo Account Management Script"
            echo "Usage: $0 {create|validate|reset|list|cleanup|setup}"
            echo ""
            echo "Commands:"
            echo "  create   - Create persistent demo account"
            echo "  validate - Test demo account login"
            echo "  reset    - Reset demo account password"
            echo "  list     - List all demo accounts"
            echo "  cleanup  - Remove old temporary demo accounts"
            echo "  setup    - Complete setup (create + validate + cleanup)"
            echo ""
            echo "Default demo credentials:"
            echo "  Email: $DEMO_EMAIL"
            echo "  Password: $DEMO_PASSWORD"
            ;;
    esac
    return 0
}

main "$@"