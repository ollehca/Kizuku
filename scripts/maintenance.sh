#!/bin/bash

# PenPot Development Environment Maintenance Script
# Handles backup, restore, cleanup, and volume management

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() { local msg="$1"; echo -e "${PURPLE}📦 ${msg}${NC}"; return 0; }
print_status() { local msg="$1"; echo -e "${BLUE}ℹ️  ${msg}${NC}"; return 0; }
print_success() { local msg="$1"; echo -e "${GREEN}✅ ${msg}${NC}"; return 0; }
print_warning() { local msg="$1"; echo -e "${YELLOW}⚠️  ${msg}${NC}"; return 0; }
print_error() { local msg="$1"; echo -e "${RED}❌ ${msg}${NC}"; return 0; }

# Backup directory
BACKUP_DIR="/Users/Achello/Documents/Projects/Kizuku/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Function to create backup directory
ensure_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        print_success "Created backup directory: $BACKUP_DIR"
    fi
    return 0
}

# Function to backup database
backup_database() {
    print_header "Backing up PostgreSQL Database"
    ensure_backup_dir
    
    local backup_file="$BACKUP_DIR/penpot_db_backup_$TIMESTAMP.sql"
    
    if docker exec penpotdev-postgres-1 pg_dump -U penpot -d penpot > "$backup_file"; then
        print_success "Database backup created: $backup_file"
        
        # Compress the backup
        gzip "$backup_file"
        print_success "Backup compressed: ${backup_file}.gz"
        
        # Keep only last 10 backups
        find "$BACKUP_DIR" -name "penpot_db_backup_*.sql.gz" | sort -r | tail -n +11 | xargs rm -f
        print_status "Old backups cleaned up (keeping last 10)"
    else
        print_error "Database backup failed"
        return 1
    fi
    return 0
}

# Function to restore database
restore_database() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        print_error "Please specify backup file to restore"
        print_status "Usage: $0 restore-db /path/to/backup.sql.gz"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi
    
    print_header "Restoring PostgreSQL Database"
    print_warning "This will overwrite the current database!"
    
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Decompress if needed
        local restore_file="$backup_file"
        if [[ "$backup_file" == *.gz ]]; then
            restore_file="${backup_file%.gz}"
            gunzip -c "$backup_file" > "$restore_file"
        fi
        
        # Drop and recreate database
        docker exec penpotdev-postgres-1 psql -U penpot -c "DROP DATABASE IF EXISTS penpot;"
        docker exec penpotdev-postgres-1 psql -U penpot -c "CREATE DATABASE penpot;"
        
        # Restore from backup
        if docker exec -i penpotdev-postgres-1 psql -U penpot -d penpot < "$restore_file"; then
            print_success "Database restored successfully"
            
            # Clean up temporary file if we decompressed
            if [[ "$backup_file" == *.gz ]] && [[ -f "$restore_file" ]]; then
                rm -f "$restore_file"
            fi
        else
            print_error "Database restore failed"
            return 1
        fi
    else
        print_status "Database restore cancelled"
    fi
    return 0
}

# Function to backup volumes
backup_volumes() {
    print_header "Backing up Docker Volumes"
    ensure_backup_dir
    
    local volumes=(
        "penpot_dev_database"
        "penpot_dev_minio_storage"
        "penpot_dev_valkey_cache"
        "penpot_dev_frontend_assets"
    )
    
    for volume in "${volumes[@]}"; do
        print_status "Backing up volume: $volume"
        
        local backup_file="$BACKUP_DIR/${volume}_backup_$TIMESTAMP.tar.gz"
        
        if docker run --rm \
            -v "$volume":/data \
            -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/$(basename "$backup_file")" -C /data .; then
            print_success "Volume backup created: $backup_file"
        else
            print_error "Failed to backup volume: $volume"
        fi
    done
    
    # Cleanup old volume backups
    find "$BACKUP_DIR" -name "*_backup_*.tar.gz" -type f | sort -r | tail -n +21 | xargs rm -f
    print_status "Old volume backups cleaned up (keeping last 20)"
    return 0
}

# Function to restore volumes
restore_volumes() {
    local backup_pattern="$1"
    
    if [[ -z "$backup_pattern" ]]; then
        print_error "Please specify backup pattern to restore"
        print_status "Usage: $0 restore-volumes TIMESTAMP"
        print_status "Example: $0 restore-volumes 20240821_143000"
        return 1
    fi
    
    print_header "Restoring Docker Volumes"
    print_warning "This will overwrite current volume data!"
    
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        local volumes=(
            "penpot_dev_database"
            "penpot_dev_minio_storage"
            "penpot_dev_valkey_cache"
            "penpot_dev_frontend_assets"
        )
        
        for volume in "${volumes[@]}"; do
            local backup_file="$BACKUP_DIR/${volume}_backup_${backup_pattern}.tar.gz"
            
            if [[ -f "$backup_file" ]]; then
                print_status "Restoring volume: $volume"
                
                if docker run --rm \
                    -v "$volume":/data \
                    -v "$BACKUP_DIR":/backup \
                    alpine sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$backup_file") -C /data"; then
                    print_success "Volume restored: $volume"
                else
                    print_error "Failed to restore volume: $volume"
                fi
            else
                print_warning "Backup file not found: $backup_file"
            fi
        done
    else
        print_status "Volume restore cancelled"
    fi
    return 0
}

