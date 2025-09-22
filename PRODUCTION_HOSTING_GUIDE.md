# 🚀 Production Hosting Guide for Revelo Image Gallery

This guide covers your best options for hosting Revelo in production with a real domain name.

## 📊 Quick Comparison of Hosting Options

| Option                   | Cost/Month | Complexity | Best For                       |
| ------------------------ | ---------- | ---------- | ------------------------------ |
| **DigitalOcean Droplet** | $6-12      | Medium     | Full control, custom domains   |
| **Hetzner Cloud**        | $4-8       | Medium     | Budget-friendly, EU-based      |
| **Railway**              | $5-10      | Low        | Easy deployment, automatic SSL |
| **Fly.io**               | $5-15      | Low-Medium | Global edge deployment         |
| **AWS Lightsail**        | $5-10      | Medium     | AWS ecosystem integration      |

## 🏆 RECOMMENDED: DigitalOcean Droplet

**Why DigitalOcean is best for your case:**

- ✅ **Simple and reliable** - Excellent documentation and community
- ✅ **Docker-friendly** - Perfect for your existing setup
- ✅ **Cost-effective** - $6/month for sufficient resources
- ✅ **Full control** - Root access, custom configurations
- ✅ **Excellent tutorials** - Step-by-step guides for everything
- ✅ **1-click SSL** - Easy Let's Encrypt integration

### Resource Requirements for Revelo:

- **CPU:** 1-2 vCPUs (AI image processing)
- **RAM:** 2-4GB (AI models need memory)
- **Storage:** 25-50GB SSD (images + system)
- **Traffic:** 1-2TB/month (reasonable for image gallery)

**Recommended Droplet:**

- **Basic Droplet:** $12/month (2 vCPU, 2GB RAM, 50GB SSD)
- **Regular Droplet:** $18/month (2 vCPU, 4GB RAM, 80GB SSD) - Better for AI

## 🔧 Step-by-Step DigitalOcean Deployment

### 1. Create DigitalOcean Account & Droplet

```bash
# Sign up at https://digitalocean.com
# Use this link for $200 free credit: https://m.do.co/c/your-referral-code

# Create a droplet:
# - Ubuntu 22.04 LTS
# - Basic plan: $12/month (2 vCPU, 2GB RAM)
# - Choose region closest to your users
# - Add SSH key for secure access
```

### 2. Set Up Your Domain Name

```bash
# Buy a domain from:
# - Namecheap ($10-15/year) - Recommended
# - Cloudflare ($10/year) - Great for tech-savvy users
# - GoDaddy ($15-20/year) - Popular but more expensive

# Point your domain to DigitalOcean:
# 1. In your domain registrar, set nameservers to:
#    - ns1.digitalocean.com
#    - ns2.digitalocean.com
#    - ns3.digitalocean.com

# 2. In DigitalOcean control panel:
#    - Go to "Networking" → "Domains"
#    - Add your domain
#    - Create A record pointing to your droplet's IP
```

### 3. Initial Server Setup

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin

# Create non-root user (security)
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy

# Set up firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### 4. Deploy Your Application

```bash
# Switch to deploy user
su - deploy

# Clone your repository
git clone https://github.com/yourusername/revelo.git
cd revelo

# Create production environment file
cp .env.example .env.prod

# Edit with your production values
nano .env.prod
```

**Production .env.prod example:**

```bash
# Database Configuration
DB_URL=postgresql://postgres:STRONG_RANDOM_PASSWORD@postgres:5432/revelo_production

# Internal PostgreSQL container configuration
POSTGRES_DB=revelo_production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_RANDOM_PASSWORD

# Application URLs (replace with your domain)
CLIENT_BASE_URL=https://yourdomain.com
API_BASE_URL=https://yourdomain.com/api

# JWT Secrets (generate strong ones!)
JWT_SECRET=GENERATE_STRONG_256_BIT_SECRET_HERE
JWT_REFRESH_SECRET=GENERATE_DIFFERENT_STRONG_256_BIT_SECRET

# Email Configuration (use a service like Brevo, SendGrid, or AWS SES)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@yourdomain.com

# Build-time Variables
VITE_API_BASE_URL=https://yourdomain.com/api
```

### 5. Generate Strong Secrets

```bash
# Generate JWT secrets (save these securely!)
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 64  # For JWT_REFRESH_SECRET

# Generate database password
openssl rand -base64 32
```

### 6. Set Up SSL Certificates (Free with Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot

# Stop any running containers temporarily
docker compose --env-file .env.prod down

