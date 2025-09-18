#!/bin/bash

# Revelo Production Deployment Script
# This script handles the deployment process

set -e

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    warn "Running as root. Consider using a non-root user for better security."
fi

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    error "Environment file '$ENV_FILE' not found. Please create it from .env.example"
fi

# Validate environment variables
log "Validating environment configuration..."

# Source environment file
set -a
source "$ENV_FILE"
set +a

# Check required variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "CHANGE_THIS_SECURE_PASSWORD" ] || [ "${!var}" = "CHANGE_THIS_TO_STRONG_SECRET_256_BITS_MINIMUM" ] || [ "${!var}" = "CHANGE_THIS_TO_DIFFERENT_STRONG_SECRET_256_BITS_MINIMUM" ]; then
        error "Please set a secure value for $var in $ENV_FILE"
    fi
done

info "Environment validation passed"

# Pre-deployment backup
if docker ps | grep -q "revelo_postgres"; then
    log "Creating pre-deployment backup..."
    ./scripts/backup.sh || warn "Backup failed, but continuing with deployment"
fi

# Build and deploy
log "Building Docker images..."
docker compose --env-file "$ENV_FILE" build --no-cache

log "Stopping existing containers..."
docker compose --env-file "$ENV_FILE" down

log "Starting services..."
docker compose --env-file "$ENV_FILE" up -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."

# Function to wait for service health
wait_for_health() {
    local service=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker compose --env-file "$ENV_FILE" ps | grep "$service" | grep -q "healthy"; then
            log "$service is healthy"
            return 0
        fi

        info "Waiting for $service to be healthy... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    error "$service failed to become healthy within timeout"
}

# Wait for database
wait_for_health "postgres"

# Run database migrations
log "Running database migrations..."
docker compose --env-file "$ENV_FILE" exec api node src/database/migrate.js production

# Wait for other services
wait_for_health "ai"
wait_for_health "api"

# Final health check
log "Performing final health checks..."
sleep 10

# Check if all services are running
FAILED_SERVICES=()
for service in postgres ai api client nginx; do
    if ! docker compose --env-file "$ENV_FILE" ps | grep "$service" | grep -q "Up"; then
        FAILED_SERVICES+=("$service")
    fi
done

if [ ${#FAILED_SERVICES[@]} -ne 0 ]; then
    error "Some services failed to start: ${FAILED_SERVICES[*]}"
fi

# Display deployment information
log "Deployment completed successfully!"
echo ""
echo "Service Status:"
docker compose --env-file "$ENV_FILE" ps

echo ""
echo "Access URLs:"
echo "  Frontend: ${CLIENT_BASE_URL}"
echo "  API: ${API_BASE_URL}"
echo "  Health: ${CLIENT_BASE_URL}/health"

echo ""
echo "Useful commands:"
echo "  View logs: docker compose --env-file $ENV_FILE logs -f [service]"
echo "  Restart service: docker compose --env-file $ENV_FILE restart [service]"
echo "  Stop all: docker compose --env-file $ENV_FILE down"
echo "  Backup: ./scripts/backup.sh"

log "Deployment process completed!"