# Function to clean up development environment
cleanup_environment() {
    print_header "Cleaning up Development Environment"
    
    print_status "Removing stopped containers..."
    docker container prune -f
    
    print_status "Removing unused images..."
    docker image prune -f
    
    print_status "Removing unused networks..."
    docker network prune -f
    
    print_status "Removing build cache..."
    docker builder prune -f
    
    print_success "Cleanup completed"
    return 0
}

# Function to reset development environment
reset_environment() {
    print_header "Resetting Development Environment"
    print_warning "This will destroy all containers and volumes!"
    print_warning "All data will be lost unless backed up!"
    
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Stop all containers
        print_status "Stopping all containers..."
        cd ../penpot
        ./manage.sh drop-devenv
        
        # Remove volumes
        print_status "Removing volumes..."
        docker volume rm penpot_dev_database 2>/dev/null || true
        docker volume rm penpot_dev_minio_storage 2>/dev/null || true
        docker volume rm penpot_dev_valkey_cache 2>/dev/null || true
        docker volume rm penpot_dev_frontend_assets 2>/dev/null || true
        docker volume rm penpot_dev_node_modules 2>/dev/null || true
        docker volume rm penpot_dev_maven_cache 2>/dev/null || true
        docker volume rm penpot_dev_shadow_cache 2>/dev/null || true
        
        # Clean up
        cleanup_environment
        
        print_success "Environment reset completed"
        print_status "Run './start-dev-environment.sh' to recreate the environment"
    else
        print_status "Reset cancelled"
    fi
    return 0
}

# Function to show volume information
show_volume_info() {
    print_header "Docker Volume Information"
    
    local volumes=(
        "penpot_dev_database"
        "penpot_dev_minio_storage"
        "penpot_dev_valkey_cache"
        "penpot_dev_frontend_assets"
        "penpot_dev_node_modules"
        "penpot_dev_maven_cache"
        "penpot_dev_shadow_cache"
    )
    
    for volume in "${volumes[@]}"; do
        if docker volume inspect "$volume" >/dev/null 2>&1; then
            local size=$(docker run --rm -v "$volume":/data alpine du -sh /data 2>/dev/null | cut -f1 || echo "Unknown")
            print_success "$volume: $size"
        else
            print_warning "$volume: Not found"
        fi
    done
    return 0
}

# Function to list available backups
list_backups() {
    print_header "Available Backups"
    
    if [[ -d "$BACKUP_DIR" ]]; then
        print_status "Database backups:"
        find "$BACKUP_DIR" -name "penpot_db_backup_*.sql.gz" | sort -r | while read backup; do
            local size=$(ls -lh "$backup" | awk '{print $5}')
            local date=$(basename "$backup" | sed 's/penpot_db_backup_\(.*\)\.sql\.gz/\1/')
            echo "  📄 $date ($size)"
        done
        
        print_status "Volume backups:"
        find "$BACKUP_DIR" -name "*_backup_*.tar.gz" | cut -d'_' -f4-5 | cut -d'.' -f1 | sort -u | while read timestamp; do
            echo "  📦 $timestamp"
        done
    else
        print_warning "No backup directory found: $BACKUP_DIR"
    fi
    return 0
}

# Main function
main() {
    local command="${1:-help}"
    local argument="$2"
    case "$command" in
        "backup-db")
            backup_database
            ;;
        "restore-db")
            restore_database "$argument"
            ;;
        "backup-volumes")
            backup_volumes
            ;;
        "restore-volumes")
            restore_volumes "$argument"
            ;;
        "backup-all")
            backup_database
            backup_volumes
            ;;
        "cleanup")
            cleanup_environment
            ;;
        "reset")
            reset_environment
            ;;
        "info")
            show_volume_info
            ;;
        "list")
            list_backups
            ;;
        "help"|*)
            echo "PenPot Development Environment Maintenance Script"
            echo "Usage: $0 {command} [options]"
            echo ""
            echo "Backup Commands:"
            echo "  backup-db              - Backup PostgreSQL database"
            echo "  backup-volumes         - Backup all Docker volumes"
            echo "  backup-all             - Backup database and volumes"
            echo ""
            echo "Restore Commands:"
            echo "  restore-db FILE        - Restore database from backup file"
            echo "  restore-volumes TIME   - Restore volumes from timestamp"
            echo ""
            echo "Maintenance Commands:"
            echo "  cleanup                - Clean up unused Docker resources"
            echo "  reset                  - Reset entire environment (DESTRUCTIVE)"
            echo "  info                   - Show volume size information"
            echo "  list                   - List available backups"
            echo ""
            echo "Examples:"
            echo "  $0 backup-all"
            echo "  $0 restore-db $BACKUP_DIR/penpot_db_backup_20240821_143000.sql.gz"
            echo "  $0 restore-volumes 20240821_143000"
            ;;
    esac
    return 0
}

main "$@"