# Get SSL certificate (replace yourdomain.com)
sudo certbot certonly --standalone -d yourdomain.com

# Create SSL directory
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown -R deploy:deploy ssl/
```

### 7. Configure HTTPS in Nginx

Edit `nginx/conf.d/default.conf`:

```nginx
# Uncomment and configure the HTTPS server block:
server {
    listen 443 ssl http2;
    server_name yourdomain.com;  # Replace with your domain

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of SSL configuration

    # Copy all location blocks from HTTP server
}

# Add HTTP to HTTPS redirect:
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 8. Deploy Application

```bash
# Deploy using your deployment script
./scripts/deploy.sh

# Or manually:
docker compose --env-file .env.prod up -d --build

# Check logs
docker compose --env-file .env.prod logs -f
```

### 9. Set Up Automatic Certificate Renewal

```bash
# Add to crontab for automatic SSL renewal
sudo crontab -e

# Add this line:
0 3 * * * certbot renew --quiet && docker compose --env-file /home/deploy/revelo/.env.prod restart nginx
```

### 10. Set Up Automated Backups

```bash
# Add to crontab for daily backups
crontab -e

# Add this line (backup at 2 AM daily):
0 2 * * * cd /home/deploy/revelo && ./scripts/backup.sh >> logs/backup.log 2>&1
```

## 🔒 Security Best Practices

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny everything else
```

### 2. SSH Security

```bash
# Disable password authentication (use SSH keys only)
sudo nano /etc/ssh/sshd_config

# Set these values:
PasswordAuthentication no
PermitRootLogin no

sudo systemctl restart ssh
```

### 3. Regular Updates

```bash
# Create update script
cat > ~/update.sh << 'EOF'
#!/bin/bash
sudo apt update && sudo apt upgrade -y
docker system prune -f
cd ~/revelo && git pull && ./scripts/deploy.sh
EOF

chmod +x ~/update.sh

# Run weekly via cron
0 3 * * 0 /home/deploy/update.sh >> /home/deploy/update.log 2>&1
```

## 💰 Alternative Budget Options

### 1. Hetzner Cloud (EU-based, Cheaper)

- **Cost:** €4.15/month (~$4.50)
- **Specs:** 1 vCPU, 2GB RAM, 20GB SSD
- **Pros:** Very affordable, great performance
- **Cons:** Fewer tutorials, EU-based (may be slower for US users)

### 2. Railway (Easiest Deployment)

- **Cost:** $5-10/month (usage-based)
- **Pros:** Zero-config deployment, automatic SSL, GitHub integration
- **Cons:** Less control, proprietary platform

### 3. Fly.io (Global Edge Network)

- **Cost:** ~$10/month
- **Pros:** Global deployment, excellent for performance
- **Cons:** Learning curve, newer platform

## 📈 Scaling Considerations

### When You Outgrow Basic Hosting:

1. **High Traffic (1000+ daily users):**
   - Move to load balancer + multiple app servers
   - Use external database (managed PostgreSQL)
   - Add CDN (CloudFlare) for image serving

2. **Storage Growth (10GB+ images):**
   - Migrate to object storage (AWS S3, DigitalOcean Spaces)
   - Use CDN for faster image delivery worldwide

3. **AI Performance:**
   - Upgrade to GPU instances for faster AI processing
   - Consider dedicated AI service (separate container/server)

## 🆘 Support & Monitoring

### Monitoring Setup:

```bash
# Install basic monitoring
sudo apt install htop iotop

# Set up log rotation
sudo nano /etc/logrotate.d/docker

# Monitor disk space
df -h
docker system df
```

### Getting Help:

- **DigitalOcean Community:** Excellent tutorials and support
- **Docker Documentation:** For container issues
- **Let's Encrypt Community:** For SSL certificate problems
- **Your Repository Issues:** For application-specific problems

---

## 🎯 Quick Start Checklist

For immediate production deployment:

- [ ] 1. Buy domain name ($10-15/year)
- [ ] 2. Create DigitalOcean droplet ($12/month)
- [ ] 3. Point domain to droplet
- [ ] 4. SSH setup and server configuration
- [ ] 5. Install Docker and Docker Compose
- [ ] 6. Clone repository and configure .env.prod
- [ ] 7. Generate SSL certificates with Let's Encrypt
- [ ] 8. Configure nginx for HTTPS
- [ ] 9. Deploy application
- [ ] 10. Set up automated backups and renewals

**Total time:** 2-4 hours for first deployment
**Total cost:** ~$22/month (domain + hosting)

This setup will handle thousands of users and tens of thousands of images with excellent performance and security!
