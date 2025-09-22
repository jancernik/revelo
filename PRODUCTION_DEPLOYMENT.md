# Revelo Production Deployment Guide

This guide covers deploying Revelo to production using Docker Compose with best practices for security, performance, and reliability.

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **RAM**: Minimum 4GB (8GB+ recommended for AI model)
- **Storage**: 50GB+ (depends on image storage needs)
- **CPU**: 2+ cores (4+ recommended)

### Software Requirements

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

## Initial Setup

### 1. Clone and Prepare Repository

```bash
git clone <your-repo-url> revelo
cd revelo
```

### 2. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env.prod

# Edit production configuration
nano .env.prod
```

**Required Environment Variables:**

```bash
# Database
POSTGRES_DB=revelo_production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<SECURE_PASSWORD>

# Application URLs (update with your domain)
CLIENT_BASE_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api

# JWT Secrets (generate strong random strings)
JWT_SECRET=<SECURE_256_BIT_SECRET>
JWT_REFRESH_SECRET=<DIFFERENT_SECURE_256_BIT_SECRET>

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=<EMAIL_PASSWORD>
FROM_EMAIL=noreply@your-domain.com

# Build Variables
VITE_API_BASE_URL=https://your-domain.com/api
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secrets (save these!)
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET

# Generate secure database password
openssl rand -base64 24
```

### 4. Create Required Directories

```bash
mkdir -p backups ssl
chmod 755 scripts/*.sh
```

## SSL Configuration (Recommended)

### Option 1: Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

### Option 2: Self-Signed (Development)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/CN=your-domain.com"
```

After SSL setup, uncomment the HTTPS server block in `nginx/conf.d/default.conf` and update domain name.

## Deployment

### 1. Run Deployment Script

```bash
./scripts/deploy.sh
```

This script will:

- Validate environment configuration
- Create pre-deployment backup
- Build Docker images
- Deploy services with health checks
- Run database migrations

### 2. Manual Deployment (Alternative)

```bash
# Build images
docker compose --env-file .env.prod build

# Start services
docker compose --env-file .env.prod up -d

# Check status
docker compose --env-file .env.prod ps

# Run migrations
docker compose --env-file .env.prod exec api node src/database/migrate.js production
```

## Post-Deployment

### 1. Verify Services

```bash
# Check all services are running
docker compose --env-file .env.prod ps

# Check logs
docker compose --env-file .env.prod logs -f

# Test health endpoints
curl http://your-domain.com/health
curl http://your-domain.com/api/health
```

### 2. Create First Admin User

Access your application and register the first user, then manually set admin privileges in the database:

```sql
-- Connect to database
docker exec -it revelo_postgres psql -U postgres -d revelo_production

-- Set user as admin
UPDATE users SET admin = true WHERE email = 'your-email@domain.com';
```

## Maintenance

### Backups

```bash
# Create backup
./scripts/backup.sh

# Schedule daily backups (crontab -e)
0 2 * * * cd /path/to/revelo && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Updates

```bash
# Pull latest code
git pull origin main

# Redeploy
./scripts/deploy.sh
```

### Monitoring

```bash
# View logs
docker compose --env-file .env.prod logs -f [service_name]

# Monitor resource usage
docker stats

# Check disk usage
df -h
docker system df
```

### Restore from Backup

```bash
# List available backups
ls -la backups/

# Restore (replace DATE with actual backup date)
./scripts/restore.sh 20241215_143022
```

## Security Best Practices

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
```

### 2. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker compose --env-file .env.prod pull
docker compose --env-file .env.prod up -d
```

### 3. Monitoring and Alerts

Consider setting up:

- Log monitoring (ELK stack, Grafana)
- Uptime monitoring (Uptime Robot, Pingdom)
- Resource monitoring (Prometheus + Grafana)

## Troubleshooting

### Common Issues

**Services won't start:**

```bash
# Check logs
docker compose --env-file .env.prod logs [service_name]

# Check disk space
df -h

# Restart specific service
docker compose --env-file .env.prod restart [service_name]
```

**Database connection issues:**

```bash
# Check PostgreSQL logs
docker compose --env-file .env.prod logs postgres

# Verify database exists
docker exec -it revelo_postgres psql -U postgres -l
```

**AI service out of memory:**

```bash
# Check memory usage
docker stats revelo_ai

# Reduce AI model concurrency or upgrade server memory
```

**Upload issues:**

```bash
# Check uploads volume
docker volume inspect revelo_uploads_data

# Check permissions
docker compose --env-file .env.prod exec api ls -la uploads/
```

### Performance Optimization

**Database:**

- Regular VACUUM and ANALYZE
- Monitor query performance
- Consider connection pooling for high traffic

**Images:**

- Regular cleanup of old images
- Consider CDN for static assets
- Monitor storage usage

**AI Service:**

- Increase memory allocation if needed
- Consider GPU acceleration for better performance
- Monitor model loading times

## Scaling Considerations

For high-traffic deployments:

1. **Load Balancer**: Use multiple API instances behind a load balancer
2. **Database**: Consider PostgreSQL clustering or read replicas
3. **Storage**: Move to object storage (S3, MinIO) for images
4. **CDN**: Use CloudFlare or similar for static assets
5. **Monitoring**: Implement comprehensive monitoring and alerting

## Support

- Check logs: `docker compose --env-file .env.prod logs -f`
- GitHub Issues: [Your repository issues page]
- Documentation: This file and inline code comments

---

**Security Note**: Never commit `.env.prod` or any files containing secrets to version control. Always use secure passwords and keep your system updated.
