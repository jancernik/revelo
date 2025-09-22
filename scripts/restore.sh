#!/bin/bash

# Revelo Restore Script
# This script restores the database and uploaded files from backup

set -e

# Configuration
BACKUP_DIR="./backups"
POSTGRES_CONTAINER="revelo_postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_date>"
    echo "Example: $0 20241215_143022"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | sed 's/.*database_\(.*\)\.sql\.gz/  \1/' || echo "  No backups found"
    exit 1
fi

BACKUP_DATE="$1"
DATABASE_BACKUP="$BACKUP_DIR/database_$BACKUP_DATE.sql.gz"
UPLOADS_BACKUP="$BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz"

# Check if backup files exist
if [ ! -f "$DATABASE_BACKUP" ]; then
    error "Database backup file not found: $DATABASE_BACKUP"
fi

if [ ! -f "$UPLOADS_BACKUP" ]; then
    warn "Uploads backup file not found: $UPLOADS_BACKUP (skipping uploads restore)"
fi

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
elif [ -f .env.prod ]; then
    export $(grep -v '^#' .env.prod | xargs)
else
    error "No environment file found (.env or .env.prod)"
fi

# Confirmation prompt
echo -e "${YELLOW}WARNING: This will completely replace your current database and uploads!${NC}"
echo "Database: $DATABASE_BACKUP"
[ -f "$UPLOADS_BACKUP" ] && echo "Uploads: $UPLOADS_BACKUP"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    error "PostgreSQL container '$POSTGRES_CONTAINER' is not running"
fi

log "Starting restore process..."

# Restore database
log "Restoring PostgreSQL database..."
gunzip -c "$DATABASE_BACKUP" | docker exec -i "$POSTGRES_CONTAINER" psql \
    -U "${POSTGRES_USER:-postgres}" \
    -d "${POSTGRES_DB:-revelo_production}"

if [ $? -eq 0 ]; then
    log "Database restore completed"
else
    error "Database restore failed"
fi

# Restore uploads
if [ -f "$UPLOADS_BACKUP" ]; then
    log "Restoring uploads directory..."

    # Stop API container to avoid file conflicts
    docker stop revelo_api 2>/dev/null || warn "API container was not running"

    # Clear existing uploads volume and restore
    docker run --rm \
        -v revelo_uploads_data:/target \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine sh -c "rm -rf /target/* && tar xzf /backup/uploads_$BACKUP_DATE.tar.gz -C /target"

    if [ $? -eq 0 ]; then
        log "Uploads restore completed"
    else
        error "Uploads restore failed"
    fi

    # Restart API container
    log "Restarting API container..."
    docker start revelo_api
else
    warn "Skipping uploads restore (backup file not found)"
fi

log "Restore completed successfully!"
log "You may need to restart your application containers to ensure everything works correctly."