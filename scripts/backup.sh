#!/bin/bash

# Revelo Backup Script
# This script backs up the database and uploaded files

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
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

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
elif [ -f .env.prod ]; then
    export $(grep -v '^#' .env.prod | xargs)
else
    error "No environment file found (.env or .env.prod)"
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    error "PostgreSQL container '$POSTGRES_CONTAINER' is not running"
fi

log "Starting backup process..."

# Backup database
log "Backing up PostgreSQL database..."
docker exec "$POSTGRES_CONTAINER" pg_dump \
    -U "${POSTGRES_USER:-postgres}" \
    -d "${POSTGRES_DB:-revelo_production}" \
    --clean --if-exists --create \
    > "$BACKUP_DIR/database_$DATE.sql"

if [ $? -eq 0 ]; then
    log "Database backup completed: $BACKUP_DIR/database_$DATE.sql"
else
    error "Database backup failed"
fi

# Backup uploads directory
log "Backing up uploads directory..."
if docker volume inspect revelo_uploads_data &> /dev/null; then
    docker run --rm \
        -v revelo_uploads_data:/source:ro \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine tar czf "/backup/uploads_$DATE.tar.gz" -C /source .

    if [ $? -eq 0 ]; then
        log "Uploads backup completed: $BACKUP_DIR/uploads_$DATE.tar.gz"
    else
        error "Uploads backup failed"
    fi
else
    warn "Uploads volume 'revelo_uploads_data' not found, skipping uploads backup"
fi

# Compress database backup
log "Compressing database backup..."
gzip "$BACKUP_DIR/database_$DATE.sql"

# Clean up old backups (keep last 7 days)
log "Cleaning up old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "database_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +7 -delete

# Display backup info
log "Backup completed successfully!"
echo ""
echo "Backup files created:"
ls -lh "$BACKUP_DIR"/database_$DATE.sql.gz "$BACKUP_DIR"/uploads_$DATE.tar.gz 2>/dev/null || true

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Total backup directory size: $TOTAL_SIZE"